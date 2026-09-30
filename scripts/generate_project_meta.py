"""Generate SYNTHETIC companion metadata (names, districts, coordinates, dates,
forest-clearance flags) for every project in terrafore_synthetic_dataset.csv.

All output is fictional. The forest flag is rule-based and is NOT a model feature.
Run from repo root:  python scripts/generate_project_meta.py
"""
import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

random.seed(42)
ROOT = Path(__file__).resolve().parent.parent

# state -> [(district HQ, lat, lng), ...]  (approximate coordinates)
DISTRICTS = {
    "Andhra Pradesh": [("Visakhapatnam", 17.69, 83.22), ("Vijayawada", 16.51, 80.65), ("Guntur", 16.31, 80.44), ("Tirupati", 13.63, 79.42), ("Kurnool", 15.83, 78.04)],
    "Assam": [("Guwahati", 26.14, 91.74), ("Dibrugarh", 27.48, 94.91), ("Jorhat", 26.75, 94.20), ("Silchar", 24.83, 92.78), ("Tezpur", 26.63, 92.80)],
    "Bihar": [("Patna", 25.59, 85.14), ("Gaya", 24.80, 85.00), ("Muzaffarpur", 26.12, 85.39), ("Bhagalpur", 25.24, 86.97), ("Darbhanga", 26.15, 85.90)],
    "Chhattisgarh": [("Raipur", 21.25, 81.63), ("Bilaspur", 22.08, 82.15), ("Durg", 21.19, 81.28), ("Korba", 22.36, 82.75), ("Jagdalpur", 19.07, 82.02)],
    "Gujarat": [("Ahmedabad", 23.02, 72.57), ("Surat", 21.17, 72.83), ("Vadodara", 22.31, 73.18), ("Rajkot", 22.30, 70.80), ("Bhavnagar", 21.76, 72.15)],
    "Haryana": [("Gurugram", 28.46, 77.03), ("Faridabad", 28.41, 77.31), ("Hisar", 29.15, 75.72), ("Karnal", 29.69, 76.99), ("Rohtak", 28.89, 76.61)],
    "Jharkhand": [("Ranchi", 23.34, 85.31), ("Dhanbad", 23.80, 86.43), ("Jamshedpur", 22.80, 86.20), ("Bokaro", 23.67, 86.15), ("Hazaribagh", 23.99, 85.36)],
    "Karnataka": [("Bengaluru Urban", 12.97, 77.59), ("Mysuru", 12.30, 76.64), ("Belagavi", 15.85, 74.50), ("Mangaluru", 12.91, 74.86), ("Kalaburagi", 17.33, 76.83)],
    "Kerala": [("Thiruvananthapuram", 8.52, 76.94), ("Kochi", 9.93, 76.27), ("Kozhikode", 11.26, 75.78), ("Thrissur", 10.53, 76.21), ("Palakkad", 10.78, 76.65)],
    "Madhya Pradesh": [("Bhopal", 23.26, 77.41), ("Indore", 22.72, 75.86), ("Jabalpur", 23.18, 79.94), ("Gwalior", 26.22, 78.18), ("Sagar", 23.84, 78.74)],
    "Maharashtra": [("Mumbai Suburban", 19.08, 72.88), ("Pune", 18.52, 73.86), ("Nagpur", 21.15, 79.09), ("Nashik", 20.00, 73.79), ("Aurangabad", 19.88, 75.34)],
    "Odisha": [("Bhubaneswar (Khordha)", 20.30, 85.82), ("Cuttack", 20.46, 85.88), ("Sambalpur", 21.47, 83.97), ("Berhampur (Ganjam)", 19.31, 84.79), ("Rourkela (Sundargarh)", 22.26, 84.85)],
    "Punjab": [("Ludhiana", 30.90, 75.86), ("Amritsar", 31.63, 74.87), ("Jalandhar", 31.33, 75.58), ("Patiala", 30.34, 76.39), ("Bathinda", 30.21, 74.95)],
    "Rajasthan": [("Jaipur", 26.91, 75.79), ("Jodhpur", 26.24, 73.02), ("Udaipur", 24.59, 73.71), ("Kota", 25.21, 75.86), ("Bikaner", 28.02, 73.31)],
    "Tamil Nadu": [("Chennai", 13.08, 80.27), ("Coimbatore", 11.02, 76.96), ("Madurai", 9.93, 78.12), ("Krishnagiri", 12.52, 78.21), ("Tiruchirappalli", 10.79, 78.70), ("Salem", 11.66, 78.15)],
    "Telangana": [("Hyderabad", 17.39, 78.49), ("Warangal", 17.97, 79.59), ("Nizamabad", 18.67, 78.09), ("Karimnagar", 18.44, 79.13), ("Khammam", 17.25, 80.15)],
    "Uttar Pradesh": [("Lucknow", 26.85, 80.95), ("Kanpur Nagar", 26.45, 80.33), ("Varanasi", 25.32, 82.97), ("Agra", 27.18, 78.01), ("Gautam Buddha Nagar", 28.54, 77.39)],
    "West Bengal": [("Kolkata", 22.57, 88.36), ("Howrah", 22.59, 88.31), ("Durgapur (Paschim Bardhaman)", 23.52, 87.31), ("Siliguri (Darjeeling)", 26.72, 88.43), ("Malda", 25.01, 88.14)],
}

NAME_STYLE = {
    "Highway": ["NH-{n} Four-Laning", "NH-{n} Bypass"],
    "Expressway": ["{d} Expressway Corridor", "{d}-Link Expressway"],
    "Railway": ["{d} New Rail Line", "{d} Rail Doubling"],
    "Metro": ["{d} Metro Line {k}"],
    "Industrial Corridor": ["{d} Industrial Corridor Node"],
    "Irrigation Project": ["{d} Canal Modernisation", "{d} Reservoir Project"],
    "Power Infrastructure": ["{d} Transmission Line", "{d} Substation Complex"],
    "Airport": ["{d} Airport Expansion"],
}
FOREST_P = {"Highway": .30, "Railway": .28, "Irrigation Project": .28, "Power Infrastructure": .26,
            "Expressway": .12, "Industrial Corridor": .08, "Airport": .06, "Metro": .005}


def main():
    df = pd.read_csv(ROOT / "terrafore_synthetic_dataset.csv")
    rows = []
    for _, r in df.iterrows():
        d, lat, lng = random.choice(DISTRICTS[r.state])
        short = d.split(" (")[0].split(" ")[0]
        tmpl = random.choice(NAME_STYLE[r.project_type])
        name = tmpl.format(n=random.choice([4, 8, 16, 27, 34, 44, 48, 52, 66]), d=short, k=random.randint(1, 4))
        name = f"{name} - {d.split(' (')[0]} Section"
        forest = random.random() < FOREST_P[r.project_type] * 0.78
        status = random.choices(["Granted", "Under Review", "Pending"], [.45, .30, .25])[0] if forest else "Not Applicable"
        notif = date(2021, 1, 1) + timedelta(days=random.randint(0, 5 * 365 - 1))
        planned = notif + timedelta(days=random.randint(2 * 365, 4 * 365))
        rows.append(dict(project_id=r.project_id, project_name=name, district=d,
                         latitude=round(lat + random.uniform(-.15, .15), 5),
                         longitude=round(lng + random.uniform(-.15, .15), 5),
                         forest_land_involved=forest, forest_clearance_status=status,
                         notification_date=notif.isoformat(), planned_completion_date=planned.isoformat()))
    out = pd.DataFrame(rows)
    out.to_csv(ROOT / "terrafore_project_meta.csv", index=False)
    print(f"wrote {len(out)} rows; forest share {out.forest_land_involved.mean():.1%}")


if __name__ == "__main__":
    main()
