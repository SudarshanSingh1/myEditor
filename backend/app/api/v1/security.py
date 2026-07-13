from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.services.auth_service import AuthService
from app.models.user import User
from app.schemas.responses import StandardResponse
import pyotp
import json
from pydantic import BaseModel

router = APIRouter(prefix="/security", tags=["security"])

def get_current_active_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    return AuthService.get_current_user(db, token)

class TOTPVerifyRequest(BaseModel):
    code: str

@router.post("/2fa/setup", response_model=StandardResponse)
def setup_2fa(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")
        
    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    db.commit()
    
    totp = pyotp.TOTP(secret)
    # the email would typically be used as the name in the authenticator app
    provisioning_uri = totp.provisioning_uri(name=current_user.email, issuer_name="Hamara Editor")
    
    return StandardResponse(success=True, message="2FA setup initialized", data={"secret": secret, "uri": provisioning_uri})

@router.post("/2fa/enable", response_model=StandardResponse)
def enable_2fa(req: TOTPVerifyRequest, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")
        
    if not current_user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA setup not initialized")
        
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA code")
        
    current_user.totp_enabled = True
    
    # Generate recovery codes
    import secrets
    recovery_codes = [secrets.token_hex(4) for _ in range(8)]
    current_user.recovery_codes = json.dumps(recovery_codes)
    
    db.commit()
    
    return StandardResponse(
        success=True, 
        message="2FA enabled successfully", 
        data={"recovery_codes": recovery_codes}
    )

@router.post("/2fa/disable", response_model=StandardResponse)
def disable_2fa(req: TOTPVerifyRequest, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if not current_user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")
        
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA code")
        
    current_user.totp_enabled = False
    current_user.totp_secret = None
    current_user.recovery_codes = None
    db.commit()
    
    return StandardResponse(success=True, message="2FA disabled successfully")
