# 📊 CopilotKit para Resultados del Análisis RFP

## 🎯 Objetivo
Transformar los resultados del análisis RFP en una experiencia interactiva usando CopilotKit, con tablas dinámicas, acciones contextuales y generación asistida.

---

## 📋 Estado Actual

### Componentes Existentes
- **Sidebar.tsx**: Modal de resultados (`analysisResult`) con secciones estáticas
- **useCopilotActions.ts**: Hook con acciones básicas de CopilotKit
- **CopilotSidebar.tsx** y **CopilotPanel.tsx**: Componentes de UI de CopilotKit

### Estructura de `analysisResult`
```typescript
interface AnalysisResult {
  cliente: string;
  alcance_economico: {
    presupuesto: string;
    moneda: string;
  };
  objetivo_general: string[];
  fechas_y_plazos: Array<{
    tipo: string;
    valor: string;
    unidad: string;
  }>;
  tecnologias_requeridas: string[];
  preguntas_sugeridas: string[];
  equipo_sugerido: Array<{
    nombre: string;
    rol: string;
    experiencia: string;
    skills: string[];
  }>;
}
```

---

## 🚀 Pasos de Implementación

### PASO 1: Crear Componente de Resultados Interactivo

**Archivo a crear**: `front-v2/components/rfp/InteractiveAnalysisResults.tsx`

```tsx
"use client";

import { useState, useMemo } from "react";
import { Table, Card, Tabs, Tag, Button, Space, Tooltip, message, Modal } from "antd";
import { 
  CopyOutlined, 
  EditOutlined, 
  ReloadOutlined,
  DownloadOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  CodeOutlined
} from "@ant-design/icons";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";

interface AnalysisResult {
  cliente: string;
  alcance_economico: {
    presupuesto: string;
    moneda: string;
  };
  objetivo_general: string[];
  fechas_y_plazos: Array<{
    tipo: string;
    valor: string;
    unidad: string;
  }>;
  tecnologias_requeridas: string[];
  preguntas_sugeridas: string[];
  equipo_sugerido: Array<{
    nombre: string;
    rol: string;
    experiencia: string;
    skills: string[];
  }>;
}

interface InteractiveAnalysisResultsProps {
  result: AnalysisResult;
  onRefresh?: () => void;
  onExport?: (format: 'docx' | 'pdf' | 'excel') => void;
}

export function InteractiveAnalysisResults({ 
  result, 
  onRefresh,
  onExport 
}: InteractiveAnalysisResultsProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState(result);

  // Hacer los datos accesibles a CopilotKit
  useCopilotReadable({
    description: "Resultado del análisis RFP actual",
    value: JSON.stringify(localResult, null, 2),
  });

  // Acción: Refinar análisis de una sección específica
  useCopilotAction({
    name: "refineSection",
    description: "Refina el análisis de una sección específica del RFP",
    parameters: [
      {
        name: "section",
        type: "string",
        description: "Sección a refinar: fechas, tecnologias, equipo, preguntas",
        required: true,
      },
      {
        name: "additionalContext",
        type: "string",
        description: "Contexto adicional para mejorar el análisis",
        required: false,
      },
    ],
    handler: async ({ section, additionalContext }) => {
      message.loading(`Refinando sección: ${section}...`);
      // Llamar al backend para refinar
      // TODO: Implementar llamada a API
      return `Sección ${section} refinada con éxito`;
    },
  });

  // Acción: Agregar pregunta sugerida
  useCopilotAction({
    name: "addQuestion",
    description: "Agrega una nueva pregunta sugerida para el cliente",
    parameters: [
      {
        name: "question",
        type: "string",
        description: "La pregunta a agregar",
        required: true,
      },
      {
        name: "category",
        type: "string",
        description: "Categoría: técnico, legal, comercial, operativo",
        required: false,
      },
    ],
    handler: async ({ question, category }) => {
      setLocalResult(prev => ({
        ...prev,
        preguntas_sugeridas: [...prev.preguntas_sugeridas, question]
      }));
      return `Pregunta agregada: ${question}`;
    },
  });

  // Acción: Modificar equipo sugerido
  useCopilotAction({
    name: "updateTeamMember",
    description: "Modifica o agrega un miembro del equipo sugerido",
    parameters: [
      {
        name: "action",
        type: "string",
        description: "add, update o remove",
        required: true,
      },
      {
        name: "memberName",
        type: "string",
        description: "Nombre del rol del miembro",
        required: true,
      },
      {
        name: "memberData",
        type: "object",
        description: "Datos del miembro: rol, experiencia, skills",
        required: false,
      },
    ],
    handler: async ({ action, memberName, memberData }) => {
      if (action === "add" && memberData) {
        setLocalResult(prev => ({
          ...prev,
          equipo_sugerido: [...prev.equipo_sugerido, {
            nombre: memberName,
            rol: memberData.rol || "",
            experiencia: memberData.experiencia || "",
            skills: memberData.skills || []
          }]
        }));
        return `Miembro ${memberName} agregado al equipo`;
      }
      return `Acción ${action} ejecutada para ${memberName}`;
    },
  });

  // Configuración de columnas para tabla de plazos
  const deadlinesColumns = [
    {
      title: "Tipo de Plazo",
      dataIndex: "tipo",
      key: "tipo",
      render: (text: string) => (
        <span className="font-medium text-white">{text}</span>
      ),
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      render: (text: string) => (
        <Tag color="blue" className="text-sm">{text}</Tag>
      ),
    },
    {
      title: "Unidad",
      dataIndex: "unidad",
      key: "unidad",
      render: (text: string) => (
        <span className="text-zinc-400">{text}</span>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => setEditingCell(`deadline-${record.tipo}`)}
            />
          </Tooltip>
          <Tooltip title="Copiar">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(`${record.tipo}: ${record.valor}`);
                message.success("Copiado al portapapeles");
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Configuración de columnas para tabla de equipo
  const teamColumns = [
    {
      title: "Rol",
      dataIndex: "nombre",
      key: "nombre",
      render: (text: string) => (
        <span className="font-bold text-white">{text}</span>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "rol",
      key: "rol",
      render: (text: string) => (
        <span className="text-zinc-300">{text}</span>
      ),
    },
    {
      title: "Experiencia",
      dataIndex: "experiencia",
      key: "experiencia",
      width: 120,
      render: (text: string) => (
        <Tag color="gold">{text}</Tag>
      ),
    },
    {
      title: "Skills",
      dataIndex: "skills",
      key: "skills",
      render: (skills: string[]) => (
        <Space wrap size={[4, 4]}>
          {skills?.slice(0, 3).map((skill, i) => (
            <Tag key={i} color="purple" className="text-xs">{skill}</Tag>
          ))}
          {skills?.length > 3 && (
            <Tag color="default">+{skills.length - 3}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Ver detalle">
            <Button 
              type="text" 
              icon={<TeamOutlined />} 
              size="small"
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "overview",
      label: (
        <span className="flex items-center gap-2">
          <DollarOutlined />
          Resumen General
        </span>
      ),
      children: (
        <div className="space-y-6">
          {/* Cards de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-900/20 border-blue-500/30">
              <div className="text-center">
                <p className="text-zinc-400 text-sm mb-1">Cliente</p>
                <h3 className="text-white text-xl font-bold">{localResult.cliente}</h3>
              </div>
            </Card>
            <Card className="bg-emerald-900/20 border-emerald-500/30">
              <div className="text-center">
                <p className="text-zinc-400 text-sm mb-1">Presupuesto</p>
                <h3 className="text-emerald-400 text-xl font-bold font-mono">
                  {localResult.alcance_economico?.moneda?.split('(')[0]?.trim()} {localResult.alcance_economico?.presupuesto}
                </h3>
              </div>
            </Card>
            <Card className="bg-purple-900/20 border-purple-500/30">
              <div className="text-center">
                <p className="text-zinc-400 text-sm mb-1">Equipo Sugerido</p>
                <h3 className="text-purple-400 text-xl font-bold">
                  {localResult.equipo_sugerido?.length || 0} roles
                </h3>
              </div>
            </Card>
          </div>

          {/* Objetivo */}
          {localResult.objetivo_general?.length > 0 && (
            <Card title="Objetivo del Proyecto" className="bg-zinc-900/40 border-zinc-800">
              {localResult.objetivo_general.map((obj, i) => (
                <p key={i} className="text-zinc-200 mb-2">{obj}</p>
              ))}
            </Card>
          )}
        </div>
      ),
    },
    {
      key: "deadlines",
      label: (
        <span className="flex items-center gap-2">
          <CalendarOutlined />
          Plazos ({localResult.fechas_y_plazos?.length || 0})
        </span>
      ),
      children: (
        <Table
          dataSource={localResult.fechas_y_plazos?.map((d, i) => ({ ...d, key: i }))}
          columns={deadlinesColumns}
          pagination={false}
          className="dark-table"
          size="middle"
        />
      ),
    },
    {
      key: "technologies",
      label: (
        <span className="flex items-center gap-2">
          <CodeOutlined />
          Tecnologías ({localResult.tecnologias_requeridas?.length || 0})
        </span>
      ),
      children: (
        <div className="flex flex-wrap gap-3">
          {localResult.tecnologias_requeridas?.map((tech, i) => (
            <Tag 
              key={i} 
              color="cyan" 
              className="text-base px-4 py-2 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                navigator.clipboard.writeText(tech);
                message.success(`"${tech}" copiado`);
              }}
            >
              {tech}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      key: "team",
      label: (
        <span className="flex items-center gap-2">
          <TeamOutlined />
          Equipo ({localResult.equipo_sugerido?.length || 0})
        </span>
      ),
      children: (
        <Table
          dataSource={localResult.equipo_sugerido?.map((m, i) => ({ ...m, key: i }))}
          columns={teamColumns}
          pagination={false}
          className="dark-table"
          size="middle"
          rowSelection={{
            type: 'checkbox',
            onChange: (_, rows) => setSelectedRows(rows.map(r => r.nombre)),
          }}
        />
      ),
    },
    {
      key: "questions",
      label: (
        <span className="flex items-center gap-2">
          <QuestionCircleOutlined />
          Preguntas ({localResult.preguntas_sugeridas?.length || 0})
        </span>
      ),
      children: (
        <div className="space-y-3">
          {localResult.preguntas_sugeridas?.map((q, i) => (
            <div 
              key={i} 
              className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg hover:border-amber-500/40 transition-all group"
            >
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-zinc-200 flex-1">{q}</p>
              <Button 
                type="text" 
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(q);
                  message.success("Pregunta copiada");
                }}
              />
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={onRefresh}
          >
            Re-analizar
          </Button>
          {selectedRows.length > 0 && (
            <Tag color="blue">{selectedRows.length} seleccionados</Tag>
          )}
        </Space>
        <Space>
          <Button 
            icon={<DownloadOutlined />}
            onClick={() => onExport?.('excel')}
          >
            Excel
          </Button>
          <Button 
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => onExport?.('docx')}
          >
            Exportar Word
          </Button>
        </Space>
      </div>

      {/* Tabs con contenido */}
      <Tabs
        items={tabItems}
        className="dark-tabs"
        tabBarStyle={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 24,
        }}
      />
    </div>
  );
}
```

---

### PASO 2: Crear Hook para Acciones de Análisis

**Archivo a crear**: `front-v2/hooks/useCopilotAnalysisActions.ts`

```typescript
"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { message } from "antd";

interface UseAnalysisActionsProps {
  analysisResult: any;
  onResultUpdate: (result: any) => void;
  workspaceId?: string;
}

export function useCopilotAnalysisActions({
  analysisResult,
  onResultUpdate,
  workspaceId,
}: UseAnalysisActionsProps) {
  
  // Exponer el resultado actual a CopilotKit
  useCopilotReadable({
    description: "Resultado completo del análisis RFP actual incluyendo cliente, plazos, tecnologías, equipo y preguntas",
    value: analysisResult ? JSON.stringify(analysisResult, null, 2) : "No hay análisis disponible",
  });

  // Acción: Generar resumen ejecutivo
  useCopilotAction({
    name: "generateExecutiveSummary",
    description: "Genera un resumen ejecutivo del análisis RFP para presentar a stakeholders",
    parameters: [
      {
        name: "format",
        type: "string",
        description: "Formato: bullet_points, paragraph, slides",
        required: false,
      },
      {
        name: "audience",
        type: "string",
        description: "Audiencia: technical, executive, sales",
        required: false,
      },
    ],
    handler: async ({ format = "bullet_points", audience = "executive" }) => {
      if (!analysisResult) return "No hay análisis disponible";
      
      const summary = `
## Resumen Ejecutivo - ${analysisResult.cliente}

### Alcance Económico
- **Presupuesto**: ${analysisResult.alcance_economico?.presupuesto || 'No especificado'}
- **Moneda**: ${analysisResult.alcance_economico?.moneda || 'No especificada'}

### Plazos Clave
${analysisResult.fechas_y_plazos?.map((p: any) => `- ${p.tipo}: ${p.valor}`).join('\n') || 'No especificados'}

### Stack Tecnológico
${analysisResult.tecnologias_requeridas?.join(', ') || 'No especificado'}

### Equipo Requerido
${analysisResult.equipo_sugerido?.map((m: any) => `- ${m.nombre} (${m.experiencia})`).join('\n') || 'No especificado'}
      `;
      
      return summary;
    },
  });

  // Acción: Comparar con RFPs anteriores
  useCopilotAction({
    name: "compareWithPreviousRFPs",
    description: "Compara este análisis con RFPs similares anteriores",
    handler: async () => {
      // TODO: Implementar comparación con histórico
      return "Función de comparación en desarrollo. Próximamente podrás comparar con RFPs anteriores del mismo cliente o industria.";
    },
  });

  // Acción: Identificar gaps o información faltante
  useCopilotAction({
    name: "identifyInformationGaps",
    description: "Identifica información faltante o ambigua en el RFP",
    handler: async () => {
      if (!analysisResult) return "No hay análisis disponible";
      
      const gaps: string[] = [];
      
      if (!analysisResult.alcance_economico?.presupuesto || 
          analysisResult.alcance_economico.presupuesto.toLowerCase().includes('no especific')) {
        gaps.push("⚠️ Presupuesto no especificado");
      }
      
      if (!analysisResult.fechas_y_plazos?.length) {
        gaps.push("⚠️ Plazos no definidos");
      }
      
      if (!analysisResult.tecnologias_requeridas?.length) {
        gaps.push("⚠️ Stack tecnológico no especificado");
      }
      
      if (analysisResult.preguntas_sugeridas?.length > 5) {
        gaps.push(`📋 Se identificaron ${analysisResult.preguntas_sugeridas.length} preguntas pendientes de aclarar`);
      }
      
      return gaps.length > 0 
        ? `Se identificaron los siguientes gaps:\n\n${gaps.join('\n')}`
        : "✅ El análisis está completo, no se identificaron gaps significativos.";
    },
  });

  // Acción: Sugerir próximos pasos
  useCopilotAction({
    name: "suggestNextSteps",
    description: "Sugiere los próximos pasos a seguir después del análisis",
    handler: async () => {
      const steps = [
        "1️⃣ Revisar y validar el análisis con el equipo técnico",
        "2️⃣ Enviar preguntas de aclaración al cliente",
        "3️⃣ Elaborar propuesta técnica preliminar",
        "4️⃣ Estimar esfuerzo y costos con el equipo sugerido",
        "5️⃣ Preparar presentación para comité de propuestas",
      ];
      
      return `## Próximos Pasos Sugeridos\n\n${steps.join('\n')}`;
    },
  });

  // Acción: Calcular estimación de esfuerzo
  useCopilotAction({
    name: "estimateEffort",
    description: "Calcula una estimación de esfuerzo basada en el equipo y tecnologías",
    parameters: [
      {
        name: "ratePerHour",
        type: "number",
        description: "Tarifa promedio por hora del equipo (USD)",
        required: false,
      },
    ],
    handler: async ({ ratePerHour = 75 }) => {
      if (!analysisResult?.equipo_sugerido?.length) {
        return "No hay equipo sugerido para estimar";
      }
      
      const teamSize = analysisResult.equipo_sugerido.length;
      // Estimación básica: 3 meses promedio, 160 horas/mes
      const estimatedHours = teamSize * 160 * 3;
      const estimatedCost = estimatedHours * ratePerHour;
      
      return `
## Estimación Preliminar de Esfuerzo

- **Tamaño del equipo**: ${teamSize} personas
- **Horas estimadas**: ${estimatedHours.toLocaleString()} horas
- **Costo estimado**: USD ${estimatedCost.toLocaleString()}

⚠️ Esta es una estimación preliminar. Se recomienda realizar un análisis detallado.
      `;
    },
  });

  // Acción: Exportar a diferentes formatos
  useCopilotAction({
    name: "exportAnalysis",
    description: "Exporta el análisis en diferentes formatos",
    parameters: [
      {
        name: "format",
        type: "string",
        description: "Formato de exportación: json, markdown, csv",
        required: true,
      },
    ],
    handler: async ({ format }) => {
      if (!analysisResult) return "No hay análisis para exportar";
      
      switch (format) {
        case 'json':
          navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2));
          message.success("JSON copiado al portapapeles");
          return "Análisis exportado como JSON y copiado al portapapeles";
        
        case 'markdown':
          const md = `# Análisis RFP - ${analysisResult.cliente}\n\n...`;
          navigator.clipboard.writeText(md);
          message.success("Markdown copiado al portapapeles");
          return "Análisis exportado como Markdown";
        
        case 'csv':
          // Exportar equipo como CSV
          const csv = analysisResult.equipo_sugerido
            ?.map((m: any) => `${m.nombre},${m.rol},${m.experiencia}`)
            .join('\n');
          navigator.clipboard.writeText(`Nombre,Rol,Experiencia\n${csv}`);
          message.success("CSV copiado al portapapeles");
          return "Equipo exportado como CSV";
        
        default:
          return "Formato no soportado";
      }
    },
  });
}
```

---

### PASO 3: Integrar en Modal de Resultados

**Archivo a modificar**: `front-v2/components/sidebar.tsx`

Buscar el modal de `analysisResult` y reemplazar el contenido con el nuevo componente:

```tsx
// Importar al inicio del archivo
import { InteractiveAnalysisResults } from "@/components/rfp/InteractiveAnalysisResults";
import { useCopilotAnalysisActions } from "@/hooks/useCopilotAnalysisActions";

// Dentro del componente Sidebar, agregar el hook:
useCopilotAnalysisActions({
  analysisResult,
  onResultUpdate: setAnalysisResult,
  workspaceId: activeWorkspaceId,
});

// Reemplazar el contenido del Modal de resultados:
<Modal
  title="Resultados del Análisis RFP"
  open={!!analysisResult}
  onCancel={() => setAnalysisResult(null)}
  width={1200}
  footer={null}
  styles={modalStyles}
>
  {analysisResult && (
    <InteractiveAnalysisResults
      result={analysisResult}
      onRefresh={() => handleRfpAnalysis()}
      onExport={(format) => handleDownloadDocument(format)}
    />
  )}
</Modal>
```

---

### PASO 4: Agregar Panel de Copiloto Contextual

**Archivo a crear**: `front-v2/components/rfp/AnalysisCopilotPanel.tsx`

```tsx
"use client";

import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

interface AnalysisCopilotPanelProps {
  analysisContext?: string;
}

export function AnalysisCopilotPanel({ analysisContext }: AnalysisCopilotPanelProps) {
  return (
    <CopilotPopup
      labels={{
        title: "Asistente de Análisis RFP",
        initial: "¿Necesitas ayuda con el análisis? Puedo:\n\n• Generar un resumen ejecutivo\n• Identificar información faltante\n• Sugerir próximos pasos\n• Estimar esfuerzo y costos\n\n¿Qué te gustaría hacer?",
        placeholder: "Ej: Genera un resumen para el comité...",
      }}
      instructions={`
        Eres un experto en análisis de RFPs de TIVIT.
        
        Contexto del análisis actual:
        ${analysisContext || "No hay análisis cargado"}
        
        Puedes ayudar al usuario a:
        1. Interpretar los resultados del análisis
        2. Generar resúmenes ejecutivos
        3. Identificar información faltante
        4. Sugerir próximos pasos
        5. Estimar esfuerzos y costos
        6. Preparar material para presentaciones
        
        Usa las acciones disponibles cuando sea apropiado.
        Sé profesional, conciso y orientado a resultados.
      `}
      shortcut="mod+shift+a"
    />
  );
}
```

---

### PASO 5: Estilos para Tablas Dark Mode

**Archivo a crear/modificar**: `front-v2/styles/copilot-tables.css`

```css
/* Estilos para tablas en modo oscuro */
.dark-table .ant-table {
  background: transparent;
}

.dark-table .ant-table-thead > tr > th {
  background: rgba(255, 255, 255, 0.05);
  color: #a1a1aa;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.dark-table .ant-table-tbody > tr > td {
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #e4e4e7;
}

.dark-table .ant-table-tbody > tr:hover > td {
  background: rgba(255, 255, 255, 0.03);
}

.dark-table .ant-table-tbody > tr.ant-table-row-selected > td {
  background: rgba(59, 130, 246, 0.1);
}

/* Tabs en modo oscuro */
.dark-tabs .ant-tabs-tab {
  color: #71717a;
}

.dark-tabs .ant-tabs-tab-active {
  color: #ffffff !important;
}

.dark-tabs .ant-tabs-ink-bar {
  background: #E31837;
}

/* Cards en modo oscuro */
.dark-card {
  background: rgba(30, 31, 32, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.dark-card:hover {
  border-color: rgba(227, 24, 55, 0.3);
}
```

Importar en `front-v2/app/globals.css`:
```css
@import './copilot-tables.css';
```

---

## 📝 Checklist de Implementación

- [ ] Crear `InteractiveAnalysisResults.tsx`
- [ ] Crear `useCopilotAnalysisActions.ts`
- [ ] Crear `AnalysisCopilotPanel.tsx`
- [ ] Crear/actualizar estilos CSS
- [ ] Integrar en `sidebar.tsx`
- [ ] Probar acciones de CopilotKit
- [ ] Verificar exportación a Word/PDF
- [ ] Probar edición inline de datos
- [ ] Validar responsive design

---

## 🎯 Resultado Esperado

1. **Tablas Interactivas**: Los datos se muestran en tablas con selección, ordenamiento y acciones por fila
2. **Copiloto Contextual**: Panel de chat que conoce el análisis actual y puede ejecutar acciones
3. **Acciones Inteligentes**: 
   - Generar resúmenes ejecutivos
   - Identificar gaps de información
   - Estimar esfuerzos
   - Exportar en múltiples formatos
4. **Edición Inline**: Posibilidad de modificar datos directamente en las tablas
5. **KPIs Visuales**: Cards con métricas clave del RFP

---

## 📚 Referencias

- [CopilotKit Actions](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)
- [CopilotKit Readable State](https://docs.copilotkit.ai/reference/hooks/useCopilotReadable)
- [Ant Design Table](https://ant.design/components/table)
- [Componentes existentes](./COPILOTKIT_IMPLEMENTATION_ROADMAP.md)

---

**Última actualización**: 4 de enero de 2026  
**Estado**: Pendiente de implementación  
**Dependencias**: CopilotKit 1.50.1, React 18, Ant Design 5.x
