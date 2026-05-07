import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger

from app.services.llm import JournalistLLM
from app.services.research import JournalistResearch

_LLM_PROVIDER_PREFERENCE = ["gemini", "openai", "mistral"]

_ENV_MAP = {
    "openai":  "OPENAI_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "gemini":  "GEMINI_API_KEY",
}


def _resolve_keys() -> Tuple[str, str, str, str]:
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    openai_dalle_key = os.getenv("OPENAI_API_KEY", "")

    llm_provider = ""
    llm_api_key = ""
    for provider in _LLM_PROVIDER_PREFERENCE:
        key = os.getenv(_ENV_MAP.get(provider, ""), "")
        if key:
            llm_provider = provider
            llm_api_key = key
            break

    return gemini_key, llm_provider, llm_api_key, openai_dalle_key


class JournalistPipeline:
    def __init__(self):
        pass

    def make_services(self) -> Tuple[JournalistResearch, Optional[JournalistLLM]]:
        gemini_key, llm_provider, llm_api_key, openai_dalle_key = _resolve_keys()
        research_svc = JournalistResearch(gemini_key=gemini_key, openai_key=openai_dalle_key)
        llm_svc = JournalistLLM(provider=llm_provider, api_key=llm_api_key) if llm_provider else None
        return research_svc, llm_svc

    def assert_keys(self) -> None:
        _, llm_provider, llm_api_key, _ = _resolve_keys()
        if not llm_api_key:
            raise RuntimeError(
                "No AI writing provider key found. "
                "Set GEMINI_API_KEY, OPENAI_API_KEY, or MISTRAL_API_KEY."
            )
        logger.info(f"Pipeline: writing provider resolved — {llm_provider}")

    @staticmethod
    def _extract_word_count(topic: str) -> int:
        match = re.search(r"\b(\d+)\s*(?:word|words|w)\b", topic, re.IGNORECASE)
        if match:
            return max(int(match.group(1)), 200)
        return 200

    async def run(
        self,
        topic: str,
        category: str,
        tone: str,
        target_audience: str,
        user_email: str = "",
        persona: str = "Analytical",
        sources: Optional[List[str]] = None,
        grounding_sources: Optional[List[Dict[str, str]]] = None,
        history: Optional[List[Dict[str, str]]] = None,
        enable_web_search: bool = True,
        brand_voice: str = "Professional",
        language: str = "English",
        session_id: Optional[str] = None,
        db: Any = None,
        request: Any = None,
    ):
        def event(event_type: str, data: Any) -> str:
            payload: Dict[str, Any] = {"type": event_type}
            if event_type == "status":
                payload["message"] = data
            elif event_type == "result":
                payload["payload"] = data
            elif event_type in ("error", "report_saved"):
                payload["message"] = data
            return f"data: {json.dumps(payload)}\n\n"

        pipeline_start = time.perf_counter()

        try:
            keys = _resolve_keys()
            gemini_key, llm_provider, llm_api_key, openai_dalle_key = keys
            if not llm_api_key:
                yield event("error", "No AI writing provider key found")
                return

            research_svc = JournalistResearch(gemini_key=gemini_key, openai_key=openai_dalle_key)
            llm_svc = JournalistLLM(provider=llm_provider, api_key=llm_api_key)
            logger.info(f"Pipeline: writing provider={llm_provider}")

            yield event("status", "Analyzing topic and performing web discovery...")

            expected_word_count = self._extract_word_count(topic)

            if request and await request.is_disconnected():
                return

            # Stage 1 — Research
            t = time.perf_counter()
            research_data = await research_svc.conduct_research(
                topic=topic,
                category=category,
                tone=tone,
                target_audience=target_audience,
                persona=persona,
                enable_web_search=enable_web_search,
                sources=sources,
                grounding_sources=grounding_sources,
                history=history,
                llm_svc=llm_svc,
                brand_voice=brand_voice,
                language=language,
            )
            logger.info(f"Pipeline: stage 1 (research) {time.perf_counter() - t:.1f}s")

            data_insights = research_data.get("data_insights", [])
            if data_insights:
                yield event("status", f"Found {len(data_insights)} data points for visualization...")

            if request and await request.is_disconnected():
                return

            # Stage 2 — Outline
            yield event("status", "Structuring the narrative flow...")
            t = time.perf_counter()
            outline = await llm_svc.generate_outline(
                topic=topic,
                category=category,
                tone=tone,
                target_audience=target_audience,
                research_data=research_data,
                history=history,
                expected_word_count=expected_word_count,
                brand_voice=brand_voice,
                language=language,
            )
            logger.info(f"Pipeline: stage 2 (outline) {time.perf_counter() - t:.1f}s")

            if request and await request.is_disconnected():
                return

            # Stage 3 — Write
            yield event("status", f"Writing as {persona} journalist...")
            markdown_content = ""
            t = time.perf_counter()
            async for chunk in llm_svc.write_article(
                topic=topic,
                category=category,
                tone=tone,
                target_audience=target_audience,
                research_data=research_data,
                grounding_sources=grounding_sources,
                outline_data=outline,
                persona=persona,
                history=history,
                expected_word_count=expected_word_count,
                brand_voice=brand_voice,
                language=language,
            ):
                if request and await request.is_disconnected():
                    return
                markdown_content += chunk
                yield event("delta", chunk)
            logger.info(f"Pipeline: stage 3 (write) {time.perf_counter() - t:.1f}s")

            if request and await request.is_disconnected():
                return

            # Stage 4 — Audit
            yield event("status", f"Running editorial audit in {language}...")
            t = time.perf_counter()
            audit_data = await llm_svc.generate_pro_audit(
                markdown_content, persona, topic, brand_voice=brand_voice, language=language
            )
            logger.info(f"Pipeline: stage 4 (audit) {time.perf_counter() - t:.1f}s")
            logger.info(f"Pipeline: total {time.perf_counter() - pipeline_start:.1f}s")

            report = {
                "id": uuid.uuid4().hex,
                "user_email": user_email,
                "topic": topic,
                "category": category,
                "markdown_content": markdown_content,
                "research_summary": research_data,
                "outline": outline,
                "data_insights": data_insights,
                "audit": audit_data,
                "language": language,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "session_id": session_id or f"sess-{uuid.uuid4().hex[:8]}",
            }

            if db is not None:
                try:
                    await db.reports.insert_one(report.copy())
                    yield event("report_saved", {"id": report["id"]})
                except Exception as db_err:
                    logger.error(f"Pipeline: DB save failed: {db_err}")
                    yield event("error", "Report generated but could not be saved. Copy your content now.")

            yield event("result", report)

        except Exception as exc:
            elapsed = time.perf_counter() - pipeline_start
            logger.error(f"Pipeline: failed after {elapsed:.1f}s — {exc}")
            yield event("error", f"Pipeline failed: {exc}")
