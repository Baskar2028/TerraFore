# TerraFore — Run Guide

## Backend

From the project root:

```bash
python -m pip install -r requirements.txt
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

Backend health check: `http://127.0.0.1:8000/health`

## Frontend

In a second terminal:

```bash
cd interface
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

The frontend reads `VITE_API_URL` from `interface/.env`. The default is:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Important dependency note

The supplied `terrafore_model.pkl` was serialized with scikit-learn 1.9.1, so `requirements.txt` pins that version to avoid model compatibility problems.

See README.md for the full guide (v2: auth, real data endpoints, simulator).
