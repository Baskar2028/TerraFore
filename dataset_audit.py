import pandas as pd

# ==============================
# LOAD DATASET
# ==============================

df = pd.read_csv("terrafore_synthetic_dataset.csv")

print("=" * 70)
print("TERRAFOR DATASET AUDIT")
print("=" * 70)

# ==============================
# 1. TARGET DISTRIBUTION
# ==============================

print("\n1. TARGET DISTRIBUTION")
print("-" * 40)

print(df["delayed"].value_counts())
print("\nPercentage:")
print(df["delayed"].value_counts(normalize=True) * 100)


# ==============================
# 2. NUMERICAL FEATURES
# ==============================

numeric_columns = [
    "land_area_acres",
    "affected_families",
    "documentation_completion_pct",
    "compensation_completion_pct",
    "legal_disputes",
    "approval_completion_pct",
    "possession_completion_pct",
    "rehabilitation_completion_pct"
]

print("\n2. NUMERICAL FEATURE RELATIONSHIP WITH DELAY")
print("-" * 40)

for column in numeric_columns:

    delayed_mean = df[df["delayed"] == 1][column].mean()
    not_delayed_mean = df[df["delayed"] == 0][column].mean()

    print(f"\n{column}")
    print(f"  Not Delayed mean : {not_delayed_mean:.2f}")
    print(f"  Delayed mean     : {delayed_mean:.2f}")


# ==============================
# 3. CATEGORICAL FEATURES
# ==============================

categorical_columns = [
    "project_type",
    "state",
    "stakeholder_responsiveness"
]

print("\n3. CATEGORICAL FEATURE RELATIONSHIP")
print("-" * 40)

for column in categorical_columns:

    print(f"\n{column}")

    table = pd.crosstab(
        df[column],
        df["delayed"],
        normalize="index"
    ) * 100

    print(table.round(2))


# ==============================
# 4. CORRELATION
# ==============================

print("\n4. NUMERICAL CORRELATION WITH DELAY")
print("-" * 40)

correlations = (
    df[numeric_columns + ["delayed"]]
    .corr()["delayed"]
    .drop("delayed")
    .sort_values()
)

print(correlations.round(3))


# ==============================
# 5. CHECK SUSPICIOUSLY STRONG RULES
# ==============================

print("\n5. SIMPLE RULE CHECKS")
print("-" * 40)

checks = {
    "Compensation < 20%":
        df["compensation_completion_pct"] < 20,

    "Possession < 20%":
        df["possession_completion_pct"] < 20,

    "Legal disputes >= 7":
        df["legal_disputes"] >= 7,

    "Stakeholder Low":
        df["stakeholder_responsiveness"] == "Low"
}

for name, condition in checks.items():

    subset = df[condition]

    if len(subset) > 0:
        delay_rate = subset["delayed"].mean() * 100

        print(
            f"{name:25} "
            f"Samples: {len(subset):4} | "
            f"Delayed: {delay_rate:6.2f}%"
        )


print("\n" + "=" * 70)
print("DATASET AUDIT COMPLETED")
print("=" * 70)