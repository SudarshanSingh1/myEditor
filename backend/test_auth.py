import uuid
from jose import jwt, JWTError


def fake_get_current_user(token: str):
    try:
        payload = jwt.decode(
            token,
            "fake_secret",
            algorithms=["HS256"],
            options={"verify_signature": False},
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "access" or not user_id:
            print("Invalid token type or user_id")
            return None
    except JWTError as e:
        print("JWTError:", e)
        return None
    try:
        uid = uuid.UUID(user_id)
    except ValueError as e:
        print("UUID Error:", e)
        return None
    print("Success:", uid)
    return uid


# Test parsing the cookie
from fastapi.param_functions import Cookie

print("Cookie default:", Cookie(default=None))
