import uuid

def generate_uuid() -> str:
    """Generate a random UUID v4 string without hyphens (32 chars)."""
    return uuid.uuid4().hex

def slugify(text: str) -> str:
    """Basic slugification of a string."""
    return text.lower().replace(" ", "-").strip()
