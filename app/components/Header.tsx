import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";

export async function Header() {
  let session = null;
  
  // Only try to get session if auth is configured
  const authConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET;
  
  if (authConfigured) {
    try {
      session = await getServerSession(getAuthOptions());
    } catch (error) {
      // Auth error, ignore
      console.log("Auth error:", error);
    }
  }

  return (
    <header className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Logo - Centered at top */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex flex-col items-center hover:opacity-90 transition-opacity">
            <Image
              src="/images/jojoba-maint-logo.png"
              alt="JoJoba Hills SKP Logo"
              width={500}
              height={500}
              className="object-contain"
              priority
            />
          </Link>
        </div>
        
        {/* Navigation/Auth - Below logo */}
        <div className="flex justify-between items-center mt-4">
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-gray-300 hover:text-white"
            >
              Lookup
            </Link>
            <Link
              href="/calendar"
              className="text-sm text-gray-300 hover:text-white"
            >
              Calendar
            </Link>
          </nav>
          {session && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">{session.user?.email}</span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Logout
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
