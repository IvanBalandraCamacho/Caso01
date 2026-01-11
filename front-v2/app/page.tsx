"use client"

import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import { UserMenu } from "@/components/UserMenu"
import { useUser } from "@/hooks/useUser"
import { 
  Paperclip, 
  SendHorizontal, 
  Mic, 
} from "lucide-react"
import { DashboardStats, TodoList, UpcomingDeadlines } from "@/components/ui/DashboardWidgets"
import { WorkspacesTable } from "@/components/WorkspacesTable"

export default function Home() {
  const { user } = useUser()
  const router = useRouter()
  const [message, setMessage] = useState("")

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return
    console.log("Enviando mensaje:", message)
  }, [message])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-[#131314] text-white overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Header with Logo and User Menu */}
        <header className="absolute top-0 left-0 right-0 px-6 py-6 z-20 flex justify-between items-center">
          <div className="cursor-pointer" onClick={() => router.push('/')}>
            <img
              src="/logo.svg"
              alt="Logo"
              className="h-10"
            />
          </div>
          <div className="flex gap-4 items-center">
            <UserMenu user={user} />
          </div>
        </header>

        {/* Scrollable Container for Hero + Dashboard */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-8 py-12">
            
            {/* 1. HERO SECTION (aprox 30% pantalla visualmente) */}
            <div className="w-full max-w-4xl text-center mb-10 mt-8 animate-fade-in-up">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
                <span className="bg-gradient-to-r from-[#E31837] to-[#FF6B00] bg-clip-text text-transparent">
                  Hola, {user?.full_name?.split(' ')[0] || "Usuario"}
                </span>
              </h1>
              <p className="text-xl text-zinc-400 font-medium mb-8">
                ¿Qué vamos a analizar hoy?
              </p>

              {/* Gemini Input Bar */}
              <div className="relative group w-full">
                <div className="relative bg-[#1E1F20] rounded-3xl shadow-lg border border-white/5 transition-all duration-300 focus-within:ring-1 focus-within:ring-[#E31837]/50 focus-within:bg-[#252627]">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe tu consulta aquí..."
                    className="w-full bg-transparent text-lg text-white placeholder-zinc-500 px-6 py-5 pr-32 rounded-3xl outline-none resize-none min-h-[80px] max-h-[160px] scrollbar-hide"
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                  />
                  
                  {/* Action Buttons inside Input */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button 
                      onClick={() => router.push('/quick-analysis')}
                      className="p-2 text-zinc-400 hover:text-[#E31837] hover:bg-white/5 rounded-full transition-colors"
                      aria-label="Adjuntar archivo"
                    >
                      <Paperclip size={20} />
                    </button>
                    <button 
                      className="p-2 text-zinc-400 hover:text-[#E31837] hover:bg-white/5 rounded-full transition-colors"
                      aria-label="Usar micrófono"
                    >
                      <Mic size={20} />
                    </button>
                    {message.trim() && (
                      <button 
                        onClick={handleSendMessage}
                        className="p-2 bg-[#E31837] text-white rounded-full hover:bg-[#c41530] transition-colors shadow-md"
                        aria-label="Enviar mensaje"
                      >
                        <SendHorizontal size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DASHBOARD GRID (Widgets recuperados) */}
            <div className="w-full animate-fade-in-up delay-100 pb-12">
              <h2 className="text-xl font-semibold text-zinc-300 mb-6 pl-1 border-l-4 border-[#E31837]">
                Resumen Ejecutivo
              </h2>

              {/* Stats Row */}
              <div className="mb-6">
                <DashboardStats 
                  token={typeof window !== 'undefined' ? localStorage.getItem('access_token') || undefined : undefined}
                  autoFetch={true}
                />
              </div>

              {/* Widgets Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Todo List */}
                <div className="h-full">
                  <TodoList />
                </div>

                {/* Right Column: Deadlines */}
                <div className="h-full">
                  <UpcomingDeadlines />
                </div>
              </div>

              {/* 3. STRATEGIC DATA TABLE (Fase 1) */}
              <div className="mt-12 animate-fade-in-up delay-200">
                <WorkspacesTable />
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
