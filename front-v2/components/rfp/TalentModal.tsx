"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Table, Tag, Button, Select, Input, Space, Spin, Empty, Tooltip, Checkbox } from "antd";
import { Users, Search, MapPin, Check, ChevronDown, ChevronRight, Award } from "lucide-react";
import { searchTalent, getTalentCountries } from "@/lib/api";
import type { ColumnsType } from "antd/es/table";

// Tipo para candidatos del MCP (registro individual de certificación)
interface MCPCandidate {
  nombre: string;
  cargo: string;
  certificacion: string;
  institucion: string;
  pais: string;
  fecha_emision: string;
  score: number;
}

// Tipo para persona agrupada con múltiples certificaciones
interface GroupedPerson {
  key: string;
  nombre: string;
  cargo: string;
  pais: string;
  bestScore: number;
  certificaciones: {
    certificacion: string;
    institucion: string;
    fecha_emision: string;
    score: number;
  }[];
}

interface TalentModalProps {
  open: boolean;
  onClose: () => void;
  stackTecnologico: string;
  personasRequeridas: number;
  onSelectCandidates: (candidates: MCPCandidate[]) => void;
  selectedCandidates?: MCPCandidate[];
}

export default function TalentModal({
  open,
  onClose,
  stackTecnologico,
  personasRequeridas,
  onSelectCandidates,
  selectedCandidates = []
}: TalentModalProps) {
  const [candidates, setCandidates] = useState<MCPCandidate[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedPais, setSelectedPais] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState(stackTecnologico);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<MCPCandidate[]>(selectedCandidates);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // Agrupar candidatos por nombre para evitar duplicados
  const groupedPersons = useMemo(() => {
    const grouped = new Map<string, GroupedPerson>();
    
    candidates.forEach((c) => {
      const key = `${c.nombre}-${c.pais}`;
      
      if (grouped.has(key)) {
        const person = grouped.get(key)!;
        person.certificaciones.push({
          certificacion: c.certificacion,
          institucion: c.institucion,
          fecha_emision: c.fecha_emision,
          score: c.score
        });
        // Actualizar mejor score
        if (c.score > person.bestScore) {
          person.bestScore = c.score;
        }
      } else {
        grouped.set(key, {
          key,
          nombre: c.nombre,
          cargo: c.cargo,
          pais: c.pais,
          bestScore: c.score,
          certificaciones: [{
            certificacion: c.certificacion,
            institucion: c.institucion,
            fecha_emision: c.fecha_emision,
            score: c.score
          }]
        });
      }
    });
    
    // Ordenar por mejor score descendente
    return Array.from(grouped.values()).sort((a, b) => b.bestScore - a.bestScore);
  }, [candidates]);

  // Cargar paises disponibles al abrir
  useEffect(() => {
    if (open) {
      loadCountries();
      setSearchQuery(stackTecnologico);
      setSelected(selectedCandidates);
      // Buscar automaticamente
      if (stackTecnologico) {
        handleSearch(stackTecnologico);
      }
    }
  }, [open, stackTecnologico]);

  const loadCountries = async () => {
    try {
      const response = await getTalentCountries();
      if (response.exito) {
        setCountries(response.paises);
      }
    } catch (error) {
      console.error("Error loading countries:", error);
    }
  };

  const handleSearch = async (query?: string) => {
    const searchText = query || searchQuery;
    if (!searchText?.trim()) return;

    setIsLoading(true);
    try {
      const response = await searchTalent({
        consulta: searchText,
        limit: 50,
        pais: selectedPais
      });

      if (response.exito) {
        setCandidates(response.candidatos);
      } else {
        setCandidates([]);
      }
    } catch (error) {
      console.error("Error searching talent:", error);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar si una persona está seleccionada (por cualquiera de sus certificaciones)
  const isPersonSelected = (person: GroupedPerson) => {
    return selected.some(c => c.nombre === person.nombre && c.pais === person.pais);
  };

  // Obtener cuántas personas únicas están seleccionadas
  const uniqueSelectedPersons = useMemo(() => {
    const unique = new Set(selected.map(c => `${c.nombre}-${c.pais}`));
    return unique.size;
  }, [selected]);

  // Toggle selección de persona (selecciona la mejor certificación)
  const togglePerson = (person: GroupedPerson) => {
    if (isPersonSelected(person)) {
      // Deseleccionar todas las certificaciones de esta persona
      setSelected(selected.filter(c => !(c.nombre === person.nombre && c.pais === person.pais)));
    } else {
      if (uniqueSelectedPersons < personasRequeridas) {
        // Seleccionar la mejor certificación de esta persona
        const bestCert = person.certificaciones.reduce((best, curr) => 
          curr.score > best.score ? curr : best
        );
        setSelected([...selected, {
          nombre: person.nombre,
          cargo: person.cargo,
          certificacion: bestCert.certificacion,
          institucion: bestCert.institucion,
          pais: person.pais,
          fecha_emision: bestCert.fecha_emision,
          score: bestCert.score
        }]);
      }
    }
  };

  const handleConfirm = () => {
    onSelectCandidates(selected);
    onClose();
  };

  const columns: ColumnsType<GroupedPerson> = [
    {
      title: "",
      key: "select",
      width: 50,
      render: (_, record) => {
        const personSelected = isPersonSelected(record);
        return (
          <Checkbox
            checked={personSelected}
            onChange={() => togglePerson(record)}
            disabled={!personSelected && uniqueSelectedPersons >= personasRequeridas}
          />
        );
      }
    },
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      width: 200,
      render: (text, record) => (
        <div>
          <span className="font-medium text-white">{text}</span>
          {record.certificaciones.length > 1 && (
            <Tag color="blue" className="ml-2 text-xs">
              {record.certificaciones.length} cert.
            </Tag>
          )}
        </div>
      ),
      sorter: (a, b) => a.nombre.localeCompare(b.nombre)
    },
    {
      title: "Cargo",
      dataIndex: "cargo",
      key: "cargo",
      width: 250,
      render: (text) => (
        <Tooltip title={text}>
          <span className="text-zinc-400 block max-w-[240px] whitespace-normal">{text}</span>
        </Tooltip>
      )
    },
    {
      title: "Pais",
      dataIndex: "pais",
      key: "pais",
      width: 120,
      render: (text) => (
        <Tag color="blue" icon={<MapPin className="w-3 h-3 inline mr-1" />}>
          {text}
        </Tag>
      ),
      filters: countries.map(c => ({ text: c, value: c })),
      onFilter: (value, record) => record.pais === value
    },
    {
      title: "Match",
      dataIndex: "bestScore",
      key: "bestScore",
      width: 90,
      render: (score) => {
        const percentage = Math.round(score * 100);
        const color = percentage >= 80 ? "green" : percentage >= 60 ? "gold" : "default";
        return (
          <Tag color={color} className="font-mono font-bold">
            {percentage}%
          </Tag>
        );
      },
      sorter: (a, b) => b.bestScore - a.bestScore,
      defaultSortOrder: "descend"
    }
  ];

  // Expandir fila para mostrar certificaciones
  const expandedRowRender = (record: GroupedPerson) => {
    return (
      <div className="pl-8 py-2 bg-zinc-900/30">
        <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
          <Award className="w-3 h-3" />
          Certificaciones ({record.certificaciones.length})
        </div>
        <div className="space-y-2">
          {record.certificaciones.map((cert, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg"
            >
              <div className="flex-1">
                <Tooltip title={cert.certificacion}>
                  <span className="text-zinc-200 text-sm block truncate max-w-[300px]">
                    {cert.certificacion}
                  </span>
                </Tooltip>
                <span className="text-zinc-500 text-xs">
                  {cert.institucion} • {cert.fecha_emision || "Sin fecha"}
                </span>
              </div>
              <Tag 
                color={Math.round(cert.score * 100) >= 80 ? "green" : Math.round(cert.score * 100) >= 60 ? "gold" : "default"} 
                className="font-mono text-xs"
              >
                {Math.round(cert.score * 100)}%
              </Tag>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white m-0">Capital Intelectual</h3>
            <p className="text-xs text-zinc-400 m-0">
              Selecciona {personasRequeridas} persona{personasRequeridas !== 1 ? "s" : ""} para el equipo
            </p>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1100}
      centered
      footer={
        <div className="flex justify-between items-center">
          <div className="text-zinc-400 text-sm">
            <Check className="w-4 h-4 inline mr-1 text-green-500" />
            {uniqueSelectedPersons} de {personasRequeridas} seleccionados
          </div>
          <Space>
            <Button onClick={onClose}>Cancelar</Button>
            <Button 
              type="primary" 
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Seleccion ({uniqueSelectedPersons})
            </Button>
          </Space>
        </div>
      }
      className="talent-modal"
    >
      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por skills, tecnologias..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onPressEnter={() => handleSearch()}
          prefix={<Search className="w-4 h-4 text-zinc-500" />}
          className="flex-1"
        />
        <Select
          placeholder="Filtrar por pais"
          allowClear
          value={selectedPais}
          onChange={(value) => {
            setSelectedPais(value);
            handleSearch();
          }}
          options={countries.map(c => ({ label: c, value: c }))}
          className="w-48"
        />
        <Button
          type="primary"
          icon={<Search className="w-4 h-4" />}
          onClick={() => handleSearch()}
          loading={isLoading}
        >
          Buscar
        </Button>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : groupedPersons.length === 0 ? (
        <Empty
          description="No se encontraron candidatos"
          className="py-12"
        />
      ) : (
        <Table
          dataSource={groupedPersons}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
          className="talent-table"
          scroll={{ y: 450 }}
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            expandIcon: ({ expanded, onExpand, record }) => 
              record.certificaciones.length > 1 ? (
                <Button 
                  type="text" 
                  size="small"
                  onClick={(e) => onExpand(record, e)}
                  className="text-zinc-400 hover:text-white"
                >
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              ) : <span className="w-8" />
          }}
          rowClassName={(record) => {
            const personSelected = isPersonSelected(record);
            return personSelected ? "bg-green-950/30" : "";
          }}
        />
      )}

      {/* Seleccionados */}
      {selected.length > 0 && (
        <div className="mt-4 p-3 bg-green-950/30 rounded-lg border border-green-900/50">
          <h4 className="text-sm font-medium text-green-400 mb-2">Equipo Seleccionado:</h4>
          <div className="flex flex-wrap gap-2">
            {/* Mostrar personas únicas seleccionadas */}
            {Array.from(new Map(selected.map(c => [`${c.nombre}-${c.pais}`, c])).values()).map((c, idx) => (
              <Tag
                key={idx}
                color="green"
                closable
                onClose={() => {
                  // Crear un GroupedPerson temporal para usar togglePerson
                  const person: GroupedPerson = {
                    key: `${c.nombre}-${c.pais}`,
                    nombre: c.nombre,
                    cargo: c.cargo,
                    pais: c.pais,
                    bestScore: c.score,
                    certificaciones: [{ certificacion: c.certificacion, institucion: c.institucion, fecha_emision: c.fecha_emision, score: c.score }]
                  };
                  togglePerson(person);
                }}
                className="flex items-center gap-1"
              >
                {c.nombre}
                <span className="text-green-300/70 text-xs">({c.pais})</span>
              </Tag>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
