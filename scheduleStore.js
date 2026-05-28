import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILES = [
  "Updated_Saturday_Only_2026.xlsx",
  "Saturday_Roster_2027_2031.xlsx",
];

const HEADER = [
  "Date",
  "Day",
  "Month",
  "Year",
  "WeekOfMonth",
  "Charts + Minima+Mint+ENR",
  "NFP+NOTAM+AODB",
  "NAV+, OBST team",
  "AIP capture ",
  "Geo",
  "Hitech",
];

const DATA_DIR = path.join(__dirname, "data");

function loadWorkbookRows(filename) {
  const workbook = xlsx.readFile(path.join(DATA_DIR, filename), {
    raw: false,
    dateNF: "yyyy-mm-dd",
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });
  return rows
    .slice(1)
    .filter((row) =>
      row.some((value) => value !== undefined && value !== null && String(value).trim() !== ""),
    );
}

function normalizeRow(row) {
  return HEADER.map((_, index) => {
    const value = row[index];
    return value === undefined || value === null ? "" : String(value).trim();
  });
}

function csvEscape(value) {
  const sanitized = String(value).replace(/\r?\n/g, " ");
  const needsQuote = /[",]/.test(sanitized);
  const escaped = sanitized.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function buildScheduleMap() {
  const yearRows = {};
  DATA_FILES.forEach((file) => {
    const rows = loadWorkbookRows(file);
    rows.forEach((row) => {
      const normalized = normalizeRow(row);
      const year = normalized[3];
      if (!year) return;
      yearRows[year] = yearRows[year] ?? [];
      yearRows[year].push(normalized);
    });
  });

  const csvByYear = {};
  Object.entries(yearRows).forEach(([year, rows]) => {
    const csvLines = [HEADER, ...rows].map((row) =>
      row.map((cell) => csvEscape(cell)).join(","),
    );
    csvByYear[year] = csvLines.join("\n");
  });
  return csvByYear;
}

export const scheduleCsvByYear = buildScheduleMap();
export const availableScheduleYears = Object.keys(scheduleCsvByYear).sort();
