# SatRoster 2026 - LAN Deployment Guide

Professional internal scheduler optimized for DietPi (Linux) on a local network.

## Phase 1 Production Fixes Applied:
- **ESM Support**: Server runs using `import` statements natively.
- **LAN Binding**: Server binds to `0.0.0.0` for cross-device access.
- **API Architecture**: Single CSV source in `server.js` drives the entire office.
- **RFC 5545 Compliance**: ICS exports use correct exclusive end-dates.

## V2 Features Included:
- **Dependency Finder**: Planning tool for cross-team synergy.
- **Year Poster**: A3/A4 print-ready layout.
- **Pattern Engine**: Automatic logic discovery for shifts.
- **AIRAC Register Tab**: Separate read-only view for AIRAC/NON-AIRAC revisions from `AERO_Teams_Calendar_2026(AERO ).csv`.

## Deployment Instructions

### 1. Install Node.js
On DietPi: `dietpi-software install 161`

### 2. Setup
```bash
git clone [repository_url]
cd satroster-2026
npm install
npm run build
```

### 2.1 Development (single command)
```bash
npm run dev
```
This starts both:
- backend API (`server.js`) on port `6175`
- Vite frontend on port `6176` with API proxy wired automatically

### 3. Launch with PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Access
Visit `http://[DIETPI_IP]:6175` from any computer on your office LAN.

## Local Testing (Windows/Linux)

Run the app on local test port `6715` without changing production defaults:

```bash
npm run start:local
```

Access from your machine:

```text
http://localhost:6715
```

For Vite development mode with backend proxy aligned to local API port:

```bash
# single terminal (Windows cmd/npm)
npm run dev:local
```

## GitHub Pages (Static-Only Mode)

This repository can run fully on GitHub Pages without a backend service.

1. `npm run prepare:data` generates static datasets in `public/api`:
   - `schedule-by-year.json`
   - `airac-by-year.json`
2. `npm run build` runs dataset export first, then Vite build.
3. GitHub Actions deploys the static site from `dist`.

If roster source files in `data/` change, commit and push the updates; the Pages workflow will regenerate static datasets during build.
