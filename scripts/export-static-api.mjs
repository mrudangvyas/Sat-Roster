import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scheduleCsvByYear, availableScheduleYears } from "../scheduleStore.js";
import { airacRecordsByYear, availableAiracYears } from "../airacStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "public", "api");

const defaultYear = "2026";

fs.mkdirSync(outputDir, { recursive: true });

const schedulePayload = {
  defaultYear,
  availableYears: availableScheduleYears,
  csvByYear: scheduleCsvByYear,
  generatedAt: new Date().toISOString(),
};

const airacPayload = {
  defaultYear,
  availableYears: availableAiracYears,
  recordsByYear: airacRecordsByYear,
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(outputDir, "schedule-by-year.json"),
  JSON.stringify(schedulePayload, null, 2),
  "utf8",
);

fs.writeFileSync(
  path.join(outputDir, "airac-by-year.json"),
  JSON.stringify(airacPayload, null, 2),
  "utf8",
);

console.log("Static API datasets exported to public/api");
