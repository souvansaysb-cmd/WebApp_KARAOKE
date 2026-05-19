"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export default function SearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [addingToQueue, setAddingToQueue] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const searchVideos = async (searchQuery: string, tokenValue: string | null, pageToken?: string) => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/youtube/search?q=${encodeURIComponent(searchQuery)}${pageToken ? `&pageToken=${pageToken}` : ""}`, {
        headers: {
          Authorization: `Bearer ${tokenValue}`,
        },
      });
      const data = await response.json();
      setResults(data.results);
      setNextPageToken(data.nextPageToken);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setNextPageToken(null);
    setResults([]);
    searchVideos(query, token);
  };

  const addToQueue = async (video: Video) => {
    if (!token) return;
    setAddingToQueue(video.id);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/queue/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoId: video.id,
          title: video.title,
          thumbnail: video.thumbnail,
        }),
      });

      if (response.ok) {
        setSuccessMessage(`✅ Added "${video.title}" to queue!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await response.json();
        setSuccessMessage(`❌ ${error.message || "Failed to add to queue"}`);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Failed to add to queue", error);
      setSuccessMessage("❌ Error adding to queue");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setAddingToQueue(null);
    }
  };

  const loadMore = () => {
    if (nextPageToken) {
      searchVideos(query, token, nextPageToken);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">Search Songs</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song or artist..."
          className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
          Search
        </button>
      </form>

      {successMessage && (
        <div className="mb-4 p-3 rounded-lg bg-gray-800 text-white text-center">
          {successMessage}
        </div>
      )}

      {loading && <p className="text-gray-400 text-center">Searching songs...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.map((video) => (
          <div
            key={video.id}
            className="flex flex-col rounded-lg bg-gray-900 border border-gray-800 hover:border-orange-500 transition-all overflow-hidden group"
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity"
            />
            <div className="flex flex-col justify-between p-3 flex-1">
              <div>
                <h3 className="text-white font-medium line-clamp-2 group-hover:text-orange-400 transition-colors">
                  {video.title}
                </h3>
                <p className="text-gray-500 text-sm">{video.channelTitle}</p>
              </div>
              <button
                onClick={() => addToQueue(video)}
                disabled={addingToQueue === video.id}
                className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingToQueue === video.id ? "Adding..." : "➕ Add to Queue"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {nextPageToken && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
