"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, FileText } from "lucide-react";
import { useSearchRAG } from "@/hooks/useApi";
import { SearchResult } from "@/types/api";

interface SemanticSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export function SemanticSearchModal({
  isOpen,
  onClose,
  workspaceId,
}: SemanticSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const searchMutation = useSearchRAG();

  const handleSearch = async () => {
    if (!query.trim() || !workspaceId) return;

    try {
      const searchResults = await searchMutation.mutateAsync({
        query: query,
        workspace_id: workspaceId,
        limit: 10,
        threshold: 0.6,
      });
      setResults(searchResults);
    } catch (error) {
      console.error("Error en búsqueda semántica:", error);
    }
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Semántica
          </DialogTitle>
          <DialogDescription>
            Busca información en tus documentos usando búsqueda semántica
            impulsada por IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="flex gap-2">
            <Input
              placeholder="¿Qué información necesitas encontrar?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim()}
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[50vh] pr-2">
            {searchMutation.isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!searchMutation.isPending && results.length === 0 && query && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron resultados para "{query}"
              </div>
            )}

            {!searchMutation.isPending && results.length === 0 && !query && (
              <div className="text-center py-8 text-muted-foreground">
                Escribe una consulta para comenzar a buscar
              </div>
            )}

            {results.map((result, index) => (
              <div
                key={`${result.document_id}-${index}`}
                className="p-4 bg-muted rounded-lg border border-border hover:border-primary transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {result.metadata.filename || "Documento"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Relevancia: {(result.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-3">
                      {result.content}
                    </p>
                    {result.metadata.chunk_index !== undefined && (
                      <span className="text-xs text-muted-foreground mt-2 block">
                        Fragmento #{result.metadata.chunk_index}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer con estadísticas */}
          {results.length > 0 && (
            <div className="text-sm text-muted-foreground border-t pt-3">
              {results.length} resultado{results.length !== 1 ? "s" : ""}{" "}
              encontrado{results.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
