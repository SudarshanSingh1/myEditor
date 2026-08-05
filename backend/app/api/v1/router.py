from fastapi import APIRouter
from app.schemas.responses import SuccessResponse
from app.api.v1 import (
    auth,
    system_settings,
    projects,
    workspace,
    execution,
    execution_ws,
    feedback,
    system_errors,
    admin,
    system_status,
    guest,
    seo,
    sessions,
    two_factor_auth,
    oauth,
    github,
    git,
    users,
    rbac,
    reports,
    docker,
    notifications,
    api_keys,
    secrets_api,
    feature_flags,
    infrastructure,
)

router = APIRouter()

router.include_router(seo.router, prefix="/seo", tags=["SEO"])
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(
    system_settings.router, prefix="/system-settings", tags=["System Settings"]
)
router.include_router(projects.router, prefix="/projects", tags=["Projects"])
router.include_router(workspace.router, prefix="/workspace", tags=["Workspace"])
router.include_router(execution.router, prefix="/execution", tags=["Execution"])
router.include_router(
    execution_ws.router, prefix="/execution", tags=["Execution WebSockets"]
)
router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
router.include_router(
    system_errors.router, prefix="/system-errors", tags=["System Errors"]
)
router.include_router(admin.admin_router, prefix="/admin", tags=["Admin Dashboard"])

from app.api.v1.admin.logs import router as admin_logs_router

router.include_router(
    admin_logs_router, prefix="/admin/logs", tags=["Admin Logs WebSocket"]
)

router.include_router(system_status.router, prefix="/system", tags=["System"])
router.include_router(guest.router, prefix="/guest", tags=["Guest"])

from app.api.v1 import sessions, two_factor_auth, oauth, github, git, users, rbac

router.include_router(sessions.router, tags=["Sessions"])
router.include_router(two_factor_auth.router, tags=["Security"])
router.include_router(oauth.router, tags=["OAuth"])
router.include_router(github.router, tags=["GitHub"])
router.include_router(git.router, tags=["Git"])
router.include_router(users.router)
router.include_router(rbac.router, prefix="/rbac", tags=["RBAC"])
router.include_router(reports.router, prefix="/admin/reports", tags=["reports"])
router.include_router(docker.router, prefix="/admin/docker", tags=["docker"])
router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
router.include_router(api_keys.router, prefix="/admin/api-keys", tags=["api_keys"])
router.include_router(secrets_api.router, prefix="/admin/secrets", tags=["secrets"])
router.include_router(
    feature_flags.router, prefix="/admin/feature-flags", tags=["feature_flags"]
)
router.include_router(
    infrastructure.router, prefix="/admin/infrastructure", tags=["infrastructure"]
)


@router.get("/status", response_model=SuccessResponse[dict])
async def v1_status():
    return SuccessResponse(message="v1 API is operational", data={"version": "1.0.0"})
