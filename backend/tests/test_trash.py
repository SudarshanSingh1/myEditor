import os
import sys

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.services.project_service import ProjectService
from app.repositories.project_repository import ProjectRepository
from app.models.user import User


def test_trash():
    db = SessionLocal()
    # Find any user
    user = db.query(User).first()
    if not user:
        print("No user found")
        return

    print(f"Using user: {user.username}")

    repo = ProjectRepository(db)
    service = ProjectService(db)
    from app.schemas.project import ProjectCreate

    # Check trash before
    trashed_projects, _ = repo.get_user_projects(user.id, limit=1000, deleted=True)
    print(f"Trash count initially: {len(trashed_projects)}")

    # Create project
    proj_in = ProjectCreate(name="Test Trash Proj", language="python")
    project = service.create_project(proj_in, user.id)
    print(f"Created project: {project.id}")

    # Soft delete it
    service.delete_project(project.id, user.id)
    print("Project moved to trash")

    # Check trash after soft delete
    trashed_projects, _ = repo.get_user_projects(user.id, limit=1000, deleted=True)
    print(f"Trash count after soft delete: {len(trashed_projects)}")

    # Empty trash
    service.empty_trash(user.id)
    print("Emptied trash")

    # Check trash after empty
    trashed_projects_after, _ = repo.get_user_projects(
        user.id, limit=1000, deleted=True
    )
    print(f"Trash count after empty: {len(trashed_projects_after)}")


if __name__ == "__main__":
    test_trash()
