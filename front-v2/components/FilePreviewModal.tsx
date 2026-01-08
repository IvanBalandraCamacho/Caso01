"use client";
import { Modal, Spin, Button, Alert } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { fetchDocumentContent } from "@/lib/api";

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  documentId: string | null;
  fileName: string;
  fileType: string;
}

export function FilePreviewModal({
  open,
  onClose,
  workspaceId,
  documentId,
  fileName,
  fileType,
}: FilePreviewModalProps) {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && workspaceId && documentId) {
      setLoading(true);
      setError(null);
      fetchDocumentContent(workspaceId, documentId)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setContentUrl(url);
        })
        .catch((err) => {
          console.error("Error loading file:", err);
          setError("No se pudo cargar el archivo. Puede que haya sido eliminado del servidor.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Cleanup URL on close
      if (contentUrl) {
        URL.revokeObjectURL(contentUrl);
        setContentUrl(null);
      }
    }
  }, [open, workspaceId, documentId]);

  const isPdf = fileType.toLowerCase().includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
  const isImage = fileType.toLowerCase().startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isText = fileType.toLowerCase().includes("text/") || /\.(txt|md|csv|json)$/i.test(fileName);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <div style={{ marginTop: 8 }}>Cargando previsualización...</div>
        </div>
      );
    }

    if (error) {
      return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!contentUrl) return null;

    if (isPdf) {
      return (
        <iframe
          src={contentUrl}
          style={{ width: "100%", height: "600px", border: "none" }}
          title="PDF Preview"
        />
      );
    }

    if (isImage) {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <img
            src={contentUrl}
            alt={fileName}
            style={{ maxWidth: "100%", maxHeight: "600px", objectFit: "contain", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          />
        </div>
      );
    }

    if (isText) {
        return (
             <iframe
                src={contentUrl}
                style={{ width: "100%", height: "600px", border: "1px solid #f0f0f0", background: "#fff" }}
                title="Text Preview"
            />
        )
    }

    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <p>Este tipo de archivo no soporta previsualización directa.</p>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          href={contentUrl}
          download={fileName}
        >
          Descargar Archivo
        </Button>
      </div>
    );
  };

  return (
    <Modal
      title={fileName}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
        contentUrl && (
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            href={contentUrl}
            download={fileName}
          >
            Descargar
          </Button>
        ),
      ]}
      width={800}
      style={{ top: 20 }}
      styles={{ body: { padding: 0 } }}
    >
        {renderContent()}
    </Modal>
  );
}
