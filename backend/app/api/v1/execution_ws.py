import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.execution.services.execution_service import ExecutionService
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_execution(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    
    try:
        # 1. Authenticate via cookie
        token = websocket.cookies.get("access_token")
        if not token:
            await websocket.send_json({"type": "error", "message": "Authentication failed: No token"})
            await websocket.close()
            return
            
        try:
            user = AuthService.get_current_user(db, token)
            user_id = user.id
        except Exception:
            await websocket.send_json({"type": "error", "message": "Authentication failed"})
            await websocket.close()
            return

        # 2. Wait for initialization message
        init_message = await websocket.receive_text()
        init_data = json.loads(init_message)
        
        project_id = init_data.get("projectId")
        # 3. Start Interactive Execution or Shell
        service = ExecutionService(db)
        mode = init_data.get("mode", "execute")
        
        if mode == "shell":
            await service.run_shell_interactive(websocket, project_id, user_id)
        else:
            file_id = init_data.get("fileId")
            if not file_id:
                await websocket.send_json({"type": "error", "message": "Missing fileId for execution"})
                await websocket.close()
                return
            await service.run_code_interactive(websocket, project_id, file_id, user_id)
        
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected gracefully")
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except:
            pass
