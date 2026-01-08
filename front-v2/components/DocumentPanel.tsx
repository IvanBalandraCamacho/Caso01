"use client";
import { useState } from "react";
import { Drawer, Button, Tabs, Empty, Badge, Tooltip, Space } from "antd";
import {
  FileOutlined,
  FolderOutlined,
  UploadOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { DocumentList } from "./DocumentList";
import { UploadModal } from "./UploadModal";
import { FilePreviewModal } from "./FilePreviewModal";
import type { Document } from "@/context/WorkspaceContext";

interface DocumentPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId?: string | null;
  workspaceDocuments: Document[];
  conversationDocuments: Document[];
  isLoadingWorkspaceDocs?: boolean;
  isLoadingConversationDocs?: boolean;
  onDeleteDocument?: (documentId: string) => void;
  onRefreshWorkspaceDocs?: () => void;
  onRefreshConversationDocs?: () => void;
  onUploadComplete?: () => void;
}

export function DocumentPanel({
  open,
  onClose,
  workspaceId,
  conversationId,
  workspaceDocuments,
  conversationDocuments,
  isLoadingWorkspaceDocs = false,
  isLoadingConversationDocs = false,
  onDeleteDocument,
  onRefreshWorkspaceDocs,
  onRefreshConversationDocs,
  onUploadComplete,
}: DocumentPanelProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [uploadTarget, setUploadTarget] = useState<"workspace" | "conversation">(
    "workspace"
  );
  const [activeTab, setActiveTab] = useState("workspace");

  const handleOpenUpload = (target: "workspace" | "conversation") => {
    setUploadTarget(target);
    setIsUploadModalOpen(true);
  };

  const handlePreview = (doc: Document) => {
    setPreviewDoc(doc);
  };

  const handleUploadComplete = () => {
    if (uploadTarget === "workspace") {
      onRefreshWorkspaceDocs?.();
    } else {
      onRefreshConversationDocs?.();
    }
    onUploadComplete?.();
  };

  const workspaceDocsCount = workspaceDocuments.length;
  const conversationDocsCount = conversationDocuments.length;

  const tabItems = [
    {
      key: "workspace",
      label: (
        <Space>
          <FolderOutlined />
          <span>Workspace</span>
          {workspaceDocsCount > 0 && (
            <Badge count={workspaceDocsCount} size="small" />
          )}
        </Space>
      ),
      children: (
        <div style={{ padding: "16px 0" }}>
          <Space style={{ width: "100%", justifyContent: "flex-end", marginBottom: 16 }}>
            <Tooltip title="Actualizar documentos">
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={onRefreshWorkspaceDocs}
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              size="small"
              onClick={() => handleOpenUpload("workspace")}
            >
              Subir
            </Button>
          </Space>
          <DocumentList
            documents={workspaceDocuments}
            isLoading={isLoadingWorkspaceDocs}
            onDelete={onDeleteDocument}
            onPreview={handlePreview}
          />
        </div>
      ),
    },
    {
      key: "conversation",
      label: (
        <Space>
          <FileOutlined />
          <span>Conversación</span>
          {conversationDocsCount > 0 && (
            <Badge count={conversationDocsCount} size="small" />
          )}
        </Space>
      ),
      disabled: !conversationId,
      children: conversationId ? (
        <div style={{ padding: "16px 0" }}>
          <Space style={{ width: "100%", justifyContent: "flex-end", marginBottom: 16 }}>
            <Tooltip title="Actualizar documentos">
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={onRefreshConversationDocs}
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              size="small"
              onClick={() => handleOpenUpload("conversation")}
            >
              Subir
            </Button>
          </Space>
          <DocumentList
            documents={conversationDocuments}
            isLoading={isLoadingConversationDocs}
            onDelete={onDeleteDocument}
            onPreview={handlePreview}
          />
        </div>
      ) : (
        <Empty
          description="Selecciona una conversación para ver sus documentos"
          style={{ marginTop: 40 }}
        />
      ),
    },
  ];

  return (
    <>
      <Drawer
        title={
          <Space>
            <FileOutlined />
            <span>Documentos</span>
          </Space>
        }
        placement="right"
        styles={{ wrapper: { width: 400 } }}
        open={open}
        onClose={onClose}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
        />
      </Drawer>

      <UploadModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        workspaceId={workspaceId}
        conversationId={uploadTarget === "conversation" ? conversationId : null}
        onUploadComplete={handleUploadComplete}
      />

      <FilePreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        workspaceId={workspaceId}
        documentId={previewDoc?.id || null}
        fileName={previewDoc?.file_name || ""}
        fileType={previewDoc?.file_type || ""}
      />
    </>
  );
}
