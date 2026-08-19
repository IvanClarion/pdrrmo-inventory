import React, { useState, useEffect, useRef } from 'react';
import { useProcurement, sortUpdateLogsDescending, formatDateTimeDisplay } from '../ProcurementContext';
import { useInventory } from '../../context/InventoryContext';
import { uploadProcurementDocumentFile } from '../procurementDatabase';
import {
  ProcurementDocument,
  ProcurementStatus,
  DocumentUpdateLog,
  isObrDocument,
  isTrustFundSource,
  isPrDocument,
  isSpendContributor,
} from '../types';
import {
  X,
  FileText,
  DollarSign,
  Calendar,
  User,
  Layers,
  Sparkles,
  Plus,
  Info,
  CheckCircle2,
  Lock,
  Unlock,
  History,
  Edit2,
  Trash2,
  Clock,
  ShieldCheck,
  Check,
  Sliders,
  FileCheck2,
  Paperclip,
  Upload,
  Eye,
  Download,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const DocumentModal: React.FC = () => {
  const {
    isDocModalOpen,
    closeDocModal,
    editingDocument,
    addDocument,
    updateDocument,
    addDocumentUpdateLog,
    updateDocumentUpdateLog,
    deleteDocumentUpdateLog,
    openNewSubDocModal,
    openEditSubDocModal,
    deleteSubDocument,
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
    setIsWorkflowModalOpen,
    isAdmin,
  } = useProcurement();

  const { users, currentUser } = useInventory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Form State
  const [controlNo, setControlNo] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('Obligation Request (OBR)');
  const [amount, setAmount] = useState<string>('0');
  const [sourceOfFunds, setSourceOfFunds] = useState('DRRM Special Trust Fund (DRRM-STF)');
  const [divisionSection, setDivisionSection] = useState('Operations & Warning Division');
  const [inputDate, setInputDate] = useState('');
  const [documentUpdate, setDocumentUpdate] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [assignedStaffEmail, setAssignedStaffEmail] = useState('');
  const [status, setStatus] = useState<string>('Draft');
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
  const [newLogStatus, setNewLogStatus] = useState<string>('Draft');

  // Admin Past Log Edit State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogTime, setEditLogTime] = useState('');
  const [editLogNotes, setEditLogNotes] = useState('');
  const [editLogStatus, setEditLogStatus] = useState<string>('Draft');

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

  // Pre-fill or reset form
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (editingDocument) {
      setControlNo(editingDocument.controlNo || '');
      setDocumentName(editingDocument.documentName || '');
      setDescription(editingDocument.description || '');
      setDocumentType(editingDocument.documentType || documentTypes[0] || 'Obligation Request (OBR)');
      setAmount(String(editingDocument.amount || 0));
      setSourceOfFunds(editingDocument.sourceOfFunds || fundSources[0] || 'DRRM Special Trust Fund (DRRM-STF)');
      setDivisionSection(editingDocument.divisionSection || divisionSections[0] || 'Operations & Warning Division');
      setInputDate(editingDocument.inputDate || today);
      setDocumentUpdate(editingDocument.documentUpdate || today);
      setAssignedStaff(editingDocument.assignedStaff || '');
      setAssignedStaffId(editingDocument.assignedStaffId || '');
      setAssignedStaffEmail(editingDocument.assignedStaffEmail || '');
      setStatus(editingDocument.status || 'Draft');
      setNotes(editingDocument.notes || '');
      setCustomFieldValues(editingDocument.customFields || {});

      // Attachment
      setAttachedFileName(editingDocument.fileName || '');
      setAttachedFileSize(editingDocument.fileSize || '');
      setAttachedFileData(editingDocument.fileData || '');
      setAttachedFileUrl(editingDocument.fileUrl || '');

      // Clear new log inputs for adding a fresh update
      setNewLogDate(today);
      setNewLogTime(timeNow);
      setNewLogNotes('');
      setNewLogStatus(editingDocument.status || 'Draft');
    } else {
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      setControlNo(`PDRRMO-OBR-2026-${randomSeq}`);
      setDocumentName('');
      setDescription('');
      setDocumentType(documentTypes[0] || 'Obligation Request (OBR)');
      setAmount('0');
      setSourceOfFunds(fundSources[0] || 'DRRM Special Trust Fund (DRRM-STF)');
      setDivisionSection(divisionSections[0] || 'Operations & Warning Division');
      setInputDate(today);
      setDocumentUpdate(today);
      setAssignedStaff(currentUser?.name || '');
      setAssignedStaffId(currentUser?.id || '');
      setAssignedStaffEmail(currentUser?.email || '');
      setStatus('Draft');
      setNotes('');
      setCustomFieldValues({});
      setAttachedFileName('');
      setAttachedFileSize('');
      setAttachedFileData('');
      setAttachedFileUrl('');
      setNewLogDate(today);
      setNewLogTime(timeNow);
      setNewLogNotes('Initial document draft created.');
      setNewLogStatus(statuses[0] || 'Draft');

      // Default custom fields
      const initialCustoms: Record<string, any> = {};
      customFields.forEach((cf) => {
        if (cf.defaultValue !== undefined) {
          initialCustoms[cf.key] = cf.defaultValue;
        } else if (cf.type === 'boolean') {
          initialCustoms[cf.key] = false;
        } else {
          initialCustoms[cf.key] = '';
        }
      });
      setCustomFieldValues(initialCustoms);
    }
    setFormError('');
    setIsAddingNewType(false);
    setIsAddingNewFund(false);
    setIsAddingNewDivision(false);
    setIsAddingNewStatus(false);
    setEditingLogId(null);
  }, [editingDocument, isDocModalOpen, customFields, documentTypes, fundSources, divisionSections, statuses, users, currentUser]);

  if (!isDocModalOpen) return null;

  const isCurrentObr = isObrDocument(documentType);

  const handleAutoGenerateControlNo = () => {
    const prefixMap: Record<string, string> = {
      'Obligation Request (OBR)': 'OBR',
      'Purchase Request (PR)': 'PR',
      'Purchase Order (PO)': 'PO',
      'Notice of Award (NOA)': 'NOA',
      'Notice to Proceed (NTP)': 'NTP',
      'Contract Agreement': 'CON',
      'Disbursement Voucher (DV)': 'DV',
      'Inspection & Acceptance (IAR)': 'IAR',
    };
    const code = prefixMap[documentType] || 'DOC';
    const seq = Math.floor(1000 + Math.random() * 9000);
    setControlNo(`PDRRMO-${code}-2026-${seq}`);
  };

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
        setFormError('Failed to read the file. Please try again.');
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

  // Admin Log Editing Helpers
  const handleStartEditLog = (log: DocumentUpdateLog) => {
    setEditingLogId(log.id);
    setEditLogDate(log.date);
    setEditLogTime(log.time || '12:00 PM');
    setEditLogNotes(log.notes);
    setEditLogStatus(log.status || status);
  };

  const handleSaveEditLog = (logId: string) => {
    if (!editingDocument || !editLogNotes.trim()) return;
    updateDocumentUpdateLog(editingDocument.id, logId, {
      date: editLogDate,
      time: editLogTime,
      notes: editLogNotes.trim(),
      status: editLogStatus,
    });
    setEditingLogId(null);
  };

  const handleDeleteLog = (logId: string) => {
    if (!editingDocument) return;
    if (window.confirm('Delete this past update log entry?')) {
      deleteDocumentUpdateLog(editingDocument.id, logId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!controlNo.trim()) {
      setFormError('Document Control No. is required.');
      return;
    }
    if (!documentName.trim()) {
      setFormError('Document Name is required.');
      return;
    }

    const parsedAmount = parseFloat(amount) || 0;

    // Check required custom fields
    for (const cf of customFields) {
      if (cf.required) {
        const val = customFieldValues[cf.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          setFormError(`Custom field "${cf.name}" is required.`);
          return;
        }
      }
    }

    if (editingDocument) {
      // 1. If Staff/Admin wrote a new update log note, append it with Date & Time
      if (newLogNotes.trim()) {
        addDocumentUpdateLog(editingDocument.id, {
          date: newLogDate || new Date().toISOString().split('T')[0],
          time: newLogTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          notes: newLogNotes.trim(),
          status: newLogStatus || status,
        });
      }

      // 2. Update the document properties
      const updates: Partial<ProcurementDocument> = {
        status: newLogNotes.trim() ? newLogStatus : status,
        notes: notes.trim(),
        customFields: customFieldValues,
        divisionSection: divisionSection.trim() || undefined,
        fileName: attachedFileName || undefined,
        fileSize: attachedFileSize || undefined,
        fileData: attachedFileData || undefined,
        fileUrl: attachedFileUrl || (attachedFileData?.startsWith('http') ? attachedFileData : undefined),
        attachmentsCount: attachedFileName ? 1 : 0,
      };

      if (isAdmin) {
        updates.controlNo = controlNo.trim();
        updates.documentName = documentName.trim();
        updates.description = description.trim();
        updates.documentType = documentType;
        updates.amount = parsedAmount;
        updates.sourceOfFunds = sourceOfFunds;
        updates.inputDate = inputDate;
        updates.assignedStaff = assignedStaff.trim();
        updates.assignedStaffId = assignedStaffId || undefined;
        updates.assignedStaffEmail = assignedStaffEmail || undefined;
      } else {
        // Staff allowed fields
        updates.assignedStaff = assignedStaff.trim();
        updates.assignedStaffId = assignedStaffId || undefined;
        updates.assignedStaffEmail = assignedStaffEmail || undefined;
        updates.documentName = documentName.trim();
        updates.description = description.trim();
      }

      updateDocument(editingDocument.id, updates);
    } else {
      // Creating new document
      const initialLogNote = newLogNotes.trim() || 'Initial document registered.';
      const today = new Date().toISOString().split('T')[0];
      const timeNow = newLogTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      addDocument({
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
        attachmentsCount: attachedFileName ? 1 : 0,
        customFields: customFieldValues,
        updateLogs: [
          {
            id: `uplog-${Date.now()}`,
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

    closeDocModal();
  };

  // Ensure latest update logs are on top
  const existingLogs = sortUpdateLogsDescending(editingDocument?.updateLogs || []);
  const subDocuments = editingDocument?.subDocuments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E5E5E5] w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="font-bold text-sm sm:text-base text-[#1A1A1A] truncate">
                  {editingDocument ? 'Edit Procurement Document' : 'New Procurement Document'}
                </h3>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    <span>Admin Mode</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                    Staff Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate hidden sm:block">
                {editingDocument
                  ? `Updating ${editingDocument.controlNo} • Attach PDF, assign division & log updates`
                  : 'Register a new document and attach official PDF scans into the PDRRMO Tracker'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDocModal}
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

          {/* Section 1: Document Identification */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                1. Document Identification
              </span>
              {!isAdmin && editingDocument && (
                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Core financials locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Document Control No. <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={!isAdmin && Boolean(editingDocument)}
                    value={controlNo}
                    onChange={(e) => setControlNo(e.target.value)}
                    placeholder="e.g. PDRRMO-OBR-2026-0101"
                    className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border font-mono font-bold outline-hidden ${
                      !isAdmin && editingDocument
                        ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                        : 'border-gray-300 focus:border-black focus:ring-1 focus:ring-black bg-white'
                    }`}
                  />
                  {(isAdmin || !editingDocument) && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateControlNo}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center gap-1 shrink-0 transition cursor-pointer"
                      title="Auto-Generate Sequential Control Number"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">Auto</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Type of Document <span className="text-red-500">*</span>
                </label>
                {!isAddingNewType ? (
                  <div className="flex gap-2">
                    <select
                      disabled={!isAdmin && Boolean(editingDocument)}
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border outline-hidden font-medium ${
                        !isAdmin && editingDocument
                          ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'border-gray-300 focus:border-black focus:ring-1 focus:ring-black bg-white font-bold text-gray-900'
                      }`}
                    >
                      {documentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t} {isObrDocument(t) ? '★ (Summed in Spend)' : ''}
                        </option>
                      ))}
                    </select>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewType(true)}
                        className="p-2.5 border border-dashed border-gray-300 hover:border-black rounded-xl hover:bg-gray-50 transition cursor-pointer shrink-0"
                        title="Add Custom Document Type"
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
                      placeholder="New document type..."
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
                Document Name / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g. Emergency Satellite Communication Kits Requisition"
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
                placeholder="Detailed specifications, emergency disaster justification, or scope..."
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
                  2. Official PDF Document Attachment
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
              id="doc-pdf-upload"
            />

            {!attachedFileData && !attachedFileUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-300 hover:border-red-500 bg-white/80 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition hover:bg-red-50/50 group"
              >
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="font-bold text-xs text-gray-800">
                  Click to Upload or Drag & Drop Document PDF
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Attach signed scanned copies, official OBRs, resolutions, canvass quotes, or vouchers.
                </p>
                {isUploadingPdf && (
                  <p className="text-xs font-bold text-red-600 mt-2 animate-pulse">
                    Uploading and compressing document to Supabase storage...
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-xs">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 text-xs truncate block">
                      {attachedFileName || 'Procurement-Document.pdf'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Size: <b className="text-gray-700">{attachedFileSize || 'Attached Document'}</b> • Saved in Cloud Storage
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
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
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
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center transition cursor-pointer"
                    title="Download Attached PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="p-2 rounded-xl hover:bg-red-50 text-red-600 font-bold text-xs flex items-center transition cursor-pointer"
                    title="Remove PDF Attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Financial, Funding & Division Allocation */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                3. Financial, Funding & Division Allocation
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsWorkflowModalOpen(true)}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  title="Customize Fund Sources, Divisions & Statuses"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Customize Lists</span>
                </button>
              )}
            </div>

            {/* OBR & Trust Fund PR Sum Notice Alert */}
            {isObrDocument(documentType) ? (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-medium">
                  <b>Obligation Request (OBR):</b> This amount will be aggregated into the <b>Total Value & Procurement Spend</b> on the Dashboard.
                </span>
              </div>
            ) : isPrDocument(documentType) && isTrustFundSource(sourceOfFunds) ? (
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-[11px] font-medium">
                  <b>Trust Fund Purchase Request (PR):</b> Because the funding source is a <b>Trust Fund</b> ({sourceOfFunds}), this PR amount will be aggregated into the <b>Total Value & Procurement Spend</b> on the Dashboard.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-[11px]">
                  <b>Note:</b> Document type is <b>{documentType}</b> ({sourceOfFunds}). Face value is recorded, but only <b>Obligation Requests (OBR)</b> and <b>Trust Fund Purchase Requests</b> are summed into Total Spend.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Procurement Amount in PHP (₱) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    disabled={!isAdmin && Boolean(editingDocument)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border font-mono font-bold outline-hidden ${
                      !isAdmin && editingDocument
                        ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                        : 'border-gray-300 focus:border-black focus:ring-1 focus:ring-black bg-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Source of Funds <span className="text-red-500">*</span>
                </label>
                {!isAddingNewFund ? (
                  <div className="flex gap-2">
                    <select
                      disabled={!isAdmin && Boolean(editingDocument)}
                      value={sourceOfFunds}
                      onChange={(e) => setSourceOfFunds(e.target.value)}
                      className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border outline-hidden font-medium ${
                        !isAdmin && editingDocument
                          ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'border-gray-300 focus:border-black focus:ring-1 focus:ring-black bg-white'
                      }`}
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
                        title="Quick Add Custom Source of Funds"
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
                  Division / Section <span className="text-red-500">*</span>
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
                        title="Quick Add Division / Section"
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
                      placeholder="New division / section..."
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
                  Document Input Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={!isAdmin && Boolean(editingDocument)}
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-medium outline-hidden ${
                    !isAdmin && editingDocument
                      ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                      : 'border-gray-300 focus:border-black focus:ring-1 focus:ring-black bg-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Assigned Staff / Action Officer
                </label>
                <div className="space-y-1.5">
                  <select
                    value={assignedStaff}
                    onChange={(e) => handleStaffSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white font-medium text-xs"
                  >
                    <option value="">-- Select Registered Officer --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.roleName})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    placeholder="Or type custom officer name..."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Linked Sub-Documents */}
          {editingDocument && (
            <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-blue-50/40 border border-blue-200">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-700" />
                  <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">
                    5. Linked Sub-Documents ({subDocuments.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openNewSubDocModal(editingDocument)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-2xs shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Attach Sub-Doc</span>
                </button>
              </div>

              {subDocuments.length === 0 ? (
                <p className="text-gray-500 text-xs py-1 italic">
                  No sub-documents linked. Click "Attach Sub-Doc" to link resolutions, NOAs, NTPs, or delivery receipts.
                </p>
              ) : (
                <div className="space-y-2">
                  {subDocuments.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-[10px] bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded border border-gray-200">
                          {sub.controlNo}
                        </span>
                        <span className="font-bold text-gray-800 text-xs truncate">
                          {sub.documentName}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-gray-600 text-[10px]">
                          {sub.documentType}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => openEditSubDocModal(editingDocument, sub)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                          title="Edit Sub-Document"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete sub-document "${sub.controlNo}"?`)) {
                                deleteSubDocument(editingDocument.id, sub.id);
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
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 6: Document Updates Log */}
          <div className="space-y-3 sm:space-y-4 p-3.5 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-700" />
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                  6. Document Updates Log
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsWorkflowModalOpen(true)}
                    className="text-[10px] font-bold text-amber-900 hover:text-black flex items-center gap-1 cursor-pointer"
                    title="Customize Statuses & Stages"
                  >
                    <Sliders className="w-3 h-3" />
                    <span className="hidden sm:inline">Customize Statuses</span>
                  </button>
                )}
                <span className="text-[10px] text-amber-800 font-medium">
                  {editingDocument ? `${existingLogs.length} Logs` : 'Initial Log'}
                </span>
              </div>
            </div>

            {/* Form to Append a New Update Log Entry */}
            <div className="p-3 sm:p-4 rounded-xl bg-white border border-amber-300 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>{editingDocument ? 'Log New Document Update' : 'Initial Status & Progress Log'}</span>
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
                    placeholder="e.g. 03:45 PM"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">
                    New / Current Status <span className="text-red-500">*</span>
                  </label>
                  {!isAddingNewStatus ? (
                    <div className="flex gap-2">
                      <select
                        value={newLogStatus}
                        onChange={(e) => {
                          setNewLogStatus(e.target.value);
                          setStatus(e.target.value);
                        }}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white font-bold text-xs"
                      >
                        {statuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsAddingNewStatus(true)}
                          className="p-2 border border-dashed border-gray-300 hover:border-black rounded-xl hover:bg-gray-50 transition cursor-pointer shrink-0"
                          title="Quick Add Custom Status"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
                      <input
                        type="text"
                        value={newStatusInput}
                        onChange={(e) => setNewStatusInput(e.target.value)}
                        placeholder="New status..."
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-black outline-hidden text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewStatus}
                        className="px-3 py-1.5 bg-black text-white rounded-xl font-bold text-xs shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewStatus(false)}
                        className="px-2 py-1.5 border rounded-xl hover:bg-gray-100 shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                  Progress Log Narrative / Action Taken <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required={!editingDocument}
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  placeholder={
                    editingDocument
                      ? 'e.g. BAC opening of bids completed. Passed to Technical Working Group.'
                      : 'Initial document registration narrative...'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white text-xs"
                />
              </div>
            </div>

            {/* List of Previous Past Update Logs */}
            {editingDocument && existingLogs.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                  <span>Previous Updates Log History</span>
                  <span>{isAdmin ? 'Admin Edit Controls' : '🔒 Past Logs Locked'}</span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {existingLogs.map((log, idx) => {
                    const isEditingThisLog = editingLogId === log.id;
                    const dtFmt = formatDateTimeDisplay(log.date, log.time, log.timestamp);

                    if (isEditingThisLog) {
                      return (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-white border border-purple-400 space-y-2 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-900 text-[11px]">
                              Admin Edit: Past Log Entry #{existingLogs.length - idx}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="date"
                              value={editLogDate}
                              onChange={(e) => setEditLogDate(e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg border text-xs"
                            />
                            <input
                              type="text"
                              value={editLogTime}
                              onChange={(e) => setEditLogTime(e.target.value)}
                              placeholder="Time..."
                              className="px-2.5 py-1.5 rounded-lg border text-xs font-mono"
                            />
                            <select
                              value={editLogStatus}
                              onChange={(e) => setEditLogStatus(e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg border text-xs font-bold"
                            >
                              {statuses.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <textarea
                            rows={2}
                            value={editLogNotes}
                            onChange={(e) => setEditLogNotes(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border text-xs"
                          />

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingLogId(null)}
                              className="px-2.5 py-1 rounded-lg border text-gray-600 font-bold text-[11px]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditLog(log.id)}
                              className="px-3 py-1 rounded-lg bg-black text-white font-bold text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 text-green-400" />
                              <span>Save Log</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

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

                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            <span className="text-[10px] text-gray-400">
                              By: <b>{log.userName}</b> ({log.userRole || 'Staff'})
                            </span>

                            {isAdmin ? (
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditLog(log)}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                                  title="Admin: Edit past log entry"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                                  title="Admin: Delete past log entry"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span
                                className="text-gray-300"
                                title="Past log entry is locked and editable only by Administrator"
                              >
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-700 text-[11px] leading-relaxed">{log.notes}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 7: Dynamic Admin Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-3 sm:space-y-4 p-3.5 sm:p-4 rounded-2xl bg-neutral-50 border border-[#E5E5E5]">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    7. Custom Dynamic Fields ({customFields.length})
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-normal hidden sm:inline">
                  Admin-defined schema fields
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {customFields.map((field) => {
                  const val = customFieldValues[field.key] ?? '';

                  return (
                    <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {field.name} {field.required && <span className="text-red-500">*</span>}
                      </label>

                      {field.type === 'text' && (
                        <input
                          type="text"
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.name}...`}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white"
                        />
                      )}

                      {field.type === 'number' && (
                        <input
                          type="number"
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.key, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white font-mono"
                        />
                      )}

                      {field.type === 'currency' && (
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            required={field.required}
                            value={val}
                            onChange={(e) => handleCustomFieldChange(field.key, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white font-mono"
                          />
                        </div>
                      )}

                      {field.type === 'date' && (
                        <input
                          type="date"
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white"
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white font-medium text-xs"
                        >
                          <option value="">-- Select {field.name} --</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          rows={2}
                          required={field.required}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.name}...`}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black outline-hidden bg-white"
                        />
                      )}

                      {field.type === 'boolean' && (
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                          />
                          <span className="font-bold text-gray-700">{field.name} (Yes/Enabled)</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 8: Internal Notes */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-700">
              General Remarks & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal tracking notes or general comments..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-hidden bg-white"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 sm:pt-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={closeDocModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold transition cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>{editingDocument ? 'Save & Append Update Log' : 'Register Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
