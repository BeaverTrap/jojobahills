"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MdPlumbing } from "react-icons/md";
import { getPlaceIcon, getPlaceColor } from "@/lib/map-place-icons";
import type { ZoneColorMap } from "@/lib/zone-colors";

type LotPositions = Record<string, { x: number; y: number }>;
type PlacePosition = { x: number; y: number; icon?: string };
type PlacePositions = Record<string, PlacePosition>;
type ValvePositions = Record<string, { x: number; y: number }>;

type ParkMapProps = {
  /** Lot IDs to highlight on the map (e.g. lots in selected zone); all lots are always shown */
  lotsToShow?: string[];
  /** Optional: extra highlight for this lot (e.g. selected lot) – same zone color but darker */
  highlightLot?: string | null;
  /** Zones we're currently showing (for zone color) */
  contextZones?: string[];
  /** Lot id -> zone names (for zone color) */
  lotZones?: Record<string, string[]>;
  /** Zone name -> { base, highlight } Tailwind classes */
  zoneColors?: ZoneColorMap;
  /** Optional: highlight this valve (e.g. selected valve) */
  highlightValve?: string | null;
  /** When provided, lot labels are clickable and this is called with the lot id */
  onLotClick?: (lotId: string) => void;
  /** When provided, place markers are clickable and this is called with the place name */
  onPlaceClick?: (placeName: string) => void;
  /** When provided, valve markers are clickable and this is called with the valve id */
  onValveClick?: (valveId: string) => void;
  /** Show/hide layers (default true for each) */
  showLots?: boolean;
  showPlaces?: boolean;
  showValves?: boolean;
};

export function ParkMap({ lotsToShow = [], highlightLot = null, contextZones = [], lotZones = {}, zoneColors = {}, highlightValve = null, onLotClick, onPlaceClick, onValveClick, showLots = true, showPlaces = true, showValves = true }: ParkMapProps) {
  const [lots, setLots] = useState<LotPositions>({});
  const [places, setPlaces] = useState<PlacePositions>({});
  const [valves, setValves] = useState<ValvePositions>({});
  const [imageVersion, setImageVersion] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400">Loading map...</p>
      </div>
    );
  }

  const allLotIds = Object.keys(lots);
  const allPlaceNames = Object.keys(places);
  const allValveIds = Object.keys(valves);
  if (allLotIds.length === 0 && allPlaceNames.length === 0 && allValveIds.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <p className="text-gray-400 text-sm">
          No lot, place, or valve positions in <code className="bg-gray-800 px-1 rounded">data/map-positions.json</code>.
        </p>
      </div>
    );
  }

  const highlightSet = new Set(lotsToShow.map((id) => String(id)));
  const hasZoneColors = Object.keys(zoneColors).length > 0 && Object.keys(lotZones).length > 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
        <Image
          src={`/api/map/image?v=${imageVersion}`}
          alt="Park map"
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 1024px"
          unoptimized
        />
        {showLots && allLotIds.map((lotId) => {
          const pos = lots[lotId];
          if (!pos) return null;
          const isHighlight = highlightLot != null && String(lotId) === String(highlightLot);
          const isInSearch = highlightSet.has(String(lotId));
          const zones = lotZones[lotId] ?? [];
          const zone = contextZones.length > 0
            ? (contextZones.find((z) => zones.includes(z)) ?? zones[0])
            : zones[0];
          const colors = zone && zoneColors[zone];
          const lotClass = hasZoneColors && isInSearch && colors
            ? (isHighlight ? colors.highlight : colors.base)
            : isHighlight
              ? "bg-blue-800 text-white ring-2 ring-white"
              : isInSearch
                ? "bg-amber-600/90 text-white"
                : "bg-black/60 text-white";
          return (
            <div
              key={`lot-${lotId}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                pointerEvents: onLotClick ? "auto" : "none",
              }}
            >
              <span
                role={onLotClick ? "button" : undefined}
                tabIndex={onLotClick ? 0 : undefined}
                onClick={onLotClick ? () => onLotClick(lotId) : undefined}
                onKeyDown={onLotClick ? (e) => { if (e.key === "Enter" || e.key === " ") onLotClick(lotId); } : undefined}
                className={`
                  inline-block px-1.5 py-0.5 text-xs font-bold rounded
                  ${onLotClick ? "cursor-pointer hover:ring-2 hover:ring-white/80 transition-shadow" : ""}
                  ${lotClass}
                `}
              >
                {lotId}
              </span>
            </div>
          );
        })}
        {showPlaces && allPlaceNames.map((placeName) => {
          const pos = places[placeName];
          if (!pos) return null;
          const IconComponent = getPlaceIcon(pos.icon || "MdPlace");
          const isClickable = !!onPlaceClick;
          return (
            <div
              key={`place-${placeName}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                pointerEvents: isClickable ? "auto" : "none",
              }}
              title={placeName}
            >
              <span
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => onPlaceClick?.(placeName) : undefined}
                onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onPlaceClick?.(placeName); } : undefined}
                className={`
                  inline-flex items-center justify-center rounded-full p-1.5
                  ${getPlaceColor(pos.icon)}
                  ${isClickable ? "cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-white/80 transition-all" : ""}
                `}
              >
                <IconComponent className="shrink-0" size={18} />
              </span>
              {/* Name only on hover */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none z-10 invisible group-hover:visible">
                {placeName}
              </span>
            </div>
          );
        })}
        {showValves && allValveIds.map((valveId) => {
          const pos = valves[valveId];
          if (!pos) return null;
          const isHighlight = highlightValve != null && String(valveId) === String(highlightValve);
          const isClickable = !!onValveClick;
          const displayId =
            valveId === ""
              ? "V?"
              : /^\d+$/.test(valveId)
                ? `V${valveId}`
                : valveId;
          return (
            <div
              key={`valve-${valveId}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                pointerEvents: isClickable ? "auto" : "none",
              }}
              title={`Valve ${displayId}`}
            >
              <span
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => onValveClick?.(valveId) : undefined}
                onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onValveClick?.(valveId); } : undefined}
                className={`
                  inline-flex flex-col items-center
                  ${isClickable ? "cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-white/80 rounded transition-all" : ""}
                `}
              >
                <span
                  className={`
                    inline-flex items-center justify-center rounded-full p-1.5
                    ${isHighlight ? "bg-slate-700 text-white ring-2 ring-white" : "bg-slate-600 text-white"}
                  `}
                >
                  <MdPlumbing className="shrink-0" size={18} />
                </span>
                <span
                  className={`
                    mt-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded min-w-[1.75rem] text-center
                    ${isHighlight ? "bg-slate-700 text-white ring-1 ring-white/50" : "bg-slate-700/90 text-white"}
                  `}
                >
                  {displayId}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-gray-400 text-xs p-2 border-t border-gray-800">
        Lot numbers and facility icons on the map. {lotsToShow.length > 0 ? `${lotsToShow.length} lot(s) highlighted for current search.` : "Select a zone, lot, or valve to highlight."}
      </p>
    </div>
  );
}
