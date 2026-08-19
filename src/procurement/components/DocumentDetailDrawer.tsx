import React, { useState } from 'react';
import { useProcurement, sortUpdateLogsDescending, formatDateTimeDisplay } from '../ProcurementContext';
import { isObrDocument, isTrustFundSource, isPrDocument, isSpendContributor } from '../types';
import { useInventory } from '../../context/InventoryContext';
import {
  X,
  FileText,
  DollarSign,
  Calendar,
  User,
  Layers,
  Edit,
  Copy,
  Printer,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Tag,
  ShieldCheck,
  Lock,
  Plus,
  FileCheck2,
  Paperclip,
  Eye,
  Download,
} from 'lucide-react';

export const DocumentDetailDrawer: React.FC = () => {
  const {
    isDetailDrawerOpen,
    closeDetailDrawer,
    selectedDocument,
    openEditDocumentModal,
    openNewSubDocModal,
    openEditSubDocModal,
    deleteSubDocument,
    duplicateDocument,
    deleteDocument,
    openPdfViewer,
    customFields,
    canEdit,
    isAdmin,
    staleDaysThreshold,
  } = useProcurement();

  const { branding } = useInventory();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isDetailDrawerOpen || !selectedDocument) return null;

  // Calculate days since last update
  const now = new Date();
  const updateLogs = sortUpdateLogsDescending(selectedDocument.updateLogs || []);
  const topLog = updateLogs[0];
  const updateDate = new Date(topLog?.date || selectedDocument.documentUpdate || selectedDocument.inputDate);
  const diffDays = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
  const isStale =
    selectedDocument.status !== 'Completed / Liquidated' &&
    selectedDocument.status !== 'Cancelled' &&
    diffDays >= staleDaysThreshold;

  const subDocuments = selectedDocument.subDocuments || [];
  const hasAttachedPdf = Boolean(selectedDocument.fileData || selectedDocument.fileUrl);

  const handlePrintVoucher = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) return;

    const formattedAmount = (selectedDocument.amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
    });

    const customFieldsHtml = customFields
      .filter((cf) => selectedDocument.customFields && selectedDocument.customFields[cf.key] !== undefined)
      .map((cf) => {
        const val = selectedDocument.customFields![cf.key];
        const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || 'N/A');
        return `
          <div class="field-item">
            <span class="field-label">${cf.name}:</span>
            <span class="field-value">${displayVal}</span>
          </div>
        `;
      })
      .join('');

    const subDocsHtml = subDocuments
      .map(
        (sub) => `
        <tr>
          <td><b style="font-family: monospace;">${sub.controlNo}</b></td>
          <td><b>${sub.documentName}</b></td>
          <td>${sub.documentType}</td>
          <td>${sub.inputDate}</td>
          <td>₱${(sub.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          <td><span class="status-pill">${sub.status}</span></td>
        </tr>
      `
      )
      .join('');

    const logsHtml = updateLogs
      .map((l) => {
        const dtFmt = formatDateTimeDisplay(l.date, l.time, l.timestamp);
        return `
        <tr>
          <td><b>${dtFmt.dateFormatted}</b><br><small style="color: #6b7280;">${dtFmt.timeFormatted}</small></td>
          <td><span class="status-pill">${l.status || selectedDocument.status}</span></td>
          <td>${l.userName} (${l.userRole || 'Staff'})</td>
          <td>${l.notes}</td>
        </tr>
      `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Procurement Document Voucher - ${selectedDocument.controlNo}</title>
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 20px; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { margin: 4px 0 0 0; font-size: 13px; color: #4b5563; font-weight: normal; }
          .header p { margin: 2px 0 0 0; font-size: 11px; color: #6b7280; }
          .voucher-badge { display: inline-block; background: #000; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; margin-top: 8px; text-transform: uppercase; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #fafafa; }
          .box-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
          .amount-box { text-align: right; background: #f0fdf4; border-color: #bbf7d0; }
          .amount-val { font-size: 20px; font-weight: bold; color: #166534; font-family: monospace; }
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 18px 0 10px 0; color: #111827; }
          .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .field-item { padding: 4px 0; font-size: 11px; border-bottom: 1px dotted #e5e7eb; }
          .field-label { font-weight: bold; color: #4b5563; }
          .field-value { color: #111827; margin-left: 6px; }
          .desc-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-style: italic; color: #374151; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
          th { background: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .status-pill { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; border-radius: 4px; background: #e5e7eb; }
          .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
          .sign-box { border-top: 1px solid #1a1a1a; text-align: center; padding-top: 6px; font-size: 11px; }
          .sign-title { font-weight: bold; color: #111827; }
          .sign-sub { font-size: 10px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${branding.orgName || 'Cebu Provincial Disaster Risk Reduction and Management Office'}</h1>
          <h2>Procurement Documents Tracking Voucher</h2>
          <p>${branding.orgSubtitle || 'Official Property & Procurement Tracking Document'}</p>
          <div class="voucher-badge">Control No: ${selectedDocument.controlNo}</div>
        </div>

        <div class="grid-2">
          <div class="box">
            <div class="box-title">Document Classification</div>
            <div><b>Name:</b> ${selectedDocument.documentName}</div>
            <div><b>Type:</b> ${selectedDocument.documentType}</div>
            <div><b>Source of Funds:</b> ${selectedDocument.sourceOfFunds}</div>
            <div><b>Division / Section:</b> ${selectedDocument.divisionSection || 'Unassigned Division'}</div>
            <div><b>Current Status:</b> ${selectedDocument.status}</div>
            ${selectedDocument.fileName ? `<div><b>Attached PDF:</b> ${selectedDocument.fileName} (${selectedDocument.fileSize || ''})</div>` : ''}
          </div>
          <div class="box amount-box">
            <div class="box-title">Total Requisition / Valuation Amount</div>
            <div class="amount-val">₱${formattedAmount}</div>
            <div style="font-size: 10px; color: #4b5563; margin-top: 4px;">Assigned Officer: <b>${selectedDocument.assignedStaff || 'Unassigned'}</b></div>
          </div>
        </div>

        <div class="section-title">Document Purpose & Narrative Description</div>
        <div class="desc-box">${selectedDocument.description || 'No description provided.'}</div>

        <div class="section-title">Operational & Custom Field Properties</div>
        <div class="field-grid">
          <div class="field-item"><span class="field-label">Input Date:</span><span class="field-value">${selectedDocument.inputDate}</span></div>
          <div class="field-item"><span class="field-label">Last Status Update:</span><span class="field-value">${selectedDocument.documentUpdate}</span></div>
          ${customFieldsHtml}
        </div>

        ${
          subDocuments.length > 0
            ? `
          <div class="section-title">Linked Sub-Documents (${subDocuments.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Sub-Control No</th>
                <th style="width: 35%;">Title / Subject</th>
                <th style="width: 15%;">Type</th>
                <th style="width: 12%;">Date Issued</th>
                <th style="width: 10%;">Amount</th>
                <th style="width: 8%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${subDocsHtml}
            </tbody>
          </table>
        `
            : ''
        }

        <div class="section-title">Document Updates Progress Log (Chronological)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 18%;">Date & Time</th>
              <th style="width: 15%;">Status</th>
              <th style="width: 22%;">Officer</th>
              <th style="width: 45%;">Narrative / Action Taken</th>
            </tr>
          </thead>
          <tbody>
            ${logsHtml}
          </tbody>
        </table>

        <div class="sign-grid">
          <div class="sign-box">
            <div class="sign-title">${selectedDocument.assignedStaff || 'Responsible Action Officer'}</div>
            <div class="sign-sub">Procurement Handling Staff / Action Officer</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">PDRRMO Department Head / Admin</div>
            <div class="sign-sub">Approved / Verified by Authorized Signatory</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-2xs animate-in fade-in duration-200">
      <div
        className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-full sm:max-w-xl bg-white shadow-2xl border-l border-[#E5E5E5] flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E5E5E5] flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-mono font-bold text-xs bg-gray-100 text-gray-900 px-2 py-0.5 rounded border border-gray-200">
                    {selectedDocument.controlNo}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    {selectedDocument.status}
                  </span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-gray-900 mt-1 line-clamp-1">
                  {selectedDocument.documentName}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={closeDetailDrawer}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-black transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="px-3.5 sm:px-5 py-2.5 bg-neutral-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    closeDetailDrawer(); // Automatically close detail view drawer
                    openEditDocumentModal(selectedDocument); // Bring Edit Procurement Document to front view
                  }}
                  className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit / Update Log</span>
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    closeDetailDrawer();
                    openNewSubDocModal(selectedDocument);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Sub-Doc</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintVoucher}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Print official procurement summary sheet"
              >
                <Printer className="w-3.5 h-3.5 text-gray-600" />
                <span>Print Slip</span>
              </button>
            </div>

            {isAdmin && (
              <div>
                {!isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    title="Delete document (Admin Only)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => deleteDocument(selectedDocument.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-1 rounded-lg bg-gray-200 text-gray-700 font-bold text-[11px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
            {/* Key Amount Highlight Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-neutral-50 border border-emerald-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Procurement Valuation Amount
                  </span>
                  {isObrDocument(selectedDocument.documentType) ? (
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      OBR (In Spend)
                    </span>
                  ) : isPrDocument(selectedDocument.documentType) && isTrustFundSource(selectedDocument.sourceOfFunds) ? (
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                      Trust Fund PR (In Spend)
                    </span>
                  ) : (
                    <span className="px-2 py-0.2 rounded text-[9px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      Tracking Only
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-950 mt-0.5">
                  ₱{(selectedDocument.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-gray-500 font-medium">
                  Fund: <span className="font-bold text-gray-800">{selectedDocument.sourceOfFunds}</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                ₱
              </div>
            </div>

            {/* Attached PDF Card Preview */}
            {hasAttachedPdf && (
              <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 text-xs block truncate">
                      {selectedDocument.fileName || 'Attached Procurement Scan.pdf'}
                    </span>
                    <span className="text-[10.5px] text-gray-500">
                      {selectedDocument.fileSize || 'PDF Document'} • Attached File
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      openPdfViewer(
                        selectedDocument.documentName,
                        selectedDocument.fileData || selectedDocument.fileUrl || '',
                        selectedDocument.fileName || `${selectedDocument.controlNo}.pdf`,
                        selectedDocument.fileSize,
                        selectedDocument.assignedStaff
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>

                  <a
                    href={selectedDocument.fileData || selectedDocument.fileUrl}
                    download={selectedDocument.fileName || `${selectedDocument.controlNo}.pdf`}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center transition cursor-pointer"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Stale Update Warning */}
            {isStale && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Document Update Overdue ({diffDays} Days)</span>
                  <span className="text-[11px] text-amber-800">
                    Last recorded update was on {selectedDocument.documentUpdate}. Standard oversight policy recommends updating active requisitions every {staleDaysThreshold} days.
                  </span>
                </div>
              </div>
            )}

            {/* Latest Update Summary Banner */}
            {(selectedDocument.latestUpdateNotes || topLog?.notes) && (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-950 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  <span>
                    Latest Update ({topLog ? `${topLog.date} ${topLog.time || ''}` : selectedDocument.documentUpdate})
                  </span>
                  <span>Status: {selectedDocument.status}</span>
                </div>
                <p className="text-xs font-medium text-blue-900 leading-relaxed">
                  {selectedDocument.latestUpdateNotes || topLog?.notes}
                </p>
              </div>
            )}

            {/* Core Document Metadata */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Document Information
              </h4>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-[#E5E5E5]">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Document Type</span>
                  <span className="font-bold text-gray-800 text-xs">{selectedDocument.documentType}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Source of Funds</span>
                  <span className="font-bold text-gray-800 text-xs">{selectedDocument.sourceOfFunds}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Division / Section</span>
                  <span className="font-bold text-indigo-900 text-xs">{selectedDocument.divisionSection || 'Unassigned Division'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Input Date</span>
                  <span className="font-medium text-gray-800 text-xs">{selectedDocument.inputDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Last Status Update</span>
                  <span className="font-medium text-gray-800 text-xs">{selectedDocument.documentUpdate}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Assigned Staff / Officer</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[9px] font-bold">
                      {(selectedDocument.assignedStaff || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-900 text-xs">
                      {selectedDocument.assignedStaff || 'Not Assigned'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative Description */}
            {selectedDocument.description && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Description & Purpose
                </h4>
                <div className="p-3.5 rounded-2xl bg-white border border-[#E5E5E5] text-gray-700 leading-relaxed">
                  {selectedDocument.description}
                </div>
              </div>
            )}

            {/* Linked Sub-Documents Section */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                    Linked Sub-Documents ({subDocuments.length})
                  </h4>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      closeDetailDrawer();
                      openNewSubDocModal(selectedDocument);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Attach Sub-Doc</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {subDocuments.length === 0 ? (
                  <div className="p-3 text-center text-gray-400 bg-neutral-50 rounded-xl">
                    No linked sub-documents attached. Click "Attach Sub-Doc" to attach BAC resolutions, NOAs, NTPs, or delivery receipts.
                  </div>
                ) : (
                  subDocuments.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-2xl bg-white border border-gray-200 text-xs space-y-1.5 shadow-2xs hover:border-gray-400 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                            {sub.controlNo}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-gray-700 text-[10px] font-medium border border-gray-200">
                            {sub.documentType}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            {sub.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {(sub.fileData || sub.fileUrl) && (
                            <button
                              type="button"
                              onClick={() =>
                                openPdfViewer(
                                  sub.documentName,
                                  sub.fileData || sub.fileUrl || '',
                                  sub.fileName || `${sub.controlNo}.pdf`,
                                  sub.fileSize,
                                  sub.assignedStaff
                                )
                              }
                              className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                              title="Preview Sub-Doc PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                closeDetailDrawer();
                                openEditSubDocModal(selectedDocument, sub);
                              }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                              title="Edit Sub-Document"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete sub-document "${sub.controlNo}"?`)) {
                                  deleteSubDocument(selectedDocument.id, sub.id);
                                }
                              }}
                              className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                              title="Delete Sub-Document"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="font-bold text-gray-900 text-xs">{sub.documentName}</div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                        <span>Date: <b>{sub.inputDate}</b> • Fund: <b>{sub.sourceOfFunds}</b></span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ₱{(sub.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {sub.description && (
                        <p className="text-[10.5px] text-gray-600 italic bg-neutral-50 p-1.5 rounded-lg">
                          {sub.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Document Updates Progress Log Trail (Date & Time on Top) */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-600" />
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                    Document Updates Log ({updateLogs.length}) • Latest on Top
                  </h4>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      closeDetailDrawer();
                      openEditDocumentModal(selectedDocument);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Log Update</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {updateLogs.length === 0 ? (
                  <div className="p-3 text-center text-gray-400 bg-neutral-50 rounded-xl">
                    No update logs recorded. Click "Log Update" to record a status progress entry.
                  </div>
                ) : (
                  updateLogs.map((log) => {
                    const dtFmt = formatDateTimeDisplay(log.date, log.time, log.timestamp);
                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-2xl bg-white border border-gray-200 text-xs space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-gray-900">
                              <Calendar className="w-2.5 h-2.5 text-gray-500" />
                              <span>{dtFmt.dateFormatted}</span>
                              <span className="text-gray-400 font-normal ml-0.5">{dtFmt.timeFormatted}</span>
                            </div>
                            {log.status && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                {log.status}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            Officer: <b className="text-gray-700">{log.userName}</b> ({log.userRole || 'Staff'})
                          </span>
                        </div>

                        <p className="text-gray-800 text-[11px] leading-relaxed font-medium">
                          {log.notes}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Dynamic Admin Custom Fields Section */}
            {customFields.length > 0 && selectedDocument.customFields && Object.keys(selectedDocument.customFields).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Custom Properties & Fields
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100">
                  {customFields.map((cf) => {
                    const val = selectedDocument.customFields ? selectedDocument.customFields[cf.key] : undefined;
                    if (val === undefined || val === '') return null;

                    const displayVal = typeof val === 'boolean' ? (val ? 'Yes / Enabled' : 'No') : String(val);

                    return (
                      <div key={cf.id} className={cf.type === 'textarea' ? 'col-span-2' : ''}>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">{cf.name}</span>
                        <span className="font-bold text-gray-900 text-xs">{displayVal}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
