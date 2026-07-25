import os
import re

admin_file = "app/api/v1/admin.py"
out_dir = "app/api/v1/admin"

with open(admin_file, "r") as f:
    lines = f.readlines()

imports = []
schemas = []
sections = {}
current_section = None
current_content = []

for i, line in enumerate(lines):
    if i < 38:
        imports.append(line)
        continue
        
    if line.startswith("# --- Schemas ---"):
        current_section = "schemas"
        continue
    elif line.startswith("# --- Dashboard & Stats ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "dashboard"
        current_content = [line]
        continue
    elif line.startswith("# --- Analytics ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "analytics"
        current_content = [line]
        continue
    elif line.startswith("# --- Platform Analytics Center ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "platform_analytics"
        current_content = [line]
        continue
    elif line.startswith("# --- Users ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "users"
        current_content = [line]
        continue
    elif line.startswith("# --- Projects ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "projects"
        current_content = [line]
        continue
    elif line.startswith("# --- Executions ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "executions"
        current_content = [line]
        continue
    elif line.startswith("# --- System Settings ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "system"
        current_content = [line]
        continue
    elif line.startswith("# --- Platform Control Center ---"):
        if current_section:
            sections[current_section] = current_content
        current_section = "platform_control"
        current_content = [line]
        continue
        
    if current_section == "schemas":
        schemas.append(line)
    elif current_section:
        current_content.append(line)

if current_section:
    sections[current_section] = current_content

# Post-process platform_control into identity, security, server, github
platform = sections.pop("platform_control", [])
sections["identity"] = []
sections["security"] = []
sections["server"] = []
sections["github"] = []

sub_section = None
for line in platform:
    if "# 1. Identity & Auth Center" in line:
        sub_section = "identity"
    elif "# 2. Security Center" in line:
        sub_section = "security"
    elif "# 3. Infra Monitoring Additions" in line:
        sub_section = "server"
    elif "# 4. GitHub Admin" in line:
        sub_section = "github"
        
    if sub_section == "identity": sections["identity"].append(line)
    elif sub_section == "security": sections["security"].append(line)
    elif sub_section == "server": sections["server"].append(line)
    elif sub_section == "github": sections["github"].append(line)
    else: sections["identity"].append(line)

with open(os.path.join(out_dir, "schemas.py"), "w") as f:
    f.write("from pydantic import BaseModel, EmailStr\n")
    f.write("from typing import Optional, List, Dict, Any\n")
    f.write("from datetime import datetime\n")
    f.write("import uuid\n")
    f.write("from app.models.user import RoleEnum, StatusEnum\n\n")
    f.writelines(schemas)

def write_module(name, content):
    with open(os.path.join(out_dir, f"{name}.py"), "w") as f:
        for imp in imports:
            if imp.startswith("router = APIRouter"): continue
            f.write(imp)
        f.write("\nfrom .schemas import *\n\n")
        f.write(f"router = APIRouter()\n\n")
        f.writelines(content)

for name, content in sections.items():
    if name != "schemas":
        write_module(name, content)

print("Split completed successfully!")
