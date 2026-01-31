"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MdPlumbing } from "react-icons/md";
import { getPlaceIcon, getPlaceColor } from "@/lib/map-place-icons";

type LotPositions = Record<string, { x: number; y: number }>;
type PlacePosition = { x: number; y: number; icon?: string };
type PlacePositions = Record<string, PlacePosition>;
type ValvePositions = Record<string, { x: number; y: number }>;

function naturalSort(a: string, b: string): number {
  const na = parseInt(a.replace(/\D/g, "") || "0", 10);
  const nb = parseInt(b.replace(/\D/g, "") || "0", 10);
  if (na !== nb) return na - nb;
  return a.localeCompare(b);
}

export default function MapEditPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [lots, setLots] = useState<LotPositions>({});
  const [places, setPlaces] = useState<PlacePositions>({});
  const [valves, setValves] = useState<ValvePositions>({});
  const [valveIdsFromApi, setValveIdsFromApi] = useState<string[]>([]);
  const [imageVersion, setImageVersion] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"lots" | "places" | "valves">("lots");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [selectedValve, setSelectedValve] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/map")
      .then((res) => res.json())
      .then((data) => {
        setLots(data.lots || {});
        setPlaces(data.places || {});
        setValves(data.valves || {});
        setImageVersion(data.imageVersion ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/valves")
      .then((res) => res.json())
      .then((data) => {
        if (data.valves?.length) {
          // Deduplicate by valveId from database so each valve appears once; fixes "select one = select all"
          const rawIds: string[] = data.valves
            .map((v: { valveId: string }) => (v.valveId ?? "").trim())
            .filter((id: string) => id.length > 0);
          const ids = Array.from(new Set(rawIds)).sort(naturalSort);
          setValveIdsFromApi(ids);
        }
      })
      .catch(() => {});
  }, []);

  const lotIds = Object.keys(lots).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  const placeNames = Object.keys(places).sort((a, b) => a.localeCompare(b));
  const valveIdsOnMap = Object.keys(valves).sort(naturalSort);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = imgRef.current;
      const rect = img?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
      if (x < 0 || x > 100 || y < 0 || y > 100) return;

      if (mode === "lots" && selectedLot) {
        setLots((prev) => ({ ...prev, [selectedLot]: { x, y } }));
        setMessage(`Placed lot "${selectedLot}" at ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
      } else if (mode === "places" && selectedPlace) {
        const existing = places[selectedPlace];
        setPlaces((prev) => ({
          ...prev,
          [selectedPlace]: { x, y, icon: existing?.icon },
        }));
        setMessage(`Placed "${selectedPlace}" at ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
      } else if (mode === "valves" && selectedValve) {
        setValves((prev) => ({ ...prev, [selectedValve]: { x, y } }));
        setMessage(`Placed valve "${selectedValve}" at ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
      }
    },
    [mode, selectedLot, selectedPlace, selectedValve, places]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lots, places, valves }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Saved to data/map-positions.json. Commit and push so the Vercel app shows the same positions.");
    } catch {
      setMessage("Failed to save. Check the server is running and data/ is writable.");
    } finally {
      setSaving(false);
    }
  }, [lots, places, valves]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-400">Loading positions...</p>
      </div>
    );
  }

  const hasLots = lotIds.length > 0;
  const hasPlaces = placeNames.length > 0;
  const hasValves = valveIdsFromApi.length > 0;
  if (!hasLots && !hasPlaces && !hasValves) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-400">No lots, places, or valves. Ensure your Google Sheet is connected (or the downloaded Excel is at data/Master Zone & Valve Database.xlsx).</p>
        <Link href="/map" className="text-blue-400 mt-4 inline-block">← Back to map</Link>
      </div>
    );
  }

  const selected = mode === "lots" ? selectedLot : mode === "places" ? selectedPlace : selectedValve;
  const list = mode === "lots" ? lotIds : mode === "places" ? placeNames : valveIdsFromApi;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-white">Map position editor</h1>
          <div className="flex items-center gap-2">
            <Link href="/map" className="text-sm text-blue-400 hover:text-blue-300">← Map</Link>
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">Lookup</Link>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          Valve numbers come from your <strong>Google Sheet</strong> (or downloaded Excel). Choose <strong>Lots</strong>, <strong>Places</strong>, or <strong>Valves</strong>, select one below, then click on the map where it should sit. Click &quot;Save&quot; to write <code className="bg-gray-800 px-1 rounded">data/map-positions.json</code>. Commit and push so the Vercel app stays in sync.
        </p>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div
              ref={containerRef}
              className="relative w-full bg-black rounded overflow-hidden cursor-crosshair"
              style={{ aspectRatio: "4/3" }}
              onClick={handleMapClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && selected && containerRef.current?.focus()}
              aria-label="Click to place selected position"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={`/api/map/image?v=${imageVersion}`}
                alt="Park map - click to place"
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />
              {lotIds.map((lotId) => {
                const pos = lots[lotId];
                if (!pos) return null;
                const isSelected = mode === "lots" && selectedLot === lotId;
                return (
                  <div
                    key={`lot-${lotId}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <span
                      className={`inline-block px-1.5 py-0.5 text-xs font-bold rounded ${
                        isSelected ? "bg-blue-500 text-white ring-2 ring-white" : "bg-black/70 text-white"
                      }`}
                    >
                      {lotId}
                    </span>
                  </div>
                );
              })}
              {placeNames.map((placeName) => {
                const pos = places[placeName];
                if (!pos) return null;
                const IconComponent = getPlaceIcon(pos.icon ?? "MdPlace");
                const isSelected = mode === "places" && selectedPlace === placeName;
                return (
                  <div
                    key={`place-${placeName}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none group"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    title={placeName}
                  >
                    <span
                      className={`inline-flex items-center justify-center rounded-full p-1.5 ${
                        isSelected ? "bg-blue-500 text-white ring-2 ring-white" : getPlaceColor(pos.icon ?? "MdPlace")
                      }`}
                    >
                      <IconComponent size={18} />
                    </span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-10 invisible group-hover:visible">
                      {placeName}
                    </span>
                  </div>
                );
              })}
              {valveIdsOnMap.map((valveId) => {
                const pos = valves[valveId];
                if (!pos) return null;
                const isSelected = mode === "valves" && selectedValve === valveId;
                const displayId = valveId.startsWith("V") ? valveId : `V${valveId}`;
                return (
                  <div
                    key={`valve-${valveId}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    title={`Valve ${displayId}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center rounded-full p-1.5 ${
                        isSelected ? "bg-blue-500 text-white ring-2 ring-white" : "bg-slate-600 text-white"
                      }`}
                    >
                      <MdPlumbing size={18} />
                    </span>
                    <span className="mt-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded min-w-[1.75rem] text-center bg-slate-700/90 text-white">
                      {displayId}
                    </span>
                  </div>
                );
              })}
            </div>
            {message && (
              <p className={`text-sm mt-2 ${message.startsWith("Failed") ? "text-red-400" : "text-gray-400"}`}>
                {message}
              </p>
            )}
          </div>

          <div className="lg:w-80 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded border border-gray-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setMode("lots"); setSelectedPlace(null); setSelectedValve(null); }}
                  className={`px-3 py-1.5 text-sm ${mode === "lots" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                >
                  Lots
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("places"); setSelectedLot(null); setSelectedValve(null); }}
                  className={`px-3 py-1.5 text-sm ${mode === "places" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                >
                  Places
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("valves"); setSelectedLot(null); setSelectedPlace(null); }}
                  className={`px-3 py-1.5 text-sm ${mode === "valves" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                >
                  Valves
                </button>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-white shrink-0"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-96 border border-gray-700 rounded p-2 bg-gray-800/50">
              {mode === "lots" &&
                lotIds.map((lotId) => {
                  const pos = lots[lotId];
                  const isSelected = selectedLot === lotId;
                  return (
                    <button
                      key={lotId}
                      type="button"
                      onClick={() => setSelectedLot(lotId)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                        isSelected ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {lotId}
                      {pos && (
                        <span className="ml-2 text-gray-500 text-xs">
                          {pos.x.toFixed(1)}%, {pos.y.toFixed(1)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              {mode === "places" &&
                placeNames.map((placeName) => {
                  const pos = places[placeName];
                  const isSelected = selectedPlace === placeName;
                  const IconComponent = getPlaceIcon(pos?.icon ?? "MdPlace");
                  return (
                    <button
                      key={placeName}
                      type="button"
                      onClick={() => setSelectedPlace(placeName)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                        isSelected ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <IconComponent size={16} className="shrink-0" />
                      <span className="truncate">{placeName}</span>
                      {pos && (
                        <span className="ml-auto text-gray-500 text-xs shrink-0">
                          {pos.x.toFixed(1)}%, {pos.y.toFixed(1)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              {mode === "valves" &&
                valveIdsFromApi.map((valveId) => {
                  const pos = valves[valveId];
                  const isSelected = selectedValve === valveId;
                  // Show valve number from database: use valveId as-is, or V + number if DB has just a number
                  const displayId =
                    valveId === ""
                      ? "V?"
                      : /^\d+$/.test(valveId)
                        ? `V${valveId}`
                        : valveId;
                  return (
                    <button
                      key={valveId}
                      type="button"
                      onClick={() => setSelectedValve(valveId)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                        isSelected ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <MdPlumbing size={16} className="shrink-0" />
                      <span className="truncate font-medium">{displayId}</span>
                      {pos && (
                        <span className="ml-auto text-gray-500 text-xs shrink-0">
                          {pos.x.toFixed(1)}%, {pos.y.toFixed(1)}%
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
