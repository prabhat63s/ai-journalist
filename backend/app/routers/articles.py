import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel, Field, field_validator
from pypdf import PdfReader

from app.core.database import db
from app.core.dependencies import get_current_user
from app.models.schemas import Conversation
from app.routers.voice import call_sarvam_tts
from app.services.pipeline import JournalistPipeline

router = APIRouter(prefix="/journalist", tags=["articles"])

_pipeline = JournalistPipeline()

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


class ContentRequest(BaseModel):
    query: str = Field(..., description="Topic or research query")
    category: str = Field("Technology")
    tone: str = Field("Analytical")
    persona: str = Field("Analytical")
    enable_web_search: bool = Field(True)
    target_audience: str = Field("General Professionals")
    sources: List[str] = Field(default_factory=list)
    grounding_sources: List[Dict[str, str]] = Field(default_factory=list)
    history: List[Dict[str, str]] = Field(default_factory=list)
    language: str = Field("English")
    session_id: Optional[str] = Field(None)

    @field_validator("query")
    @classmethod
    def query_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("query cannot be empty")
        return v.strip()

    @field_validator("language")
    @classmethod
    def language_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("language cannot be empty")
        return v.strip()


class AudioRequest(BaseModel):
    content: str


class TranslateRequest(BaseModel):
    content: str
    target_language: str


class SaveReportRequest(BaseModel):
    markdown_content: str
    topic: Optional[str] = None
    category: Optional[str] = None


# ── Content Generation ─────────────────────────────────────────────────────────

@router.post("/generate-content")
async def generate_content(
    request_body: ContentRequest,
    request: Request,
    email: str = Depends(get_current_user),
):
    logger.info(
        f"articles: generate | user={email} query='{request_body.query}' "
        f"persona={request_body.persona} lang={request_body.language}"
    )
    try:
        _pipeline.assert_keys()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return StreamingResponse(
        _pipeline.run(
            topic=request_body.query,
            category=request_body.category,
            tone=request_body.tone,
            target_audience=request_body.target_audience,
            user_email=email,
            persona=request_body.persona,
            enable_web_search=request_body.enable_web_search,
            sources=request_body.sources,
            grounding_sources=request_body.grounding_sources,
            history=request_body.history,
            language=request_body.language,
            session_id=request_body.session_id,
            db=db.db,
            request=request,
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
    email: str = Depends(get_current_user),
):
    filename = file.filename or "upload"
    logger.info(f"articles: upload file={filename} user={email}")
    try:
        if filename.lower().endswith(".pdf"):
            raw = await file.read(_MAX_UPLOAD_BYTES + 1)
            if len(raw) > _MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")
            reader = PdfReader(io.BytesIO(raw))
            content = "".join((page.extract_text() or "") + "\n" for page in reader.pages)
        elif filename.lower().endswith(".txt"):
            raw = await file.read(_MAX_UPLOAD_BYTES + 1)
            if len(raw) > _MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")
            content = raw.decode("utf-8")
        else:
            raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")
        return {"name": filename, "content": content}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not process file: {exc}")


@router.post("/generate-image")
async def generate_image(
    request: Dict[str, Any],
    email: str = Depends(get_current_user),
):
    topic = request.get("topic")
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")

    category = request.get("category", "General")
    article_content = request.get("article_content")
    report_id = request.get("report_id")

    logger.info(f"articles: generate image topic='{topic}'")
    gemini_svc, _ = _pipeline.make_services()
    try:
        image_url = await gemini_svc.generate_cover_image(topic, category, article_content)

        # Persist image_url back to the report if a report_id was provided
        if report_id:
            await db.db.reports.update_one(
                {"id": str(report_id), "user_email": email.lower()},
                {"$set": {"image_url": image_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )

        return {"image_url": image_url}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/generate-social-kit")
async def generate_social_kit(
    request: Dict[str, Any],
    email: str = Depends(get_current_user),
):
    article_content = request.get("article_content")
    if not article_content:
        raise HTTPException(status_code=400, detail="article_content is required")

    report_id = request.get("report_id")

    logger.info(f"articles: generate social kit user={email}")
    _, llm_svc = _pipeline.make_services()
    if not llm_svc:
        raise HTTPException(status_code=400, detail="No AI provider key configured")
    try:
        kit = await llm_svc.generate_social_kit(article_content)

        # Persist social_kit back to the report if a report_id was provided
        if report_id:
            await db.db.reports.update_one(
                {"id": str(report_id), "user_email": email.lower()},
                {"$set": {"social_kit": kit, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )

        return kit
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/generate-audio")
async def generate_audio_briefing(
    request_body: AudioRequest,
    email: str = Depends(get_current_user),
):
    logger.info(f"articles: generate audio user={email}")
    _, llm_svc = _pipeline.make_services()
    if not llm_svc:
        raise HTTPException(status_code=400, detail="No AI provider key configured")
    try:
        script = await llm_svc.generate_audio_briefing_script(request_body.content)
        audio_b64 = await call_sarvam_tts(script[:500])
        return {"audio_b64": audio_b64, "script": script}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"articles: audio briefing failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/translate")
async def translate_article(
    request_body: TranslateRequest,
    email: str = Depends(get_current_user),
):
    logger.info(f"articles: translate to {request_body.target_language} user={email}")

    _, llm_svc = _pipeline.make_services()
    if not llm_svc:
        raise HTTPException(status_code=400, detail="No AI provider key configured")

    system = (
        "You are a professional multilingual editor. "
        "Translate the article faithfully, preserving all markdown formatting. "
        "Return ONLY the translated markdown."
    )
    prompt = f"Translate the following article into **{request_body.target_language}**.\n\n{request_body.content[:12000]}"

    try:
        translated = await llm_svc.complete([
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ])
        return {
            "translated_content": translated,
            "language": request_body.target_language,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"articles: translation failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Reports ────────────────────────────────────────────────────────────────────

_REPORT_LIST_PROJECTION = {"research_summary": 0, "outline": 0, "audit": 0, "data_insights": 0}


@router.get("/reports")
async def list_reports(email: str = Depends(get_current_user)):
    cursor = db.db.reports.find({"user_email": email.lower()}, _REPORT_LIST_PROJECTION).sort("created_at", -1)
    reports = await cursor.to_list(length=100)
    for r in reports:
        r["_id"] = str(r["_id"])
    return reports


@router.delete("/reports/{report_id}")
async def delete_report(report_id: str, email: str = Depends(get_current_user)):
    result = await db.db.reports.delete_one({"id": report_id, "user_email": email.lower()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"status": "success"}


@router.post("/reports/{report_id}/save")
async def save_report(
    report_id: str,
    body: SaveReportRequest,
    email: str = Depends(get_current_user),
):
    update: Dict[str, Any] = {
        "markdown_content": body.markdown_content,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.topic:
        update["topic"] = body.topic
    if body.category:
        update["category"] = body.category

    result = await db.db.reports.update_one(
        {"id": report_id, "user_email": email.lower()},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"id": report_id, "status": "success"}


# ── Sessions ───────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(email: str = Depends(get_current_user)):
    projection = {"_id": 0, "id": 1, "session_id": 1, "topic": 1, "category": 1, "created_at": 1, "updated_at": 1, "image_url": 1}
    cursor = db.db.reports.find({"user_email": email.lower()}, projection).sort("created_at", -1)
    reports = await cursor.to_list(length=100)

    sessions: Dict[str, Dict[str, Any]] = {}
    for r in reports:
        report_id = r.get("id", str(r.get("_id", "")))
        sid = r.get("session_id") or f"sess-{report_id}"
        if sid not in sessions:
            sessions[sid] = {
                "session_id": sid,
                "latest_report_id": report_id,
                "topic": r.get("topic", ""),
                "category": r.get("category", ""),
                "version_count": 1,
                "created_at": r.get("created_at"),
                "updated_at": r.get("updated_at", r.get("created_at")),
                "image_url": r.get("image_url"),
            }
        else:
            sessions[sid]["version_count"] += 1

    return list(sessions.values())


# ── Conversations ──────────────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(email: str = Depends(get_current_user)):
    cursor = db.db.conversations.find({"user_email": email.lower()}, {"messages": 0}).sort("updated_at", -1)
    conversations = await cursor.to_list(length=100)
    for c in conversations:
        c["_id"] = str(c["_id"])
    return conversations


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, email: str = Depends(get_current_user)):
    conv = await db.db.conversations.find_one({"id": conv_id, "user_email": email.lower()})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv["_id"] = str(conv["_id"])
    return conv


@router.post("/conversations")
async def save_conversation(conv: Conversation, email: str = Depends(get_current_user)):
    data = conv.model_dump()
    data["updated_at"] = datetime.now(timezone.utc)
    await db.db.conversations.update_one(
        {"id": conv.id, "user_email": email.lower()},
        {"$set": data},
        upsert=True,
    )
    return {"status": "success", "id": conv.id}


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, email: str = Depends(get_current_user)):
    result = await db.db.conversations.delete_one({"id": conv_id, "user_email": email.lower()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success"}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, email: str = Depends(get_current_user)):
    logger.info(f"articles: delete session={session_id} user={email}")
    
    # Delete all associated reports
    reports_res = await db.db.reports.delete_many({"session_id": session_id, "user_email": email.lower()})
    
    # Delete the conversation
    conv_res = await db.db.conversations.delete_one({"id": session_id, "user_email": email.lower()})
    
    if reports_res.deleted_count == 0 and conv_res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {
        "status": "success", 
        "reports_deleted": reports_res.deleted_count,
        "conversation_deleted": conv_res.deleted_count
    }
