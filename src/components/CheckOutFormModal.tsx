import React, { useState } from 'react';
import { CheckOutFormData } from '../types';
import { useInventory } from '../context/InventoryContext';
import { BrandLogo } from './BrandLogo';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import {
  Printer,
  X,
  FileCheck2,
  Building,
  Shield,
  User as UserIcon,
  Calendar,
  Package,
  FileText,
  AlertCircle,
  Download,
  CheckCircle2,
  QrCode,
  Barcode,
  Sparkles,
  Loader2,
  FileDown,
  Layers,
} from 'lucide-react';

interface CheckOutFormModalProps {
  formData: CheckOutFormData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CheckOutFormModal: React.FC<CheckOutFormModalProps> = ({
  formData,
  isOpen,
  onClose,
}) => {
  const { branding } = useInventory();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !formData) return null;

  const totalQuantity = formData.items.reduce((acc, curr) => acc + curr.quantity, 0);

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const slipElement = document.getElementById('printable-agreement-slip');
      if (!slipElement) {
        window.print();
        setIsPrinting(false);
        return;
      }

      // Create an isolated hidden iframe for printing
      const existingFrame = document.getElementById('agreement-print-iframe');
      if (existingFrame && document.body.contains(existingFrame)) {
        document.body.removeChild(existingFrame);
      }

      const printFrame = document.createElement('iframe');
      printFrame.id = 'agreement-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (frameDoc) {
        frameDoc.open();

        // Extract active stylesheets and styles for exact rendering
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map((el) => el.outerHTML)
          .join('\n');

        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Agreement Slip - ${formData.formNumber}</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              ${styles}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  margin: 0;
                  padding: 12px;
                  background: #ffffff !important;
                  color: #1a1a1a !important;
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .no-print, button {
                  display: none !important;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                tr {
                  page-break-inside: avoid;
                }
              </style>
            </head>
            <body>
              <div class="printable-slip">
                ${slipElement.innerHTML}
              </div>
            </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print failed, falling back to window.print():', e);
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(printFrame)) {
                document.body.removeChild(printFrame);
              }
              setIsPrinting(false);
            }, 1200);
          }
        }, 500);
      } else {
        window.print();
        setIsPrinting(false);
      }
    } catch (err) {
      console.error('Print trigger error:', err);
      window.print();
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async () => {
    setIsExportingPdf(true);
    setDownloadSuccess(false);
    try {
      const slipElement = document.getElementById('printable-agreement-slip');
      if (!slipElement) {
        throw new Error('Agreement Slip container element not found');
      }

      // Convert the rendered DOM node to high-res PNG data URL (supports modern oklch / lab CSS colors)
      const dataUrl = await toPng(slipElement, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      // Load image to determine exact dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(new Error('Failed to parse generated image data'));
      });

      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8; // 8mm page padding
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = (imgHeight * printableWidth) / imgWidth;

      if (printableHeight <= pdfHeight - margin * 2) {
        // Fits on a single A4 page
        pdf.addImage(dataUrl, 'PNG', margin, margin, printableWidth, printableHeight);
      } else {
        // Multi-page slicing for extensive equipment manifest
        const maxPageContentHeight = pdfHeight - margin * 2;
        const sliceSourceHeight = maxPageContentHeight * (imgWidth / printableWidth);
        let renderedHeight = 0;
        let pageIndex = 0;

        while (renderedHeight < imgHeight) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          const currentSliceHeight = Math.min(sliceSourceHeight, imgHeight - renderedHeight);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = currentSliceHeight;

          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              img,
              0,
              renderedHeight,
              imgWidth,
              currentSliceHeight,
              0,
              0,
              imgWidth,
              currentSliceHeight
            );
            const pageDataUrl = pageCanvas.toDataURL('image/png');
            const pageRenderHeight = (currentSliceHeight * printableWidth) / imgWidth;
            pdf.addImage(pageDataUrl, 'PNG', margin, margin, printableWidth, pageRenderHeight);
          }

          renderedHeight += currentSliceHeight;
          pageIndex++;
        }
      }

      const safeFormNumber = (formData.formNumber || 'slip').replace(/[^a-zA-Z0-9-_]/g, '_');
      pdf.save(`Agreement_Slip_${safeFormNumber}.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Could not generate direct PDF file. Opening browser print dialog (choose "Save as PDF").');
      handlePrint();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto print:backdrop-blur-none">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-[#E5E5E5] shadow-2xl overflow-hidden my-auto print:shadow-none print:border-none print:rounded-none print:max-w-none print:w-full">
        
        {/* Top Control Header Bar (Hidden during printing) */}
        <div className="p-4 bg-[#F9F9F9] border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#1A1A1A]">
                  Check-Out Release Agreement & Signature Slip
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase border border-emerald-300">
                  {formData.approvalStatus || 'Approved & Released'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Official equipment custody voucher ready for laser printing or borrower sign-off.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Save as PDF Button */}
            <button
              onClick={handleSavePdf}
              disabled={isExportingPdf}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-[#E5E5E5] hover:bg-gray-100 text-[#1A1A1A]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Download official agreement slip as a PDF document"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  <span>Generating PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Saved PDF!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-rose-600" />
                  <span>Save as PDF</span>
                </>
              )}
            </button>

            {/* Print Agreement Slip Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print document or send to laser printer"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Preparing Print...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Print Agreement Slip</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-black hover:bg-gray-200 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body Area */}
        <div
          id="printable-agreement-slip"
          className="p-6 sm:p-8 space-y-5 text-[#1A1A1A] bg-white print:p-4 print:space-y-4 printable-slip"
        >
          {/* Document Header */}
          <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo branding={branding} size="lg" />
              <div className="space-y-0.5">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-black uppercase font-mono">
                  {branding.orgName || 'PDRRMO'} INVENTORY MANAGEMENT
                </h1>
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  {branding.fullOfficeName || 'Provincial Disaster Risk Reduction and Management Office'}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  Official Equipment Custody & Check-Out Release Agreement
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-xs space-y-1 bg-[#F9F9F9] print:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-none border-[#E5E5E5] shrink-0">
              <div>
                <span className="text-gray-500 font-normal">Voucher ID: </span>
                <span className="font-bold text-black">{formData.formNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 font-normal">Release Date: </span>
                <span className="font-bold text-black">{formData.date}</span>
              </div>
              <div>
                <span className="text-gray-500 font-normal">Custody Status: </span>
                <span className="font-bold text-emerald-700 uppercase">{formData.approvalStatus || 'RELEASED'}</span>
              </div>
            </div>
          </div>

          {/* Borrower & Approving Officer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F9F9F9] print:bg-white p-4 rounded-2xl border border-[#E5E5E5] text-xs">
            {/* Borrower Info */}
            <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-[#E5E5E5] pb-3 sm:pb-0 sm:pr-4">
              <div className="flex items-center gap-1.5 text-black font-bold uppercase text-[11px] tracking-wider mb-1">
                <UserIcon className="w-3.5 h-3.5 text-black" />
                <span>Borrower / Person Checking Out Items</span>
              </div>
              <div>
                <span className="text-gray-500">Full Name: </span>
                <span className="font-bold text-black text-sm">{formData.recipientName}</span>
              </div>
              {formData.recipientDepartment && (
                <div>
                  <span className="text-gray-500">Department / Project: </span>
                  <span className="font-semibold text-gray-800">{formData.recipientDepartment}</span>
                </div>
              )}
              {formData.recipientEmail && (
                <div>
                  <span className="text-gray-500">Email / ID: </span>
                  <span className="font-mono text-gray-700">{formData.recipientEmail}</span>
                </div>
              )}
            </div>

            {/* Issuing Officer Info */}
            <div className="space-y-1.5 sm:pl-2">
              <div className="flex items-center gap-1.5 text-black font-bold uppercase text-[11px] tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5 text-black" />
                <span>Issuing & Approving Authority</span>
              </div>
              <div>
                <span className="text-gray-500">Issued By: </span>
                <span className="font-bold text-black text-sm">{formData.issuedByUserName}</span>
              </div>
              <div>
                <span className="text-gray-500">Authority Role: </span>
                <span className="font-semibold text-gray-800">{formData.issuedByUserRole || 'Storekeeper / Administrator'}</span>
              </div>
              {formData.issuedByUserEmail && (
                <div>
                  <span className="text-gray-500">Officer Contact: </span>
                  <span className="font-mono text-gray-700">{formData.issuedByUserEmail}</span>
                </div>
              )}
              {formData.notes && (
                <div className="pt-1">
                  <span className="text-gray-500">Dispatch Notes: </span>
                  <span className="font-medium text-gray-700 italic">"{formData.notes}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Explicit Itemized SKU Breakdown Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-black tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-black" />
                <span>Itemized Checked-Out Equipment & SKU Manifest</span>
              </h4>
              <span className="text-xs font-bold text-black font-mono">
                {formData.items.length} Unique SKU(s) • Total {totalQuantity} Units
              </span>
            </div>

            <div className="border border-black rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-neutral-700 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 border-r border-neutral-700">Item Name & Category</th>
                    <th className="py-2.5 px-3 border-r border-neutral-700">Unique SKU</th>
                    <th className="py-2.5 px-3 border-r border-neutral-700">Barcode / QR Code</th>
                    <th className="py-2.5 px-3 border-r border-neutral-700">Serial / Lot #</th>
                    <th className="py-2.5 px-3 border-r border-neutral-700">Condition</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 font-sans">
                  {formData.items.map((item, index) => {
                    const hasBundleItems = item.bundleItems && item.bundleItems.length > 0;
                    const hasPieceSkus = !hasBundleItems && item.pieceSkus && item.pieceSkus.length > 0;

                    return (
                      <tr key={index} className="hover:bg-gray-50 print:bg-transparent align-top">
                        <td className="py-2.5 px-3 text-center font-bold text-gray-500 border-r border-gray-300">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-black text-xs">{item.itemName}</span>
                            {(item.isSetOrBundle || hasBundleItems) && (
                              <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase print:bg-gray-200 print:text-black">
                                ASSEMBLED SET ({item.bundleItems?.length || item.pieceSkus?.length || 0} ITEMS)
                              </span>
                            )}
                          </div>
                          {item.category && <span className="text-[10px] text-gray-500 block">{item.category}</span>}
                          {item.notes && <span className="text-[10px] text-gray-600 block italic mt-0.5">Notes: {item.notes}</span>}

                          {/* Set Component Breakdown with SKU Codes */}
                          {hasBundleItems && (
                            <div className="mt-2 p-2 bg-purple-50/90 print:bg-gray-100 border border-purple-200 print:border-gray-400 rounded-lg text-[10px] space-y-1.5">
                              <div className="font-bold text-purple-950 print:text-black uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-purple-700 print:text-black inline shrink-0" />
                                  <span>Included Set Component SKUs & Quantities:</span>
                                </span>
                                <span className="font-mono text-[9px] text-purple-800 print:text-gray-700 font-semibold">
                                  {item.bundleItems!.length} piece(s) per set
                                </span>
                              </div>
                              <div className="space-y-1">
                                {item.bundleItems!.map((comp, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="flex items-center justify-between bg-white print:bg-white px-2 py-1 rounded border border-purple-200/80 print:border-gray-300 text-[10px]"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                      <span className="font-bold text-black">• {comp.itemName}</span>
                                      <span className="font-mono font-bold bg-purple-100 text-purple-900 print:bg-gray-200 print:text-black px-1.5 py-0.5 rounded text-[9px] border border-purple-200 print:border-gray-400">
                                        SKU: {comp.sku}
                                      </span>
                                      {comp.barcode && (
                                        <span className="font-mono text-gray-600 text-[9px]">
                                          Barcode: {comp.barcode}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono font-bold text-black whitespace-nowrap pl-2">
                                      x{comp.quantity} / set ({comp.quantity * item.quantity} total)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fallback piece SKUs list */}
                          {hasPieceSkus && (
                            <div className="mt-1.5 p-1.5 bg-gray-50 border border-gray-200 rounded text-[10px]">
                              <span className="font-bold text-gray-700">Included Piece SKUs: </span>
                              <span className="font-mono font-bold text-black">
                                {item.pieceSkus!.join(', ')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-black border-r border-gray-300">
                          <div>{item.sku}</div>
                          {hasBundleItems && (
                            <div className="mt-1 text-[9px] font-normal text-purple-900 print:text-gray-700 bg-purple-50 print:bg-gray-100 p-1 rounded border border-purple-200 print:border-gray-300">
                              <span className="font-bold block text-[8px] uppercase tracking-wider text-purple-950 print:text-black">
                                Component SKUs:
                              </span>
                              <div className="font-mono font-semibold space-y-0.5 mt-0.5">
                                {item.bundleItems!.map((c, i) => (
                                  <div key={i} className="truncate">
                                    • {c.sku} (x{c.quantity})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 border-r border-gray-300">
                          {item.barcode || item.sku}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 border-r border-gray-300">
                          {item.serialNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-gray-300 font-semibold text-gray-800">
                          {item.condition || 'Good'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-black text-sm">
                          {item.quantity}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 print:bg-gray-50 font-bold border-t-2 border-black">
                    <td colSpan={6} className="py-2 px-3 text-right uppercase text-[10px] tracking-wider text-gray-700">
                      Total Checked Out Quantity:
                    </td>
                    <td className="py-2 px-3 text-center font-black text-black text-sm">
                      {totalQuantity}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Terms of Agreement Section */}
          <div className="p-4 rounded-xl border border-gray-300 bg-[#FAF9F6] print:bg-white space-y-2 text-[11px] leading-relaxed">
            <h4 className="font-extrabold text-black uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-300 pb-1.5">
              <FileText className="w-3.5 h-3.5 text-black" />
              <span>Terms of Agreement & Equipment Custody Contract</span>
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-gray-800 font-medium">
              <li>
                <strong>Custody & Care:</strong> The recipient acknowledges physical receipt of the specified items in good condition and assumes full responsibility for their proper care, safe storage, and routine maintenance against loss, theft, or physical damage.
              </li>
              <li>
                <strong>Authorized Use Only:</strong> Checked-out materials remain organizational property and shall be utilized exclusively for authorized institutional duties and projects. Sub-loaning, unauthorized relocation, or private usage is strictly prohibited.
              </li>
              <li>
                <strong>Mandatory Return Obligation:</strong> All equipment must be returned to the storekeeper upon completion of the assignment, project conclusion, or upon official recall notice, in identical condition subject to fair operational wear.
              </li>
              <li>
                <strong>Loss & Damage Liability:</strong> Any damage, malfunction, or loss must be reported immediately. Negligent damage, unauthorized modification, or unreturned items may result in replacement costs charged to the borrower or associated department.
              </li>
              <li>
                <strong>Verification & Acceptance:</strong> By signing below, both parties confirm that all SKU numbers, barcodes, serial numbers, and quantities listed in this manifest have been physically inspected, counted, and verified.
              </li>
            </ol>
          </div>

          {/* Dual Signatures Section */}
          <div className="pt-3 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs">
            {/* Recipient / Borrower Signature Block */}
            <div className="space-y-2">
              <p className="font-bold text-black uppercase tracking-wider text-[11px]">
                1. Borrower / Recipient Signature:
              </p>

              <div className="h-18 border border-gray-300 rounded-xl bg-gray-50 print:bg-white flex items-center justify-center relative p-1">
                {formData.signatureDataUrl ? (
                  <img
                    src={formData.signatureDataUrl}
                    alt="Recipient Signature"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400 text-[10px] italic">Sign physical printed document here</span>
                )}
              </div>

              <div className="space-y-0.5 border-t border-black pt-1">
                <p className="font-black text-black text-sm">{formData.recipientName}</p>
                <p className="text-gray-500 text-[10px]">Borrower Signature over Printed Name</p>
                <p className="text-gray-500 text-[10px]">Date Signed: _______________________</p>
              </div>
            </div>

            {/* Issuing Storekeeper / Officer Signature Block */}
            <div className="space-y-2">
              <p className="font-bold text-black uppercase tracking-wider text-[11px]">
                2. Issuing Officer / Storekeeper Signature:
              </p>

              <div className="h-18 border border-gray-300 rounded-xl bg-gray-50 print:bg-white flex items-center justify-center relative p-1">
                <span className="text-gray-400 text-[10px] italic">Storekeeper Approval Stamp / Signature</span>
              </div>

              <div className="space-y-0.5 border-t border-black pt-1">
                <p className="font-black text-black text-sm">{formData.issuedByUserName}</p>
                <p className="text-gray-500 text-[10px]">Releasing Officer Signature ({formData.issuedByUserRole || 'Storekeeper'})</p>
                <p className="text-gray-500 text-[10px]">Date Released: {formData.date}</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 border-t border-gray-200 text-[10px] text-gray-400 font-mono">
            {branding.orgName || 'PDRRMO'} Inventory Management • Original Copy: Inventory Control Archive | Duplicate: Borrower Copy
          </div>
        </div>

        {/* Bottom Modal Actions Bar (Hidden in print) */}
        <div className="p-4 bg-[#F9F9F9] border-t border-[#E5E5E5] flex items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-gray-500">
            Form Voucher <span className="font-mono font-bold text-gray-800">#{formData.formNumber}</span> generated on {formData.date}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-[#1A1A1A] border border-[#E5E5E5] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />
                  <span>Exporting PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>Save as PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Printing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Slip</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
