import { google } from "googleapis";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== "development") {
    throw new Error(`Missing ${name}`);
  }
  return value || "";
}

// Check if Google Calendar is configured
function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

// Initialize Google Calendar API client
function getCalendarClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  return google.calendar({ version: "v3", auth });
}

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  // Parsed from title/description
  zones?: string[];
  lots?: string[];
  valves?: string[];
};

/**
 * Fetch calendar events from Google Calendar
 * Returns empty array if not configured or on error
 */
export async function getCalendarEvents(
  timeMin?: Date,
  timeMax?: Date
): Promise<CalendarEvent[]> {
  // Gracefully handle if not configured
  if (!isGoogleCalendarConfigured()) {
    console.log("Google Calendar not configured, returning empty events");
    return [];
  }

  try {
    const calendar = getCalendarClient();
    const calendarId = getEnvVar("GOOGLE_CALENDAR_ID");

    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin?.toISOString(),
      timeMax: timeMax?.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const events = response.data.items || [];

    return events
      .filter((event) => event.start?.dateTime || event.start?.date)
      .map((event) => {
        const start = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : event.start?.date
          ? new Date(event.start.date)
          : new Date();
        const end = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : event.end?.date
          ? new Date(event.end.date)
          : new Date();

        const title = event.summary || "Untitled Event";
        const description = event.description || "";

        // Parse zones, lots, valves from title/description
        // Format: "Shutoff: Zone Z1" or "Shutoff: Lot 111" or "Shutoff: V1, V2"
        const zones: string[] = [];
        const lots: string[] = [];
        const valves: string[] = [];

        // Match zone patterns: "Zone 1", "Zone Z1", "Z1", "zone 2", "zone Z2"
        // Normalize all to "Z1", "Z2" format
        const zonePatterns = [
          /\bzone\s+(\d+)\b/gi,  // "Zone 1" -> "Z1"
          /\bzone\s+(Z\d+)\b/gi, // "Zone Z1" -> "Z1"
          /\b(Z\d+)\b/gi,        // "Z1" -> "Z1"
        ];
        
        zonePatterns.forEach((pattern) => {
          const matches = title.match(pattern);
          if (matches) {
            matches.forEach((match) => {
              // Extract the number
              const numMatch = match.match(/\d+/);
              if (numMatch) {
                const zone = `Z${numMatch[0]}`;
                if (!zones.includes(zone)) zones.push(zone);
              }
            });
          }
        });

        // Match lot patterns: "Lot 111", "111", "lot 222"
        const lotMatches = title.match(/\b(?:lot\s+)?(\d{3,})\b/gi);
        if (lotMatches) {
          lotMatches.forEach((match) => {
            const lot = match.replace(/lot\s+/i, "").trim();
            if (!lots.includes(lot)) lots.push(lot);
          });
        }

        // Match valve patterns: "V1", "V11", "valve V2"
        const valveMatches = title.match(/\b(?:valve\s+)?(V\d+)\b/gi);
        if (valveMatches) {
          valveMatches.forEach((match) => {
            const valve = match.replace(/valve\s+/i, "").toUpperCase();
            if (!valves.includes(valve)) valves.push(valve);
          });
        }

        // Also check description for valves (format: "Valves: V1, V2, V3")
        const descValveMatches = description.match(/\b(?:valves?:\s*)?(V\d+(?:\s*,\s*V\d+)*)\b/gi);
        if (descValveMatches) {
          descValveMatches.forEach((match) => {
            const valveList = match.replace(/valves?:\s*/i, "");
            valveList.split(",").forEach((v) => {
              const valve = v.trim().toUpperCase();
              if (valve && !valves.includes(valve)) valves.push(valve);
            });
          });
        }

        return {
          id: event.id || "",
          title,
          start,
          end,
          description,
          zones: zones.length > 0 ? zones : undefined,
          lots: lots.length > 0 ? lots : undefined,
          valves: valves.length > 0 ? valves : undefined,
        };
      });
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Get upcoming events (next 30 days)
 */
export async function getUpcomingEvents(): Promise<CalendarEvent[]> {
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  return getCalendarEvents(now, thirtyDaysLater);
}

/**
 * Get events happening today
 */
export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return getCalendarEvents(startOfDay, endOfDay);
}
