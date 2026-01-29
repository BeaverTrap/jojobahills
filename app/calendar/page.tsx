"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CalendarEvent } from "@/lib/calendar";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/calendar?type=upcoming")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setConfigured(data.configured || false);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching calendar:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <p className="text-white text-center">Loading calendar events...</p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <h1 className="text-3xl font-bold text-white mb-4">Shutoff Calendar</h1>
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
            <p className="text-yellow-300">
              Google Calendar is not configured yet. Once you have Google Workspace access, add <code className="bg-gray-800 px-2 py-1 rounded">GOOGLE_CALENDAR_ID</code> to your environment variables.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Calendar events will sync automatically once configured. Create events in Google Calendar with titles like:
            </p>
            <ul className="text-gray-400 text-sm mt-2 list-disc list-inside">
              <li>"Shutoff: Zone 1" or "Shutoff: Z1" (both work - shutoffs happen by zone)</li>
              <li>"Shutoff: Zone 2" or "Shutoff: Z2"</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcoming = events.filter((e) => e.start >= now);
  const past = events.filter((e) => e.end < now);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
        <h1 className="text-3xl font-bold text-white mb-6">Shutoff Calendar</h1>

        {upcoming.length === 0 && past.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-300">No calendar events found.</p>
            <p className="text-gray-400 text-sm mt-2">
              Create events in Google Calendar with titles like "Shutoff: Zone 1" or "Shutoff: Z1" (both formats work - shutoffs happen by zone)
            </p>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Upcoming Shutoffs</h2>
            <div className="space-y-3">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Past Shutoffs</h2>
            <div className="space-y-3 opacity-60">
              {past.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const [lotsForZones, setLotsForZones] = useState<Record<string, string[]>>({});
  const [loadingLots, setLoadingLots] = useState(false);

  useEffect(() => {
    // Fetch lots for each zone in the event
    if (event.zones && event.zones.length > 0 && !loadingLots) {
      setLoadingLots(true);
      Promise.all(
        event.zones.map((zone) =>
          fetch(`/api/valves?zone=${encodeURIComponent(zone)}`)
            .then((res) => res.json())
            .then((data) => ({ zone, lots: data.lots || [] }))
            .catch(() => ({ zone, lots: [] }))
        )
      ).then((results) => {
        const lotsMap: Record<string, string[]> = {};
        results.forEach(({ zone, lots }) => {
          lotsMap[zone] = lots;
        });
        setLotsForZones(lotsMap);
        setLoadingLots(false);
      });
    }
  }, [event.zones]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{event.title}</h3>
          <p className="text-sm text-gray-400">
            {formatDate(event.start)} - {formatDate(event.end)}
          </p>
        </div>

        {/* Zones - Primary focus since shutoffs happen by zone */}
        {event.zones && event.zones.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">
              Zone{event.zones.length > 1 ? "s" : ""} being shut off:
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {event.zones.map((zone) => (
                <Link
                  key={zone}
                  href={`/?search=${encodeURIComponent(zone)}`}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-500 transition-colors"
                >
                  {zone}
                </Link>
              ))}
            </div>
            
            {/* Show lots affected by these zones */}
            {Object.keys(lotsForZones).length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">
                  Lots affected by this shutoff:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {Object.entries(lotsForZones).map(([zone, lots]) =>
                    lots.map((lot) => (
                      <Link
                        key={`${zone}-${lot}`}
                        href={`/?search=${encodeURIComponent(lot)}`}
                        className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-500 transition-colors"
                      >
                        {lot}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Valves needed (if parsed from description) */}
        {event.valves && event.valves.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Valves to close:</p>
            <div className="flex flex-wrap gap-1.5">
              {event.valves.map((valve) => (
                <Link
                  key={valve}
                  href={`/?search=${encodeURIComponent(valve)}`}
                  className="px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-500 transition-colors"
                >
                  {valve}
                </Link>
              ))}
            </div>
          </div>
        )}

        {event.description && (
          <p className="text-sm text-gray-400 mt-2">{event.description}</p>
        )}
      </div>
    </div>
  );
}
