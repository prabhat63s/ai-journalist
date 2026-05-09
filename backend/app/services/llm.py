import json
import re
from typing import AsyncIterator, List, Optional

from google import genai
from google.genai import types
from openai import AsyncOpenAI

from app.services.personas import DEFAULT_PERSONA, PERSONA_CONFIGS
from app.services.prompts import (
    GPT_OUTLINE_PROMPT_SYSTEM,
    GPT_OUTLINE_PROMPT_USER,
    GPT_WRITING_PROMPT_SYSTEM,
    GPT_WRITING_PROMPT_USER,
)

_MISTRAL_BASE_URL = "https://api.mistral.ai/v1"


def _parse_json(text: str) -> dict:
    if not text:
        raise ValueError("Empty response")

    # Clean up markdown code blocks
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    text = text.replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the first '{' and last '}'
    start = text.find("{")
    if start != -1:
        # Simple attempt to close truncated JSON
        candidate = text[start:]
        
        # Count braces
        open_braces = candidate.count("{")
        close_braces = candidate.count("}")
        open_brackets = candidate.count("[")
        close_brackets = candidate.count("]")
        
        # If truncated, try to close it
        if open_braces > close_braces:
            # This is a very basic fix-up for common truncation
            if candidate.strip().endswith(",") or candidate.strip().endswith('"'):
                # Try to close the current string/array/object
                temp = candidate.strip()
                if temp.endswith(","): temp = temp[:-1]
                
                # Close string if needed (very naive check)
                if temp.count('"') % 2 != 0:
                    temp += '"'
                
                # Close brackets and braces
                while open_brackets > close_brackets:
                    temp += "]"
                    open_brackets -= 1
                while open_braces > close_braces:
                    temp += "}"
                    open_braces -= 1
                
                try:
                    return json.loads(temp)
                except:
                    pass

        # Traditional sliding window search for valid JSON sub-block
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break

    raise ValueError(f"Could not parse JSON from response: {text[:500]}...")


class JournalistLLM:
    PROVIDER_MODELS = {
        "openai":   ("gpt-4o",                    "gpt-4o-mini"),
        "mistral":  ("mistral-large-latest",       "mistral-small-latest"),
        "gemini":   ("gemini-3.1-flash-lite",           "gemini-3.1-flash-lite"),
    }

    def __init__(self, provider: str, api_key: str):
        if not api_key:
            raise RuntimeError(f"No API key supplied for provider '{provider}'")
        self.provider = provider
        self.api_key = api_key
        models = self.PROVIDER_MODELS.get(provider, ("gpt-4o", "gpt-4o-mini"))
        self.model_large = models[0]
        self.model_small = models[1]

        if provider == "gemini":
            self._genai = genai.Client(api_key=api_key)
            self._openai: Optional[AsyncOpenAI] = None
        elif provider == "mistral":
            self._genai = None
            self._openai = AsyncOpenAI(api_key=api_key, base_url=_MISTRAL_BASE_URL)
        else:  # openai
            self._genai = None
            self._openai = AsyncOpenAI(api_key=api_key)

    @staticmethod
    def _to_gemini_contents(messages: List[dict]) -> list:
        """Convert OpenAI-format messages to Gemini multi-turn contents, skipping system messages."""
        contents = []
        for m in messages:
            role = m.get("role", "")
            if role == "system":
                continue
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": m.get("content", "")}]})
        return contents or [{"role": "user", "parts": [{"text": ""}]}]

    def _json_system_suffix(self) -> str:
        if self.provider == "gemini":
            return ""
        return "\n\nCRITICAL: Respond with ONLY a valid JSON object. No markdown, no prose. Start with { and end with }."

    async def _completion_json(self, model: str, messages: List[dict]) -> dict:
        if self._genai:
            system_parts = [m["content"] for m in messages if m["role"] == "system"]
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                system_instruction="\n".join(system_parts) if system_parts else None,
                max_output_tokens=2048, # Increased to prevent truncation
                temperature=0.1,
            )
            resp = await self._genai.aio.models.generate_content(
                model=f"models/{model}",
                contents=self._to_gemini_contents(messages),
                config=config,
            )
            return _parse_json(resp.text or "")

        resp = await self._openai.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
            max_tokens=2048,
        )
        return _parse_json(resp.choices[0].message.content or "")

    async def completion_small_json(self, messages: List[dict]) -> dict:
        """Public helper for external services (e.g. research) to get a JSON completion."""
        return await self._completion_json(self.model_small, messages)

    async def generate_outline(
        self,
        topic: str,
        category: str,
        tone: str,
        target_audience: str,
        research_data: dict,
        history: Optional[List[dict]] = None,
        expected_word_count: int = 200,
        language: str = "English",
    ) -> dict:
        system = GPT_OUTLINE_PROMPT_SYSTEM + self._json_system_suffix()
        prompt = GPT_OUTLINE_PROMPT_USER.format(
            topic=topic,
            category=category,
            tone=tone,
            target_audience=target_audience,
            research_data=json.dumps(research_data),
            expected_word_count=expected_word_count,
        )
        prompt += f"\n\nOUTPUT LANGUAGE: {language}. All text in the JSON MUST be in {language}."

        prompt += f"\n\nLENGTH: Design the outline for approximately {expected_word_count} words."
        prompt += "\n\nReturn your response as a valid JSON object only."

        messages = [{"role": "system", "content": system}]
        if history:
            messages.extend(history[-4:])
        messages.append({"role": "user", "content": prompt})

        return await self._completion_json(self.model_small, messages)

    async def write_article(
        self,
        topic: str,
        category: str,
        tone: str,
        target_audience: str,
        research_data: dict,
        grounding_sources: Optional[List[dict]],
        outline_data: dict,
        persona: str = "Analytical",
        history: Optional[List[dict]] = None,
        expected_word_count: int = 200,
        language: str = "English",
    ) -> AsyncIterator[str]:
        grounding_context = ""
        if grounding_sources:
            grounding_context = "\n\nACTUAL GROUNDED SOURCE MATERIAL (USER DOCUMENTS):\n"
            for i, doc in enumerate(grounding_sources):
                name = doc.get("name", f"Doc {i + 1}")
                grounding_context += (
                    f"--- START DOCUMENT: {name} ---\n"
                    f"{doc.get('content', '')[:5000]}\n"
                    "--- END DOCUMENT ---\n\n"
                )

        _writing_research = {
            k: research_data[k]
            for k in ("core_facts", "statistics", "trends", "examples", "sources")
            if k in research_data
        }
        prompt = GPT_WRITING_PROMPT_USER.format(
            topic=topic,
            category=category,
            tone=tone,
            target_audience=target_audience,
            research_data=json.dumps(_writing_research),
            outline_data=json.dumps(outline_data),
            expected_word_count=expected_word_count,
        )

        if grounding_context:
            prompt += grounding_context
            prompt += (
                "\n\nWRITING INSTRUCTION: Use the GROUNDED SOURCE MATERIAL above "
                "as your primary evidence. Cite documents inline as [Doc: filename]."
            )

        persona_data = PERSONA_CONFIGS.get(persona, PERSONA_CONFIGS[DEFAULT_PERSONA])
        prompt += (
            f"\n\nJOURNALISTIC PERSONA: {persona}\n"
            f"Publication Style: {persona_data['description']}\n"
            f"Style Instructions: {persona_data['style_instructions']}\n"
            f"Opening Style: {persona_data.get('opening_style', '')}\n"
            f"Quote Style: {persona_data.get('quote_style', '')}"
        )


        prompt += f"\n\nLENGTH: Write approximately {expected_word_count} words."
        prompt += f"\n\nLANGUAGE: Write the entire article in {language}."

        messages = [{"role": "system", "content": GPT_WRITING_PROMPT_SYSTEM}]
        if history:
            messages.extend(history[-4:])
        messages.append({"role": "user", "content": prompt})

        if self._genai:
            system_parts = [m["content"] for m in messages if m["role"] == "system"]
            config = types.GenerateContentConfig(
                system_instruction="\n".join(system_parts) if system_parts else None,
            )
            async for chunk in await self._genai.aio.models.generate_content_stream(
                model=f"models/{self.model_large}",
                contents=self._to_gemini_contents(messages),
                config=config,
            ):
                if chunk.text:
                    yield chunk.text
        else:
            stream = await self._openai.chat.completions.create(
                model=self.model_large,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

    async def generate_social_kit(self, article_content: str) -> dict:
        system = "You are an elite social media strategist." + self._json_system_suffix()
        prompt = f"""Analyze the following article and generate a professional distribution kit.
Include contextually relevant hashtags (3-5 per platform) in the JSON.

ARTICLE:
{article_content}

STRICT CHARACTER LIMITS:
1. X (Twitter) Thread: 5 posts. Each post MUST be under 280 characters.
2. LinkedIn Post: MUST be under 3,000 characters.
3. Newsletter Blurb: MUST be under 300 words.
4. Instagram Caption: MUST be under 2,200 characters.
5. Facebook Post: MUST be under 60,000 characters.

Return ONLY valid JSON:
{{
  "twitter_thread": ["Post 1", "Post 2", "Post 3", "Post 4", "Post 5"],
  "twitter_tags": ["tag1", "tag2", "tag3"],
  "linkedin_post": "Full text of the post",
  "linkedin_tags": ["tag1", "tag2", "tag3"],
  "newsletter_blurb": "Full text of the blurb",
  "newsletter_tags": ["tag1", "tag2", "tag3"],
  "instagram_caption": "Full text of the caption",
  "instagram_tags": ["tag1", "tag2", "tag3"],
  "facebook_post": "Full text of the post",
  "facebook_tags": ["tag1", "tag2", "tag3"]
}}"""

        messages = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
        return await self._completion_json(self.model_small, messages)

    async def generate_pro_audit(
        self,
        article_content: str,
        persona: str,
        topic: str,
        language: str = "English",
    ) -> dict:
        system = "You are a perfectionist newsroom editor." + self._json_system_suffix()
        prompt = f"""Act as a Senior Editorial Auditor. Analyze this article draft for journalistic excellence.
TOPIC: {topic}
TARGET PERSONA: {persona}

ARTICLE (first 8000 chars):
{article_content[:8000]}

OUTPUT LANGUAGE: {language}. All feedback MUST be in {language}.

Return ONLY valid JSON:
{{
  "status": "Passed",
  "sentiment_tone": "Evaluation of how well the piece matches the {persona} persona.",
  "entity_coverage": "Evaluation of stakeholder coverage, citations, and grounding quality.",
  "seo_recommendation": "One specific, actionable SEO keyword or structural recommendation."
}}"""

        messages = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
        return await self._completion_json(self.model_small, messages)

    async def generate_audio_briefing_script(self, article_content: str) -> str:
        system = (
            "You are a professional news anchor. "
            "Write a concise audio briefing script (100-150 words) from the article below. "
            "Focus on the headline and key findings. Conversational but authoritative. "
            "Return ONLY the spoken text — no stage directions, no headers."
        )
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": f"ARTICLE:\n{article_content[:8000]}"},
        ]

        if self._genai:
            system_parts = [m["content"] for m in messages if m["role"] == "system"]
            config = types.GenerateContentConfig(
                system_instruction="\n".join(system_parts) if system_parts else None,
            )
            resp = await self._genai.aio.models.generate_content(
                model=f"models/{self.model_small}",
                contents=self._to_gemini_contents(messages),
                config=config,
            )
            return (resp.text or "").strip()

        resp = await self._openai.chat.completions.create(
            model=self.model_small,
            messages=messages,
        )
        return (resp.choices[0].message.content or "").strip()

    async def complete(self, messages: List[dict]) -> str:
        """Plain text completion using the large model."""
        if self._genai:
            system_parts = [m["content"] for m in messages if m["role"] == "system"]
            config = types.GenerateContentConfig(
                system_instruction="\n".join(system_parts) if system_parts else None,
            )
            resp = await self._genai.aio.models.generate_content(
                model=f"models/{self.model_large}",
                contents=self._to_gemini_contents(messages),
                config=config,
            )
            return (resp.text or "").strip()

        resp = await self._openai.chat.completions.create(
            model=self.model_large,
            messages=messages,
        )
        return (resp.choices[0].message.content or "").strip()
