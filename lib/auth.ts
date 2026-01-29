import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export function getAuthOptions(): NextAuthOptions {
  // Validate required env vars
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const authSecret = process.env.AUTH_SECRET;

  if (!clientId || !clientSecret || !authSecret) {
    throw new Error("Auth not configured. Missing required environment variables.");
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
