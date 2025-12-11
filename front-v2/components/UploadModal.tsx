"use client";
import { useState, useCallback } from "react";
import {
  Modal,
  Upload,
  Button,
  Typography,
  Progress,
  List,
  Space,
  message,
  Tag,
} from "antd";
import {
  InboxOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { UploadProps, UploadFile } from "antd";
import { uploadDocumentApi, uploadDocumentToConversation } from "@/lib/api";

const { Dragger } = Upload;
const { Text, Title } = Typography;

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId?: string | null;
  onUploadComplete?: () => void;
}

interface FileWithStatus extends UploadFile {
  uploadProgress?: number;
  uploadStatus?: "uploading" | "success" | "error";
  errorMessage?: string;
}

export function UploadModal({
  open,
  onClose,
  workspaceId,
  conversationId,
  onUploadComplete,
}: UploadModalProps) {
  const [fileList, setFileList] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning("Por favor, selecciona al menos un archivo");
      return;
    }

    setIsUploading(true);

    const uploadPromises = fileList.map(async (file, index) => {
      if (!file.originFileObj) return;

      // Update status to uploading
      setFileList((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, uploadStatus: "uploading" as const, uploadProgress: 0 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", file.originFileObj);

        // Simulate progress (real progress would need XMLHttpRequest or fetch with ReadableStream)
        const progressInterval = setInterval(() => {
          setFileList((prev) =>
            prev.map((f, i) =>
              i === index && f.uploadStatus === "uploading"
                ? { ...f, uploadProgress: Math.min((f.uploadProgress || 0) + 10, 90) }
                : f
            )
          );
        }, 200);

        let result;
        if (conversationId) {
          result = await uploadDocumentToConversation(
            workspaceId,
            conversationId,
            formData
          );
        } else {
          result = await uploadDocumentApi(workspaceId, formData);
        }

        clearInterval(progressInterval);

        // Update status to success
        setFileList((prev) =>
          prev.map((f, i) =>
            i === index
              ? { ...f, uploadStatus: "success" as const, uploadProgress: 100 }
              : f
          )
        );

        return { success: true, file: file.name, result };
      } catch (error: unknown) {
        // Update status to error
        const errorMsg = error instanceof Error ? error.message : "Error desconocido";
        setFileList((prev) =>
          prev.map((f, i) =>
            i === index
              ? { ...f, uploadStatus: "error" as const, errorMessage: errorMsg }
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
      message.success(`${successCount} archivo(s) subido(s) correctamente`);
      onUploadComplete?.();
    }
    if (errorCount > 0) {
      message.error(`${errorCount} archivo(s) fallaron al subir`);
    }

    // Close modal if all succeeded
    if (errorCount === 0) {
      handleClose();
    }
  }, [fileList, workspaceId, conversationId, onUploadComplete]);

  const handleClose = () => {
    setFileList([]);
    onClose();
  };

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
          disabled={isUploading}
          style={{
            background: "transparent",
            border: "1px solid #3A3A3D",
            color: "#888888",
          }}
        >
          Cancelar
        </Button>,
        <Button
          key="upload"
          type="primary"
          onClick={handleUpload}
          loading={isUploading}
          disabled={fileList.length === 0}
          style={{
            background: "#E53935",
            border: "none",
          }}
        >
          {isUploading ? "Subiendo..." : `Subir ${fileList.length} archivo(s)`}
        </Button>,
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
      }}
      closeIcon={<span style={{ color: "#666666", fontSize: "18px" }}>×</span>}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Dragger 
          {...uploadProps} 
          disabled={isUploading}
          style={{
            background: "#0F0F0F",
            border: "1px dashed #3A3A3D",
            borderRadius: "8px",
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: "#888888", fontSize: "48px" }} />
          </p>
          <p className="ant-upload-text" style={{ color: "#E3E3E3" }}>
            Haz clic o arrastra archivos aquí para subirlos
          </p>
          <p className="ant-upload-hint" style={{ color: "#666666" }}>
            Formatos soportados: PDF, Word, Excel, PowerPoint, TXT, CSV, JSON,
            XML, HTML, Markdown
          </p>
        </Dragger>

        {fileList.length > 0 && (
          <>
            <Title level={5} style={{ color: "#E3E3E3", margin: 0 }}>Archivos seleccionados ({fileList.length})</Title>
            <List
              size="small"
              bordered
              style={{
                background: "#0F0F0F",
                border: "1px solid #2A2A2D",
                borderRadius: "8px",
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
                        disabled={isUploading}
                      />
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={getStatusIcon(file)}
                    title={
                      <Space>
                        <Text ellipsis style={{ maxWidth: 250, color: "#E3E3E3" }}>
                          {file.name}
                        </Text>
                        {getStatusTag(file)}
                      </Space>
                    }
                    description={
                      <>
                        <Text style={{ color: "#888888" }}>
                          {file.size
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : ""}
                        </Text>
                        {file.uploadStatus === "uploading" && (
                          <Progress
                            percent={file.uploadProgress || 0}
                            size="small"
                            status="active"
                          />
                        )}
                        {file.uploadStatus === "error" && (
                          <Text type="danger" style={{ fontSize: "12px" }}>
                            {file.errorMessage}
                          </Text>
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
