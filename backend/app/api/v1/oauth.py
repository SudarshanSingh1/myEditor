import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.dependencies.database import get_db
from app.models.user import User, StatusEnum
from app.models.oauth_account import OAuthAccount
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.schemas.responses import StandardResponse
from app.api.v1.security import get_current_active_user
import httpx

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])

@router.get("/{provider}/authorize")
def oauth_authorize(provider: str, request: Request):
    if provider == "github":
        client_id = settings.GITHUB_CLIENT_ID
        if not client_id:
            # Mock redirect for local testing if no keys are configured
            return RedirectResponse(f"{settings.FRONTEND_URL}/oauth/callback/github?code=mock_code")
        
        # Use frontend URL to handle callback or our backend URL
        redirect_uri = f"{settings.FRONTEND_URL}/oauth/callback/github"
        url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=user:email%20repo"
        return RedirectResponse(url)
        
    elif provider == "google":
        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            # Mock redirect for local testing if no keys are configured
            return RedirectResponse(f"{settings.FRONTEND_URL}/oauth/callback/google?code=mock_code")
            
        redirect_uri = f"{settings.FRONTEND_URL}/oauth/callback/google"
        url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=email%20profile"
        return RedirectResponse(url)
    
    raise HTTPException(status_code=400, detail="Unsupported provider")

# Note: The actual callback exchange logic would go here. 
# It would exchange the code for an access token, fetch user profile, 
# match email with existing User, create OAuthAccount if missing, 
# and return the JWT tokens.
# To keep this implementation focused and avoid breaking without real keys, 
# we mock the callback if it receives a special mock code for testing.

from pydantic import BaseModel

class OAuthCallbackRequest(BaseModel):
    code: str

@router.post("/{provider}/callback", response_model=StandardResponse)
async def oauth_callback(provider: str, req: OAuthCallbackRequest, request: Request, db: Session = Depends(get_db)):
    if provider == "github":
        if req.code == "mock_code":
            email = "mockuser@github.com"
            provider_id = "mock_id_github"
            name = "Mock User"
            avatar = None
            access_token = "mock_github_access_token"
            refresh_token_oauth = None
        else:
            # Exchange code for access token
            async with httpx.AsyncClient() as client:
                token_res = await client.post(
                    "https://github.com/login/oauth/access_token",
                    data={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": req.code,
                        "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback/github"
                    },
                    headers={"Accept": "application/json"}
                )
                if token_res.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to exchange code")
                token_data = token_res.json()
                if "error" in token_data:
                    raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth Error"))
                
                access_token = token_data["access_token"]
                refresh_token_oauth = token_data.get("refresh_token")
                
                # Fetch user info
                user_res = await client.get(
                    "https://api.github.com/user",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                user_data = user_res.json()
                
                provider_id = str(user_data["id"])
                name = user_data.get("name") or user_data.get("login") or "GitHub User"
                avatar = user_data.get("avatar_url")
                email = user_data.get("email")
                
                # If email is private, fetch from emails endpoint
                if not email:
                    emails_res = await client.get(
                        "https://api.github.com/user/emails",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    emails_data = emails_res.json()
                    primary = next((e for e in emails_data if e.get("primary")), None)
                    if primary:
                        email = primary["email"]
                    elif len(emails_data) > 0:
                        email = emails_data[0]["email"]
                    else:
                        raise HTTPException(status_code=400, detail="No email associated with GitHub account")

    elif provider == "google":
        if req.code == "mock_code":
            email = "mockuser@google.com"
            provider_id = "mock_id_google"
            name = "Mock User"
            avatar = None
            access_token = "mock_google_access_token"
            refresh_token_oauth = None
        else:
            # Exchange code for access token
            async with httpx.AsyncClient() as client:
                token_res = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "code": req.code,
                        "grant_type": "authorization_code",
                        "redirect_uri": f"{settings.FRONTEND_URL}/oauth/callback/google"
                    }
                )
                if token_res.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to exchange code")
                token_data = token_res.json()
                access_token = token_data["access_token"]
                refresh_token_oauth = token_data.get("refresh_token")
                
                # Fetch user info
                user_res = await client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                user_data = user_res.json()
                
                provider_id = user_data["id"]
                email = user_data["email"]
                name = user_data.get("name", "Google User")
                avatar = user_data.get("picture")

    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    # Check if oauth account exists
    oauth_acc = db.query(OAuthAccount).filter(
        OAuthAccount.provider == provider,
        OAuthAccount.provider_account_id == provider_id
    ).first()
    
    if oauth_acc:
        user = oauth_acc.user
        if avatar and not user.avatar:
            user.avatar = avatar
        oauth_acc.access_token = access_token
        if refresh_token_oauth:
            oauth_acc.refresh_token = refresh_token_oauth
        db.commit()
    else:
        # Match by email
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Create new user
            user = User(
                first_name=name.split()[0],
                last_name=" ".join(name.split()[1:]) if len(name.split()) > 1 else "",
                username=email.split('@')[0] + str(uuid.uuid4().hex[:4]),
                email=email,
                password_hash="oauth", # no password
                email_verified=True,
                status=StatusEnum.ACTIVE,
                avatar=avatar
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        # Link account
        new_oauth = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_account_id=provider_id,
            access_token=access_token,
            refresh_token=refresh_token_oauth
        )
        db.add(new_oauth)
        db.commit()
        
    # Generate tokens and session
    from app.models.user_session import UserSession
    session_token_jti = str(uuid.uuid4())
    
    ip_address = request.client.host if request.client else "OAuth"
    
    new_session = UserSession(
        user_id=user.id,
        session_token_jti=session_token_jti,
        ip_address=ip_address,
        user_agent=request.headers.get("user-agent", "OAuth"),
        device_type="Unknown",
        browser="Unknown",
        os="Unknown",
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_session)
    db.commit()
    
    from fastapi.responses import JSONResponse
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id, jti=session_token_jti)
    
    # We should return a Response with cookies set
    response = JSONResponse(content={
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
                "avatar": user.avatar
            }
        }
    })
    
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
    
    return response

@router.get("/connected", response_model=StandardResponse)
def get_connected_accounts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    accounts = db.query(OAuthAccount).filter(OAuthAccount.user_id == current_user.id).all()
    providers = [acc.provider for acc in accounts]
    return StandardResponse(success=True, message="Connected accounts fetched", data={"providers": providers})

@router.delete("/disconnect/{provider}", response_model=StandardResponse)
def disconnect_oauth_account(provider: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Verify user has at least one other way to log in
    other_accounts = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == current_user.id,
        OAuthAccount.provider != provider
    ).count()
    
    # If they have no password and this is their only OAuth account, they cannot disconnect
    if current_user.password_hash == "oauth" and other_accounts == 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot disconnect your only login method. Please set a password or connect another account first."
        )
        
    account = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == current_user.id,
        OAuthAccount.provider == provider
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail=f"No {provider} account connected.")
        
    db.delete(account)
    db.commit()
    
    return StandardResponse(success=True, message=f"{provider.capitalize()} account disconnected.", data=None)
