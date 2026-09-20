# =============================================================================
# URL Service — Unit Tests
# =============================================================================
# Mocks Redis and uses in-memory SQLite so no external services are needed.
# =============================================================================
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


# ── Mock Redis before importing app (module-level side effects) ─────────────

mock_redis = MagicMock()
mock_redis.get.return_value = None
mock_redis.setex.return_value = True


@pytest.fixture(autouse=True)
def _patch_redis():
    with patch("app.main.redis_client", mock_redis):
        yield


@pytest.fixture(autouse=True)
def setup_db():
    from app.models import Url
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


# ── Tests ───────────────────────────────────────────────────────────────────

class TestHealthz:

    def test_healthz_returns_ok(self, client):
        resp = client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestShorten:

    def test_shorten_returns_short_code(self, client):
        resp = client.post("/shorten", json={"url": "https://example.com/very/long/path"})
        assert resp.status_code == 201
        data = resp.json()
        assert "short_code" in data
        assert "short_url" in data
        assert len(data["short_code"]) == 7

    def test_shorten_invalid_url(self, client):
        resp = client.post("/shorten", json={"url": "not-a-url"})
        assert resp.status_code == 422

    def test_shorten_caches_in_redis(self, client):
        mock_redis.reset_mock()
        resp = client.post("/shorten", json={"url": "https://cached.example.com"})
        assert resp.status_code == 201
        mock_redis.setex.assert_called_once()


class TestRedirect:

    def test_redirect_existing_code(self, client):
        # Create a short URL first
        create_resp = client.post("/shorten", json={"url": "https://target.example.com"})
        code = create_resp.json()["short_code"]

        # Follow redirect = False so we can inspect the 302
        resp = client.get(f"/{code}", follow_redirects=False)
        assert resp.status_code == 302
        assert "target.example.com" in resp.headers["location"]

    def test_redirect_nonexistent_code(self, client):
        resp = client.get("/ZZZZZZZ", follow_redirects=False)
        assert resp.status_code == 404
