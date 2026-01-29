import { NextResponse } from "next/server";
import { getValveData, getZonesForLot, getLotsForZone } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lotNumber = searchParams.get("lot");
    const zoneName = searchParams.get("zone");
    
    // If lot parameter provided, return zones for that lot
    if (lotNumber) {
      const zones = await getZonesForLot(lotNumber);
      return NextResponse.json({ lot: lotNumber, zones });
    }
    
    // If zone parameter provided, return lots for that zone
    if (zoneName) {
      const lots = await getLotsForZone(zoneName);
      return NextResponse.json({ zone: zoneName, lots });
    }
    
    const result = await getValveData();
    
    return NextResponse.json({
      updatedAt: result.updatedAt,
      stale: result.stale,
      count: result.data.length,
      valves: result.data,
    });
  } catch (error: any) {
    console.error("Error in /api/valves:", error);
    const errorMessage = error?.message || "Failed to fetch valves";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
