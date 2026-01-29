import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export function getAuthOptions(): NextAuthOptions {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const authSecret = process.env.AUTH_SECRET;
  
  // During build time, allow missing env vars (they'll be checked at runtime)
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
  
  if (isBuildTime && (!clientId || !clientSecret || !authSecret)) {
    // Return a minimal config for build time
    return {
      providers: [
        GoogleProvider({
          clientId: "build-time-placeholder",
          clientSecret: "build-time-placeholder",
        }),
      ],
      callbacks: {
        async signIn() {
          return false;
        },
        async session({ session }) {
          return session;
        },
      },
      secret: "build-time-placeholder",
    };
  }
  
  // Runtime checks
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)");
  }

  if (!authSecret) {
    throw new Error("Missing AUTH_SECRET");
  }

  return {
    providers: [
      GoogleProvider({
        clientId,
        clientSecret,
      }),
    ],
    callbacks: {
      async signIn({ user, account, profile }) {
        if (!user.email) {
          return false;
        }
        
        const allowedDomain = process.env.ALLOWED_DOMAIN;
        if (!allowedDomain) {
          console.warn("ALLOWED_DOMAIN not set, allowing all domains");
          return true;
        }
        
        const userDomain = user.email.split("@")[1];
        
        if (userDomain !== allowedDomain) {
          console.warn(`Access denied for ${user.email} (domain: ${userDomain})`);
          return false;
        }
        
        return true;
      },
      async session({ session, token }) {
        return session;
      },
    },
    pages: {
      signIn: "/api/auth/signin",
    },
    secret: authSecret,
  };
}
