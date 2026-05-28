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

## GitHub Pages + External API

GitHub Pages hosts only static files. The `/api` routes in `server.js` must run on a separate Node host.

1. Deploy backend (`server.js`) to a Node platform such as Render/Railway/Fly.io.
2. Set backend environment variable `CORS_ORIGIN` to your Pages origin:
   `https://mrudangvyas.github.io`
3. In GitHub repository settings, add variable:
   `VITE_API_BASE_URL=https://<your-backend-domain>`
   Example: `https://satroster-api.onrender.com`
4. Push to `main` (or rerun Actions) so Pages rebuilds with that API URL.
