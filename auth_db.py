"""SQLAlchemy models, password hashing (PBKDF2), JWT auth, roles and audit log."""
import hashlib, hmac, os, secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'terrafore.db'}")
# DEV DEFAULT ONLY - set JWT_SECRET in the environment for anything beyond a local demo.
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me-0123456789")
JWT_HOURS = 8

ROLES = ("LAND_ACQUISITION_OFFICER", "PROJECT_AUTHORITY", "ADMINISTRATOR")
SIGNUP_ROLES = ("LAND_ACQUISITION_OFFICER", "PROJECT_AUTHORITY")
DEMO_PASSWORD = "Demo@1234"
DEMO_USERS = [
    ("Demo Administrator", "admin@terrafore.demo", "ADMINISTRATOR"),
    ("Demo Land Acquisition Officer", "officer@terrafore.demo", "LAND_ACQUISITION_OFFICER"),
    ("Demo Project Authority", "authority@terrafore.demo", "PROJECT_AUTHORITY"),
]

_kw = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
db_engine = create_engine(DATABASE_URL, **_kw)
SessionLocal = sessionmaker(bind=db_engine, expire_on_commit=False)


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(300))
    role: Mapped[str] = mapped_column(String(40))
    state_jurisdiction: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=now)


class AlertState(Base):
    __tablename__ = "alert_state"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_key: Mapped[str] = mapped_column(String(80), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="ACKNOWLEDGED")


class OutcomeRecord(Base):  # Phase 7 (continuous learning demo)
    __tablename__ = "outcomes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[str] = mapped_column(String(20), index=True)
    delayed: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=now)


class ModelVersion(Base):  # Phase 7
    __tablename__ = "model_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    path: Mapped[str] = mapped_column(String(200))
    roc_auc: Mapped[str] = mapped_column(String(20))
    active: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


# ------------------------------------------------------------ passwords
def hash_password(pw: str, iterations: int = 200_000) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), iterations).hex()
    return f"pbkdf2_sha256${iterations}${salt}${dk}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        _, it, salt, dk = stored.split("$")
        cand = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), int(it)).hex()
        return hmac.compare_digest(cand, dk)
    except Exception:
        return False


def init_db():
    Base.metadata.create_all(db_engine)
    with SessionLocal() as s:
        for name, email, role in DEMO_USERS:
            if not s.scalar(select(User).where(User.email == email)):
                s.add(User(name=name, email=email, password_hash=hash_password(DEMO_PASSWORD), role=role))
        s.commit()


# ------------------------------------------------------------ jwt / deps
def create_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_HOURS)
    return jwt.encode({"sub": str(user.id), "role": user.role, "exp": exp}, JWT_SECRET, algorithm="HS256")


def get_db():
    with SessionLocal() as s:
        yield s


_bearer = HTTPBearer(auto_error=False)


def current_user(cred: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)) -> User:
    if not cred:
        raise HTTPException(401, "Authentication required.", headers={"WWW-Authenticate": "Bearer"})
    try:
        data = jwt.decode(cred.credentials, JWT_SECRET, algorithms=["HS256"])
        user = db.get(User, int(data["sub"]))
    except Exception:
        raise HTTPException(401, "Invalid or expired token.", headers={"WWW-Authenticate": "Bearer"})
    if not user:
        raise HTTPException(401, "User no longer exists.")
    return user


def require_roles(*roles):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Your role does not have permission for this action.")
        return user
    return dep


def audit(db: Session, user, action: str, detail: str = ""):
    db.add(AuditLog(user_id=getattr(user, "id", None), action=action, detail=detail[:500]))
    db.commit()


def user_dict(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
            "state_jurisdiction": u.state_jurisdiction, "created_at": u.created_at.isoformat()}
