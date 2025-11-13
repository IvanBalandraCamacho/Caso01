"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { LoginModal } from "@/components/login-modal";

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      setAuthenticated(!!token);
    } catch (err) {
      setAuthenticated(false);
    }
  }, []);

  if (authenticated === null) return null; // espera breve

  if (!authenticated) {
    return <LoginModal onLoginSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ChatArea />
    </div>
  );
}