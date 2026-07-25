import sys
import os
sys.path.append(os.path.abspath("backend"))
from app.database.session import SessionLocal
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user import User, RoleEnum

db = SessionLocal()
perms = db.query(Permission.node).join(RolePermission).filter(RolePermission.role == RoleEnum.MODERATOR).all()
print("MODERATOR perms:", [p[0] for p in perms])

username_to_check = sys.argv[1] if len(sys.argv) > 1 else "admin"
user = db.query(User).filter(User.username == username_to_check).first()
if user:
    print("User role:", user.role)
    print("User effective_permissions:", user.effective_permissions)
else:
    print("User not found")
