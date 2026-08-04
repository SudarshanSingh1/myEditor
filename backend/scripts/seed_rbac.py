import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.database.session import SessionLocal
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user import RoleEnum

PERMISSION_MATRIX = [
    # General / Projects
    {"node": "projects.create", "category": "Projects", "description": "Create new projects"},
    {"node": "projects.edit.self", "category": "Projects", "description": "Edit own projects"},
    {"node": "projects.delete.any", "category": "Projects", "description": "Delete any project"},
    
    # Users
    {"node": "users.read.basic", "category": "Users", "description": "Read basic user profiles"},
    {"node": "users.suspend", "category": "Users", "description": "Suspend user accounts"},
    {"node": "users.flag", "category": "Users", "description": "Flag user accounts"},
    {"node": "users.delete", "category": "Users", "description": "Permanently delete user accounts"},
    
    # Reports
    {"node": "reports.review", "category": "Moderation", "description": "Review reports"},
    {"node": "reports.resolve", "category": "Moderation", "description": "Resolve reports"},
    
    # System / Admin
    {"node": "system.containers.restart", "category": "System", "description": "Restart system containers"},
    {"node": "system.storage.view", "category": "System", "description": "View system storage metrics"},
    {"node": "system.maintenance.toggle", "category": "System", "description": "Toggle maintenance mode"},
    
    # Owner only
    {"node": "system.billing.view", "category": "Billing", "description": "View billing details"},
    {"node": "system.billing.manage", "category": "Billing", "description": "Manage billing subscriptions"},
    {"node": "system.secrets.manage", "category": "System", "description": "Manage system secrets"},
    {"node": "database.backup", "category": "Database", "description": "Trigger database backup"},
    {"node": "database.restore", "category": "Database", "description": "Trigger database restore"},
]

ROLE_ASSIGNMENTS = {
    RoleEnum.USER: [
        "projects.create",
        "projects.edit.self",
        "users.read.basic",
    ],
    RoleEnum.MODERATOR: [
        "projects.create",
        "projects.edit.self",
        "projects.delete.any",
        "users.read.basic",
        "users.suspend",
        "users.flag",
        "reports.review",
        "reports.resolve",
    ],
    RoleEnum.ADMIN: [
        "projects.create",
        "projects.edit.self",
        "projects.delete.any",
        "users.read.basic",
        "users.suspend",
        "users.flag",
        "users.delete",
        "reports.review",
        "reports.resolve",
        "system.containers.restart",
        "system.storage.view",
        "system.maintenance.toggle",
    ],
    # OWNER gets everything
}

def seed_rbac():
    db = SessionLocal()
    try:
        print("Seeding permissions...")
        db_permissions = {}
        for p in PERMISSION_MATRIX:
            perm = db.query(Permission).filter_by(node=p["node"]).first()
            if not perm:
                perm = Permission(
                    node=p["node"],
                    category=p["category"],
                    description=p["description"]
                )
                db.add(perm)
                db.commit()
                db.refresh(perm)
            db_permissions[perm.node] = perm
            
        print("Seeding role assignments...")
        for role, nodes in ROLE_ASSIGNMENTS.items():
            for node in nodes:
                perm = db_permissions[node]
                existing = db.query(RolePermission).filter_by(role=role, permission_id=perm.id).first()
                if not existing:
                    rp = RolePermission(role=role, permission_id=perm.id)
                    db.add(rp)
        
        # Owner gets all permissions
        for perm in db_permissions.values():
            existing = db.query(RolePermission).filter_by(role=RoleEnum.OWNER, permission_id=perm.id).first()
            if not existing:
                rp = RolePermission(role=RoleEnum.OWNER, permission_id=perm.id)
                db.add(rp)
                
        db.commit()
        print("RBAC seeded successfully.")
    except Exception as e:
        print(f"CRITICAL: Error seeding RBAC: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_rbac()
