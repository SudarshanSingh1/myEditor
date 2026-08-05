from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
import uuid
from app.models.feedback import FeedbackCategory, FeedbackPriority, FeedbackStatus


class FeedbackCreate(BaseModel):
    category: FeedbackCategory
    priority: FeedbackPriority
    subject: str = Field(..., max_length=255)
    description: str = Field(..., max_length=5000)
    browser_info: Optional[str] = Field(None, max_length=512)
    os: Optional[str] = Field(None, max_length=128)
    app_version: Optional[str] = Field(None, max_length=64)
    current_route: Optional[str] = Field(None, max_length=2048)


class FeedbackUpdateStatus(BaseModel):
    status: FeedbackStatus
    admin_reply: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: FeedbackCategory
    priority: FeedbackPriority
    subject: str
    description: str
    admin_reply: Optional[str] = None
    browser_info: Optional[str]
    os: Optional[str]
    app_version: Optional[str]
    current_route: Optional[str]
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
