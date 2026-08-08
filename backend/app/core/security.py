import re
from datetime import datetime, timedelta, timezone
from typing import Any, Union
import bcrypt
from jose import jwt
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None, jti: str = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    if jti:
        to_encode["jti"] = jti
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any], expires_delta: timedelta = None, jti: str = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    if jti:
        to_encode["jti"] = jti
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def validate_password_strength(password: str) -> bool:
    """
    Validate password strength:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[^A-Za-z0-9]", password):
        return False
    return True


def get_fernet_key() -> bytes:
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_string(plain: str) -> str:
    if not plain:
        return plain
    f = Fernet(get_fernet_key())
    return f.encrypt(plain.encode()).decode()


def decrypt_string(encrypted: str) -> str:
    if not encrypted:
        return encrypted
    f = Fernet(get_fernet_key())
    try:
        return f.decrypt(encrypted.encode()).decode()
    except InvalidToken:
        # Treat as plaintext for legacy migration
        return encrypted
