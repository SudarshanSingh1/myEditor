from datetime import datetime, timezone

def utc_now() -> datetime:
    """Return the current UTC datetime with timezone info."""
    return datetime.now(timezone.utc)

def format_iso_date(dt: datetime) -> str:
    """Format a datetime object to ISO 8601 string."""
    return dt.isoformat()
