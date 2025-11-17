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
    <div className="w-96 bg-brand-dark-secondary p-4">
      <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full bg-brand-dark border border-gray-700 rounded-lg py-2 px-3 focus-visible:ring-brand-red text-gray-300 placeholder-gray-500"
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
          className="w-full bg-brand-red text-white hover:bg-red-700 font-medium"
          onClick={() =>
            activeWorkspace && exportDocumentsToCsv(activeWorkspace.id)
          }
          disabled={!activeWorkspace}
        >
          Export to CSV
        </Button>
      </div>
      {isLoadingDocs ? (
        <p className="text-gray-400">Loading documents...</p>
      ) : (
        <DocumentList 
          documents={filteredDocuments}
          workspaceId={activeWorkspace?.id}
          onDeleteSuccess={() => activeWorkspace && fetchDocuments(activeWorkspace.id)}
        />
      )}
    </div>
  );
}
