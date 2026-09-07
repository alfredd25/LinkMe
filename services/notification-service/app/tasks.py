import logging
import os

# pyrefly: ignore [missing-import]
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("notifications", broker=REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

logger = logging.getLogger("notification-service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


@celery_app.task(name="app.tasks.send_click_milestone_alert")
def send_click_milestone_alert(email: str, code: str, total_clicks: int) -> dict:
    """Log a milestone notification to stdout (swap with real email/webhook in prod)."""
    logger.info(
        "🎉 MILESTONE ALERT → email=%s | short_code=%s | total_clicks=%d",
        email,
        code,
        total_clicks,
    )
    return {"email": email, "code": code, "total_clicks": total_clicks, "status": "sent"}
