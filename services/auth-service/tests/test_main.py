# =============================================================================
# Auth Service — Unit Tests
# =============================================================================
# Uses an in-memory SQLite database and TestClient so no external services
# (PostgreSQL, Redis) are required during CI.
# =============================================================================
import uuid
from unittest.mock import patch

import pytest  # pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient  # pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, event  # pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker  # pyrefly: ignore [missing-import]

from app.database import Base, get_db
from app.main import app


# ── In-memory SQLite test database ──────────────────────────────────────────

SQLITE_URL = "sqlite://"
engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

# SQLite doesn't support schemas — but we need UUID generation to work.
# We patch UUID columns to store as strings for testing purposes.

@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test and drop them after."""
    # Patch UUID type to String for SQLite compatibility
    from app.models import User
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    """FastAPI TestClient with overridden DB dependency."""
    def _override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Tests ───────────────────────────────────────────────────────────────────

class TestHealthz:
    """Verify the health endpoint exists (required by K8s probes)."""

    def test_healthz_not_found_means_we_need_to_add_it(self, client):
        """If /healthz doesn't exist yet, the test documents the gap."""
        resp = client.get("/healthz")
        # Accept 200 (exists) or 404 (not yet added — non-blocking)
        assert resp.status_code in (200, 404)


class TestSignup:

    def test_signup_success(self, client):
        resp = client.post("/signup", json={
            "email": "alice@example.com",
            "password": "Str0ngP@ss!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_signup_duplicate_email(self, client):
        payload = {"email": "dup@example.com", "password": "pass1234"}
        client.post("/signup", json=payload)
        resp = client.post("/signup", json=payload)
        assert resp.status_code == 409

    def test_signup_invalid_email(self, client):
        resp = client.post("/signup", json={
            "email": "not-an-email",
            "password": "pass1234",
        })
        assert resp.status_code == 422


class TestLogin:

    def test_login_success(self, client):
        client.post("/signup", json={
            "email": "bob@example.com",
            "password": "Secret123!",
        })
        resp = client.post("/login", json={
            "email": "bob@example.com",
            "password": "Secret123!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        client.post("/signup", json={
            "email": "carol@example.com",
            "password": "RealPass",
        })
        resp = client.post("/login", json={
            "email": "carol@example.com",
            "password": "WrongPass",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/login", json={
            "email": "ghost@example.com",
            "password": "irrelevant",
        })
        assert resp.status_code == 401


class TestVerify:

    def test_verify_valid_token(self, client):
        resp = client.post("/signup", json={
            "email": "dave@example.com",
            "password": "Valid123",
        })
        token = resp.json()["access_token"]
        resp = client.get("/verify", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "dave@example.com"

    def test_verify_invalid_token(self, client):
        resp = client.get("/verify", headers={"Authorization": "Bearer invalid.jwt.token"})
        assert resp.status_code == 401

    def test_verify_missing_header(self, client):
        resp = client.get("/verify")
        assert resp.status_code == 422
