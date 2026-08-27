"""
Admin — Email Template Studio Routes
=====================================
Base path (after admin prefix): /email-templates-studio

Registered in admin/__init__.py as:
    admin_router.include_router(email_templates_router, prefix="/email-templates-studio")

Full API paths become: /api/v1/admin/email-templates-studio/...
"""

from __future__ import annotations

import uuid
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.auth import require_permission
from app.models.user import User
from app.models.email_template import EmailTemplateType
from app.schemas.responses import SuccessResponse
from app.schemas.email_template import (
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailTemplateRenderRequest,
    EmailTemplateSendTestRequest,
    EmailTemplateResponse,
    EmailTemplateListResponse,
    EmailTemplatePreviewResponse,
    TemplateVariablesResponse,
)
from app.services.email_template_service import EmailTemplateService, SAMPLE_VARIABLE_VALUES
from app.services.admin_audit_service import AdminAuditService

logger = logging.getLogger(__name__)

router = APIRouter(redirect_slashes=False)

# Permission shortcuts
_VIEW_PERM = "system.email_templates.view"
_MANAGE_PERM = "system.email_templates.manage"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize(tmpl) -> dict:
    return {
        "id": str(tmpl.id),
        "name": tmpl.name,
        "slug": tmpl.slug,
        "template_type": tmpl.template_type,
        "description": tmpl.description,
        "subject_template": tmpl.subject_template,
        "html_content": tmpl.html_content,
        "text_content": tmpl.text_content,
        "design_config": tmpl.design_config,
        "variables": tmpl.variables,
        "is_active": tmpl.is_active,
        "is_default": tmpl.is_default,
        "created_by": str(tmpl.created_by) if tmpl.created_by else None,
        "updated_by": str(tmpl.updated_by) if tmpl.updated_by else None,
        "created_at": tmpl.created_at.isoformat() if tmpl.created_at else None,
        "updated_at": tmpl.updated_at.isoformat() if tmpl.updated_at else None,
    }


# ---------------------------------------------------------------------------
# GET /variables/{template_type}
# Must be before /{id} to avoid path ambiguity
# ---------------------------------------------------------------------------

@router.get("/variables/{template_type}", response_model=SuccessResponse)
def get_variables_for_type(
    template_type: EmailTemplateType,
    admin: User = Depends(require_permission(_VIEW_PERM)),
):
    """Return supported variable names and sample values for a template type."""
    variables = EmailTemplateService.get_variables_for_type(template_type)
    sample = EmailTemplateService.get_sample_values_for_type(template_type)
    return SuccessResponse(
        message="Variables retrieved",
        data={
            "template_type": template_type,
            "variables": [f"{{{{{v}}}}}" for v in variables],
            "variable_names": variables,
            "sample_values": sample,
        },
    )


# ---------------------------------------------------------------------------
# POST /render  — render unsaved draft (live preview)
# ---------------------------------------------------------------------------

@router.post("/render", response_model=SuccessResponse)
def render_draft(
    body: EmailTemplateRenderRequest,
    admin: User = Depends(require_permission(_VIEW_PERM)),
):
    """Render an unsaved draft for live preview. Returns rendered subject + HTML."""
    try:
        rendered_subject, rendered_html = EmailTemplateService.render_preview(
            subject_template=body.subject_template,
            html_content=body.html_content,
            design_config=body.design_config,
            variables=body.variables,
        )
        return SuccessResponse(
            message="Preview rendered",
            data={
                "rendered_subject": rendered_subject,
                "rendered_html": rendered_html,
            },
        )
    except Exception as e:
        logger.exception("Draft render failed")
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# GET /  — list templates
# ---------------------------------------------------------------------------

@router.get("", response_model=SuccessResponse)
def list_templates(
    template_type: EmailTemplateType | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_VIEW_PERM)),
):
    """List all templates, optionally filtered by type."""
    items, total = EmailTemplateService.list_templates(db, template_type, skip, limit)
    return SuccessResponse(
        message="Templates retrieved",
        data={
            "items": [_serialize(t) for t in items],
            "total": total,
        },
    )


# ---------------------------------------------------------------------------
# POST /  — create template
# ---------------------------------------------------------------------------

@router.post("", response_model=SuccessResponse)
def create_template(
    body: EmailTemplateCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_MANAGE_PERM)),
):
    """Create a new email template."""
    try:
        tmpl = EmailTemplateService.create_template(db, body, actor_id=admin.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    AdminAuditService.log_action(
        db,
        actor_id=admin.id,
        action="EMAIL_TEMPLATE_CREATED",
        target_id=tmpl.id,
        permission_used=_MANAGE_PERM,
        request=request,
        metadata_json={"template_name": tmpl.name, "template_type": tmpl.template_type},
    )

    return SuccessResponse(
        message="Template created successfully",
        data=_serialize(tmpl),
    )


# ---------------------------------------------------------------------------
# GET /{id}  — get one template
# ---------------------------------------------------------------------------

@router.get("/{template_id}", response_model=SuccessResponse)
def get_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_VIEW_PERM)),
):
    try:
        tmpl = EmailTemplateService.get_template(db, template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return SuccessResponse(message="Template retrieved", data=_serialize(tmpl))


# ---------------------------------------------------------------------------
# PUT /{id}  — update template
# ---------------------------------------------------------------------------

@router.put("/{template_id}", response_model=SuccessResponse)
def update_template(
    template_id: uuid.UUID,
    body: EmailTemplateUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_MANAGE_PERM)),
):
    try:
        tmpl = EmailTemplateService.update_template(db, template_id, body, actor_id=admin.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    AdminAuditService.log_action(
        db,
        actor_id=admin.id,
        action="EMAIL_TEMPLATE_UPDATED",
        target_id=tmpl.id,
        permission_used=_MANAGE_PERM,
        request=request,
        metadata_json={"template_name": tmpl.name},
    )

    return SuccessResponse(message="Template updated successfully", data=_serialize(tmpl))


# ---------------------------------------------------------------------------
# DELETE /{id}  — delete template
# ---------------------------------------------------------------------------

@router.delete("/{template_id}", response_model=SuccessResponse)
def delete_template(
    template_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_MANAGE_PERM)),
):
    try:
        tmpl = EmailTemplateService.get_template(db, template_id)
        tmpl_name = tmpl.name
        EmailTemplateService.delete_template(db, template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    AdminAuditService.log_action(
        db,
        actor_id=admin.id,
        action="EMAIL_TEMPLATE_DELETED",
        permission_used=_MANAGE_PERM,
        request=request,
        metadata_json={"template_id": str(template_id), "template_name": tmpl_name},
    )

    return SuccessResponse(message="Template deleted successfully")


# ---------------------------------------------------------------------------
# POST /{id}/duplicate
# ---------------------------------------------------------------------------

@router.post("/{template_id}/duplicate", response_model=SuccessResponse)
def duplicate_template(
    template_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_MANAGE_PERM)),
):
    try:
        copy = EmailTemplateService.duplicate_template(db, template_id, actor_id=admin.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    AdminAuditService.log_action(
        db,
        actor_id=admin.id,
        action="EMAIL_TEMPLATE_DUPLICATED",
        target_id=copy.id,
        permission_used=_MANAGE_PERM,
        request=request,
        metadata_json={"source_id": str(template_id), "copy_name": copy.name},
    )

    return SuccessResponse(message="Template duplicated", data=_serialize(copy))


# ---------------------------------------------------------------------------
# POST /{id}/activate
# ---------------------------------------------------------------------------

@router.post("/{template_id}/activate", response_model=SuccessResponse)
def activate_template(
    template_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_MANAGE_PERM)),
):
    try:
        tmpl = EmailTemplateService.activate_template(db, template_id, actor_id=admin.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    AdminAuditService.log_action(
        db,
        actor_id=admin.id,
        action="EMAIL_TEMPLATE_ACTIVATED",
        target_id=tmpl.id,
        permission_used=_MANAGE_PERM,
        request=request,
        metadata_json={"template_name": tmpl.name, "template_type": tmpl.template_type},
    )

    return SuccessResponse(
        message=f"Template '{tmpl.name}' activated and set as default for {tmpl.template_type}",
        data=_serialize(tmpl),
    )


# ---------------------------------------------------------------------------
# POST /{id}/deactivate
# ---------------------------------------------------------------------------

@router.post("/{template_id}/deactivate", response_model=SuccessResponse)
def deactivate_template(
    template_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_MANAGE_PERM)),
):
    try:
        tmpl = EmailTemplateService.deactivate_template(db, template_id, actor_id=admin.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    AdminAuditService.log_action(
        db,
        actor_id=admin.id,
        action="EMAIL_TEMPLATE_DEACTIVATED",
        target_id=tmpl.id,
        permission_used=_MANAGE_PERM,
        request=request,
        metadata_json={"template_name": tmpl.name},
    )

    return SuccessResponse(message=f"Template '{tmpl.name}' deactivated", data=_serialize(tmpl))


# ---------------------------------------------------------------------------
# POST /{id}/preview  — render saved template with sample data
# ---------------------------------------------------------------------------

@router.post("/{template_id}/preview", response_model=SuccessResponse)
def preview_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_VIEW_PERM)),
):
    """Render a saved template with sample variable values for preview."""
    try:
        tmpl = EmailTemplateService.get_template(db, template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    sample = EmailTemplateService.get_sample_values_for_type(tmpl.template_type)
    rendered_subject, rendered_html = EmailTemplateService.render_preview(
        subject_template=tmpl.subject_template,
        html_content=tmpl.html_content,
        design_config=tmpl.design_config,
        variables=sample,
        template_type=tmpl.template_type,
    )

    return SuccessResponse(
        message="Preview generated",
        data={
            "rendered_subject": rendered_subject,
            "rendered_html": rendered_html,
        },
    )


# ---------------------------------------------------------------------------
# POST /{id}/test  — send test email using this template
# ---------------------------------------------------------------------------

@router.post("/{template_id}/test", response_model=SuccessResponse)
def send_test_email(
    template_id: uuid.UUID,
    body: EmailTemplateSendTestRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(_MANAGE_PERM)),
):
    """
    Send a test email using a saved template.
    Uses SAMPLE_VARIABLE_VALUES for variable substitution.
    Prefixes subject with [TEST] so it's clearly identifiable.
    Uses the existing EmailService._send_email_core() for actual delivery.
    """
    try:
        tmpl = EmailTemplateService.get_template(db, template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    sample = EmailTemplateService.get_sample_values_for_type(tmpl.template_type)
    # Override with caller-provided values if any
    if body.subject_template or body.html_content:
        # Sending from draft (unsaved template) overrides
        subject_tpl = body.subject_template or tmpl.subject_template
        html = body.html_content or tmpl.html_content
        cfg = body.design_config or tmpl.design_config
        rendered_subject, rendered_html = EmailTemplateService.render_preview(
            subject_tpl, html, cfg, sample
        )
    else:
        rendered_subject, rendered_html = EmailTemplateService.render_preview(
            tmpl.subject_template, tmpl.html_content, tmpl.design_config, sample
        )

    test_subject = f"[TEST] {rendered_subject}"

    try:
        from app.services.email_service import EmailService
        EmailService._send_email_core(
            db,
            to_email=body.recipient_email,
            subject=test_subject,
            html_content=rendered_html,
            user_role=admin.role.value,
        )
    except Exception as e:
        logger.error(f"Test email failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")

    AdminAuditService.log_action(
        db,
        actor_id=admin.id,
        action="EMAIL_TEMPLATE_TEST_SENT",
        target_id=tmpl.id,
        permission_used=_MANAGE_PERM,
        request=request,
        metadata_json={
            "template_name": tmpl.name,
            "recipient": body.recipient_email,
        },
    )

    return SuccessResponse(
        message=f"Test email sent to {body.recipient_email}",
        data={"recipient": body.recipient_email, "subject": test_subject},
    )
