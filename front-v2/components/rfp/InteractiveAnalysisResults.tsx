"use client";

import { useState, useMemo } from "react";
import { Table, Card, Tabs, Tag, Button, Space, Tooltip, App, Modal, Spin, Collapse, Input } from "antd";
import { 
  CopyOutlined, 
  EditOutlined, 
  ReloadOutlined,
  DownloadOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  CodeOutlined,
  SearchOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  DeleteOutlined
} from "@ant-design/icons";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { enrichTeamWithCandidates, searchTalent } from "@/lib/api";

// Tipos para candidatos sugeridos del MCP
interface SuggestedCandidate {
  nombre: string;
  cargo_actual: string;
  certificacion: string;
  institucion: string;
  pais: string;
  match_score: number;
}

interface TeamMember {
  nombre?: string;
  rol: string;
  experiencia?: string;
  skills?: string[];
  seniority?: string;
  cantidad?: number;
  candidatos_sugeridos?: SuggestedCandidate[];
}

interface AnalysisResult {
  cliente: string;
  pais?: string;
  tvt?: string; // ID de propuesta comercial (puede iniciar con 0)
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
  equipo_sugerido: TeamMember[];
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
  const { message } = App.useApp();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState(result);
  const [isEnrichingTeam, setIsEnrichingTeam] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // Estados para edición de campos
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [newTechInput, setNewTechInput] = useState<string>("");
  const [showAddTech, setShowAddTech] = useState(false);

  // Funciones para manejar edición de campos
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveField = (field: string) => {
    if (field === "cliente") {
      setLocalResult(prev => ({ ...prev, cliente: editValue }));
    } else if (field === "pais") {
      setLocalResult(prev => ({ ...prev, pais: editValue }));
    } else if (field === "tvt") {
      setLocalResult(prev => ({ ...prev, tvt: editValue }));
    } else if (field === "presupuesto") {
      setLocalResult(prev => ({
        ...prev,
        alcance_economico: { ...prev.alcance_economico, presupuesto: editValue }
      }));
    } else if (field === "moneda") {
      setLocalResult(prev => ({
        ...prev,
        alcance_economico: { ...prev.alcance_economico, moneda: editValue }
      }));
    }
    setEditingField(null);
    setEditValue("");
    message.success(`Campo "${field}" actualizado`);
  };

  // Funciones para manejar tecnologías
  const addTechnology = () => {
    if (newTechInput.trim()) {
      setLocalResult(prev => ({
        ...prev,
        tecnologias_requeridas: [...(prev.tecnologias_requeridas || []), newTechInput.trim()]
      }));
      setNewTechInput("");
      setShowAddTech(false);
      message.success("Tecnología agregada");
    }
  };

  const removeTechnology = (techToRemove: string) => {
    setLocalResult(prev => ({
      ...prev,
      tecnologias_requeridas: (prev.tecnologias_requeridas || []).filter(t => t !== techToRemove)
    }));
    message.success("Tecnología eliminada");
  };

  // Componente reutilizable para campo editable
  const EditableField = ({ 
    field, 
    value, 
    label, 
    className = "" 
  }: { 
    field: string; 
    value: string; 
    label?: string;
    className?: string;
  }) => {
    const isEditing = editingField === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={() => saveField(field)}
            autoFocus
            className="flex-1"
            size="small"
          />
          <Button
            type="text"
            icon={<CheckOutlined />}
            size="small"
            onClick={() => saveField(field)}
            className="text-green-500 hover:text-green-400"
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            size="small"
            onClick={cancelEditing}
            className="text-red-500 hover:text-red-400"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 group">
        <span className={className}>{value || "Sin definir"}</span>
        <Tooltip title="Editar">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => startEditing(field, value)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white"
          />
        </Tooltip>
      </div>
    );
  };

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
        const data = memberData as { rol?: string; experiencia?: string; skills?: string[] };
        setLocalResult(prev => ({
          ...prev,
          equipo_sugerido: [...prev.equipo_sugerido, {
            nombre: memberName,
            rol: data.rol || "",
            experiencia: data.experiencia || "",
            skills: data.skills || []
          }]
        }));
        return `Miembro ${memberName} agregado al equipo`;
      }
      return `Acción ${action} ejecutada para ${memberName}`;
    },
  });

  // Función para enriquecer equipo con candidatos del MCP
  const handleEnrichTeam = async () => {
    if (!localResult.equipo_sugerido?.length) {
      message.warning("No hay equipo sugerido para enriquecer");
      return;
    }

    setIsEnrichingTeam(true);
    try {
      const response = await enrichTeamWithCandidates({
        equipo_sugerido: localResult.equipo_sugerido.map(m => ({
          rol: m.rol || m.nombre || "",
          seniority: m.seniority,
          cantidad: m.cantidad || 1,
          skills: m.skills || []
        })),
        pais: localResult.pais
      });

      if (response.exito) {
        // Actualizar equipo con candidatos
        setLocalResult(prev => ({
          ...prev,
          equipo_sugerido: response.equipo_enriquecido.map(m => ({
            nombre: m.rol,
            rol: m.rol,
            seniority: m.seniority,
            experiencia: m.seniority || "",
            skills: m.skills,
            cantidad: m.cantidad,
            candidatos_sugeridos: m.candidatos_sugeridos
          }))
        }));
        message.success(response.mensaje);
      } else {
        message.error(response.mensaje);
      }
    } catch (error) {
      message.error("Error al buscar candidatos");
      console.error(error);
    } finally {
      setIsEnrichingTeam(false);
    }
  };

  // Verificar si el equipo ya tiene candidatos
  const hasEnrichedCandidates = useMemo(() => {
    return localResult.equipo_sugerido?.some(m => 
      m.candidatos_sugeridos && m.candidatos_sugeridos.length > 0
    );
  }, [localResult.equipo_sugerido]);

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
      render: (text: string, record: TeamMember) => (
        <div>
          <span className="font-bold text-white">{text || record.rol}</span>
          {record.cantidad && record.cantidad > 1 && (
            <Tag color="blue" className="ml-2">x{record.cantidad}</Tag>
          )}
        </div>
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
      render: (text: string, record: TeamMember) => (
        <Tag color="gold">{text || record.seniority || "N/A"}</Tag>
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
      title: "Candidatos",
      dataIndex: "candidatos_sugeridos",
      key: "candidatos",
      width: 120,
      render: (candidatos: SuggestedCandidate[]) => (
        candidatos?.length > 0 ? (
          <Tag color="green" icon={<UserOutlined />}>
            {candidatos.length} encontrados
          </Tag>
        ) : (
          <Tag color="default">Sin buscar</Tag>
        )
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 100,
      render: (_: any, record: TeamMember) => (
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

  // Componente para mostrar candidatos expandidos
  const CandidatesExpandedRow = ({ candidatos }: { candidatos: SuggestedCandidate[] }) => (
    <div className="bg-zinc-900/50 p-4 rounded-lg">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <SafetyCertificateOutlined className="text-green-500" />
        Candidatos Sugeridos de Census TIVIT
      </h4>
      <div className="grid gap-3">
        {candidatos.map((c, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-green-500/30 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <UserOutlined className="text-zinc-400" />
                <span className="font-medium text-white">{c.nombre}</span>
                <Tag color="blue" className="text-xs">{c.pais}</Tag>
              </div>
              <p className="text-zinc-400 text-sm mt-1">{c.cargo_actual}</p>
              <p className="text-zinc-500 text-xs mt-1">
                <SafetyCertificateOutlined className="mr-1" />
                {c.certificacion} - {c.institucion}
              </p>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-mono text-lg">
                {Math.round(c.match_score * 100)}%
              </div>
              <span className="text-zinc-500 text-xs">Match</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const tabItems = [
    {
      key: "overview",
      label: (
        <span className="flex items-center gap-2">
          <DollarOutlined />
          Información del RFP
        </span>
      ),
      children: (
        <div className="space-y-6">
          {/* TVT - Campo destacado nuevo */}
          <Card className="bg-red-900/20 border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-red-400 text-xs font-bold uppercase tracking-wide mb-1">
                  TVT (ID Propuesta Comercial)
                </p>
                <EditableField 
                  field="tvt" 
                  value={localResult.tvt || ""} 
                  className="text-white text-xl font-bold font-mono"
                />
                <p className="text-zinc-500 text-xs mt-1">
                  Puede contener números que inicien con 0
                </p>
              </div>
            </div>
          </Card>

          {/* Cards de KPIs editables */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cliente - Editable */}
            <Card className="bg-blue-900/20 border-blue-500/30">
              <div>
                <p className="text-zinc-400 text-sm mb-1 flex items-center gap-1">
                  Cliente
                  <EditOutlined className="text-xs text-blue-400" />
                </p>
                <EditableField 
                  field="cliente" 
                  value={localResult.cliente} 
                  className="text-white text-lg font-bold"
                />
              </div>
            </Card>

            {/* País - Editable */}
            <Card className="bg-cyan-900/20 border-cyan-500/30">
              <div>
                <p className="text-zinc-400 text-sm mb-1 flex items-center gap-1">
                  País
                  <EditOutlined className="text-xs text-cyan-400" />
                </p>
                <EditableField 
                  field="pais" 
                  value={localResult.pais || ""} 
                  className="text-cyan-400 text-lg font-bold"
                />
              </div>
            </Card>

            {/* Presupuesto - Editable */}
            <Card className="bg-emerald-900/20 border-emerald-500/30">
              <div>
                <p className="text-zinc-400 text-sm mb-1 flex items-center gap-1">
                  Presupuesto
                  <EditOutlined className="text-xs text-emerald-400" />
                </p>
                <div className="flex items-center gap-2">
                  <EditableField 
                    field="moneda" 
                    value={localResult.alcance_economico?.moneda?.split('(')[0]?.trim() || "USD"} 
                    className="text-emerald-400 text-lg font-bold"
                  />
                  <EditableField 
                    field="presupuesto" 
                    value={localResult.alcance_economico?.presupuesto || ""} 
                    className="text-emerald-400 text-lg font-bold font-mono"
                  />
                </div>
              </div>
            </Card>

            {/* Equipo - Solo lectura */}
            <Card className="bg-purple-900/20 border-purple-500/30">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Equipo Sugerido</p>
                <h3 className="text-purple-400 text-lg font-bold">
                  {localResult.equipo_sugerido?.length || 0} roles
                </h3>
              </div>
            </Card>
          </div>

          {/* Stack Tecnológico - Editable */}
          <Card 
            title={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <CodeOutlined className="text-cyan-400" />
                  Stack Tecnológico
                  <EditOutlined className="text-xs text-cyan-400" />
                </span>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setShowAddTech(true)}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  Agregar
                </Button>
              </div>
            } 
            className="bg-zinc-900/40 border-zinc-800"
          >
            {/* Input para agregar nueva tecnología */}
            {showAddTech && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/30">
                <Input
                  value={newTechInput}
                  onChange={(e) => setNewTechInput(e.target.value)}
                  onPressEnter={addTechnology}
                  placeholder="Escribe el nombre de la tecnología..."
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={addTechnology}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Agregar
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setShowAddTech(false);
                    setNewTechInput("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3">
              {localResult.tecnologias_requeridas?.map((tech, i) => (
                <Tag 
                  key={i} 
                  color="cyan" 
                  className="text-base px-4 py-2 cursor-pointer hover:scale-105 transition-transform group"
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    removeTechnology(tech);
                  }}
                >
                  {tech}
                </Tag>
              ))}
              {(!localResult.tecnologias_requeridas || localResult.tecnologias_requeridas.length === 0) && (
                <p className="text-zinc-500">No hay tecnologías definidas. Haz clic en "Agregar" para añadir.</p>
              )}
            </div>
          </Card>

          {/* Objetivo - Solo lectura (Resumen) */}
          {localResult.objetivo_general?.length > 0 && (
            <Card 
              title={
                <span className="text-white">
                  Resumen / Objetivo del Proyecto
                  <Tag color="default" className="ml-2 text-xs">Solo lectura</Tag>
                </span>
              } 
              className="bg-zinc-900/40 border-zinc-800"
            >
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
          <EditOutlined className="text-xs text-cyan-400" />
        </span>
      ),
      children: (
        <div className="space-y-4">
          {/* Input para agregar nueva tecnología */}
          <div className="flex items-center gap-2">
            <Input
              value={newTechInput}
              onChange={(e) => setNewTechInput(e.target.value)}
              onPressEnter={addTechnology}
              placeholder="Agregar nueva tecnología..."
              className="max-w-md"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addTechnology}
              disabled={!newTechInput.trim()}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Agregar
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            {localResult.tecnologias_requeridas?.map((tech, i) => (
              <Tag 
                key={i} 
                color="cyan" 
                className="text-base px-4 py-2 cursor-pointer hover:scale-105 transition-transform"
                closable
                onClose={(e) => {
                  e.preventDefault();
                  removeTechnology(tech);
                }}
              >
                {tech}
              </Tag>
            ))}
            {(!localResult.tecnologias_requeridas || localResult.tecnologias_requeridas.length === 0) && (
              <p className="text-zinc-500">No hay tecnologías definidas.</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "team",
      label: (
        <span className="flex items-center gap-2">
          <TeamOutlined />
          Equipo ({localResult.equipo_sugerido?.length || 0})
          {hasEnrichedCandidates && <Tag color="green" className="ml-1">Enriquecido</Tag>}
        </span>
      ),
      children: (
        <div className="space-y-4">
          {/* Botón para buscar candidatos */}
          <div className="flex justify-between items-center">
            <p className="text-zinc-400 text-sm">
              {hasEnrichedCandidates 
                ? "Equipo enriquecido con candidatos de Census TIVIT" 
                : "Busca candidatos reales en la base de talento de TIVIT"
              }
            </p>
            <Button
              type="primary"
              icon={isEnrichingTeam ? <Spin size="small" /> : <SearchOutlined />}
              onClick={handleEnrichTeam}
              loading={isEnrichingTeam}
              className="bg-green-600 hover:bg-green-700"
            >
              {hasEnrichedCandidates ? "Actualizar Candidatos" : "Buscar Candidatos"}
            </Button>
          </div>

          {/* Tabla con filas expandibles */}
          <Table
            dataSource={localResult.equipo_sugerido?.map((m, i) => ({ ...m, key: i }))}
            columns={teamColumns}
            pagination={false}
            className="dark-table"
            size="middle"
            expandable={{
              expandedRowRender: (record: TeamMember) => (
                record.candidatos_sugeridos?.length ? (
                  <CandidatesExpandedRow candidatos={record.candidatos_sugeridos} />
                ) : (
                  <p className="text-zinc-500 p-4">
                    No hay candidatos sugeridos. Haz clic en "Buscar Candidatos" para encontrar talento.
                  </p>
                )
              ),
              rowExpandable: (record: TeamMember) => true,
            }}
            rowSelection={{
              type: 'checkbox',
              onChange: (_, rows) => setSelectedRows(rows.map(r => r.nombre || r.rol)),
            }}
          />
        </div>
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
