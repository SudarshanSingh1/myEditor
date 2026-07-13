from fastapi import APIRouter
from app.schemas.responses import SuccessResponse
from app.api.v1 import auth, system_settings, projects, workspace, execution, execution_ws, feedback, system_errors, admin, system

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(system_settings.router, prefix="/system-settings", tags=["System Settings"])
router.include_router(projects.router, prefix="/projects", tags=["Projects"])
router.include_router(workspace.router, prefix="/workspace", tags=["Workspace"])
router.include_router(execution.router, prefix="/execution", tags=["Execution"])
router.include_router(execution_ws.router, prefix="/execution", tags=["Execution WebSockets"])
router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
router.include_router(system_errors.router, prefix="/system-errors", tags=["System Errors"])
router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])
router.include_router(system.router, prefix="/system", tags=["System"])

from app.api.v1 import sessions, security, oauth, github, git
router.include_router(sessions.router, tags=["Sessions"])
router.include_router(security.router, tags=["Security"])
router.include_router(oauth.router, tags=["OAuth"])
router.include_router(github.router, tags=["GitHub"])
router.include_router(git.router, tags=["Git"])

@router.get("/status", response_model=SuccessResponse[dict])
async def v1_status():
    return SuccessResponse(message="v1 API is operational", data={"version": "1.0.0"})
