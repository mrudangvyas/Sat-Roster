import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { scheduleCsvByYear, availableScheduleYears } from './scheduleStore.js';
import { airacRecordsByYear, availableAiracYears } from './airacStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6175;
const DEFAULT_YEAR = "2026";
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowAnyOrigin = allowedOrigins.length === 0;
    const isAllowedOrigin = Boolean(origin && allowedOrigins.includes(origin));

    if (allowAnyOrigin) {
        res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (isAllowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        if (allowAnyOrigin || isAllowedOrigin) {
            res.status(204).end();
            return;
        }
        res.status(403).json({ error: "CORS origin not allowed" });
        return;
    }

    next();
});


app.get('/api/schedule', (req, res) => {
    const yearParam = Array.isArray(req.query.year) ? req.query.year[0] : req.query.year;
    const requestedYear = typeof yearParam === "string" && yearParam.trim() !== "" ? yearParam : DEFAULT_YEAR;
    const fallbackYear = availableScheduleYears.includes(DEFAULT_YEAR)
        ? DEFAULT_YEAR
        : availableScheduleYears[0];
    const safeYear = availableScheduleYears.includes(requestedYear) ? requestedYear : fallbackYear;
    const csv = safeYear ? (scheduleCsvByYear[safeYear] || null) : null;
    const fallbackUsed = Boolean(safeYear && safeYear !== requestedYear);

    if (!csv) {
        res.status(404).json({
            error: "Schedule data unavailable",
            requestedYear,
            resolvedYear: safeYear || requestedYear,
            availableYears: availableScheduleYears,
        });
        return;
    }

    res.json({
        csv,
        year: safeYear || requestedYear,
        requestedYear,
        resolvedYear: safeYear || requestedYear,
        fallbackUsed,
        warning: fallbackUsed
            ? `Schedule year ${requestedYear} is unavailable. Showing ${safeYear}.`
            : null,
        availableYears: availableScheduleYears,
    });
});

app.get('/api/airac', (req, res) => {
    const yearParam = Array.isArray(req.query.year) ? req.query.year[0] : req.query.year;
    const requestedYear = typeof yearParam === "string" && yearParam.trim() !== "" ? yearParam : DEFAULT_YEAR;
    const fallbackYear = availableAiracYears.includes(DEFAULT_YEAR) ? DEFAULT_YEAR : availableAiracYears[0];
    const safeYear = availableAiracYears.includes(requestedYear) ? requestedYear : fallbackYear;
    const records = safeYear ? (airacRecordsByYear[safeYear] || []) : [];
    const fallbackUsed = Boolean(safeYear && safeYear !== requestedYear);

    res.json({
        records,
        requestedYear,
        resolvedYear: safeYear || requestedYear,
        fallbackUsed,
        warning: fallbackUsed
            ? `AIRAC year ${requestedYear} is unavailable. Showing ${safeYear}.`
            : null,
        availableYears: availableAiracYears,
    });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SatRoster 2026] Server running at http://0.0.0.0:${PORT}`);
});
