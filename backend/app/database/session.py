from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Tuned connection pool for production
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Detect dead connections before use
    echo=settings.DEBUG,  # Log SQL only in debug mode
    pool_size=100,  # High concurrent connections for 10k scale
    max_overflow=200,  # Allow up to 200 extra under load
    pool_timeout=10,  # Fail fast (10s) instead of hanging the event loop
    pool_recycle=1800,  # Recycle connections every 30 min (avoids stale connections)
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
