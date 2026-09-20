# =============================================================================
# Notification Service — Unit Tests
# =============================================================================
# Lightweight: the service only exposes /healthz and a Celery task.
# =============================================================================
import pytest  # pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient  # pyrefly: ignore [missing-import]

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


# ── Tests ───────────────────────────────────────────────────────────────────

class TestHealthz:

    def test_healthz_returns_ok(self, client):
        resp = client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestCeleryTask:
    """Verify the Celery task is importable and callable (no broker needed)."""

    def test_milestone_alert_returns_dict(self):
        from app.tasks import send_click_milestone_alert
        result = send_click_milestone_alert("test@example.com", "abc1234", 100)
        assert result["status"] == "sent"
        assert result["total_clicks"] == 100
        assert result["email"] == "test@example.com"
        assert result["code"] == "abc1234"
