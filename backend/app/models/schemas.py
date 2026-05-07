from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


class JournalistReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: Optional[str] = None
    topic: str
    category: str
    markdown_content: str
    research_summary: Optional[Dict[str, Any]] = None
    outline: Optional[Dict[str, Any]] = None
    data_insights: Optional[List[Any]] = None
    audit: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    social_kit: Optional[Dict[str, Any]] = None
    language: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class JournalistSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    topic: str
    category: str
    created_at: datetime
    image_url: Optional[str] = None


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str
    name: Optional[str] = None


class UserLogin(UserBase):
    password: str


class UserResponse(UserBase):
    id: str
    name: Optional[str] = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class EmailCheckResponse(BaseModel):
    exists: bool
    name: Optional[str] = None


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    article_data: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    social_kit: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=_now)


class Conversation(BaseModel):
    id: str
    user_email: str
    title: str
    category: str = "General"
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
