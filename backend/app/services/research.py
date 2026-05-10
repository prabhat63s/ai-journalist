import asyncio
import base64
import io
import json
import os
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup
from google import genai
from google.genai import types
from loguru import logger
from PIL import Image

from app.services.personas import DEFAULT_PERSONA, PERSONA_CONFIGS
from app.services.prompts import GEMINI_RESEARCH_PROMPT


class JournalistResearch:
    def __init__(self, gemini_key: str = "", openai_key: str = ""):
        self.genai_client = genai.Client(api_key=gemini_key) if gemini_key else None
        self.openai_key = openai_key

    def _require_gemini_client(self) -> genai.Client:
        if not self.genai_client:
            raise RuntimeError("Gemini API key is missing. Add GEMINI_API_KEY to your environment.")
        return self.genai_client

    @staticmethod
    def _normalize_url(url: str) -> Optional[str]:
        raw = (url or "").strip()
        if not raw:
            return None
        if raw.startswith("//"):
            raw = f"https:{raw}"
        elif "://" not in raw:
            raw = f"https://{raw}"

        try:
            parsed = urlparse(raw)
        except Exception:
            return None

        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return None

        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        if netloc in {"example.com", "localhost"}:
            return None

        return urlunparse(parsed._replace(scheme=parsed.scheme.lower(), netloc=netloc, fragment=""))

    @staticmethod
    def _extract_candidate_urls(text: str) -> List[str]:
        if not text:
            return []
        candidates = []
        for token in text.replace("(", " ").replace(")", " ").split():
            token = token.strip(" \t\r\n'\"[]<>,.;")
            if token.startswith(("http://", "https://", "www.")):
                candidates.append(token)
        return candidates

    async def _validate_source(
        self,
        source: Dict[str, Any],
        fallback_title: str = "",
        _client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[Dict[str, str]]:
        normalized = self._normalize_url(str(source.get("url", "")))
        if not normalized:
            return None

        title = (str(source.get("title", "")) or fallback_title or normalized).strip()[:200]
        description = (str(source.get("description", "")) or "").strip()[:200]

        async def _check(c: httpx.AsyncClient) -> Optional[str]:
            response = await c.head(normalized)
            if response.status_code in {403, 405}:
                response = await c.get(normalized)
            if response.status_code >= 400:
                return None
            return self._normalize_url(str(response.url)) or normalized

        try:
            if _client:
                final_url = await _check(_client)
            else:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, verify=False) as c:
                    final_url = await _check(c)
        except Exception as exc:
            logger.debug(f"Source validation failed for {normalized}: {exc}")
            return None

        if final_url is None:
            return None
        return {"title": title or final_url, "url": final_url, "description": description or "Verified source"}

    async def _finalize_sources(
        self,
        raw_sources: Any,
        raw_research_text: str,
        user_sources: Optional[List[str]] = None,
        grounding_candidates: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        candidates: List[Dict[str, str]] = list(grounding_candidates or [])

        if isinstance(raw_sources, list):
            for item in raw_sources:
                if isinstance(item, dict):
                    candidates.append(item)

        for url in self._extract_candidate_urls(raw_research_text):
            candidates.append({"title": "", "url": url, "description": "Referenced in research"})

        for url in user_sources or []:
            candidates.append({"title": "", "url": url, "description": "Provided by user"})

        seen = set()
        deduped = []
        for item in candidates:
            normalized = self._normalize_url(str(item.get("url", "")))
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            deduped.append({**item, "url": normalized})

        sem = asyncio.Semaphore(5)

        async def _bounded(item, client):
            async with sem:
                return await self._validate_source(item, _client=client)

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, verify=False) as shared:
            validated = await asyncio.gather(*(_bounded(item, shared) for item in deduped[:12]))

        finalized, seen_final = [], set()
        for item in validated:
            if not item or item["url"] in seen_final:
                continue
            seen_final.add(item["url"])
            finalized.append(item)
            if len(finalized) >= 8:
                break
        return finalized

    @staticmethod
    async def _serpapi_search(query: str, num_results: int = 8) -> List[Dict[str, str]]:
        api_key = os.getenv("SERPAPI_API_KEY", "")
        if not api_key:
            return []
        try:
            def _run() -> dict:
                from serpapi import GoogleSearch
                return GoogleSearch({"q": query, "num": num_results, "api_key": api_key}).get_dict()

            raw = await asyncio.to_thread(_run)
            return [
                {"title": r.get("title", ""), "url": r["link"], "description": r.get("snippet", "")}
                for r in raw.get("organic_results", [])
                if r.get("link")
            ]
        except Exception as exc:
            logger.warning(f"Research: SerpAPI search failed: {exc}")
            return []

    async def _scrape_url(self, url: str, _client: Optional[httpx.AsyncClient] = None) -> str:
        async def _do(c: httpx.AsyncClient) -> str:
            resp = await c.get(url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for tag in soup(["script", "style"]):
                    tag.decompose()
                text = soup.get_text(separator=" ", strip=True)
                return f"SOURCE CONTENT ({url}): {text[:2000]}..."
            return ""

        try:
            if _client:
                return await _do(_client)
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, verify=False) as c:
                return await _do(c)
        except Exception as exc:
            logger.warning(f"Research: scrape failed for {url}: {exc}")
            return ""

    def _optimize_image(self, image_bytes: bytes, mime_type: str) -> str:
        if len(image_bytes) < 900_000:
            return f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode()}"

        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85, optimize=True)
            if buf.tell() > 1_000_000:
                img = img.resize((int(img.width * 0.75), int(img.height * 0.75)), Image.Resampling.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75, optimize=True)
            return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"
        except Exception as exc:
            logger.warning(f"Image optimization failed: {exc}")
            return f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode()}"

    async def generate_cover_image(self, topic: str, category: str, article_content: Optional[str] = None) -> str:
        context = f" Based on this article summary: {article_content[:500]}..." if article_content else ""
        prompt = (
            f"A professional, high-fidelity editorial real photo for an article about "
            f"{topic} in the {category} category.{context} Real photography, photo-journalism style, "
            f"cinematic lighting, ultra-realistic, 8k resolution, no text. "
            f"Lens: 35mm f/1.8. Avoid illustrations, 3D renders, or digital art."
        )

        if self.genai_client:
            try:
                response = await self.genai_client.aio.models.generate_content(
                    model="models/gemini-2.5-flash-image",
                    contents=[{"role": "user", "parts": [{"text": prompt}]}],
                )
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "inline_data") and part.inline_data:
                        return self._optimize_image(part.inline_data.data, part.inline_data.mime_type or "image/png")
            except Exception as exc:
                logger.warning(f"Image: Gemini failed: {exc}")

        if self.openai_key:
            try:
                from openai import AsyncOpenAI as _AsyncOpenAI
                _oai = _AsyncOpenAI(api_key=self.openai_key)
                resp = await _oai.images.generate(
                    model="dall-e-3",
                    prompt=prompt,
                    size="1024x1024",
                    response_format="b64_json",
                )
                b64 = resp.data[0].b64_json if resp.data else None
                if b64:
                    return self._optimize_image(base64.b64decode(b64), "image/png")
            except Exception as exc:
                logger.warning(f"Image: DALL-E fallback failed: {exc}")

        serpapi_key = os.getenv("SERPAPI_API_KEY", "")
        if serpapi_key:
            try:
                def _serpapi_img():
                    from serpapi import GoogleSearch
                    return GoogleSearch({
                        "engine": "google_images",
                        "q": f"{topic} {category} editorial journalism",
                        "api_key": serpapi_key,
                        "num": 10,
                        "safe": "active",
                    }).get_dict()

                result = await asyncio.wait_for(asyncio.to_thread(_serpapi_img), timeout=12.0)
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, verify=False) as img_client:
                    for img in result.get("images_results", [])[:8]:
                        url = img.get("original", "")
                        if url and url.startswith("https://"):
                            resp = await img_client.get(url)
                            if resp.status_code == 200:
                                mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                                return self._optimize_image(resp.content, mime)
            except Exception as exc:
                logger.warning(f"Image: SerpAPI fallback failed: {exc}")

        try:
            import urllib.request as _urllib
            safe_q = f"{topic} {category}".replace(" ", "+")[:120]

            def _unsplash():
                req = _urllib.Request(
                    f"https://source.unsplash.com/1200x800/?{safe_q}",
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                with _urllib.urlopen(req, timeout=10) as r:
                    return r.url if "images.unsplash.com" in r.url else None

            unsplash_url = await asyncio.wait_for(asyncio.to_thread(_unsplash), timeout=12.0)
            if unsplash_url:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    resp = await client.get(unsplash_url)
                    if resp.status_code == 200:
                        mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                        return self._optimize_image(resp.content, mime)
        except Exception as exc:
            logger.warning(f"Image: Unsplash fallback failed: {exc}")

        raise RuntimeError("Cover image generation failed: all providers exhausted")

    async def conduct_research(
        self,
        topic: str,
        category: str,
        tone: str,
        target_audience: str,
        persona: str = "Analytical",
        enable_web_search: bool = True,
        sources: Optional[List[str]] = None,
        grounding_sources: Optional[List[dict]] = None,
        history: Optional[List[dict]] = None,
        llm_svc=None,
        language: str = "English",
    ) -> dict:
        scrape_client = httpx.AsyncClient(timeout=10.0, follow_redirects=True, verify=False)

        async def _scrape_user_sources() -> List[str]:
            if not sources:
                return []
            tasks = [self._scrape_url(url, _client=scrape_client) for url in sources]
            return [c for c in await asyncio.gather(*tasks) if c]

        async def _do_web_search() -> List[Dict[str, str]]:
            if not enable_web_search:
                return []
            return await self._serpapi_search(topic, num_results=8)

        async with scrape_client:
            user_scraped, serp_results = await asyncio.gather(_scrape_user_sources(), _do_web_search())
            serp_scraped: List[str] = []
            if serp_results:
                tasks = [self._scrape_url(r["url"], _client=scrape_client) for r in serp_results[:5]]
                serp_scraped = [c for c in await asyncio.gather(*tasks) if c]

        source_context = ""
        if user_scraped:
            source_context = "\n\nACTUAL SOURCE MATERIAL PROVIDED BY USER (WEB):\n" + "\n---\n".join(user_scraped)

        grounding_context = ""
        if grounding_sources:
            docs = []
            for doc in grounding_sources:
                body = doc.get("content", "")
                if body:
                    docs.append(f"DOCUMENT ({doc.get('name', 'Unknown')}): {body[:3000]}...")
            if docs:
                grounding_context = "\n\nGROUNDED SOURCE MATERIAL (UPLOADED FILES):\n" + "\n---\n".join(docs)

        history_context = ""
        if history:
            history_context = "\n\nCHAT HISTORY CONTEXT:\n"
            for msg in history[-3:]:
                role = "User" if msg["role"] == "user" else "Assistant/Previous Article"
                content = msg["content"][:500] + "..." if len(msg["content"]) > 500 else msg["content"]
                history_context += f"{role}: {content}\n"

        prompt = GEMINI_RESEARCH_PROMPT.format(
            topic=topic, category=category, tone=tone, target_audience=target_audience,
        )
        prompt += f"\n\nOUTPUT LANGUAGE: {language}. Provide all insights in {language}."

        if source_context:
            prompt += source_context + "\n\nINSTRUCTION: Analyze the web source material above."
        if grounding_context:
            prompt += grounding_context + "\n\nINSTRUCTION: CRITICAL. Prioritize these insights over web research."
        if history_context:
            prompt += history_context + "\n\nINSTRUCTION: Consider the conversation history above."

        persona_data = PERSONA_CONFIGS.get(persona, PERSONA_CONFIGS[DEFAULT_PERSONA])
        prompt += (
            f"\n\nJOURNALISTIC PERSONA: {persona}\n"
            f"Description: {persona_data['description']}\n"
            f"Research Focus: {persona_data['style_instructions']}"
        )


        grounding_candidates: List[Dict[str, str]] = list(serp_results)

        if serp_results:
            serp_context = "\n\nWEB SEARCH RESULTS (via SerpAPI):\n"
            for r in serp_results:
                serp_context += f"\n[{r['title']}] {r['url']}\n{r['description']}\n"
            if serp_scraped:
                serp_context += "\n\nSCRAPED ARTICLE CONTENT FROM WEB:\n" + "\n---\n".join(serp_scraped)
            raw_research_text = prompt + serp_context
        else:
            raw_research_text = prompt

        structure_prompt = f"""You are a research analyst. Convert the raw research notes below into a structured JSON object.

Raw Research:
\"\"\"
{raw_research_text[:8000]}
\"\"\"

Return ONLY this JSON structure:
{{
  "core_facts": ["fact1", "fact2", "fact3"],
  "statistics": ["stat with context 1", "stat with context 2"],
  "trends": ["trend1", "trend2", "trend3"],
  "contrarian_perspectives": ["contrarian view 1", "contrarian view 2"],
  "hidden_challenges": ["challenge1", "challenge2"],
  "stakeholders": ["stakeholder + role 1", "stakeholder + role 2"],
  "examples": ["example1", "example2"],
  "data_insights": [
    {{"label": "Metric name (e.g., Growth Rate)", "formatted_value": "$1.2B", "progress": 75, "value": 1200000000, "context": "One-sentence context about this specific data point"}}
  ]
}}
CRITICAL: For 'data_insights', focus on HARD NUMBERS and PERCENTAGES found in the research. These will be used for charts.
All text values MUST be in {language}.
"""

        structured: Optional[dict] = None
        if self.genai_client:
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            )
            resp = await self.genai_client.aio.models.generate_content(
                model="models/gemini-2.5-flash",
                contents=structure_prompt,
                config=config,
            )
            structured = json.loads(resp.text or "{}")
        elif llm_svc:
            structured = await llm_svc.completion_small_json([
                {"role": "system", "content": "You are a research analyst. Return ONLY valid JSON."},
                {"role": "user", "content": structure_prompt},
            ])

        try:
            result = structured or {}
            step2_sources = result.get("sources") if not grounding_candidates else None
            result["sources"] = await self._finalize_sources(
                step2_sources,
                raw_research_text,
                user_sources=sources,
                grounding_candidates=grounding_candidates,
            )
            return result
        except Exception as exc:
            logger.error(f"Research: structuring failed: {exc}")
            return {
                "core_facts": [], "statistics": [], "trends": [], "contrarian_perspectives": [],
                "hidden_challenges": [], "stakeholders": [], "examples": [], "data_insights": [], "sources": [],
            }
