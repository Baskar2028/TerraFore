"""TerraFore API (FastAPI). All data is SYNTHETIC - prototype only.

Public : GET /, GET /health
Auth   : /api/v1/auth/*
Data   : POST /predict, POST /predict/batch, /api/v1/* (JWT required)
"""
import csv
import io
import os
import re
from typing import Literal

from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import Body, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

import engine as E
from auth_db import (AlertState, AuditLog, ModelVersion, OutcomeRecord, SessionLocal, ROLES, SIGNUP_ROLES, User, audit, create_token, current_user, get_db,
                     hash_password, init_db, require_roles, user_dict, verify_password)
from engine import (ProjectInput, factor_mapping, get_priority, model, preprocessor, recommendation_mapping,  # noqa: F401
                    MODEL_PATH)

init_db()

app = FastAPI(title="TerraFore API", description="Land Acquisition Delay Risk Prediction API (synthetic-data prototype)",
              version="2.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=[], allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"],
)

OFFICER, AUTHORITY, ADMIN = ROLES[0], ROLES[1], ROLES[2]
STATES = sorted(E.DATA.state.unique().tolist())
TYPES = sorted(E.DATA.project_type.unique().tolist())


# ================================================================ public
@app.get("/")
def home():
    return {"status": "online", "service": "TerraFore API", "version": app.version}


@app.get("/health")
def health():
    return {"status": "healthy", "service": "TerraFore API", "model_loaded": model is not None,
            "model_path": MODEL_PATH.name, "projects_loaded": int(len(E.PROJ)), "data": "synthetic"}


# ================================================================ auth
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=200)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["LAND_ACQUISITION_OFFICER", "PROJECT_AUTHORITY"]  # ADMINISTRATOR is seeded only
    state_jurisdiction: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


@app.post("/api/v1/auth/signup", status_code=201)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "Enter a valid email address.")
    if body.role not in SIGNUP_ROLES:
        raise HTTPException(403, "This role cannot be created through signup.")
    if body.state_jurisdiction and body.state_jurisdiction not in STATES:
        raise HTTPException(422, "Unknown state.")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists.")
    u = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role=body.role,
             state_jurisdiction=body.state_jurisdiction or None)
    db.add(u); db.commit()
    audit(db, u, "SIGNUP", f"role={u.role}")
    return {"token": create_token(u), "user": user_dict(u)}


@app.post("/api/v1/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not u or not verify_password(body.password, u.password_hash):
        audit(db, None, "LOGIN_FAILED", body.email[:100])
        raise HTTPException(401, "Incorrect email or password.")
    audit(db, u, "LOGIN")
    return {"token": create_token(u), "token_type": "bearer", "expires_in_hours": 8, "user": user_dict(u)}


@app.get("/api/v1/auth/me")
def me(user: User = Depends(current_user)):
    return user_dict(user)


@app.post("/api/v1/auth/logout")
def logout(user: User = Depends(current_user), db: Session = Depends(get_db)):
    audit(db, user, "LOGOUT")
    return {"status": "logged_out", "note": "Client discards the token."}


# ================================================================ helpers
def scoped(user: User) -> pd.DataFrame:
    df = E.PROJ
    return df[df.state == user.state_jurisdiction] if user.state_jurisdiction else df


def forest_pending_mask(df):
    return df.forest_land_involved & df.forest_clearance_status.isin(["Pending", "Under Review"])


def list_row(r) -> dict:
    return {"project_id": r.project_id, "project_name": r.project_name, "project_type": r.project_type,
            "state": r.state, "district": r.district, "latitude": float(r.latitude), "longitude": float(r.longitude),
            "risk_score": int(r.risk_score), "risk_level": r.risk_level, "delay_probability": float(r.delay_probability),
            "dominant_driver": r.dominant_driver, "forest_clearance_status": r.forest_clearance_status,
            "forest_clearance_pending": bool(r.forest_land_involved and r.forest_clearance_status in ("Pending", "Under Review")),
            "planned_completion_date": r.planned_completion_date}


def filtered(user, risk=None, state=None, project_type=None, district=None, search=None, forest_pending=None, sort="risk_desc"):
    df = scoped(user)
    if risk: df = df[df.risk_level == risk.upper()]
    if state: df = df[df.state == state]
    if project_type: df = df[df.project_type == project_type]
    if district: df = df[df.district.str.contains(district, case=False, regex=False)]
    if search:
        m = df.project_id.str.contains(search, case=False, regex=False) | df.project_name.str.contains(search, case=False, regex=False)
        df = df[m]
    if forest_pending: df = df[forest_pending_mask(df)]
    keys = {"risk_desc": (["delay_probability", "project_id"], [False, True]),
            "risk_asc": (["delay_probability", "project_id"], [True, True]),
            "deadline": (["days_to_deadline", "project_id"], [True, True]),
            "id": (["project_id"], [True])}
    by, asc = keys.get(sort, keys["risk_desc"])
    return df.sort_values(by, ascending=asc, kind="stable")


def project_inputs(r) -> dict:
    d = {k: r[k] for k in E.INPUT_FIELDS}
    for k in ("land_area_acres",): d[k] = float(d[k])
    d["affected_families"] = int(d["affected_families"]); d["legal_disputes"] = int(d["legal_disputes"])
    for k in E.COMPLETION_LEVERS: d[k] = float(d[k])
    return d


# ================================================================ predict
@app.post("/predict")
def predict(project: ProjectInput, project_id: str | None = Query(None, description="Optional registered project ID for compliance data"),
            user: User = Depends(current_user), db: Session = Depends(get_db)):
    res = E.predict_full(project.model_dump(), project_id)
    audit(db, user, "PREDICT", f"score={res['risk_score']} level={res['risk_level']} state={project.state}")
    return res


@app.post("/predict/batch")
def predict_batch(items: list[ProjectInput] = Body(..., max_length=500), user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    if not items:
        raise HTTPException(422, "Provide at least one project.")
    rows = [i.model_dump() for i in items]
    df = pd.DataFrame(rows)
    probs = E.proba(df); sh = E.shap_for(df)
    out = []
    for i, (p, pr) in enumerate(zip(rows, probs)):
        f = E.key_factors_for(sh[i], p)
        out.append({"prediction": "DELAYED" if pr >= 0.5 else "NOT DELAYED", "delay_probability": round(float(pr) * 100, 2),
                    "risk_level": E.risk_level(float(pr)), "risk_score": int(round(float(pr) * 100)),
                    "key_factors": f, "priority_actions": E.priority_actions_for(f)})
    audit(db, user, "PREDICT_BATCH", f"n={len(rows)}")
    return out


# ================================================================ v1 data
def stats_for(df: pd.DataFrame) -> dict:
    n = len(df)
    if n == 0:
        return {"total_projects": 0, "risk_levels": {}, "empty": True}
    lv = df.risk_level.value_counts()
    levels = {k: {"count": int(lv.get(k, 0)), "pct": round(float(lv.get(k, 0)) / n * 100, 1)} for k in ("LOW", "MEDIUM", "HIGH")}
    grp = lambda col: [{"name": k, "count": int(len(g)), "avg_delay_probability": round(float(g.delay_probability.mean()), 1),
                        "high_risk": int((g.risk_level == "HIGH").sum())} for k, g in df.groupby(col)]
    drivers = df.dominant_driver.value_counts()
    top_d = df[df.risk_level == "HIGH"].district.value_counts().head(10)
    return {
        "total_projects": n, "risk_levels": levels,
        "avg_delay_probability": round(float(df.delay_probability.mean()), 1),
        "high_risk_count": levels["HIGH"]["count"],
        "forest_clearance_pending": int(forest_pending_mask(df).sum()),
        "by_state": sorted(grp("state"), key=lambda x: -x["avg_delay_probability"]),
        "by_project_type": sorted(grp("project_type"), key=lambda x: -x["avg_delay_probability"]),
        "by_driver": [{"name": k, "count": int(v)} for k, v in drivers.items()],
        "by_notification_year": sorted([{"year": int(k), **{a: b for a, b in x.items() if a != "name"}} for x in grp("notification_year") for k in [x["name"]]], key=lambda x: x["year"]),
        "top_districts_high_risk": [{"name": k, "high_risk": int(v)} for k, v in top_d.items()],
        "note": "Distribution reflects the synthetic dataset.", "data": "synthetic",
    }


@app.get("/api/v1/stats")
def stats(user: User = Depends(current_user)):
    return {**stats_for(scoped(user)), "jurisdiction": user.state_jurisdiction}


@app.get("/api/v1/projects")
def projects(risk: str | None = None, state: str | None = None, project_type: str | None = None, district: str | None = None,
             search: str | None = None, forest_pending: bool | None = None, sort: str = "risk_desc",
             page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100), user: User = Depends(current_user)):
    df = filtered(user, risk, state, project_type, district, search, forest_pending, sort)
    total = len(df); s = (page - 1) * page_size
    return {"total": total, "page": page, "page_size": page_size, "pages": max(1, -(-total // page_size)),
            "items": [list_row(r) for r in df.iloc[s:s + page_size].itertuples()]}


@app.get("/api/v1/projects/export")
def export_projects(risk: str | None = None, state: str | None = None, project_type: str | None = None,
                    district: str | None = None, search: str | None = None, forest_pending: bool | None = None,
                    sort: str = "risk_desc", user: User = Depends(require_roles(AUTHORITY, ADMIN)),
                    db: Session = Depends(get_db)):
    df = filtered(user, risk, state, project_type, district, search, forest_pending, sort)
    buf = io.StringIO(); w = csv.writer(buf)
    cols = ["project_id", "project_name", "project_type", "state", "district", "risk_score", "risk_level",
            "delay_probability", "dominant_driver", "forest_clearance_status", "planned_completion_date"]
    w.writerow(cols)
    for r in df.itertuples():
        w.writerow([getattr(r, c) for c in cols])
    audit(db, user, "EXPORT_CSV", f"rows={len(df)}")
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=terrafore_projects_synthetic.csv"})


@app.get("/api/v1/projects/{project_id}")
def project_detail(project_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if project_id not in E.IDX:
        raise HTTPException(404, "Project not found.")
    r = E.PROJ.iloc[E.IDX[project_id]]
    if user.state_jurisdiction and r.state != user.state_jurisdiction:
        raise HTTPException(403, "Project is outside your state jurisdiction.")
    inputs = project_inputs(r)
    res = E.predict_full(inputs, project_id)
    audit(db, user, "VIEW_PROJECT", project_id)
    return {**list_row(r), "inputs": inputs, "notification_date": r.notification_date,
            "days_to_deadline": int(r.days_to_deadline), "prediction": res, "data": "synthetic"}


@app.get("/api/v1/gis/projects")
def gis(risk: str | None = None, state: str | None = None, limit: int = Query(300, ge=1, le=1000),
        user: User = Depends(current_user)):
    df = filtered(user, risk, state).head(limit)
    return {"total_returned": len(df), "limit": limit,
            "items": [{"id": r.project_id, "lat": float(r.latitude), "lng": float(r.longitude), "risk_level": r.risk_level,
                       "risk_score": int(r.risk_score), "name": r.project_name, "district": r.district, "state": r.state}
                      for r in df.itertuples()]}


@app.get("/api/v1/demo-projects")
def demo_projects(user: User = Depends(current_user)):
    P = E.PROJ; out = []
    for lvl, target in (("LOW", 15.0), ("MEDIUM", 57.5), ("HIGH", 88.0)):
        sub = P[P.risk_level == lvl]
        if lvl == "MEDIUM":
            sub = sub[(sub.delay_probability >= 55) & (sub.delay_probability <= 60)]
        r = sub.iloc[(sub.delay_probability - target).abs().argsort().iloc[0]]
        out.append({"label": lvl, "project_id": r.project_id, "project_name": r.project_name,
                    "delay_probability": float(r.delay_probability), "inputs": project_inputs(r)})
    return out


@app.get("/api/v1/model/info")
def model_info(user: User = Depends(current_user)):
    return {**E.MODEL_INFO, "states": STATES, "project_types": TYPES}


# ================================================================ simulate
class SimIn(BaseModel):
    base: ProjectInput
    changes: dict = Field(default_factory=dict)


@app.post("/api/v1/simulate")
def simulate(body: SimIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        res = E.simulate(body.base.model_dump(), body.changes)
    except ValueError as e:
        raise HTTPException(422, str(e))
    audit(db, user, "SIMULATE", f"levers={','.join(body.changes)} delta={res['delta']}")
    return res


# ================================================================ alerts
SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}


def build_alerts() -> pd.DataFrame:
    P = E.PROJ.copy(); rows = []
    fp = forest_pending_mask(P)
    for i, r in enumerate(P.itertuples()):
        reasons, sev = [], []
        d = int(r.days_to_deadline)
        if r.risk_score >= 90: reasons.append(f"Risk score {r.risk_score} (very high)"); sev.append("CRITICAL")
        if r.risk_level == "HIGH" and 0 <= d <= 180: reasons.append(f"High risk with deadline in {d} days"); sev.append("CRITICAL")
        if r.risk_score >= 60 and fp.iloc[i]: reasons.append("Environmental/Forest Clearance Pending"); sev.append("HIGH")
        if r.legal_disputes >= 5: reasons.append(f"{r.legal_disputes} unresolved legal disputes"); sev.append("MEDIUM")
        if d < 0: reasons.append(f"Planned completion date passed {-d} days ago"); sev.append("MEDIUM")
        if not sev: continue
        top = min(sev, key=SEV_ORDER.get)
        action = ("Ensure statutory forest/environmental clearance is obtained before proceeding with possession."
                  if fp.iloc[i] and top == "HIGH" else recommendation_mapping.get(r.dominant_driver, "Review project status with the field team."))
        rows.append({"alert_key": r.project_id, "project_id": r.project_id, "project_name": r.project_name, "state": r.state,
                     "district": r.district, "severity": top, "reasons": reasons, "recommended_action": action,
                     "risk_score": int(r.risk_score), "risk_level": r.risk_level})
    return pd.DataFrame(rows)


ALERTS = build_alerts()


@app.get("/api/v1/alerts")
def alerts(severity: str | None = None, state: str | None = None, status: str | None = None,
           page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
           user: User = Depends(current_user), db: Session = Depends(get_db)):
    df = ALERTS
    if user.state_jurisdiction: df = df[df.state == user.state_jurisdiction]
    counts = df.severity.value_counts().to_dict()
    acked = {a.alert_key: a for a in db.scalars(select(AlertState))}
    if severity: df = df[df.severity == severity.upper()]
    if state: df = df[df.state == state]
    df = df.assign(_o=df.severity.map(SEV_ORDER)).sort_values(["_o", "risk_score"], ascending=[True, False], kind="stable")
    if status == "acknowledged": df = df[df.alert_key.isin(acked)]
    elif status == "open": df = df[~df.alert_key.isin(acked)]
    total = len(df); s = (page - 1) * page_size
    items = []
    for r in df.iloc[s:s + page_size].to_dict("records"):
        r.pop("_o", None); a = acked.get(r["alert_key"])
        items.append({**r, "acknowledged": bool(a), "acknowledged_by": (db.get(User, a.user_id).name if a else None)})
    return {"total": total, "page": page, "pages": max(1, -(-total // page_size)),
            "counts": {k: int(counts.get(k, 0)) for k in SEV_ORDER}, "items": items}


@app.post("/api/v1/alerts/{alert_key}/acknowledge")
def ack_alert(alert_key: str, user: User = Depends(require_roles(AUTHORITY, ADMIN)), db: Session = Depends(get_db)):
    if alert_key not in set(ALERTS.alert_key):
        raise HTTPException(404, "Alert not found.")
    if not db.scalar(select(AlertState).where(AlertState.alert_key == alert_key)):
        db.add(AlertState(alert_key=alert_key, user_id=user.id, status="ACKNOWLEDGED")); db.commit()
    audit(db, user, "ACK_ALERT", alert_key)
    return {"alert_key": alert_key, "status": "ACKNOWLEDGED"}


# ================================================================ admin
@app.get("/api/v1/admin/audit")
def admin_audit(limit: int = Query(100, ge=1, le=500), user: User = Depends(require_roles(ADMIN)), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(limit)).all()
    names = {u.id: u.email for u in db.scalars(select(User))}
    return [{"id": a.id, "user": names.get(a.user_id, "-"), "action": a.action, "detail": a.detail,
             "timestamp": a.timestamp.isoformat()} for a in rows]


@app.get("/api/v1/admin/users")
def admin_users(user: User = Depends(require_roles(ADMIN)), db: Session = Depends(get_db)):
    return [user_dict(u) for u in db.scalars(select(User).order_by(User.id))]


# ================================================================ continuous learning (stretch)
class OutcomeIn(BaseModel):
    project_id: str
    delayed: Literal[0, 1]


@app.post("/api/v1/outcomes", status_code=201)
def record_outcome(body: OutcomeIn, user: User = Depends(require_roles(AUTHORITY, ADMIN)), db: Session = Depends(get_db)):
    if body.project_id not in E.IDX:
        raise HTTPException(404, "Project not found.")
    db.add(OutcomeRecord(project_id=body.project_id, delayed=body.delayed, user_id=user.id)); db.commit()
    audit(db, user, "RECORD_OUTCOME", f"{body.project_id} delayed={body.delayed}")
    return {"status": "recorded", "note": "Used at the next admin retrain. Synthetic prototype."}


@app.get("/api/v1/admin/models")
def model_versions(user: User = Depends(require_roles(ADMIN)), db: Session = Depends(get_db)):
    rows = db.scalars(select(ModelVersion).order_by(ModelVersion.id.desc())).all()
    n = len(db.scalars(select(OutcomeRecord)).all())
    return {"pending_outcomes": n, "active_baseline_roc_auc": E.METRICS["roc_auc"],
            "versions": [{"version": r.version, "path": r.path, "roc_auc": r.roc_auc, "active": bool(r.active),
                          "note": r.note, "created_at": r.created_at.isoformat()} for r in rows]}


@app.post("/api/v1/admin/retrain")
def retrain(user: User = Depends(require_roles(ADMIN)), db: Session = Depends(get_db)):
    """Refit on training split + recorded outcomes; hot-swap ONLY if hold-out ROC-AUC does not drop."""
    global ALERTS
    import joblib
    outcomes = [(o.project_id, o.delayed) for o in db.scalars(select(OutcomeRecord))]
    cand, auc = E.retrain_candidate(outcomes)
    current = E.METRICS["roc_auc"]
    ver = (db.scalars(select(ModelVersion).order_by(ModelVersion.id.desc())).first() or ModelVersion(version=0)).version + 1
    out_dir = Path(os.getenv("TERRAFORE_MODELS_DIR", str(E.BASE_DIR / "models"))); out_dir.mkdir(exist_ok=True)
    path = out_dir / f"terrafore_model_v{ver}.pkl"
    joblib.dump(cand, path)
    swapped = auc >= current
    if swapped:
        for v in db.scalars(select(ModelVersion)): v.active = 0
        E.swap_model(cand); ALERTS = build_alerts()
    db.add(ModelVersion(version=ver, path=f"models/{path.name}", roc_auc=str(auc), active=int(swapped),
                        note=f"outcomes={len(outcomes)}; {'activated' if swapped else 'kept previous (AUC dropped)'}"))
    db.commit()
    audit(db, user, "RETRAIN", f"v{ver} auc={auc} prev={current} swapped={swapped}")
    return {"version": ver, "candidate_roc_auc": auc, "previous_roc_auc": current, "activated": swapped,
            "outcomes_used": len(outcomes), "disclaimer": "Synthetic prototype; demonstrates the retraining loop only."}
