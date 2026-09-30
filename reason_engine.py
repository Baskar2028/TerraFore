import pandas as pd
import joblib
import shap


# ============================================
# LOAD MODEL
# ============================================

model = joblib.load("terrafore_model.pkl")


# ============================================
# NEW PROJECT
# ============================================

project = pd.DataFrame([{
    "project_type": "Irrigation Project",
    "state": "Odisha",
    "land_area_acres": 300,
    "affected_families": 250,
    "documentation_completion_pct": 25,
    "compensation_completion_pct": 15,
    "legal_disputes": 7,
    "approval_completion_pct": 30,
    "possession_completion_pct": 20,
    "rehabilitation_completion_pct": 15,
    "stakeholder_responsiveness": "Low"
}])


# ============================================
# PREDICTION
# ============================================

probability = model.predict_proba(project)[0][1]

if probability < 0.30:
    risk = "LOW"
elif probability < 0.60:
    risk = "MEDIUM"
else:
    risk = "HIGH"

prediction = "DELAYED" if probability >= 0.50 else "NOT DELAYED"


# ============================================
# SHAP
# ============================================

preprocessor = model.named_steps["preprocessor"]
classifier = model.named_steps["classifier"]

transformed_project = preprocessor.transform(project)

explainer = shap.LinearExplainer(
    classifier,
    transformed_project
)

shap_result = explainer(transformed_project)

shap_values = shap_result.values[0]

feature_names = preprocessor.get_feature_names_out()


# ============================================
# HUMAN-READABLE REASON ENGINE
# ============================================

reasons = []
recommendations = []


# Compensation
compensation = project["compensation_completion_pct"].iloc[0]

if compensation < 30:
    reasons.append(
        f"Compensation completion is critically low at {compensation}%."
    )
    recommendations.append(
        "Prioritize pending compensation processing for affected stakeholders."
    )

elif compensation < 60:
    reasons.append(
        f"Compensation completion is moderate at {compensation}%."
    )
    recommendations.append(
        "Accelerate remaining compensation processing."
    )


# Possession
possession = project["possession_completion_pct"].iloc[0]

if possession < 30:
    reasons.append(
        f"Land possession completion is critically low at {possession}%."
    )
    recommendations.append(
        "Prioritize unresolved land possession cases."
    )

elif possession < 60:
    reasons.append(
        f"Land possession completion is only {possession}%."
    )
    recommendations.append(
        "Coordinate with responsible authorities to accelerate possession."
    )


# Documentation
documentation = project["documentation_completion_pct"].iloc[0]

if documentation < 30:
    reasons.append(
        f"Documentation completion is critically low at {documentation}%."
    )
    recommendations.append(
        "Complete pending land documentation and verification."
    )

elif documentation < 60:
    reasons.append(
        f"Documentation completion is only {documentation}%."
    )
    recommendations.append(
        "Accelerate documentation verification and approval."
    )


# Approval
approval = project["approval_completion_pct"].iloc[0]

if approval < 30:
    reasons.append(
        f"Approval completion is critically low at {approval}%."
    )
    recommendations.append(
        "Escalate pending approvals to the responsible authorities."
    )

elif approval < 60:
    reasons.append(
        f"Approval completion is only {approval}%."
    )
    recommendations.append(
        "Follow up on pending project approvals."
    )


# Rehabilitation
rehabilitation = project["rehabilitation_completion_pct"].iloc[0]

if rehabilitation < 30:
    reasons.append(
        f"Rehabilitation completion is critically low at {rehabilitation}%."
    )
    recommendations.append(
        "Accelerate rehabilitation and resettlement activities."
    )

elif rehabilitation < 60:
    reasons.append(
        f"Rehabilitation completion is only {rehabilitation}%."
    )
    recommendations.append(
        "Monitor and accelerate remaining rehabilitation activities."
    )


# Legal disputes
disputes = project["legal_disputes"].iloc[0]

if disputes >= 5:
    reasons.append(
        f"{disputes} legal disputes are currently associated with the project."
    )
    recommendations.append(
        "Prioritize resolution of outstanding legal disputes."
    )

elif disputes >= 2:
    reasons.append(
        f"The project has {disputes} legal disputes."
    )
    recommendations.append(
        "Monitor and resolve outstanding legal disputes."
    )


# Stakeholder responsiveness
stakeholder = project["stakeholder_responsiveness"].iloc[0]

if stakeholder == "Low":
    reasons.append(
        "Stakeholder responsiveness is currently low."
    )
    recommendations.append(
        "Increase stakeholder coordination and establish regular follow-ups."
    )

elif stakeholder == "Medium":
    reasons.append(
        "Stakeholder responsiveness is moderate."
    )
    recommendations.append(
        "Increase coordination frequency with key stakeholders."
    )


# ============================================
# DISPLAY
# ============================================

print("=" * 70)
print("TERRAFOR — EXPLAINABLE PREDICTION")
print("=" * 70)

print("\nPREDICTION")
print("-" * 40)

print(f"Prediction        : {prediction}")
print(f"Delay Probability : {probability * 100:.2f}%")
print(f"Risk Level        : {risk}")


print("\nWHY THIS PROJECT IS AT RISK")
print("-" * 40)

for i, reason in enumerate(reasons, 1):
    print(f"{i}. {reason}")


print("\nRECOMMENDED ACTIONS")
print("-" * 40)

for i, recommendation in enumerate(recommendations, 1):
    print(f"{i}. {recommendation}")


print("\n" + "=" * 70)
print("STEP 7B COMPLETED")
print("=" * 70)