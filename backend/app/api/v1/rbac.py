from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user_dep
from app.models.user import User, RoleEnum

router = APIRouter()


@router.get("/my-permissions", summary="Get current user's effective permissions")
def get_my_permissions(current_user: User = Depends(get_current_user_dep)):
    """
    Returns the list of permission nodes the current user has.
    """
    if current_user.role == RoleEnum.OWNER:
        # Owner gets a special indicator or we can just send "all"
        permissions = ["*"]
    else:
        permissions = current_user.effective_permissions or []

    return {"role": current_user.role, "permissions": permissions}
