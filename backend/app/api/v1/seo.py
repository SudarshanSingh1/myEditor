from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.dependencies.database import get_db
from app.models.language_content import LanguageContent
from typing import Dict, Any

router = APIRouter()

@router.get("/language/{slug}")
def get_language_seo_data(slug: str, db: Session = Depends(get_db)):
    """Fetch programmatic SEO data for a specific language compiler landing page."""
    
    # Query database
    content = db.query(LanguageContent).filter(LanguageContent.slug == slug).first()
    
    if not content:
        # Fallback to defaults or return 404
        # In a real system, you might want to auto-generate or use a template
        # Here we'll just throw a 404 for demonstration, though the frontend might have fallbacks
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Language content not found"
        )
        
    return {
        "slug": content.slug,
        "language_id": content.language_id,
        "meta_title": content.meta_title,
        "meta_description": content.meta_description,
        "meta_keywords": content.meta_keywords,
        "h1_heading": content.h1_heading,
        "h2_subheading": content.h2_subheading,
        "hero_description": content.hero_description,
        "about_content": content.about_content,
        "features": content.features or [],
        "faq": content.faq or [],
        "starter_code": content.starter_code,
        "starter_file_name": content.starter_file_name
    }
