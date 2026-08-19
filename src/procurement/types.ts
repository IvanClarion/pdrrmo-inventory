// Procurement Documents Tracker Types

export type ProcurementDocumentType =
  | 'Obligation Request (OBR)'
  | 'Purchase Request (PR)'
  | 'Purchase Order (PO)'
  | 'Notice of Award (NOA)'
  | 'Notice to Proceed (NTP)'
  | 'Contract Agreement'
  | 'Disbursement Voucher (DV)'
  | 'Inspection & Acceptance (IAR)'
  | 'Bidding Documents'
  | 'Resolution / BAC'
  | 'Canvass / Quotation'
  | 'Other Document'
  | (string & {});

export type ProcurementFundSource =
  | 'General Fund (GF)'
  | 'DRRM Special Trust Fund (DRRM-STF)'
  | 'Quick Response Fund (QRF)'
  | 'National Calamity Fund (NDRRMF)'
  | 'Local Disaster Risk Reduction Fund (LDRRMF)'
  | 'Special Education Fund (SEF)'
  | 'External Grant / Donation'
  | 'Supplemental Budget'
  | (string & {});

export type ProcurementStatus =
  | 'Draft'
  | 'Under Review'
  | 'BAC Processing'
  | 'Approved'
  | 'Procurement Ongoing'
  | 'Delivered / For Inspection'
  | 'Completed / Liquidated'
  | 'On Hold'
  | 'Cancelled'
  | (string & {});

// Helper function to identify Obligation Request (OBR) documents
export const isObrDocument = (docType?: string | null): boolean => {
  if (!docType) return false;
  const t = docType.trim().toLowerCase();
  return (
    t === 'obligation request (obr)' ||
    t === 'obligation request' ||
    t === 'obr' ||
    t.includes('(obr)') ||
    t.includes('obligation request')
  );
};

// Helper function to identify Trust Fund sources (e.g. DRRM Special Trust Fund, DRRM-STF, Trust Fund)
export const isTrustFundSource = (fundSource?: string | null): boolean => {
  if (!fundSource) return false;
  const s = fundSource.trim().toLowerCase();
  return (
    s.includes('trust fund') ||
    s.includes('trust-fund') ||
    s.includes('trust_fund') ||
    s.includes('drrm-stf') ||
    s.includes('(stf)') ||
    s.includes('stf')
  );
};

// Helper function to identify Purchase Request (PR) documents
export const isPrDocument = (docType?: string | null): boolean => {
  if (!docType) return false;
  const t = docType.trim().toLowerCase();
  return (
    t === 'purchase request (pr)' ||
    t === 'purchase request' ||
    t === 'pr' ||
    t.includes('(pr)') ||
    t.includes('purchase request')
  );
};

// Rule: A document contributes to Total Value and Procurement Spend if:
// 1. It is an Obligation Request (OBR), OR
// 2. It is a Purchase Request (PR) AND its Source of Fund is a Trust Fund (e.g. DRRM-STF)
export const isSpendContributor = (doc: {
  documentType?: string | null;
  sourceOfFunds?: string | null;
}): boolean => {
  if (isObrDocument(doc.documentType)) {
    return true;
  }
  if (isPrDocument(doc.documentType) && isTrustFundSource(doc.sourceOfFunds)) {
    return true;
  }
  return false;
};

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'currency'
  | 'textarea'
  | 'boolean';

export interface ProcurementCustomField {
  id: string;
  name: string;
  key: string;
  type: CustomFieldType;
  description?: string;
  placeholder?: string;
  options?: string[]; // For 'select' fields
  required?: boolean;
  defaultValue?: any;
  isDisplayedInTable?: boolean;
  order: number;
  createdAt: string;
}

export interface DocumentUpdateLog {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm or HH:mm A
  timestamp: string; // ISO timestamp
  userId: string;
  userName: string;
  userRole?: string;
  status?: ProcurementStatus;
  notes: string; // Update progress log narrative / action taken
  stageOrMilestone?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ProcurementAttachment {
  id: string;
  fileName: string;
  fileSize: string; // e.g. "1.8 MB"
  fileType: string; // e.g. "application/pdf"
  fileData: string; // base64 data URL
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export interface ProcurementSubDocument {
  id: string;
  parentDocumentId: string;
  controlNo: string; // Document Control No. (e.g. PDRRMO-BAC-2026-088)
  documentName: string; // Document Name / Title
  description: string; // Description & Purpose
  documentType: ProcurementDocumentType | string; // Type of Document
  amount: number; // Amount in PHP (₱)
  sourceOfFunds: ProcurementFundSource | string; // Source of Funds
  divisionSection?: string; // Requesting / Responsible Division or Section
  inputDate: string; // Input Date (YYYY-MM-DD)
  documentUpdate: string; // Last Update Date (YYYY-MM-DD)
  latestUpdateNotes?: string; // Latest update log narrative
  updateLogs?: DocumentUpdateLog[]; // Chronological log of updates with Date & Time
  assignedStaff: string; // Assigned Staff Name
  assignedStaffId?: string;
  assignedStaffEmail?: string;
  status: ProcurementStatus; // Status (e.g. Approved, Signed, Under Review)
  notes?: string; // Remarks / General Notes
  customFields?: Record<string, any>; // Dynamic values for admin-defined fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string; // base64 data URL
  attachments?: ProcurementAttachment[];
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  previousStatus?: ProcurementStatus;
  newStatus?: ProcurementStatus;
}

export interface ProcurementDocument {
  id: string;
  controlNo: string; // Document Control No. (e.g. DOC-2026-001)
  documentName: string; // Document Name
  description: string; // Description
  documentType: ProcurementDocumentType | string; // Type of Document
  amount: number; // Amount in PHP (₱)
  sourceOfFunds: ProcurementFundSource | string; // Source of Funds
  divisionSection?: string; // Requesting / Responsible Division or Section
  inputDate: string; // Input Date (YYYY-MM-DD)
  documentUpdate: string; // Document Update / Last status update date (YYYY-MM-DD)
  latestUpdateNotes?: string; // Latest update log narrative summary
  updateLogs?: DocumentUpdateLog[]; // Chronological log of document updates (Date & Time)
  subDocuments?: ProcurementSubDocument[]; // Linked sub-documents
  assignedStaff: string; // Assigned Staff Name or ID
  assignedStaffId?: string;
  assignedStaffEmail?: string;
  status: ProcurementStatus;
  supplierName?: string;
  bacResolutionNo?: string;
  targetCompletionDate?: string;
  notes?: string;
  attachmentsCount?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string; // base64 data URL for primary PDF
  attachments?: ProcurementAttachment[];
  customFields?: Record<string, any>; // Dynamic values for admin-defined fields
  history?: DocumentHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type ProcurementRole = 'Procurement Admin' | 'Procurement Officer' | 'Procurement Staff / Viewer';

export interface ProcurementUserAccess {
  userId: string;
  userName: string;
  userEmail: string;
  hasAccess: boolean;
  role: ProcurementRole;
  grantedBy: string;
  grantedAt: string;
  notes?: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface ProcurementAlert {
  id: string;
  type: 'STALE_UPDATE' | 'HIGH_VALUE' | 'UNASSIGNED_STAFF' | 'DEADLINE_APPROACHING';
  title: string;
  message: string;
  severity: AlertSeverity;
  documentId: string;
  documentControlNo: string;
  documentName: string;
  daysWithoutUpdate?: number;
  amount?: number;
  createdAt: string;
}

export interface ProcurementFilterState {
  searchQuery: string;
  documentType: string;
  sourceOfFunds: string;
  divisionSection: string;
  status: string;
  assignedStaff: string;
  dateRange: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR';
  minAmount?: number;
  maxAmount?: number;
}
