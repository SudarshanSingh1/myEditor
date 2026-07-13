import uuid
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.dependencies.database import get_db
from app.models.user import User, StatusEnum
from app.models.oauth_account import OAuthAccount
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.schemas.responses import StandardResponse
from app.api.v1.security import get_current_active_user
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])


# ---------------------------------------------------------------------------
# Authorize Endpoints – redirect to real provider OAuth pages
# ---------------------------------------------------------------------------

@router.get("/google/authorize")
def google_authorize(request: Request):
    """Redirect the browser to Google's OAuth 2.0 consent page."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback/google",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


@router.get("/github/authorize")
def github_authorize(request: Request):
    """Redirect the browser to GitHub's OAuth authorization page."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured on this server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
        )

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback/github",
        "scope": "user:email read:user repo",
    }
    url = "https://github.com/login/oauth/authorize?" + urlencode(params)
    return RedirectResponse(url)


# Keep a generic alias so existing clients that call /{provider}/authorize still work.
@router.get("/{provider}/authorize")
def oauth_authorize_generic(provider: str, request: Request):
    if provider == "google":
        return google_authorize(request)
    if provider == "github":
        return github_authorize(request)
    raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")


# ---------------------------------------------------------------------------
# Callback Endpoint – exchange code → token → user profile → JWT cookies
# ---------------------------------------------------------------------------

class OAuthCallbackRequest(BaseModel):
    code: str


@router.post("/{provider}/callback", response_model=StandardResponse)
async def oauth_callback(
    provider: str,
    req: OAuthCallbackRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Exchange the authorization code for an access token, fetch the user profile
    from the provider, create or link the local User record, and return JWT
    cookies so the frontend session is established.
    """
    code = req.code

    if provider == "github":
        email, provider_id, name, avatar, provider_access_token, provider_refresh_token = \
            await _exchange_github(code)

    elif provider == "google":
        email, provider_id, name, avatar, provider_access_token, provider_refresh_token = \
            await _exchange_google(code)

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    return _create_session_response(
        db=db,
        request=request,
        provider=provider,
        provider_id=provider_id,
        email=email,
        name=name,
        avatar=avatar,
        provider_access_token=provider_access_token,
        provider_refresh_token=provider_refresh_token,
    )


# ---------------------------------------------------------------------------
# Private helpers – one per provider
# ---------------------------------------------------------------------------

async def _exchange_github(code: str):
    """Exchange a GitHub authorization code for user profile data."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured on this server.",
        )

    async with httpx.AsyncClient(timeout=10) as client:
        # Step 1: exchange code for access token
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback/github",
            },
            headers={"Accept": "application/json"},
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange GitHub authorization code.")
        token_data = token_res.json()
        if "error" in token_data:
            raise HTTPException(
                status_code=400,
                detail=token_data.get("error_description", token_data["error"]),
            )

        provider_access_token: str = token_data["access_token"]
        provider_refresh_token: str | None = token_data.get("refresh_token")

        # Step 2: fetch user profile
        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {provider_access_token}"},
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub user profile.")
        user_data = user_res.json()

        provider_id = str(user_data["id"])
        name: str = user_data.get("name") or user_data.get("login") or "GitHub User"
        avatar: str | None = user_data.get("avatar_url")
        email: str | None = user_data.get("email")

        # Step 3: if email is private, fetch from emails endpoint
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {provider_access_token}"},
            )
            if emails_res.status_code == 200:
                emails_data = emails_res.json()
                primary = next((e for e in emails_data if e.get("primary") and e.get("verified")), None)
                if primary:
                    email = primary["email"]
                elif emails_data:
                    email = emails_data[0]["email"]

        if not email:
            raise HTTPException(
                status_code=400,
                detail="No email address is associated with this GitHub account. "
                       "Please make your email public on GitHub and try again.",
            )

    return email, provider_id, name, avatar, provider_access_token, provider_refresh_token


async def _exchange_google(code: str):
    """Exchange a Google authorization code for user profile data."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on this server.",
        )

    async with httpx.AsyncClient(timeout=10) as client:
        # Step 1: exchange code for access token
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback/google",
            },
        )
        if token_res.status_code != 200:
            err = token_res.json()
            raise HTTPException(
                status_code=400,
                detail=err.get("error_description") or err.get("error") or "Failed to exchange Google authorization code.",
            )
        token_data = token_res.json()
        provider_access_token: str = token_data["access_token"]
        provider_refresh_token: str | None = token_data.get("refresh_token")

        # Step 2: fetch user info
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {provider_access_token}"},
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user profile.")
        user_data = user_res.json()

        provider_id: str = user_data["id"]
        email: str = user_data["email"]
        name: str = user_data.get("name", "Google User")
        avatar: str | None = user_data.get("picture")

    return email, provider_id, name, avatar, provider_access_token, provider_refresh_token


# ---------------------------------------------------------------------------
# Shared session creation – upsert User/OAuthAccount, issue JWT cookies
# ---------------------------------------------------------------------------

def _create_session_response(
    *,
    db: Session,
    request: Request,
    provider: str,
    provider_id: str,
    email: str,
    name: str,
    avatar: str | None,
    provider_access_token: str,
    provider_refresh_token: str | None,
) -> JSONResponse:
    """Upsert the local user, link the OAuth account, create a session, and return JWT cookies."""

    # 1. Look up existing OAuth account link
    oauth_acc = db.query(OAuthAccount).filter(
        OAuthAccount.provider == provider,
        OAuthAccount.provider_account_id == provider_id,
    ).first()

    if oauth_acc:
        user: User = oauth_acc.user
        # Refresh avatar if we didn't have one
        if avatar and not user.avatar:
            user.avatar = avatar
        oauth_acc.access_token = provider_access_token
        if provider_refresh_token:
            oauth_acc.refresh_token = provider_refresh_token
        db.commit()
    else:
        # 2. Match by email in case the user already has an account
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # 3. Create a brand-new user
            parts = name.split(maxsplit=1)
            user = User(
                first_name=parts[0],
                last_name=parts[1] if len(parts) > 1 else "",
                username=email.split("@")[0] + uuid.uuid4().hex[:4],
                email=email,
                password_hash="oauth",  # no password – OAuth only
                email_verified=True,
                status=StatusEnum.ACTIVE,
                avatar=avatar,
            )
            db.add(user)
            db.flush()  # get user.id without full commit

        # 4. Create the OAuth account link
        new_oauth = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_account_id=provider_id,
            access_token=provider_access_token,
            refresh_token=provider_refresh_token,
        )
        db.add(new_oauth)
        db.commit()
        db.refresh(user)

    # 5. Create application session
    from app.models.user_session import UserSession

    session_jti = str(uuid.uuid4())
    ip_address = request.client.host if request.client else "OAuth"

    new_session = UserSession(
        user_id=user.id,
        session_token_jti=session_jti,
        ip_address=ip_address,
        user_agent=request.headers.get("user-agent", "OAuth"),
        device_type="Unknown",
        browser="Unknown",
        os="Unknown",
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_session)
    db.commit()

    # 6. Issue JWT tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id, jti=session_jti)

    response = JSONResponse(
        content={
            "success": True,
            "message": "OAuth login successful",
            "data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "avatar": user.avatar,
                },
            },
        }
    )

    # Set secure HttpOnly cookies
    cookie_kwargs = dict(
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **cookie_kwargs,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        **cookie_kwargs,
    )

    return response


# ---------------------------------------------------------------------------
# Connected-accounts management
# ---------------------------------------------------------------------------

@router.get("/connected", response_model=StandardResponse)
def get_connected_accounts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    accounts = db.query(OAuthAccount).filter(OAuthAccount.user_id == current_user.id).all()
    providers = [acc.provider for acc in accounts]
    return StandardResponse(success=True, message="Connected accounts fetched", data={"providers": providers})


@router.delete("/disconnect/{provider}", response_model=StandardResponse)
def disconnect_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    other_accounts = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == current_user.id,
        OAuthAccount.provider != provider,
    ).count()

    if current_user.password_hash == "oauth" and other_accounts == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot disconnect your only login method. Please set a password or connect another account first.",
        )

    account = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == current_user.id,
        OAuthAccount.provider == provider,
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail=f"No {provider} account connected.")

    db.delete(account)
    db.commit()

    return StandardResponse(success=True, message=f"{provider.capitalize()} account disconnected.", data=None)
