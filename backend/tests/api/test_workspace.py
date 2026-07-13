import pytest
from fastapi.testclient import TestClient

import uuid

@pytest.fixture
def workspace_user_token(client: TestClient) -> str:
    unique_id = str(uuid.uuid4())[:8]
    payload = {
        "first_name": "Workspace",
        "last_name": "User",
        "username": f"workspace_{unique_id}",
        "email": f"workspace_{unique_id}@example.com",
        "password": "Password123!"
    }
    client.post("/api/v1/auth/register", json=payload)
    login_resp = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": "Password123!"})
    return login_resp.json()["data"]["access_token"]

@pytest.fixture
def project_id(client: TestClient, workspace_user_token: str) -> str:
    cookies = {"access_token": workspace_user_token}
    response = client.post(
        "/api/v1/projects",
        cookies=cookies,
        json={
            "name": "Workspace Test Project",
            "visibility": "PRIVATE"
        }
    )
    return response.json()["data"]["id"]

def test_create_and_get_folder(client: TestClient, workspace_user_token: str, project_id: str):
    cookies = {"access_token": workspace_user_token}
    
    # Create
    res = client.post(
        "/api/v1/workspace/folders",
        cookies=cookies,
        json={"name": "src", "project_id": project_id}
    )
    assert res.status_code == 201, res.text
    folder_id = res.json()["data"]["id"]
    
    # Check tree
    tree_res = client.get(f"/api/v1/workspace/projects/{project_id}/tree", cookies=cookies)
    assert tree_res.status_code == 200
    tree_data = tree_res.json()["data"]
    assert len(tree_data["folders"]) == 1
    assert tree_data["folders"][0]["name"] == "src"
    
    return folder_id

def test_create_file(client: TestClient, workspace_user_token: str, project_id: str):
    cookies = {"access_token": workspace_user_token}
    
    # Create folder first
    res = client.post(
        "/api/v1/workspace/folders",
        cookies=cookies,
        json={"name": "components", "project_id": project_id}
    )
    assert res.status_code == 201, res.text
    folder_id = res.json()["data"]["id"]
    
    # Create file inside folder
    f_res = client.post(
        "/api/v1/workspace/files",
        cookies=cookies,
        json={
            "name": "Button.tsx",
            "project_id": project_id,
            "folder_id": folder_id,
            "content": "export const Button = () => <button/>;"
        }
    )
    assert f_res.status_code == 201
    file_id = f_res.json()["data"]["id"]
    
    # Check tree
    tree_res = client.get(f"/api/v1/workspace/projects/{project_id}/tree", cookies=cookies)
    tree_data = tree_res.json()["data"]
    
    # Finding folder in tree
    folder = next((f for f in tree_data["folders"] if f["id"] == folder_id), None)
    assert folder is not None
    assert len(folder["files"]) == 1
    assert folder["files"][0]["name"] == "Button.tsx"

def test_duplicate_and_delete_file(client: TestClient, workspace_user_token: str, project_id: str):
    cookies = {"access_token": workspace_user_token}
    
    f_res = client.post(
        "/api/v1/workspace/files",
        cookies=cookies,
        json={
            "name": "utils.ts",
            "project_id": project_id
        }
    )
    assert f_res.status_code == 201, f_res.text
    file_id = f_res.json()["data"]["id"]
    
    # Duplicate
    dup_res = client.post(f"/api/v1/workspace/files/{file_id}/duplicate", cookies=cookies)
    assert dup_res.status_code == 200
    assert dup_res.json()["data"]["name"] == "utils copy.ts"
    
    # Delete original
    del_res = client.delete(f"/api/v1/workspace/files/{file_id}", cookies=cookies)
    assert del_res.status_code == 200
    
    # Check tree
    tree_res = client.get(f"/api/v1/workspace/projects/{project_id}/tree", cookies=cookies)
    tree_files = tree_res.json()["data"]["files"]
    names = [f["name"] for f in tree_files]
    assert "utils.ts" not in names
    assert "utils copy.ts" in names

def test_rename_folder_and_cascade_soft_delete(client: TestClient, workspace_user_token: str, project_id: str):
    cookies = {"access_token": workspace_user_token}
    
    res = client.post(
        "/api/v1/workspace/folders",
        cookies=cookies,
        json={"name": "to_delete", "project_id": project_id}
    )
    assert res.status_code == 201, res.text
    folder_id = res.json()["data"]["id"]
    
    res_child = client.post(
        "/api/v1/workspace/folders",
        cookies=cookies,
        json={"name": "child", "project_id": project_id, "parent_id": folder_id}
    )
    child_id = res_child.json()["data"]["id"]
    
    client.post(
        "/api/v1/workspace/files",
        cookies=cookies,
        json={"name": "test.txt", "project_id": project_id, "folder_id": child_id}
    )
    
    # Rename
    ren_res = client.put(
        f"/api/v1/workspace/folders/{folder_id}",
        cookies=cookies,
        json={"name": "renamed"}
    )
    assert ren_res.status_code == 200, ren_res.text
    
    # Delete parent
    del_res = client.delete(f"/api/v1/workspace/folders/{folder_id}", cookies=cookies)
    assert del_res.status_code == 200
    
    # Tree should be completely empty of these
    tree_res = client.get(f"/api/v1/workspace/projects/{project_id}/tree", cookies=cookies)
    tree_data = tree_res.json()["data"]
    
    def find_folder(folders, target_id):
        for f in folders:
            if f["id"] == target_id: return f
            res = find_folder(f["children"], target_id)
            if res: return res
        return None
        
    assert find_folder(tree_data["folders"], folder_id) is None
    assert find_folder(tree_data["folders"], child_id) is None
