import re

with open("backend/app/api/v1/admin.py", "r") as f:
    content = f.read()

endpoints = re.findall(r'@router\.(get|post|patch|delete|put)\("([^"]+)"', content)
for method, path in endpoints:
    print(f"{method.upper()} {path}")
