import sys
import os
sys.path.insert(0, '/app')

from app.database.session import SessionLocal
from app.models.workspace import File, Folder

db = SessionLocal()
files = db.query(File).filter(File.name == None).all()
folders = db.query(Folder).filter(Folder.name == None).all()

print(f"Files with null name: {len(files)}")
for f in files:
    print(f"File ID: {f.id}")
print(f"Folders with null name: {len(folders)}")
for f in folders:
    print(f"Folder ID: {f.id}")

