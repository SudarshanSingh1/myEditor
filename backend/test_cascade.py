import sys
import uuid
from app.database.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.workspace import File, FileVersion, Folder
from app.models.audit_log import AuditLog

db = SessionLocal()

u = db.query(User).filter(User.username == "cascade_test").first()
if u:
    try:
        db.delete(u)
        db.commit()
    except:
        db.rollback()

u = User(username="cascade_test", email="cascade@test.com", password_hash="hash")
db.add(u)
db.commit()

p = Project(name="proj", slug="proj-1234", owner_id=u.id)
db.add(p)
db.commit()

fo = Folder(name="folder", project_id=p.id, path="/folder")
db.add(fo)
db.commit()

fi = File(name="file", project_id=p.id, folder_id=fo.id)
db.add(fi)
db.commit()

fv = FileVersion(file_id=fi.id, version_number=1, created_by=u.id)
db.add(fv)
db.commit()

al = AuditLog(user_id=u.id, action="TEST")
db.add(al)
db.commit()

print("Attempting to delete user...")
try:
    db.delete(u)
    db.commit()
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()

