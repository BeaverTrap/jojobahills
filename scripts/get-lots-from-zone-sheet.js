/**
 * One-off script: read Zone Sheet from Excel and output unique Lot # values.
 * Run from park-ops: node scripts/get-lots-from-zone-sheet.js
 */
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const filePath = path.join(__dirname, "..", "data", "Master Zone & Valve Database.xlsx");
if (!fs.existsSync(filePath)) {
  console.error("File not found:", filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames.find((n) => n.toLowerCase() === "zone sheet");
if (!sheetName) {
  console.error("Zone Sheet not found");
  process.exit(1);
}

const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
const header = rows[0].map((h) => String(h || "").trim());
const lotCol = header.findIndex((h) => h === "Lot #");
if (lotCol === -1) {
  console.error('"Lot #" column not found');
  process.exit(1);
}

const lots = new Set();
for (let i = 1; i < rows.length; i++) {
  const val = String(rows[i][lotCol] ?? "").trim();
  if (val) lots.add(val);
}

const sorted = Array.from(lots).sort((a, b) => {
  const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
  const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
  return na !== nb ? na - nb : a.localeCompare(b);
});

console.log(JSON.stringify(sorted, null, 2));
