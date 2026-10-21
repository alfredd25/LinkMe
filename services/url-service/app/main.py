import os
import secrets
import string
import urllib.parse # <-- Ensure this is imported

import httpx
import redis
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request, APIRouter
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator

from app.database import get_db, engine, Base
from app.models import Url

# --- Replace the old REDIS_URL line with this block ---
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_PASSWORD = urllib.parse.quote_plus(os.getenv("REDIS_PASSWORD", "")) if os.getenv("REDIS_PASSWORD") else ""

if REDIS_PASSWORD:
    REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"
else:
    REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

# Also update the Analytics URL to use internal Kubernetes DNS
ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL", "http://analytics-service.shrinklink.svc.cluster.local:8003")
REDIS_TTL = 86400  # 24 hours
# ------------------------------------------------------

app = FastAPI(title="URL Service", version="1.0.0")
router = APIRouter()
Instrumentator().instrument(app).expose(app)

# Auto-create tables for URL service
try:
    Base.metadata.create_all(bind=engine)
    print("[Database] URL Schema initialized.")
except Exception as e:
    print(f"[Database] Warning: {e}")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)

BASE62 = string.ascii_letters + string.digits



def generate_short_code(length: int = 7) -> str:
    return "".join(secrets.choice(BASE62) for _ in range(length))


# ── Schemas ──────────────────────────────────────────────────────────

class ShortenRequest(BaseModel):
    url: HttpUrl


class ShortenResponse(BaseModel):
    short_code: str
    short_url: str


# ── Background task ─────────────────────────────────────────────────

async def emit_click(url_id: str, referrer: str | None, user_agent: str | None):
    payload = {"url_id": url_id, "referrer": referrer, "user_agent": user_agent}
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            await client.post(f"{ANALYTICS_SERVICE_URL}/clicks", json=payload)
        except httpx.HTTPError:
            pass  # fire-and-forget; analytics is non-critical


# ── Endpoints ────────────────────────────────────────────────────────

@app.get("/healthz")
@router.get("/healthz")
def healthz():
    return {"status": "ok"}


# Mount to both / and /shorten on the router
@router.post("/", response_model=ShortenResponse, status_code=201)
@router.post("/shorten", response_model=ShortenResponse, status_code=201)
def shorten(body: ShortenRequest, request: Request, db: Session = Depends(get_db)):
    code = generate_short_code()
    # Retry on unlikely collision
    while db.query(Url).filter(Url.short_code == code).first():
        code = generate_short_code()

    url_row = Url(short_code=code, long_url=str(body.url))
    db.add(url_row)
    db.commit()
    db.refresh(url_row)

    # Pre-warm cache
    redis_client.setex(f"url:{code}", REDIS_TTL, str(body.url))

    base = str(request.base_url).rstrip("/")
    return ShortenResponse(short_code=code, short_url=f"{base}/{code}")


@router.get("/{code}")
async def redirect(code: str, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Check Redis
    long_url = redis_client.get(f"url:{code}")

    if not long_url:
        # 2. Fallback to PostgreSQL
        url_row = db.query(Url).filter(Url.short_code == code).first()
        if not url_row:
            raise HTTPException(status_code=404, detail="Short link not found")
        long_url = url_row.long_url
        redis_client.setex(f"url:{code}", REDIS_TTL, long_url)
        url_id = str(url_row.id)
    else:
        # Need url_id for analytics
        url_row = db.query(Url).filter(Url.short_code == code).first()
        url_id = str(url_row.id) if url_row else None

    # 3. Fire async analytics event
    if url_id:
        referrer = request.headers.get("referer")
        user_agent = request.headers.get("user-agent")
        background_tasks.add_task(emit_click, url_id, referrer, user_agent)

    # 4. Redirect
    return RedirectResponse(url=long_url, status_code=302)


# Include the populated router
app.include_router(router, prefix="/api/urls", tags=["urls"])
app.include_router(router, tags=["urls-root"])