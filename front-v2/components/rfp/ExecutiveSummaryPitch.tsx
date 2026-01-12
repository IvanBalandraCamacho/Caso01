"use client";

import React, { useState } from "react";
import { Card, Button, Spin, Empty, Space, Tooltip, Typography, message, Tabs, Modal } from "antd";
import {
  ThunderboltOutlined,
  CopyOutlined,
  ReloadOutlined,
  MailOutlined,
  LinkedinOutlined,
  FundProjectionScreenOutlined, // CORRECCIÓN: Usar este icono en lugar de PresentationOutlined
  ExpandOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

const { Text, Paragraph } = Typography;

// =========================================================================
// TIPOS
// =========================================================================

interface ExecutiveSummaryData {
  pitch: string;
  hook: string;
  problema: string;
  solucion: string;
  beneficio_clave: string;
  diferenciador: string;
  cta: string;
  variantes: {
    email: string;
    linkedin: string;
    presentacion: string;
  };
}

interface Props {
  extractedData: {
    cliente?: string;
    nombre_operacion?: string;
    tvt?: string | number;
    moneda?: string;
    tiempo_aproximado?: string;
    nro_recursos?: number;
    stack_tecnologico?: string[];
    objetivo?: string;
  };
}

// =========================================================================
// COMPONENTE PRINCIPAL
// =========================================================================

export default function ExecutiveSummaryPitch({ extractedData }: Props) {
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

      const response = await fetch(`${apiBaseUrl}/quick-wins/executive-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cliente: extractedData.cliente || "Cliente",
          nombre_operacion: extractedData.nombre_operacion || "Proyecto",
          presupuesto: String(extractedData.tvt || "No especificado"),
          moneda: extractedData.moneda || "USD",
          tiempo_aproximado: extractedData.tiempo_aproximado || "No especificado",
          nro_recursos: extractedData.nro_recursos || 0,
          stack_tecnologico: extractedData.stack_tecnologico || [],
          objetivo: extractedData.objetivo || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al generar resumen");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copiado al portapapeles`);
  };

  const renderPitchSection = () => {
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* Pitch Principal */}
        <Card className="bg-gradient-to-br from-[#E31837]/10 to-[#FF6B00]/10 border-[#E31837]/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <ThunderboltOutlined className="text-[#E31837] text-xl" />
              <span className="text-white font-semibold">Pitch de 30 Segundos</span>
            </div>
            <Tooltip title="Copiar pitch">
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(data.pitch, "Pitch")}
                className="text-zinc-400 hover:text-white"
              />
            </Tooltip>
          </div>
          <Paragraph className="text-white text-lg leading-relaxed m-0">{data.pitch}</Paragraph>
        </Card>

        {/* Hook */}
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm font-medium">Frase Gancho</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(data.hook, "Hook")}
              className="text-zinc-500 hover:text-white"
            />
          </div>
          <p className="text-[#E31837] text-lg font-bold m-0">"{data.hook}"</p>
        </div>

        {/* Estructura del Pitch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-zinc-800/50 border-zinc-700" size="small">
            <div className="text-zinc-400 text-xs font-medium mb-2">PROBLEMA</div>
            <p className="text-white text-sm m-0">{data.problema}</p>
          </Card>
          <Card className="bg-zinc-800/50 border-zinc-700" size="small">
            <div className="text-zinc-400 text-xs font-medium mb-2">SOLUCION</div>
            <p className="text-white text-sm m-0">{data.solucion}</p>
          </Card>
          <Card className="bg-zinc-800/50 border-zinc-700" size="small">
            <div className="text-zinc-400 text-xs font-medium mb-2">BENEFICIO CLAVE</div>
            <p className="text-green-400 text-sm m-0">{data.beneficio_clave}</p>
          </Card>
          <Card className="bg-zinc-800/50 border-zinc-700" size="small">
            <div className="text-zinc-400 text-xs font-medium mb-2">DIFERENCIADOR</div>
            <p className="text-blue-400 text-sm m-0">{data.diferenciador}</p>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleOutlined className="text-green-500" />
            <span className="text-green-400 font-medium">Call to Action</span>
          </div>
          <p className="text-green-300 text-sm m-0">{data.cta}</p>
        </div>
      </div>
    );
  };

  const renderVariantes = () => {
    if (!data) return null;

    const tabItems = [
      {
        key: "email",
        label: (
          <span className="flex items-center gap-2">
            <MailOutlined /> Email
          </span>
        ),
        children: (
          <div className="relative">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(data.variantes.email, "Email")}
              className="absolute top-2 right-2 text-zinc-400 hover:text-white z-10"
            />
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <pre className="text-zinc-300 text-sm whitespace-pre-wrap m-0 font-sans">
                {data.variantes.email}
              </pre>
            </div>
          </div>
        ),
      },
      {
        key: "linkedin",
        label: (
          <span className="flex items-center gap-2">
            <LinkedinOutlined /> LinkedIn
          </span>
        ),
        children: (
          <div className="relative">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(data.variantes.linkedin, "LinkedIn")}
              className="absolute top-2 right-2 text-zinc-400 hover:text-white z-10"
            />
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <pre className="text-zinc-300 text-sm whitespace-pre-wrap m-0 font-sans">
                {data.variantes.linkedin}
              </pre>
            </div>
          </div>
        ),
      },
      {
        key: "presentacion",
        label: (
          <span className="flex items-center gap-2">
            <FundProjectionScreenOutlined /> Presentacion
          </span>
        ),
        children: (
          <div className="relative">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(data.variantes.presentacion, "Presentacion")}
              className="absolute top-2 right-2 text-zinc-400 hover:text-white z-10"
            />
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <pre className="text-zinc-300 text-sm whitespace-pre-wrap m-0 font-sans">
                {data.variantes.presentacion}
              </pre>
            </div>
          </div>
        ),
      },
    ];

    return (
      <div className="mt-6">
        <h4 className="text-white font-medium mb-3">Variantes del Pitch</h4>
        <Tabs items={tabItems} className="custom-dark-tabs" />
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Spin size="large" />
          <p className="text-zinc-400 mt-4">Generando resumen ejecutivo...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error}</p>
          <Button type="primary" onClick={generateSummary} icon={<ReloadOutlined />}>
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
              Genera un pitch de 30 segundos para presentar la propuesta
            </span>
          }
        >
          <Button
            type="primary"
            onClick={generateSummary}
            icon={<ThunderboltOutlined />}
            className="bg-[#E31837] hover:bg-[#C01530] border-none"
          >
            Generar Resumen Ejecutivo
          </Button>
        </Empty>
      );
    }

    return (
      <>
        {renderPitchSection()}
        {renderVariantes()}
      </>
    );
  };

  return (
    <>
      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="text-white flex items-center gap-2">
              <ThunderboltOutlined className="text-[#FF6B00]" />
              Resumen Ejecutivo
            </span>
            <Space>
              {data && (
                <>
                  <Tooltip title="Regenerar">
                    <Button
                      type="text"
                      icon={<ReloadOutlined />}
                      onClick={generateSummary}
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
            <ThunderboltOutlined className="text-[#FF6B00]" />
            Resumen Ejecutivo - Vista Completa
          </span>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width="80%"
        style={{ top: 20 }}
        styles={{
          body: { background: "#1A1A1A", padding: "24px", maxHeight: "80vh", overflowY: "auto" },
          header: { background: "#18181b", borderBottom: "1px solid #27272a" },
          
        }}
      >
        {renderPitchSection()}
        {renderVariantes()}
      </Modal>
    </>
  );
}