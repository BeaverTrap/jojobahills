import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

let handler: ReturnType<typeof NextAuth> | null = null;

function getHandler() {
  if (!handler) {
    handler = NextAuth(getAuthOptions());
  }
  return handler;
}

export async function GET(request: Request) {
  return getHandler().GET(request);
}

export async function POST(request: Request) {
  return getHandler().POST(request);
}
