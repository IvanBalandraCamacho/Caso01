"use client";

import { Button, Dropdown, MenuProps } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { useCopilotContext } from "@copilotkit/react-core";

interface QuickCommandsProps {
  onCommand: (command: string) => void;
}

export function QuickCommands({ onCommand }: QuickCommandsProps) {
  const commands: MenuProps["items"] = [
    {
      key: "analyze",
      label: "📊 Analizar documento completo",
      onClick: () => onCommand("/analyze"),
    },
    {
      key: "dates",
      label: "📅 Extraer fechas y plazos",
      onClick: () => onCommand("/dates"),
    },
    {
      key: "team",
      label: "👥 Sugerir equipo técnico",
      onClick: () => onCommand("/team"),
    },
    {
      key: "risks",
      label: "⚠️ Identificar riesgos",
      onClick: () => onCommand("/risks"),
    },
    {
      key: "questions",
      label: "❓ Generar preguntas",
      onClick: () => onCommand("/questions"),
    },
    {
      key: "summary",
      label: "📝 Resumen ejecutivo",
      onClick: () => onCommand("/summary"),
    },
  ];

  return (
    <Dropdown menu={{ items: commands }} trigger={["click"]}>
      <Button
        icon={<ThunderboltOutlined />}
        className="bg-[#E31837] border-none text-white hover:bg-[#c41530]"
      >
        Comandos Rápidos
      </Button>
    </Dropdown>
  );
}
