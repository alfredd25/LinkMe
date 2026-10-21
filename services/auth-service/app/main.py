from fastapi import FastAPI, Depends, HTTPException, Header, APIRouter
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db, engine, Base
from app.models import User  # <-- This is the missing line
from app.security import hash_password, verify_password, create_access_token, decode_access_token
app = FastAPI(title="Auth Service", version="1.0.0")
router = APIRouter()

# Auto-create tables on startup if they don't exist
try:
    Base.metadata.create_all(bind=engine)
    print("[Database] Schema tables initialized successfully.")
except Exception as e:
    print(f"[Database] Warning: could not initialize tables: {e}")


# ── Schemas ──────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Health Endpoints ──────────────────────────────────────────────────

@app.get("/healthz")
@router.get("/healthz")
def healthz():
    return {"status": "ok"}


# ── Auth Endpoints ────────────────────────────────────────────────────

# Accept either /signup or /register for compatibility
@router.post("/signup", response_model=TokenResponse, status_code=201)
@router.post("/register", response_model=TokenResponse, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


# Accept /login or /token
@router.post("/login", response_model=TokenResponse)
@router.post("/token", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


@router.get("/verify")
def verify(authorization: str = Header(...)):
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {"user_id": payload["sub"], "email": payload["email"]}


# Mount router to handle both /api/auth/* (from Ingress) and /* (direct/local)
app.include_router(router, prefix="/api/auth", tags=["auth"])
app.include_router(router, tags=["auth-root"])