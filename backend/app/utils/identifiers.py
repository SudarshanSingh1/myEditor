import uuid

def generate_uuid() -> str:
    """Generate a random UUID v4 string."""
    return str(uuid.uuid4())

def slugify(text: str) -> str:
    """Basic slugification of a string."""
    return text.lower().replace(" ", "-").strip()
