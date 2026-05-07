import json
import os
import re
import time
import asyncio
import random
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from app.services.gemini_service import JournalistGeminiService
from app.services.llm_service import JournalistLLMService
from loguru import logger

# Ordered preference list for LLM writing tasks.
# First provider whose key is available wins.
_LLM_PROVIDER_PREFERENCE = ["gemini", "groq", "openai", "anthropic", "mistral", "deepseek"]

def _resolve_journalist_keys(user_email: str) -> Tuple[str, str, str, str]:
    """
    Resolve keys for the AI Journalist pipeline using environment variables.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    
    llm_provider = ""
    llm_api_key = ""
    
    env_map = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "mistral": "MISTRAL_API_KEY",
        "groq": "GROQ_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
        "gemini": "GEMINI_API_KEY",
    }

    for provider in _LLM_PROVIDER_PREFERENCE:
        key = os.getenv(env_map.get(provider, ""), "")
        if key:
            llm_provider = provider
            llm_api_key = key
            break

    openai_dalle_key = os.getenv("OPENAI_API_KEY", "")

    return gemini_key, llm_provider, llm_api_key, openai_dalle_key


class JournalistOrchestrator:
    def __init__(self):
        pass

    def _make_services(self, user_email: str) -> tuple:
        gemini_key, llm_provider, llm_api_key, openai_dalle_key = _resolve_journalist_keys(user_email)
        gemini_svc = JournalistGeminiService(gemini_key=gemini_key, openai_key=openai_dalle_key)
        llm_svc = JournalistLLMService(provider=llm_provider, api_key=llm_api_key) if llm_provider else None
        return gemini_svc, llm_svc

    def _assert_pipeline_keys(self, user_email: str) -> None:
        _, llm_provider, llm_api_key, _ = _resolve_journalist_keys(user_email)
        if not llm_api_key:
            raise RuntimeError(
                "No AI writing provider key found (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.). "
                "Please set at least one in your environment variables."
            )
        logger.info(f"Journalist: keys resolved — writing_provider={llm_provider}")

    def _extract_word_count(self, topic: str) -> int:
        match = re.search(r'\b(\d+)\s*(?:word|words|w)\b', topic, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            return max(count, 200)
        return 200

    async def run_pipeline(
        self,
        topic: str,
        category: str,
        tone: str,
        target_audience: str,
        user_id: int,
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
        def make_event(event_type: str, data: Any) -> str:
            payload: Dict[str, Any] = {"type": event_type}
            if event_type == "status":
                payload["message"] = data
            elif event_type == "result":
                payload["payload"] = data
            elif event_type == "error":
                payload["message"] = data
            return f"data: {json.dumps(payload)}\n\n"

        pipeline_start = time.perf_counter()

        try:
            self._assert_pipeline_keys(user_email)
            gemini_svc, llm_svc = self._make_services(user_email)
            has_gemini = bool(gemini_svc.genai_client)
            effective_web_search = enable_web_search
            if enable_web_search and not has_gemini:
                yield make_event("status", "Using web research...")
            else:
                yield make_event("status", "Analyzing topic and performing web discovery...")

            expected_word_count = self._extract_word_count(topic)
            logger.info(f"Journalist: Target word count extracted: {expected_word_count} words")

            if request and await request.is_disconnected():
                logger.warning(f"Journalist: Client disconnected before research stage (user: {user_email})")
                return

            # Stage 1: Research
            t_research = time.perf_counter()
            research_data = await gemini_svc.conduct_research(
                topic=topic,
                category=category,
                tone=tone,
                target_audience=target_audience,
                persona=persona,
                enable_web_search=effective_web_search,
                sources=sources,
                grounding_sources=grounding_sources,
                history=history,
                llm_svc=llm_svc,
                brand_voice=brand_voice,
                language=language,
            )
            logger.info(f"Journalist Pipeline: Stage 1 (Research) completed in {time.perf_counter() - t_research:.1f}s")

            # Stage 2: Data insights
            data_insights = research_data.get("data_insights", [])
            if data_insights:
                yield make_event("status", f"Found {len(data_insights)} data points for visualization...")

            if request and await request.is_disconnected():
                logger.warning(f"Journalist: Client disconnected before outline stage (user: {user_email})")
                return

            # Stage 3: Outline
            yield make_event("status", "Structuring the narrative flow...")
            t_outline = time.perf_counter()
            outline = await llm_svc.generate_outline(
                topic=topic,
                category=category,
                tone=tone,
                target_audience=target_audience,
                research_data=research_data,
                history=history,
                expected_word_count=expected_word_count,
                brand_voice=brand_voice,
                language=language
            )
            logger.info(f"Journalist Pipeline: Stage 3 (Outline) completed in {time.perf_counter() - t_outline:.1f}s")

            # Stage 4: Write
            if request and await request.is_disconnected():
                logger.warning(f"Journalist: Client disconnected before writing stage (user: {user_email})")
                return
                
            yield make_event("status", f"Executing deep-dive report as an {persona} journalist...")
            markdown_content = ""
            t_write = time.perf_counter()
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
                language=language
            ):
                if request and await request.is_disconnected():
                    logger.warning(f"Journalist: Client disconnected during chunk generation (user: {user_email})")
                    return
                markdown_content += chunk
                yield make_event("delta", chunk)
            logger.info(f"Journalist Pipeline: Stage 4 (Write) completed in {time.perf_counter() - t_write:.1f}s")

            # Stage 5: Editorial Audit
            if request and await request.is_disconnected():
                logger.warning(f"Journalist: Client disconnected before audit stage (user: {user_email})")
                return
                
            yield make_event("status", f"Performing final editorial audit in {language}...")
            t_audit = time.perf_counter()
            audit_data = await llm_svc.generate_pro_audit(markdown_content, persona, topic, brand_voice=brand_voice, language=language)
            logger.info(f"Journalist Pipeline: Stage 5 (Audit) completed in {time.perf_counter() - t_audit:.1f}s")

            total = time.perf_counter() - pipeline_start
            logger.info(f"Journalist Pipeline: 🏁 Total generation time: {total:.1f}s")

            final = {
                "id": random.randint(100000, 999999),
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
                "session_id": session_id or f"sess-{uuid.uuid4().hex[:8]}" 
            }

            if db is not None:
                try:
                    await db.reports.insert_one(final.copy())
                    # Send a special event so the frontend knows the ID
                    yield make_event("report_saved", {"id": final["id"]})
                except Exception as db_err:
                    logger.error(f"Journalist: Failed to save report to DB: {db_err}")

            yield make_event("result", final)

        except Exception as e:
            total = time.perf_counter() - pipeline_start
            logger.error(f"Journalist Pipeline: Failed at some stage after {total:.1f}s. Error: {str(e)}")
            yield make_event("error", f"Pipeline failed: {str(e)}")
