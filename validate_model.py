import pandas as pd

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline

from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report
)

# ============================================
# STEP 4: IMPROVE + VALIDATE TERRAFOR MODEL
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

# Numerical pipeline:
# Missing values → median
# Then scale the values

numerical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ]
)

# Categorical pipeline:
# Missing values → most frequent
# Then one-hot encode

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

print("=" * 60)
print("TRAIN / TEST DATA")
print("=" * 60)

print("Training samples:", len(X_train))
print("Testing samples :", len(X_test))

# ============================================
# 5. LOGISTIC REGRESSION PIPELINE
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

print("\n" + "=" * 60)
print("TRAINING MODEL")
print("=" * 60)

model.fit(X_train, y_train)

print("Model training completed!")

# ============================================
# 7. TEST MODEL
# ============================================

y_pred = model.predict(X_test)

y_probability = model.predict_proba(X_test)[:, 1]

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_probability)

print("\n" + "=" * 60)
print("TEST SET RESULTS")
print("=" * 60)

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")
print(f"ROC-AUC  : {roc_auc:.4f}")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=["Not Delayed", "Delayed"]
    )
)

# ============================================
# 8. 5-FOLD CROSS VALIDATION
# ============================================

print("\n" + "=" * 60)
print("5-FOLD CROSS VALIDATION")
print("=" * 60)

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

scoring = {
    "accuracy": "accuracy",
    "precision": "precision",
    "recall": "recall",
    "f1": "f1",
    "roc_auc": "roc_auc"
}

cv_results = cross_validate(
    model,
    X,
    y,
    cv=cv,
    scoring=scoring
)

print("\nCross-validation results:")

for metric in scoring.keys():
    scores = cv_results[f"test_{metric}"]

    print(
        f"{metric.upper():10} "
        f"Mean: {scores.mean():.4f} "
        f"Std: {scores.std():.4f}"
    )

# ============================================
# 9. FEATURE IMPORTANCE / COEFFICIENTS
# ============================================

print("\n" + "=" * 60)
print("FEATURE CONTRIBUTION")
print("=" * 60)

# Get the trained preprocessing object
trained_preprocessor = model.named_steps["preprocessor"]

# Get the trained Logistic Regression model
trained_classifier = model.named_steps["classifier"]

# Get feature names after preprocessing
feature_names = trained_preprocessor.get_feature_names_out()

# Get coefficients
coefficients = trained_classifier.coef_[0]

feature_importance = pd.DataFrame({
    "Feature": feature_names,
    "Coefficient": coefficients,
    "Absolute_Impact": abs(coefficients)
})

# Sort by strongest absolute impact
feature_importance = feature_importance.sort_values(
    by="Absolute_Impact",
    ascending=False
)

print(
    feature_importance.head(15).to_string(
        index=False
    )
)

print("\nStep 4 completed successfully!")