"use client";
import { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Typography,
  Space,
  Steps,
  Result,
  Spin,
  Card,
  List,
  Tag,
  Divider,
  Alert,
  message,
} from "antd";
import {
  FileSearchOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  FileWordOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { analyzeProposalApi, generateProposalDocumentApi } from "@/lib/api";
import type { ProposalAnalysis } from "@/types/api";

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

interface ProposalModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId?: string | null;
}

export function ProposalModal({
  open,
  onClose,
  workspaceId,
  conversationId,
}: ProposalModalProps) {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProposalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    form.resetFields();
    setCurrentStep(0);
    setAnalysisResult(null);
    setError(null);
    onClose();
  };

  const handleAnalyze = async () => {
    try {
      const values = await form.validateFields();
      setIsAnalyzing(true);
      setError(null);

      const result = await analyzeProposalApi({
        workspace_id: workspaceId,
        conversation_id: conversationId || undefined,
        requirements: values.requirements,
        context: values.context || undefined,
        output_format: values.outputFormat,
      });

      setAnalysisResult(result);
      setCurrentStep(1);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al analizar la propuesta";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!analysisResult) return;

    setIsGenerating(true);
    try {
      const blob = await generateProposalDocumentApi({
        workspace_id: workspaceId,
        analysis: analysisResult,
        format: "docx",
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `propuesta_${new Date().toISOString().split("T")[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success("Documento generado correctamente");
      setCurrentStep(2);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al generar el documento";
      message.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const steps = [
    { title: "Análisis", icon: <FileSearchOutlined /> },
    { title: "Revisión", icon: <LoadingOutlined /> },
    { title: "Generación", icon: <FileWordOutlined /> },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
            <Form.Item
              name="requirements"
              label="Requisitos o descripción del RFP"
              rules={[
                { required: true, message: "Por favor, ingresa los requisitos" },
              ]}
            >
              <TextArea
                rows={6}
                placeholder="Describe los requisitos del RFP o pega el contenido relevante..."
              />
            </Form.Item>

            <Form.Item
              name="context"
              label="Contexto adicional (opcional)"
            >
              <TextArea
                rows={3}
                placeholder="Información adicional sobre el cliente, sector, etc."
              />
            </Form.Item>

            <Form.Item
              name="outputFormat"
              label="Formato de salida"
              initialValue="structured"
            >
              <Select
                options={[
                  { value: "structured", label: "Estructurado (Secciones)" },
                  { value: "narrative", label: "Narrativo" },
                  { value: "technical", label: "Técnico detallado" },
                ]}
              />
            </Form.Item>

            {error && (
              <Alert
                type="error"
                message={error}
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 16 }}
              />
            )}
          </Form>
        );

      case 1:
        return analysisResult ? (
          <div style={{ marginTop: 24 }}>
            <Card size="small" title="Información del Cliente">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text><strong>Cliente:</strong> {analysisResult.cliente}</Text>
                <Text><strong>Fecha de entrega:</strong> {analysisResult.fecha_entrega}</Text>
              </Space>
            </Card>

            <Divider>Alcance Económico</Divider>
            <Card size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text><strong>Presupuesto:</strong> {analysisResult.alcance_economico?.presupuesto}</Text>
                <Text><strong>Moneda:</strong> {analysisResult.alcance_economico?.moneda}</Text>
              </Space>
            </Card>

            <Divider>Tecnologías Requeridas</Divider>
            <Space wrap>
              {analysisResult.tecnologias_requeridas?.map((tech, idx) => (
                <Tag key={idx} color="blue">{tech}</Tag>
              ))}
            </Space>

            {analysisResult.riesgos_detectados && analysisResult.riesgos_detectados.length > 0 && (
              <>
                <Divider>Riesgos Detectados</Divider>
                <List
                  size="small"
                  dataSource={analysisResult.riesgos_detectados}
                  renderItem={(riesgo: string) => (
                    <List.Item>
                      <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                        {riesgo}
                      </Tag>
                    </List.Item>
                  )}
                />
              </>
            )}

            {analysisResult.preguntas_sugeridas && analysisResult.preguntas_sugeridas.length > 0 && (
              <>
                <Divider>Preguntas Sugeridas</Divider>
                <List
                  size="small"
                  dataSource={analysisResult.preguntas_sugeridas}
                  renderItem={(pregunta: string, idx: number) => (
                    <List.Item>
                      <Text>{idx + 1}. {pregunta}</Text>
                    </List.Item>
                  )}
                />
              </>
            )}

            {analysisResult.equipo_sugerido && analysisResult.equipo_sugerido.length > 0 && (
              <>
                <Divider>Equipo Sugerido</Divider>
                <List
                  size="small"
                  dataSource={analysisResult.equipo_sugerido}
                  renderItem={(miembro) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`${miembro.nombre} - ${miembro.rol}`}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text type="secondary">Experiencia: {miembro.experiencia}</Text>
                            <Space wrap>
                              {miembro.skills?.map((skill, idx) => (
                                <Tag key={idx} style={{ fontSize: "11px" }}>{skill}</Tag>
                              ))}
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin />
            <div style={{ marginTop: 8 }}>Cargando análisis...</div>
          </div>
        );

      case 2:
        return (
          <Result
            status="success"
            title="Documento generado correctamente"
            subTitle="El archivo ha sido descargado a tu computadora"
            extra={[
              <Button key="close" type="primary" onClick={handleClose}>
                Cerrar
              </Button>,
              <Button key="new" onClick={() => setCurrentStep(0)}>
                Nuevo análisis
              </Button>,
            ]}
          />
        );

      default:
        return null;
    }
  };

  const renderFooter = () => {
    if (currentStep === 2) return null;

    return (
      <Space>
        <Button onClick={handleClose}>Cancelar</Button>
        {currentStep === 0 ? (
          <Button
            type="primary"
            onClick={handleAnalyze}
            loading={isAnalyzing}
            icon={<FileSearchOutlined />}
          >
            Analizar
          </Button>
        ) : (
          <>
            <Button onClick={() => setCurrentStep(0)}>Volver</Button>
            <Button
              type="primary"
              onClick={handleGenerateDocument}
              loading={isGenerating}
              icon={<DownloadOutlined />}
            >
              Generar documento
            </Button>
          </>
        )}
      </Space>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <FileSearchOutlined style={{ color: "#E3E3E3" }} />
          <span style={{ color: "#FFFFFF" }}>Análisis de Propuesta (RFP)</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={700}
      footer={renderFooter()}
      centered
      styles={{
        content: {
          background: "#1A1A1A",
          borderRadius: "16px",
          border: "none",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
        },
        header: {
          background: "#1A1A1A",
          borderBottom: "1px solid #2A2A2D",
          padding: "16px 24px",
        },
        body: {
          background: "#1A1A1A",
          padding: "24px",
        },
        footer: {
          background: "#1A1A1A",
          borderTop: "1px solid #2A2A2D",
          padding: "16px 24px",
        },
        mask: {
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
        },
      } as any}
      closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
    >
      <Steps
        current={currentStep}
        items={steps}
        size="small"
        style={{ marginBottom: 24 }}
      />
      {renderStepContent()}
    </Modal>
  );
}
