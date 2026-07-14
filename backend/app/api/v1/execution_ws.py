import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.execution.services.execution_service import ExecutionService
from app.services.auth_service import AuthService
from app.models.system_settings import SystemSettings
from app.models.user import RoleEnum
from app.models.user_activity import UserActivity
from datetime import datetime, timezone, date
from sqlalchemy import select
logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_execution(websocket: WebSocket, db: Session = Depends(get_db)):
    logger.info("New WebSocket connection attempt")
    await websocket.accept()
    logger.info("WebSocket accepted")
    
    try:
        # 1. Authenticate via cookie
        token = websocket.cookies.get("access_token")
        if not token:
            await websocket.send_json({"type": "error", "message": "Authentication failed: No token"})
            await websocket.close()
            return
            
        try:
            logger.info("Authenticating user via cookie token")
            user = AuthService.get_current_user(db, token)
            user_id = user.id
            logger.info(f"User authenticated successfully: {user_id}")
        except Exception as e:
            logger.error(f"Authentication exception: {e}")
            await websocket.send_json({"type": "error", "message": "Authentication failed"})
            await websocket.close()
            return
            
        # Check Maintenance Mode
        sys_settings = db.query(SystemSettings).first()
        if sys_settings and sys_settings.maintenance_mode:
            is_maint = True
            if sys_settings.maintenance_end_time and datetime.now(timezone.utc) > sys_settings.maintenance_end_time:
                is_maint = False
                
            if is_maint:
                is_admin = user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]
                if not (sys_settings.maintenance_allow_admin_access and is_admin):
                    maint_msg = sys_settings.maintenance_message or "System is under maintenance."
                    await websocket.send_json({"type": "error", "message": f"MAINTENANCE: {maint_msg}"})
                    await websocket.close()
                    return

        # 2. Wait for initialization message
        logger.info("Waiting for initialization message from frontend...")
        init_message = await websocket.receive_text()
        logger.info(f"Received raw message: {init_message}")
        init_data = json.loads(init_message)
        logger.info(f"Parsed payload: {init_data}")
        
        project_id = init_data.get("projectId")
        # 3. Start Interactive Execution or Shell
        service = ExecutionService(db)
        mode = init_data.get("mode", "execute")
        
        logger.info(f"Entering mode: {mode} for project: {project_id}")
        
        if mode == "shell":
            logger.info("Calling run_shell_interactive")
            terminal_prompt = init_data.get("terminalPrompt")
            await service.run_shell_interactive(websocket, project_id, user_id, terminal_prompt)
            logger.info("Finished run_shell_interactive")
        else:
            logger.info("Entering execute mode")
            file_id = init_data.get("fileId")
            if not file_id:
                logger.error("Missing fileId for execution")
                await websocket.send_json({"type": "error", "message": "Missing fileId for execution"})
                await websocket.close()
                return
            logger.info(f"Calling run_code_interactive with fileId: {file_id}")
            await service.run_code_interactive(websocket, project_id, file_id, user_id)
            logger.info("Finished run_code_interactive")
            
            # Record activity
            try:
                today = date.today()
                result = db.execute(select(UserActivity).where(UserActivity.user_id == user_id, UserActivity.activity_date == today))
                activity = result.scalar_one_or_none()
                if activity:
                    activity.count += 1
                else:
                    activity = UserActivity(user_id=user_id, activity_date=today, count=1)
                    db.add(activity)
                db.commit()
            except Exception as act_err:
                logger.error(f"Failed to record activity: {act_err}")
        
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected gracefully")
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except:
            pass
