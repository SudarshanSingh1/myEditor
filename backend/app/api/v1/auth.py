from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.dependencies.database import get_db
from app.dependencies.auth import get_current_user_dep
from app.schemas.responses import SuccessResponse
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileResponse,
    ChangePasswordRequest,
    PasswordResetRequest,
    ResetPasswordConfirmRequest,
    UserProfileUpdateRequest,
    UserRegisterResponse,
    ResendVerificationResponse,
)
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
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
        raise HTTPException(
            status_code=503,
            detail=settings_obj.maintenance_message or "System is under maintenance.",
        )

    ip_address = request.client.host if request.client else None
    user, verification_token = AuthService.register_user(db, req, ip_address)
    return SuccessResponse(
        message="Registration successful. Please check your email to verify your account.",
        data=UserRegisterResponse(
            user=UserProfileResponse.model_validate(user),
            verification_token=verification_token,
        ),
    )


@router.post("/verify-email", response_model=SuccessResponse)
@limiter.limit("5/minute")
def verify_email(
    req: VerifyEmailRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
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
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return SuccessResponse(message="Email verified successfully.")


@router.post(
    "/resend-verification", response_model=SuccessResponse[ResendVerificationResponse]
)
@limiter.limit("3/minute")
def resend_verification(
    req: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)
):
    verification_token = AuthService.resend_verification(db, req.email)
    return SuccessResponse(
        message="If the email exists and is unverified, a new verification code has been sent.",
        data=ResendVerificationResponse(verification_token=verification_token),
    )


import ipaddress

def _is_trusted_proxy(ip: str) -> bool:
    if not ip:
        return False
    try:
        client_ip = ipaddress.ip_address(ip)
    except ValueError:
        return False

    trusted_cidrs_str = getattr(settings, "TRUSTED_PROXY_CIDRS", "")
    if not trusted_cidrs_str:
        return False
    
    trusted_cidrs = [cidr.strip() for cidr in trusted_cidrs_str.split(",") if cidr.strip()]
    for cidr in trusted_cidrs:
        try:
            if client_ip in ipaddress.ip_network(cidr):
                return True
        except ValueError:
            continue
    return False

def _get_client_ip(request: Request) -> str:
    direct_ip = request.client.host if request.client else None
    
    if _is_trusted_proxy(direct_ip):
        forwarded_for = request.headers.get("x-forwarded-for")
        real_ip = request.headers.get("x-real-ip")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if real_ip:
            return real_ip
            
    return direct_ip

@router.post("/login", response_model=SuccessResponse)
@limiter.limit("5/minute")
def login(
    req: UserLoginRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    ip_address = _get_client_ip(request)

    user_agent = request.headers.get("user-agent", "")
    user, access_token, refresh_token, session = AuthService.authenticate_user(
        db, req, ip_address, user_agent
    )

    background_tasks.add_task(
        EmailService.send_new_login_alert,
        str(user.id),
        session.ip_address,
        session.device_type,
        session.browser,
        session.os,
        session.created_at
    )

    # Prepare HTTPOnly cookies architecture
    # Currently also returning in JSON payload for flexible frontend integration
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return SuccessResponse(message="Login successful.")


@router.post("/logout", response_model=SuccessResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    # Always delete cookies regardless of whether session revocation succeeds.
    # This ensures the browser session is always cleared.
    response.delete_cookie(
        key="access_token", httponly=True, secure=True, samesite="strict", path="/"
    )
    response.delete_cookie(
        key="refresh_token", httponly=True, secure=True, samesite="strict", path="/"
    )

    # Revoke the server-side session by marking is_active=False.
    # A stolen refresh token will now be rejected by /auth/refresh.
    if refresh_token:
        try:
            from jose import jwt
            from app.models.user_session import UserSession

            payload = jwt.decode(
                refresh_token,
                settings.SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={
                    "verify_exp": False
                },  # allow revoking already-expired tokens too
            )
            jti = payload.get("jti")
            if jti:
                session = (
                    db.query(UserSession)
                    .filter(UserSession.session_token_jti == jti)
                    .first()
                )
                if session:
                    session.is_active = False
                    db.commit()
        except Exception:
            # Never block logout on revocation failure — cookies are already cleared above
            pass

    return SuccessResponse(message="Logout successful.")


@router.post("/refresh", response_model=SuccessResponse)
@limiter.limit("20/minute")
def refresh(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing"
        )

    # refresh_token() now returns (access_token, new_refresh_token) — full rotation
    access_token, new_refresh_token = AuthService.refresh_token(db, refresh_token)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return SuccessResponse(message="Token refreshed.")


@router.get("/me", response_model=SuccessResponse[UserProfileResponse])
def get_me(current_user=Depends(get_current_user_dep)):
    if current_user.must_change_password is None:
        current_user.must_change_password = False
    return SuccessResponse(message="Profile retrieved.", data=current_user)


@router.put("/profile", response_model=SuccessResponse[UserProfileResponse])
def update_profile(
    req: UserProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_dep),
):
    ip_address = request.client.host if request.client else None
    user = AuthService.update_profile(db, current_user, req, ip_address)
    return SuccessResponse(message="Profile updated.", data=user)


@router.post("/change-password", response_model=SuccessResponse)
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_dep),
):
    ip_address = request.client.host if request.client else None
    AuthService.change_password(db, current_user, req, ip_address)
    return SuccessResponse(message="Password changed successfully.")


class PasswordResetResponse(BaseModel):
    reset_token: str


@router.post(
    "/request-password-reset", response_model=SuccessResponse[PasswordResetResponse]
)
@limiter.limit("3/minute")
def request_password_reset(
    req: PasswordResetRequest, request: Request, db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    token = AuthService.request_password_reset(db, req, ip_address)
    return SuccessResponse(
        message="If the email is registered, a password reset link has been sent.",
        data=PasswordResetResponse(reset_token=token),
    )


@router.post("/reset-password", response_model=SuccessResponse)
@limiter.limit("5/minute")
def reset_password(
    req: ResetPasswordConfirmRequest, request: Request, db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    AuthService.reset_password_confirm(db, req, ip_address)
    return SuccessResponse(message="Password has been reset successfully.")


# ---------------------------------------------------------------------------
# 2FA — Login Completion
# ---------------------------------------------------------------------------


class TwoFactorVerifyRequest(BaseModel):
    token: str  # pre_auth_token from the login 401 response
    code: str  # TOTP code from authenticator app


class TwoFactorRecoverRequest(BaseModel):
    token: str  # pre_auth_token from the login 401 response
    backup_code: str  # one of the 8 backup codes shown during 2FA setup


@router.post("/2fa/verify", response_model=SuccessResponse)
@limiter.limit("5/minute")
def verify_2fa(
    req: TwoFactorVerifyRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Complete 2FA login flow: validate pre_auth_token + TOTP code, issue full session."""
    ip_address = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    user, access_token, refresh_token_val, session = AuthService.complete_2fa_login(
        db=db,
        pre_auth_token=req.token,
        code=req.code,
        ip_address=ip_address,
        user_agent_string=user_agent,
        is_backup_code=False,
    )

    background_tasks.add_task(
        EmailService.send_new_login_alert,
        str(user.id),
        session.ip_address,
        session.device_type,
        session.browser,
        session.os,
        session.created_at
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_val,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    return SuccessResponse(message="2FA verification successful.")


@router.post("/2fa/recover", response_model=SuccessResponse)
@limiter.limit("3/minute")
def recover_2fa(
    req: TwoFactorRecoverRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Recover 2FA access using a backup code. The backup code is consumed (single-use)."""
    ip_address = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")

    user, access_token, refresh_token_val, session = AuthService.complete_2fa_login(
        db=db,
        pre_auth_token=req.token,
        code=req.backup_code,
        ip_address=ip_address,
        user_agent_string=user_agent,
        is_backup_code=True,
    )

    background_tasks.add_task(
        EmailService.send_new_login_alert,
        str(user.id),
        session.ip_address,
        session.device_type,
        session.browser,
        session.os,
        session.created_at
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_val,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    return SuccessResponse(message="Backup code accepted. You are now logged in.")
