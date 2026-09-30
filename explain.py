import pandas as pd
import joblib
import shap

# ============================================
# LOAD DATASET AND TRAINED MODEL
# ============================================

df = pd.read_csv("terrafore_synthetic_dataset.csv")
model = joblib.load("terrafore_model.pkl")

print("=" * 70)
print("TERRAFOR MODEL EXPLAINABILITY - STEP 7")
print("=" * 70)

# ============================================
# INPUT PROJECT
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
# GET PREPROCESSOR AND MODEL
# ============================================

preprocessor = model.named_steps["preprocessor"]
classifier = model.named_steps["classifier"]

# Transform project using the SAME preprocessing
project_transformed = preprocessor.transform(project)

# ============================================
# FEATURE NAMES
# ============================================

feature_names = preprocessor.get_feature_names_out()

# ============================================
# SHAP EXPLAINER
# ============================================

explainer = shap.LinearExplainer(
    classifier,
    project_transformed
)

shap_values = explainer(project_transformed)

# ============================================
# GET SHAP VALUES FOR DELAYED CLASS
# ============================================

values = shap_values.values[0]

# ============================================
# CREATE EXPLANATION TABLE
# ============================================

explanation = pd.DataFrame({
    "feature": feature_names,
    "impact": values
})

explanation["absolute_impact"] = explanation["impact"].abs()

explanation = explanation.sort_values(
    "absolute_impact",
    ascending=False
)

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
# DISPLAY RESULT
# ============================================

print("\nPROJECT PREDICTION")
print("-" * 40)

print(f"Prediction        : {prediction}")
print(f"Delay Probability : {probability * 100:.2f}%")
print(f"Risk Level        : {risk}")

print("\nTOP CONTRIBUTING FACTORS")
print("-" * 40)

for _, row in explanation.head(10).iterrows():

    direction = "INCREASES delay risk" if row["impact"] > 0 else "REDUCES delay risk"

    print(
        f"{row['feature']:50} "
        f"{row['impact']:8.4f}  "
        f"{direction}"
    )

print("\n" + "=" * 70)
print("STEP 7A COMPLETED")
print("=" * 70)