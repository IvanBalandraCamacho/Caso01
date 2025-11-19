'use client';

import { useState } from 'react';

interface DocumentGeneratorProps {
  workspaceId: string;
  conversationId: string;
}

type DocumentFormat = 'txt' | 'markdown' | 'pdf';
type DocumentType = 'complete' | 'summary' | 'key_points';

export function DocumentGenerator({ workspaceId, conversationId }: DocumentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para opciones de descarga
  const [selectedFormat, setSelectedFormat] = useState<DocumentFormat>('markdown');
  const [selectedType, setSelectedType] = useState<DocumentType>('complete');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const downloadDocument = async (format: DocumentFormat, type: DocumentType) => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/conversations/${conversationId}/generate-downloadable`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: format,
            document_type: type,
            include_metadata: true
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al generar documento');
      }

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Intentar obtener nombre del archivo del header
        let filename = `document_${workspaceId}.pdf`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccess(`✅ Documento PDF descargado`);
      } else {
        const data = await response.json();

        // Crear blob y descargar archivo (TXT/MD)
        const blob = new Blob([data.content], {
          type: 'text/plain'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccess(`✅ Documento ${format.toUpperCase()} descargado (${data.word_count} palabras)`);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al generar documento');
      setSuccess(null);
      console.error('Error generating document:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatLabels = {
    txt: 'Texto (.txt)',
    markdown: 'Markdown (.md)',
    pdf: 'PDF'
  };

  const typeLabels = {
    complete: 'Completo',
    summary: 'Resumen',
    key_points: 'Puntos Clave'
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sección de Descarga de Documentos */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generar Documento
          </h3>
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAdvancedOptions ? 'Ocultar opciones' : 'Opciones'}
          </button>
        </div>

        {/* Opciones de formato */}
        {showAdvancedOptions && (
          <div className="space-y-3 mb-3 pb-3 border-b">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['txt', 'markdown', 'pdf'] as DocumentFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedFormat === format
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {formatLabels[format]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['complete', 'summary', 'key_points'] as DocumentType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedType === type
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Botones de descarga */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => downloadDocument('txt', selectedType)}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            title="Archivo de texto plano - Máxima compatibilidad"
          >
            {isGenerating && selectedFormat === 'txt' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">TXT</span>
              </>
            )}
          </button>

          <button
            onClick={() => downloadDocument('markdown', selectedType)}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            title="Markdown - Formato ideal para editar"
          >
            {isGenerating && selectedFormat === 'markdown' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Markdown</span>
              </>
            )}
          </button>

          <button
            onClick={() => downloadDocument('pdf', selectedType)}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            title="PDF - Formato profesional"
          >
            {isGenerating && selectedFormat === 'pdf' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">PDF</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          💡 <strong>Tip:</strong> Usa Markdown para mejor formato y fácil edición
        </p>
      </div>

      {/* Mensajes de éxito/error */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

