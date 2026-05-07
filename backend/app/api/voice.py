"""
Voice routes - TTS REST endpoint for AI Journalist Audio Briefing.

TTS endpoint:
  POST /api/voice/tts?email=...  { "text": "..." }
  → Calls Sarvam Bulbul v3 → returns { "audio_b64": "<wav_base64>" }
"""

import os
import httpx
from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel

router = APIRouter()

_SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
async def text_to_speech(
    body: TTSRequest,
    email: str = Query(...),
):
    """
    Convert text to speech using Sarvam AI Bulbul v3.
    """
    sarvam_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not sarvam_key:
        raise HTTPException(status_code=500, detail="SARVAM_API_KEY not set")

    logger.info(f"TTS: generating audio for {email} (text_len={len(body.text)})")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _SARVAM_TTS_URL,
                headers={
                    "api-subscription-key": sarvam_key,
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [body.text[:5000]], # Sarvam limit is usually around here
                    "target_language_code": "en-IN",
                    "speaker": "shubh",
                    "model": "bulbul:v3",
                    "enable_preprocessing": True,
                },
            )
            
            if not resp.is_success:
                logger.error(f"TTS: Sarvam API failed with {resp.status_code}: {resp.text}")
                raise HTTPException(status_code=resp.status_code, detail="TTS generation failed")
                
            data = resp.json()
            audios = data.get("audios", [])
            
            if not audios:
                raise HTTPException(status_code=500, detail="No audio generated")
                
            return {"audio_b64": audios[0]}
            
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def voice_health():
    return {"status": "healthy", "service": "Voice TTS"}
