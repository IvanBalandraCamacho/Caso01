"use client";
import { List, Tag, Button, Typography, Tooltip, Empty, Spin, Space } from "antd";
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { DocumentStatus } from "@/types/api";
import type { Document } from "@/context/WorkspaceContext";

const { Text } = Typography;

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onDelete?: (documentId: string) => void;
  onRefresh?: () => void;
  onPreview?: (document: Document) => void;
  showConversationBadge?: boolean;
}

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type.includes("pdf")) return <FilePdfOutlined style={{ color: "#ff4d4f" }} />;
  if (type.includes("word") || type.includes("doc"))
    return <FileWordOutlined style={{ color: "#1890ff" }} />;
  if (type.includes("excel") || type.includes("xls") || type.includes("csv"))
    return <FileExcelOutlined style={{ color: "#52c41a" }} />;
  if (type.includes("text") || type.includes("txt"))
    return <FileTextOutlined style={{ color: "#722ed1" }} />;
  return <FileOutlined />;
};

const getStatusTag = (status: DocumentStatus) => {
  switch (status) {
    case "COMPLETED":
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Procesado
        </Tag>
      );
    case "PROCESSING":
      return (
        <Tag icon={<SyncOutlined spin />} color="processing">
          Procesando
        </Tag>
      );
    case "PENDING":
      return (
        <Tag icon={<ClockCircleOutlined />} color="default">
          Pendiente
        </Tag>
      );
    case "FAILED":
      return (
        <Tag icon={<ExclamationCircleOutlined />} color="error">
          Error
        </Tag>
      );
    default:
      return <Tag color="default">{status}</Tag>;
  }
};

export function DocumentList({
  documents,
  isLoading = false,
  onDelete,
  onRefresh,
  onPreview,
  showConversationBadge = false,
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Cargando documentos...</Text>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No hay documentos"
      >
        {onRefresh && (
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            Actualizar
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <div>
      {onRefresh && (
        <div style={{ marginBottom: 16, textAlign: "right" }}>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={onRefresh}
          >
            Actualizar
          </Button>
        </div>
      )}
      <List
        size="small"
        dataSource={documents}
        renderItem={(doc) => (
          <List.Item
            style={{ cursor: onPreview ? "pointer" : "default" }}
            onClick={() => onPreview?.(doc)}
            actions={
              onDelete
                ? [
                  <Tooltip key="delete" title="Eliminar documento">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                    />
                  </Tooltip>,
                ]
                : undefined
            }
          >
            <List.Item.Meta
              avatar={getFileIcon(doc.file_type)}
              title={
                <Space>
                  <Tooltip title={doc.file_name}>
                    <Text ellipsis style={{ maxWidth: 200 }}>
                      {doc.file_name}
                    </Text>
                  </Tooltip>
                  {showConversationBadge && doc.conversation_id && (
                    <Tag color="blue" style={{ fontSize: "10px" }}>
                      Conv
                    </Tag>
                  )}
                </Space>
              }
              description={
                <Space size="small">
                  {getStatusTag(doc.status)}
                  {doc.chunk_count !== undefined && doc.chunk_count > 0 && (
                    <Text type="secondary" style={{ fontSize: "11px" }}>
                      {doc.chunk_count} chunks
                    </Text>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
