from fastapi import APIRouter

from .analytics import router as analytics_router
from .dashboard import router as dashboard_router
from .executions import router as executions_router
from .github import router as github_router
from .identity import router as identity_router
from .platform_analytics import router as platform_analytics_router
from .projects import router as projects_router
from .security import router as security_router
from .server import router as server_router
from .system import router as system_router
from .users import router as users_router
from .logs import router as logs_router

admin_router = APIRouter()

admin_router.include_router(dashboard_router)
admin_router.include_router(analytics_router)
admin_router.include_router(platform_analytics_router)
admin_router.include_router(users_router)
admin_router.include_router(projects_router)
admin_router.include_router(executions_router)
admin_router.include_router(system_router)
admin_router.include_router(identity_router)
admin_router.include_router(security_router)
admin_router.include_router(server_router)
admin_router.include_router(github_router)
admin_router.include_router(logs_router, prefix="/logs", tags=["admin-logs"])
