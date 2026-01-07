"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Modal,
  Upload,
  Button,
  Typography,
  List,
  Space,
  App,
  Tag,
} from "antd";
import {
  InboxOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { UploadProps, UploadFile } from "antd";
import { uploadDocumentApi, uploadDocumentToConversation } from "@/lib/api";
import { DocumentPublic } from "@/types/api";

const { Dragger } = Upload;
const { Text, Title } = Typography;

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId?: string | null;
  onUploadComplete?: () => void;
}

// Extended status to match backend document processing states
type FileUploadStatus = "pending" | "uploading" | "processing" | "success" | "error";

interface FileWithStatus extends UploadFile {
  uploadStatus?: FileUploadStatus;
  errorMessage?: string;
  documentId?: string; // Track the document ID returned from API
}

export function UploadModal({
  open,
  onClose,
  workspaceId,
  conversationId,
  onUploadComplete,
}: UploadModalProps) {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Setup WebSocket connection to listen for document processing status
  useEffect(() => {
    if (!open || !workspaceId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/notifications";

    console.log("🔌 UploadModal: Conectando WebSocket...", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ UploadModal: WebSocket conectado");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 UploadModal: Notificación recibida:", data);

        // Filter by workspace if specified
        if (data.workspace_id && data.workspace_id !== workspaceId) {
          return;
        }

        // Filter by conversation if specified
        if (conversationId && data.conversation_id && data.conversation_id !== conversationId) {
          return;
        }

        // Update file status based on document processing
        if (data.document_id && (data.status === "COMPLETED" || data.status === "ERROR")) {
          setFileList((prev) =>
            prev.map((f) => {
              if (f.documentId === data.document_id) {
                if (data.status === "COMPLETED") {
                  return { ...f, uploadStatus: "success" as const };
                } else if (data.status === "ERROR") {
                  return {
                    ...f,
                    uploadStatus: "error" as const,
                    errorMessage: data.error || "Error al procesar documento",
                  };
                }
              }
              return f;
            })
          );

          // Notify success to refresh document list
          if (data.status === "COMPLETED") {
            onUploadComplete?.();
          }
        }
      } catch (err) {
        console.error("❌ UploadModal: Error parseando mensaje WS:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("❌ UploadModal: Error en WebSocket:", err);
    };

    ws.onclose = () => {
      console.log("🔌 UploadModal: WebSocket cerrado");
    };

    setWsConnection(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [open, workspaceId, conversationId, onUploadComplete]);

  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning("Por favor, selecciona al menos un archivo");
      return;
    }

    setIsUploading(true);

    // Upload files that are still pending
    const uploadPromises = fileList
      .filter((file) => file.uploadStatus === "pending" || !file.uploadStatus)
      .map(async (file) => {
        if (!file.originFileObj) return;

        // 1. Mark as uploading
        setFileList((prev) =>
          prev.map((f) =>
            f.uid === file.uid ? { ...f, uploadStatus: "uploading" as const } : f
          )
        );

        try {
          const formData = new FormData();
          formData.append("file", file.originFileObj);

          let result: DocumentPublic;
          if (conversationId) {
            result = await uploadDocumentToConversation(
              workspaceId,
              conversationId,
              formData
            );
          } else {
            result = await uploadDocumentApi(workspaceId, formData);
          }

          // 2. Mark as processing and store document ID
          // The document is uploaded but still being processed/indexed in the backend
          setFileList((prev) =>
            prev.map((f) =>
              f.uid === file.uid
                ? {
                  ...f,
                  uploadStatus: "processing" as const,
                  documentId: result.id,
                }
                : f
            )
          );

          // Don't call onUploadComplete here - wait for WebSocket notification

          return { success: true, file: file.name };
        } catch (error: unknown) {
          // 3. Mark as error
          const errorMsg =
            error instanceof Error ? error.message : "Error desconocido";
          setFileList((prev) =>
            prev.map((f) =>
              f.uid === file.uid
                ? {
                  ...f,
                  uploadStatus: "error" as const,
                  errorMessage: errorMsg,
                }
                : f
            )
          );

          return { success: false, file: file.name, error: errorMsg };
        }
      });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter((r) => r?.success).length;
    const errorCount = results.filter((r) => r && !r.success).length;

    setIsUploading(false);

    if (successCount > 0) {
      message.success(
        `${successCount} archivo(s) subido(s), procesando...`
      );
    }
    if (errorCount > 0) {
      message.error(`${errorCount} archivo(s) fallaron al subir`);
    }
  }, [fileList, workspaceId, conversationId]);

  const handleClose = () => {
    setFileList([]);
    onClose();
  };

  const handleReset = () => {
    setFileList([]);
  };

  // Check if all files are done (success or error) - NOT processing
  const allDone =
    fileList.length > 0 &&
    fileList.every((f) => f.uploadStatus === "success" || f.uploadStatus === "error");

  // Check if any file is still being processed or uploaded
  const isProcessingOrUploading = fileList.some(
    (f) => f.uploadStatus === "uploading" || f.uploadStatus === "processing"
  );

  // Check if there are pending files to upload
  const hasPendingFiles = fileList.some(
    (f) => f.uploadStatus === "pending" || !f.uploadStatus
  );

  const uploadProps: UploadProps = {
    name: "file",
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      // Add file to list without uploading
      const newFile: FileWithStatus = {
        uid: file.uid,
        name: file.name,
        size: file.size,
        type: file.type,
        originFileObj: file,
        status: "done",
      };
      setFileList((prev) => [...prev, newFile]);
      return false; // Prevent automatic upload
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    },
    showUploadList: false,
    accept: ".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.ppt,.json,.xml,.html,.md",
  };

  const getStatusIcon = (file: FileWithStatus) => {
    switch (file.uploadStatus) {
      case "uploading":
        return <LoadingOutlined style={{ color: "#1890ff" }} />;
      case "processing":
        return <ClockCircleOutlined style={{ color: "#faad14" }} />;
      case "success":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      case "error":
        return <CloseCircleOutlined style={{ color: "#ff4d4f" }} />;
      default:
        return <FileOutlined />;
    }
  };

  const getStatusTag = (file: FileWithStatus) => {
    switch (file.uploadStatus) {
      case "uploading":
        return <Tag color="processing">Subiendo...</Tag>;
      case "processing":
        return <Tag color="warning">Procesando...</Tag>;
      case "success":
        return <Tag color="success">Completado</Tag>;
      case "error":
        return <Tag color="error">Error</Tag>;
      default:
        return <Tag color="default">Pendiente</Tag>;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileOutlined style={{ color: "#E3E3E3" }} />
          <span style={{ color: "#FFFFFF" }}>Subir Documentos</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={[
        <Button
          key="cancel"
          onClick={handleClose}
          disabled={isProcessingOrUploading}
          style={{
            background: "transparent",
            border: "1px solid #3A3A3D",
            color: "#888888",
          }}
        >
          {allDone ? "Cerrar" : "Cancelar"}
        </Button>,
        allDone ? (
          <Button
            key="reset"
            type="primary"
            onClick={handleReset}
            style={{
              background: "#E53935",
              border: "none",
            }}
          >
            Subir Más
          </Button>
        ) : isProcessingOrUploading ? (
          <Button
            key="processing"
            type="primary"
            loading={true}
            disabled={true}
            style={{
              background: "#E53935",
              border: "none",
            }}
          >
            Procesando...
          </Button>
        ) : (
          <Button
            key="upload"
            type="primary"
            onClick={handleUpload}
            disabled={!hasPendingFiles}
            style={{
              background: "#E53935",
              border: "none",
            }}
          >
            {isUploading
              ? "Subiendo..."
              : `Subir ${fileList.filter((f) => !f.uploadStatus || f.uploadStatus === "pending").length} archivo(s)`}
          </Button>
        ),
      ]}
      width={600}
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
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Dragger
          {...uploadProps}
          disabled={isUploading || isProcessingOrUploading}
          style={{
            background: "#0F0F0F",
            border: "1px dashed #3A3A3D",
            borderRadius: "8px",
            opacity: isProcessingOrUploading ? 0.6 : 1,
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: "#888888", fontSize: "48px" }} />
          </p>
          <p className="ant-upload-text" style={{ color: "#E3E3E3" }}>
            {isProcessingOrUploading
              ? "Espera a que termine el procesamiento..."
              : "Haz clic o arrastra archivos aquí para subirlos"}
          </p>
          <p className="ant-upload-hint" style={{ color: "#666666" }}>
            Formatos soportados: PDF, Word, Excel, PowerPoint, TXT, CSV, JSON,
            XML, HTML, Markdown
          </p>
        </Dragger>

        {fileList.length > 0 && (
          <>
            <Title level={5} style={{ color: "#E3E3E3", margin: 0 }}>
              Archivos seleccionados ({fileList.length})
            </Title>
            <List
              size="small"
              bordered
              style={{
                background: "#0F0F0F",
                border: "1px solid #2A2A2D",
                borderRadius: "8px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
              dataSource={fileList}
              renderItem={(file: FileWithStatus) => (
                <List.Item
                  style={{
                    borderBottom: "1px solid #2A2A2D",
                    padding: "12px 16px",
                  }}
                  actions={[
                    !file.uploadStatus && (
                      <Button
                        key="delete"
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          setFileList((prev) =>
                            prev.filter((f) => f.uid !== file.uid)
                          )
                        }
                        disabled={isUploading || isProcessingOrUploading}
                      />
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={getStatusIcon(file)}
                    title={
                      <Space direction="vertical" size={0}>
                        <Space>
                          <Text
                            ellipsis
                            style={{ maxWidth: 250, color: "#E3E3E3" }}
                          >
                            {file.name}
                          </Text>
                          {getStatusTag(file)}
                        </Space>
                        {file.uploadStatus === "processing" && (
                          <Text
                            style={{ fontSize: "12px", color: "#faad14" }}
                          >
                            ⏱ Procesando documento en segundo plano...
                          </Text>
                        )}
                      </Space>
                    }
                    description={
                      <>
                        <Text style={{ color: "#888888" }}>
                          {file.size
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : ""}
                        </Text>
                        {file.uploadStatus === "error" && (
                          <div>
                            <Text type="danger" style={{ fontSize: "12px" }}>
                              {file.errorMessage}
                            </Text>
                          </div>
                        )}
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}

        <Text style={{ fontSize: "12px", color: "#666666" }}>
          {conversationId
            ? "Los documentos se asociarán a la conversación actual."
            : "Los documentos se asociarán al workspace y estarán disponibles para todas las conversaciones."}
        </Text>
      </Space>
    </Modal>
  );
}
