"""
AI Journalist Tool - API routes.

Endpoints:
  POST /api/journalist/generate-content   SSE pipeline (research → outline → write → audit)
  POST /api/journalist/upload             Upload PDF/TXT and extract text for grounding
  POST /api/journalist/generate-image     Generate cover image (Imagen 4 → DALL-E 3 fallback)
  POST /api/journalist/generate-social-kit  Generate social media kit from article content
"""

import io
import os
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
from loguru import logger
from app.services.orchestrator import JournalistOrchestrator
from app.core.database import db
from app.models.schemas import Conversation, ChatMessage
import random

router = APIRouter(prefix="/journalist", tags=["journalist"])

# One shared orchestrator instance (services are stateless)
_orchestrator = JournalistOrchestrator()


# ── Request / Response models ──────────────────────────────────────────────────

class ContentRequest(BaseModel):
    query: str = Field(..., description="The main topic or query")
    category: str = Field("Technology", description="Domain category")
    tone: str = Field("Analytical", description="Writing tone")
    persona: str = Field("Analytical", description="Newsroom persona")
    enable_web_search: bool = Field(True, description="Use live Google Search grounding")
    target_audience: str = Field("General Professionals")
    sources: List[str] = Field(default_factory=list, description="Optional research URLs")
    grounding_sources: List[Dict[str, str]] = Field(default_factory=list, description="Uploaded docs {name, content}")
    history: List[Dict[str, str]] = Field(default_factory=list, description="Chat history")
    brand_voice: str = Field("Professional", description="Specific editorial brand voice")
    language: str = Field("English", description="Target output language")
    session_id: Optional[str] = Field(None, description="The session ID to group reports under")

class AudioRequest(BaseModel):
    content: str = Field(..., description="Article markdown content")


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/generate-content")
async def generate_content(
    request_body: ContentRequest,
    request: Request,
    email: str = Query(...),
):
    logger.info(
        f"Journalist: INCOMING REQUEST (user: {email}) | "
        f"query: '{request_body.query}' | "
        f"language: {request_body.language} | "
        f"persona: {request_body.persona} | "
        f"brand_voice: {request_body.brand_voice} | "
        f"tone: {request_body.tone}"
    )
    try:
        _orchestrator._assert_pipeline_keys(email)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return StreamingResponse(
        _orchestrator.run_pipeline(
            topic=request_body.query,
            category=request_body.category,
            tone=request_body.tone,
            target_audience=request_body.target_audience,
            user_id=0,
            user_email=email,
            persona=request_body.persona,
            enable_web_search=request_body.enable_web_search,
            sources=request_body.sources,
            grounding_sources=request_body.grounding_sources,
            history=request_body.history,
            brand_voice=request_body.brand_voice,
            language=request_body.language,
            session_id=request_body.session_id,
            db=db.db, # Pass DB for persistence
            request=request, # Pass request to handle disconnects
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
):
    """Extract text from a PDF or TXT file for use as grounding source."""
    filename = file.filename or "upload"
    logger.info(f"Journalist: Uploading file: {filename}")
    content = ""

    try:
        if filename.lower().endswith(".pdf"):
            raw = await file.read()
            reader = PdfReader(io.BytesIO(raw))
            for page in reader.pages:
                content += (page.extract_text() or "") + "\n"
        elif filename.lower().endswith(".txt"):
            content = (await file.read()).decode("utf-8")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Upload PDF or TXT.")

        return {"name": filename, "content": content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


class TranslateRequest(BaseModel):
    content: str = Field(..., description="Article markdown content to translate")
    target_language: str = Field(..., description="Target language (e.g. Hindi, Spanish)")


@router.post("/translate")
async def translate_article(
    request_body: TranslateRequest,
    email: str = Query(...),
):
    """Translate article content using the user's configured LLM."""
    from app.services.llm_service import JournalistLLMService
    import litellm

    logger.info(f"Journalist: Translating article to {request_body.target_language} for {email}")

    # Prioritize Gemini if available, otherwise fallback to OpenAI
    llm_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    llm_provider = "gemini" if os.getenv("GEMINI_API_KEY") else "openai"

    if not llm_api_key:
        raise HTTPException(status_code=400, detail="No AI provider key found in environment.")

    llm_svc = JournalistLLMService(provider=llm_provider, api_key=llm_api_key)

    system = (
        "You are a professional multilingual editor. "
        "Translate the article faithfully, preserving all markdown formatting. "
        "Return ONLY the translated markdown."
    )
    user_prompt = f"Translate the following article into **{request_body.target_language}**.\n\n{request_body.content[:12000]}"

    try:
        response = await litellm.acompletion(
            model=llm_svc.model_large,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user_prompt}],
            **llm_svc._call_kwargs(llm_svc.model_large),
        )
        return {"translated_content": response.choices[0].message.content.strip(), "language": request_body.target_language}
    except Exception as e:
        logger.error(f"Journalist: Translation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-image")
async def generate_image(
    request: Dict[str, Any],
    email: str = Query(...),
):
    """Generate a cover image for an article topic."""
    topic = request.get("topic")
    category = request.get("category", "General")
    article_content = request.get("article_content")
    
    logger.info(f"Journalist: Generating cover image for topic: {topic}")
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")

    gemini_svc, _llm = _orchestrator._make_services(email)
    try:
        image_url = await gemini_svc.generate_cover_image(topic, category, article_content)
        return {"image_url": image_url}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/generate-social-kit")
async def generate_social_kit(
    request: Dict[str, Any],
    email: str = Query(...),
):
    """Generate a social media distribution kit from article content."""
    article_content = request.get("article_content")
    
    logger.info("Journalist: Generating social kit for article content")
    if not article_content:
        raise HTTPException(status_code=400, detail="article_content is required")

    _, llm_svc = _orchestrator._make_services(email)
    if not llm_svc:
        raise HTTPException(status_code=400, detail="Social kit generation requires an AI provider key.")
    try:
        kit = await llm_svc.generate_social_kit(article_content)
        return kit
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/generate-audio")
async def generate_audio_briefing(
    request_body: AudioRequest,
    email: str = Query(...),
):
    logger.info(f"Journalist: Generating audio briefing for {email}")
    _, llm_svc = _orchestrator._make_services(email)
    if not llm_svc:
        raise HTTPException(status_code=400, detail="Audio briefing requires an AI provider key.")
    
    try:
        script = await llm_svc.generate_audio_briefing_script(request_body.content)
        sarvam_key = os.getenv("SARVAM_API_KEY", "").strip()
        if not sarvam_key:
             raise HTTPException(status_code=400, detail="Sarvam API key not configured.")
        
        _SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _SARVAM_TTS_URL,
                headers={"api-subscription-key": sarvam_key, "Content-Type": "application/json"},
                json={
                    "inputs": [script[:500]],
                    "target_language_code": "en-IN",
                    "speaker": "shubh",
                    "model": "bulbul:v3",
                    "enable_preprocessing": True,
                },
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail="TTS service error")
            data = resp.json()
            audios = data.get("audios", [])
            return {"audio_b64": audios[0], "script": script}
    except Exception as e:
        logger.error(f"Journalist: Audio briefing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ── Session & Report Management ────────────────────────────────────────────────

@router.get("/reports")
async def get_reports(email: str = Query(...)):
    """Fetch all reports for a user."""
    cursor = db.db.reports.find({"user_email": email.lower()}).sort("created_at", -1)
    reports = await cursor.to_list(length=100)
    # Remove MongoDB _id and ensure numeric id exists
    for r in reports:
        r["_id"] = str(r["_id"])
    return reports

@router.get("/sessions")
async def get_sessions(email: str = Query(...)):
    """Fetch all investigative sessions for a user."""
    # A session is grouped by reports with the same session_id or just all reports
    # For now, let's treat every report as a potential session entry
    cursor = db.db.reports.find({"user_email": email.lower()}).sort("created_at", -1)
    reports = await cursor.to_list(length=100)
    
    sessions = []
    seen_sessions = set()
    
    for r in reports:
        sid = r.get("session_id") or f"sess-{r['id']}"
        if sid not in seen_sessions:
            sessions.append({
                "session_id": sid,
                "latest_report_id": r["id"],
                "topic": r["topic"],
                "category": r["category"],
                "version_count": 1,
                "created_at": r["created_at"],
                "updated_at": r.get("updated_at", r["created_at"]),
                "image_url": r.get("image_url")
            })
            seen_sessions.add(sid)
        else:
            # Increment version count for the existing session
            for s in sessions:
                if s["session_id"] == sid:
                    s["version_count"] += 1
                    break
                    
    return sessions

@router.delete("/reports/{report_id}")
async def delete_report(report_id: int, email: str = Query(...)):
    """Delete a specific report."""
    result = await db.db.reports.delete_one({"id": report_id, "user_email": email.lower()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"status": "success"}

class SaveReportRequest(BaseModel):
    markdown_content: str
    topic: Optional[str] = None
    category: Optional[str] = None

@router.post("/reports/{report_id}/save")
async def save_report(report_id: int, request: SaveReportRequest, email: str = Query(...)):
    """Update report content (editorial edits)."""
    update_data = {
        "markdown_content": request.markdown_content,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if request.topic:
        update_data["topic"] = request.topic
    if request.category:
        update_data["category"] = request.category
        
    result = await db.db.reports.update_one(
        {"id": report_id, "user_email": email.lower()},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return {"id": report_id, "status": "success"}
    
# ── Conversation History (ChatGPT-style) ──────────────────────────────────────

@router.get("/conversations")
async def get_conversations(email: str = Query(...)):
    """Fetch all conversation summaries for a user."""
    cursor = db.db.conversations.find(
        {"user_email": email.lower()},
        {"messages": 0} # Don't return messages in the list
    ).sort("updated_at", -1)
    
    conversations = await cursor.to_list(length=100)
    for c in conversations:
        c["_id"] = str(c["_id"])
    return conversations

@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, email: str = Query(...)):
    """Fetch a specific conversation with all messages."""
    conv = await db.db.conversations.find_one({"id": conv_id, "user_email": email.lower()})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv["_id"] = str(conv["_id"])
    return conv

@router.post("/conversations")
async def save_conversation(conv: Conversation, email: str = Query(...)):
    """Create or update a full conversation thread."""
    conv_dict = conv.dict()
    # Convert datetime objects for MongoDB if needed, though Pydantic/Motor handles most
    conv_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.db.conversations.update_one(
        {"id": conv.id, "user_email": email.lower()},
        {"$set": conv_dict},
        upsert=True
    )
    return {"status": "success", "id": conv.id}

@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, email: str = Query(...)):
    """Delete an entire conversation thread."""
    result = await db.db.conversations.delete_one({"id": conv_id, "user_email": email.lower()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success"}
