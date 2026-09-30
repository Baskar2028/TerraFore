"""TerraFore scoring engine: model loading, batch scoring, SHAP drivers,
lifecycle stages, highest-impact fixes, what-if simulation and compliance flags.
All data is SYNTHETIC. Estimates are scenario estimates, not guarantees."""
from datetime import date
from math import ceil
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
import shap
from pydantic import BaseModel, ConfigDict, Field
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "terrafore_model.pkl"
DATASET_PATH = BASE_DIR / "terrafore_synthetic_dataset.csv"
META_PATH = BASE_DIR / "terrafore_project_meta.csv"

for _p in (MODEL_PATH, DATASET_PATH, META_PATH):
    if not _p.exists():
        raise FileNotFoundError(f"TerraFore required file not found: {_p}")

DISCLAIMER = "Prototype model trained on synthetic data. Estimates support, not replace, official judgement."
SIM_DISCLAIMER = "Scenario estimate from a prototype model, not a guarantee."

INPUT_FIELDS = ["project_type", "state", "land_area_acres", "affected_families", "documentation_completion_pct",
                "compensation_completion_pct", "legal_disputes", "approval_completion_pct",
                "possession_completion_pct", "rehabilitation_completion_pct", "stakeholder_responsiveness"]


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_type: str = Field(min_length=1)
    state: str = Field(min_length=1)
    land_area_acres: float = Field(ge=0)
    affected_families: int = Field(ge=0)
    documentation_completion_pct: float = Field(ge=0, le=100)
    compensation_completion_pct: float = Field(ge=0, le=100)
    legal_disputes: int = Field(ge=0)
    approval_completion_pct: float = Field(ge=0, le=100)
    possession_completion_pct: float = Field(ge=0, le=100)
    rehabilitation_completion_pct: float = Field(ge=0, le=100)
    stakeholder_responsiveness: Literal["High", "Medium", "Low"]


# ---------------------------------------------------------------- mappings
def get_priority(abs_impact: float) -> str:
    if abs_impact >= 1.0:
        return "CRITICAL"
    if abs_impact >= 0.5:
        return "HIGH"
    return "MEDIUM"


recommendation_mapping = {
    "Compensation completion": "Accelerate remaining compensation processing.",
    "Land possession completion": "Prioritize unresolved land possession cases.",
    "Documentation completion": "Complete pending land documentation and verification.",
    "Approval completion": "Follow up on pending project approvals.",
    "Rehabilitation completion": "Accelerate rehabilitation activities.",
    "Legal disputes": "Prioritize resolution of outstanding legal disputes.",
    "Low stakeholder responsiveness": "Increase stakeholder coordination and follow-ups.",
    "Medium stakeholder responsiveness": "Strengthen stakeholder coordination and follow-ups.",
    "High stakeholder responsiveness": "Maintain regular stakeholder coordination.",
}

factor_mapping = {
    "numerical__compensation_completion_pct": "Compensation completion",
    "numerical__possession_completion_pct": "Land possession completion",
    "numerical__documentation_completion_pct": "Documentation completion",
    "numerical__approval_completion_pct": "Approval completion",
    "numerical__rehabilitation_completion_pct": "Rehabilitation completion",
    "numerical__legal_disputes": "Legal disputes",
    "numerical__land_area_acres": "Land area",
    "numerical__affected_families": "Affected families",
    "categorical__stakeholder_responsiveness_Low": "Low stakeholder responsiveness",
    "categorical__stakeholder_responsiveness_Medium": "Medium stakeholder responsiveness",
    "categorical__stakeholder_responsiveness_High": "High stakeholder responsiveness",
}

STAGES = [
    ("Notification & Documentation", "documentation_completion_pct", "numerical__documentation_completion_pct"),
    ("Compensation", "compensation_completion_pct", "numerical__compensation_completion_pct"),
    ("Approvals", "approval_completion_pct", "numerical__approval_completion_pct"),
    ("Possession", "possession_completion_pct", "numerical__possession_completion_pct"),
    ("Rehabilitation & Resettlement", "rehabilitation_completion_pct", "numerical__rehabilitation_completion_pct"),
]
COMPLETION_LEVERS = {
    "documentation_completion_pct": "Documentation completion",
    "compensation_completion_pct": "Compensation completion",
    "approval_completion_pct": "Approval completion",
    "possession_completion_pct": "Land possession completion",
    "rehabilitation_completion_pct": "Rehabilitation completion",
}
CONTROLLABLE = list(COMPLETION_LEVERS) + ["legal_disputes", "stakeholder_responsiveness"]
LOCKED = ["state", "project_type", "land_area_acres", "affected_families"]
RESP_ORDER = ["Low", "Medium", "High"]


def risk_level(prob: float) -> str:
    """prob in 0..1"""
    return "LOW" if prob < 0.30 else "MEDIUM" if prob < 0.60 else "HIGH"


# ---------------------------------------------------------------- loading
model = joblib.load(MODEL_PATH)
preprocessor = model.named_steps["preprocessor"]
classifier = model.named_steps["classifier"]

DATA = pd.read_csv(DATASET_PATH)
META = pd.read_csv(META_PATH)
_ref = DATA.drop(columns=["project_id", "delayed"])


def _dense(m):
    return m.toarray() if hasattr(m, "toarray") else np.asarray(m)


explainer = shap.LinearExplainer(classifier, _dense(preprocessor.transform(_ref)))
FEATURE_NAMES = list(preprocessor.get_feature_names_out())


def shap_for(df: pd.DataFrame) -> np.ndarray:
    return np.asarray(explainer.shap_values(_dense(preprocessor.transform(df[INPUT_FIELDS]))))


def proba(df: pd.DataFrame) -> np.ndarray:
    return model.predict_proba(df[INPUT_FIELDS])[:, 1]


# ---------------------------------------------------------------- precompute
assert set(META.project_id) == set(DATA.project_id), "metadata IDs must match dataset IDs"
_mapped = [i for i, n in enumerate(FEATURE_NAMES) if n in factor_mapping]


def _active_matrix(df: pd.DataFrame) -> np.ndarray:
    act = np.ones((len(df), len(_mapped)), dtype=bool)
    for j, i in enumerate(_mapped):
        n = FEATURE_NAMES[i]
        if n.startswith("categorical__stakeholder_responsiveness_"):
            act[:, j] = (df["stakeholder_responsiveness"].values == n.rsplit("_", 1)[1])
    return act


def _precompute():
    """Batch-score all projects once (vectorised). Re-run after a model hot-swap."""
    global PROJ, SHAP_ALL, IDX
    P = DATA.merge(META, on="project_id", how="left")
    P["delay_probability"] = np.round(proba(P) * 100, 2)
    P["risk_score"] = P["delay_probability"].round().astype(int)
    P["risk_level"] = [risk_level(p / 100) for p in P["delay_probability"]]
    SHAP_ALL = shap_for(P)
    P["notification_year"] = pd.to_datetime(P["notification_date"]).dt.year
    today = date.today()
    P["days_to_deadline"] = pd.to_datetime(P["planned_completion_date"]).dt.date.map(lambda d: (d - today).days)
    M = np.where(_active_matrix(P), SHAP_ALL[:, _mapped], -np.inf)
    best = M.argmax(axis=1)
    P["dominant_driver"] = [factor_mapping[FEATURE_NAMES[_mapped[b]]] if M[k, b] > 0 else "No major risk driver"
                            for k, b in enumerate(best)]
    PROJ = P
    IDX = {pid: i for i, pid in enumerate(P.project_id)}


_precompute()


def swap_model(new_model):
    """Hot-swap the active pipeline (used by admin retrain) and refresh cached scores."""
    global model, preprocessor, classifier, explainer, FEATURE_NAMES, METRICS
    model = new_model
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]
    explainer = shap.LinearExplainer(classifier, _dense(preprocessor.transform(_ref)))
    FEATURE_NAMES = list(preprocessor.get_feature_names_out())
    METRICS = _compute_metrics()
    MODEL_INFO["heldout_metrics"] = METRICS
    _precompute()


# ---------------------------------------------------------------- explanation
def _factor_value(feature: str, p: dict):
    nums = {
        "numerical__compensation_completion_pct": f"{p['compensation_completion_pct']}%",
        "numerical__possession_completion_pct": f"{p['possession_completion_pct']}%",
        "numerical__documentation_completion_pct": f"{p['documentation_completion_pct']}%",
        "numerical__approval_completion_pct": f"{p['approval_completion_pct']}%",
        "numerical__rehabilitation_completion_pct": f"{p['rehabilitation_completion_pct']}%",
        "numerical__legal_disputes": str(p["legal_disputes"]),
        "numerical__land_area_acres": f"{p['land_area_acres']} acres",
        "numerical__affected_families": str(p["affected_families"]),
    }
    if feature in nums:
        return nums[feature]
    for lvl in RESP_ORDER:
        if feature.endswith(f"_{lvl}") and p["stakeholder_responsiveness"] == lvl:
            return lvl
    return None


def key_factors_for(shap_row: np.ndarray, p: dict, limit: int = 5):
    order = np.argsort(-np.abs(shap_row))
    out = []
    for i in order:
        feature = FEATURE_NAMES[i]
        if feature not in factor_mapping:
            continue
        value = _factor_value(feature, p)
        if value is None:
            continue
        impact = float(shap_row[i])
        name = factor_mapping[feature]
        out.append({
            "factor": name, "value": value, "shap_impact": round(impact, 4),
            "effect": "INCREASES_DELAY_RISK" if impact > 0 else "REDUCES_DELAY_RISK",
            "priority": get_priority(abs(impact)),
            "recommendation": recommendation_mapping.get(name),
        })
        if len(out) >= limit:
            break
    return out


def priority_actions_for(factors):
    return [{"priority": f["priority"], "factor": f["factor"], "action": f["recommendation"]}
            for f in factors if f["effect"] == "INCREASES_DELAY_RISK" and f["recommendation"]]


def lifecycle_for(shap_row: np.ndarray, p: dict):
    stages = []
    for label, field, feat in STAGES:
        v = float(p[field])
        status = "red" if v < 40 else "amber" if v < 70 else "green"
        stages.append({"stage": label, "field": field, "completion": v, "status": status,
                       "shap_impact": round(float(shap_row[FEATURE_NAMES.index(feat)]), 4),
                       "legal_dispute_chip": p["legal_disputes"] >= 3 and label in ("Compensation", "Possession")})
    pos = [s for s in stages if s["shap_impact"] > 0]
    if pos:
        b = max(pos, key=lambda s: (s["shap_impact"], -s["completion"]))
        reason = f"{b['stage']} ({b['completion']:.0f}% complete) contributes most to this project's delay risk."
    else:
        b = min(stages, key=lambda s: s["completion"])
        reason = f"No stage raises risk above average; {b['stage']} is the least complete ({b['completion']:.0f}%)."
    for s in stages:
        s["is_bottleneck"] = s is b
    return {"stages": stages, "bottleneck": b["stage"], "bottleneck_reason": reason,
            "caption": "Stage indicators are derived from the project's completion levels and the model's "
                       "explanation; they are not separately trained stage models."}


def _standard_change(p: dict, field: str):
    """Return (new_value, description) or None when no improvement is possible."""
    v = p[field]
    if field in COMPLETION_LEVERS:
        if v >= 100:
            return None
        nv = min(100.0, v + 25)
        return nv, f"+{nv - v:.0f} points"
    if field == "legal_disputes":
        if v <= 0:
            return None
        nv = v - ceil(v / 2)
        return nv, f"{v} \u2192 {nv} disputes"
    i = RESP_ORDER.index(v)
    if i == 2:
        return None
    return RESP_ORDER[i + 1], f"{v} \u2192 {RESP_ORDER[i + 1]}"


def action_impact_for(p: dict, base_prob: float, top: int = 3):
    variants, meta = [], []
    for field in CONTROLLABLE:
        sc = _standard_change(p, field)
        if sc:
            q = dict(p); q[field] = sc[0]
            variants.append(q); meta.append((field, sc))
    if not variants:
        return []
    probs = proba(pd.DataFrame(variants))
    res = []
    for (field, (nv, desc)), pr in zip(meta, probs):
        pts = round((base_prob - float(pr)) * 100, 1)
        label = COMPLETION_LEVERS.get(field) or ("Legal disputes" if field == "legal_disputes" else "Stakeholder responsiveness")
        if pts > 0:
            res.append({"lever": label, "field": field, "standard_change": desc, "new_value": nv,
                        "points_reduced": pts,
                        "message": f"Improving {label.lower()} ({desc}) is estimated to reduce risk by ~{round(pts)} points."})
    res.sort(key=lambda r: -r["points_reduced"])
    return res[:top]


def historical_context(state: str, ptype: str):
    def rate(mask):
        n = int(mask.sum())
        return {"projects": n, "delay_rate_pct": round(float(DATA.loc[mask, "delayed"].mean() * 100), 1) if n else None}
    return {"state": {"name": state, **rate(DATA.state == state)},
            "project_type": {"name": ptype, **rate(DATA.project_type == ptype)},
            "overall": rate(DATA.state.notna()),
            "note": "Share of synthetic-dataset projects labelled delayed. Display context only; not a model feature."}


def compliance_for(meta_row=None):
    tip = "Rule-based flag from synthetic metadata; not a model feature."
    if meta_row is None:
        return {"applicable": False, "forest_land_involved": None, "forest_clearance_status": None, "is_risk": False,
                "flag": None, "message": "Compliance data is available for registered projects only.", "note": tip}
    forest = bool(meta_row["forest_land_involved"]); st = str(meta_row["forest_clearance_status"])
    risk = forest and st in ("Pending", "Under Review")
    return {"applicable": forest, "forest_land_involved": forest, "forest_clearance_status": st, "is_risk": risk,
            "flag": "Environmental/Forest Clearance Pending" if risk else None,
            "message": ("Forest land is involved and clearance is " + st.lower() + ". This is a compliance and delay risk.") if risk
            else ("Forest land involved; clearance granted." if forest else "No forest land involved."),
            "recommended_action": "Ensure statutory forest/environmental clearance is obtained before proceeding with possession." if risk else None,
            "note": tip}


def predict_full(p: dict, project_id: str | None = None):
    df = pd.DataFrame([p])
    prob = float(proba(df)[0])
    pred = int(model.predict(df[INPUT_FIELDS])[0])
    row = shap_for(df)[0]
    factors = key_factors_for(row, p)
    meta_row = None
    if project_id and project_id in IDX:
        meta_row = PROJ.iloc[IDX[project_id]]
    return {
        "prediction": "DELAYED" if pred == 1 else "NOT DELAYED",
        "delay_probability": round(prob * 100, 2),
        "risk_level": risk_level(prob),
        "key_factors": factors,
        "priority_actions": priority_actions_for(factors),
        # additive fields
        "risk_score": int(round(prob * 100)),
        "lifecycle_stages": lifecycle_for(row, p),
        "compliance": compliance_for(meta_row),
        "action_impact": action_impact_for(p, prob),
        "historical_context": historical_context(p["state"], p["project_type"]),
        "disclaimer": DISCLAIMER,
    }


def simulate(base: dict, changes: dict):
    bad = [k for k in changes if k in LOCKED]
    unk = [k for k in changes if k not in CONTROLLABLE and k not in LOCKED]
    if bad or unk:
        raise ValueError(f"Fields not controllable in simulation: {', '.join(bad + unk)}. "
                         f"Controllable: {', '.join(CONTROLLABLE)}.")
    new = dict(base); worsening = []
    for k, v in changes.items():
        if k in COMPLETION_LEVERS:
            v = float(v)
            if not 0 <= v <= 100:
                raise ValueError(f"{k} must be between 0 and 100.")
            if v < base[k]: worsening.append(k)
        elif k == "legal_disputes":
            v = int(v)
            if not 0 <= v <= 20:
                raise ValueError("legal_disputes must be between 0 and 20.")
            if v > base[k]: worsening.append(k)
        else:
            if v not in RESP_ORDER:
                raise ValueError("stakeholder_responsiveness must be High, Medium or Low.")
            if RESP_ORDER.index(v) < RESP_ORDER.index(base[k]): worsening.append(k)
        new[k] = v
    keys = list(changes)
    frames = pd.DataFrame([base, new] + [{**base, k: new[k]} for k in keys])
    pr = proba(frames)
    b, a = float(pr[0]), float(pr[1])
    after_row = shap_for(pd.DataFrame([new]))[0]
    sc = lambda x: int(round(x * 100))
    return {"before": {"score": sc(b), "level": risk_level(b), "delay_probability": round(b * 100, 2)},
            "after": {"score": sc(a), "level": risk_level(a), "delay_probability": round(a * 100, 2)},
            "delta": round((a - b) * 100, 1),
            "level_change": None if risk_level(a) == risk_level(b) else f"{risk_level(b)} \u2192 {risk_level(a)}",
            "per_change": [{"field": k, "from": base[k], "to": new[k], "delta": round((float(x) - b) * 100, 1)}
                           for k, x in zip(keys, pr[2:])],
            "worsening": worsening,
            "top_drivers_after": key_factors_for(after_row, new),
            "disclaimer": SIM_DISCLAIMER}


# ---------------------------------------------------------------- model info
def _compute_metrics():
    X = DATA.drop(columns=["project_id", "delayed"]); y = DATA["delayed"]
    _, Xt, _, yt = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pr = model.predict_proba(Xt)[:, 1]; yp = (pr >= 0.5).astype(int)
    return {"roc_auc": round(float(roc_auc_score(yt, pr)), 4), "accuracy": round(float(accuracy_score(yt, yp)), 4),
            "precision": round(float(precision_score(yt, yp)), 4), "recall": round(float(recall_score(yt, yp)), 4),
            "f1": round(float(f1_score(yt, yp)), 4), "test_rows": int(len(yt))}


METRICS = _compute_metrics()
MODEL_INFO = {
    "model_type": "scikit-learn Pipeline: preprocessing + Logistic Regression",
    "explainability": "SHAP LinearExplainer (local explanations)",
    "training_rows": int(len(DATA) - METRICS["test_rows"]), "dataset_rows": int(len(DATA)),
    "features_used": INPUT_FIELDS, "heldout_metrics": METRICS,
    "split": "20% stratified held-out split, random_state=42",
    "dataset_disclaimer": "All data in this prototype is synthetic. It is not real or government data.",
    "limitations": ("Metrics come from a held-out test set of the synthetic dataset and demonstrate technical feasibility. "
                    "Real deployment requires retraining and validation on authorised historical project data. "
                    "Forest/environmental clearance is a rule-based flag and is not a model feature."),
}


def retrain_candidate(outcomes: list[tuple[str, int]]):
    """Refit the same pipeline on the training split + recorded outcomes; return (candidate, metrics)."""
    from sklearn.base import clone
    X = DATA.drop(columns=["project_id", "delayed"]); y = DATA["delayed"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    if outcomes:
        extra = DATA.set_index("project_id").loc[[o[0] for o in outcomes]]
        Xtr = pd.concat([Xtr, extra[INPUT_FIELDS]]); ytr = pd.concat([ytr, pd.Series([o[1] for o in outcomes], index=extra.index)])
    cand = clone(model).fit(Xtr, ytr)
    return cand, round(float(roc_auc_score(yte, cand.predict_proba(Xte)[:, 1])), 4)
