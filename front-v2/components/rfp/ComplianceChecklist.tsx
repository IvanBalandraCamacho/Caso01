"use client";

import React, { useState } from "react";
import { Card, Progress, Tag, Collapse, Button, Tooltip, Space, Empty, Spin, Modal } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  CodeOutlined,
  FunctionOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  ExpandOutlined,
  AlertOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { Scale } from "lucide-react";

// =========================================================================
// TIPOS
// =========================================================================

interface ComplianceItem {
  requisito: string;
  seccion_rfp: string;
  estado: "CUMPLE" | "NO_CUMPLE" | "PARCIAL" | "NO_APLICA";
  evidencia: string;
  prioridad: "OBLIGATORIO" | "DESEABLE" | "OPCIONAL";
}

interface ComplianceCategory {
  nombre: string;
  icon: string;
  items: ComplianceItem[];
}

interface ComplianceResumen {
  total_requisitos: number;
  cumple: number;
  no_cumple: number;
  parcial: number;
  no_aplica: number;
  porcentaje_cumplimiento: number;
}

interface ComplianceChecklistData {
  resumen: ComplianceResumen;
  categorias: ComplianceCategory[];
  recomendaciones: string[];
  alertas: string[];
}

interface Props {
  workspaceId: string;
  proposalContent?: string;
  onRefresh?: () => void;
}

// =========================================================================
// HELPERS
// =========================================================================

const getStatusIcon = (estado: string) => {
  switch (estado) {
    case "CUMPLE":
      return <CheckCircleOutlined className="text-green-500" />;
    case "NO_CUMPLE":
      return <CloseCircleOutlined className="text-red-500" />;
    case "PARCIAL":
      return <ExclamationCircleOutlined className="text-yellow-500" />;
    case "NO_APLICA":
      return <MinusCircleOutlined className="text-zinc-500" />;
    default:
      return <MinusCircleOutlined />;
  }
};

const getStatusColor = (estado: string) => {
  switch (estado) {
    case "CUMPLE":
      return "success";
    case "NO_CUMPLE":
      return "error";
    case "PARCIAL":
      return "warning";
    case "NO_APLICA":
      return "default";
    default:
      return "default";
  }
};

const getPrioridadColor = (prioridad: string) => {
  switch (prioridad) {
    case "OBLIGATORIO":
      return "red";
    case "DESEABLE":
      return "blue";
    case "OPCIONAL":
      return "default";
    default:
      return "default";
  }
};

const getCategoryIcon = (icon: string) => {
  switch (icon) {
    case "code":
      return <CodeOutlined />;
    case "function":
      return <FunctionOutlined />;
    case "scale":
      return <Scale size={16} />;
    case "file":
      return <FileTextOutlined />;
    case "dollar":
      return <DollarOutlined />;
    case "calendar":
      return <CalendarOutlined />;
    case "users":
      return <TeamOutlined />;
    case "shield":
      return <SafetyCertificateOutlined />;
    default:
      return <FileTextOutlined />;
  }
};

// =========================================================================
// COMPONENTE PRINCIPAL
// =========================================================================

export default function ComplianceChecklist({ workspaceId, proposalContent, onRefresh }: Props) {
  const [data, setData] = useState<ComplianceChecklistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchComplianceChecklist = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

      const response = await fetch(`${apiBaseUrl}/quick-wins/compliance-checklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          proposal_content: proposalContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al generar checklist");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    fetchComplianceChecklist();
  };

  // Renderizar el resumen
  const renderResumen = () => {
    if (!data) return null;

    const { resumen } = data;
    const porcentaje = resumen.porcentaje_cumplimiento || 0;

    let strokeColor = "#52c41a"; // verde
    if (porcentaje < 50) strokeColor = "#ff4d4f"; // rojo
    else if (porcentaje < 75) strokeColor = "#faad14"; // amarillo

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-zinc-800/50 border-zinc-700 text-center">
          <div className="text-3xl font-bold text-white">{resumen.total_requisitos}</div>
          <div className="text-xs text-zinc-400">Total Requisitos</div>
        </Card>
        <Card className="bg-green-900/30 border-green-700/50 text-center">
          <div className="text-3xl font-bold text-green-400">{resumen.cumple}</div>
          <div className="text-xs text-green-400/70">Cumplen</div>
        </Card>
        <Card className="bg-red-900/30 border-red-700/50 text-center">
          <div className="text-3xl font-bold text-red-400">{resumen.no_cumple}</div>
          <div className="text-xs text-red-400/70">No Cumplen</div>
        </Card>
        <Card className="bg-yellow-900/30 border-yellow-700/50 text-center">
          <div className="text-3xl font-bold text-yellow-400">{resumen.parcial}</div>
          <div className="text-xs text-yellow-400/70">Parciales</div>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700 text-center">
          <Progress
            type="circle"
            percent={porcentaje}
            size={60}
            strokeColor={strokeColor}
            format={(p) => <span className="text-white text-sm font-bold">{p}%</span>}
          />
          <div className="text-xs text-zinc-400 mt-1">Cumplimiento</div>
        </Card>
      </div>
    );
  };

  // Renderizar categorías
  const renderCategorias = () => {
    if (!data || !data.categorias.length) return null;

    const items = data.categorias.map((categoria, idx) => ({
      key: String(idx),
      label: (
        <div className="flex items-center gap-2">
          <span className="text-[#E31837]">{getCategoryIcon(categoria.icon)}</span>
          <span className="text-white font-medium">{categoria.nombre}</span>
          <Tag color="blue">{categoria.items.length}</Tag>
        </div>
      ),
      children: (
        <div className="space-y-3">
          {categoria.items.map((item, itemIdx) => (
            <div
              key={itemIdx}
              className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
            >
              <div className="flex-shrink-0 mt-0.5">{getStatusIcon(item.estado)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-white text-sm font-medium">{item.requisito}</span>
                  <Tag color={getPrioridadColor(item.prioridad)} className="text-xs">
                    {item.prioridad}
                  </Tag>
                  <Tag color={getStatusColor(item.estado)} className="text-xs">
                    {item.estado}
                  </Tag>
                </div>
                <div className="text-zinc-500 text-xs mb-1">Sección: {item.seccion_rfp}</div>
                <div className="text-zinc-400 text-xs">{item.evidencia}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    }));

    return (
      <Collapse
        items={items}
        defaultActiveKey={["0"]}
        className="bg-transparent border-none"
        expandIconPosition="end"
      />
    );
  };

  // Renderizar alertas y recomendaciones
  const renderAlertas = () => {
    if (!data) return null;

    return (
      <div className="space-y-4 mt-6">
        {data.alertas.length > 0 && (
          <Card
            title={
              <span className="text-red-400 flex items-center gap-2">
                <AlertOutlined /> Alertas Críticas
              </span>
            }
            className="bg-red-900/20 border-red-700/50"
            size="small"
          >
            <ul className="list-disc pl-4 space-y-1">
              {data.alertas.map((alerta, idx) => (
                <li key={idx} className="text-red-300 text-sm">
                  {alerta}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data.recomendaciones.length > 0 && (
          <Card
            title={
              <span className="text-blue-400 flex items-center gap-2">
                <BulbOutlined /> Recomendaciones
              </span>
            }
            className="bg-blue-900/20 border-blue-700/50"
            size="small"
          >
            <ul className="list-disc pl-4 space-y-1">
              {data.recomendaciones.map((rec, idx) => (
                <li key={idx} className="text-blue-300 text-sm">
                  {rec}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  };

  // Contenido principal
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Spin size="large" />
          <p className="text-zinc-400 mt-4">Analizando cumplimiento de requisitos...</p>
          <p className="text-zinc-500 text-sm">Esto puede tomar unos segundos</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <CloseCircleOutlined className="text-4xl text-red-500 mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button type="primary" onClick={handleGenerate} icon={<ReloadOutlined />}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (!data) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-zinc-400">
              Genera un checklist para verificar el cumplimiento de requisitos
            </span>
          }
        >
          <Button
            type="primary"
            onClick={handleGenerate}
            icon={<CheckCircleOutlined />}
            className="bg-[#E31837] hover:bg-[#C01530] border-none"
          >
            Generar Checklist de Cumplimiento
          </Button>
        </Empty>
      );
    }

    return (
      <>
        {renderResumen()}
        {renderCategorias()}
        {renderAlertas()}
      </>
    );
  };

  return (
    <>
      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="text-white flex items-center gap-2">
              <CheckCircleOutlined className="text-[#E31837]" />
              Checklist de Cumplimiento
            </span>
            <Space>
              {data && (
                <>
                  <Tooltip title="Actualizar">
                    <Button
                      type="text"
                      icon={<ReloadOutlined />}
                      onClick={handleGenerate}
                      loading={loading}
                      className="text-zinc-400 hover:text-white"
                    />
                  </Tooltip>
                  <Tooltip title="Ver en pantalla completa">
                    <Button
                      type="text"
                      icon={<ExpandOutlined />}
                      onClick={() => setIsModalOpen(true)}
                      className="text-zinc-400 hover:text-white"
                    />
                  </Tooltip>
                </>
              )}
            </Space>
          </div>
        }
        className="bg-zinc-900/60 border-zinc-700"
        styles={{ body: { padding: data ? "16px" : "24px" } }}
      >
        {renderContent()}
      </Card>

      {/* Modal de pantalla completa */}
      <Modal
        title={
          <span className="text-white flex items-center gap-2">
            <CheckCircleOutlined className="text-[#E31837]" />
            Checklist de Cumplimiento - Vista Completa
          </span>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        styles={{
          body: { background: "#1A1A1A", padding: "24px", maxHeight: "80vh", overflowY: "auto" },
          header: { background: "#18181b", borderBottom: "1px solid #27272a" },
          content: { background: "#1A1A1A" },
        }}
      >
        {renderResumen()}
        {renderCategorias()}
        {renderAlertas()}
      </Modal>
    </>
  );
}
