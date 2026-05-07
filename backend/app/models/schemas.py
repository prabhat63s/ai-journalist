from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Pydantic Models for API
class JournalistReportResponse(BaseModel):
    topic: str
    category: str
    markdown_content: str
    research_summary: Optional[Dict[str, Any]]
    outline: Optional[Dict[str, Any]]
    data_insights: Optional[List[Any]]
    audit: Optional[Dict[str, Any]]
    image_url: Optional[str]
    social_kit: Optional[Dict[str, Any]]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class JournalistSessionResponse(BaseModel):
    """One entry per session returned to the history panel (stateless)."""
    topic: str
    category: str
    created_at: datetime
    image_url: Optional[str]

    class Config:
        from_attributes = True

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

# --- Chat & Conversation History ---

class ChatMessage(BaseModel):
    id: str
    role: str # 'user' or 'assistant'
    content: str
    article_data: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    social_kit: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Conversation(BaseModel):
    id: str
    user_email: str
    title: str
    category: str = "General"
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
