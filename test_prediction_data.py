import pandas as pd
import joblib


# ============================================
# STEP 6: TEST MULTIPLE NEW PROJECTS
# ============================================

# 1. Load the trained TerraFore model
model = joblib.load("terrafore_model.pkl")

print("TerraFore model loaded successfully!")


# ============================================
# 2. CREATE TEST PROJECTS
# ============================================

test_projects = pd.DataFrame([
    {
        "project_type": "Expressway",
        "state": "Tamil Nadu",
        "land_area_acres": 120,
        "affected_families": 85,
        "documentation_completion_pct": 95,
        "compensation_completion_pct": 90,
        "legal_disputes": 0,
        "approval_completion_pct": 95,
        "possession_completion_pct": 90,
        "rehabilitation_completion_pct": 90,
        "stakeholder_responsiveness": "High"
    },

    {
        "project_type": "Industrial Corridor",
        "state": "Maharashtra",
        "land_area_acres": 250,
        "affected_families": 180,
        "documentation_completion_pct": 65,
        "compensation_completion_pct": 55,
        "legal_disputes": 2,
        "approval_completion_pct": 60,
        "possession_completion_pct": 50,
        "rehabilitation_completion_pct": 45,
        "stakeholder_responsiveness": "Medium"
    },

    {
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
    },

    {
        "project_type": "Railway Project",
        "state": "Kerala",
        "land_area_acres": 80,
        "affected_families": 40,
        "documentation_completion_pct": 75,
        "compensation_completion_pct": 70,
        "legal_disputes": 1,
        "approval_completion_pct": 80,
        "possession_completion_pct": 65,
        "rehabilitation_completion_pct": 70,
        "stakeholder_responsiveness": "High"
    },

    {
        "project_type": "Urban Development",
        "state": "Karnataka",
        "land_area_acres": 60,
        "affected_families": 30,
        "documentation_completion_pct": 40,
        "compensation_completion_pct": 35,
        "legal_disputes": 4,
        "approval_completion_pct": 45,
        "possession_completion_pct": 30,
        "rehabilitation_completion_pct": 25,
        "stakeholder_responsiveness": "Low"
    }
])


# ============================================
# 3. PREDICT
# ============================================

predictions = model.predict(test_projects)

probabilities = model.predict_proba(test_projects)[:, 1]


# ============================================
# 4. DISPLAY RESULTS
# ============================================

print("\n" + "=" * 70)
print("TERRAFOR MULTI-PROJECT PREDICTION TEST")
print("=" * 70)

for i in range(len(test_projects)):

    probability = probabilities[i] * 100
    prediction = predictions[i]

    if probability < 30:
        risk = "LOW"

    elif probability < 60:
        risk = "MEDIUM"

    else:
        risk = "HIGH"

    print("\n----------------------------------------")
    print(f"PROJECT {i + 1}")
    print("----------------------------------------")

    print(
        f"Project Type       : "
        f"{test_projects.iloc[i]['project_type']}"
    )

    print(
        f"State              : "
        f"{test_projects.iloc[i]['state']}"
    )

    print(
        f"Legal Disputes     : "
        f"{test_projects.iloc[i]['legal_disputes']}"
    )

    print(
        f"Compensation       : "
        f"{test_projects.iloc[i]['compensation_completion_pct']}%"
    )

    print(
        f"Possession         : "
        f"{test_projects.iloc[i]['possession_completion_pct']}%"
    )

    print(
        f"Stakeholder        : "
        f"{test_projects.iloc[i]['stakeholder_responsiveness']}"
    )

    print("\nRESULT")
    print(
        f"Prediction         : "
        f"{'DELAYED' if prediction == 1 else 'NOT DELAYED'}"
    )

    print(f"Delay Probability  : {probability:.2f}%")
    print(f"Risk Level         : {risk}")


print("\n" + "=" * 70)
print("Step 6 completed successfully!")
print("=" * 70)