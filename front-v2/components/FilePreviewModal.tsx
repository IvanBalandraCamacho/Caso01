"use client";
import { Modal, Spin, Button, Alert } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { fetchDocumentContent } from "@/lib/api";
import mammoth from "mammoth";

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
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDocx = fileType.toLowerCase().includes("word") || 
    fileType.toLowerCase().includes("officedocument") ||
    /\.(docx|doc)$/i.test(fileName);

  useEffect(() => {
    if (open && workspaceId && documentId) {
      setLoading(true);
      setError(null);
      setDocxHtml(null);
      
      fetchDocumentContent(workspaceId, documentId)
        .then(async (blob) => {
          const url = URL.createObjectURL(blob);
          setContentUrl(url);
          
          // If it's a DOCX file, convert to HTML using mammoth
          if (isDocx) {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const result = await mammoth.convertToHtml({ arrayBuffer });
              setDocxHtml(result.value);
              if (result.messages.length > 0) {
                console.warn("Mammoth conversion warnings:", result.messages);
              }
            } catch (docxErr) {
              console.error("Error converting DOCX:", docxErr);
              // Fall back to download option if conversion fails
              setDocxHtml(null);
            }
          }
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
      setDocxHtml(null);
    }
  }, [open, workspaceId, documentId, isDocx]);

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

    // DOCX/DOC preview using mammoth
    if (isDocx) {
      if (docxHtml) {
        return (
          <div 
            style={{ 
              width: "100%", 
              height: "600px", 
              overflow: "auto",
              padding: "24px",
              background: "#fff",
              border: "1px solid #f0f0f0",
              borderRadius: "4px"
            }}
          >
            <style>{`
              .docx-preview h1 { font-size: 24px; font-weight: bold; margin: 16px 0; color: #1a1a1a; }
              .docx-preview h2 { font-size: 20px; font-weight: bold; margin: 14px 0; color: #1a1a1a; }
              .docx-preview h3 { font-size: 18px; font-weight: bold; margin: 12px 0; color: #1a1a1a; }
              .docx-preview p { margin: 8px 0; line-height: 1.6; color: #333; }
              .docx-preview ul, .docx-preview ol { margin: 8px 0; padding-left: 24px; }
              .docx-preview li { margin: 4px 0; }
              .docx-preview table { border-collapse: collapse; width: 100%; margin: 16px 0; }
              .docx-preview th, .docx-preview td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .docx-preview th { background-color: #f5f5f5; font-weight: bold; }
              .docx-preview img { max-width: 100%; height: auto; }
              .docx-preview strong { font-weight: bold; }
              .docx-preview em { font-style: italic; }
            `}</style>
            <div 
              className="docx-preview"
              dangerouslySetInnerHTML={{ __html: docxHtml }} 
            />
          </div>
        );
      } else {
        // Fallback if conversion failed
        return (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Alert 
              type="warning" 
              message="No se pudo previsualizar el documento Word" 
              description="El archivo puede estar dañado o en un formato no compatible. Puedes descargarlo para verlo localmente."
              style={{ marginBottom: 16 }}
            />
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
      }
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
