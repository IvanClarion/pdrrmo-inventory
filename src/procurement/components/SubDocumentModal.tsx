import React, { useState, useEffect, useRef } from 'react';
import { useProcurement, sortUpdateLogsDescending, formatDateTimeDisplay } from '../ProcurementContext';
import { useInventory } from '../../context/InventoryContext';
import { uploadProcurementDocumentFile } from '../procurementDatabase';
import {
  ProcurementDocumentType,
  ProcurementStatus,
  DocumentUpdateLog,
  ProcurementSubDocument,
  isObrDocument,
  isTrustFundSource,
  isPrDocument,
  isSpendContributor,
} from '../types';
import {
  X,
  FileCheck2,
  Calendar,
  Layers,
  Plus,
  Info,
  DollarSign,
  FileText,
  CheckCircle2,
  Lock,
  History,
  Sparkles,
  Edit2,
  Trash2,
  Clock,
  Check,
  Upload,
  Eye,
  Download,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const SubDocumentModal: React.FC = () => {
  const {
    isSubDocModalOpen,
    closeSubDocModal,
    subDocParentDoc,
    editingSubDocument,
    addSubDocument,
    updateSubDocument,
    openPdfViewer,
    customFields,
    documentTypes,
    fundSources,
    divisionSections,
    statuses,
    addDocumentType,
    addFundSource,
    addDivisionSection,
    addStatus,
    isAdmin,
  } = useProcurement();

  const { users, currentUser } = useInventory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Form State (Exact same fields as main document)
  const [controlNo, setControlNo] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('Resolution / BAC');
  const [amount, setAmount] = useState<string>('0');
  const [sourceOfFunds, setSourceOfFunds] = useState('Quick Response Fund (QRF)');
  const [divisionSection, setDivisionSection] = useState('Operations & Warning Division');
  const [inputDate, setInputDate] = useState('');
  const [documentUpdate, setDocumentUpdate] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [assignedStaffEmail, setAssignedStaffEmail] = useState('');
  const [status, setStatus] = useState<string>('Approved');
  const [notes, setNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // PDF / Document File Attachment State
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [attachedFileData, setAttachedFileData] = useState('');
  const [attachedFileUrl, setAttachedFileUrl] = useState('');
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // New Update Log Entry State (Date & Time)
  const [newLogDate, setNewLogDate] = useState('');
  const [newLogTime, setNewLogTime] = useState('');
  const [newLogNotes, setNewLogNotes] = useState('');
  const [newLogStatus, setNewLogStatus] = useState<string>('Approved');

  // Quick Add new Type/Fund/Division/Status State
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [isAddingNewFund, setIsAddingNewFund] = useState(false);
  const [newFundInput, setNewFundInput] = useState('');
  const [isAddingNewDivision, setIsAddingNewDivision] = useState(false);
  const [newDivisionInput, setNewDivisionInput] = useState('');
  const [isAddingNewStatus, setIsAddingNewStatus] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');

  const [formError, setFormError] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (editingSubDocument) {
      setControlNo(editingSubDocument.controlNo || '');
      setDocumentName(editingSubDocument.documentName || '');
      setDescription(editingSubDocument.description || '');
      setDocumentType(editingSubDocument.documentType || 'Resolution / BAC');
      setAmount(String(editingSubDocument.amount || 0));
      setSourceOfFunds(editingSubDocument.sourceOfFunds || subDocParentDoc?.sourceOfFunds || fundSources[0]);
      setDivisionSection(editingSubDocument.divisionSection || subDocParentDoc?.divisionSection || divisionSections[0]);
      setInputDate(editingSubDocument.inputDate || today);
      setDocumentUpdate(editingSubDocument.documentUpdate || today);
      setAssignedStaff(editingSubDocument.assignedStaff || '');
      setAssignedStaffId(editingSubDocument.assignedStaffId || '');
      setAssignedStaffEmail(editingSubDocument.assignedStaffEmail || '');
      setStatus(editingSubDocument.status || 'Approved');
      setNotes(editingSubDocument.notes || '');
      setCustomFieldValues(editingSubDocument.customFields || {});

      // Attachment
      setAttachedFileName(editingSubDocument.fileName || '');
      setAttachedFileSize(editingSubDocument.fileSize || '');
      setAttachedFileData(editingSubDocument.fileData || '');
      setAttachedFileUrl(editingSubDocument.fileUrl || '');

      setNewLogDate(today);
      setNewLogTime(timeNow);
      setNewLogNotes('');
      setNewLogStatus(editingSubDocument.status || 'Approved');
    } else if (subDocParentDoc) {
      const seq = Math.floor(100 + Math.random() * 900);
      setControlNo(`${subDocParentDoc.controlNo}-SUB-${seq}`);
      setDocumentName('');
      setDescription('');
      setDocumentType('Resolution / BAC');
      setAmount(String(subDocParentDoc.amount || 0));
      setSourceOfFunds(subDocParentDoc.sourceOfFunds || fundSources[0]);
      setDivisionSection(subDocParentDoc.divisionSection || divisionSections[0]);
      setInputDate(today);
      setDocumentUpdate(today);
      setAssignedStaff(currentUser?.name || subDocParentDoc.assignedStaff || '');
      setAssignedStaffId(currentUser?.id || subDocParentDoc.assignedStaffId || '');
      setAssignedStaffEmail(currentUser?.email || subDocParentDoc.assignedStaffEmail || '');
      setStatus('Approved');
      setNotes('');
      setCustomFieldValues({});
      setAttachedFileName('');
      setAttachedFileSize('');
      setAttachedFileData('');
      setAttachedFileUrl('');

      setNewLogDate(today);
      setNewLogTime(timeNow);
      setNewLogNotes('Sub-document initialized.');
      setNewLogStatus('Approved');
    }
    setFormError('');
    setIsAddingNewType(false);
    setIsAddingNewFund(false);
    setIsAddingNewDivision(false);
    setIsAddingNewStatus(false);
  }, [editingSubDocument, subDocParentDoc, isSubDocModalOpen, fundSources, divisionSections, currentUser]);

  if (!isSubDocModalOpen || !subDocParentDoc) return null;

  const isCurrentObr = isObrDocument(documentType);

  const handleStaffSelect = (staffName: string) => {
    setAssignedStaff(staffName);
    const found = users.find((u) => u.name === staffName);
    if (found) {
      setAssignedStaffId(found.id);
      setAssignedStaffEmail(found.email);
    }
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddNewType = () => {
    if (newTypeInput.trim()) {
      addDocumentType(newTypeInput.trim());
      setDocumentType(newTypeInput.trim());
      setNewTypeInput('');
      setIsAddingNewType(false);
    }
  };

  const handleAddNewFund = () => {
    if (newFundInput.trim()) {
      addFundSource(newFundInput.trim());
      setSourceOfFunds(newFundInput.trim());
      setNewFundInput('');
      setIsAddingNewFund(false);
    }
  };

  const handleAddNewDivision = () => {
    if (newDivisionInput.trim()) {
      addDivisionSection(newDivisionInput.trim());
      setDivisionSection(newDivisionInput.trim());
      setNewDivisionInput('');
      setIsAddingNewDivision(false);
    }
  };

  const handleAddNewStatus = () => {
    if (newStatusInput.trim()) {
      addStatus(newStatusInput.trim());
      setNewLogStatus(newStatusInput.trim());
      setStatus(newStatusInput.trim());
      setNewStatusInput('');
      setIsAddingNewStatus(false);
    }
  };

  // File Upload Handler (PDF or Document Scan Image with Auto Compression)
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setFormError('File exceeds maximum limit of 50 MB.');
      return;
    }

    setIsUploadingPdf(true);
    setFormError('');

    try {
      // 1. Upload to Supabase Storage 'document_files' bucket (auto-compresses if image)
      const uploadRes = await uploadProcurementDocumentFile(file, file.name);
      setAttachedFileUrl(uploadRes.publicUrl);
      setAttachedFileName(uploadRes.fileName);
      setAttachedFileSize(uploadRes.fileSize);

      // Local preview fallback
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFileData(reader.result as string);
        setIsUploadingPdf(false);
      };
      reader.onerror = () => {
        setAttachedFileData(uploadRes.publicUrl);
        setIsUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (uploadErr) {
      console.warn('Storage upload warning, using local preview:', uploadErr);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachedFileData(base64);
        setAttachedFileName(file.name);
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
        const formattedSize = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${sizeInMb} MB`;
        setAttachedFileSize(formattedSize);
        setIsUploadingPdf(false);
      };
      reader.onerror = () => {
        setFormError('Failed to read file.');
        setIsUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePdf = () => {
    setAttachedFileName('');
    setAttachedFileSize('');
    setAttachedFileData('');
    setAttachedFileUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!controlNo.trim()) {
      setFormError('Sub-Document Control No. is required.');
      return;
    }
    if (!documentName.trim()) {
      setFormError('Sub-Document Title is required.');
      return;
    }

    const parsedAmount = parseFloat(amount) || 0;
    const today = new Date().toISOString().split('T')[0];
    const timeNow = newLogTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (editingSubDocument) {
      const updatedLogs: DocumentUpdateLog[] = [...(editingSubDocument.updateLogs || [])];
      if (newLogNotes.trim()) {
        updatedLogs.unshift({
          id: `uplog-sub-${Date.now()}`,
          date: newLogDate || today,
          time: timeNow,
          timestamp: new Date().toISOString(),
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'Staff User',
          userRole: currentUser?.roleName || 'Staff',
          status: newLogStatus || status,
          notes: newLogNotes.trim(),
          createdAt: new Date().toISOString(),
        });
      }

      updateSubDocument(subDocParentDoc.id, editingSubDocument.id, {
        controlNo: controlNo.trim(),
        documentName: documentName.trim(),
        description: description.trim(),
        documentType,
        amount: parsedAmount,
        sourceOfFunds,
        divisionSection: divisionSection.trim() || undefined,
        inputDate,
        documentUpdate: newLogDate || documentUpdate || today,
        latestUpdateNotes: newLogNotes.trim() || editingSubDocument.latestUpdateNotes,
        assignedStaff: assignedStaff.trim(),
        assignedStaffId: assignedStaffId || undefined,
        assignedStaffEmail: assignedStaffEmail || undefined,
        status: newLogNotes.trim() ? newLogStatus : status,
        notes: notes.trim(),
        fileName: attachedFileName || undefined,
        fileSize: attachedFileSize || undefined,
        fileData: attachedFileData || undefined,
        fileUrl: attachedFileUrl || (attachedFileData?.startsWith('http') ? attachedFileData : undefined),
        customFields: customFieldValues,
        updateLogs: sortUpdateLogsDescending(updatedLogs),
      });
    } else {
      const initialLogNote = newLogNotes.trim() || 'Initial sub-document linked.';
      addSubDocument(subDocParentDoc.id, {
        controlNo: controlNo.trim(),
        documentName: documentName.trim(),
        description: description.trim(),
        documentType,
        amount: parsedAmount,
        sourceOfFunds,
        divisionSection: divisionSection.trim() || undefined,
        inputDate: inputDate || today,
        documentUpdate: newLogDate || today,
        latestUpdateNotes: initialLogNote,
        assignedStaff: assignedStaff.trim(),
        assignedStaffId: assignedStaffId || undefined,
        assignedStaffEmail: assignedStaffEmail || undefined,
        status: newLogStatus || status,
        notes: notes.trim(),
        fileName: attachedFileName || undefined,
        fileSize: attachedFileSize || undefined,
        fileData: attachedFileData || undefined,
        fileUrl: attachedFileUrl || (attachedFileData?.startsWith('http') ? attachedFileData : undefined),
        customFields: customFieldValues,
        uploadedBy: currentUser?.name || 'Staff User',
        updateLogs: [
          {
            id: `uplog-sub-${Date.now()}`,
            date: newLogDate || today,
            time: timeNow,
            timestamp: new Date().toISOString(),
            userId: currentUser?.id || 'unknown',
            userName: currentUser?.name || 'Staff User',
            userRole: currentUser?.roleName || 'Staff',
            status: newLogStatus || status,
            notes: initialLogNote,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    closeSubDocModal();
  };

  const existingSubLogs = sortUpdateLogsDescending(editingSubDocument?.updateLogs || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E5E5E5] w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-bold text-sm sm:text-base text-[#1A1A1A] truncate">
                  {editingSubDocument ? 'Edit Linked Sub-Document' : 'Attach New Sub-Document'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0 truncate max-w-[200px]">
                  Linked to {subDocParentDoc.controlNo}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate hidden sm:block">
                Sub-documents inherit the same comprehensive metadata, PDF scans, and chronological log history.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSubDocModal}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden flex-1 text-xs">
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Sub-Document Identification */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                1. Sub-Document Identification
              </span>
              <span className="text-[10px] text-gray-400 truncate max-w-[220px]">
                Parent: <b>{subDocParentDoc.documentName}</b>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Sub-Document Control No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={controlNo}
                  onChange={(e) => setControlNo(e.target.value)}
                  placeholder="e.g. BAC-RES-2026-088"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden font-mono font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Sub-Document Type <span className="text-red-500">*</span>
                </label>
                {!isAddingNewType ? (
                  <div className="flex gap-2">
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden font-bold bg-white"
                    >
                      {documentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewType(true)}
                        className="p-2.5 border border-dashed border-gray-300 hover:border-black rounded-xl hover:bg-gray-50 transition cursor-pointer shrink-0"
                        title="Add Custom Type"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={newTypeInput}
                      onChange={(e) => setNewTypeInput(e.target.value)}
                      placeholder="New sub-doc type..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-black outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewType}
                      className="px-3 py-2 bg-black text-white rounded-xl font-bold shrink-0"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewType(false)}
                      className="px-2.5 py-2 border rounded-xl hover:bg-gray-100 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Sub-Document Name / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g. BAC Resolution Recommending Emergency Modality Under Sec 53.2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden font-medium bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Description & Purpose
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed notes, technical specifications, or justification..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Section 2: PDF File Attachment */}
          <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-red-50/40 border border-red-200">
            <div className="flex items-center justify-between border-b border-red-200 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                <span className="text-[11px] font-bold text-red-950 uppercase tracking-wider">
                  2. Sub-Document PDF Scan / File
                </span>
              </div>
              <span className="text-[10px] text-red-700 font-medium hidden sm:inline">
                Accepts PDF files up to 30MB
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf,image/*"
              onChange={handlePdfUpload}
              className="hidden"
              id="subdoc-pdf-upload"
            />

            {!attachedFileData && !attachedFileUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-300 hover:border-red-500 bg-white/80 rounded-2xl p-4 text-center cursor-pointer transition hover:bg-red-50/50 group"
              >
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-gray-800">
                  Upload Sub-Document PDF File
                </div>
                <p className="text-[10.5px] text-gray-500 mt-0.5">
                  Attach signed resolution, quotation, delivery slip, or inspection certificate.
                </p>
                {isUploadingPdf && (
                  <p className="text-xs font-bold text-red-600 mt-1 animate-pulse">
                    Processing PDF...
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-white rounded-2xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 text-xs truncate block">
                      {attachedFileName || 'Sub-Document.pdf'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Size: <b className="text-gray-700">{attachedFileSize || 'Document File'}</b>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() =>
                      openPdfViewer(
                        documentName || controlNo,
                        attachedFileUrl || attachedFileData,
                        attachedFileName || `${controlNo}.pdf`,
                        attachedFileSize,
                        assignedStaff || currentUser?.name
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    title="Preview Attached PDF"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <a
                    href={attachedFileUrl || attachedFileData}
                    download={attachedFileName || `${controlNo}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center transition cursor-pointer"
                    title="Download Attached PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="p-1.5 rounded-xl hover:bg-red-50 text-red-600 font-bold text-xs flex items-center transition cursor-pointer"
                    title="Remove PDF Attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Financial, Funding & Division Details */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                3. Financial, Funding & Division Allocation
              </span>
            </div>

            {/* Spend Notice Alert */}
            {isObrDocument(documentType) ? (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium">
                  <b>Obligation Request (OBR):</b> This sub-instrument is classified as an OBR.
                </span>
              </div>
            ) : isPrDocument(documentType) && isTrustFundSource(sourceOfFunds) ? (
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-[11px] font-medium">
                  <b>Trust Fund Purchase Request (PR):</b> Funded via Trust Fund ({sourceOfFunds}).
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Sub-Document Amount in PHP (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Source of Funds
                </label>
                {!isAddingNewFund ? (
                  <div className="flex gap-2">
                    <select
                      value={sourceOfFunds}
                      onChange={(e) => setSourceOfFunds(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden font-medium bg-white"
                    >
                      {fundSources.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewFund(true)}
                        className="p-2.5 border border-dashed border-gray-300 hover:border-black rounded-xl hover:bg-gray-50 transition cursor-pointer shrink-0"
                        title="Add Fund"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={newFundInput}
                      onChange={(e) => setNewFundInput(e.target.value)}
                      placeholder="New funding source..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-black outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewFund}
                      className="px-3 py-2 bg-black text-white rounded-xl font-bold shrink-0"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewFund(false)}
                      className="px-2.5 py-2 border rounded-xl hover:bg-gray-100 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Division / Section
                </label>
                {!isAddingNewDivision ? (
                  <div className="flex gap-2">
                    <select
                      value={divisionSection}
                      onChange={(e) => setDivisionSection(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden font-medium bg-white"
                    >
                      {divisionSections.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewDivision(true)}
                        className="p-2.5 border border-dashed border-gray-300 hover:border-black rounded-xl hover:bg-gray-50 transition cursor-pointer shrink-0"
                        title="Add Division"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={newDivisionInput}
                      onChange={(e) => setNewDivisionInput(e.target.value)}
                      placeholder="New division..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-black outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewDivision}
                      className="px-3 py-2 bg-black text-white rounded-xl font-bold shrink-0"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewDivision(false)}
                      className="px-2.5 py-2 border rounded-xl hover:bg-gray-100 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Responsible Personnel & Input Date */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                4. Responsible Personnel & Input Date
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Document Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Assigned Staff / Officer
                </label>
                <select
                  value={assignedStaff}
                  onChange={(e) => handleStaffSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white font-medium"
                >
                  <option value="">-- Select Officer --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.roleName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Sub-Document Updates Log */}
          <div className="space-y-3 sm:space-y-4 p-3.5 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-700" />
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                  5. Sub-Document Updates Log
                </span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium">
                {editingSubDocument ? `${existingSubLogs.length} Logs` : 'Initial Log'}
              </span>
            </div>

            {/* Form to Append a New Update Log Entry */}
            <div className="p-3 sm:p-4 rounded-xl bg-white border border-amber-300 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>{editingSubDocument ? 'Log New Sub-Document Update' : 'Initial Status & Progress Log'}</span>
                </span>
                <span className="text-[10px] font-medium text-gray-500">
                  Officer: <b className="text-gray-900">{currentUser?.name || 'Staff User'}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">
                    Update Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newLogDate}
                    onChange={(e) => setNewLogDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">
                    Update Time
                  </label>
                  <input
                    type="text"
                    value={newLogTime}
                    onChange={(e) => setNewLogTime(e.target.value)}
                    placeholder="e.g. 02:30 PM"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newLogStatus}
                    onChange={(e) => {
                      setNewLogStatus(e.target.value);
                      setStatus(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white font-bold text-xs"
                  >
                    {statuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                  Progress Log Narrative / Action Taken <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required={!editingSubDocument}
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  placeholder="e.g. Official resolution stamped and endorsed to finance."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white text-xs"
                />
              </div>
            </div>

            {/* List of Previous Past Update Logs for Sub-Doc */}
            {editingSubDocument && existingSubLogs.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                  <span>Previous Updates Log History</span>
                  <span>🔒 Chronological Audit Log</span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {existingSubLogs.map((log) => {
                    const dtFmt = formatDateTimeDisplay(log.date, log.time, log.timestamp);
                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-white border border-gray-200 text-xs space-y-1.5 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-gray-900">
                              <span>{dtFmt.dateFormatted}</span>
                              <span className="text-gray-500 font-normal">{dtFmt.timeFormatted}</span>
                            </div>
                            {log.status && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                {log.status}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            By: <b>{log.userName}</b>
                          </span>
                        </div>
                        <p className="text-gray-700 text-[11px] leading-relaxed">{log.notes}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Remarks / Notes */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-700">
              General Remarks & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional remarks or cross-references..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 sm:pt-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={closeSubDocModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold transition cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingSubDocument ? 'Save Sub-Document' : 'Attach Sub-Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
