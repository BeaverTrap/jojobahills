/**
 * Build map-positions.json from Zone Sheet lots.
 * Coordinates are percentage (0-100). Layout from JOJOBA_COLOR map:
 * - 100s: top-left | 200s: left-central | 300s-500s: central | 600s-900s: right
 * Run: node scripts/build-map-positions.js
 */
const path = require("path");
const fs = require("fs");

// Get lots from Zone Sheet (run get-lots-from-zone-sheet and parse, or require output)
const XLSX = require("xlsx");
const filePath = path.join(__dirname, "..", "data", "Master Zone & Valve Database.xlsx");
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames.find((n) => n.toLowerCase() === "zone sheet");
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
const header = rows[0].map((h) => String(h || "").trim());
const lotCol = header.findIndex((h) => h === "Lot #");
const lotsSet = new Set();
for (let i = 1; i < rows.length; i++) {
  const val = String(rows[i][lotCol] ?? "").trim();
  if (val) lotsSet.add(val);
}

const lots = Array.from(lotsSet).sort((a, b) => {
  const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
  const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
  return na !== nb ? na - nb : a.localeCompare(b);
});

// Assign (x, y) as percentage. Regions by hundred block (from map description).
function regionForLot(lot) {
  const num = parseInt(lot.match(/\d+/)?.[0] || "0", 10);
  if (lot === "Boondock") return { baseX: 12, baseY: 78, row: 0, col: 0 };
  if (lot === "Ranch House") return { baseX: 15, baseY: 82, row: 0, col: 0 };
  if (lot === "Club House") return { baseX: 48, baseY: 42, row: 0, col: 0 };
  if (num >= 1 && num < 200) return { baseX: 14, baseY: 24, row: 4, col: 6 };   // 003,004,101-123
  if (num >= 200 && num < 300) return { baseX: 18, baseY: 40, row: 4, col: 8 };
  if (num >= 300 && num < 400) return { baseX: 30, baseY: 26, row: 4, col: 8 };
  if (num >= 400 && num < 500) return { baseX: 38, baseY: 32, row: 5, col: 9 };
  if (num >= 500 && num < 600) return { baseX: 44, baseY: 28, row: 5, col: 10 };
  if (num >= 600 && num < 700) return { baseX: 54, baseY: 26, row: 6, col: 12 };
  if (num >= 700 && num < 800) return { baseX: 60, baseY: 20, row: 5, col: 12 };
  if (num >= 800 && num < 900) return { baseX: 64, baseY: 38, row: 3, col: 8 };
  if (num >= 900) return { baseX: 68, baseY: 16, row: 4, col: 10 };
  return { baseX: 50, baseY: 50, row: 1, col: 1 };
}

const positions = {};
lots.forEach((lot, index) => {
  const r = regionForLot(lot);
  const num = parseInt(lot.match(/\d+/)?.[0] || "0", 10);
  let col = 0, row = 0;
  if (["Boondock", "Ranch House", "Club House"].includes(lot)) {
    positions[lot] = { x: Math.round(r.baseX), y: Math.round(r.baseY) };
    return;
  }
  if (num >= 1 && num < 200) {
    const i = lots.indexOf(lot);
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 1 && n < 200; }).indexOf(lot);
    col = local % 6;
    row = Math.floor(local / 6);
  } else if (num >= 200 && num < 300) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 200 && n < 300; }).indexOf(lot);
    col = local % 8;
    row = Math.floor(local / 8);
  } else if (num >= 300 && num < 400) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 300 && n < 400; }).indexOf(lot);
    col = local % 8;
    row = Math.floor(local / 8);
  } else if (num >= 400 && num < 500) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 400 && n < 500; }).indexOf(lot);
    col = local % 9;
    row = Math.floor(local / 9);
  } else if (num >= 500 && num < 600) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 500 && n < 600; }).indexOf(lot);
    col = local % 10;
    row = Math.floor(local / 10);
  } else if (num >= 600 && num < 700) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 600 && n < 700; }).indexOf(lot);
    col = local % 12;
    row = Math.floor(local / 12);
  } else if (num >= 700 && num < 800) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 700 && n < 800; }).indexOf(lot);
    col = local % 12;
    row = Math.floor(local / 12);
  } else if (num >= 800 && num < 900) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 800 && n < 900; }).indexOf(lot);
    col = local % 8;
    row = Math.floor(local / 8);
  } else if (num >= 900) {
    const local = lots.filter((l) => { const n = parseInt(l.match(/\d+/)?.[0] || "0", 10); return n >= 900; }).indexOf(lot);
    col = local % 10;
    row = Math.floor(local / 10);
  }
  const x = Math.min(92, r.baseX + col * 3.2);
  const y = Math.min(88, r.baseY + row * 4.5);
  positions[lot] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
});

const out = {
  _comment: "x and y are percentages (0-100) of image width/height. Based on JOJOBA_COLOR map layout; fine-tune as needed.",
  lots: positions,
};
const outPath = path.join(__dirname, "..", "data", "map-positions.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log("Wrote", outPath, "with", Object.keys(positions).length, "lots.");
