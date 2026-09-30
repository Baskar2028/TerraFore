import pandas as pd
import pytest
from fastapi.testclient import TestClient

import api

client = TestClient(api.app)
PAYLOAD = dict(project_type="Expressway", state="Tamil Nadu", land_area_acres=120, affected_families=85,
               documentation_completion_pct=60, compensation_completion_pct=45, legal_disputes=2,
               approval_completion_pct=60, possession_completion_pct=50, rehabilitation_completion_pct=45,
               stakeholder_responsiveness="Medium")


def tok(email):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "Demo@1234"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def admin(): return tok("admin@terrafore.demo")
@pytest.fixture(scope="module")
def officer(): return tok("officer@terrafore.demo")
@pytest.fixture(scope="module")
def authority(): return tok("authority@terrafore.demo")


def test_public():
    assert client.get("/health").json()["status"] == "healthy"
    assert client.get("/").json()["status"] == "online"


def test_predict_contract(officer):
    r = client.post("/predict", json=PAYLOAD, headers=officer)
    assert r.status_code == 200
    j = r.json()
    for k in ("prediction", "delay_probability", "risk_level", "key_factors", "priority_actions"):
        assert k in j
    for k in ("risk_score", "lifecycle_stages", "compliance", "action_impact", "historical_context", "disclaimer"):
        assert k in j
    assert 50 <= j["delay_probability"] <= 65 and j["risk_score"] == round(j["delay_probability"])
    assert {"factor", "value", "shap_impact", "effect", "priority", "recommendation"} <= set(j["key_factors"][0])
    assert len(j["lifecycle_stages"]["stages"]) == 5


def test_predict_rejects_extra_and_invalid(officer):
    assert client.post("/predict", json={**PAYLOAD, "x": 1}, headers=officer).status_code == 422
    assert client.post("/predict", json={**PAYLOAD, "compensation_completion_pct": 120}, headers=officer).status_code == 422


def test_batch(officer):
    r = client.post("/predict/batch", json=[PAYLOAD, {**PAYLOAD, "compensation_completion_pct": 90}], headers=officer)
    assert r.status_code == 200 and len(r.json()) == 2
    assert r.json()[1]["delay_probability"] < r.json()[0]["delay_probability"]
    assert client.post("/predict/batch", json=[PAYLOAD] * 501, headers=officer).status_code == 422


def test_stats_totals(officer):
    s = client.get("/api/v1/stats", headers=officer).json()
    assert s["total_projects"] == 5000
    assert sum(v["count"] for v in s["risk_levels"].values()) == 5000
    assert abs(sum(v["pct"] for v in s["risk_levels"].values()) - 100) < 0.5


def test_meta_ids_match_dataset():
    d = pd.read_csv("terrafore_synthetic_dataset.csv"); m = pd.read_csv("terrafore_project_meta.csv")
    assert set(m.project_id) == set(d.project_id) and len(m) == 5000


def test_projects_gis_demo(officer):
    p = client.get("/api/v1/projects?page_size=5", headers=officer).json()
    assert p["total"] == 5000 and len(p["items"]) == 5
    assert p["items"][0]["risk_score"] >= p["items"][-1]["risk_score"]
    g = client.get("/api/v1/gis/projects", headers=officer).json()
    assert g["total_returned"] == 300
    d = client.get("/api/v1/demo-projects", headers=officer).json()
    assert [x["label"] for x in d] == ["LOW", "MEDIUM", "HIGH"] and 55 <= d[1]["delay_probability"] <= 60
    det = client.get("/api/v1/projects/TF00001", headers=officer).json()
    assert det["prediction"]["compliance"]["forest_land_involved"] is not None
    assert client.get("/api/v1/projects/TF99999", headers=officer).status_code == 404
    info = client.get("/api/v1/model/info", headers=officer).json()
    assert abs(info["heldout_metrics"]["roc_auc"] - 0.9399) < 0.001


def test_auth_required():
    for path in ("/api/v1/stats", "/api/v1/projects", "/api/v1/alerts", "/api/v1/auth/me"):
        assert client.get(path).status_code == 401
    assert client.post("/predict", json=PAYLOAD).status_code == 401


def test_signup_login_and_no_admin():
    r = client.post("/api/v1/auth/signup", json={"name": "Test User", "email": "t1@example.com", "password": "Password1!",
                                                   "role": "LAND_ACQUISITION_OFFICER"})
    assert r.status_code == 201 and r.json()["user"]["role"] == "LAND_ACQUISITION_OFFICER"
    assert client.post("/api/v1/auth/signup", json={"name": "Test User", "email": "t1@example.com", "password": "Password1!",
                                                      "role": "PROJECT_AUTHORITY"}).status_code == 409
    assert client.post("/api/v1/auth/signup", json={"name": "Evil", "email": "e@example.com", "password": "Password1!",
                                                      "role": "ADMINISTRATOR"}).status_code == 422
    assert client.post("/api/v1/auth/login", json={"email": "t1@example.com", "password": "bad"}).status_code == 401
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/api/v1/auth/me", headers=h).json()["email"] == "t1@example.com"


def test_role_permissions(officer, authority, admin):
    assert client.get("/api/v1/admin/audit", headers=officer).status_code == 403
    assert client.get("/api/v1/admin/audit", headers=authority).status_code == 403
    assert client.get("/api/v1/admin/audit", headers=admin).status_code == 200
    assert client.get("/api/v1/admin/users", headers=officer).status_code == 403
    assert client.get("/api/v1/projects/export", headers=officer).status_code == 403
    r = client.get("/api/v1/projects/export?risk=HIGH", headers=authority)
    assert r.status_code == 200 and r.text.startswith("project_id")


def test_simulate(officer):
    r = client.post("/api/v1/simulate", json={"base": PAYLOAD, "changes": {"compensation_completion_pct": 80}}, headers=officer)
    j = r.json()
    assert r.status_code == 200 and j["delta"] < -10 and j["after"]["score"] < j["before"]["score"]
    assert "not a guarantee" in j["disclaimer"]
    bad = client.post("/api/v1/simulate", json={"base": PAYLOAD, "changes": {"state": "Kerala"}}, headers=officer)
    assert bad.status_code == 422 and "state" in bad.json()["detail"]
    w = client.post("/api/v1/simulate", json={"base": PAYLOAD, "changes": {"compensation_completion_pct": 10}}, headers=officer)
    assert w.json()["worsening"] == ["compensation_completion_pct"]


def test_alerts_ack(officer, authority):
    a = client.get("/api/v1/alerts?severity=CRITICAL", headers=officer).json()
    assert a["total"] > 0 and a["items"][0]["severity"] == "CRITICAL"
    key = a["items"][0]["alert_key"]
    assert client.post(f"/api/v1/alerts/{key}/acknowledge", headers=officer).status_code == 403
    assert client.post(f"/api/v1/alerts/{key}/acknowledge", headers=authority).status_code == 200
    again = client.get("/api/v1/alerts?status=acknowledged", headers=officer).json()
    assert any(i["alert_key"] == key for i in again["items"])


def test_forest_compliance():
    import engine as E
    row = E.PROJ[(E.PROJ.forest_clearance_status == "Pending")].iloc[0]
    c = E.compliance_for(row)
    assert c["flag"] == "Environmental/Forest Clearance Pending" and "before proceeding with possession" in c["recommended_action"]


def test_audit_written(admin):
    acts = {a["action"] for a in client.get("/api/v1/admin/audit?limit=200", headers=admin).json()}
    assert {"LOGIN", "PREDICT", "SIMULATE", "SIGNUP"} <= acts


def test_outcome_and_retrain(authority, admin, officer):
    assert client.post("/api/v1/outcomes", json={"project_id": "TF00001", "delayed": 1}, headers=officer).status_code == 403
    assert client.post("/api/v1/outcomes", json={"project_id": "TF00001", "delayed": 1}, headers=authority).status_code == 201
    assert client.post("/api/v1/admin/retrain", headers=authority).status_code == 403
    r = client.post("/api/v1/admin/retrain", headers=admin)
    assert r.status_code == 200 and r.json()["candidate_roc_auc"] > 0.9
    assert client.get("/api/v1/admin/models", headers=admin).json()["versions"]
    assert client.get("/api/v1/stats", headers=admin).json()["total_projects"] == 5000
