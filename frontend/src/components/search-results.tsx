"use client";
import React from "react";
import { SearchResult } from "@/types/api";

interface SearchResultsProps {
  results: SearchResult[];
}

export function SearchResults({ results }: SearchResultsProps) {
  return (
    <div className="absolute top-0 left-72 w-96 bg-brand-dark-secondary p-4 h-full">
      <h2 className="text-lg font-semibold text-white mb-4">Search Results</h2>
      <ul>
        {results.map((result, index) => (
          <li key={`${result.document_id}-${index}`} className="text-gray-300 mb-4">
            <p className="text-white font-medium">{(result.metadata as any)?.filename || result.document_id}</p>
            <p className="text-gray-400 text-sm">{result.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
