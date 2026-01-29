import { fetchSheetValues, toObjects } from "./sheets";
import type { ValveRecord } from "./types";

type CacheEntry = {
  data: ValveRecord[];
  fetchedAt: number;
};

let cache: CacheEntry | null = null;
let zoneSheetCache: Record<string, string>[] | null = null; // Store raw Zone Sheet data
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Join Valve Sheet and Zone Sheet data
 */
async function fetchAndJoinData(): Promise<ValveRecord[]> {
  try {
    // Fetch both sheets
    const valveValues = await fetchSheetValues("Valve Sheet");
    const zoneValues = await fetchSheetValues("Zone Sheet");

    if (valveValues.length === 0) {
      throw new Error("Valve Sheet is empty");
    }

  // Convert to objects
  const valveObjects = toObjects(valveValues);
  const zoneObjects = toObjects(zoneValues);
  
  // Cache the raw Zone Sheet data for lot-to-zone lookups
  zoneSheetCache = zoneObjects;

  // Validate headers
  const valveHeaders = valveValues[0].map((h) => h.trim());
  const zoneHeaders = zoneValues[0].map((h) => h.trim());

  if (!valveHeaders.includes("Valve")) {
    throw new Error('Valve Sheet must have a "Valve" column');
  }
  if (!zoneHeaders.includes("Valve")) {
    throw new Error('Zone Sheet must have a "Valve" column');
  }
  if (!zoneHeaders.includes("Zone")) {
    throw new Error('Zone Sheet must have a "Zone" column');
  }
  if (!zoneHeaders.includes("Lot #")) {
    throw new Error('Zone Sheet must have a "Lot #" column');
  }

  // Build map of valve -> zones and lots
  const valveZoneMap = new Map<string, { zones: Set<string>; lots: Set<string> }>();
  let orphanedZoneRows = 0;

  for (const zoneRow of zoneObjects) {
    const valveId = zoneRow["Valve"]?.trim();
    if (!valveId) continue;

    // Check if valve exists in Valve Sheet
    const valveExists = valveObjects.some(
      (v) => v["Valve"]?.trim() === valveId
    );

    if (!valveExists) {
      orphanedZoneRows++;
      continue;
    }

    if (!valveZoneMap.has(valveId)) {
      valveZoneMap.set(valveId, { zones: new Set(), lots: new Set() });
    }

    const entry = valveZoneMap.get(valveId)!;
    if (zoneRow["Zone"]) {
      entry.zones.add(zoneRow["Zone"].trim());
    }
    if (zoneRow["Lot #"]) {
      entry.lots.add(zoneRow["Lot #"].trim());
    }
  }

  if (orphanedZoneRows > 0) {
    console.warn(
      `Found ${orphanedZoneRows} Zone Sheet rows referencing valves not in Valve Sheet`
    );
  }

  // Build final ValveRecord array
  const valveRecords: ValveRecord[] = valveObjects.map((valve) => {
    const valveId = valve["Valve"]?.trim() || "";
    const zoneEntry = valveZoneMap.get(valveId) || {
      zones: new Set<string>(),
      lots: new Set<string>(),
    };

    return {
      valveId,
      location: valve["Location"]?.trim() || "",
      locationNotes: valve["Location Notes"]?.trim() || "",
      function: valve["Function"]?.trim() || "",
      zones: Array.from(zoneEntry.zones).sort(),
      lots: Array.from(zoneEntry.lots).sort(),
    };
  });

    return valveRecords;
  } catch (error: any) {
    console.error("Error in fetchAndJoinData:", error);
    throw new Error(`Failed to process valve data: ${error.message || error}`);
  }
}

/**
 * Get valve data with caching
 * Returns cached data if available and fresh, otherwise fetches new data
 * On fetch error, returns stale cache if available
 */
export async function getValveData(): Promise<{
  data: ValveRecord[];
  updatedAt: number;
  stale: boolean;
}> {
  const now = Date.now();

  // Check if cache is valid
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      data: cache.data,
      updatedAt: cache.fetchedAt,
      stale: false,
    };
  }

  // Try to fetch new data
  try {
    const newData = await fetchAndJoinData();
    cache = {
      data: newData,
      fetchedAt: now,
    };
    return {
      data: newData,
      updatedAt: now,
      stale: false,
    };
  } catch (error) {
    console.error("Error fetching valve data:", error);

    // Return stale cache if available
    if (cache) {
      console.warn("Returning stale cache due to fetch error");
      return {
        data: cache.data,
        updatedAt: cache.fetchedAt,
        stale: true,
      };
    }

    // No cache available, rethrow error
    throw error;
  }
}

/**
 * Get a single valve by ID
 */
export async function getValveById(
  valveId: string
): Promise<ValveRecord | null> {
  const { data } = await getValveData();
  return data.find((v) => v.valveId === valveId) || null;
}

/**
 * Get zones for a specific lot from Zone Sheet
 * Returns the exact zone(s) that lot belongs to
 */
export async function getZonesForLot(lotNumber: string): Promise<string[]> {
  // Ensure data is loaded
  await getValveData();
  
  if (!zoneSheetCache) {
    // Re-fetch if cache is missing
    const zoneValues = await fetchSheetValues("Zone Sheet");
    zoneSheetCache = toObjects(zoneValues);
  }
  
  const zones = new Set<string>();
  for (const row of zoneSheetCache) {
    const lot = row["Lot #"]?.trim();
    const zone = row["Zone"]?.trim();
    if (lot && zone && lot.toLowerCase() === lotNumber.toLowerCase()) {
      zones.add(zone);
    }
  }
  
  return Array.from(zones).sort();
}

/**
 * Get lots for a specific zone from Zone Sheet
 * Returns all lots that belong to this zone
 */
export async function getLotsForZone(zoneName: string): Promise<string[]> {
  // Ensure data is loaded
  await getValveData();
  
  if (!zoneSheetCache) {
    // Re-fetch if cache is missing
    const zoneValues = await fetchSheetValues("Zone Sheet");
    zoneSheetCache = toObjects(zoneValues);
  }
  
  const lots = new Set<string>();
  for (const row of zoneSheetCache) {
    const lot = row["Lot #"]?.trim();
    const zone = row["Zone"]?.trim();
    if (lot && zone && zone.toLowerCase() === zoneName.toLowerCase()) {
      lots.add(lot);
    }
  }
  
  return Array.from(lots).sort();
}
