from fastapi import APIRouter
from app.schemas.responses import SuccessResponse
from app.api.v1 import auth, system_settings, projects, workspace, execution, execution_ws, feedback, system_errors, admin, system_status, guest, seo

router = APIRouter()

router.include_router(seo.router, prefix="/seo", tags=["SEO"])
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(system_settings.router, prefix="/system-settings", tags=["System Settings"])
router.include_router(projects.router, prefix="/projects", tags=["Projects"])
router.include_router(workspace.router, prefix="/workspace", tags=["Workspace"])
router.include_router(execution.router, prefix="/execution", tags=["Execution"])
router.include_router(execution_ws.router, prefix="/execution", tags=["Execution WebSockets"])
router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
router.include_router(system_errors.router, prefix="/system-errors", tags=["System Errors"])
router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])
router.include_router(system_status.router, prefix="/system", tags=["System"])
router.include_router(guest.router, prefix="/guest", tags=["Guest"])

from app.api.v1 import sessions, two_factor_auth, oauth, github, git, users
router.include_router(sessions.router, tags=["Sessions"])
router.include_router(two_factor_auth.router, tags=["Security"])
router.include_router(oauth.router, tags=["OAuth"])
router.include_router(github.router, tags=["GitHub"])
router.include_router(git.router, tags=["Git"])
router.include_router(users.router)

@router.get("/status", response_model=SuccessResponse[dict])
async def v1_status():
    return SuccessResponse(message="v1 API is operational", data={"version": "1.0.0"})
