import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

let handler: ReturnType<typeof NextAuth> | null = null;

function getHandler() {
  if (!handler) {
    // Check if auth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.AUTH_SECRET) {
      throw new Error("Auth not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET in .env.local");
    }
    handler = NextAuth(getAuthOptions());
  }
  return handler;
}

export async function GET(request: Request) {
  try {
    return getHandler().GET(request);
  } catch (error: any) {
    if (error.message?.includes("not configured")) {
      return NextResponse.json(
        { error: "Authentication not configured. Please set up your .env.local file with Google OAuth credentials." },
        { status: 503 }
      );
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    return getHandler().POST(request);
  } catch (error: any) {
    if (error.message?.includes("not configured")) {
      return NextResponse.json(
        { error: "Authentication not configured. Please set up your .env.local file with Google OAuth credentials." },
        { status: 503 }
      );
    }
    throw error;
  }
}
