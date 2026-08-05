import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

session = requests.Session()


def print_step(msg):
    print(f"\n--- {msg} ---")


def run_flow():
    # 1. Signup
    print_step("Signup")
    email = f"test_{int(time.time())}@example.com"
    res = session.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "first_name": "E2E",
            "last_name": "Test",
            "username": f"e2e_{int(time.time())}",
        },
    )
    print(res.status_code, res.text)
    assert res.status_code == 200, "Signup failed"

    # 2. Login
    print_step("Login")
    res = session.post(
        f"{BASE_URL}/auth/login", json={"email": email, "password": "Password123!"}
    )
    print(res.status_code, res.text)
    assert res.status_code == 200, "Login failed"
    token = res.json()["data"]["access_token"]
    session.cookies.set("access_token", token)

    # 3. Dashboard loads
    print_step("Dashboard loads")
    res = session.get(f"{BASE_URL}/projects")
    print(res.status_code)
    assert res.status_code == 200, "Get projects failed"

    # 4. Create Project
    print_step("Create Project")
    res = session.post(
        f"{BASE_URL}/projects",
        json={"name": "E2E Python Project", "language": "python"},
    )
    print(res.status_code, res.text)
    assert res.status_code == 201, "Create project failed"
    project_id = res.json()["data"]["id"]

    # 5. Open Project
    print_step("Open Project")
    res = session.get(f"{BASE_URL}/projects/{project_id}")
    print(res.status_code)
    assert res.status_code == 200, "Open project failed"

    # 6. Explorer loads
    print_step("Explorer loads")
    res = session.get(f"{BASE_URL}/workspace/projects/{project_id}/tree")
    print(res.status_code)
    assert res.status_code == 200, "Workspace tree failed"

    # 7. Create Folder
    print_step("Create Folder")
    res = session.post(
        f"{BASE_URL}/workspace/folders",
        json={"project_id": project_id, "name": "src", "parent_id": None},
    )
    print(res.status_code, res.text)
    assert res.status_code == 201, "Create folder failed"
    folder_id = res.json()["data"]["id"]

    # 8. Create File
    print_step("Create File")
    res = session.post(
        f"{BASE_URL}/workspace/files",
        json={"project_id": project_id, "name": "test.py", "parent_id": folder_id},
    )
    print(res.status_code, res.text)
    assert res.status_code == 201, "Create file failed"
    file_id = res.json()["data"]["id"]

    # 9. Rename File
    print_step("Rename File")
    res = session.put(f"{BASE_URL}/workspace/files/{file_id}", json={"name": "app.py"})
    print(res.status_code, res.text)
    assert res.status_code == 200, "Rename file failed"

    # 11. Duplicate File
    print_step("Duplicate File")
    res = session.post(f"{BASE_URL}/workspace/files/{file_id}/duplicate")
    print(res.status_code, res.text)
    assert res.status_code == 200, "Duplicate file failed"
    dup_file_id = res.json()["data"]["id"]

    # 10. Delete File
    print_step("Delete File")
    res = session.delete(f"{BASE_URL}/workspace/files/{dup_file_id}")
    print(res.status_code, res.text)
    assert res.status_code == 200, "Delete file failed"

    # 12. Edit code & Manual Save
    print_step("Edit code & Save")
    code = "print('Hello E2E')"
    res = session.post(
        f"{BASE_URL}/workspace/files/save",
        json={"id": file_id, "content": code, "expected_version": 1},
    )
    print(res.status_code, res.text)
    assert res.status_code == 200, "Save file failed"

    # 13. Run Code
    print_step("Run Code")
    res = session.post(
        f"{BASE_URL}/execution/run",
        json={"project_id": project_id, "language": "python", "file_id": file_id},
    )
    print(res.status_code, res.text)
    assert res.status_code == 200, "Run code failed"
    assert "Hello E2E" in res.json()["data"]["output"], "Execution output missing"

    # 14. Logout
    print_step("Logout")
    res = session.post(f"{BASE_URL}/auth/logout")
    print(res.status_code)
    assert res.status_code == 200, "Logout failed"

    # 15. Login again
    print_step("Login again")
    res = session.post(
        f"{BASE_URL}/auth/login", json={"email": email, "password": "Password123!"}
    )
    print(res.status_code)
    assert res.status_code == 200, "Login 2 failed"
    token = res.json()["data"]["access_token"]
    session.cookies.set("access_token", token)

    # 16. Project still exists
    print_step("Project still exists")
    res = session.get(f"{BASE_URL}/projects/{project_id}")
    print(res.status_code)
    assert res.status_code == 200, "Project persistence failed"
    assert res.json()["data"]["name"] == "E2E Python Project"

    print_step("ALL E2E TESTS PASSED")


if __name__ == "__main__":
    try:
        run_flow()
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)
