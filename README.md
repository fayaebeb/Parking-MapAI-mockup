# MapAI (Frontend-only mock)

MapAI is a frontend-only React app that mocks a “Dynamic Pricing Parking Lot System” to visualize overtourism congestion
near **Otaru Canal, Hokkaido**. It uses **MapLibre GL** with synthetic time-series data (no backend).

## Run

```bash
npm install
npm run dev
```

## What’s inside

- Landing screen with **Current** (placeholder) and **Future** (simulation).
- Simulation page:
  - Left: scripted chat UI (buttons appear step-by-step).
  - Right: map with:
    - 250m mesh polygon layer (heat-style congestion)
    - parking lots (occupancy + price popups)
    - timeline slider (15-minute steps)
- Dynamic pricing mode with three mock cases + explanation panel.
- “Generate Report” downloads an **HTML report** with **before/after map screenshots** (print-to-PDF supported).

## Notes

- All data is synthetic and deterministic (generated in code).
- Screenshots use the MapLibre canvas export (`toDataURL`). Some browsers/styles may omit the base map due to cross-origin restrictions.
