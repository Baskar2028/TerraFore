# TerraFore — Frontend Interface

TerraFore is an enterprise-grade Land Acquisition Intelligence platform designed for infrastructure project decision support, geospatial risk monitoring, and explainable ML delay risk assessment.

This directory (`interface/`) houses the complete React.js + Vite frontend application.

---

## 🚀 Quick Start

### 1. Installation

Navigate into the `interface` directory and install the necessary dependencies:

```bash
cd interface
npm install
```

### 2. Environment Configuration

Copy the example environment configuration file:

```bash
cp .env.example .env
```

Ensure your `.env` contains the location of your running FastAPI server:

```env
VITE_API_URL=http://127.0.0.1:8000
```

> **Note:** The existing TerraFore FastAPI backend must already be running (typically via `uvicorn api:app --reload` in the project root). The frontend communicates with the model via `POST /predict`.

### 3. Run Development Server

Start the local Vite development server:

```bash
npm run dev
```

By default, Vite will start the frontend at:
`http://localhost:5173`

---

## 🏛️ System Architecture

```text
React Frontend (Vite + React Router)
              ↓
  Existing FastAPI API (:8000)
              ↓
  Existing ML Classifier + SHAP
```

* **Frontend Only**: This project only handles presentation, interactive GIS mapping, state management, and user interaction. It does not replace or modify the machine learning backend.
* **Resilient API Handling**: If the FastAPI server is not currently reachable, the frontend remains fully functional and presents actionable status feedback without crashing. A built-in benchmark reference mode is available to inspect decision flow immediately.

---

## 🗺️ Application Routes

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Land Acquisition Intelligence KPIs, Risk Distribution, System Intelligence status, and Recent Assessments. |
| `/predict` | **Risk Assessment** | Primary functional assessment form sending the 11 contract features to `POST /predict`, rendering Prediction, Probability, SHAP Factor Cards, and Priority Actions. |
| `/gis` | **GIS Mapping** | Interactive Leaflet map displaying linear corridor pins across Indian states with risk filtering (ALL, LOW, MEDIUM, HIGH) and popups. |
| `/projects` | **Projects Directory** | Searchable and filterable infrastructure portfolio register. |
| `/inbox` | **Coordination Inbox** | Inter-agency notices and field communications between acquisition and rehabilitation units. |
| `/alerts` | **Alerts** | Severity-tiered notifications for critical delay probability thresholds and milestones. |
| `/analytics` | **Portfolio Analytics** | Macro portfolio indicators, velocity metrics, and inter-state risk distributions. |
| `/profile` | **Officer Profile** | Chief Land Acquisition Officer credentials and statutory authority scope. |
| `/settings` | **Settings** | Light and Dark mode appearance controls with `localStorage` persistence. |

---

## 🎨 Theme & Styling

TerraFore utilizes the **Terra + Intelligence** palette:
* **Light Theme**: Warm ivory/off-white background, deep forest green accents, refined teal intelligence highlights, muted gold status tones, and soft grays.
* **Dark Theme**: Sophisticated deep forest slate, high-contrast typography, and reduced glare for operations centers.
* **Zero Tailwind / Pure Vanilla CSS**: Styled with structured tokens defined in `src/styles.css`.

---

## 📦 Tech Stack

* **Core**: React 19, JavaScript, Vite
* **Routing**: React Router DOM (v7)
* **HTTP Client**: Axios
* **Geospatial**: Leaflet & React Leaflet
* **Iconography**: Lucide React
