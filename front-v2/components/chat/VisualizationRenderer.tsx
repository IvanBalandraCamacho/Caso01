"use client";

import React, { useMemo } from "react";
import { Card, Table, Tag, Space, Empty, Statistic, Row, Col } from "antd";
import {
  TableOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  DollarOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

// Colores TIVIT para gráficos
const CHART_COLORS = [
  "#E31837", // TIVIT Red
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

// ═══════════════════════════════════════════════════════════════
// TIPOS DE VISUALIZACIÓN
// ═══════════════════════════════════════════════════════════════
export type VisualizationType = "table" | "bar_chart" | "line_chart" | "pie_chart" | "metrics" | "timeline";

export interface VisualizationData {
  type: VisualizationType;
  title: string;
  data: any[];
  config?: {
    columns?: { key: string; title: string }[];
    xKey?: string;
    yKeys?: string[];
    summary?: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSER: Detecta bloques de visualización en el markdown
// ═══════════════════════════════════════════════════════════════
export function parseVisualizationsFromMarkdown(content: string): {
  textContent: string;
  visualizations: VisualizationData[];
} {
  const visualizations: VisualizationData[] = [];
  
  // Regex para encontrar bloques ```visualization ... ```
  const vizRegex = /```visualization\s*([\s\S]*?)```/g;
  
  let textContent = content;
  let match;
  
  while ((match = vizRegex.exec(content)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const vizData = JSON.parse(jsonStr) as VisualizationData;
      
      // Validar estructura mínima
      if (vizData.type && vizData.title && vizData.data) {
        visualizations.push(vizData);
      }
    } catch (e) {
      console.warn("Error parsing visualization block:", e);
    }
  }
  
  // Remover bloques de visualización del texto
  textContent = content.replace(vizRegex, "").trim();
  
  return { textContent, visualizations };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Renderizador de Tabla
// ═══════════════════════════════════════════════════════════════
function RenderTable({ viz }: { viz: VisualizationData }) {
  const { title, data, config } = viz;

  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-700 my-3">
        <Empty description="No hay datos para mostrar" />
      </Card>
    );
  }

  // Auto-detectar columnas si no se proporcionan
  const tableColumns =
    config?.columns?.map((col) => ({
      title: col.title,
      dataIndex: col.key,
      key: col.key,
      render: (text: any) => renderCellValue(text),
    })) ||
    Object.keys(data[0]).map((key) => ({
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      dataIndex: key,
      key,
      render: (text: any) => renderCellValue(text),
    }));

  return (
    <Card
      title={
        <Space>
          <TableOutlined className="text-[#E31837]" />
          <span className="text-zinc-100">{title}</span>
          <Tag color="blue">{data.length} registros</Tag>
        </Space>
      }
      className="bg-zinc-900/60 border-zinc-700 my-4"
      size="small"
      styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
    >
      {config?.summary && (
        <p className="text-zinc-400 text-sm mb-3">{config.summary}</p>
      )}
      <Table
        dataSource={data.map((d, i) => ({ ...d, key: i }))}
        columns={tableColumns}
        size="small"
        pagination={data.length > 5 ? { pageSize: 5, size: "small" } : false}
        scroll={{ x: "max-content" }}
        className="compact-table"
      />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Gráfico de Barras
// ═══════════════════════════════════════════════════════════════
function RenderBarChart({ viz }: { viz: VisualizationData }) {
  const { title, data, config } = viz;

  if (!data || data.length === 0 || !config?.xKey || !config?.yKeys) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-700 my-3">
        <Empty description="Datos insuficientes para el gráfico" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined className="text-[#E31837]" />
          <span className="text-zinc-100">{title}</span>
        </Space>
      }
      className="bg-zinc-900/60 border-zinc-700 my-4"
      size="small"
      styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
    >
      {config.summary && (
        <p className="text-zinc-400 text-sm mb-3">{config.summary}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={config.xKey} stroke="#9CA3AF" fontSize={12} />
          <YAxis stroke="#9CA3AF" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
            }}
          />
          <Legend />
          {config.yKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Gráfico de Líneas/Área
// ═══════════════════════════════════════════════════════════════
function RenderLineChart({ viz }: { viz: VisualizationData }) {
  const { title, data, config } = viz;

  if (!data || data.length === 0 || !config?.xKey || !config?.yKeys) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-700 my-3">
        <Empty description="Datos insuficientes para el gráfico" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <LineChartOutlined className="text-[#E31837]" />
          <span className="text-zinc-100">{title}</span>
        </Space>
      }
      className="bg-zinc-900/60 border-zinc-700 my-4"
      size="small"
      styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
    >
      {config.summary && (
        <p className="text-zinc-400 text-sm mb-3">{config.summary}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={config.xKey} stroke="#9CA3AF" fontSize={12} />
          <YAxis stroke="#9CA3AF" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
            }}
          />
          <Legend />
          {config.yKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Gráfico Circular
// ═══════════════════════════════════════════════════════════════
function RenderPieChart({ viz }: { viz: VisualizationData }) {
  const { title, data, config } = viz;

  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-700 my-3">
        <Empty description="No hay datos para el gráfico" />
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <Card
      title={
        <Space>
          <PieChartOutlined className="text-[#E31837]" />
          <span className="text-zinc-100">{title}</span>
        </Space>
      }
      className="bg-zinc-900/60 border-zinc-700 my-4"
      size="small"
      styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
    >
      {config?.summary && (
        <p className="text-zinc-400 text-sm mb-3">{config.summary}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [
              `${value} (${((value / total) * 100).toFixed(1)}%)`,
              "Valor",
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Métricas/KPIs
// ═══════════════════════════════════════════════════════════════
function RenderMetrics({ viz }: { viz: VisualizationData }) {
  const { title, data, config } = viz;

  const getIcon = (iconType?: string) => {
    switch (iconType) {
      case "money":
        return <DollarOutlined />;
      case "calendar":
        return <CalendarOutlined />;
      case "chart":
        return <BarChartOutlined />;
      default:
        return null;
    }
  };

  return (
    <Card
      title={<span className="text-zinc-100">{title}</span>}
      className="bg-zinc-900/60 border-zinc-700 my-4"
      size="small"
      styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
    >
      {config?.summary && (
        <p className="text-zinc-400 text-sm mb-3">{config.summary}</p>
      )}
      <Row gutter={[16, 16]}>
        {data.map((metric, index) => (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <Card className="bg-zinc-800/50 border-zinc-700 text-center">
              <Statistic
                title={<span className="text-zinc-400">{metric.label}</span>}
                value={metric.value}
                prefix={metric.prefix || getIcon(metric.icon)}
                suffix={metric.suffix}
                valueStyle={{ color: "#E31837", fontSize: "1.2rem" }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Timeline
// ═══════════════════════════════════════════════════════════════
function RenderTimeline({ viz }: { viz: VisualizationData }) {
  const { title, data, config } = viz;

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "deadline":
        return "red";
      case "milestone":
        return "blue";
      case "start":
        return "green";
      default:
        return "default";
    }
  };

  return (
    <Card
      title={
        <Space>
          <CalendarOutlined className="text-[#E31837]" />
          <span className="text-zinc-100">{title}</span>
        </Space>
      }
      className="bg-zinc-900/60 border-zinc-700 my-4"
      size="small"
      styles={{ header: { borderBottom: '1px solid rgba(255,255,255,0.1)' } }}
    >
      {config?.summary && (
        <p className="text-zinc-400 text-sm mb-3">{config.summary}</p>
      )}
      <div className="space-y-2">
        {data.map((event, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded"
          >
            <Tag color={getTypeColor(event.type)}>{event.date}</Tag>
            <span className="text-zinc-300">{event.event}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// UTILIDAD: Renderizar valores de celda
// ═══════════════════════════════════════════════════════════════
function renderCellValue(value: any): React.ReactNode {
  if (value === null || value === undefined) return "-";

  if (typeof value === "boolean") {
    return value ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>;
  }

  if (Array.isArray(value)) {
    return (
      <Space wrap size={[4, 4]}>
        {value.slice(0, 3).map((item, i) => (
          <Tag key={i} color="blue">
            {item}
          </Tag>
        ))}
        {value.length > 3 && <Tag>+{value.length - 3}</Tag>}
      </Space>
    );
  }

  // Detectar prioridades/severidades
  const stringValue = String(value).toUpperCase();
  if (["ALTO", "ALTA", "CRÍTICO", "HIGH", "CRITICAL"].includes(stringValue)) {
    return <Tag color="red">{value}</Tag>;
  }
  if (["MEDIO", "MEDIA", "MEDIUM", "IMPORTANTE"].includes(stringValue)) {
    return <Tag color="orange">{value}</Tag>;
  }
  if (["BAJO", "BAJA", "LOW", "NORMAL"].includes(stringValue)) {
    return <Tag color="green">{value}</Tag>;
  }

  return value;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: Renderizador de Visualización
// ═══════════════════════════════════════════════════════════════
export function VisualizationRenderer({ visualization }: { visualization: VisualizationData }) {
  switch (visualization.type) {
    case "table":
      return <RenderTable viz={visualization} />;
    case "bar_chart":
      return <RenderBarChart viz={visualization} />;
    case "line_chart":
      return <RenderLineChart viz={visualization} />;
    case "pie_chart":
      return <RenderPieChart viz={visualization} />;
    case "metrics":
      return <RenderMetrics viz={visualization} />;
    case "timeline":
      return <RenderTimeline viz={visualization} />;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Renderizar múltiples visualizaciones
// ═══════════════════════════════════════════════════════════════
export function VisualizationsContainer({ visualizations }: { visualizations: VisualizationData[] }) {
  if (!visualizations || visualizations.length === 0) return null;
  
  return (
    <div className="visualizations-container mt-4">
      {visualizations.map((viz, index) => (
        <VisualizationRenderer key={index} visualization={viz} />
      ))}
    </div>
  );
}
