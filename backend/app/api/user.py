from fastapi import APIRouter, HTTPException, Depends
from app.core.database import db
from typing import Optional, Dict, Any
from loguru import logger

router = APIRouter()

@router.get("/preferences")
async def get_preferences(email: str):
    user = await db.db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return preferences or default if not set
    return user.get("preferences", {
        "auto_classify_emails": True,
        "auto_schedule_meetings": False,
        "timezone": "UTC",
        "gmail_connected": False,
        "calendar_connected": False,
        "llm_provider": "gemini",
        "preferred_model": "gemini-2.0-flash",
        "is_monitoring": False
    })

@router.put("/preferences")
async def update_preferences(email: str, preferences: Dict[str, Any]):
    user = await db.db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update preferences in DB
    current_prefs = user.get("preferences", {})
    current_prefs.update(preferences)
    
    await db.db.users.update_one(
        {"email": email.lower()},
        {"$set": {"preferences": current_prefs}}
    )
    
    return {"status": "success", "preferences": current_prefs}
