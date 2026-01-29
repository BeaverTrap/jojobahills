import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export function getAuthOptions(): NextAuthOptions {
  // Use dummy values during build, validate only at runtime
  const clientId = process.env.GOOGLE_CLIENT_ID || "dummy-build-client-id";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "dummy-build-client-secret";
  const authSecret = process.env.AUTH_SECRET || "dummy-build-secret";
  
  // Runtime validation - only throw when actually handling requests
  // Check if we're in a request context (not build time)
  const isRuntime = typeof process !== "undefined" && 
                    process.env.NODE_ENV !== undefined &&
                    !process.env.NEXT_PHASE?.includes("build");
  
  if (isRuntime) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Missing Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)");
    }
    if (!process.env.AUTH_SECRET) {
      throw new Error("Missing AUTH_SECRET");
    }
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
