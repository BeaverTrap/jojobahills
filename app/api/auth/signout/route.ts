import { NextResponse } from "next/server";

export async function POST() {
  // Sign out is handled by NextAuth via GET /api/auth/signout
  // This route is not needed but kept for compatibility
  return NextResponse.json({ success: true });
}
