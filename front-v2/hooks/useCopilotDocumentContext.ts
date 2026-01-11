"use client";

import { useCopilotReadable } from "@copilotkit/react-core";
import { useEffect, useState } from "react";
import { fetchDocumentContent } from "@/lib/api";

interface UseCopilotDocumentContextProps {
  workspaceId: string;
  documentId?: string;
}

export function useCopilotDocumentContext({
  workspaceId,
  documentId,
}: UseCopilotDocumentContextProps) {
  const [documentContent, setDocumentContent] = useState<string>("");
  const [documentMetadata, setDocumentMetadata] = useState<any>(null);

  useEffect(() => {
    if (documentId && workspaceId) {
      loadDocumentContent();
    }
  }, [documentId, workspaceId]);

  const loadDocumentContent = async () => {
    try {
      // fetchDocumentContent returns a Blob, we need to convert it to text
      const blob = await fetchDocumentContent(workspaceId, documentId!);
      const text = await blob.text();
      setDocumentContent(text);
      setDocumentMetadata({ 
        id: documentId, 
        workspaceId,
        size: blob.size,
        type: blob.type 
      });
    } catch (error) {
      console.error("Error loading document:", error);
    }
  };

  // Registrar contenido del documento para el copiloto
  useCopilotReadable({
    description: "Contenido completo del documento RFP actual",
    value: documentContent,
  });

  // Registrar metadata del documento
  useCopilotReadable({
    description: "Metadata del documento (nombre, tipo, tamaño)",
    value: JSON.stringify(documentMetadata || {}),
  });

  // Registrar información del workspace
  useCopilotReadable({
    description: "ID del workspace actual",
    value: workspaceId,
  });

  return {
    documentContent,
    documentMetadata,
    isLoaded: !!documentContent,
  };
}
