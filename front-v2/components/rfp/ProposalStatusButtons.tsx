"use client";

import { useState } from "react";
import { Button, Tag, Tooltip, Popconfirm, message } from "antd";
import { 
  ClockCircleOutlined, 
  SendOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  TrophyOutlined,
  StopOutlined
} from "@ant-design/icons";

// Tipos de estado de propuesta
type ProposalStatus = "pending" | "sent" | "accepted" | "rejected" | "won" | "lost";

interface ProposalStatusButtonsProps {
  currentStatus: ProposalStatus;
  onStatusChange: (status: ProposalStatus) => Promise<void>;
  disabled?: boolean;
  size?: "small" | "middle" | "large";
}

// Configuracion de estados
const STATUS_CONFIG: Record<ProposalStatus, {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
  bgColor: string;
  borderColor: string;
}> = {
  pending: {
    label: "Pendiente",
    color: "#faad14",
    icon: <ClockCircleOutlined />,
    description: "Propuesta en preparacion",
    bgColor: "rgba(250, 173, 20, 0.1)",
    borderColor: "rgba(250, 173, 20, 0.3)",
  },
  sent: {
    label: "Enviada",
    color: "#1890ff",
    icon: <SendOutlined />,
    description: "Propuesta enviada al cliente",
    bgColor: "rgba(24, 144, 255, 0.1)",
    borderColor: "rgba(24, 144, 255, 0.3)",
  },
  accepted: {
    label: "Aceptada",
    color: "#52c41a",
    icon: <CheckCircleOutlined />,
    description: "Cliente acepto la propuesta",
    bgColor: "rgba(82, 196, 26, 0.1)",
    borderColor: "rgba(82, 196, 26, 0.3)",
  },
  rejected: {
    label: "Rechazada",
    color: "#ff4d4f",
    icon: <CloseCircleOutlined />,
    description: "Cliente rechazo la propuesta",
    bgColor: "rgba(255, 77, 79, 0.1)",
    borderColor: "rgba(255, 77, 79, 0.3)",
  },
  won: {
    label: "Ganada",
    color: "#722ed1",
    icon: <TrophyOutlined />,
    description: "Licitacion ganada",
    bgColor: "rgba(114, 46, 209, 0.1)",
    borderColor: "rgba(114, 46, 209, 0.3)",
  },
  lost: {
    label: "Perdida",
    color: "#8c8c8c",
    icon: <StopOutlined />,
    description: "Licitacion perdida",
    bgColor: "rgba(140, 140, 140, 0.1)",
    borderColor: "rgba(140, 140, 140, 0.3)",
  },
};

// Transiciones validas de estado
const VALID_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  pending: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: ["won", "lost"],
  rejected: [],
  won: [],
  lost: [],
};

export default function ProposalStatusButtons({
  currentStatus,
  onStatusChange,
  disabled = false,
  size = "middle",
}: ProposalStatusButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const currentConfig = STATUS_CONFIG[currentStatus];
  const availableTransitions = VALID_TRANSITIONS[currentStatus];

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
      message.success(`Estado actualizado a: ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      message.error("Error al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado Actual */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">
          Estado de Propuesta:
        </span>
        <Tag
          icon={currentConfig.icon}
          color={currentConfig.color}
          style={{
            padding: "4px 12px",
            fontSize: "13px",
            fontWeight: 600,
            border: `1px solid ${currentConfig.borderColor}`,
            background: currentConfig.bgColor,
          }}
        >
          {currentConfig.label}
        </Tag>
      </div>

      {/* Botones de Transicion */}
      {availableTransitions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500 w-full mb-1">
            Cambiar estado a:
          </span>
          {availableTransitions.map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <Popconfirm
                key={status}
                title={`Cambiar estado a "${config.label}"`}
                description={config.description}
                onConfirm={() => handleStatusChange(status)}
                okText="Confirmar"
                cancelText="Cancelar"
                okButtonProps={{ 
                  style: { background: config.color } 
                }}
              >
                <Button
                  size={size}
                  icon={config.icon}
                  loading={isUpdating}
                  disabled={disabled}
                  style={{
                    borderColor: config.borderColor,
                    color: config.color,
                    background: "transparent",
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  {config.label}
                </Button>
              </Popconfirm>
            );
          })}
        </div>
      )}

      {/* Mensaje si es estado final */}
      {availableTransitions.length === 0 && (
        <div className="text-xs text-zinc-500 italic">
          Este es un estado final. No hay transiciones disponibles.
        </div>
      )}
    </div>
  );
}

// Componente auxiliar para mostrar el timeline de estados
export function ProposalStatusTimeline({ 
  currentStatus 
}: { 
  currentStatus: ProposalStatus 
}) {
  const allStatuses: ProposalStatus[] = ["pending", "sent", "accepted", "won"];
  
  const getStepStatus = (status: ProposalStatus) => {
    const statusOrder = ["pending", "sent", "accepted", "won"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(status);
    
    if (currentStatus === "rejected" || currentStatus === "lost") {
      return stepIndex <= 1 ? "completed" : "error";
    }
    
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "pending";
  };

  return (
    <div className="flex items-center gap-1 py-2">
      {allStatuses.map((status, index) => {
        const config = STATUS_CONFIG[status];
        const stepStatus = getStepStatus(status);
        
        return (
          <div key={status} className="flex items-center">
            <Tooltip title={config.description}>
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm
                  transition-all duration-300
                  ${stepStatus === "completed" ? "bg-green-500/20 text-green-400 border border-green-500/30" : ""}
                  ${stepStatus === "current" ? `text-white border-2` : ""}
                  ${stepStatus === "pending" ? "bg-zinc-800 text-zinc-500 border border-zinc-700" : ""}
                  ${stepStatus === "error" ? "bg-red-500/20 text-red-400 border border-red-500/30" : ""}
                `}
                style={stepStatus === "current" ? { 
                  background: config.bgColor, 
                  borderColor: config.color,
                  color: config.color
                } : {}}
              >
                {config.icon}
              </div>
            </Tooltip>
            {index < allStatuses.length - 1 && (
              <div 
                className={`
                  w-8 h-0.5 mx-1
                  ${stepStatus === "completed" ? "bg-green-500/50" : "bg-zinc-700"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
