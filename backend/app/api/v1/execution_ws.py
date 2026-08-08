import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.execution.services.execution_service import ExecutionService
from app.services.auth_service import AuthService
from app.models.system_settings import SystemSettings
from app.models.user import RoleEnum
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# WebSocket health constants
_WS_HEARTBEAT_INTERVAL = 30  # seconds between ping frames
_WS_IDLE_TIMEOUT = 300  # seconds before an idle connection is closed


from app.api.v1.safe_websocket import SafeWebSocket

async def _heartbeat_loop(websocket: SafeWebSocket, jti: str = None) -> None:
    """Send a ping every 30 s; close the socket if the client goes dark for 5 min.

    This task is cancelled by the caller when execution finishes normally.
    It raises asyncio.CancelledError on clean cancellation — never touches the
    websocket after the caller has already closed it.
    """
    silent_cycles = 0
    max_silent = _WS_IDLE_TIMEOUT // _WS_HEARTBEAT_INTERVAL  # e.g. 10
    try:
        while True:
            await asyncio.sleep(_WS_HEARTBEAT_INTERVAL)
            
            # Enforce immediate session revocation for active websockets
            if jti:
                from app.database.session import SessionLocal
                from app.models.user_session import UserSession
                db = SessionLocal()
                try:
                    is_active = db.query(UserSession.is_active).filter(UserSession.session_token_jti == jti).scalar()
                    if not is_active:
                        logger.warning("[WS] Session revoked mid-execution — closing connection")
                        await websocket.close(code=1008)
                        return
                finally:
                    db.close()
            
            try:
                await websocket.send_json({"type": "ping"})
                silent_cycles = 0
            except Exception:
                silent_cycles += 1
                if silent_cycles >= max_silent:
                    logger.warning("[WS] Idle timeout — closing stale connection")
                    try:
                        await websocket.close(code=1001)
                    except Exception:
                        pass
                    return
    except asyncio.CancelledError:
        pass  # Normal shutdown — don't touch the socket


router = APIRouter()


@router.websocket("/ws")
async def websocket_execution(websocket: WebSocket, db: Session = Depends(get_db)):
    logger.info("New WebSocket connection attempt")
    await websocket.accept()
    logger.info("WebSocket accepted")

    try:
        from jose import jwt
        from app.core.config import settings

        safe_ws = SafeWebSocket(websocket)

        # 1. Authenticate via cookie
        token = safe_ws.cookies.get("access_token")
        if not token:
            await safe_ws.send_json(
                {"type": "error", "message": "Authentication failed: No token"}
            )
            await safe_ws.close()
            return

        is_guest = False
        user_id = None
        jti = None

        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            jti = payload.get("jti")
            if payload.get("type") == "guest":
                is_guest = True
                user_id = payload.get("sub")
                logger.info(f"Guest authenticated: {user_id}")
            else:
                user = AuthService.get_current_user(db, token)
                user_id = user.id
                logger.info(f"User authenticated successfully: {user_id}")
        except Exception as e:
            logger.warning(f"WebSocket authentication warning: {e}")
            await safe_ws.send_json(
                {"type": "error", "message": "Authentication failed"}
            )
            await safe_ws.close()
            return

        # Check Maintenance Mode (only for actual users, or guests)
        if not is_guest:
            sys_settings = db.query(SystemSettings).first()
            if sys_settings and sys_settings.maintenance_mode:
                is_maint = True
                if (
                    sys_settings.maintenance_end_time
                    and datetime.now(timezone.utc) > sys_settings.maintenance_end_time
                ):
                    is_maint = False

                if is_maint:
                    is_admin = user.role in [RoleEnum.OWNER, RoleEnum.ADMIN]
                    if not (sys_settings.maintenance_allow_admin_access and is_admin):
                        maint_msg = (
                            sys_settings.maintenance_message
                            or "System is under maintenance."
                        )
                        await safe_ws.send_json(
                            {"type": "error", "message": f"MAINTENANCE: {maint_msg}"}
                        )
                        await safe_ws.close()
                        return

        # 2. Wait for initialization message
        logger.info("Waiting for initialization message from frontend...")
        init_message = await safe_ws.receive_text()
        init_data = json.loads(init_message)

        mode = init_data.get("mode", "execute")
        service = ExecutionService(db)

        # Start heartbeat after successful auth + init — keeps connection alive
        # and automatically closes stale/zombie connections after idle timeout.
        heartbeat_task = asyncio.create_task(_heartbeat_loop(safe_ws, jti=jti))

        try:
            if mode == "execute_guest":
                content = init_data.get("content")
                language = init_data.get("language")
                if not content or not language:
                    await safe_ws.send_json(
                        {"type": "error", "message": "Missing content or language"}
                    )
                    await safe_ws.close()
                    return

                if is_guest:
                    from app.models.guest_session import GuestSession
                    import uuid

                    # Check Quota
                    session_model = (
                        db.query(GuestSession)
                        .filter(GuestSession.id == uuid.UUID(user_id))
                        .first()
                    )
                    if not session_model or session_model.expires_at < datetime.now(
                        timezone.utc
                    ):
                        await safe_ws.send_json(
                            {"type": "error", "message": "Guest session expired"}
                        )
                        await safe_ws.close()
                        return

                    if session_model.execution_count >= 15:
                        await safe_ws.send_json(
                            {
                                "type": "error",
                                "message": "Guest execution quota exceeded. Please sign up.",
                            }
                        )
                        await safe_ws.close()
                        return

                    # Increment quota
                    session_model.execution_count += 1
                    db.commit()

                # Run Guest Code (for both real users and guests)
                await service.run_guest_code_interactive(safe_ws, content, language)

            else:
                if is_guest:
                    await safe_ws.send_json(
                        {"type": "error", "message": "Guests cannot access projects"}
                    )
                    await safe_ws.close()
                    return

                project_id = init_data.get("projectId")

                if mode == "shell":
                    terminal_prompt = init_data.get("terminalPrompt")
                    await service.run_shell_interactive(
                        safe_ws, project_id, user_id, terminal_prompt
                    )
                else:
                    file_id = init_data.get("fileId")
                    if not file_id:
                        await safe_ws.send_json(
                            {"type": "error", "message": "Missing fileId for execution"}
                        )
                        await safe_ws.close()
                        return
                    await service.run_code_interactive(
                        safe_ws, project_id, file_id, user_id
                    )
        finally:
            # Always cancel the heartbeat when execution ends (success or error)
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected gracefully")
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        try:
            await safe_ws.send_json(
                {"type": "error", "message": "An internal server error occurred."}
            )
            await safe_ws.close()
        except Exception:
            pass
