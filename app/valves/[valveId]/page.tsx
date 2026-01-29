"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ValveRecord } from "@/lib/types";

type ValveResponse = {
  stale: boolean;
  valve: ValveRecord | null;
};

export default function ValveDetailPage() {
  const params = useParams();
  const valveId = params?.valveId as string;
  const [data, setData] = useState<ValveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!valveId) return;

    fetch(`/api/valves/${encodeURIComponent(valveId)}`)
      .then((res) => {
        if (res.status === 404) {
          setError("Valve not found");
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.error) {
            setError(data.error);
          } else {
            setData(data);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load valve details");
        setLoading(false);
      });
  }, [valveId]);

  const generateMapsLink = (location: string): string | null => {
    if (!location) return null;
    
    // Check if location contains "Lot" + number or looks like an address
    const lotPattern = /Lot\s*\d+/i;
    const addressPattern = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct)/i;
    
    if (lotPattern.test(location) || addressPattern.test(location)) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading valve details...</div>
      </div>
    );
  }

  if (error || !data?.valve) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Valve Not Found</h1>
          <p className="text-red-600 mb-4">{error || "Valve not found"}</p>
          <Link
            href="/valves"
            className="text-blue-600 hover:underline"
          >
            ← Back to Valves
          </Link>
        </div>
      </div>
    );
  }

  const valve = data.valve;
  const mapsLink = generateMapsLink(valve.location);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {data.stale && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⚠️ Showing cached data
        </div>
      )}

      <div className="mb-6">
        <Link
          href="/valves"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Valves
        </Link>
        <h1 className="text-3xl font-bold mt-2">Valve {valve.valveId}</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Location - Prominent */}
        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Location
          </h2>
          <p className="text-lg text-gray-700">{valve.location || "N/A"}</p>
          {mapsLink && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              📍 Open in Maps →
            </a>
          )}
        </div>

        {/* Function */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-gray-900">
            Function
          </h2>
          <p className="text-gray-700">{valve.function || "N/A"}</p>
        </div>

        {/* Zones */}
        {valve.zones.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Zones</h2>
            <ul className="list-disc list-inside space-y-1">
              {valve.zones.map((zone, index) => (
                <li key={index} className="text-gray-700">
                  {zone}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lots */}
        {valve.lots.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Lots</h2>
            <ul className="list-disc list-inside space-y-1">
              {valve.lots.map((lot, index) => (
                <li key={index} className="text-gray-700">
                  {lot}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Location Notes - Large and Readable */}
        {valve.locationNotes && (
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              Location Notes
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
                {valve.locationNotes}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
