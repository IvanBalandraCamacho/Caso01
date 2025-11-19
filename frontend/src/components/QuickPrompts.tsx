"use client";
import { Button } from "@/components/ui/button";

interface QuickPromptsProps {
  onPromptSelect: (prompt: string) => void;
}

export function QuickPrompts({ onPromptSelect }: QuickPromptsProps) {
  const prompts = [
    "Resume este documento",
    "¿Cuáles son los puntos clave?",
    "Explica esto en términos simples",
    "Dame un análisis detallado",
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {prompts.map((prompt, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 border-gray-600"
          onClick={() => onPromptSelect(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
