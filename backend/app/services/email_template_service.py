"""
Email Template Service
======================
Handles all database template operations: CRUD, rendering, variable validation,
HTML sanitization, and preview generation.

The EmailService (email_service.py) remains the sole owner of SMTP delivery.
This service only handles template storage and rendering.

Variable Substitution
---------------------
Uses safe regex-based {{variable}} replacement only.
No eval(), no exec(), no arbitrary Python execution.
Unknown variables are detected and reported; they are NOT silently dropped.
"""

from __future__ import annotations

import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.email_template import EmailTemplate, EmailTemplateType
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Variable definitions per template type
# ---------------------------------------------------------------------------

# Maps template type → list of supported variable names (without {{ }})
TEMPLATE_VARIABLES: dict[EmailTemplateType, list[str]] = {
    EmailTemplateType.VERIFICATION: [
        "app_name", "user_name", "user_email", "otp",
    ],
    EmailTemplateType.PASSWORD_RESET: [
        "app_name", "user_name", "user_email", "otp",
    ],
    EmailTemplateType.WELCOME: [
        "app_name", "user_name", "user_email", "username",
        "temporary_password", "role", "frontend_url",
    ],
    EmailTemplateType.LOGIN_ALERT: [
        "app_name", "user_name", "user_email",
        "ip_address", "device", "browser", "operating_system", "login_time",
    ],
    EmailTemplateType.CUSTOM: [
        "app_name", "user_name", "user_email", "username",
        "subject", "message",
    ],
    EmailTemplateType.BROADCAST: [
        "app_name", "user_name", "user_email", "username",
        "subject", "message",
    ],
    EmailTemplateType.SMTP_TEST: [
        "app_name", "user_name", "user_email",
    ],
}

# Sample values used for live preview rendering (NEVER used for actual sending)
SAMPLE_VARIABLE_VALUES: dict[str, str] = {
    "app_name": "Hamara Editor",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "username": "johndoe",
    "otp": "482913",
    "temporary_password": "••••••••",
    "role": "Admin",
    "frontend_url": "https://hamaraeditor.com/login",
    "ip_address": "192.168.1.10",
    "device": "MacBook Pro",
    "browser": "Chrome",
    "operating_system": "macOS",
    "login_time": "August 27, 2026 at 02:30 PM UTC",
    "subject": "Hello from Hamara Editor",
    "message": "This is a preview of your custom message.",
}

# Allowed HTML tags for email (safe subset — script/iframe/form removed)
_ALLOWED_TAGS = {
    "html", "head", "body", "meta", "title", "style",
    "div", "span", "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "td", "th",
    "ul", "ol", "li",
    "a", "img",
    "strong", "b", "em", "i", "u", "s",
    "blockquote", "pre", "code",
    "center",
}

# Dangerous event handler patterns to strip
_DANGEROUS_ATTR_PATTERN = re.compile(
    r'\s+on\w+\s*=\s*["\'][^"\']*["\']',
    re.IGNORECASE,
)
# Strip <script> blocks (with content)
_SCRIPT_TAG_PATTERN = re.compile(
    r'<script\b[^>]*>.*?</script>',
    re.IGNORECASE | re.DOTALL,
)
# Strip javascript: href/src values
_JAVASCRIPT_HREF_PATTERN = re.compile(
    r'(href|src)\s*=\s*["\']javascript:[^"\']*["\']',
    re.IGNORECASE,
)
# Variable pattern: {{variable_name}}
_VARIABLE_PATTERN = re.compile(r'\{\{(\w+)\}\}')


class EmailTemplateService:

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_active_template(
        db: Session, template_type: EmailTemplateType
    ) -> EmailTemplate | None:
        """
        Return the active default template for a given type.
        Returns None if no active template exists → caller falls back to
        the hardcoded template in EmailService.
        """
        return (
            db.query(EmailTemplate)
            .filter(
                EmailTemplate.template_type == template_type,
                EmailTemplate.is_active == True,  # noqa: E712
                EmailTemplate.is_default == True,
            )
            .first()
        )

    @staticmethod
    def get_template(db: Session, template_id: uuid.UUID) -> EmailTemplate:
        """Return a template by ID, raise ValueError if not found."""
        tmpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
        if not tmpl:
            raise ValueError(f"Email template {template_id} not found")
        return tmpl

    @staticmethod
    def list_templates(
        db: Session,
        template_type: EmailTemplateType | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[EmailTemplate], int]:
        """Return (items, total) optionally filtered by type."""
        q = db.query(EmailTemplate)
        if template_type:
            q = q.filter(EmailTemplate.template_type == template_type)
        total = q.count()
        items = q.order_by(EmailTemplate.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    @staticmethod
    def create_template(
        db: Session,
        data: EmailTemplateCreate,
        actor_id: uuid.UUID,
    ) -> EmailTemplate:
        # Validate slug uniqueness
        existing = db.query(EmailTemplate).filter(EmailTemplate.slug == data.slug).first()
        if existing:
            raise ValueError(f"A template with slug '{data.slug}' already exists")

        # Sanitize HTML
        safe_html = EmailTemplateService.sanitize_html(data.html_content)

        # Validate variables
        allowed = EmailTemplateService.get_variables_for_type(data.template_type)
        unknown = EmailTemplateService.validate_variables(
            safe_html, data.subject_template, allowed
        )
        if unknown:
            raise ValueError(
                f"Unsupported variables found: {unknown}. "
                f"Allowed: {[f'{{{{{v}}}}}' for v in allowed]}"
            )

        tmpl = EmailTemplate(
            id=uuid.uuid4(),
            name=data.name,
            slug=data.slug,
            template_type=data.template_type,
            description=data.description,
            subject_template=data.subject_template,
            html_content=safe_html,
            text_content=data.text_content,
            design_config=data.design_config or EmailTemplateService._default_design_config(),
            variables=data.variables or [f"{{{{{v}}}}}" for v in allowed],
            is_active=data.is_active,
            is_default=data.is_default,
            created_by=actor_id,
            updated_by=actor_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(tmpl)
        db.commit()
        db.refresh(tmpl)
        return tmpl

    @staticmethod
    def update_template(
        db: Session,
        template_id: uuid.UUID,
        data: EmailTemplateUpdate,
        actor_id: uuid.UUID,
    ) -> EmailTemplate:
        tmpl = EmailTemplateService.get_template(db, template_id)

        if data.name is not None:
            tmpl.name = data.name
        if data.description is not None:
            tmpl.description = data.description
        if data.subject_template is not None:
            tmpl.subject_template = data.subject_template
        if data.html_content is not None:
            safe_html = EmailTemplateService.sanitize_html(data.html_content)
            # Re-validate variables against the template's type
            allowed = EmailTemplateService.get_variables_for_type(tmpl.template_type)
            unknown = EmailTemplateService.validate_variables(
                safe_html,
                data.subject_template or tmpl.subject_template,
                allowed,
            )
            if unknown:
                raise ValueError(
                    f"Unsupported variables: {unknown}. "
                    f"Allowed: {[f'{{{{{v}}}}}' for v in allowed]}"
                )
            tmpl.html_content = safe_html
        if data.text_content is not None:
            tmpl.text_content = data.text_content
        if data.design_config is not None:
            tmpl.design_config = data.design_config
        if data.variables is not None:
            tmpl.variables = data.variables
        if data.is_active is not None:
            tmpl.is_active = data.is_active
        if data.is_default is not None:
            tmpl.is_default = data.is_default

        tmpl.updated_by = actor_id
        tmpl.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(tmpl)
        return tmpl

    @staticmethod
    def delete_template(db: Session, template_id: uuid.UUID) -> None:
        """Hard delete a template. Deactivate before deleting to be safe."""
        tmpl = EmailTemplateService.get_template(db, template_id)
        tmpl.is_active = False
        tmpl.is_default = False
        db.commit()
        db.delete(tmpl)
        db.commit()

    @staticmethod
    def duplicate_template(
        db: Session,
        template_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> EmailTemplate:
        """Create a copy of a template with a new slug and inactive state."""
        source = EmailTemplateService.get_template(db, template_id)

        # Generate a unique slug for the copy
        base_slug = f"{source.slug}-copy"
        slug = base_slug
        counter = 1
        while db.query(EmailTemplate).filter(EmailTemplate.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        copy = EmailTemplate(
            id=uuid.uuid4(),
            name=f"{source.name} (Copy)",
            slug=slug,
            template_type=source.template_type,
            description=source.description,
            subject_template=source.subject_template,
            html_content=source.html_content,
            text_content=source.text_content,
            design_config=source.design_config,
            variables=source.variables,
            is_active=False,   # copy starts inactive
            is_default=False,
            created_by=actor_id,
            updated_by=actor_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(copy)
        db.commit()
        db.refresh(copy)
        return copy

    @staticmethod
    def activate_template(
        db: Session,
        template_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> EmailTemplate:
        """
        Activate a template and set it as the default for its type.
        Atomically deactivates all other defaults for the same type.
        """
        tmpl = EmailTemplateService.get_template(db, template_id)

        # Deactivate all other defaults for this type in one query
        (
            db.query(EmailTemplate)
            .filter(
                EmailTemplate.template_type == tmpl.template_type,
                EmailTemplate.id != template_id,
            )
            .update({"is_default": False, "is_active": False})
        )

        tmpl.is_active = True
        tmpl.is_default = True
        tmpl.updated_by = actor_id
        tmpl.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(tmpl)
        return tmpl

    @staticmethod
    def deactivate_template(
        db: Session,
        template_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> EmailTemplate:
        tmpl = EmailTemplateService.get_template(db, template_id)
        tmpl.is_active = False
        tmpl.is_default = False
        tmpl.updated_by = actor_id
        tmpl.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(tmpl)
        return tmpl

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------

    @staticmethod
    def render_template(
        template: EmailTemplate,
        variables: dict[str, str],
    ) -> tuple[str, str]:
        """
        Render a saved template with actual variable values.
        Returns (rendered_subject, rendered_html).
        """
        # Only substitute known variables for the template type
        allowed = EmailTemplateService.get_variables_for_type(template.template_type)
        safe_vars = {k: str(v) for k, v in variables.items() if k in allowed}

        rendered_subject = EmailTemplateService._substitute_variables(
            template.subject_template, safe_vars
        )
        # Apply design config wrapping then substitute variables in body
        body_html = EmailTemplateService._apply_design_config(
            template.html_content, template.design_config or {}
        )
        rendered_html = EmailTemplateService._substitute_variables(body_html, safe_vars)
        return rendered_subject, rendered_html

    @staticmethod
    def render_preview(
        subject_template: str,
        html_content: str,
        design_config: dict[str, Any] | None,
        variables: dict[str, str] | None,
        template_type: EmailTemplateType | None = None,
    ) -> tuple[str, str]:
        """
        Render an unsaved draft for live preview.
        Uses SAMPLE_VARIABLE_VALUES merged with any caller-provided values.
        """
        # Build safe variable map: sample defaults + caller overrides
        preview_vars: dict[str, str] = dict(SAMPLE_VARIABLE_VALUES)
        if variables:
            preview_vars.update({k: str(v) for k, v in variables.items()})

        rendered_subject = EmailTemplateService._substitute_variables(
            subject_template, preview_vars
        )
        safe_html = EmailTemplateService.sanitize_html(html_content)
        body_html = EmailTemplateService._apply_design_config(
            safe_html, design_config or {}
        )
        rendered_html = EmailTemplateService._substitute_variables(body_html, preview_vars)
        return rendered_subject, rendered_html

    # ------------------------------------------------------------------
    # Variable helpers
    # ------------------------------------------------------------------

    @staticmethod
    def get_variables_for_type(template_type: EmailTemplateType) -> list[str]:
        """Return list of allowed variable names (without {{ }}) for a type."""
        return TEMPLATE_VARIABLES.get(template_type, [])

    @staticmethod
    def get_sample_values_for_type(template_type: EmailTemplateType) -> dict[str, str]:
        """Return sample preview values for variables supported by this type."""
        allowed = EmailTemplateService.get_variables_for_type(template_type)
        return {k: SAMPLE_VARIABLE_VALUES[k] for k in allowed if k in SAMPLE_VARIABLE_VALUES}

    @staticmethod
    def validate_variables(
        html_content: str,
        subject_template: str,
        allowed_variables: list[str],
    ) -> list[str]:
        """
        Find {{variables}} used in content/subject that are NOT in allowed_variables.
        Returns a list of unsupported variable names (without braces).
        """
        combined = f"{subject_template}\n{html_content}"
        found_vars = set(_VARIABLE_PATTERN.findall(combined))
        allowed_set = set(allowed_variables)
        unknown = sorted(found_vars - allowed_set)
        return unknown

    @staticmethod
    def _substitute_variables(text: str, variables: dict[str, str]) -> str:
        """
        Safe {{variable}} substitution.
        Unknown variables are left as-is (not removed).
        No eval(), no exec().
        """
        def replacer(match: re.Match) -> str:
            key = match.group(1)
            return variables.get(key, match.group(0))  # leave unknown vars unchanged

        return _VARIABLE_PATTERN.sub(replacer, text)

    # ------------------------------------------------------------------
    # HTML sanitization
    # ------------------------------------------------------------------

    @staticmethod
    def sanitize_html(html_content: str) -> str:
        """
        Remove dangerous constructs from email HTML.
        Preserves all safe email HTML (tables, divs, inline styles, etc.).
        Does NOT use any external library — stdlib regex only.
        """
        # 1. Remove <script>...</script> blocks entirely
        cleaned = _SCRIPT_TAG_PATTERN.sub("", html_content)

        # 2. Remove event handler attributes (onclick, onload, onerror, etc.)
        cleaned = _DANGEROUS_ATTR_PATTERN.sub("", cleaned)

        # 3. Replace javascript: href/src values with #
        cleaned = _JAVASCRIPT_HREF_PATTERN.sub(r'\1="#"', cleaned)

        return cleaned

    # ------------------------------------------------------------------
    # Design config rendering
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_design_config(html_content: str, design_config: dict[str, Any]) -> str:
        """
        Wrap html_content in a styled email container based on design_config.
        This mirrors the existing _get_base_template() but uses config values.
        If design_config is empty/None, falls back to the default dark theme.
        """
        cfg = design_config or {}
        bg = cfg.get("backgroundColor", "#09090b")
        card = cfg.get("cardColor", "#18181b")
        text_color = cfg.get("textColor", "#ffffff")
        primary = cfg.get("primaryColor", "#8b5cf6")
        secondary = cfg.get("secondaryColor", "#5b21b6")
        border = cfg.get("borderColor", "#27272a")
        radius = cfg.get("borderRadius", 16)
        logo_url = cfg.get("logoUrl", "")
        header_style = cfg.get("headerStyle", "gradient")
        footer_enabled = cfg.get("footerEnabled", True)
        footer_text = cfg.get("footerText", "")
        muted = cfg.get("mutedTextColor", "#a1a1aa")

        # Header background
        if header_style == "gradient":
            header_bg = f"background: linear-gradient(135deg, {primary} 0%, {secondary} 100%);"
        else:
            header_bg = f"background-color: {primary};"

        # Logo section
        logo_html = ""
        if logo_url:
            logo_html = (
                f'<img src="{logo_url}" alt="Logo" '
                f'style="height:40px; margin-bottom:12px; display:block; margin-left:auto; margin-right:auto;" />'
            )

        # Footer content
        year = datetime.now(timezone.utc).year
        footer_content = footer_text if footer_text else f"&copy; {year} {{{{app_name}}}}. All rights reserved."
        footer_html = ""
        if footer_enabled:
            footer_html = f"""
            <div style="text-align:center; padding:24px; border-top:1px solid {border};
                        color:{muted}; font-size:13px; background-color:{card};">
                {footer_content}
            </div>"""

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: {bg};
            color: {text_color};
            margin: 0;
            padding: 40px 20px;
            -webkit-font-smoothing: antialiased;
        }}
        .et-container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: {card};
            border: 1px solid {border};
            border-radius: {radius}px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }}
        .et-header {{
            {header_bg}
            padding: 40px 32px;
            text-align: center;
        }}
        .et-content {{
            padding: 40px 32px;
            background-color: {card};
            color: {text_color};
        }}
    </style>
</head>
<body>
    <div class="et-container">
        <div class="et-header">
            {logo_html}
        </div>
        <div class="et-content">
            {html_content}
        </div>
        {footer_html}
    </div>
</body>
</html>"""

    @staticmethod
    def _default_design_config() -> dict[str, Any]:
        """Return the default design config matching the existing Hamara Editor email identity."""
        return {
            "theme": "dark",
            "backgroundColor": "#09090b",
            "cardColor": "#18181b",
            "textColor": "#ffffff",
            "mutedTextColor": "#a1a1aa",
            "primaryColor": "#8b5cf6",
            "secondaryColor": "#5b21b6",
            "borderColor": "#27272a",
            "borderRadius": 16,
            "logoUrl": "",
            "headerStyle": "gradient",
            "buttonStyle": "rounded",
            "footerEnabled": True,
            "footerText": "",
        }
