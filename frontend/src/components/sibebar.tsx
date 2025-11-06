"use client";
// --- CORRECCIÓN ---
// Se eliminaron 'MoreHorizontal', 'Avatar', 'AvatarFallback', 'AvatarImage'
import { Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  return (
    <aside className="w-72 bg-brand-dark-secondary flex flex-col p-4 border-r border-gray-800/50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-light">TIVIT</h1>
      </div>

      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-light">Velvet</h1>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative mt-2">
          <Select defaultValue="gemini">
            <SelectTrigger className="w-full bg-black/30 border border-gray-700 text-sm text-gray-300 focus:ring-2 focus:ring-brand-red focus:border-brand-red">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent className="bg-brand-dark-secondary border-gray-700 text-gray-300">
              <SelectItem value="gpt4">GPT-4o</SelectItem>
              <SelectItem value="llama3">Llama 3</SelectItem>
              <SelectItem value="gemini">Gemini 1.5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="w-full bg-brand-red text-white hover:bg-red-700 font-medium">
        <Plus className="mr-2 h-4 w-4" />
        New Conversation
      </Button>

      <nav className="flex flex-col space-y-6 mt-8">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Workspace
          </h2>
          {/* --- CORRECCIÓN: href="#" cambiado por href="/" --- */}
          <div className="space-y-2">
            <a className="block text-gray-300 hover:text-white transition-colors" href="/">
              Recursos Humanos
            </a>
            <a className="block text-gray-300 hover:text-white transition-colors" href="/">
              Digital
            </a>
            <a className="block text-gray-300 hover:text-white transition-colors" href="/">
              Helpdesk
            </a>
          </div>
        </div>
        
        <Separator className="bg-gray-800/50" />
        
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Your Conversations
          </h2>
          <ScrollArea className="h-64">
            <div className="space-y-2 pr-2">
              {/* --- CORRECCIÓN: href="#" cambiado por href="/" --- */}
              <a className="block text-gray-400 hover:text-white transition-colors text-sm truncate" href="/">
                Análisis de la propuesta Q4...
              </a>
              <a className="block text-gray-400 hover:text-white transition-colors text-sm truncate" href="/">
                Resumen de métricas de Helpdesk
              </a>
            </div>
          </ScrollArea>
        </div>
      </nav>
    </aside>
  );
}