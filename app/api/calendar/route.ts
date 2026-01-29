import { NextResponse } from "next/server";
import { getCalendarEvents, getUpcomingEvents, getTodayEvents } from "@/lib/calendar";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "upcoming" | "today" | "all"
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    let events;

    if (type === "upcoming") {
      events = await getUpcomingEvents();
    } else if (type === "today") {
      events = await getTodayEvents();
    } else {
      const min = timeMin ? new Date(timeMin) : undefined;
      const max = timeMax ? new Date(timeMax) : undefined;
      events = await getCalendarEvents(min, max);
    }

    return NextResponse.json({
      events,
      configured: !!process.env.GOOGLE_CALENDAR_ID,
    });
  } catch (error: any) {
    console.error("Error in /api/calendar:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch calendar events", events: [], configured: false },
      { status: 500 }
    );
  }
}
