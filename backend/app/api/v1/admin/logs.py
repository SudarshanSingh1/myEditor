import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, Cookie
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.services.auth_service import AuthService
from app.models.user import User
from app.core.logger import log_queues, logger

router = APIRouter()

async def get_current_user_ws(token: str, db: Session) -> User:
    try:
        return AuthService.get_current_user(db, token)
    except Exception as e:
        logger.warning(f"WebSocket authentication warning: {e}")
        return None

@router.websocket("/ws")
async def websocket_logs(
    websocket: WebSocket,
    token: str | None = Query(default=None),
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):
    await websocket.accept()
    
    # Extract token from query or raw websocket cookies reliably
    actual_token = token or websocket.cookies.get("access_token")
    user = await get_current_user_ws(actual_token, db)
    if not user:
        await websocket.send_text("ERROR: Authentication failed. Invalid token.")
        await websocket.close(code=1008)
        return
        
    # Check roles (Only OWNER or ADMIN should access this, though technically we could use require_permission)
    # We will manually check role to keep it simple for the websocket since require_permission expects a Request object
    role = (user.role or "").upper()
    if role not in ["OWNER", "ADMIN"]:
        await websocket.send_text("ERROR: Forbidden. You do not have permission to view live logs.")
        await websocket.close(code=1008)
        return

    await websocket.send_text(f"INFO: Connected to live logs as {role}")
    logger.info(f"Admin {user.email} connected to live logs")
    
    q = asyncio.Queue(maxsize=100)
    log_queues.append(q)
    
    try:
        while True:
            # Wait for a log message
            msg = await q.get()
            await websocket.send_text(msg)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if q in log_queues:
            log_queues.remove(q)
        logger.info(f"Admin {user.email} disconnected from live logs")
