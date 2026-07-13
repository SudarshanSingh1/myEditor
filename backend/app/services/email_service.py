import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
import logging

from app.core.config import settings
from app.database.session import SessionLocal
from app.models.email_log import EmailLog, EmailStatus
from app.models.user import User
from app.models.system_settings import SystemSettings
from app.core.security import decrypt_string

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def _get_base_template(subject: str, body_html: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{subject}</title>
            <style>
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #09090b;
                    color: #fafafa;
                    margin: 0;
                    padding: 40px 20px;
                    -webkit-font-smoothing: antialiased;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                }}
                .header {{
                    background: linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%);
                    padding: 40px 32px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 26px;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: -0.5px;
                }}
                .content {{
                    padding: 40px 32px;
                    background-color: #18181b;
                }}
                .footer {{
                    text-align: center;
                    padding: 24px;
                    border-top: 1px solid #27272a;
                    color: #71717a;
                    font-size: 13px;
                    background-color: #18181b;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{subject}</h1>
                </div>
                <div class="content">
                    {body_html}
                </div>
                <div class="footer">
                    &copy; {datetime.now(timezone.utc).year} {settings.APP_NAME}. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def _get_smtp_config(db):
        sys_settings = db.query(SystemSettings).first()
        config = {
            "host": getattr(sys_settings, "smtp_host", None) or settings.SMTP_HOST,
            "port": getattr(sys_settings, "smtp_port", None) or settings.SMTP_PORT,
            "user": getattr(sys_settings, "smtp_user", None) or settings.SMTP_USER,
            "from_name": getattr(sys_settings, "smtp_from_name", None) or settings.SMTP_FROM_NAME,
            "from_email": getattr(sys_settings, "smtp_from_email", None) or settings.SMTP_FROM,
            "tls": getattr(sys_settings, "smtp_tls", True),
            "ssl": getattr(sys_settings, "smtp_ssl", False),
            "password": None
        }
        db_smtp_pass = getattr(sys_settings, "smtp_pass", None)
        if db_smtp_pass:
            config["password"] = decrypt_string(db_smtp_pass)
        else:
            config["password"] = settings.SMTP_PASS
        return config

    @staticmethod
    def _send_email_core(db, to_email: str, subject: str, html_content: str, user_role: str = None) -> None:
        """Core method to log and send an email via SMTP. Raises Exception on failure."""
        config = EmailService._get_smtp_config(db)
        
        email_log = EmailLog(
            recipient=to_email,
            subject=subject,
            user_role=user_role,
            status=EmailStatus.PENDING,
            provider="SMTP" if config["host"] else "MOCK"
        )
        db.add(email_log)
        db.commit()
        db.refresh(email_log)
        
        if config["host"]:
            try:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = f"{config['from_name']} <{config['from_email']}>"
                msg['To'] = to_email
                
                part = MIMEText(html_content, 'html')
                msg.attach(part)
                
                if config["ssl"]:
                    server = smtplib.SMTP_SSL(config["host"], config["port"], timeout=10)
                else:
                    server = smtplib.SMTP(config["host"], config["port"], timeout=10)
                    if config["tls"]:
                        server.starttls()
                        
                if config["user"] and config["password"]:
                    server.login(config["user"], config["password"])
                    
                server.send_message(msg)
                server.quit()
                
                email_log.status = EmailStatus.SENT
                email_log.sent_at = datetime.now(timezone.utc)
                db.commit()
                logger.info(f"Email sent successfully to {to_email}")
                
            except Exception as e:
                logger.error(f"SMTP failed to send to {to_email}: {str(e)}")
                email_log.status = EmailStatus.FAILED
                email_log.error_message = str(e)
                db.commit()
                raise Exception(f"Failed to send email: {str(e)}")
        else:
            logger.info(f"MOCK EMAIL: To {to_email} Subject: {subject}")
            email_log.status = EmailStatus.SENT
            email_log.sent_at = datetime.now(timezone.utc)
            db.commit()

    @staticmethod
    def send_test_email(user_id: str):
        """Send a test email synchronously. Raises on error."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise Exception("Admin user not found.")
            
            subject = f"Test Email from {settings.APP_NAME}"
            body = f"""
            <div style="font-size: 18px; font-weight: 500; margin-bottom: 24px;">
                Hello {user.first_name or user.username},
            </div>
            <div style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                This is a test email to verify that your SMTP configuration is working correctly. 
                If you received this, your email settings are properly configured!
            </div>
            """
            html_content = EmailService._get_base_template(subject, body)
            EmailService._send_email_core(db, user.email, subject, html_content, user.role.value)
        finally:
            db.close()

    @staticmethod
    def send_welcome_email(user_id: str, temp_password: str, login_url: str):
        """Send a welcome email with credentials."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise Exception("User not found.")
                
            subject = f"Welcome to {settings.APP_NAME}"
            name = user.first_name or user.username
            
            body = f"""
            <div style="font-size: 18px; font-weight: 500; margin-bottom: 24px;">
                Hello {name},
            </div>
            <div style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
                Your administrator account has been created.
            </div>
            <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                <div style="display: flex; margin-bottom: 16px;">
                    <div style="width: 120px; color: #71717a; font-size: 14px; font-weight: 500;">Username:</div>
                    <div style="color: #e4e4e7; font-size: 14px; font-weight: 600;">{user.username}</div>
                </div>
                <div style="display: flex; margin-bottom: 16px;">
                    <div style="width: 120px; color: #71717a; font-size: 14px; font-weight: 500;">Email:</div>
                    <div style="color: #e4e4e7; font-size: 14px; font-weight: 600;">{user.email}</div>
                </div>
                <div style="display: flex; margin-bottom: 16px;">
                    <div style="width: 120px; color: #71717a; font-size: 14px; font-weight: 500;">Role:</div>
                    <div style="color: #e4e4e7; font-size: 14px; font-weight: 600;">{user.role.value.replace('_', ' ')}</div>
                </div>
                <div style="display: flex;">
                    <div style="width: 120px; color: #71717a; font-size: 14px; font-weight: 500;">Temporary Password:</div>
                    <div style="color: #a78bfa; font-size: 14px; font-weight: 600;">{temp_password}</div>
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 32px;">
                <a href="{login_url}" style="display: inline-block; background-color: #7c3aed; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
                    Login
                </a>
            </div>
            <div style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                For security, please change your password after your first login.<br><br>
                Regards,<br>
                {settings.APP_NAME} Team
            </div>
            """
            html_content = EmailService._get_base_template(subject, body)
            EmailService._send_email_core(db, user.email, subject, html_content, user.role.value)
        finally:
            db.close()

    @staticmethod
    def send_password_reset_email(user_id: str, reset_token: str, reset_url: str):
        """Send a password reset email."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise Exception("User not found.")
                
            subject = f"Reset Your Password - {settings.APP_NAME}"
            name = user.first_name or user.username
            
            body = f"""
            <div style="font-size: 19px; font-weight: 600; color: #ffffff; margin-bottom: 24px;">
                Hello {name},
            </div>
            <div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to reset the password for your <strong>{settings.APP_NAME}</strong> account. If you didn't make this request, you can safely ignore this email.
            </div>
            <div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 36px;">
                To reset your password, click the secure link below. This link will automatically expire in 15 minutes.
            </div>
            <div style="text-align: center; margin-bottom: 36px;">
                <a href="{reset_url}?token={reset_token}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                    Reset Password
                </a>
            </div>
            <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                <div style="color: #71717a; font-size: 13px; margin-bottom: 8px;">Or copy and paste this link into your browser:</div>
                <div style="word-break: break-all;">
                    <a href="{reset_url}?token={reset_token}" style="color: #a78bfa; font-size: 13px; text-decoration: none;">{reset_url}?token={reset_token}</a>
                </div>
            </div>
            <div style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                Regards,<br>
                The {settings.APP_NAME} Team
            </div>
            """
            html_content = EmailService._get_base_template(subject, body)
            EmailService._send_email_core(db, user.email, subject, html_content, user.role.value)
        finally:
            db.close()

    @staticmethod
    def send_custom_email(user_id: str, subject: str, message: str):
        """Send a custom manual email via SMTP."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise Exception("User not found.")
            
            body = f"""
            <div style="color: #e4e4e7; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">{message}</div>
            """
            html_content = EmailService._get_base_template(subject, body)
            EmailService._send_email_core(db, user.email, subject, html_content, user.role.value)
        finally:
            db.close()

    @staticmethod
    def send_new_login_alert(user_id: str, ip_address: str, device: str):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return
            
            subject = "New Login to Your Account"
            name = user.first_name if user.first_name else user.username
            
            body = f"""
            <div style="font-size: 19px; font-weight: 600; color: #ffffff; margin-bottom: 24px;">
                Hello {name},
            </div>
            <div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                We noticed a new login to your <strong>{settings.APP_NAME}</strong> account.
            </div>
            <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                <div style="color: #71717a; font-size: 13px; margin-bottom: 8px;">Login Details:</div>
                <div style="color: #e4e4e7; font-size: 14px;"><strong>IP Address:</strong> {ip_address or 'Unknown'}</div>
                <div style="color: #e4e4e7; font-size: 14px;"><strong>Device:</strong> {device or 'Unknown'}</div>
                <div style="color: #e4e4e7; font-size: 14px;"><strong>Time:</strong> {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}</div>
            </div>
            <div style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin-bottom: 36px;">
                If this was you, you can safely ignore this email. If you don't recognize this activity, please reset your password immediately and secure your account.
            </div>
            """
            html_content = EmailService._get_base_template(subject, body)
            EmailService._send_email_core(db, user.email, subject, html_content, user.role.value)
        finally:
            db.close()
