"""
Email Template Studio — Default Template Seeder
================================================

Creates default database templates for all 7 email types,
matching the exact visual design of the current hardcoded templates.

Usage:
    cd backend
    python scripts/seed_email_templates.py

Safety:
- Idempotent: checks for existing templates before creating
- Never overwrites admin-customized templates
- Templates are created as INACTIVE (is_active=False)
- Admin must explicitly activate a template in the studio
"""

import sys
from pathlib import Path
from datetime import datetime, timezone

# Add backend to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.database.session import SessionLocal
from app.models.email_template import EmailTemplate, EmailTemplateType

# Default dark design config matching existing _get_base_template()
DEFAULT_DESIGN = {
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

# ---------------------------------------------------------------------------
# Default template definitions
# Each mirrors the existing hardcoded f-string bodies in email_service.py
# ---------------------------------------------------------------------------

DEFAULT_TEMPLATES = [
    {
        "name": "Email Verification (Default)",
        "slug": "default-verification",
        "template_type": EmailTemplateType.VERIFICATION,
        "description": "Sent to new users to verify their email address with a 6-digit OTP.",
        "subject_template": "Verify Your Email - {{app_name}}",
        "variables": ["{{app_name}}", "{{user_name}}", "{{user_email}}", "{{otp}}"],
        "html_content": """
<div style="font-size: 19px; font-weight: 600; color: #ffffff; margin-bottom: 24px;">
    Hello {{user_name}},
</div>
<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
    Welcome to <strong>{{app_name}}</strong>! We're excited to have you on board.
</div>
<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
    Before you can start using your account, you need to verify your email address.
    Please use the following 6-digit verification code. This code will expire in 24 hours.
</div>
<div style="text-align: center; margin-bottom: 36px;">
    <div style="display: inline-block; background-color: #09090b; color: #a78bfa;
                border: 1px solid #27272a; padding: 14px 32px; border-radius: 8px;
                font-weight: 700; font-size: 24px; letter-spacing: 4px;">
        {{otp}}
    </div>
</div>
<div style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
    If you did not create this account, you can safely ignore this email.<br><br>
    Regards,<br>
    The {{app_name}} Team
</div>
""",
    },
    {
        "name": "Password Reset (Default)",
        "slug": "default-password-reset",
        "template_type": EmailTemplateType.PASSWORD_RESET,
        "description": "Sent when a user requests a password reset with a 15-minute OTP.",
        "subject_template": "Reset Your Password - {{app_name}}",
        "variables": ["{{app_name}}", "{{user_name}}", "{{user_email}}", "{{otp}}"],
        "html_content": """
<div style="font-size: 19px; font-weight: 600; color: #ffffff; margin-bottom: 24px;">
    Hello {{user_name}},
</div>
<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
    We received a request to reset the password for your <strong>{{app_name}}</strong> account.
    If you didn't make this request, you can safely ignore this email.
</div>
<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 36px;">
    To reset your password, please use the following Verification Code.
    This code will automatically expire in 15 minutes.
</div>
<div style="text-align: center; margin-bottom: 36px;">
    <div style="display: inline-block; background-color: #8b5cf6; color: #ffffff;
                padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 24px;
                letter-spacing: 4px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
        {{otp}}
    </div>
</div>
<div style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
    Regards,<br>
    The {{app_name}} Team
</div>
""",
    },
    {
        "name": "Welcome Email (Default)",
        "slug": "default-welcome",
        "template_type": EmailTemplateType.WELCOME,
        "description": "Sent when an admin creates a user account, includes login credentials.",
        "subject_template": "Welcome to {{app_name}}",
        "variables": [
            "{{app_name}}", "{{user_name}}", "{{user_email}}",
            "{{username}}", "{{temporary_password}}", "{{role}}", "{{frontend_url}}",
        ],
        "html_content": """
<div style="font-size: 18px; font-weight: 500; margin-bottom: 24px;">
    Hello {{user_name}},
</div>
<div style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
    Your administrator account has been created.
</div>
<div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px;
            padding: 24px; margin-bottom: 32px;">
    <div style="display: flex; margin-bottom: 16px;">
        <div style="width: 140px; color: #71717a; font-size: 14px; font-weight: 500;">Username:</div>
        <div style="color: #e4e4e7; font-size: 14px; font-weight: 600;">{{username}}</div>
    </div>
    <div style="display: flex; margin-bottom: 16px;">
        <div style="width: 140px; color: #71717a; font-size: 14px; font-weight: 500;">Email:</div>
        <div style="color: #e4e4e7; font-size: 14px; font-weight: 600;">{{user_email}}</div>
    </div>
    <div style="display: flex; margin-bottom: 16px;">
        <div style="width: 140px; color: #71717a; font-size: 14px; font-weight: 500;">Role:</div>
        <div style="color: #e4e4e7; font-size: 14px; font-weight: 600;">{{role}}</div>
    </div>
    <div style="display: flex;">
        <div style="width: 140px; color: #71717a; font-size: 14px; font-weight: 500;">Temporary Password:</div>
        <div style="color: #a78bfa; font-size: 14px; font-weight: 600;">{{temporary_password}}</div>
    </div>
</div>
<div style="text-align: center; margin-bottom: 32px;">
    <a href="{{frontend_url}}"
       style="display: inline-block; background-color: #7c3aed; color: white;
              text-decoration: none; padding: 14px 28px; border-radius: 6px;
              font-weight: 600; font-size: 15px;">
        Login to {{app_name}}
    </a>
</div>
<div style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
    For security, please change your password after your first login.<br><br>
    Regards,<br>
    {{app_name}} Team
</div>
""",
    },
    {
        "name": "Login Security Alert (Default)",
        "slug": "default-login-alert",
        "template_type": EmailTemplateType.LOGIN_ALERT,
        "description": "Sent on every successful login with device, IP, and time details.",
        "subject_template": "New Login to Your Account",
        "variables": [
            "{{app_name}}", "{{user_name}}", "{{user_email}}",
            "{{ip_address}}", "{{device}}", "{{browser}}", "{{operating_system}}", "{{login_time}}",
        ],
        "html_content": """
<div style="font-size: 19px; font-weight: 600; color: #ffffff; margin-bottom: 24px;">
    Hello {{user_name}},
</div>
<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
    We noticed a new login to your <strong>{{app_name}}</strong> account.
</div>
<div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px;
            padding: 16px; margin-bottom: 32px;">
    <div style="color: #71717a; font-size: 13px; margin-bottom: 8px;">Login Details:</div>
    <div style="color: #e4e4e7; font-size: 14px; margin-bottom: 4px;"><strong>IP Address:</strong> {{ip_address}}</div>
    <div style="color: #e4e4e7; font-size: 14px; margin-bottom: 4px;"><strong>Device:</strong> {{device}}</div>
    <div style="color: #e4e4e7; font-size: 14px; margin-bottom: 4px;"><strong>Browser:</strong> {{browser}}</div>
    <div style="color: #e4e4e7; font-size: 14px; margin-bottom: 4px;"><strong>OS:</strong> {{operating_system}}</div>
    <div style="color: #e4e4e7; font-size: 14px;"><strong>Time:</strong> {{login_time}}</div>
</div>
<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6;">
    If this was you, you can safely ignore this email.
    If you don't recognize this activity, please reset your password immediately and secure your account.
</div>
""",
    },
    {
        "name": "Custom / Manual Email (Default)",
        "slug": "default-custom",
        "template_type": EmailTemplateType.CUSTOM,
        "description": "Used when admins send a custom manual email to a specific user.",
        "subject_template": "{{subject}}",
        "variables": ["{{app_name}}", "{{user_name}}", "{{user_email}}", "{{subject}}", "{{message}}"],
        "html_content": """
<div style="color: #e4e4e7; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">{{message}}</div>
""",
    },
    {
        "name": "Broadcast Email (Default)",
        "slug": "default-broadcast",
        "template_type": EmailTemplateType.BROADCAST,
        "description": "Used for platform-wide broadcast announcements sent to all users.",
        "subject_template": "Broadcast: {{subject}}",
        "variables": ["{{app_name}}", "{{user_name}}", "{{user_email}}", "{{subject}}", "{{message}}"],
        "html_content": """
<div style="font-size: 19px; font-weight: 600; color: #ffffff; margin-bottom: 24px;">
    Hello {{user_name}},
</div>
<div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">{{message}}</div>
<div style="color: #a1a1aa; font-size: 13px; margin-top: 32px;">
    — {{app_name}} Team
</div>
""",
    },
    {
        "name": "SMTP Test Email (Default)",
        "slug": "default-smtp-test",
        "template_type": EmailTemplateType.SMTP_TEST,
        "description": "Sent when admin clicks 'Send Test Email' to verify SMTP configuration.",
        "subject_template": "Test Email from {{app_name}}",
        "variables": ["{{app_name}}", "{{user_name}}", "{{user_email}}"],
        "html_content": """
<div style="font-size: 18px; font-weight: 500; margin-bottom: 24px;">
    Hello {{user_name}},
</div>
<div style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
    This is a test email to verify that your SMTP configuration is working correctly.
    If you received this, your email settings are properly configured!
</div>
""",
    },
]


def seed_email_templates():
    db = SessionLocal()
    created = 0
    skipped = 0

    try:
        print("Seeding default email templates...")

        for tpl_data in DEFAULT_TEMPLATES:
            slug = tpl_data["slug"]
            existing = db.query(EmailTemplate).filter_by(slug=slug).first()

            if existing:
                print(f"  SKIP  {slug} — already exists")
                skipped += 1
                continue

            now = datetime.now(timezone.utc)
            tmpl = EmailTemplate(
                name=tpl_data["name"],
                slug=slug,
                template_type=tpl_data["template_type"],
                description=tpl_data.get("description"),
                subject_template=tpl_data["subject_template"],
                html_content=tpl_data["html_content"].strip(),
                text_content=None,
                design_config=DEFAULT_DESIGN,
                variables=tpl_data.get("variables", []),
                is_active=False,   # Admin must explicitly activate
                is_default=False,
                created_by=None,   # System-seeded
                updated_by=None,
                created_at=now,
                updated_at=now,
            )
            db.add(tmpl)
            db.commit()
            print(f"  CREATE {slug}")
            created += 1

        print(f"\nDone. Created: {created}, Skipped (already exist): {skipped}")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_email_templates()
