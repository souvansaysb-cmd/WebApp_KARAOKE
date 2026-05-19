"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isConfigured } from "@/lib/firebase";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/search");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        router.push("/search");
      }
    } catch (error) {
      console.error("Sign-in failed:", error);
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-600 drop-shadow-lg">
            🎤 KARAOKE
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            Sing together, vote, chat, and have fun with your friends in real-time!
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-12 max-w-4xl mx-auto">
          <div className="p-6 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-orange-500 transition-colors">
            <span className="text-3xl mb-2 block">🎵</span>
            <h3 className="text-lg font-semibold text-white mb-2">Search & Queue</h3>
            <p className="text-gray-400 text-sm">
              Search YouTube and add songs to the queue
            </p>
          </div>

          <div className="p-6 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-orange-500 transition-colors">
            <span className="text-3xl mb-2 block">👍</span>
            <h3 className="text-lg font-semibold text-white mb-2">Vote & Rank</h3>
            <p className="text-gray-400 text-sm">
              Upvote your favorite songs to move them up
            </p>
          </div>

          <div className="p-6 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-orange-500 transition-colors">
            <span className="text-3xl mb-2 block">💬</span>
            <h3 className="text-lg font-semibold text-white mb-2">Live Chat</h3>
            <p className="text-gray-400 text-sm">
              Chat with other users in real-time
            </p>
          </div>
        </div>

        {/* Sign In Section */}
        <div className="space-y-4 pt-8">
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn || !isConfigured}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-lg rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </button>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {isConfigured
              ? "Create an account or sign in to start singing with your friends"
              : "Firebase is not configured — browse Search, Queue, and Chat UI from the nav (API features need login + keys)."}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-12 border-t border-gray-800 text-gray-500 text-sm">
          <p>Made with 🎤 for music lovers everywhere</p>
        </div>
      </div>
    </div>
  );
}
