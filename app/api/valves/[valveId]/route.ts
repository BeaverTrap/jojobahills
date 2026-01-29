import { NextResponse } from "next/server";
import { getValveById, getValveData } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ valveId: string }> }
) {
  try {
    const { valveId } = await params;
    const valve = await getValveById(valveId);
    
    if (!valve) {
      return NextResponse.json(
        { error: "Valve not found" },
        { status: 404 }
      );
    }

    // Get stale status from cache
    const cacheResult = await getValveData();
    
    return NextResponse.json({
      stale: cacheResult.stale,
      valve,
    });
  } catch (error) {
    console.error("Error in /api/valves/[valveId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch valve" },
      { status: 500 }
    );
  }
}
