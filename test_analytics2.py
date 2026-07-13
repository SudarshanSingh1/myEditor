import requests

def test():
    login_data = {"email": "admin@myeditor.com", "password": "AdminPassword123!"}
    s = requests.Session()
    r = s.post("http://localhost:8000/api/v1/auth/login", json=login_data)
    print("Login:", r.status_code, r.text[:100])
    
    if r.status_code == 200:
        r2 = s.get("http://localhost:8000/api/v1/admin/analytics/master-timeline")
        print("Timeline:", r2.status_code, r2.text[:100])
        r3 = s.get("http://localhost:8000/api/v1/admin/analytics/languages")
        print("Languages:", r3.status_code, r3.text[:100])

test()
