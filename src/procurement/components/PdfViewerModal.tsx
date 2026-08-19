import React from 'react';
import { useProcurement } from '../ProcurementContext';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Printer,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export const PdfViewerModal: React.FC = () => {
  const { viewingPdf, closePdfViewer } = useProcurement();

  if (!viewingPdf) return null;

  const targetSource = viewingPdf.fileUrl || viewingPdf.fileData || '';
  const isImage = viewingPdf.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i) || targetSource.startsWith('data:image/');

  const handleDownload = () => {
    if (!targetSource) return;
    const link = document.createElement('a');
    link.href = targetSource;
    link.download = viewingPdf.fileName || 'Procurement-Document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    if (!targetSource) return;
    window.open(targetSource, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                  {isImage ? 'Document Scan' : 'PDF Document'}
                </span>
                <span className="text-xs font-bold text-gray-900 truncate">
                  {viewingPdf.fileName}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate">
                {viewingPdf.title} {viewingPdf.fileSize ? `• ${viewingPdf.fileSize}` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Open original file in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5 text-green-400" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={closePdfViewer}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Viewer Body */}
        <div className="flex-1 bg-neutral-100 relative overflow-hidden flex flex-col items-center justify-center p-2">
          {targetSource ? (
            isImage ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={targetSource}
                  alt={viewingPdf.fileName || viewingPdf.title}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-md border border-gray-200 bg-white"
                />
              </div>
            ) : (
              <iframe
                src={targetSource}
                title={viewingPdf.fileName || viewingPdf.title}
                className="w-full h-full border-0 rounded-b-2xl"
              />
            )
          ) : (
            <div className="p-8 text-center text-gray-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-gray-300" />
              <p className="font-bold text-gray-700 text-sm">Document content unavailable for preview</p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-black text-white rounded-xl font-bold text-xs"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
