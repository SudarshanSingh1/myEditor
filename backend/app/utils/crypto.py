import os
import hashlib
from cryptography.fernet import Fernet

# Initialize Fernet key from environment, or generate a safe default for development
_SECRET_KEY = os.getenv("SECRET_KEY", "uO_6n-aZ8jO6Gf-X0I7-V8K6E0s3k-K4E8s_yO9zE90=")

# Ensure key is valid Fernet key
try:
    _fernet = Fernet(_SECRET_KEY.encode())
except Exception:
    # If the provided SECRET_KEY is not a valid Fernet key (32 url-safe base64 bytes),
    # we derive one using a deterministic hash for safety.
    derived = hashlib.sha256(_SECRET_KEY.encode()).digest()
    import base64
    b64_key = base64.urlsafe_b64encode(derived)
    _fernet = Fernet(b64_key)

def encrypt_value(value: str) -> str:
    if not value:
        return value
    return _fernet.encrypt(value.encode()).decode()

def decrypt_value(encrypted_value: str) -> str:
    if not encrypted_value:
        return encrypted_value
    try:
        return _fernet.decrypt(encrypted_value.encode()).decode()
    except Exception:
        # If decryption fails (e.g. key changed), return empty or raw
        return ""

def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 4:
        return "****"
    return "*" * 8 + value[-4:]
