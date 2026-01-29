"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ValveRecord } from "@/lib/types";

type ValvesResponse = {
  updatedAt: number;
  stale: boolean;
  count: number;
  valves: ValveRecord[];
};

export default function Home() {
  const [data, setData] = useState<ValvesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zonesForSearchedLot, setZonesForSearchedLot] = useState<string[]>([]);
  const [lotsForSearchedZone, setLotsForSearchedZone] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/valves")
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.error || `HTTP ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching valves:", err);
        setError(err.message || "Failed to load valves");
        setLoading(false);
      });
  }, []);

  // Fetch zones for searched lot
  useEffect(() => {
    if (searchQuery.trim() && data?.valves) {
      // Check if search query matches a lot number
      const isLotSearch = data.valves.some(valve => 
        valve.lots.some(lot => lot.toLowerCase() === searchQuery.trim().toLowerCase())
      );
      
      if (isLotSearch) {
        fetch(`/api/valves?lot=${encodeURIComponent(searchQuery.trim())}`)
          .then((res) => res.json())
          .then((result) => {
            if (result.zones) {
              setZonesForSearchedLot(result.zones);
            }
          })
          .catch((err) => {
            console.error("Error fetching zones for lot:", err);
            setZonesForSearchedLot([]);
          });
      } else {
        setZonesForSearchedLot([]);
      }
    } else {
      setZonesForSearchedLot([]);
    }
  }, [searchQuery, data]);

  // Fetch lots for searched zone
  useEffect(() => {
    if (searchQuery.trim() && data?.valves) {
      // Check if search query matches a zone
      const isZoneSearch = data.valves.some(valve => 
        valve.zones.some(zone => zone.toLowerCase() === searchQuery.trim().toLowerCase())
      );
      
      if (isZoneSearch) {
        fetch(`/api/valves?zone=${encodeURIComponent(searchQuery.trim())}`)
          .then((res) => res.json())
          .then((result) => {
            if (result.lots) {
              setLotsForSearchedZone(result.lots);
            }
          })
          .catch((err) => {
            console.error("Error fetching lots for zone:", err);
            setLotsForSearchedZone([]);
          });
      } else {
        setLotsForSearchedZone([]);
      }
    } else {
      setLotsForSearchedZone([]);
    }
  }, [searchQuery, data]);

  // Find all matching valves, zones, and lots based on search query
  const searchResults = useMemo(() => {
    if (!data?.valves || !searchQuery.trim()) {
      return { valves: [], zones: [], lots: [], primaryZones: [] as string[], singleValveLookup: false };
    }

    const query = searchQuery.trim();
    const queryLower = query.toLowerCase();
    const matchingValves: ValveRecord[] = [];
    const matchingZones = new Set<string>();
    const matchingLots = new Set<string>();
    const foundValveIds = new Set<string>();
    const foundZones = new Set<string>();
    const foundLots = new Set<string>();
    const primaryZones = new Set<string>();

    // First pass: Find exact matches
    data.valves.forEach((valve) => {
      // Exact valve ID match (case-insensitive but exact, not substring)
      if (valve.valveId.toLowerCase() === queryLower) {
        foundValveIds.add(valve.valveId);
        matchingValves.push(valve);
        valve.zones.forEach((z) => {
          foundZones.add(z);
          primaryZones.add(z); // This valve directly serves these zones — only these are "in scope"
        });
        valve.lots.forEach((l) => foundLots.add(l));
      }

      // Exact zone match (case-insensitive)
      // Normalize both query and zone to "Z1" format for comparison
      // "Zone 1", "zone 1", "Z1", "z1" all normalize to "z1"
      const normalizeZone = (str: string): string => {
        const lower = str.toLowerCase().trim();
        // Extract number from "Zone 1", "zone 1", "Z1", "z1"
        const numMatch = lower.match(/(?:zone\s+)?(\d+)/) || lower.match(/z(\d+)/);
        return numMatch ? `z${numMatch[1]}` : lower;
      };
      
      const normalizedQueryZone = normalizeZone(query);
      
      valve.zones.forEach((zone) => {
        const normalizedZone = normalizeZone(zone);
        if (normalizedZone === normalizedQueryZone) {
          foundZones.add(zone);
          matchingZones.add(zone);
          primaryZones.add(zone);
        }
      });

      // Exact lot match (case-insensitive)
      valve.lots.forEach((lot) => {
        if (lot.toLowerCase() === queryLower) {
          foundLots.add(lot);
          matchingLots.add(lot);
        }
      });

      // Location or function search (substring is ok for these)
      if (
        valve.location.toLowerCase().includes(queryLower) ||
        valve.locationNotes.toLowerCase().includes(queryLower) ||
        valve.function.toLowerCase().includes(queryLower)
      ) {
        matchingValves.push(valve);
      }
    });

    // Second pass: Find related valves (valves that share zones or lots with found valves)
    if (foundValveIds.size > 0 || foundZones.size > 0 || foundLots.size > 0) {
      data.valves.forEach((valve) => {
        if (foundValveIds.has(valve.valveId)) return;
        const sharesZone = valve.zones.some((z) => foundZones.has(z));
        const sharesLot = valve.lots.some((l) => foundLots.has(l));
        if (sharesZone || sharesLot) matchingValves.push(valve);
      });
    }

    const uniqueValves = Array.from(
      new Map(matchingValves.map((v) => [v.valveId, v])).values()
    );

    // User looked up a single valve by ID → one valve can never completely shut off a zone (Zone Sheet: each zone has 2–3 valves)
    const singleValveLookup = foundValveIds.size === 1;

    return {
      valves: uniqueValves,
      zones: Array.from(matchingZones),
      lots: Array.from(matchingLots),
      primaryZones: Array.from(primaryZones),
      singleValveLookup,
    };
  }, [data?.valves, searchQuery]);

  const hasSearchResults = searchQuery.trim().length > 0;

  // Natural numeric sort function
  const naturalSort = (a: string, b: string): number => {
    // Extract numbers and text parts
    const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
    const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
    
    if (numA !== numB) {
      return numA - numB;
    }
    // If numbers are equal, sort alphabetically
    return a.localeCompare(b);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-white">Loading valves...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-red-300">{error}</p>
          <p className="text-sm text-red-400 mt-4">
            Make sure the Excel file exists at: <code className="bg-gray-800 px-2 py-1 rounded text-gray-300">data/Master Zone & Valve Database.xlsx</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-gray-900 rounded-lg shadow-xl min-h-screen p-8 border border-gray-800">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">JoJoba Hills SKP Maintenance Dept.</h1>
        <p className="text-gray-400">
          Enter a valve ID, zone, or lot number to find all related information
        </p>
        {data?.stale && (
          <p className="text-sm text-yellow-400 mt-2">
            ⚠️ Showing cached data (last updated:{" "}
            {new Date(data.updatedAt).toLocaleString()})
          </p>
        )}
      </div>

      {/* Valve, Zone, and Search - All on one line */}
      {data?.valves && data.valves.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Valve Dropdown */}
            <div className="flex-1 md:flex-none md:w-48">
              <label htmlFor="valve-select" className="block text-sm font-medium mb-1 text-gray-300">
                Select a Valve
              </label>
              <select
                id="valve-select"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-base border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
              >
                <option value="" className="bg-gray-800 text-gray-400">-- Select valve --</option>
                {Array.from(
                  new Map(data.valves.map((v) => [v.valveId, v])).values()
                )
                  .sort((a, b) => naturalSort(a.valveId, b.valveId))
                  .map((valve, index) => (
                    <option 
                      key={`${valve.valveId}-${index}`} 
                      value={valve.valveId}
                      className="bg-gray-800 text-white"
                    >
                      {valve.valveId}
                    </option>
                  ))}
              </select>
            </div>

            {/* Zone Dropdown */}
            <div className="flex-1 md:flex-none md:w-48">
              <label htmlFor="zone-select" className="block text-sm font-medium mb-1 text-gray-300">
                Select a Zone
              </label>
              <select
                id="zone-select"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-base border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
              >
                <option value="" className="bg-gray-800 text-gray-400">-- Select zone --</option>
                {Array.from(
                  new Set(
                    data.valves.flatMap((v) => v.zones).filter((z) => z)
                  )
                )
                  .sort((a, b) => naturalSort(a, b))
                  .map((zone, index) => (
                    <option 
                      key={`zone-${zone}-${index}`} 
                      value={zone}
                      className="bg-gray-800 text-white"
                    >
                      {zone}
                    </option>
                  ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-1 md:flex-none md:w-64">
              <label htmlFor="search" className="block text-sm font-medium mb-1">
                Or search
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zone, lot, or location..."
                className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearchResults && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 border-2 border-gray-600 rounded-lg p-6 shadow-md">
            <div className="space-y-4">
              {/* Header */}
              <div className="border-b border-gray-600 pb-2">
                <p className="text-base font-semibold text-white">
                  Found <span className="text-lg text-blue-400">{searchResults.valves.length}</span> valve
                  {searchResults.valves.length !== 1 ? "s" : ""}
                  {searchResults.zones.length > 0 && (
                    <> in <span className="text-lg text-blue-400">{searchResults.zones.length}</span> zone{searchResults.zones.length !== 1 ? "s" : ""}</>
                  )}
                  {searchResults.lots.length > 0 && (
                    <> across <span className="text-lg text-blue-400">{searchResults.lots.length}</span> lot{searchResults.lots.length !== 1 ? "s" : ""}</>
                  )}
                </p>
              </div>
              
              {searchResults.valves.length > 0 && (() => {
                // Collect all zones and lots from the matching valves
                const allZones = new Set<string>();
                const allLots = new Set<string>();
                const valveIds = new Set(searchResults.valves.map(v => v.valveId));
                
                searchResults.valves.forEach(valve => {
                  valve.zones.forEach(zone => allZones.add(zone));
                  valve.lots.forEach(lot => allLots.add(lot));
                });
                
                // Only show zones that the searched item actually serves (e.g. V1 → Z3 and Z4 only, not Z1/Z2)
                const zonesInScope: string[] =
                  searchResults.primaryZones.length > 0
                    ? [...searchResults.primaryZones].sort((a, b) => naturalSort(a, b))
                    : zonesForSearchedLot.length > 0
                    ? [...zonesForSearchedLot].sort((a, b) => naturalSort(a, b))
                    : Array.from(allZones).sort((a, b) => naturalSort(a, b));
                
                // Determine which zones (in scope only) are completely shut off vs affected
                const completelyShutOffZones = new Set<string>();
                const affectedZones = new Set<string>();
                const hasMultipleValves = valveIds.size > 1;
                
                zonesInScope.forEach(zone => {
                  const valvesForZone = data!.valves.filter(valve => valve.zones.includes(zone));
                  const allValvesClosed = valvesForZone.every(valve => valveIds.has(valve.valveId));
                  if (hasMultipleValves && allValvesClosed && valvesForZone.length > 0) {
                    completelyShutOffZones.add(zone);
                  } else if (valvesForZone.some(valve => valveIds.has(valve.valveId))) {
                    affectedZones.add(zone);
                  }
                });
                
                const completelyShutOffArray = Array.from(completelyShutOffZones).sort();
                const affectedZonesArray = Array.from(affectedZones).sort();
                
                // Lots in scope = lots from valves that serve zones in scope
                // But when searching a zone, we want to separate:
                // - Lots IN that zone (from Zone Sheet - shown separately)
                // - Affected lots from OTHER zones that share valves
                const lotsInScope = new Set<string>();
                searchResults.valves.forEach(valve => {
                  const valveServesScope = valve.zones.some(z => zonesInScope.includes(z));
                  if (valveServesScope) valve.lots.forEach(lot => lotsInScope.add(lot));
                });
                
                // When searching a zone, filter out lots that are IN that zone (they're shown in "Lots in Zone")
                // Affected lots = lots from other zones that share valves with the searched zone
                let affectedLotsArray = Array.from(lotsInScope);
                if (lotsForSearchedZone.length > 0) {
                  // Remove lots that are already in the searched zone
                  const lotsInZoneSet = new Set(lotsForSearchedZone.map(l => l.toLowerCase()));
                  affectedLotsArray = affectedLotsArray.filter(lot => 
                    !lotsInZoneSet.has(lot.toLowerCase())
                  );
                }
                affectedLotsArray.sort((a, b) => naturalSort(a, b));
                
                // Valves by zone — only for zones in scope
                const valvesByZone: { zone: string; valves: string[] }[] = zonesInScope.map(zone => ({
                  zone,
                  valves: searchResults.valves
                    .filter(v => v.zones.includes(zone))
                    .map(v => v.valveId)
                    .sort((a, b) => naturalSort(a, b)),
                }));
                
                return (
                  <div className="space-y-3">
                    {/* Shutoff Instructions */}
                    <div className="bg-gray-800 rounded-lg p-4 border-2 border-red-500 shadow-sm">
                      <p className="text-base font-bold text-white mb-2">
                        ⚠️ Shutoff Instructions:
                      </p>
                      <div className="bg-gray-700/50 rounded-lg p-3 mb-3 border border-gray-600">
                        <p className="text-sm font-semibold text-gray-200 mb-1">How lots, valves, and zones work:</p>
                        <p className="text-sm text-gray-300">
                          Each of these valves serves at least one of the same zones or lots. So they’re on the same water circuit—closing one may affect pressure in those areas, but to fully shut off a zone you must close every valve that feeds that zone.
                        </p>
                      </div>
                      {searchResults.lots.length > 0 && zonesForSearchedLot.length > 0 && (
                        <>
                          <p className="text-sm font-semibold text-gray-200 mb-2">
                            Lot {searchResults.lots[0]} is in zone{zonesForSearchedLot.length > 1 ? 's' : ''}: <span className="text-blue-400 font-bold">{zonesForSearchedLot.join(', ')}</span>
                          </p>
                          <p className="text-sm font-semibold text-gray-200 mb-2">
                            To completely shut off Lot {searchResults.lots[0]}, close these valves:
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {searchResults.valves.map(valve => (
                              <button
                                key={valve.valveId}
                                type="button"
                                onClick={() => setSearchQuery(valve.valveId)}
                                className="px-3 py-1.5 bg-slate-600 text-white font-bold rounded-lg text-sm hover:bg-slate-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                              >
                                {valve.valveId}
                              </button>
                            ))}
                          </div>
                          <p className="text-sm font-semibold text-gray-200 mb-2">
                            These valves are organized by zone — close all valves listed for a zone to fully shut it off:
                          </p>
                        </>
                      )}
                      {searchResults.lots.length === 0 && (
                        <p className="text-sm font-semibold text-gray-200 mb-2">
                          Valves by zone — close all valves listed for a zone to fully shut it off:
                        </p>
                      )}
                      <div className="space-y-2 mb-3">
                        {valvesByZone.map(({ zone, valves }) => (
                          <div key={zone} className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSearchQuery(zone)}
                              className="text-sm font-medium text-gray-300 shrink-0 hover:text-white cursor-pointer underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                            >
                              {zone}:
                            </button>
                            <div className="flex flex-wrap gap-2">
                              {valves.map(valveId => (
                                <button
                                  key={valveId}
                                  type="button"
                                  onClick={() => setSearchQuery(valveId)}
                                  className="px-3 py-1.5 bg-slate-600 text-white font-bold rounded-lg text-sm hover:bg-slate-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                                >
                                  {valveId}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Completely Shut Off Zones — only when multiple valves are in play (one valve alone never fully shuts off a zone) */}
                    {!searchResults.singleValveLookup && completelyShutOffArray.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4 border-2 border-red-500 bg-red-900/20">
                        <p className="text-base font-bold text-white mb-1">
                          🔴 Completely Shut Off Zones ({completelyShutOffArray.length}):
                        </p>
                        <p className="text-xs text-gray-300 mb-2">
                          Closing all valves listed above for these zones will completely shut off water to them.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {completelyShutOffArray.map(zone => (
                            <button
                              key={zone}
                              type="button"
                              onClick={() => setSearchQuery(zone)}
                              className="px-3 py-1 bg-red-600 text-white font-bold rounded-md border-2 border-red-400 hover:bg-red-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                            >
                              {zone}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Affected Zones - Pressure impacted but not fully shut off */}
                    {affectedZonesArray.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500 bg-yellow-900/20">
                        <p className="text-base font-bold text-white mb-1">
                          ⚡ Affected Zones ({affectedZonesArray.length}):
                        </p>
                        <p className="text-xs text-gray-300 mb-2">
                          Water pressure in these zones may be affected, but they are not completely shut off. Additional valves may need to be closed to fully shut off these zones.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {affectedZonesArray.map(zone => (
                            <button
                              key={zone}
                              type="button"
                              onClick={() => setSearchQuery(zone)}
                              className="px-3 py-1 bg-yellow-600 text-white font-medium rounded-md border border-yellow-400 hover:bg-yellow-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                            >
                              {zone}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Lots in Zone - Show actual lots from Zone Sheet */}
                    {lotsForSearchedZone.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4 border-2 border-green-500 bg-green-900/20">
                        <p className="text-base font-bold text-white mb-1">
                          📍 Lots in Zone {searchResults.zones[0]} ({lotsForSearchedZone.length}):
                        </p>
                        <p className="text-xs text-gray-300 mb-2">
                          These are all the lots that belong to this zone (from Zone Sheet).
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                          {lotsForSearchedZone.map(lot => (
                            <button
                              key={lot}
                              type="button"
                              onClick={() => setSearchQuery(lot)}
                              className="px-3 py-1 bg-green-600 text-white font-medium rounded-md border border-green-400 hover:bg-green-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                            >
                              {lot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Affected Lots - Lots from other zones that share valves (pressure affected but not fully shut off) */}
                    {affectedLotsArray.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500 bg-yellow-900/20">
                        <p className="text-base font-bold text-white mb-1">
                          ⚡ Affected Lots ({affectedLotsArray.length}):
                        </p>
                        <p className="text-xs text-gray-300 mb-2">
                          {lotsForSearchedZone.length > 0 
                            ? `These lots are in other zones that share valves with Zone ${searchResults.zones[0]}. Water pressure may be affected, but they are not in this zone.`
                            : `These lots are connected to the valves above. Water pressure may be affected, but additional valves may be required to fully shut off all lots.`
                          }
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                          {affectedLotsArray.map(lot => (
                            <button
                              key={lot}
                              type="button"
                              onClick={() => setSearchQuery(lot)}
                              className="px-3 py-1 bg-yellow-600 text-white font-medium rounded-md border border-yellow-400 hover:bg-yellow-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                            >
                              {lot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Matching Zones */}
          {searchResults.zones.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3 text-white">Matching Zones</h2>
              <div className="flex flex-wrap gap-2">
                {searchResults.zones.map((zone) => (
                  <span
                    key={zone}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium"
                  >
                    {zone}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matching Lots */}
          {searchResults.lots.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3 text-white">Matching Lots</h2>
              <div className="flex flex-wrap gap-2">
                {searchResults.lots.map((lot) => (
                  <button
                    key={lot}
                    type="button"
                    onClick={() => setSearchQuery(lot)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                  >
                    Lot {lot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Valves */}
          {searchResults.valves.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Related Valves</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.valves.map((valve) => (
                  <div
                    key={valve.valveId}
                    className="p-5 border-2 border-gray-700 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all bg-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => setSearchQuery(valve.valveId)}
                      className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                    >
                      <div className="font-bold text-xl text-blue-400 mb-3 hover:text-blue-300">
                        {valve.valveId}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-300">Location:</span>
                          <div className="text-white">{valve.location || "N/A"}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-300">Function:</span>
                          <div className="text-white">{valve.function || "N/A"}</div>
                        </div>
                        {valve.zones.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-300">Zones:</span>
                            <div className="text-white">
                              {valve.zones.join(", ")}
                            </div>
                          </div>
                        )}
                        {valve.lots.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-300">Lots:</span>
                            <div className="text-white">
                              {valve.lots.join(", ")}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="mt-4">
                      <Link
                        href={`/valves/${encodeURIComponent(valve.valveId)}`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-gray-300 text-lg">
                No valves found matching "{searchQuery}"
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Try searching by valve ID, zone name, or lot number
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasSearchResults && (
        <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-300 text-lg mb-2">
            Enter a search term above to get started
          </p>
          <p className="text-gray-400 text-sm">
            Search by valve ID, zone, or lot number to see all related information
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
