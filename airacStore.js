import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const AIRAC_FILENAME = "AERO_Teams_Calendar_2026(AERO ).csv";

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const MONTH_MAP = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function parseDateToISO(rawDate) {
  const value = String(rawDate || "").trim();
  const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = MONTH_MAP[match[2]];
  if (!month) return null;
  const rawYear = match[3];
  const year =
    rawYear.length === 2 ? `20${rawYear}` : rawYear.padStart(4, "0");
  return `${year}-${month}-${day}`;
}

function normalizeStatus(rawStatus) {
  const value = String(rawStatus || "").trim().toUpperCase();
  if (value === "AIRAC") return "AIRAC";
  if (value === "NON-AIRAC") return "NON-AIRAC";
  return null;
}

function parseAiracCSVRecords(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  const teamIndex = header.findIndex((h) => h === "team name");
  const revisionIndex = header.findIndex((h) => h === "revision");
  const startIndex = header.findIndex((h) => h === "start date");
  const closeoutIndex = header.findIndex((h) => h === "closeout date");
  const statusIndex = header.findIndex((h) => h === "status");
  const cycleLengthIndex = header.findIndex((h) => h === "rev/cycle length");

  if (
    teamIndex < 0 ||
    revisionIndex < 0 ||
    startIndex < 0 ||
    closeoutIndex < 0 ||
    statusIndex < 0
  ) {
    return [];
  }

  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCSVLine(lines[i]);
    const sourceTeam = String(cells[teamIndex] || "").trim();
    const revision = String(cells[revisionIndex] || "").trim();
    const startDateISO = parseDateToISO(cells[startIndex]);
    const closeoutDateISO = parseDateToISO(cells[closeoutIndex]);
    const status = normalizeStatus(cells[statusIndex]);
    const cycleLengthRaw = String(cells[cycleLengthIndex] || "").trim();
    const cycleLength = cycleLengthRaw ? Number(cycleLengthRaw) : null;

    if (!sourceTeam || !revision || !startDateISO || !closeoutDateISO || !status) {
      continue;
    }

    records.push({
      sourceTeam,
      revision,
      startDateISO,
      closeoutDateISO,
      status,
      cycleLength: Number.isFinite(cycleLength) ? cycleLength : null,
    });
  }

  records.sort((a, b) => {
    if (a.startDateISO !== b.startDateISO) {
      return a.startDateISO.localeCompare(b.startDateISO);
    }
    if (a.sourceTeam !== b.sourceTeam) {
      return a.sourceTeam.localeCompare(b.sourceTeam);
    }
    return a.revision.localeCompare(b.revision);
  });

  return records;
}

function buildAiracRecordsByYear() {
  const filepath = path.join(DATA_DIR, AIRAC_FILENAME);
  if (!fs.existsSync(filepath)) {
    return {};
  }

  const content = fs.readFileSync(filepath, "utf8");
  const records = parseAiracCSVRecords(content);
  const byYear = {};

  records.forEach((record) => {
    const year = record.startDateISO.slice(0, 4);
    byYear[year] = byYear[year] ?? [];
    byYear[year].push(record);
  });

  return byYear;
}

export const airacRecordsByYear = buildAiracRecordsByYear();
export const availableAiracYears = Object.keys(airacRecordsByYear).sort();
