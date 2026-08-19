import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ProcurementDocument,
  ProcurementCustomField,
  ProcurementFundSource,
  ProcurementStatus,
  ProcurementUserAccess,
  ProcurementRole,
  ProcurementAlert,
  ProcurementFilterState,
  DocumentUpdateLog,
  ProcurementSubDocument,
  isObrDocument,
  isTrustFundSource,
  isPrDocument,
  isSpendContributor,
} from './types';
import {
  fetchProcurementDocumentsFromDb,
  fetchFundSourcesFromDb,
  fetchDivisionsFromDb,
  fetchDocumentTypesFromDb,
  fetchStatusesFromDb,
  fetchCustomFieldsFromDb,
  fetchUserAccessListFromDb,
  seedStandardLookupsToDb,
  dbInsertProcurementDocument,
  dbUpdateProcurementDocument,
  dbDeleteProcurementDocument,
  dbInsertSubDocument,
  dbUpdateSubDocument,
  dbDeleteSubDocument,
  dbInsertUpdateLog,
  dbUpdateUpdateLog,
  dbDeleteUpdateLog,
  dbSaveFundSource,
  dbDeleteFundSource,
  dbSaveDivision,
  dbDeleteDivision,
  dbSaveDocumentType,
  dbDeleteDocumentType,
  dbSaveStatus,
  dbDeleteStatus,
  dbSaveCustomField,
  dbDeleteCustomField,
  dbUpsertUserAccess,
  dbDeleteUserAccess,
  generateUuid,
  ensureValidUuid,
} from './procurementDatabase';
import { useInventory } from '../context/InventoryContext';
import { audioService } from '../utils/audio';

const STORAGE_KEYS = {
  DOCUMENTS: 'pdrrmo_procurement_docs_v1',
  CUSTOM_FIELDS: 'pdrrmo_procurement_custom_fields_v1',
  DOC_TYPES: 'pdrrmo_procurement_doc_types_v1',
  FUND_SOURCES: 'pdrrmo_procurement_fund_sources_v1',
  STATUSES: 'pdrrmo_procurement_statuses_v1',
  DIVISION_SECTIONS: 'pdrrmo_procurement_division_sections_v1',
  USER_ACCESS: 'pdrrmo_procurement_user_access_v1',
  STALE_DAYS: 'pdrrmo_procurement_stale_days_v1',
};

export const formatDateTimeDisplay = (dateStr: string, timeStr?: string, timestampStr?: string): { dateFormatted: string; timeFormatted: string; fullString: string } => {
  if (timestampStr) {
    try {
      const dt = new Date(timestampStr);
      if (!isNaN(dt.getTime())) {
        const dFmt = dt.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const tFmt = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return {
          dateFormatted: dateStr || dFmt,
          timeFormatted: timeStr || tFmt,
          fullString: `${dateStr || dFmt} • ${timeStr || tFmt}`,
        };
      }
    } catch (_) {}
  }

  const tFmt = timeStr || '12:00 PM';
  return {
    dateFormatted: dateStr,
    timeFormatted: tFmt,
    fullString: `${dateStr} • ${tFmt}`,
  };
};

export const sortUpdateLogsDescending = (logs: DocumentUpdateLog[]): DocumentUpdateLog[] => {
  return [...logs].sort((a, b) => {
    const timeA = new Date(a.timestamp || `${a.date}T${a.time || '00:00:00'}`).getTime();
    const timeB = new Date(b.timestamp || `${b.date}T${b.time || '00:00:00'}`).getTime();
    if (timeB !== timeA) {
      return timeB - timeA; // Latest date & time strictly on top!
    }
    const createdA = new Date(a.createdAt || a.timestamp).getTime();
    const createdB = new Date(b.createdAt || b.timestamp).getTime();
    return createdB - createdA;
  });
};

function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.warn(`[ProcurementContext] Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function safeSetJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[ProcurementContext] Error writing ${key} to storage:`, err);
  }
}

export interface ProcurementContextType {
  documents: ProcurementDocument[];
  customFields: ProcurementCustomField[];
  documentTypes: string[];
  fundSources: string[];
  statuses: string[];
  divisionSections: string[];
  userAccessList: ProcurementUserAccess[];
  staleDaysThreshold: number;
  setStaleDaysThreshold: (days: number) => void;
  isLoadingDocuments: boolean;
  refreshDocumentsFromDb: () => Promise<void>;

  // Selected State for Modal/Drawers
  selectedDocument: ProcurementDocument | null;
  setSelectedDocument: (doc: ProcurementDocument | null) => void;
  isDocModalOpen: boolean;
  setIsDocModalOpen: (open: boolean) => void;
  editingDocument: ProcurementDocument | null;
  openNewDocumentModal: () => void;
  openEditDocumentModal: (doc: ProcurementDocument) => void;
  closeDocModal: () => void;
  isDetailDrawerOpen: boolean;
  setIsDetailDrawerOpen: (open: boolean) => void;
  openDetailDrawer: (doc: ProcurementDocument) => void;
  closeDetailDrawer: () => void;
  isCustomFieldsModalOpen: boolean;
  setIsCustomFieldsModalOpen: (open: boolean) => void;
  isUserAccessModalOpen: boolean;
  setIsUserAccessModalOpen: (open: boolean) => void;
  isWorkflowModalOpen: boolean;
  setIsWorkflowModalOpen: (open: boolean) => void;

  // Sub-Document Modal State
  isSubDocModalOpen: boolean;
  setIsSubDocModalOpen: (open: boolean) => void;
  subDocParentDoc: ProcurementDocument | null;
  editingSubDocument: ProcurementSubDocument | null;
  openNewSubDocModal: (parentDoc: ProcurementDocument) => void;
  openEditSubDocModal: (parentDoc: ProcurementDocument, subDoc: ProcurementSubDocument) => void;
  closeSubDocModal: () => void;

  // PDF Viewer Modal State
  viewingPdf: { title: string; fileData?: string; fileUrl?: string; fileName: string; fileSize?: string; uploadedBy?: string } | null;
  openPdfViewer: (title: string, fileDataOrUrl: string, fileName: string, fileSize?: string, uploadedBy?: string) => void;
  closePdfViewer: () => void;

  // Active Sub-tab
  activeSubTab: 'dashboard' | 'documents' | 'alerts' | 'fields' | 'access' | 'workflow';
  setActiveSubTab: (tab: 'dashboard' | 'documents' | 'alerts' | 'fields' | 'access' | 'workflow') => void;

  // Filter State
  filterState: ProcurementFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<ProcurementFilterState>>;
  resetFilters: () => void;
  filteredDocuments: ProcurementDocument[];

  // Computed Metrics & Alerts
  totalDocuments: number;
  totalAmount: number; // Sum of Obligation Request (OBR) and Trust Fund Purchase Request (PR)
  totalSpendDocsCount: number;
  totalObrCount: number;
  totalAllDocsAmount: number;
  activeDocumentsCount: number;
  completedCount: number;
  bacProcessingCount: number;
  staleDocumentsCount: number;
  alerts: ProcurementAlert[];

  // User Permissions
  hasAccess: boolean;
  isAdmin: boolean;
  currentUserProcurementRole: ProcurementRole | null;
  canEdit: boolean;
  canManageFields: boolean;
  canManageAccess: boolean;

  // Document Operations
  addDocument: (docData: Omit<ProcurementDocument, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateDocument: (id: string, updates: Partial<ProcurementDocument>) => Promise<{ success: boolean; error?: string }>;
  deleteDocument: (id: string) => Promise<{ success: boolean; error?: string }>;
  duplicateDocument: (id: string) => Promise<{ success: boolean; newId?: string }>;

  // Sub-Document Operations
  addSubDocument: (parentDocId: string, subDocData: Omit<ProcurementSubDocument, 'id' | 'parentDocumentId' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; id?: string }>;
  updateSubDocument: (parentDocId: string, subDocId: string, updates: Partial<ProcurementSubDocument>) => Promise<{ success: boolean }>;
  deleteSubDocument: (parentDocId: string, subDocId: string) => Promise<{ success: boolean }>;

  // Document Update Logs Operations
  addDocumentUpdateLog: (documentId: string, logData: { date: string; time?: string; notes: string; status?: ProcurementStatus; stageOrMilestone?: string }) => Promise<{ success: boolean; logId?: string }>;
  updateDocumentUpdateLog: (documentId: string, logId: string, logUpdates: Partial<DocumentUpdateLog>) => Promise<{ success: boolean }>;
  deleteDocumentUpdateLog: (documentId: string, logId: string) => Promise<{ success: boolean }>;

  // Custom Fields Operations
  addCustomField: (fieldData: Omit<ProcurementCustomField, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  updateCustomField: (id: string, updates: Partial<ProcurementCustomField>) => Promise<{ success: boolean; error?: string }>;
  deleteCustomField: (id: string) => Promise<{ success: boolean; error?: string }>;
  reorderCustomFields: (fields: ProcurementCustomField[]) => void;

  // Configuration Lists (Source of Funds, Statuses & Divisions)
  addDocumentType: (newType: string) => void;
  deleteDocumentType: (typeToDelete: string) => void;

  addFundSource: (newSource: string) => void;
  updateFundSource: (oldSource: string, newSource: string) => void;
  deleteFundSource: (sourceToDelete: string) => void;
  reorderFundSources: (sources: string[]) => void;

  addStatus: (newStatus: string) => void;
  updateStatus: (oldStatus: string, newStatus: string) => void;
  deleteStatus: (statusToDelete: string) => void;
  reorderStatuses: (statuses: string[]) => void;

  addDivisionSection: (newDivision: string) => void;
  updateDivisionSection: (oldDivision: string, newDivision: string) => void;
  deleteDivisionSection: (divisionToDelete: string) => void;
  reorderDivisionSections: (divisions: string[]) => void;

  // Access Control Operations
  grantUserAccess: (userId: string, userName: string, userEmail: string, role: ProcurementRole, notes?: string) => void;
  revokeUserAccess: (userId: string) => void;
  updateUserRole: (userId: string, role: ProcurementRole) => void;
  checkUserHasAccess: (userId: string) => boolean;

  // Reset
  resetToDefaultData: () => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentRole, hasPermission, addAuditLog } = useInventory();

  // Loading State
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(true);

  // State: Documents (strictly from live Supabase DB, starts empty)
  const [documents, setDocuments] = useState<ProcurementDocument[]>([]);

  // State: Custom Fields
  const [customFields, setCustomFields] = useState<ProcurementCustomField[]>([]);

  // State: Document Types, Fund Sources, and Statuses
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [fundSources, setFundSources] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [divisionSections, setDivisionSections] = useState<string[]>([]);

  // State: User Access Matrix
  const [userAccessList, setUserAccessList] = useState<ProcurementUserAccess[]>([]);

  // State: Alert Stale Days Threshold
  const [staleDaysThreshold, setStaleDaysThreshold] = useState<number>(14);

  // Active Sub-Tab Navigation
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'documents' | 'alerts' | 'fields' | 'access' | 'workflow'>('dashboard');

  // Modal / Drawer state
  const [selectedDocument, setSelectedDocument] = useState<ProcurementDocument | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [editingDocument, setEditingDocument] = useState<ProcurementDocument | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState<boolean>(false);
  const [isUserAccessModalOpen, setIsUserAccessModalOpen] = useState<boolean>(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState<boolean>(false);

  // Sub-Document Modal State
  const [isSubDocModalOpen, setIsSubDocModalOpen] = useState<boolean>(false);
  const [subDocParentDoc, setSubDocParentDoc] = useState<ProcurementDocument | null>(null);
  const [editingSubDocument, setEditingSubDocument] = useState<ProcurementSubDocument | null>(null);

  // PDF / Document Viewer Modal State
  const [viewingPdf, setViewingPdf] = useState<{
    title: string;
    fileData?: string;
    fileUrl?: string;
    fileName: string;
    fileSize?: string;
    uploadedBy?: string;
  } | null>(null);

  const openPdfViewer = (title: string, fileDataOrUrl: string, fileName: string, fileSize?: string, uploadedBy?: string) => {
    const isUrl = fileDataOrUrl.startsWith('http://') || fileDataOrUrl.startsWith('https://');
    setViewingPdf({
      title,
      fileData: isUrl ? undefined : fileDataOrUrl,
      fileUrl: isUrl ? fileDataOrUrl : undefined,
      fileName,
      fileSize,
      uploadedBy,
    });
  };

  const closePdfViewer = () => {
    setViewingPdf(null);
  };

  // Filter State
  const [filterState, setFilterState] = useState<ProcurementFilterState>({
    searchQuery: '',
    documentType: 'ALL',
    sourceOfFunds: 'ALL',
    divisionSection: 'ALL',
    status: 'ALL',
    assignedStaff: 'ALL',
    dateRange: 'ALL',
  });

  // Async Load strictly from Supabase Database
  const refreshDocumentsFromDb = useCallback(async () => {
    try {
      setIsLoadingDocuments(true);
      // Clean legacy mock documents from storage if any
      try {
        localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
      } catch (_) {}

      let [docsFromDb, fundsFromDb, divsFromDb, typesFromDb, statsFromDb, fieldsFromDb, accessFromDb] =
        await Promise.all([
          fetchProcurementDocumentsFromDb(),
          fetchFundSourcesFromDb(),
          fetchDivisionsFromDb(),
          fetchDocumentTypesFromDb(),
          fetchStatusesFromDb(),
          fetchCustomFieldsFromDb(),
          fetchUserAccessListFromDb(),
        ]);

      // If lookups are completely empty on first launch, seed them once to Supabase tables
      if (
        (!fundsFromDb || fundsFromDb.length === 0) &&
        (!typesFromDb || typesFromDb.length === 0) &&
        (!statsFromDb || statsFromDb.length === 0)
      ) {
        try {
          await seedStandardLookupsToDb();
          [fundsFromDb, divsFromDb, typesFromDb, statsFromDb, fieldsFromDb] = await Promise.all([
            fetchFundSourcesFromDb(),
            fetchDivisionsFromDb(),
            fetchDocumentTypesFromDb(),
            fetchStatusesFromDb(),
            fetchCustomFieldsFromDb(),
          ]);
        } catch (seedErr) {
          console.warn('[ProcurementContext] Seeding standard lookups warning:', seedErr);
        }
      }

      setDocuments(docsFromDb || []);
      setFundSources(fundsFromDb || []);
      setDivisionSections(divsFromDb || []);
      setDocumentTypes(typesFromDb || []);
      setStatuses(statsFromDb || []);
      setCustomFields(fieldsFromDb || []);
      setUserAccessList(accessFromDb || []);
    } catch (err) {
      console.warn('[ProcurementContext] Error fetching from Supabase:', err);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    refreshDocumentsFromDb();
  }, [refreshDocumentsFromDb]);

  // Persist State to Local Storage as offline cache
  useEffect(() => {
    safeSetJson(STORAGE_KEYS.DOCUMENTS, documents);
  }, [documents]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.CUSTOM_FIELDS, customFields);
  }, [customFields]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.DOC_TYPES, documentTypes);
  }, [documentTypes]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.FUND_SOURCES, fundSources);
  }, [fundSources]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.STATUSES, statuses);
  }, [statuses]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.DIVISION_SECTIONS, divisionSections);
  }, [divisionSections]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.USER_ACCESS, userAccessList);
  }, [userAccessList]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.STALE_DAYS, staleDaysThreshold);
  }, [staleDaysThreshold]);

  // Permissions Calculation
  const currentUserProcurementRole = useMemo<ProcurementRole | null>(() => {
    if (!currentUser) return null;
    if (currentUser.roleName === 'Admin' || currentRole?.name === 'Admin') {
      return 'Procurement Admin';
    }
    const accessEntry = userAccessList.find(
      (a) =>
        a.userId === currentUser.id ||
        (currentUser.email && a.userEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (accessEntry && accessEntry.hasAccess) {
      return accessEntry.role;
    }
    if (currentUser.roleName === 'Inventory Manager' || currentRole?.name === 'Inventory Manager') {
      return 'Procurement Officer';
    }
    return null;
  }, [currentUser, currentRole, userAccessList]);

  const hasAccess = Boolean(currentUserProcurementRole !== null || currentUser?.roleName === 'Admin');
  const isAdmin = Boolean(currentUserProcurementRole === 'Procurement Admin' || currentUser?.roleName === 'Admin');
  const canEdit = Boolean(isAdmin || currentUserProcurementRole === 'Procurement Officer' || hasPermission('canAddItems'));
  const canManageFields = isAdmin;
  const canManageAccess = isAdmin;

  // Alerts Calculation
  const alerts = useMemo<ProcurementAlert[]>(() => {
    const list: ProcurementAlert[] = [];
    const now = new Date();

    documents.forEach((doc) => {
      // 1. Stale Update Alert
      const lastUpdateStr = doc.documentUpdate || doc.inputDate;
      const lastUpdateDate = new Date(lastUpdateStr);
      const diffTime = Math.abs(now.getTime() - lastUpdateDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (
        diffDays >= staleDaysThreshold &&
        doc.status !== 'Completed / Liquidated' &&
        doc.status !== 'Cancelled'
      ) {
        list.push({
          id: `alert-stale-${doc.id}`,
          type: 'STALE_UPDATE',
          title: `Stale Document: ${doc.controlNo}`,
          message: `Document "${doc.documentName}" has not received an update in ${diffDays} days (threshold: ${staleDaysThreshold}d).`,
          severity: diffDays >= staleDaysThreshold * 2 ? 'critical' : 'warning',
          documentId: doc.id,
          documentControlNo: doc.controlNo,
          documentName: doc.documentName,
          daysWithoutUpdate: diffDays,
          amount: doc.amount,
          createdAt: new Date().toISOString(),
        });
      }

      // 2. High Value Requisition Alert (> ₱1,000,000)
      if (doc.amount >= 1000000 && doc.status === 'Draft') {
        list.push({
          id: `alert-val-${doc.id}`,
          type: 'HIGH_VALUE',
          title: `High-Value Draft Requisition: ${doc.controlNo}`,
          message: `Requisition valued at ₱${doc.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} requires executive BAC review.`,
          severity: 'warning',
          documentId: doc.id,
          documentControlNo: doc.controlNo,
          documentName: doc.documentName,
          amount: doc.amount,
          createdAt: new Date().toISOString(),
        });
      }

      // 3. Unassigned Staff Alert
      if (!doc.assignedStaff || doc.assignedStaff.trim() === '') {
        list.push({
          id: `alert-staff-${doc.id}`,
          type: 'UNASSIGNED_STAFF',
          title: `Unassigned Handler: ${doc.controlNo}`,
          message: `Document "${doc.documentName}" currently has no designated staff handler assigned.`,
          severity: 'info',
          documentId: doc.id,
          documentControlNo: doc.controlNo,
          documentName: doc.documentName,
          createdAt: new Date().toISOString(),
        });
      }
    });

    return list.sort((a, b) => {
      const rank = { critical: 1, warning: 2, info: 3 };
      return rank[a.severity] - rank[b.severity];
    });
  }, [documents, staleDaysThreshold]);

  // Filtered Documents Calculation
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search
      if (filterState.searchQuery) {
        const q = filterState.searchQuery.toLowerCase();
        const matchesStandard =
          doc.controlNo.toLowerCase().includes(q) ||
          doc.documentName.toLowerCase().includes(q) ||
          doc.description.toLowerCase().includes(q) ||
          doc.documentType.toLowerCase().includes(q) ||
          doc.sourceOfFunds.toLowerCase().includes(q) ||
          doc.assignedStaff.toLowerCase().includes(q) ||
          doc.status.toLowerCase().includes(q) ||
          (doc.latestUpdateNotes || '').toLowerCase().includes(q);

        // Check update logs
        const matchesLogs = doc.updateLogs
          ? doc.updateLogs.some((l) => l.notes.toLowerCase().includes(q) || (l.userName || '').toLowerCase().includes(q))
          : false;

        // Check sub-documents
        const matchesSubDocs = doc.subDocuments
          ? doc.subDocuments.some(
              (s) =>
                s.documentName.toLowerCase().includes(q) ||
                s.controlNo.toLowerCase().includes(q) ||
                (s.description || '').toLowerCase().includes(q) ||
                (s.notes || '').toLowerCase().includes(q)
            )
          : false;

        // Check custom field values
        const matchesCustom = doc.customFields
          ? Object.values(doc.customFields).some((val) =>
              String(val || '').toLowerCase().includes(q)
            )
          : false;

        if (!matchesStandard && !matchesCustom && !matchesLogs && !matchesSubDocs) return false;
      }

      // Document Type
      if (filterState.documentType !== 'ALL' && doc.documentType !== filterState.documentType) {
        return false;
      }

      // Fund Source
      if (filterState.sourceOfFunds !== 'ALL' && doc.sourceOfFunds !== filterState.sourceOfFunds) {
        return false;
      }

      // Division / Section
      if (filterState.divisionSection !== 'ALL' && doc.divisionSection !== filterState.divisionSection) {
        return false;
      }

      // Status
      if (filterState.status !== 'ALL' && doc.status !== filterState.status) {
        return false;
      }

      // Assigned Staff
      if (filterState.assignedStaff !== 'ALL' && doc.assignedStaff !== filterState.assignedStaff) {
        return false;
      }

      // Amount Min/Max
      if (filterState.minAmount !== undefined && doc.amount < filterState.minAmount) {
        return false;
      }
      if (filterState.maxAmount !== undefined && doc.amount > filterState.maxAmount) {
        return false;
      }

      // Date Range Filter
      if (filterState.dateRange !== 'ALL') {
        const docDate = new Date(doc.inputDate);
        const now = new Date();
        if (filterState.dateRange === 'TODAY') {
          const isToday = docDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (filterState.dateRange === 'THIS_WEEK') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (docDate < weekAgo) return false;
        } else if (filterState.dateRange === 'THIS_MONTH') {
          const isSameMonth = docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
          if (!isSameMonth) return false;
        } else if (filterState.dateRange === 'THIS_YEAR') {
          const isSameYear = docDate.getFullYear() === now.getFullYear();
          if (!isSameYear) return false;
        }
      }

      return true;
    });
  }, [documents, filterState]);

  // Aggregate Metrics
  const totalDocuments = documents.length;

  const totalAmount = useMemo(() => {
    return documents
      .filter((d) => isSpendContributor(d))
      .reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [documents]);

  const totalSpendDocsCount = useMemo(() => {
    return documents.filter((d) => isSpendContributor(d)).length;
  }, [documents]);

  const totalObrCount = useMemo(() => {
    return documents.filter((d) => isObrDocument(d.documentType)).length;
  }, [documents]);

  const totalAllDocsAmount = useMemo(() => {
    return documents.reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [documents]);

  const activeDocumentsCount = useMemo(
    () => documents.filter((d) => d.status !== 'Completed / Liquidated' && d.status !== 'Cancelled').length,
    [documents]
  );
  const completedCount = useMemo(
    () => documents.filter((d) => d.status === 'Completed / Liquidated').length,
    [documents]
  );
  const bacProcessingCount = useMemo(
    () => documents.filter((d) => d.status === 'BAC Processing' || d.status === 'Under Review').length,
    [documents]
  );
  const staleDocumentsCount = useMemo(
    () => alerts.filter((a) => a.type === 'STALE_UPDATE').length,
    [alerts]
  );

  // Modal Handlers
  const openNewDocumentModal = () => {
    setEditingDocument(null);
    setIsDocModalOpen(true);
  };

  const openEditDocumentModal = (doc: ProcurementDocument) => {
    setEditingDocument(doc);
    setIsDocModalOpen(true);
  };

  const closeDocModal = () => {
    setIsDocModalOpen(false);
    setEditingDocument(null);
  };

  const openDetailDrawer = (doc: ProcurementDocument) => {
    setSelectedDocument(doc);
    setIsDetailDrawerOpen(true);
  };

  const closeDetailDrawer = () => {
    setIsDetailDrawerOpen(false);
    setSelectedDocument(null);
  };

  // Sub-Document Modal Handlers
  const openNewSubDocModal = (parentDoc: ProcurementDocument) => {
    setSubDocParentDoc(parentDoc);
    setEditingSubDocument(null);
    setIsSubDocModalOpen(true);
  };

  const openEditSubDocModal = (parentDoc: ProcurementDocument, subDoc: ProcurementSubDocument) => {
    setSubDocParentDoc(parentDoc);
    setEditingSubDocument(subDoc);
    setIsSubDocModalOpen(true);
  };

  const closeSubDocModal = () => {
    setIsSubDocModalOpen(false);
    setSubDocParentDoc(null);
    setEditingSubDocument(null);
  };

  // Document Operations
  const addDocument = async (docData: Omit<ProcurementDocument, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => {
    const id = generateUuid();
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];
    const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const initialUpdateLog: DocumentUpdateLog = {
      id: generateUuid(),
      date: docData.documentUpdate || today,
      time: currentTimeStr,
      timestamp: nowIso,
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Staff User',
      userRole: currentRole?.name || currentUser?.roleName || 'Staff',
      status: docData.status,
      notes: docData.latestUpdateNotes || `Document registered with initial status: ${docData.status}`,
      createdAt: nowIso,
    };

    const sortedLogs = sortUpdateLogsDescending(
      docData.updateLogs && docData.updateLogs.length > 0 ? docData.updateLogs : [initialUpdateLog]
    );

    const latest = sortedLogs[0];

    const newDoc: ProcurementDocument = {
      ...docData,
      id,
      documentUpdate: latest ? latest.date : (docData.documentUpdate || today),
      latestUpdateNotes: latest ? latest.notes : (docData.latestUpdateNotes || initialUpdateLog.notes),
      updateLogs: sortedLogs,
      subDocuments: docData.subDocuments || [],
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [
        {
          id: generateUuid(),
          timestamp: nowIso,
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'System User',
          action: 'Document Registered',
          details: `Document "${docData.controlNo}" added to Procurement Tracker with amount ₱${(docData.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
          newStatus: docData.status,
        },
      ],
    };

    // Optimistic Update
    setDocuments((prev) => [newDoc, ...prev]);
    addAuditLog('PROCUREMENT_DOC_CREATED', `Registered procurement document ${newDoc.controlNo}: ${newDoc.documentName}`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbInsertProcurementDocument(newDoc);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase insert failed:', err);
    }

    return { success: true, id };
  };

  const updateDocument = async (id: string, updates: Partial<ProcurementDocument>) => {
    const nowIso = new Date().toISOString();

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          const historyEntry = {
            id: generateUuid(),
            timestamp: nowIso,
            userId: currentUser?.id || 'unknown',
            userName: currentUser?.name || 'System User',
            action: updates.status && updates.status !== doc.status ? 'Status Updated' : 'Document Modified',
            details: updates.status && updates.status !== doc.status
              ? `Status changed from "${doc.status}" to "${updates.status}"`
              : `Document record fields updated`,
            previousStatus: doc.status,
            newStatus: updates.status || doc.status,
          };

          const merged = {
            ...doc,
            ...updates,
            updateLogs: updates.updateLogs ? sortUpdateLogsDescending(updates.updateLogs) : doc.updateLogs,
            subDocuments: updates.subDocuments !== undefined ? updates.subDocuments : doc.subDocuments,
            updatedAt: nowIso,
            history: [historyEntry, ...(doc.history || [])],
          };

          if (selectedDocument?.id === id) {
            setSelectedDocument(merged);
          }

          return merged;
        }
        return doc;
      })
    );

    addAuditLog('PROCUREMENT_DOC_UPDATED', `Updated procurement document ID ${id}`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbUpdateProcurementDocument(id, updates);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase update failed:', err);
    }

    return { success: true };
  };

  const deleteDocument = async (id: string) => {
    const docToDelete = documents.find((d) => d.id === id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocument?.id === id) {
      closeDetailDrawer();
    }
    if (docToDelete) {
      addAuditLog('PROCUREMENT_DOC_DELETED', `Deleted procurement document ${docToDelete.controlNo}: ${docToDelete.documentName}`, 'warning');
    }
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbDeleteProcurementDocument(id);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase delete failed:', err);
    }

    return { success: true };
  };

  const duplicateDocument = async (id: string) => {
    const target = documents.find((d) => d.id === id);
    if (!target) return { success: false };

    const newId = generateUuid();
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const copy: ProcurementDocument = {
      ...target,
      id: newId,
      controlNo: `${target.controlNo}-COPY`,
      documentName: `${target.documentName} (Copy)`,
      inputDate: today,
      documentUpdate: today,
      latestUpdateNotes: `Cloned from ${target.controlNo}`,
      updateLogs: [
        {
          id: generateUuid(),
          date: today,
          time: timeStr,
          timestamp: nowIso,
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'Staff User',
          userRole: currentRole?.name || currentUser?.roleName || 'Staff',
          status: target.status,
          notes: `Cloned from ${target.controlNo}`,
          createdAt: nowIso,
        },
      ],
      subDocuments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [
        {
          id: generateUuid(),
          timestamp: nowIso,
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'System User',
          action: 'Document Duplicated',
          details: `Duplicated from existing document "${target.controlNo}"`,
          newStatus: target.status,
        },
      ],
    };

    setDocuments((prev) => [copy, ...prev]);
    addAuditLog('PROCUREMENT_DOC_DUPLICATED', `Duplicated document ${target.controlNo} as ${copy.controlNo}`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbInsertProcurementDocument(copy);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase duplicate insert failed:', err);
    }

    return { success: true, newId };
  };

  // Sub-Document Operations
  const addSubDocument = async (
    parentDocId: string,
    subDocData: Omit<ProcurementSubDocument, 'id' | 'parentDocumentId' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = generateUuid();
    const nowIso = new Date().toISOString();

    const newSubDoc: ProcurementSubDocument = {
      ...subDocData,
      id,
      parentDocumentId: parentDocId,
      uploadedBy: subDocData.uploadedBy || currentUser?.name || 'Staff User',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === parentDocId) {
          const subList = [...(doc.subDocuments || []), newSubDoc];
          const updatedDoc = {
            ...doc,
            subDocuments: subList,
            updatedAt: nowIso,
            history: [
              {
                id: generateUuid(),
                timestamp: nowIso,
                userId: currentUser?.id || 'unknown',
                userName: currentUser?.name || 'System User',
                action: 'Sub-Document Attached',
                details: `Attached sub-document "${newSubDoc.controlNo}: ${newSubDoc.documentName}" (${newSubDoc.documentType})`,
                newStatus: doc.status,
              },
              ...(doc.history || []),
            ],
          };

          if (selectedDocument?.id === parentDocId) {
            setSelectedDocument(updatedDoc);
          }

          return updatedDoc;
        }
        return doc;
      })
    );

    addAuditLog('PROCUREMENT_SUBDOC_ATTACHED', `Attached sub-doc ${newSubDoc.controlNo} to doc ID ${parentDocId}`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbInsertSubDocument(parentDocId, newSubDoc);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase sub-document insert failed:', err);
    }

    return { success: true, id };
  };

  const updateSubDocument = async (
    parentDocId: string,
    subDocId: string,
    updates: Partial<ProcurementSubDocument>
  ) => {
    const nowIso = new Date().toISOString();

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === parentDocId) {
          const updatedSubDocs = (doc.subDocuments || []).map((s) =>
            s.id === subDocId ? { ...s, ...updates, updatedAt: nowIso } : s
          );
          const updatedDoc = {
            ...doc,
            subDocuments: updatedSubDocs,
            updatedAt: nowIso,
          };

          if (selectedDocument?.id === parentDocId) {
            setSelectedDocument(updatedDoc);
          }

          return updatedDoc;
        }
        return doc;
      })
    );

    addAuditLog('PROCUREMENT_SUBDOC_UPDATED', `Updated sub-document ID ${subDocId}`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbUpdateSubDocument(subDocId, updates);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase sub-document update failed:', err);
    }

    return { success: true };
  };

  const deleteSubDocument = async (parentDocId: string, subDocId: string) => {
    const nowIso = new Date().toISOString();

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === parentDocId) {
          const filteredSubDocs = (doc.subDocuments || []).filter((s) => s.id !== subDocId);
          const updatedDoc = {
            ...doc,
            subDocuments: filteredSubDocs,
            updatedAt: nowIso,
          };

          if (selectedDocument?.id === parentDocId) {
            setSelectedDocument(updatedDoc);
          }

          return updatedDoc;
        }
        return doc;
      })
    );

    addAuditLog('PROCUREMENT_SUBDOC_DELETED', `Deleted sub-document ID ${subDocId}`, 'warning');
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbDeleteSubDocument(subDocId);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase sub-document delete failed:', err);
    }

    return { success: true };
  };

  // Document Update Logs Operations
  const addDocumentUpdateLog = async (
    documentId: string,
    logData: {
      date: string;
      time?: string;
      notes: string;
      status?: ProcurementStatus;
      stageOrMilestone?: string;
    }
  ) => {
    const id = generateUuid();
    const nowIso = new Date().toISOString();
    const currentTimeStr =
      logData.time ||
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newLog: DocumentUpdateLog = {
      id,
      date: logData.date || nowIso.split('T')[0],
      time: currentTimeStr,
      timestamp: nowIso,
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Staff User',
      userRole: currentRole?.name || currentUser?.roleName || 'Staff',
      status: logData.status,
      notes: logData.notes,
      stageOrMilestone: logData.stageOrMilestone,
      createdAt: nowIso,
    };

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === documentId) {
          const existingLogs = doc.updateLogs || [];
          const updatedLogs = sortUpdateLogsDescending([newLog, ...existingLogs]);
          const latest = updatedLogs[0];

          const updatedDoc = {
            ...doc,
            documentUpdate: latest.date,
            latestUpdateNotes: latest.notes,
            status: logData.status || doc.status,
            updateLogs: updatedLogs,
            updatedAt: nowIso,
            history: [
              {
                id: generateUuid(),
                timestamp: nowIso,
                userId: currentUser?.id || 'unknown',
                userName: currentUser?.name || 'Staff User',
                action: 'Update Log Added',
                details: `Logged update at ${latest.date} ${latest.time || ''}: "${logData.notes.substring(0, 80)}" (Status: ${logData.status || doc.status})`,
                previousStatus: doc.status,
                newStatus: logData.status || doc.status,
              },
              ...(doc.history || []),
            ],
          };

          if (selectedDocument?.id === documentId) {
            setSelectedDocument(updatedDoc);
          }

          return updatedDoc;
        }
        return doc;
      })
    );

    addAuditLog('PROCUREMENT_LOG_ADDED', `Added document update log to doc ID ${documentId}`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbInsertUpdateLog({
        ...newLog,
        documentId,
      });
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase update log insert failed:', err);
    }

    return { success: true, logId: id };
  };

  const updateDocumentUpdateLog = async (
    documentId: string,
    logId: string,
    logUpdates: Partial<DocumentUpdateLog>
  ) => {
    const nowIso = new Date().toISOString();

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === documentId) {
          const updatedLogs = sortUpdateLogsDescending(
            (doc.updateLogs || []).map((l) =>
              l.id === logId
                ? {
                    ...l,
                    ...logUpdates,
                    updatedAt: nowIso,
                    updatedBy: currentUser?.name || 'Admin',
                  }
                : l
            )
          );

          const latest = updatedLogs[0];
          const updatedDoc = {
            ...doc,
            documentUpdate: latest ? latest.date : doc.documentUpdate,
            latestUpdateNotes: latest ? latest.notes : doc.latestUpdateNotes,
            status: latest?.status || doc.status,
            updateLogs: updatedLogs,
            updatedAt: nowIso,
          };

          if (selectedDocument?.id === documentId) {
            setSelectedDocument(updatedDoc);
          }

          return updatedDoc;
        }
        return doc;
      })
    );

    addAuditLog('PROCUREMENT_LOG_EDITED', `Admin edited previous update log ID ${logId}`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbUpdateUpdateLog(logId, logUpdates);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase update log update failed:', err);
    }

    return { success: true };
  };

  const deleteDocumentUpdateLog = async (documentId: string, logId: string) => {
    const nowIso = new Date().toISOString();

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === documentId) {
          const filteredLogs = sortUpdateLogsDescending((doc.updateLogs || []).filter((l) => l.id !== logId));
          const latest = filteredLogs[0];
          const updatedDoc = {
            ...doc,
            documentUpdate: latest ? latest.date : doc.inputDate,
            latestUpdateNotes: latest ? latest.notes : '',
            updateLogs: filteredLogs,
            updatedAt: nowIso,
          };

          if (selectedDocument?.id === documentId) {
            setSelectedDocument(updatedDoc);
          }

          return updatedDoc;
        }
        return doc;
      })
    );

    addAuditLog('PROCUREMENT_LOG_DELETED', `Admin deleted update log ID ${logId}`, 'warning');
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbDeleteUpdateLog(logId);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase update log delete failed:', err);
    }

    return { success: true };
  };

  // Custom Fields Operations
  const addCustomField = async (fieldData: Omit<ProcurementCustomField, 'id' | 'createdAt'>) => {
    const id = generateUuid();
    const newField: ProcurementCustomField = {
      ...fieldData,
      id,
      createdAt: new Date().toISOString(),
      order: customFields.length + 1,
    };

    setCustomFields((prev) => [...prev, newField]);
    addAuditLog('PROCUREMENT_FIELD_ADDED', `Added custom field "${newField.name}" (${newField.type}) to Procurement Tracker`);
    audioService.playSuccessSound();

    // Supabase DB Sync
    try {
      await dbSaveCustomField(newField);
    } catch (err: any) {
      console.error('[ProcurementContext] Supabase custom field insert failed:', err);
    }

    return { success: true };
  };

  const updateCustomField = async (id: string, updates: Partial<ProcurementCustomField>) => {
    let updatedField: ProcurementCustomField | undefined;
    setCustomFields((prev) =>
      prev.map((field) => {
        if (field.id === id) {
          updatedField = { ...field, ...updates };
          return updatedField;
        }
        return field;
      })
    );
    addAuditLog('PROCUREMENT_FIELD_UPDATED', `Modified custom field ID ${id}`);
    audioService.playSuccessSound();

    if (updatedField) {
      try {
        await dbSaveCustomField(updatedField);
      } catch (err: any) {
        console.error('[ProcurementContext] Supabase custom field update failed:', err);
      }
    }

    return { success: true };
  };

  const deleteCustomField = async (id: string) => {
    const fieldToDelete = customFields.find((f) => f.id === id);
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
    if (fieldToDelete) {
      addAuditLog('PROCUREMENT_FIELD_DELETED', `Deleted custom field "${fieldToDelete.name}"`, 'warning');
      try {
        await dbDeleteCustomField(fieldToDelete.key);
      } catch (err: any) {
        console.error('[ProcurementContext] Supabase custom field delete failed:', err);
      }
    }
    audioService.playSuccessSound();
    return { success: true };
  };

  const reorderCustomFields = (fields: ProcurementCustomField[]) => {
    const reindexed = fields.map((f, index) => ({ ...f, order: index + 1 }));
    setCustomFields(reindexed);
    reindexed.forEach((f) => {
      dbSaveCustomField(f).catch(() => {});
    });
  };

  // Document Types List Operations
  const addDocumentType = (newType: string) => {
    const trimmed = newType.trim();
    if (!trimmed || documentTypes.includes(trimmed)) return;
    const next = [...documentTypes, trimmed];
    setDocumentTypes(next);
    addAuditLog('PROCUREMENT_DOCTYPE_ADDED', `Added document type: "${trimmed}"`);
    dbSaveDocumentType(trimmed, next.length).catch(() => {});
  };

  const deleteDocumentType = (typeToDelete: string) => {
    setDocumentTypes((prev) => prev.filter((t) => t !== typeToDelete));
    addAuditLog('PROCUREMENT_DOCTYPE_DELETED', `Deleted document type: "${typeToDelete}"`, 'warning');
    dbDeleteDocumentType(typeToDelete).catch(() => {});
  };

  // Source of Funds CRUD (Admin Customizable)
  const addFundSource = (newSource: string) => {
    const trimmed = newSource.trim();
    if (!trimmed || fundSources.includes(trimmed)) return;
    const next = [...fundSources, trimmed];
    setFundSources(next);
    addAuditLog('PROCUREMENT_FUNDSOURCE_ADDED', `Added funding source: "${trimmed}"`);
    audioService.playSuccessSound();
    dbSaveFundSource(trimmed, isTrustFundSource(trimmed), next.length).catch(() => {});
  };

  const updateFundSource = (oldSource: string, newSource: string) => {
    const trimmed = newSource.trim();
    if (!trimmed || trimmed === oldSource) return;

    setFundSources((prev) => prev.map((s) => (s === oldSource ? trimmed : s)));
    setDocuments((prev) =>
      prev.map((d) => (d.sourceOfFunds === oldSource ? { ...d, sourceOfFunds: trimmed } : d))
    );
    addAuditLog('PROCUREMENT_FUNDSOURCE_UPDATED', `Renamed fund source "${oldSource}" to "${trimmed}"`);
    audioService.playSuccessSound();
    dbSaveFundSource(trimmed, isTrustFundSource(trimmed), 0).catch(() => {});
    dbDeleteFundSource(oldSource).catch(() => {});
  };

  const deleteFundSource = (sourceToDelete: string) => {
    setFundSources((prev) => prev.filter((s) => s !== sourceToDelete));
    addAuditLog('PROCUREMENT_FUNDSOURCE_DELETED', `Removed fund source: "${sourceToDelete}"`, 'warning');
    audioService.playSuccessSound();
    dbDeleteFundSource(sourceToDelete).catch(() => {});
  };

  const reorderFundSources = (sources: string[]) => {
    setFundSources(sources);
    sources.forEach((s, idx) => {
      dbSaveFundSource(s, isTrustFundSource(s), idx + 1).catch(() => {});
    });
  };

  // Statuses CRUD (Admin Customizable)
  const addStatus = (newStatus: string) => {
    const trimmed = newStatus.trim();
    if (!trimmed || statuses.includes(trimmed)) return;
    const next = [...statuses, trimmed];
    setStatuses(next);
    addAuditLog('PROCUREMENT_STATUS_ADDED', `Added custom procurement status: "${trimmed}"`);
    audioService.playSuccessSound();
    dbSaveStatus(trimmed, next.length).catch(() => {});
  };

  const updateStatus = (oldStatus: string, newStatus: string) => {
    const trimmed = newStatus.trim();
    if (!trimmed || trimmed === oldStatus) return;

    setStatuses((prev) => prev.map((s) => (s === oldStatus ? trimmed : s)));
    setDocuments((prev) =>
      prev.map((d) => {
        const updatedDoc = { ...d };
        if (d.status === oldStatus) {
          updatedDoc.status = trimmed;
        }
        if (d.updateLogs) {
          updatedDoc.updateLogs = d.updateLogs.map((l) => (l.status === oldStatus ? { ...l, status: trimmed } : l));
        }
        return updatedDoc;
      })
    );
    addAuditLog('PROCUREMENT_STATUS_UPDATED', `Renamed procurement status "${oldStatus}" to "${trimmed}"`);
    audioService.playSuccessSound();
    dbSaveStatus(trimmed, 0).catch(() => {});
    dbDeleteStatus(oldStatus).catch(() => {});
  };

  const deleteStatus = (statusToDelete: string) => {
    setStatuses((prev) => prev.filter((s) => s !== statusToDelete));
    addAuditLog('PROCUREMENT_STATUS_DELETED', `Removed procurement status: "${statusToDelete}"`, 'warning');
    audioService.playSuccessSound();
    dbDeleteStatus(statusToDelete).catch(() => {});
  };

  const reorderStatuses = (statusesList: string[]) => {
    setStatuses(statusesList);
    statusesList.forEach((st, idx) => {
      dbSaveStatus(st, idx + 1).catch(() => {});
    });
  };

  // Divisions / Sections CRUD (Admin Customizable)
  const addDivisionSection = (newDivision: string) => {
    const trimmed = newDivision.trim();
    if (!trimmed || divisionSections.includes(trimmed)) return;
    const next = [...divisionSections, trimmed];
    setDivisionSections(next);
    addAuditLog('PROCUREMENT_DIVISION_ADDED', `Added division/section: "${trimmed}"`);
    audioService.playSuccessSound();
    dbSaveDivision(trimmed, next.length).catch(() => {});
  };

  const updateDivisionSection = (oldDivision: string, newDivision: string) => {
    const trimmed = newDivision.trim();
    if (!trimmed || trimmed === oldDivision) return;

    setDivisionSections((prev) => prev.map((d) => (d === oldDivision ? trimmed : d)));
    setDocuments((prev) =>
      prev.map((d) => {
        const updated = { ...d };
        if (d.divisionSection === oldDivision) {
          updated.divisionSection = trimmed;
        }
        if (d.subDocuments) {
          updated.subDocuments = d.subDocuments.map((s) =>
            s.divisionSection === oldDivision ? { ...s, divisionSection: trimmed } : s
          );
        }
        return updated;
      })
    );
    addAuditLog('PROCUREMENT_DIVISION_UPDATED', `Renamed division/section "${oldDivision}" to "${trimmed}"`);
    audioService.playSuccessSound();
    dbSaveDivision(trimmed, 0).catch(() => {});
    dbDeleteDivision(oldDivision).catch(() => {});
  };

  const deleteDivisionSection = (divisionToDelete: string) => {
    setDivisionSections((prev) => prev.filter((d) => d !== divisionToDelete));
    addAuditLog('PROCUREMENT_DIVISION_DELETED', `Removed division/section: "${divisionToDelete}"`, 'warning');
    audioService.playSuccessSound();
    dbDeleteDivision(divisionToDelete).catch(() => {});
  };

  const reorderDivisionSections = (divisionsList: string[]) => {
    setDivisionSections(divisionsList);
    divisionsList.forEach((dv, idx) => {
      dbSaveDivision(dv, idx + 1).catch(() => {});
    });
  };

  // Access Control Operations
  const grantUserAccess = (userId: string, userName: string, userEmail: string, role: ProcurementRole, notes?: string) => {
    const nowIso = new Date().toISOString();
    const entry: ProcurementUserAccess = {
      userId,
      userName,
      userEmail,
      hasAccess: true,
      role,
      grantedBy: currentUser?.name || 'Admin',
      grantedAt: nowIso,
      notes,
    };

    setUserAccessList((prev) => {
      const existingIdx = prev.findIndex((a) => a.userId === userId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = entry;
        return next;
      }
      return [...prev, entry];
    });

    addAuditLog('PROCUREMENT_ACCESS_GRANTED', `Granted ${role} authority in Procurement to ${userName} (${userEmail})`);
    audioService.playSuccessSound();
    dbUpsertUserAccess(entry).catch(() => {});
  };

  const revokeUserAccess = (userId: string) => {
    const target = userAccessList.find((a) => a.userId === userId);
    setUserAccessList((prev) => prev.filter((a) => a.userId !== userId));
    if (target) {
      addAuditLog('PROCUREMENT_ACCESS_REVOKED', `Revoked Procurement access for ${target.userName} (${target.userEmail})`, 'warning');
    }
    audioService.playSuccessSound();
    dbDeleteUserAccess(userId).catch(() => {});
  };

  const updateUserRole = (userId: string, role: ProcurementRole) => {
    let updatedAccess: ProcurementUserAccess | undefined;
    setUserAccessList((prev) =>
      prev.map((a) => {
        if (a.userId === userId) {
          updatedAccess = { ...a, role };
          return updatedAccess;
        }
        return a;
      })
    );
    addAuditLog('PROCUREMENT_ROLE_UPDATED', `Updated Procurement permission role for user ID ${userId} to "${role}"`);
    audioService.playSuccessSound();
    if (updatedAccess) {
      dbUpsertUserAccess(updatedAccess).catch(() => {});
    }
  };

  const checkUserHasAccess = (userId: string): boolean => {
    const entry = userAccessList.find((a) => a.userId === userId);
    return Boolean(entry?.hasAccess);
  };

  // Refresh & Sync to Database
  const resetToDefaultData = () => {
    refreshDocumentsFromDb();
    addAuditLog('PROCUREMENT_DATA_RESET', 'Reloaded all procurement records from Supabase cloud database.');
    audioService.playSuccessSound();
  };

  const value: ProcurementContextType = {
    documents,
    customFields,
    documentTypes,
    fundSources,
    statuses,
    divisionSections,
    userAccessList,
    staleDaysThreshold,
    setStaleDaysThreshold,
    isLoadingDocuments,
    refreshDocumentsFromDb,

    selectedDocument,
    setSelectedDocument,
    isDocModalOpen,
    setIsDocModalOpen,
    editingDocument,
    openNewDocumentModal,
    openEditDocumentModal,
    closeDocModal,
    isDetailDrawerOpen,
    setIsDetailDrawerOpen,
    openDetailDrawer,
    closeDetailDrawer,
    isCustomFieldsModalOpen,
    setIsCustomFieldsModalOpen,
    isUserAccessModalOpen,
    setIsUserAccessModalOpen,
    isWorkflowModalOpen,
    setIsWorkflowModalOpen,

    subDocParentDoc,
    editingSubDocument,
    isSubDocModalOpen,
    setIsSubDocModalOpen,
    openNewSubDocModal,
    openEditSubDocModal,
    closeSubDocModal,

    viewingPdf,
    openPdfViewer,
    closePdfViewer,

    activeSubTab,
    setActiveSubTab,

    filterState,
    setFilterState,
    resetFilters: () =>
      setFilterState({
        searchQuery: '',
        documentType: 'ALL',
        sourceOfFunds: 'ALL',
        divisionSection: 'ALL',
        status: 'ALL',
        assignedStaff: 'ALL',
        dateRange: 'ALL',
      }),
    filteredDocuments,

    totalDocuments,
    totalAmount,
    totalSpendDocsCount,
    totalObrCount,
    totalAllDocsAmount,
    activeDocumentsCount,
    completedCount,
    bacProcessingCount,
    staleDocumentsCount,
    alerts,

    hasAccess,
    isAdmin,
    currentUserProcurementRole,
    canEdit,
    canManageFields,
    canManageAccess,

    addDocument,
    updateDocument,
    deleteDocument,
    duplicateDocument,

    addSubDocument,
    updateSubDocument,
    deleteSubDocument,

    addDocumentUpdateLog,
    updateDocumentUpdateLog,
    deleteDocumentUpdateLog,

    addCustomField,
    updateCustomField,
    deleteCustomField,
    reorderCustomFields,

    addDocumentType,
    deleteDocumentType,

    addFundSource,
    updateFundSource,
    deleteFundSource,
    reorderFundSources,

    addStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,

    addDivisionSection,
    updateDivisionSection,
    deleteDivisionSection,
    reorderDivisionSections,

    grantUserAccess,
    revokeUserAccess,
    updateUserRole,
    checkUserHasAccess,

    resetToDefaultData,
  };

  return <ProcurementContext.Provider value={value}>{children}</ProcurementContext.Provider>;
};

export const useProcurement = (): ProcurementContextType => {
  const context = useContext(ProcurementContext);
  if (!context) {
    throw new Error('useProcurement must be used within a ProcurementProvider');
  }
  return context;
};
