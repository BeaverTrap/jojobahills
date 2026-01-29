import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <main className="flex flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Park Operations</h1>
        <p className="text-lg text-gray-600">
          Internal staff app for valve lookup and management
        </p>
        <Link
          href="/valves"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          View Valves
        </Link>
      </main>
    </div>
  );
}
