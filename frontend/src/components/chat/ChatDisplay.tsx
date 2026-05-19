"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import io from "socket.io-client";

interface ChatMessage {
  id: string;
  content: string;
  user: { id: string; username: string };
  createdAt: string;
}

export default function ChatDisplay() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!token) return;

    // Initialize WebSocket connection to the chat namespace
    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/chat`, {
      auth: {
        token: token,
      },
    });

    newSocket.on("connect", () => {
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("chat_initialized", (initialMessages: ChatMessage[]) => {
      // Messages come oldest-first from backend, show as-is
      setMessages(initialMessages);
    });

    newSocket.on("message_added", (message: ChatMessage) => {
      // Append new messages at the end (bottom of chat)
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("error", (error: { message: string }) => {
      console.error("Chat error:", error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !token || !socket) return;

    setSending(true);
    try {
      // Send via WebSocket for real-time delivery
      socket.emit("send_message", { content: newMessage.trim() });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Connection status indicator */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-xs text-gray-500">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.user.id === user?.uid ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.user.id === user?.uid
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <p className="text-xs font-semibold mb-1">
                  {msg.user.username || "Anonymous"}
                </p>
                <p>{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="p-4 border-t border-gray-800 bg-gray-900 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={sending || !connected}
        />
        <button
          type="submit"
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          disabled={sending || !newMessage.trim() || !connected}
        >
          Send
        </button>
      </form>
    </div>
  );
}