import os
import tempfile
import git
from typing import Dict, Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.project import Project
from app.schemas.workspace import FolderCreate, FileCreate
from app.repositories.workspace_repository import WorkspaceRepository


class GitService:
    def __init__(self, db: Session):
        self.db = db

    def _get_extension(self, filename: str) -> str:
        parts = filename.rsplit(".", 1)
        return f".{parts[1]}" if len(parts) > 1 else ""

    def _determine_language(self, extension: str) -> str:
        ext_map = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".html": "html",
            ".css": "css",
            ".json": "json",
            ".c": "c",
            ".cpp": "cpp",
            ".java": "java",
            ".go": "go",
            ".rs": "rust",
            ".md": "markdown",
            ".txt": "text",
        }
        return ext_map.get(extension.lower(), "text")

    def _get_authenticated_url(self, repo_url: str, access_token: str) -> str:
        """Injects access token into the git URL for authentication."""
        if repo_url.startswith("https://"):
            return repo_url.replace(
                "https://", f"https://x-access-token:{access_token}@"
            )
        return repo_url

    def clone_repository(
        self,
        project: Project,
        repo_url: str,
        access_token: str,
        branch: Optional[str] = None,
    ):
        """Clones a remote git repository and imports all its files into the DB Workspace."""
        auth_url = self._get_authenticated_url(repo_url, access_token)

        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                # Clone
                if branch:
                    git.Repo.clone_from(auth_url, tmpdir, branch=branch)
                else:
                    git.Repo.clone_from(auth_url, tmpdir)

                # Walk the directory and create DB records
                folder_map: Dict[str, UUID] = {tmpdir: None}

                for root, dirs, files in os.walk(tmpdir):
                    if ".git" in dirs:
                        dirs.remove(".git")

                    current_parent_id = folder_map.get(root)

                    for d in dirs:
                        dir_path = os.path.join(root, d)
                        folder_in = FolderCreate(
                            name=d, project_id=project.id, parent_id=current_parent_id
                        )
                        new_folder = WorkspaceRepository.create_folder(
                            self.db, folder_in, path="", depth=0
                        )
                        folder_map[dir_path] = new_folder.id

                    for f in files:
                        file_path = os.path.join(root, f)
                        try:
                            with open(file_path, "r", encoding="utf-8") as file_obj:
                                content = file_obj.read()
                        except UnicodeDecodeError:
                            continue

                        ext = self._get_extension(f)
                        lang = self._determine_language(ext)

                        file_in = FileCreate(
                            name=f,
                            project_id=project.id,
                            folder_id=current_parent_id,
                            content=content,
                            language=lang,
                            extension=ext,
                        )
                        WorkspaceRepository.create_file(self.db, file_in)

            except Exception as e:
                raise ValueError(f"Failed to clone repository: {str(e)}")

    def push_to_repository(
        self,
        project: Project,
        repo_url: str,
        access_token: str,
        commit_message: str,
        branch: str = "main",
    ):
        """
        Dumps the DB files to a temp directory, clones the remote, overwrites with DB files, commits, and pushes.
        """
        auth_url = self._get_authenticated_url(repo_url, access_token)

        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                # 1. Clone the existing remote state
                import git.exc

                try:
                    repo = git.Repo.clone_from(auth_url, tmpdir, branch=branch)
                except git.exc.GitCommandError as e:
                    if "not found in upstream" in str(e):
                        # Likely an empty repository, clone without branch flag
                        repo = git.Repo.clone_from(auth_url, tmpdir)
                    else:
                        raise

                # 2. Delete all tracked files from the temp directory (except .git)
                for item in os.listdir(tmpdir):
                    if item != ".git":
                        item_path = os.path.join(tmpdir, item)
                        if os.path.isdir(item_path):
                            import shutil

                            shutil.rmtree(item_path)
                        else:
                            os.remove(item_path)

                # 3. Fetch all files for this project from DB and write them to the temp directory
                from app.models.workspace import File, Folder

                # Build folder path lookup
                all_folders = (
                    self.db.query(Folder)
                    .filter(
                        Folder.project_id == project.id, Folder.deleted_at.is_(None)
                    )
                    .all()
                )
                folder_paths = {f.id: f.path for f in all_folders}

                # Fetch all files with content
                all_files = (
                    self.db.query(File)
                    .filter(File.project_id == project.id, File.deleted_at.is_(None))
                    .all()
                )

                for f in all_files:
                    if f.folder_id and f.folder_id in folder_paths:
                        rel_path = folder_paths[f.folder_id].strip("/")
                        full_folder_path = os.path.join(tmpdir, rel_path)
                    else:
                        full_folder_path = tmpdir

                    os.makedirs(full_folder_path, exist_ok=True)
                    file_path = os.path.join(full_folder_path, f.name)
                    with open(file_path, "w", encoding="utf-8") as out_f:
                        out_f.write(f.content or "")

                # 4. Git Add, Commit, Push
                repo.git.add(all=True)

                # Check if there are changes
                if not repo.is_dirty() and not repo.untracked_files:
                    return {"status": "success", "message": "No changes to commit"}

                # Configure git user (ideally use the actual user's name/email)
                user_email = (
                    project.owner.email if project.owner else "editor@hamara.com"
                )
                user_name = (
                    project.owner.first_name if project.owner else "Hamara Editor"
                )
                with repo.config_writer() as git_config:
                    git_config.set_value("user", "email", user_email)
                    git_config.set_value("user", "name", user_name)

                repo.index.commit(commit_message)

                origin = repo.remote(name="origin")

                # Push HEAD to the requested branch, setting upstream
                repo.git.push("--set-upstream", "origin", f"HEAD:{branch}")

                return {
                    "status": "success",
                    "message": f"Successfully pushed to {branch}",
                }

            except Exception as e:
                raise ValueError(f"Failed to push to repository: {str(e)}")
