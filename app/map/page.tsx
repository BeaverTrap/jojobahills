"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ParkMap } from "@/app/components/ParkMap";

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const zoneParam = searchParams.get("zone");
  const lotParam = searchParams.get("lot");

  const [lotsForZone, setLotsForZone] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!zoneParam);
  const [showLots, setShowLots] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);
  const [showValves, setShowValves] = useState(true);

  useEffect(() => {
    if (zoneParam) {
      setLoading(true);
      fetch(`/api/valves?zone=${encodeURIComponent(zoneParam)}`)
        .then((res) => res.json())
        .then((data) => {
          setLotsForZone(data.lots || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLotsForZone([]);
      setLoading(false);
    }
  }, [zoneParam]);

  const lotsToShow = useMemo(() => {
    if (lotParam) return [lotParam];
    if (lotsForZone.length > 0) return lotsForZone;
    return [];
  }, [lotParam, lotsForZone]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Park Map</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="inline-flex items-center min-h-[44px] sm:min-h-0 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium touch-manipulation">
              ← Back to Lookup
            </Link>
            <Link href="/map/edit" className="text-sm text-amber-400 hover:text-amber-300 py-2 touch-manipulation">
              Edit positions
            </Link>
            {zoneParam && (
              <span className="text-sm text-gray-400">
                Zone {zoneParam}
              </span>
            )}
            {lotParam && (
              <span className="text-sm text-gray-400">
                Lot {lotParam}
              </span>
            )}
          </div>
        </div>

        {!zoneParam && !lotParam && (
          <p className="text-gray-400 text-sm mb-4">
            All lot numbers are shown over the map. Add <code className="bg-gray-800 px-1 rounded">?zone=Z1</code> or <code className="bg-gray-800 px-1 rounded">?lot=111</code> to highlight lots, or use <Link href="/" className="text-blue-400 hover:underline">Lookup</Link> to search.
          </p>
        )}

        {loading && (
          <p className="text-gray-400 text-sm mb-4">Loading lots for zone...</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
            <input
              type="checkbox"
              checked={showLots}
              onChange={(e) => setShowLots(e.target.checked)}
              className="rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            Lots
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
            <input
              type="checkbox"
              checked={showPlaces}
              onChange={(e) => setShowPlaces(e.target.checked)}
              className="rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            Places
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
            <input
              type="checkbox"
              checked={showValves}
              onChange={(e) => setShowValves(e.target.checked)}
              className="rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            Valves
          </label>
        </div>

        <ParkMap
          lotsToShow={lotsToShow}
          highlightLot={lotParam}
          onLotClick={(lotId) => router.push(`/?lot=${encodeURIComponent(lotId)}`)}
          onPlaceClick={(placeName) => router.push(`/?search=${encodeURIComponent(placeName)}`)}
          onValveClick={(valveId) => router.push(`/?search=${encodeURIComponent(valveId)}`)}
          showLots={showLots}
          showPlaces={showPlaces}
          showValves={showValves}
        />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading map...</div>}>
      <MapPageContent />
    </Suspense>
  );
}
