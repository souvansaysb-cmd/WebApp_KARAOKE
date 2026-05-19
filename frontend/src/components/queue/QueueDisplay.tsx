"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import io from "socket.io-client";

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  user: { id: string; username: string; email: string };
  position: number;
  votes: number;
  voteCount?: number;
  status: string;
  createdAt: string;
}

export default function QueueDisplay() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Initialize WebSocket connection
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", {
      auth: {
        token: token,
      },
    });

    newSocket.on("queue_initialized", (initialQueue: QueueItem[]) => {
      setQueue(initialQueue);
      setLoading(false);
    });

    newSocket.on("queue_updated", (updatedQueue: QueueItem[]) => {
      setQueue(updatedQueue);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const fetchQueue = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/queue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setQueue(data);
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    }
  };

  const removeFromQueue = async (videoId: string) => {
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/queue/${videoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      socket?.emit("queue_updated", {});
    } catch (error) {
      console.error("Failed to remove video:", error);
    }
  };

  const upvoteVideo = async (queueItemId: string) => {
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/queue/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          queueItemId,
          value: 1,
        }),
      });
      socket?.emit("vote_added", { queueItemId, value: 1 });
    } catch (error) {
      console.error("Failed to upvote:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-400">Loading queue...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">🎤 Song Queue</h1>

      {queue.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Queue is empty. Search for songs to add them!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-orange-500 transition-all"
            >
              <div className="text-2xl font-bold text-orange-500 w-8">#{index + 1}</div>
              
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-16 h-10 object-cover rounded-md"
              />
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{item.title}</h3>
                <p className="text-gray-400 text-sm">Added by {item.user.username || item.user.email}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => upvoteVideo(item.id)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  👍 {item.voteCount || 0}
                </button>
                
                <button
                  onClick={() => removeFromQueue(item.videoId)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-3">Now Playing</h2>
        {queue.length > 0 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-orange-900 to-orange-700">
            <h3 className="text-white font-semibold">{queue[0]?.title}</h3>
            <p className="text-orange-100 text-sm">Up next: {queue[1]?.title || "No more songs"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
