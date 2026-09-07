import os
import re

from celery import Celery
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Click, Url

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = FastAPI(title="Analytics Service", version="1.0.0")

celery_app = Celery("notifications", broker=REDIS_URL)


# ── Helpers ──────────────────────────────────────────────────────────

_MOBILE_RE = re.compile(r"(mobile|android|iphone|ipad|ipod)", re.IGNORECASE)


def detect_device(user_agent: str | None) -> str:
    if not user_agent:
        return "unknown"
    return "mobile" if _MOBILE_RE.search(user_agent) else "desktop"


# ── Schemas ──────────────────────────────────────────────────────────

class ClickIn(BaseModel):
    url_id: str
    referrer: str | None = None
    user_agent: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────

@app.post("/clicks", status_code=201)
def record_click(body: ClickIn, db: Session = Depends(get_db)):
    click = Click(
        url_id=body.url_id,
        referrer=body.referrer,
        device_type=detect_device(body.user_agent),
    )
    db.add(click)
    db.commit()

    # Check milestone
    total = db.query(func.count(Click.id)).filter(Click.url_id == body.url_id).scalar()
    if total and total % 50 == 0:
        # Look up owner email (best-effort)
        url_row = db.query(Url).filter(Url.id == body.url_id).first()
        code = url_row.short_code if url_row else "unknown"
        celery_app.send_task(
            "app.tasks.send_click_milestone_alert",
            args=["owner@example.com", code, total],
        )

    return {"status": "recorded", "total_clicks": total}


@app.get("/analytics/{code}")
def get_analytics(code: str, db: Session = Depends(get_db)):
    url_row = db.query(Url).filter(Url.short_code == code).first()
    if not url_row:
        raise HTTPException(status_code=404, detail="Short code not found")

    total = db.query(func.count(Click.id)).filter(Click.url_id == url_row.id).scalar()

    device_rows = (
        db.query(Click.device_type, func.count(Click.id))
        .filter(Click.url_id == url_row.id)
        .group_by(Click.device_type)
        .all()
    )
    device_breakdown = {dtype or "unknown": count for dtype, count in device_rows}

    referrer_rows = (
        db.query(Click.referrer, func.count(Click.id))
        .filter(Click.url_id == url_row.id)
        .group_by(Click.referrer)
        .all()
    )
    referrer_counts = {ref or "direct": count for ref, count in referrer_rows}

    return {
        "short_code": code,
        "long_url": url_row.long_url,
        "total_clicks": total,
        "device_breakdown": device_breakdown,
        "referrer_counts": referrer_counts,
    }


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
