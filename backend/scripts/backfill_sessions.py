#!/usr/bin/env python3
"""
One-shot migration: backfill user_sessions.device_type / browser / os
from the stored user_agent string for all rows that have "Other" or NULL.

Run from inside the backend container or venv:
  cd /path/to/backend
  python scripts/backfill_sessions.py
"""

import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import engine
from sqlalchemy.orm import Session
from app.models.user_session import UserSession
from user_agents import parse


def _clean(val: str):
    return val if val and val.lower() not in ("other", "", "none") else None


def _detect_device(ua) -> str:
    raw = ua.device.family
    if raw != "Other":
        return raw
    if ua.is_mobile:
        return "Mobile"
    if ua.is_tablet:
        return "Tablet"
    if ua.is_bot:
        return "Bot"
    return "Desktop"


with Session(engine) as db:
    sessions = (
        db.query(UserSession)
        .filter(
            (UserSession.device_type == "Other")
            | (UserSession.browser == "Other")
            | (UserSession.os == "Other")
            | (UserSession.device_type == None)
            | (UserSession.browser == None)
            | (UserSession.os == None)
        )
        .all()
    )

    print(f"Found {len(sessions)} sessions to backfill...")
    updated = 0

    for s in sessions:
        raw_ua = s.user_agent or ""
        if not raw_ua or raw_ua == "Unknown":
            continue
        ua = parse(raw_ua)
        s.device_type = _detect_device(ua)
        s.browser = _clean(ua.browser.family) or "Unknown"
        s.os = _clean(ua.os.family) or "Unknown"
        updated += 1

    db.commit()
    print(f"Done. Updated {updated} sessions.")
