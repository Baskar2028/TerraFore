import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression


# ============================================
# STEP 5: TERRAFOR PREDICTION SYSTEM
# ============================================

# 1. Load dataset
df = pd.read_csv("terrafore_synthetic_dataset.csv")


# ============================================
# 2. FEATURES AND TARGET
# ============================================

X = df.drop(columns=["project_id", "delayed"])
y = df["delayed"]


categorical_columns = [
    "project_type",
    "state",
    "stakeholder_responsiveness"
]


numerical_columns = [
    "land_area_acres",
    "affected_families",
    "documentation_completion_pct",
    "compensation_completion_pct",
    "legal_disputes",
    "approval_completion_pct",
    "possession_completion_pct",
    "rehabilitation_completion_pct"
]


# ============================================
# 3. PREPROCESSING
# ============================================

numerical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ]
)


categorical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        (
            "encoder",
            OneHotEncoder(handle_unknown="ignore")
        )
    ]
)


preprocessor = ColumnTransformer(
    transformers=[
        (
            "numerical",
            numerical_pipeline,
            numerical_columns
        ),
        (
            "categorical",
            categorical_pipeline,
            categorical_columns
        )
    ]
)


# ============================================
# 4. TRAIN / TEST SPLIT
# ============================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# ============================================
# 5. CREATE MODEL
# ============================================

model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "classifier",
            LogisticRegression(
                max_iter=2000,
                random_state=42
            )
        )
    ]
)


# ============================================
# 6. TRAIN MODEL
# ============================================

print("Training TerraFore model...")

model.fit(X_train, y_train)

print("Training completed!")


# ============================================
# 7. SAVE MODEL
# ============================================

model_filename = "terrafore_model.pkl"

joblib.dump(model, model_filename)

print(f"Model saved as: {model_filename}")


# ============================================
# 8. NEW PROJECT INPUT
# ============================================

new_project = pd.DataFrame([
    {
        "project_type": "Expressway",
        "state": "Tamil Nadu",
        "land_area_acres": 120.0,
        "affected_families": 85,
        "documentation_completion_pct": 45.0,
        "compensation_completion_pct": 30.0,
        "legal_disputes": 3,
        "approval_completion_pct": 55.0,
        "possession_completion_pct": 25.0,
        "rehabilitation_completion_pct": 20.0,
        "stakeholder_responsiveness": "Low"
    }
])


# ============================================
# 9. MAKE PREDICTION
# ============================================

prediction = model.predict(new_project)[0]

probability = model.predict_proba(new_project)[0][1]

probability_percentage = probability * 100


# ============================================
# 10. DETERMINE RISK LEVEL
# ============================================

if probability_percentage < 30:
    risk_level = "LOW"

elif probability_percentage < 60:
    risk_level = "MEDIUM"

else:
    risk_level = "HIGH"


# ============================================
# 11. DISPLAY RESULT
# ============================================

print("\n" + "=" * 60)
print("TERRAFOR PREDICTION")
print("=" * 60)

print(f"Prediction       : {'DELAYED' if prediction == 1 else 'NOT DELAYED'}")
print(f"Delay Probability: {probability_percentage:.2f}%")
print(f"Risk Level       : {risk_level}")

print("=" * 60)