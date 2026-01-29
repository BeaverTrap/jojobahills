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

export default function ValvesPage() {
  const [data, setData] = useState<ValvesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/valves")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load valves");
        setLoading(false);
      });
  }, []);

  // Find all matching valves, zones, and lots based on search query
  const searchResults = useMemo(() => {
    if (!data?.valves || !searchQuery.trim()) {
      return { valves: [], zones: [], lots: [] };
    }

    const query = searchQuery.trim().toLowerCase();
    const matchingValves: ValveRecord[] = [];
    const matchingZones = new Set<string>();
    const matchingLots = new Set<string>();

    // Search through all valves
    data.valves.forEach((valve) => {
      let matches = false;

      // Check if valve ID matches
      if (valve.valveId.toLowerCase().includes(query)) {
        matches = true;
      }

      // Check if any zone matches
      const matchingZone = valve.zones.find((z) =>
        z.toLowerCase().includes(query)
      );
      if (matchingZone) {
        matches = true;
        matchingZones.add(matchingZone);
        // Add all valves in this zone
        data.valves.forEach((v) => {
          if (v.zones.includes(matchingZone)) {
            matchingValves.push(v);
          }
        });
      }

      // Check if any lot matches
      const matchingLot = valve.lots.find((l) =>
        l.toLowerCase().includes(query)
      );
      if (matchingLot) {
        matches = true;
        matchingLots.add(matchingLot);
        // Add all valves with this lot
        data.valves.forEach((v) => {
          if (v.lots.includes(matchingLot)) {
            matchingValves.push(v);
          }
        });
      }

      // Check other fields
      if (
        valve.location.toLowerCase().includes(query) ||
        valve.locationNotes.toLowerCase().includes(query) ||
        valve.function.toLowerCase().includes(query)
      ) {
        matches = true;
      }

      if (matches) {
        matchingValves.push(valve);
      }
    });

    // Remove duplicates
    const uniqueValves = Array.from(
      new Map(matchingValves.map((v) => [v.valveId, v])).values()
    );

    return {
      valves: uniqueValves,
      zones: Array.from(matchingZones),
      lots: Array.from(matchingLots),
    };
  }, [data?.valves, searchQuery]);

  const hasSearchResults = searchQuery.trim().length > 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading valves...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Valve & Zone Lookup</h1>
        <p className="text-gray-600">
          Enter a valve ID, zone, or lot number to find all related information
        </p>
        {data?.stale && (
          <p className="text-sm text-yellow-600 mt-2">
            ⚠️ Showing cached data (last updated:{" "}
            {new Date(data.updatedAt).toLocaleString()})
          </p>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-8">
        <label htmlFor="search" className="block text-lg font-medium mb-2">
          Search
        </label>
        <input
          id="search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter valve ID, zone, or lot number..."
          className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
        />
      </div>

      {/* Search Results */}
      {hasSearchResults && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Found <strong>{searchResults.valves.length}</strong> valve
              {searchResults.valves.length !== 1 ? "s" : ""}
              {searchResults.zones.length > 0 && (
                <> in <strong>{searchResults.zones.length}</strong> zone{searchResults.zones.length !== 1 ? "s" : ""}</>
              )}
              {searchResults.lots.length > 0 && (
                <> across <strong>{searchResults.lots.length}</strong> lot{searchResults.lots.length !== 1 ? "s" : ""}</>
              )}
            </p>
          </div>

          {/* Matching Zones */}
          {searchResults.zones.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Matching Zones</h2>
              <div className="flex flex-wrap gap-2">
                {searchResults.zones.map((zone) => (
                  <span
                    key={zone}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium"
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
              <h2 className="text-xl font-semibold mb-3">Matching Lots</h2>
              <div className="flex flex-wrap gap-2">
                {searchResults.lots.map((lot) => (
                  <span
                    key={lot}
                    className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-medium"
                  >
                    Lot {lot}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matching Valves */}
          {searchResults.valves.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Related Valves</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.valves.map((valve) => (
                  <Link
                    key={valve.valveId}
                    href={`/valves/${encodeURIComponent(valve.valveId)}`}
                    className="block p-5 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all bg-white"
                  >
                    <div className="font-bold text-xl text-blue-600 mb-3">
                      {valve.valveId}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Location:</span>
                        <div className="text-gray-900">{valve.location || "N/A"}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Function:</span>
                        <div className="text-gray-900">{valve.function || "N/A"}</div>
                      </div>
                      {valve.zones.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Zones:</span>
                          <div className="text-gray-900">
                            {valve.zones.join(", ")}
                          </div>
                        </div>
                      )}
                      {valve.lots.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Lots:</span>
                          <div className="text-gray-900">
                            {valve.lots.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 text-blue-600 text-sm font-medium">
                      View Details →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">
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
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg mb-2">
            Enter a search term above to get started
          </p>
          <p className="text-gray-400 text-sm">
            Search by valve ID, zone, or lot number to see all related information
          </p>
        </div>
      )}
    </div>
  );
}
