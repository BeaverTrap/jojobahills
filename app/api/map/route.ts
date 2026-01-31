import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export type MapPlacePosition = { x: number; y: number; icon?: string };
export type MapPositions = {
  lots: Record<string, { x: number; y: number }>;
  places: Record<string, MapPlacePosition>;
  valves: Record<string, { x: number; y: number }>;
};

const COMMENT =
  "x and y are percentages (0-100). Use /map/edit to place lots and places by clicking on the map.";

function readMapFile(filePath: string): {
  lots: Record<string, { x: number; y: number }>;
  places: Record<string, MapPlacePosition>;
  valves: Record<string, { x: number; y: number }>;
} {
  if (!fs.existsSync(filePath)) {
    return { lots: {}, places: {}, valves: {} };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as {
    lots?: Record<string, { x: number; y: number }>;
    places?: Record<string, MapPlacePosition>;
    valves?: Record<string, { x: number; y: number }>;
  };
  return {
    lots: data.lots || {},
    places: data.places || {},
    valves: data.valves || {},
  };
}

const MAP_IMAGE_FILENAME = "park_map_clean.png";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "map-positions.json");
    const data = readMapFile(filePath);
    let imageVersion = 0;
    const imagePath = path.join(process.cwd(), "public", "images", MAP_IMAGE_FILENAME);
    if (fs.existsSync(imagePath)) {
      const stat = fs.statSync(imagePath);
      imageVersion = stat.mtimeMs;
    }
    return NextResponse.json({ ...data, imageVersion });
  } catch (e) {
    console.error("Error reading map positions:", e);
    return NextResponse.json({ lots: {}, places: {}, valves: {}, imageVersion: 0 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      lots?: Record<string, { x: number; y: number }>;
      places?: Record<string, MapPlacePosition>;
      valves?: Record<string, { x: number; y: number }>;
    };
    const filePath = path.join(process.cwd(), "data", "map-positions.json");
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const existing = readMapFile(filePath);
    const lots = body.lots !== undefined ? body.lots : existing.lots;
    const places = body.places !== undefined ? body.places : existing.places;
    const valves = body.valves !== undefined ? body.valves : existing.valves;
    const payload = { _comment: COMMENT, lots, places, valves };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error writing map positions:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
