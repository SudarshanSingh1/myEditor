from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from app.database.base import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, default=1)
    
    # Maintenance
    maintenance_mode = Column(Boolean, nullable=False, default=False, server_default="false")
    maintenance_message = Column(String, nullable=True)
    maintenance_end_time = Column(DateTime(timezone=True), nullable=True)
    maintenance_type = Column(String, nullable=True)
    
    # Core Toggles
    registration_enabled = Column(Boolean, nullable=False, default=True, server_default="true")
    login_enabled = Column(Boolean, nullable=False, default=True, server_default="true")
    read_only_mode = Column(Boolean, nullable=False, default=False, server_default="false")
    
    # Announcements
    announcement_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    announcement_message = Column(String, nullable=True)
    announcement_color = Column(String, nullable=True)
    
    # General Options
    default_theme = Column(String, default="system")
    supported_languages = Column(JSON, default=lambda: ["en"])
    
    # Feature Flags
    feature_flags = Column(JSON, default=lambda: {
        "ai_enabled": False,
        "github_enabled": False,
        "live_collaboration": False,
        "compiler_enabled": False,
        "plugins_enabled": False
    })

    # Resource Limits
    max_execution_time_seconds = Column(Integer, nullable=False, default=30, server_default="30")
    max_memory_mb = Column(Integer, nullable=False, default=256, server_default="256")
    max_file_size_mb = Column(Integer, nullable=False, default=10, server_default="10")
    max_projects_per_user = Column(Integer, nullable=False, default=10, server_default="10")
    rate_limit_per_minute = Column(Integer, nullable=False, default=100, server_default="100")

    # SMTP Settings
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, nullable=False, default=587, server_default="587")
    smtp_user = Column(String, nullable=True)
    smtp_pass = Column(String, nullable=True)
    smtp_from_name = Column(String, nullable=False, default="Hamara Editor", server_default="'Hamara Editor'")
    smtp_from_email = Column(String, nullable=True)
    smtp_tls = Column(Boolean, nullable=False, default=True, server_default="true")
    smtp_ssl = Column(Boolean, nullable=False, default=False, server_default="false")

    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
