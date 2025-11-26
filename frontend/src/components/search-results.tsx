"use client";
import React from "react";

interface SearchResult {
  id: string;
  file_name: string;
  text: string;
}

interface SearchResultsProps {
  results: SearchResult[];
}

export function SearchResults({ results }: SearchResultsProps) {
  return (
    <div className="absolute top-0 left-72 w-96 bg-brand-dark-secondary p-4 h-full">
      <h2 className="text-lg font-semibold text-white mb-4">Search Results</h2>
      <ul>
        {results.map((result) => (
          <li key={result.id} className="text-gray-300 mb-4">
            <p className="text-white font-medium">{result.file_name}</p>
            <p className="text-gray-400 text-sm">{result.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
