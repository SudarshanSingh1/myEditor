import pytest
from app.models.language_content import LanguageContent
import uuid

def test_seo_language_endpoint(client, db_session):
    # 1. Non-existent slug
    resp = client.get("/api/v1/seo/language/unknown-python")
    assert resp.status_code == 404
    
    # 2. Existing slug
    content = LanguageContent(
        id=uuid.uuid4(),
        language_id="python3",
        slug="python-compiler",
        meta_title="Python Online Compiler",
        meta_description="Run python online",
        h1_heading="Python Compiler",
        features=[{"title": "Fast", "description": "Very fast"}],
        starter_code="print('Hello World')",
        starter_file_name="main.py"
    )
    db_session.add(content)
    db_session.commit()
    
    resp = client.get("/api/v1/seo/language/python-compiler")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "python-compiler"
    assert data["language_id"] == "python3"
    assert data["meta_title"] == "Python Online Compiler"
    assert data["features"][0]["title"] == "Fast"
