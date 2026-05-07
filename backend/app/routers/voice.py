import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel

from app.core.dependencies import get_current_user

router = APIRouter()

_SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"


async def call_sarvam_tts(text: str) -> str:
    sarvam_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not sarvam_key:
        raise HTTPException(status_code=500, detail="SARVAM_API_KEY not configured")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            _SARVAM_TTS_URL,
            headers={"api-subscription-key": sarvam_key, "Content-Type": "application/json"},
            json={
                "inputs": [text[:5000]],
                "target_language_code": "en-IN",
                "speaker": "shubh",
                "model": "bulbul:v3",
                "enable_preprocessing": True,
            },
        )
    if not resp.is_success:
        logger.error(f"TTS: Sarvam API error {resp.status_code}: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail="TTS generation failed")
    audios = resp.json().get("audios", [])
    if not audios:
        raise HTTPException(status_code=500, detail="No audio returned")
    return audios[0]


class TTSRequest(BaseModel):
    text: str


@router.post("/tts")
async def text_to_speech(body: TTSRequest, email: str = Depends(get_current_user)):
    logger.info(f"TTS: request from {email} (chars={len(body.text)})")
    audio_b64 = await call_sarvam_tts(body.text)
    return {"audio_b64": audio_b64}
