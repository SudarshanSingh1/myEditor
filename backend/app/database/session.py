from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Tuned connection pool for production
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Detect dead connections before use
    echo=settings.DEBUG,      # Log SQL only in debug mode
    pool_size=10,             # Keep 10 persistent connections (default: 5)
    max_overflow=20,          # Allow up to 20 extra under load (default: 10)
    pool_timeout=30,          # Wait max 30s for a connection before error
    pool_recycle=1800,        # Recycle connections every 30 min (avoids stale connections)
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
