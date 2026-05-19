"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎤</span>
          <span className="text-xl font-bold text-white">KARAOKE</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/search"
            className="text-gray-300 hover:text-orange-400 transition-colors font-medium"
          >
            🔍 Search
          </Link>
          <Link
            href="/queue"
            className="text-gray-300 hover:text-orange-400 transition-colors font-medium"
          >
            🎵 Queue
          </Link>
          <Link
            href="/chat"
            className="text-gray-300 hover:text-orange-400 transition-colors font-medium"
          >
            💬 Chat
          </Link>

          {user ? (
            <div className="flex items-center gap-3 pl-6 border-l border-gray-700">
              <span className="text-gray-300 text-sm">
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
