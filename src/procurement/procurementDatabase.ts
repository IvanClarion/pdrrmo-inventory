import { getSupabase, isSupabaseConfigured, compressImage } from '../lib/supabase';
import {
  ProcurementDocument,
  ProcurementSubDocument,
  DocumentUpdateLog,
  DocumentHistoryEntry,
  ProcurementCustomField,
  ProcurementUserAccess,
  ProcurementAttachment,
} from './types';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Ensure valid UUID format for PostgreSQL UUID columns
export function ensureValidUuid(id?: string | null): string {
  if (!id) return generateUuid();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  return generateUuid();
}

// ============================================================================
// STORAGE: Upload Document & PDF Files to Supabase Bucket 'document_files'
// ============================================================================

export interface UploadDocumentResult {
  publicUrl: string;
  fileName: string;
  fileSize: string;
  fileType: string;
}

/**
 * Upload a document file (PDF or Image) to Supabase Storage Bucket 'document_files'
 * If the file is an image scan, it is automatically compressed before upload.
 */
export async function uploadProcurementDocumentFile(
  file: File | Blob,
  fileNameHint?: string
): Promise<UploadDocumentResult> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const rawName = (file instanceof File ? file.name : fileNameHint || 'document.pdf');
  const fileExt = rawName.split('.').pop()?.toLowerCase() || 'pdf';
  const cleanBaseName = rawName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 40);

  const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) || (file.type && file.type.startsWith('image/'));

  let fileToUpload: File | Blob = file;
  let finalExtension = fileExt;
  let finalContentType = file.type || (fileExt === 'pdf' ? 'application/pdf' : 'application/octet-stream');

  // Client-side image compression for scanned vouchers/receipts
  if (isImage) {
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
        format: 'image/webp',
      });
      fileToUpload = compressed.blob;
      finalExtension = compressed.extension || 'webp';
      finalContentType = compressed.format || 'image/webp';
    } catch (compressErr) {
      console.warn('Image compression warning (using original):', compressErr);
    }
  }

  const timestamp = Date.now();
  const filePath = `documents/${timestamp}_${cleanBaseName}.${finalExtension}`;

  const { error: uploadError } = await client.storage
    .from('document_files')
    .upload(filePath, fileToUpload, {
      cacheControl: '31536000',
      upsert: true,
      contentType: finalContentType,
    });

  if (uploadError) {
    console.error('❌ Error uploading to document_files bucket:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = client.storage
    .from('document_files')
    .getPublicUrl(filePath);

  const finalSize = fileToUpload.size;
  const sizeFormatted =
    finalSize < 1024 * 1024
      ? `${(finalSize / 1024).toFixed(1)} KB`
      : `${(finalSize / (1024 * 1024)).toFixed(2)} MB`;

  return {
    publicUrl: urlData.publicUrl,
    fileName: `${cleanBaseName}.${finalExtension}`,
    fileSize: sizeFormatted,
    fileType: finalContentType,
  };
}

// ============================================================================
// LOOKUPS & WORKFLOW CONFIGURATION
// ============================================================================

export async function fetchFundSourcesFromDb(): Promise<string[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('procurement_fund_sources')
      .select('name')
      .order('sort_order', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data.map((d) => d.name);
  } catch {
    return [];
  }
}

export async function fetchDivisionsFromDb(): Promise<string[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('procurement_divisions')
      .select('name')
      .order('sort_order', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data.map((d) => d.name);
  } catch {
    return [];
  }
}

export async function fetchDocumentTypesFromDb(): Promise<string[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('procurement_document_types')
      .select('name')
      .order('sort_order', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data.map((d) => d.name);
  } catch {
    return [];
  }
}

export async function fetchStatusesFromDb(): Promise<string[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('procurement_statuses')
      .select('name')
      .order('sort_order', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data.map((d) => d.name);
  } catch {
    return [];
  }
}

export async function fetchCustomFieldsFromDb(): Promise<ProcurementCustomField[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('procurement_custom_field_definitions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((r) => ({
      id: r.id,
      name: r.name,
      key: r.field_key,
      type: r.field_type,
      description: r.description || undefined,
      placeholder: r.placeholder || undefined,
      options: Array.isArray(r.options) ? r.options : undefined,
      required: Boolean(r.is_required),
      defaultValue: r.default_value,
      isDisplayedInTable: r.is_displayed_in_table !== false,
      order: r.sort_order ?? 0,
      createdAt: r.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchUserAccessListFromDb(): Promise<ProcurementUserAccess[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('procurement_user_access')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((r) => ({
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      hasAccess: Boolean(r.has_access),
      role: r.role,
      grantedBy: r.granted_by || 'Admin',
      grantedAt: r.granted_at || r.created_at,
      notes: r.notes || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Helper to seed standard government procurement lookups into Supabase tables if requested
 */
export async function seedStandardLookupsToDb(): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const fundSources = [
    'DRRM Special Trust Fund (DRRM-STF)',
    'Quick Response Fund (QRF)',
    'General Fund (GF)',
    'National Calamity Fund (NDRRMF)',
    'Local Disaster Risk Reduction Fund (LDRRMF)',
    'Special Education Fund (SEF)',
    'External Grant / Donation',
    'Supplemental Budget',
  ];

  const divisions = [
    'Operations & Warning Division',
    'Admin & Logistics Division',
    'Planning & Research Division',
    'Training & Community Development Division',
    'Quick Response Team / Search & Rescue (QRT-SAR)',
    'Bids and Awards Committee (BAC) Secretariat',
    'Accounting & Budget Section',
    'Executive Office of the PDRRMO Head',
  ];

  const documentTypes = [
    'Obligation Request (OBR)',
    'Purchase Request (PR)',
    'Purchase Order (PO)',
    'Notice of Award (NOA)',
    'Notice to Proceed (NTP)',
    'Contract Agreement',
    'Disbursement Voucher (DV)',
    'Inspection & Acceptance (IAR)',
    'Bidding Documents',
    'Resolution / BAC',
    'Canvass / Quotation',
    'Other Document',
  ];

  const statuses = [
    'Draft',
    'Under Review',
    'BAC Processing',
    'Approved',
    'Procurement Ongoing',
    'Delivered / For Inspection',
    'Completed / Liquidated',
    'On Hold',
    'Cancelled',
  ];

  const customFields: ProcurementCustomField[] = [
    {
      id: generateUuid(),
      name: 'BAC Resolution No.',
      key: 'bacResolutionNo',
      type: 'text',
      description: 'Bids and Awards Committee resolution reference code',
      placeholder: 'e.g. BAC-RES-2026-042',
      required: false,
      isDisplayedInTable: true,
      order: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: generateUuid(),
      name: 'Procurement Mode',
      key: 'procurementMode',
      type: 'select',
      description: 'R.A. 9184 statutory procurement method',
      options: [
        'Public Bidding',
        'Small Value Procurement (Sec 53.9)',
        'Emergency Cases (Sec 53.2)',
        'Direct Contracting (Sec 50)',
        'Negotiated Procurement (Sec 53)',
        'Repeat Order (Sec 51)',
        'Shopping (Sec 52)',
        'Agency-to-Agency',
      ],
      defaultValue: 'Small Value Procurement (Sec 53.9)',
      required: true,
      isDisplayedInTable: true,
      order: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: generateUuid(),
      name: 'Contractor / Supplier',
      key: 'contractorName',
      type: 'text',
      description: 'Awarded commercial entity or verified supplier',
      placeholder: 'e.g. Apex Safety Gear Trading Corp.',
      required: false,
      isDisplayedInTable: true,
      order: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: generateUuid(),
      name: 'Target Delivery Date',
      key: 'targetDeliveryDate',
      type: 'date',
      description: 'Contractual deadline for completion or delivery',
      required: false,
      isDisplayedInTable: true,
      order: 4,
      createdAt: new Date().toISOString(),
    },
    {
      id: generateUuid(),
      name: 'DV Tracking Number',
      key: 'dvTrackingRef',
      type: 'text',
      description: 'Provincial Accounting disbursement voucher reference',
      placeholder: 'e.g. DV-2026-08-0112',
      required: false,
      isDisplayedInTable: false,
      order: 5,
      createdAt: new Date().toISOString(),
    },
  ];

  for (let i = 0; i < fundSources.length; i++) {
    const name = fundSources[i];
    const isTrust = name.toLowerCase().includes('trust') || name.toLowerCase().includes('stf');
    await dbSaveFundSource(name, isTrust, i + 1);
  }

  for (let i = 0; i < divisions.length; i++) {
    await dbSaveDivision(divisions[i], i + 1);
  }

  for (let i = 0; i < documentTypes.length; i++) {
    await dbSaveDocumentType(documentTypes[i], i + 1);
  }

  for (let i = 0; i < statuses.length; i++) {
    await dbSaveStatus(statuses[i], i + 1);
  }

  for (const cf of customFields) {
    await dbSaveCustomField(cf);
  }
}

// ============================================================================
// WORKFLOW LOOKUP MUTATIONS
// ============================================================================

export async function dbSaveFundSource(name: string, isTrustFund = false, sortOrder = 0): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_fund_sources').upsert(
    {
      name: name.trim(),
      is_trust_fund: isTrustFund,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'name' }
  );
}

export async function dbDeleteFundSource(name: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_fund_sources').delete().eq('name', name.trim());
}

export async function dbSaveDivision(name: string, sortOrder = 0): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_divisions').upsert(
    {
      name: name.trim(),
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'name' }
  );
}

export async function dbDeleteDivision(name: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_divisions').delete().eq('name', name.trim());
}

export async function dbSaveDocumentType(name: string, sortOrder = 0): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const isObr = name.toLowerCase().includes('obr') || name.toLowerCase().includes('obligation');
  const isPr = name.toLowerCase().includes('(pr)') || name.toLowerCase().includes('purchase request');
  await client.from('procurement_document_types').upsert(
    {
      name: name.trim(),
      is_obr: isObr,
      is_pr: isPr,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'name' }
  );
}

export async function dbDeleteDocumentType(name: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_document_types').delete().eq('name', name.trim());
}

export async function dbSaveStatus(name: string, sortOrder = 0): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_statuses').upsert(
    {
      name: name.trim(),
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'name' }
  );
}

export async function dbDeleteStatus(name: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_statuses').delete().eq('name', name.trim());
}

export async function dbSaveCustomField(field: ProcurementCustomField): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_custom_field_definitions').upsert(
    {
      id: ensureValidUuid(field.id),
      name: field.name,
      field_key: field.key,
      field_type: field.type,
      description: field.description || null,
      placeholder: field.placeholder || null,
      options: field.options || null,
      is_required: field.required ?? false,
      default_value: field.defaultValue ? String(field.defaultValue) : null,
      is_displayed_in_table: field.isDisplayedInTable !== false,
      sort_order: field.order ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'field_key' }
  );
}

export async function dbDeleteCustomField(fieldKey: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_custom_field_definitions').delete().eq('field_key', fieldKey);
}

export async function dbUpsertUserAccess(access: ProcurementUserAccess): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_user_access').upsert(
    {
      user_id: access.userId,
      user_name: access.userName,
      user_email: access.userEmail,
      has_access: access.hasAccess,
      role: access.role,
      granted_by: access.grantedBy,
      notes: access.notes || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_email' }
  );
}

export async function dbDeleteUserAccess(userId: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from('procurement_user_access').delete().eq('user_id', userId);
}

// ============================================================================
// CORE DATA FETCH: Load All Procurement Documents & Relational Trees
// ============================================================================

export async function fetchProcurementDocumentsFromDb(): Promise<ProcurementDocument[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    // 1. Fetch Main Documents
    const { data: rawDocs, error: docsErr } = await client
      .from('procurement_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (docsErr) {
      console.warn('[procurementDatabase] Error fetching procurement_documents:', docsErr);
      return [];
    }

    if (!rawDocs || rawDocs.length === 0) {
      return [];
    }

    const docIds = rawDocs.map((d) => d.id);

    // 2. Fetch Sub-Documents
    const { data: rawSubDocs } = await client
      .from('procurement_sub_documents')
      .select('*')
      .in('parent_document_id', docIds)
      .order('created_at', { ascending: false });

    // 3. Fetch Update Logs
    const subDocIds = (rawSubDocs || []).map((s) => s.id);
    const { data: rawLogs } = await client
      .from('procurement_document_update_logs')
      .select('*')
      .or(`document_id.in.(${docIds.join(',')})${subDocIds.length > 0 ? `,sub_document_id.in.(${subDocIds.join(',')})` : ''}`)
      .order('timestamp', { ascending: false });

    // 4. Fetch History Entries
    const { data: rawHistory } = await client
      .from('procurement_document_history')
      .select('*')
      .in('document_id', docIds)
      .order('timestamp', { ascending: false });

    // 5. Fetch Multi-Attachments
    const { data: rawAttachments } = await client
      .from('procurement_document_attachments')
      .select('*')
      .in('document_id', docIds);

    // Group Sub-Docs by Parent Document ID
    const subDocsByParent: Record<string, ProcurementSubDocument[]> = {};
    (rawSubDocs || []).forEach((s) => {
      const parentId = s.parent_document_id;
      if (!subDocsByParent[parentId]) subDocsByParent[parentId] = [];

      // Sub-doc logs
      const subLogs = (rawLogs || [])
        .filter((l) => l.sub_document_id === s.id)
        .map(mapDbLogToModel);

      subDocsByParent[parentId].push({
        id: s.id,
        parentDocumentId: s.parent_document_id,
        controlNo: s.control_no,
        documentName: s.document_name,
        description: s.description || '',
        documentType: s.document_type,
        amount: Number(s.amount ?? 0),
        sourceOfFunds: s.source_of_funds,
        divisionSection: s.division_section || '',
        inputDate: s.input_date || new Date().toISOString().split('T')[0],
        documentUpdate: s.document_update || s.input_date || new Date().toISOString().split('T')[0],
        latestUpdateNotes: s.latest_update_notes || '',
        updateLogs: subLogs,
        assignedStaff: s.assigned_staff,
        assignedStaffId: s.assigned_staff_id || undefined,
        assignedStaffEmail: s.assigned_staff_email || undefined,
        status: s.status,
        notes: s.notes || '',
        customFields: s.custom_fields || {},
        fileUrl: s.file_url || undefined,
        fileName: s.file_name || undefined,
        fileSize: s.file_size || undefined,
        fileData: s.file_data || undefined,
        uploadedBy: s.uploaded_by || undefined,
        createdAt: s.created_at,
        updatedAt: s.updated_at || s.created_at,
      });
    });

    // Group Logs by Document ID
    const logsByDoc: Record<string, DocumentUpdateLog[]> = {};
    (rawLogs || []).forEach((l) => {
      if (l.document_id) {
        if (!logsByDoc[l.document_id]) logsByDoc[l.document_id] = [];
        logsByDoc[l.document_id].push(mapDbLogToModel(l));
      }
    });

    // Group History by Document ID
    const historyByDoc: Record<string, DocumentHistoryEntry[]> = {};
    (rawHistory || []).forEach((h) => {
      if (!historyByDoc[h.document_id]) historyByDoc[h.document_id] = [];
      historyByDoc[h.document_id].push({
        id: h.id,
        timestamp: h.timestamp,
        userId: h.user_id,
        userName: h.user_name,
        action: h.action,
        details: h.details,
        previousStatus: h.previous_status || undefined,
        newStatus: h.new_status || undefined,
      });
    });

    // Group Attachments by Document ID
    const attachmentsByDoc: Record<string, ProcurementAttachment[]> = {};
    (rawAttachments || []).forEach((a) => {
      if (a.document_id) {
        if (!attachmentsByDoc[a.document_id]) attachmentsByDoc[a.document_id] = [];
        attachmentsByDoc[a.document_id].push({
          id: a.id,
          fileName: a.file_name,
          fileSize: a.file_size || '',
          fileType: a.file_type || 'application/pdf',
          fileData: a.file_data || '',
          uploadedAt: a.uploaded_at,
          uploadedBy: a.uploaded_by || '',
          description: a.description || undefined,
        });
      }
    });

    // Assemble complete documents
    return rawDocs.map((d) => ({
      id: d.id,
      controlNo: d.control_no,
      documentName: d.document_name,
      description: d.description || '',
      documentType: d.document_type,
      amount: Number(d.amount ?? 0),
      sourceOfFunds: d.source_of_funds,
      divisionSection: d.division_section || '',
      inputDate: d.input_date,
      documentUpdate: d.document_update || d.input_date,
      latestUpdateNotes: d.latest_update_notes || '',
      updateLogs: logsByDoc[d.id] || [],
      subDocuments: subDocsByParent[d.id] || [],
      assignedStaff: d.assigned_staff,
      assignedStaffId: d.assigned_staff_id || undefined,
      assignedStaffEmail: d.assigned_staff_email || undefined,
      status: d.status,
      supplierName: d.supplier_name || '',
      bacResolutionNo: d.bac_resolution_no || '',
      targetCompletionDate: d.target_completion_date || undefined,
      notes: d.notes || '',
      attachmentsCount: d.attachments_count ?? 0,
      fileUrl: d.file_url || undefined,
      fileName: d.file_name || undefined,
      fileSize: d.file_size || undefined,
      fileData: d.file_data || undefined,
      attachments: attachmentsByDoc[d.id] || [],
      customFields: d.custom_fields || {},
      history: historyByDoc[d.id] || [],
      createdAt: d.created_at,
      updatedAt: d.updated_at || d.created_at,
    }));
  } catch (err) {
    console.error('[procurementDatabase] Error in fetchProcurementDocumentsFromDb:', err);
    return [];
  }
}

function mapDbLogToModel(l: any): DocumentUpdateLog {
  return {
    id: l.id,
    date: l.log_date,
    time: l.log_time || undefined,
    timestamp: l.timestamp,
    userId: l.user_id,
    userName: l.user_name,
    userRole: l.user_role || undefined,
    status: l.status || undefined,
    notes: l.notes,
    stageOrMilestone: l.stage_or_milestone || undefined,
    createdAt: l.created_at,
    updatedAt: l.updated_at || undefined,
    updatedBy: l.updated_by || undefined,
  };
}

// ============================================================================
// MUTATIONS: Documents, Sub-Docs, Logs & History
// ============================================================================

export async function dbInsertProcurementDocument(doc: ProcurementDocument): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const docId = ensureValidUuid(doc.id);

  // 1. Insert Main Document
  const { error: insertErr } = await client.from('procurement_documents').insert({
    id: docId,
    control_no: doc.controlNo,
    document_name: doc.documentName,
    description: doc.description || '',
    document_type: doc.documentType,
    amount: doc.amount || 0,
    source_of_funds: doc.sourceOfFunds,
    division_section: doc.divisionSection || null,
    status: doc.status,
    input_date: doc.inputDate,
    document_update: doc.documentUpdate || doc.inputDate,
    latest_update_notes: doc.latestUpdateNotes || null,
    assigned_staff_id: doc.assignedStaffId || null,
    assigned_staff: doc.assignedStaff,
    assigned_staff_email: doc.assignedStaffEmail || null,
    supplier_name: doc.supplierName || null,
    bac_resolution_no: doc.bacResolutionNo || null,
    target_completion_date: doc.targetCompletionDate || null,
    notes: doc.notes || null,
    file_url: doc.fileUrl || null,
    file_name: doc.fileName || null,
    file_size: doc.fileSize || null,
    file_data: doc.fileData || null,
    attachments_count: doc.attachmentsCount || 0,
    custom_fields: doc.customFields || {},
    created_at: doc.createdAt || new Date().toISOString(),
    updated_at: doc.updatedAt || new Date().toISOString(),
  });

  if (insertErr) {
    console.error('❌ Error inserting document into Supabase:', insertErr);
    throw insertErr;
  }

  // 2. Insert initial update log if present
  if (doc.updateLogs && doc.updateLogs.length > 0) {
    for (const log of doc.updateLogs) {
      await dbInsertUpdateLog({
        ...log,
        documentId: docId,
      });
    }
  }

  // 3. Insert initial history entry
  if (doc.history && doc.history.length > 0) {
    for (const hist of doc.history) {
      await client.from('procurement_document_history').insert({
        id: ensureValidUuid(hist.id),
        document_id: docId,
        timestamp: hist.timestamp,
        user_id: hist.userId,
        user_name: hist.userName,
        action: hist.action,
        details: hist.details,
        previous_status: hist.previousStatus || null,
        new_status: hist.newStatus || null,
      });
    }
  }
}

export async function dbUpdateProcurementDocument(
  id: string,
  updates: Partial<ProcurementDocument>
): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.controlNo !== undefined) payload.control_no = updates.controlNo;
  if (updates.documentName !== undefined) payload.document_name = updates.documentName;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.documentType !== undefined) payload.document_type = updates.documentType;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.sourceOfFunds !== undefined) payload.source_of_funds = updates.sourceOfFunds;
  if (updates.divisionSection !== undefined) payload.division_section = updates.divisionSection;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.inputDate !== undefined) payload.input_date = updates.inputDate;
  if (updates.documentUpdate !== undefined) payload.document_update = updates.documentUpdate;
  if (updates.latestUpdateNotes !== undefined) payload.latest_update_notes = updates.latestUpdateNotes;
  if (updates.assignedStaff !== undefined) payload.assigned_staff = updates.assignedStaff;
  if (updates.assignedStaffId !== undefined) payload.assigned_staff_id = updates.assignedStaffId;
  if (updates.assignedStaffEmail !== undefined) payload.assigned_staff_email = updates.assignedStaffEmail;
  if (updates.supplierName !== undefined) payload.supplier_name = updates.supplierName;
  if (updates.bacResolutionNo !== undefined) payload.bac_resolution_no = updates.bacResolutionNo;
  if (updates.targetCompletionDate !== undefined) payload.target_completion_date = updates.targetCompletionDate;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.fileUrl !== undefined) payload.file_url = updates.fileUrl;
  if (updates.fileName !== undefined) payload.file_name = updates.fileName;
  if (updates.fileSize !== undefined) payload.file_size = updates.fileSize;
  if (updates.fileData !== undefined) payload.file_data = updates.fileData;
  if (updates.attachmentsCount !== undefined) payload.attachments_count = updates.attachmentsCount;
  if (updates.customFields !== undefined) payload.custom_fields = updates.customFields;

  const { error } = await client.from('procurement_documents').update(payload).eq('id', id);
  if (error) {
    console.error('❌ Error updating procurement document in Supabase:', error);
    throw error;
  }
}

export async function dbDeleteProcurementDocument(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('procurement_documents').delete().eq('id', id);
  if (error) {
    console.error('❌ Error deleting procurement document from Supabase:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------------
// Sub-Documents
// ----------------------------------------------------------------------------

export async function dbInsertSubDocument(
  parentDocId: string,
  subDoc: ProcurementSubDocument
): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const subDocId = ensureValidUuid(subDoc.id);

  const { error } = await client.from('procurement_sub_documents').insert({
    id: subDocId,
    parent_document_id: parentDocId,
    control_no: subDoc.controlNo,
    document_name: subDoc.documentName,
    description: subDoc.description || '',
    document_type: subDoc.documentType,
    amount: subDoc.amount || 0,
    source_of_funds: subDoc.sourceOfFunds,
    division_section: subDoc.divisionSection || null,
    status: subDoc.status,
    input_date: subDoc.inputDate,
    document_update: subDoc.documentUpdate || subDoc.inputDate,
    latest_update_notes: subDoc.latestUpdateNotes || null,
    assigned_staff_id: subDoc.assignedStaffId || null,
    assigned_staff: subDoc.assignedStaff,
    assigned_staff_email: subDoc.assignedStaffEmail || null,
    notes: subDoc.notes || null,
    file_url: subDoc.fileUrl || null,
    file_name: subDoc.fileName || null,
    file_size: subDoc.fileSize || null,
    file_data: subDoc.fileData || null,
    custom_fields: subDoc.customFields || {},
    uploaded_by: subDoc.uploadedBy || null,
    created_at: subDoc.createdAt || new Date().toISOString(),
    updated_at: subDoc.updatedAt || new Date().toISOString(),
  });

  if (error) {
    console.error('❌ Error inserting sub-document into Supabase:', error);
    throw error;
  }

  // Insert sub-doc update logs
  if (subDoc.updateLogs && subDoc.updateLogs.length > 0) {
    for (const log of subDoc.updateLogs) {
      await dbInsertUpdateLog({
        ...log,
        subDocumentId: subDocId,
      });
    }
  }
}

export async function dbUpdateSubDocument(
  id: string,
  updates: Partial<ProcurementSubDocument>
): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.controlNo !== undefined) payload.control_no = updates.controlNo;
  if (updates.documentName !== undefined) payload.document_name = updates.documentName;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.documentType !== undefined) payload.document_type = updates.documentType;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.sourceOfFunds !== undefined) payload.source_of_funds = updates.sourceOfFunds;
  if (updates.divisionSection !== undefined) payload.division_section = updates.divisionSection;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.inputDate !== undefined) payload.input_date = updates.inputDate;
  if (updates.documentUpdate !== undefined) payload.document_update = updates.documentUpdate;
  if (updates.latestUpdateNotes !== undefined) payload.latest_update_notes = updates.latestUpdateNotes;
  if (updates.assignedStaff !== undefined) payload.assigned_staff = updates.assignedStaff;
  if (updates.assignedStaffId !== undefined) payload.assigned_staff_id = updates.assignedStaffId;
  if (updates.assignedStaffEmail !== undefined) payload.assigned_staff_email = updates.assignedStaffEmail;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.fileUrl !== undefined) payload.file_url = updates.fileUrl;
  if (updates.fileName !== undefined) payload.file_name = updates.fileName;
  if (updates.fileSize !== undefined) payload.file_size = updates.fileSize;
  if (updates.fileData !== undefined) payload.file_data = updates.fileData;
  if (updates.customFields !== undefined) payload.custom_fields = updates.customFields;

  const { error } = await client.from('procurement_sub_documents').update(payload).eq('id', id);
  if (error) {
    console.error('❌ Error updating sub-document in Supabase:', error);
    throw error;
  }
}

export async function dbDeleteSubDocument(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('procurement_sub_documents').delete().eq('id', id);
  if (error) {
    console.error('❌ Error deleting sub-document from Supabase:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------------
// Update Logs
// ----------------------------------------------------------------------------

export async function dbInsertUpdateLog(log: DocumentUpdateLog & { documentId?: string; subDocumentId?: string }): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const { error } = await client.from('procurement_document_update_logs').insert({
    id: ensureValidUuid(log.id),
    document_id: log.documentId ? ensureValidUuid(log.documentId) : null,
    sub_document_id: log.subDocumentId ? ensureValidUuid(log.subDocumentId) : null,
    log_date: log.date,
    log_time: log.time || null,
    timestamp: log.timestamp || new Date().toISOString(),
    user_id: log.userId,
    user_name: log.userName,
    user_role: log.userRole || null,
    status: log.status || null,
    notes: log.notes,
    stage_or_milestone: log.stageOrMilestone || null,
    created_at: log.createdAt || new Date().toISOString(),
  });

  if (error) {
    console.error('❌ Error inserting update log into Supabase:', error);
  }
}

export async function dbUpdateUpdateLog(id: string, updates: Partial<DocumentUpdateLog>): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.date !== undefined) payload.log_date = updates.date;
  if (updates.time !== undefined) payload.log_time = updates.time;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.updatedBy !== undefined) payload.updated_by = updates.updatedBy;

  const { error } = await client.from('procurement_document_update_logs').update(payload).eq('id', id);
  if (error) {
    console.error('❌ Error updating update log in Supabase:', error);
  }
}

export async function dbDeleteUpdateLog(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.from('procurement_document_update_logs').delete().eq('id', id);
  if (error) {
    console.error('❌ Error deleting update log from Supabase:', error);
  }
}
