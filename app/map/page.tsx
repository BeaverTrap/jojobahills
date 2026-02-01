"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ParkMap } from "@/app/components/ParkMap";

type SelectedMarker = { type: "lot"; id: string } | { type: "place"; id: string } | { type: "valve"; id: string };

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
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait)");
    const update = () => setIsPortrait(portrait.matches);
    update();
    portrait.addEventListener("change", update);
    return () => portrait.removeEventListener("change", update);
  }, []);

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

  const handleLotClick = (lotId: string) => {
    if (isMobile) {
      setSelectedMarker({ type: "lot", id: lotId });
    } else {
      router.push(`/?lot=${encodeURIComponent(lotId)}`);
    }
  };

  const handlePlaceClick = (placeName: string) => {
    if (isMobile) {
      setSelectedMarker({ type: "place", id: placeName });
    } else {
      router.push(`/?search=${encodeURIComponent(placeName)}`);
    }
  };

  const handleValveClick = (valveId: string) => {
    if (isMobile) {
      setSelectedMarker({ type: "valve", id: valveId });
    } else {
      router.push(`/?search=${encodeURIComponent(valveId)}`);
    }
  };

  const handleSearchThis = () => {
    if (!selectedMarker) return;
    if (selectedMarker.type === "lot") {
      router.push(`/?lot=${encodeURIComponent(selectedMarker.id)}`);
    } else {
      router.push(`/?search=${encodeURIComponent(selectedMarker.id)}`);
    }
    setSelectedMarker(null);
  };

  const lotsToShowParam = lotsToShow;

  // Mobile: map on its own. Portrait = most of screen height + horizontal scroll; landscape = full screen
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-black md:relative md:z-auto">
        {/* Minimal top bar - back + layers */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-black/90 border-b border-gray-800 shrink-0 safe-area-inset-top">
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium touch-manipulation"
          >
            ← Lookup
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setLayersOpen((o) => !o)}
              className="inline-flex items-center min-h-[44px] px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm touch-manipulation"
            >
              Layers
            </button>
            {layersOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLayersOpen(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] py-2 rounded-lg bg-gray-800 border border-gray-600 shadow-xl">
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 cursor-pointer hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={showLots}
                      onChange={(e) => setShowLots(e.target.checked)}
                      className="rounded border-gray-500 bg-gray-700 text-blue-500 w-4 h-4"
                    />
                    Lots
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 cursor-pointer hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={showPlaces}
                      onChange={(e) => setShowPlaces(e.target.checked)}
                      className="rounded border-gray-500 bg-gray-700 text-blue-500 w-4 h-4"
                    />
                    Places
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 cursor-pointer hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={showValves}
                      onChange={(e) => setShowValves(e.target.checked)}
                      className="rounded border-gray-500 bg-gray-700 text-blue-500 w-4 h-4"
                    />
                    Valves
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Portrait: most of screen height, horizontal scroll for width. Landscape: full remaining height, no scroll */}
        {isPortrait ? (
          <div className="h-[85vh] overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x shrink-0">
            <div className="h-full flex flex-col relative shrink-0" style={{ width: "calc(85vh * 4 / 3)", minWidth: "100%" }}>
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                  <p className="text-gray-300 text-sm">Loading lots...</p>
                </div>
              )}
              <ParkMap
                lotsToShow={lotsToShowParam}
                highlightLot={lotParam}
                onLotClick={handleLotClick}
                onPlaceClick={handlePlaceClick}
                onValveClick={handleValveClick}
                showLots={showLots}
                showPlaces={showPlaces}
                showValves={showValves}
                fillHeight
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                <p className="text-gray-300 text-sm">Loading lots...</p>
              </div>
            )}
            <ParkMap
              lotsToShow={lotsToShowParam}
              highlightLot={lotParam}
              onLotClick={handleLotClick}
              onPlaceClick={handlePlaceClick}
              onValveClick={handleValveClick}
              showLots={showLots}
              showPlaces={showPlaces}
              showValves={showValves}
              fillHeight
            />
          </div>
        )}

        {/* Bottom sheet: selected marker popup */}
        {selectedMarker && (
          <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-gray-800 border-t border-gray-600 shadow-2xl p-4 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">
                {selectedMarker.type === "lot" ? "Lot" : selectedMarker.type === "valve" ? "Valve" : "Place"}
              </p>
              <button
                type="button"
                onClick={() => setSelectedMarker(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none touch-manipulation"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-white text-xl font-semibold mb-4">{selectedMarker.id}</p>
            <button
              type="button"
              onClick={handleSearchThis}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium touch-manipulation"
            >
              Search this
            </button>
          </div>
        )}
      </div>
    );
  }

  // Desktop: normal layout
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
            {zoneParam && <span className="text-sm text-gray-400">Zone {zoneParam}</span>}
            {lotParam && <span className="text-sm text-gray-400">Lot {lotParam}</span>}
          </div>
        </div>

        {!zoneParam && !lotParam && (
          <p className="text-gray-400 text-sm mb-4">
            All lot numbers are shown over the map. Add <code className="bg-gray-800 px-1 rounded">?zone=Z1</code> or <code className="bg-gray-800 px-1 rounded">?lot=111</code> to highlight lots, or use <Link href="/" className="text-blue-400 hover:underline">Lookup</Link> to search.
          </p>
        )}

        {loading && <p className="text-gray-400 text-sm mb-4">Loading lots for zone...</p>}

        <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
            <input type="checkbox" checked={showLots} onChange={(e) => setShowLots(e.target.checked)} className="rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-500 w-4 h-4" />
            Lots
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
            <input type="checkbox" checked={showPlaces} onChange={(e) => setShowPlaces(e.target.checked)} className="rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-500 w-4 h-4" />
            Places
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
            <input type="checkbox" checked={showValves} onChange={(e) => setShowValves(e.target.checked)} className="rounded border-gray-500 bg-gray-800 text-blue-500 focus:ring-blue-500 w-4 h-4" />
            Valves
          </label>
        </div>

        <ParkMap
          lotsToShow={lotsToShowParam}
          highlightLot={lotParam}
          onLotClick={handleLotClick}
          onPlaceClick={handlePlaceClick}
          onValveClick={handleValveClick}
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
