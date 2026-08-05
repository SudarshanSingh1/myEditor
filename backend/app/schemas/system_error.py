from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
import uuid


class SystemErrorCreate(BaseModel):
    route: Optional[str] = Field(None, max_length=2048)
    browser: Optional[str] = Field(None, max_length=512)
    stack_trace: str = Field(..., max_length=10000)


class SystemErrorResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    route: Optional[str]
    browser: Optional[str]
    stack_trace: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
