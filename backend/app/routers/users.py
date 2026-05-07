from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import db
from app.core.dependencies import get_current_user

router = APIRouter()

_DEFAULT_PREFERENCES = {
    "auto_classify_emails": True,
    "auto_schedule_meetings": False,
    "timezone": "UTC",
    "gmail_connected": False,
    "calendar_connected": False,
    "llm_provider": "gemini",
    "preferred_model": "gemini-2.0-flash",
    "is_monitoring": False,
}


@router.get("/preferences")
async def get_preferences(email: str = Depends(get_current_user)):
    user = await db.db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.get("preferences", _DEFAULT_PREFERENCES)


@router.put("/preferences")
async def update_preferences(
    preferences: Dict[str, Any],
    email: str = Depends(get_current_user),
):
    user = await db.db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    merged = {**user.get("preferences", {}), **preferences}
    await db.db.users.update_one(
        {"email": email.lower()},
        {"$set": {"preferences": merged}},
    )
    return {"status": "success", "preferences": merged}
