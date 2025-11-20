"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { FilterDropdown } from "./ui/filter-dropdown";
import { Button } from "@/components/ui/button";
import { DocumentList } from "./document-list";

export function DocumentPanel() {
  const {
    activeWorkspace,
    documents,
    fetchDocuments,
    isLoadingDocs,
    exportDocumentsToCsv,
  } = useWorkspaces();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (activeWorkspace) {
      fetchDocuments(activeWorkspace.id);
    }
  }, [activeWorkspace, fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) =>
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((doc) => statusFilter === "all" || doc.status === statusFilter)
      .filter((doc) => typeFilter === "all" || doc.file_type === typeFilter);
  }, [documents, searchQuery, statusFilter, typeFilter]);

  return (
    <div className="w-96 bg-popover p-4 border-l border-border h-full flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-4">Documents</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full bg-card border border-input rounded-lg py-2 px-3 focus-visible:ring-primary text-foreground placeholder-muted-foreground"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex space-x-2 mb-4">
        <FilterDropdown
          placeholder="Status"
          options={[
            { value: "all", label: "All" },
            { value: "PENDING", label: "Pending" },
            { value: "PROCESSING", label: "Processing" },
            { value: "COMPLETED", label: "Completed" },
            { value: "FAILED", label: "Failed" },
          ]}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          placeholder="File Type"
          options={[
            { value: "all", label: "All" },
            { value: "pdf", label: "PDF" },
            { value: "docx", label: "DOCX" },
            { value: "xlsx", label: "XLSX" },
          ]}
          onChange={setTypeFilter}
        />
      </div>
      <div className="mb-4">
        <Button
          variant="outline"
          className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-medium"
          onClick={() =>
            activeWorkspace && exportDocumentsToCsv(activeWorkspace.id)
          }
          disabled={!activeWorkspace}
        >
          Export to CSV
        </Button>
      </div>
      {isLoadingDocs ? (
        <div className="space-y-3">
           {/* Skeleton Loader */}
           {[1, 2, 3].map((i) => (
             <div key={i} className="h-20 bg-card animate-pulse rounded-lg" />
           ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <DocumentList 
            documents={filteredDocuments}
            workspaceId={activeWorkspace?.id}
            onDeleteSuccess={() => activeWorkspace && fetchDocuments(activeWorkspace.id)}
          />
        </div>
      )}
    </div>
  );
}
