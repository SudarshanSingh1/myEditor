from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user_dep
from app.schemas.responses import SuccessResponse
from app.schemas.auth import (
    UserRegisterRequest, 
    UserLoginRequest, 
    TokenResponse, 
    UserProfileResponse,
    ChangePasswordRequest,
    PasswordResetRequest,
    ResetPasswordConfirmRequest,
    UserProfileUpdateRequest,
    UserRegisterResponse,
    ResendVerificationResponse
)
from app.services.auth_service import AuthService
from app.core.config import settings
from app.core.rate_limit import limiter

router = APIRouter()

class VerifyEmailRequest(BaseModel):
    token: str
    otp: str

class ResendVerificationRequest(BaseModel):
    email: str

@router.post("/register", response_model=SuccessResponse[UserRegisterResponse])
@limiter.limit("3/minute")
def register(req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    # Block registration if maintenance mode is active
    from app.models.system_settings import SystemSettings
    settings_obj = db.query(SystemSettings).first()
    if settings_obj and settings_obj.maintenance_mode:
        raise HTTPException(status_code=503, detail=settings_obj.maintenance_message or "System is under maintenance.")

    ip_address = request.client.host if request.client else None
    user, verification_token = AuthService.register_user(db, req, ip_address)
    return SuccessResponse(
        message="Registration successful. Please check your email to verify your account.",
        data=UserRegisterResponse(user=UserProfileResponse.model_validate(user), verification_token=verification_token)
    )

@router.post("/verify-email", response_model=SuccessResponse[TokenResponse])
@limiter.limit("5/minute")
def verify_email(req: VerifyEmailRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    user = AuthService.verify_email(db, req.token, req.otp)
    
    access_token = AuthService.create_access_token(user.id)
    refresh_token = AuthService.create_refresh_token(user.id, ip_address)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return SuccessResponse(message="Email verified successfully.", data=TokenResponse(access_token=access_token, refresh_token=refresh_token))

@router.post("/resend-verification", response_model=SuccessResponse[ResendVerificationResponse])
@limiter.limit("3/minute")
def resend_verification(req: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)):
    verification_token = AuthService.resend_verification(db, req.email)
    return SuccessResponse(
        message="If the email exists and is unverified, a new verification code has been sent.",
        data=ResendVerificationResponse(verification_token=verification_token)
    )

@router.post("/login", response_model=SuccessResponse[TokenResponse])
@limiter.limit("5/minute")
def login(req: UserLoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    user, access_token, refresh_token = AuthService.authenticate_user(db, req, ip_address)
            
    # Prepare HTTPOnly cookies architecture
    # Currently also returning in JSON payload for flexible frontend integration
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return SuccessResponse(message="Login successful.", data=TokenResponse(access_token=access_token, refresh_token=refresh_token))

@router.post("/logout", response_model=SuccessResponse)
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return SuccessResponse(message="Logout successful.")

@router.post("/refresh", response_model=SuccessResponse[TokenResponse])
def refresh(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    access_token = AuthService.refresh_token(db, refresh_token)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return SuccessResponse(message="Token refreshed.", data=TokenResponse(access_token=access_token, refresh_token=refresh_token))

@router.get("/me", response_model=SuccessResponse[UserProfileResponse])
def get_me(current_user = Depends(get_current_user_dep)):
    if current_user.must_change_password is None:
        current_user.must_change_password = False
    return SuccessResponse(message="Profile retrieved.", data=current_user)

@router.put("/profile", response_model=SuccessResponse[UserProfileResponse])
def update_profile(req: UserProfileUpdateRequest, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user_dep)):
    ip_address = request.client.host if request.client else None
    user = AuthService.update_profile(db, current_user, req, ip_address)
    return SuccessResponse(message="Profile updated.", data=user)


@router.post("/change-password", response_model=SuccessResponse)
def change_password(req: ChangePasswordRequest, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user_dep)):
    ip_address = request.client.host if request.client else None
    AuthService.change_password(db, current_user, req, ip_address)
    return SuccessResponse(message="Password changed successfully.")

class PasswordResetResponse(BaseModel):
    reset_token: str

@router.post("/request-password-reset", response_model=SuccessResponse[PasswordResetResponse])
@limiter.limit("3/minute")
def request_password_reset(req: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    token = AuthService.request_password_reset(db, req, ip_address)
    return SuccessResponse(message="If the email is registered, a password reset link has been sent.", data=PasswordResetResponse(reset_token=token))

@router.post("/reset-password", response_model=SuccessResponse)
@limiter.limit("5/minute")
def reset_password(req: ResetPasswordConfirmRequest, request: Request, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    AuthService.reset_password_confirm(db, req, ip_address)
    return SuccessResponse(message="Password has been reset successfully.")
