from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.models.email_template import EmailTemplateType


# ---------------------------------------------------------------------------
# Design Config sub-schema
# ---------------------------------------------------------------------------

class DesignConfig(BaseModel):
    """Visual configuration for email template rendering."""

    theme: str = "dark"
    backgroundColor: str = "#09090b"
    cardColor: str = "#18181b"
    textColor: str = "#ffffff"
    mutedTextColor: str = "#a1a1aa"
    primaryColor: str = "#8b5cf6"
    secondaryColor: str = "#5b21b6"
    borderColor: str = "#27272a"
    borderRadius: int = 16
    logoUrl: str = ""
    headerStyle: str = "gradient"   # "gradient" | "solid"
    buttonStyle: str = "rounded"    # "rounded" | "square"
    footerEnabled: bool = True
    footerText: str = ""            # Custom footer override; empty = auto copyright


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class EmailTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9_-]+$")
    template_type: EmailTemplateType
    description: str | None = None
    subject_template: str = Field(..., min_length=1, max_length=255)
    html_content: str = Field(..., min_length=1)
    text_content: str | None = None
    design_config: dict[str, Any] | None = None
    variables: list[str] | None = None
    is_active: bool = False
    is_default: bool = False


class EmailTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    subject_template: str | None = Field(default=None, min_length=1, max_length=255)
    html_content: str | None = None
    text_content: str | None = None
    design_config: dict[str, Any] | None = None
    variables: list[str] | None = None
    is_active: bool | None = None
    is_default: bool | None = None


class EmailTemplateRenderRequest(BaseModel):
    """Render an unsaved draft for live preview."""

    subject_template: str
    html_content: str
    design_config: dict[str, Any] | None = None
    variables: dict[str, str] | None = None  # variable_name → sample value


class EmailTemplateSendTestRequest(BaseModel):
    """Send a test email using a saved or unsaved template."""

    recipient_email: str
    # If rendering from draft (not yet saved):
    subject_template: str | None = None
    html_content: str | None = None
    design_config: dict[str, Any] | None = None

    @field_validator("recipient_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.strip().lower()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class EmailTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    template_type: EmailTemplateType
    description: str | None
    subject_template: str
    html_content: str
    text_content: str | None
    design_config: dict[str, Any] | None
    variables: list[str] | None
    is_active: bool
    is_default: bool
    created_by: uuid.UUID | None
    updated_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class EmailTemplateListResponse(BaseModel):
    items: list[EmailTemplateResponse]
    total: int


class EmailTemplatePreviewResponse(BaseModel):
    rendered_subject: str
    rendered_html: str


class TemplateVariablesResponse(BaseModel):
    template_type: EmailTemplateType
    variables: list[str]
    sample_values: dict[str, str]
