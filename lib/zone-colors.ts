/** Base and highlight (darker) Tailwind classes per zone color. Same family, highlight = selected lot. */
export const ZONE_COLOR_PALETTE: { base: string; highlight: string }[] = [
  { base: "bg-blue-500 text-white", highlight: "bg-blue-700 text-white ring-2 ring-white" },
  { base: "bg-green-500 text-white", highlight: "bg-green-700 text-white ring-2 ring-white" },
  { base: "bg-amber-500 text-white", highlight: "bg-amber-700 text-white ring-2 ring-white" },
  { base: "bg-red-500 text-white", highlight: "bg-red-700 text-white ring-2 ring-white" },
  { base: "bg-purple-500 text-white", highlight: "bg-purple-700 text-white ring-2 ring-white" },
  { base: "bg-cyan-500 text-white", highlight: "bg-cyan-700 text-white ring-2 ring-white" },
  { base: "bg-orange-500 text-white", highlight: "bg-orange-700 text-white ring-2 ring-white" },
  { base: "bg-pink-500 text-white", highlight: "bg-pink-700 text-white ring-2 ring-white" },
  { base: "bg-teal-500 text-white", highlight: "bg-teal-700 text-white ring-2 ring-white" },
  { base: "bg-indigo-500 text-white", highlight: "bg-indigo-700 text-white ring-2 ring-white" },
  { base: "bg-emerald-500 text-white", highlight: "bg-emerald-700 text-white ring-2 ring-white" },
  { base: "bg-rose-500 text-white", highlight: "bg-rose-700 text-white ring-2 ring-white" },
];

export type ZoneColorMap = Record<string, { base: string; highlight: string }>;

/** Build a stable zone -> color map from sorted zone names. */
export function buildZoneColorMap(zoneNames: string[]): ZoneColorMap {
  const sorted = [...zoneNames].sort((a, b) => a.localeCompare(b));
  const map: ZoneColorMap = {};
  sorted.forEach((zone, i) => {
    const palette = ZONE_COLOR_PALETTE[i % ZONE_COLOR_PALETTE.length];
    map[zone] = palette;
  });
  return map;
}
