# =============================================================================
# Analytics Service — Unit Tests
# =============================================================================
# Mocks Celery and uses in-memory SQLite for full isolation.
# =============================================================================
import uuid
from unittest.mock import MagicMock, patch

import pytest  # pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient  # pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, event  # pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker  # pyrefly: ignore [missing-import]

from app.database import Base, get_db


# ── In-memory SQLite ────────────────────────────────────────────────────────

SQLITE_URL = "sqlite://"
engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ── Mock Celery before import ───────────────────────────────────────────────

mock_celery = MagicMock()


@pytest.fixture(autouse=True)
def _patch_celery():
    with patch("app.main.celery_app", mock_celery):
        yield


@pytest.fixture(autouse=True)
def setup_db():
    from app.models import Url, Click
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    def _override():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    from app.main import app
    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_url():
    """Insert a URL row directly so click recording has a valid FK target."""
    from app.models import Url
    db = TestSession()
    url_id = uuid.uuid4()
    url = Url(id=url_id, short_code="abc1234", long_url="https://example.com")
    db.add(url)
    db.commit()
    db.close()
    return str(url_id)


# ── Tests ───────────────────────────────────────────────────────────────────

class TestHealthz:

    def test_healthz_returns_ok(self, client):
        resp = client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestRecordClick:

    def test_record_click_success(self, client, seeded_url):
        resp = client.post("/clicks", json={
            "url_id": seeded_url,
            "referrer": "https://twitter.com",
            "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
        })
        assert resp.status_code == 201
        assert resp.json()["status"] == "recorded"
        assert resp.json()["total_clicks"] >= 1

    def test_record_click_desktop_device(self, client, seeded_url):
        resp = client.post("/clicks", json={
            "url_id": seeded_url,
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        })
        assert resp.status_code == 201


class TestGetAnalytics:

    def test_analytics_for_existing_code(self, client, seeded_url):
        # Record some clicks first
        client.post("/clicks", json={"url_id": seeded_url, "user_agent": "Mobile Safari"})
        client.post("/clicks", json={"url_id": seeded_url, "user_agent": "Chrome Desktop"})

        resp = client.get("/analytics/abc1234")
        assert resp.status_code == 200
        data = resp.json()
        assert data["short_code"] == "abc1234"
        assert data["total_clicks"] >= 2
        assert "device_breakdown" in data

    def test_analytics_nonexistent_code(self, client):
        resp = client.get("/analytics/ZZZZZZZ")
        assert resp.status_code == 404
