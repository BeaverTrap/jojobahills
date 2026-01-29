import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only apply auth middleware if auth is configured
const authConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET;

export default function middleware(req: NextRequest) {
  // If auth is not configured, allow all requests without checking
  if (!authConfigured) {
    return NextResponse.next();
  }

  // Auth is configured - use NextAuth middleware
  // Use dynamic import to avoid issues when auth isn't configured
  const { withAuth } = require("next-auth/middleware");
  
  return withAuth(
    function middlewareHandler(req: NextRequest) {
      return NextResponse.next();
    },
    {
      callbacks: {
        authorized: ({ token }) => !!token,
      },
    }
  )(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
