import uuid
import logging
import random
import string
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from jose import jwt, JWTError

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, validate_password_strength
from app.models.user import User, StatusEnum, RoleEnum
from app.models.system_settings import SystemSettings
from app.models.audit_log import AuditLog
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, ChangePasswordRequest, PasswordResetRequest, ResetPasswordConfirmRequest, UserProfileUpdateRequest
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

class AuthService:
    
    @staticmethod
    def register_user(db: Session, req: UserRegisterRequest, ip_address: str = None) -> User:
        # Validate password strength
        if not validate_password_strength(req.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
            )
            
        # Check duplicate email
        email_normalized = req.email.lower().strip()
        if db.query(User).filter(User.email == email_normalized).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered."
            )
            
        # Check duplicate username
        username_clean = req.username.strip()
        if db.query(User).filter(User.username == username_clean).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken."
            )
            
        # Create user
        new_user = User(
            first_name=req.first_name.strip(),
            last_name=req.last_name.strip(),
            username=username_clean,
            email=email_normalized,
            password_hash=get_password_hash(req.password)
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Log action
        log = AuditLog(user_id=new_user.id, action="REGISTER", ip_address=ip_address)
        db.add(log)
        db.commit()
        
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()
        
        # Generate verification token containing the hash
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
        to_encode = {"exp": expire, "sub": str(new_user.id), "type": "verification", "otp_hash": otp_hash}
        verification_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        # Send email
        try:
            EmailService.send_verification_email(str(new_user.id), otp)
        except Exception as e:
            logger.error(f"Failed to send verification email to {email_normalized}: {e}")
            # We don't fail registration if email fails, but we log it
        
        return new_user, verification_token

    @staticmethod
    def verify_email(db: Session, token: str, otp: str) -> User:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            token_otp_hash = payload.get("otp_hash")
            if not user_id or token_type != "verification" or not token_otp_hash:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
                
            # Verify OTP
            provided_hash = hashlib.sha256(otp.encode()).hexdigest()
            if provided_hash != token_otp_hash:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
        except JWTError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            
        if user.email_verified:
            return user
            
        user.email_verified = True
        user.status = StatusEnum.ACTIVE
        db.commit()
        return user

    @staticmethod
    def resend_verification(db: Session, email: str):
        email_normalized = email.lower().strip()
        user = db.query(User).filter(User.email == email_normalized).first()
        if not user:
            return # Silent return
            
        if user.email_verified:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified.")
            
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()
        
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
        to_encode = {"exp": expire, "sub": str(user.id), "type": "verification", "otp_hash": otp_hash}
        verification_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        try:
            EmailService.send_verification_email(str(user.id), otp)
        except Exception as e:
            logger.error(f"Failed to resend verification email to {email_normalized}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send email. Please try again later.")
            
        return verification_token

    @staticmethod
    def authenticate_user(db: Session, req: UserLoginRequest, ip_address: str = None, user_agent_string: str = None) -> Tuple[User, str, str]:
        email_normalized = req.email.lower().strip()
        logger.info(f"Login attempt for email: {email_normalized}")
        
        user = db.query(User).filter(User.email == email_normalized).first()
        if not user:
            logger.warning(f"Login failed: User not found for email {email_normalized}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
            
        # Brute Force Check
        if user.account_locked_until and user.account_locked_until > datetime.now(timezone.utc):
            logger.warning(f"Login failed: Account locked for user {user.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is temporarily locked due to too many failed login attempts. Try again later."
            )

        logger.info(f"User found: ID {user.id}, Username {user.username}. Verifying password hash...")
        is_valid_password = verify_password(req.password, user.password_hash)
        logger.info(f"Password verification result: {'Success' if is_valid_password else 'Failed'}")
        
        if not is_valid_password:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.account_locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            db.commit()
            
            logger.warning(f"Login failed: Incorrect password for user {user.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
            
        logger.info(f"Account status for {user.username}: {user.status.value}, is_deleted: {user.is_deleted}")
        if user.status in [StatusEnum.BANNED, StatusEnum.SUSPENDED] or user.is_deleted:
            reason = f"Account is {user.status.value.lower()}" if not user.is_deleted else "Account is deleted"
            logger.warning(f"Login failed: {reason} for user {user.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{reason}."
            )
            
        if user.must_change_password and user.temp_password_expires_at and user.temp_password_expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Temporary password has expired. Please contact your administrator."
            )
            
        # 2FA Check
        if getattr(user, 'totp_enabled', False):
            # We assume a header or special token response. We will throw a special 401.
            # In an actual setup we might issue an intermediate token.
            # For this simple setup, we'll throw an error so the frontend knows to prompt 2FA.
            # Wait, req does not have totp_code. If totp_enabled is true, this needs to be handled differently, 
            # maybe by creating a temporary "pre-auth" token. We'll issue a JWT with type="2fa".
            pre_auth_token = jwt.encode(
                {"exp": datetime.now(timezone.utc) + timedelta(minutes=5), "sub": str(user.id), "type": "2fa"},
                settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "2FA_REQUIRED", "token": pre_auth_token}
            )

        # Reset failed attempts on success
        user.failed_login_attempts = 0
        user.account_locked_until = None
        db.commit()

        # Session Management
        from app.models.user_session import UserSession
        from user_agents import parse
        
        session_token_jti = str(uuid.uuid4())
        ua = parse(user_agent_string or "")
        
        new_session = UserSession(
            user_id=user.id,
            session_token_jti=session_token_jti,
            ip_address=ip_address,
            user_agent=user_agent_string or "Unknown",
            device_type=ua.device.family if hasattr(ua, 'device') else "Unknown",
            browser=ua.browser.family if hasattr(ua, 'browser') else "Unknown",
            os=ua.os.family if hasattr(ua, 'os') else "Unknown",
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(new_session)
        
        # Generate tokens
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id, jti=session_token_jti)

        # Update last login timestamp
        user.last_login = datetime.now(timezone.utc)

        # Log action in the same transaction
        log = AuditLog(user_id=user.id, action="LOGIN", ip_address=ip_address)
        db.add(log)
        db.commit()
        logging.info(f"After login commit, users in DB: {[u.id for u in db.query(User).all()]}")

        # Notification
        try:
            EmailService.send_new_login_alert(user.id, ip_address, ua.device.family)
        except Exception:
            pass

        return user, access_token, refresh_token

    @staticmethod
    def refresh_token(db: Session, refresh_token: str) -> str:
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            token_type = payload.get("type")
            if token_type != "refresh":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

            user_id = payload.get("sub")
            jti = payload.get("jti")
            
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

            try:
                uid = uuid.UUID(user_id)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

            user = db.query(User).filter(User.id == uid).first()
            if not user or user.status in [StatusEnum.BANNED, StatusEnum.SUSPENDED]:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")
                
            if jti:
                from app.models.user_session import UserSession
                session = db.query(UserSession).filter(UserSession.session_token_jti == jti).first()
                if not session or not session.is_active:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked or expired.")
                
                # Update last active
                session.last_active_at = datetime.now(timezone.utc)
                db.commit()

            return create_access_token(subject=user.id)

        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials.")

    @staticmethod
    def get_current_user(db: Session, token: str) -> User:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")

            if token_type != "access" or not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials.")

        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

        user = db.query(User).filter(User.id == uid).first()
        import logging
        logging.info(f"get_current_user query result: {user}")
        logging.info(f"All users in DB: {[u.id for u in db.query(User).all()]}")
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

        # Re-check account status on every request — a banned user's token may still be valid
        # within the access token lifetime (30 min). This check prevents that window.
        if user.status in [StatusEnum.BANNED, StatusEnum.SUSPENDED]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {user.status.value.lower()}."
            )

        return user

    @staticmethod
    def change_password(db: Session, user: User, req: ChangePasswordRequest, ip_address: str = None):
        if not verify_password(req.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password."
            )
            
        if not validate_password_strength(req.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
            )
            
        user.password_hash = get_password_hash(req.new_password)
        user.must_change_password = False
        user.temp_password_expires_at = None
        db.commit()
        
        log = AuditLog(user_id=user.id, action="CHANGE_PASSWORD", ip_address=ip_address)
        db.add(log)
        db.commit()

    @staticmethod
    def update_profile(db: Session, user: User, req: UserProfileUpdateRequest, ip_address: str = None) -> User:
        if req.first_name is not None:
            user.first_name = req.first_name
        if req.last_name is not None:
            user.last_name = req.last_name
        if req.bio is not None:
            user.bio = req.bio
        if req.timezone is not None:
            user.timezone = req.timezone
        if req.theme_preference is not None:
            user.theme_preference = req.theme_preference
            
        db.commit()
        db.refresh(user)
        
        log = AuditLog(user_id=user.id, action="UPDATE_PROFILE", ip_address=ip_address)
        db.add(log)
        db.commit()
        
        return user

    @staticmethod
    def request_password_reset(db: Session, req: PasswordResetRequest, ip_address: str = None) -> str:
        # Check if user exists – always return the same message to prevent email enumeration
        user = db.query(User).filter(User.email == req.email.lower().strip()).first()
        
        # Check maintenance mode
        sys_settings = db.query(SystemSettings).first()
        if sys_settings and sys_settings.maintenance_mode:
            # Auto recovery logic
            is_in_maintenance = True
            if sys_settings.maintenance_end_time and datetime.now(timezone.utc) > sys_settings.maintenance_end_time:
                is_in_maintenance = False
                
            if is_in_maintenance:
                # Determine if user is allowed
                is_allowed = False
                if user:
                    if user.role == RoleEnum.SUPER_ADMIN:
                        is_allowed = True
                    elif getattr(sys_settings, "maintenance_allow_admin_access", True) and user.role in [RoleEnum.ADMIN, RoleEnum.MODERATOR]:
                        is_allowed = True
                
                if not is_allowed:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="System is currently under maintenance. Password resets are temporarily disabled."
                    )

        if not user:
            fake_token = jwt.encode({"sub": "fake", "type": "reset", "otp_hash": "fake"}, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
            return fake_token

        import random, string, hashlib
        # Generate 6-digit OTP
        otp = "".join(random.choices(string.digits, k=6))
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()

        # Generate reset token (expires in 15 minutes)
        # Including a piece of the password hash ensures the token invalidates once used.
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode = {
            "sub": str(user.id), 
            "type": "reset", 
            "exp": expire,
            "pwd_frag": user.password_hash[-10:],
            "otp_hash": otp_hash
        }
        reset_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

        # Log action
        log = AuditLog(user_id=user.id, action="REQUEST_PASSWORD_RESET", ip_address=ip_address)
        db.add(log)
        db.commit()

        try:
            EmailService.send_password_reset_email(user.id, otp)
            logger.info(f"Password reset email sent to user {user.id}")
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.id}: {str(e)}")

        return reset_token

    @staticmethod
    def reset_password_confirm(db: Session, req: ResetPasswordConfirmRequest, ip_address: str = None):
        try:
            payload = jwt.decode(req.token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            token_otp_hash = payload.get("otp_hash")

            if token_type != "reset" or not user_id or not token_otp_hash:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token.")
                
            import hashlib
            provided_hash = hashlib.sha256(req.otp.encode()).hexdigest()
            if provided_hash != token_otp_hash:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code.")

        except JWTError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token subject.")

        user = db.query(User).filter(User.id == uid).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found.")
            
        # Check maintenance mode
        sys_settings = db.query(SystemSettings).first()
        if sys_settings and sys_settings.maintenance_mode:
            # Auto recovery logic
            is_in_maintenance = True
            if sys_settings.maintenance_end_time and datetime.now(timezone.utc) > sys_settings.maintenance_end_time:
                is_in_maintenance = False
                
            if is_in_maintenance:
                # Determine if user is allowed
                is_allowed = False
                if user.role == RoleEnum.SUPER_ADMIN:
                    is_allowed = True
                elif getattr(sys_settings, "maintenance_allow_admin_access", True) and user.role in [RoleEnum.ADMIN, RoleEnum.MODERATOR]:
                    is_allowed = True
                
                if not is_allowed:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="System is currently under maintenance. Password resets are temporarily disabled."
                    )

        # Invalidate if password was already changed
        pwd_frag = payload.get("pwd_frag")
        if not pwd_frag or pwd_frag != user.password_hash[-10:]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has already been used.")

        if not validate_password_strength(req.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
            )

        user.password_hash = get_password_hash(req.new_password)
        db.commit()

        log = AuditLog(user_id=user.id, action="RESET_PASSWORD", ip_address=ip_address)
        db.add(log)
        db.commit()
