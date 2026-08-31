import httpx
from typing import List, Dict, Any


class GitHubService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github.v3+json",
        }
        self.base_url = "https://api.github.com"

    async def get_user(self) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/user", headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_repo(self, owner_repo: str) -> Dict[str, Any]:
        """Fetch repository metadata by 'owner/repo'. Raises on 404/403."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/repos/{owner_repo}", headers=self.headers
            )
            response.raise_for_status()
            return response.json()

    async def list_repositories(
        self, sort: str = "updated", per_page: int = 100
    ) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/user/repos",
                params={"sort": sort, "per_page": per_page, "affiliation": "owner,collaborator,organization_member"},
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def create_repository(
        self, name: str, description: str = "", private: bool = True
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/user/repos",
                json={"name": name, "description": description, "private": private},
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def search_repositories(self, query: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/search/repositories",
                params={"q": f"{query} user:@me"},
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()
