from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_.-]+$")
    email: EmailStr
    password: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class ResetPasswordConfirmRequest(BaseModel):
    token: str
    otp: str
    new_password: str

class UserProfileResponse(BaseModel):
    id: UUID
    first_name: str | None
    last_name: str | None
    username: str
    email: str
    role: str
    status: str
    avatar: str | None
    must_change_password: bool = False
    bio: str | None = None
    timezone: str | None = None
    theme_preference: str | None = None
    totp_enabled: bool = False
    effective_permissions: list[str] = []
    
    model_config = {"from_attributes": True}

class UserProfileUpdateRequest(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=50)
    last_name: str | None = Field(None, min_length=1, max_length=50)
    bio: str | None = Field(None, max_length=500)
    timezone: str | None = Field(None, max_length=50)
    theme_preference: str | None = Field(None, max_length=20)

class UserRegisterResponse(BaseModel):
    user: UserProfileResponse
    verification_token: str

class ResendVerificationResponse(BaseModel):
    verification_token: str

