import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  Item,
  ItemType,
  Location,
  Vendor,
  Transaction,
  AuditLog,
  PurchaseOrder,
  PendingCheckIn,
  UserRegistrationRequest,
  Department,
  User,
  UserRole,
  OrgBrandingConfig,
} from '../types';

// ============================================================================
// HELPER: Snake Case / Camel Case Data Converters
// ============================================================================

export function itemToDb(item: Item): any {
  const itemType = item.type || (item.isConsumable ? 'consumable' : 'returnable');
  const expDateStr = item.expirationDate || item.expiryDate;
  const cleanExpDate = expDateStr ? (expDateStr.includes('T') ? expDateStr.split('T')[0] : expDateStr) : null;
  const cleanExpTime = item.expirationTime || null;

  return {
    id: item.id,
    sku: item.sku,
    barcode: item.barcode || item.sku,
    barcode_type: item.barcodeType || 'CODE128',
    name: item.name,
    category: item.category,
    description: item.description || '',
    quantity: item.quantity ?? 0,
    reorder_point: item.reorderPoint ?? 0,
    safety_stock: item.safetyStock ?? 0,
    unit_price: item.unitPrice ?? 0,
    cost_price: item.costPrice ?? 0,
    location_id: item.locationId || null,
    vendor_id: item.vendorId || null,
    serial_numbers: item.serialNumbers || [],
    batch_lot_number: item.batchLotNumber || null,
    expiry_date: cleanExpDate,
    expiration_date: cleanExpDate,
    expiration_time: cleanExpTime,
    condition: item.condition || 'Good',
    tags: item.tags || [],
    image_url: item.imageUrl || null,
    type: itemType,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function dbToItem(row: any, locations: Location[] = [], vendors: Vendor[] = []): Item {
  const matchedLoc = locations.find((l) => l.id === (row.location_id || row.locationId));
  const matchedVen = vendors.find((v) => v.id === (row.vendor_id || row.vendorId));
  const rawType = (row.type || (row.is_consumable ? 'consumable' : 'returnable')).toLowerCase();
  const isConsumable = rawType === 'consumable' || Boolean(row.is_consumable);
  const itemType: ItemType = isConsumable ? 'consumable' : 'returnable';
  const resolvedExpDate = row.expiration_date || row.expiry_date || row.expiryDate || row.expirationDate;

  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode || row.sku,
    barcodeType: row.barcode_type || row.barcodeType || 'CODE128',
    name: row.name,
    category: row.category,
    description: row.description || '',
    quantity: Number(row.quantity ?? 0),
    reorderPoint: Number(row.reorder_point ?? row.reorderPoint ?? 0),
    safetyStock: Number(row.safety_stock ?? row.safetyStock ?? 0),
    unitPrice: Number(row.unit_price ?? row.unitPrice ?? 0),
    costPrice: Number(row.cost_price ?? row.costPrice ?? 0),
    locationId: row.location_id || row.locationId || '',
    locationName: row.location_name || row.locationName || matchedLoc?.name || '',
    vendorId: row.vendor_id || row.vendorId || '',
    vendorName: row.vendor_name || row.vendorName || matchedVen?.name || '',
    serialNumbers: row.serial_numbers || row.serialNumbers || [],
    batchLotNumber: row.batch_lot_number || row.batchLotNumber,
    expiryDate: resolvedExpDate,
    expirationDate: resolvedExpDate,
    expirationTime: row.expiration_time || row.expirationTime || undefined,
    condition: row.condition || 'Good',
    tags: row.tags || [],
    imageUrl: row.image_url || row.imageUrl,
    pieceSkus: row.piece_skus || row.pieceSkus || [],
    isLowStockMonitored: row.is_low_stock_monitored ?? row.isLowStockMonitored ?? true,
    isSetOrBundle: row.is_set_or_bundle ?? row.isSetOrBundle ?? false,
    bundleItems: row.bundle_items || row.bundleItems || [],
    supplierNotes: row.supplier_notes || row.supplierNotes,
    type: itemType,
    isConsumable: isConsumable,
    unitOfMeasure: row.unit_of_measure || row.unitOfMeasure || (isConsumable ? 'pcs' : 'units'),
  };
}

export function transactionToDb(tx: Transaction): any {
  return {
    id: tx.id,
    transaction_type: tx.type || (tx as any).transaction_type,
    item_id: tx.itemId,
    quantity: tx.quantity ?? 0,
    previous_quantity: tx.previousQuantity ?? 0,
    new_quantity: tx.newQuantity ?? 0,
    user_id: tx.userId,
    location_id: tx.locationId || null,
    assignee_or_project: tx.assigneeOrProject || null,
    condition: tx.condition || 'Good',
    notes: tx.notes || null,
    signature_data_url: tx.signatureDataUrl || null,
    synced_offline: tx.syncedOffline ?? true,
    serial_number: tx.serialNumber || null,
    timestamp: tx.timestamp || new Date().toISOString(),
  };
}

export function dbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.transaction_type || row.type || 'ADJUSTMENT',
    itemId: row.item_id || row.itemId,
    itemName: row.item_name || row.itemName || '',
    sku: row.sku || '',
    barcode: row.barcode || row.sku || '',
    quantity: Number(row.quantity ?? 0),
    previousQuantity: Number(row.previous_quantity ?? row.previousQuantity ?? 0),
    newQuantity: Number(row.new_quantity ?? row.newQuantity ?? 0),
    userId: row.user_id || row.userId,
    userName: row.user_name || row.userName || 'System',
    userRole: row.user_role || row.userRole || 'Staff',
    locationId: row.location_id || row.locationId,
    locationName: row.location_name || row.locationName,
    timestamp: row.timestamp || new Date().toISOString(),
    assigneeOrProject: row.assignee_or_project || row.assigneeOrProject,
    condition: row.condition || 'Good',
    notes: row.notes,
    signatureDataUrl: row.signature_data_url || row.signatureDataUrl,
    serialNumber: row.serial_number || row.serialNumber,
    isConsumable: row.is_consumable ?? row.isConsumable,
    remainingOutQuantity:
      row.remaining_out_quantity !== undefined && row.remaining_out_quantity !== null
        ? Number(row.remaining_out_quantity)
        : row.remainingOutQuantity,
  };
}

export function locationToDb(loc: Location): any {
  return {
    id: loc.id,
    name: loc.name,
    code: loc.code,
    type: loc.type,
    parent_location_id: loc.parentLocationId || null,
    capacity: loc.capacity || 0,
    current_count: loc.currentCount || 0,
  };
}

export function dbToLocation(row: any): Location {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type || 'Warehouse',
    parentLocationId: row.parent_location_id || row.parentLocationId,
    capacity: Number(row.capacity ?? 0),
    currentCount: Number(row.current_count ?? row.currentCount ?? 0),
  };
}

export function vendorToDb(v: Vendor): any {
  return {
    id: v.id,
    name: v.name,
    contact_person: v.contactPerson || '',
    email: v.email || '',
    phone: v.phone || '',
    lead_time_days: v.leadTimeDays || 3,
    rating: v.rating || 5.0,
  };
}

export function dbToVendor(row: any): Vendor {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person || row.contactPerson || '',
    email: row.email || '',
    phone: row.phone || '',
    leadTimeDays: Number(row.lead_time_days ?? row.leadTimeDays ?? 3),
    rating: Number(row.rating ?? row.rating ?? 5.0),
  };
}

export function departmentToDb(dept: Department): any {
  return {
    id: dept.id,
    department_name: dept.name,
    acronym_code: dept.code || dept.name.slice(0, 5).toUpperCase(),
    division_head: dept.headName || null,
    operational_mandate: dept.description || null,
    created_at: dept.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function dbToDepartment(row: any): Department {
  return {
    id: row.id,
    name: row.department_name || row.name || 'Unnamed Division',
    code: row.acronym_code || row.code || '',
    description: row.operational_mandate || row.description || '',
    headName: row.division_head || row.head_name || row.headName || '',
    createdAt: row.created_at || row.createdAt,
  };
}

export function systemIdentityToDb(b: OrgBrandingConfig): any {
  return {
    id: 'default',
    short_brand: b.orgName || 'CEBU PDRRMO',
    badge_tag_label: b.badgeText || 'INVENTORY',
    full_agency_name: b.fullOfficeName || 'Cebu Provincial Disaster Risk Reduction and Management Office',
    system_tagline: b.orgSubtitle || 'Provincial Disaster Risk Reduction and Management Office',
    brand_accent_color: b.badgeBgColor || '#DC2626',
    logo_url: b.customLogoUrl || null,
    updated_at: new Date().toISOString(),
  };
}

export function dbToSystemIdentity(row: any): OrgBrandingConfig {
  return {
    orgName: row.short_brand || row.org_name || 'CEBU PDRRMO',
    badgeText: row.badge_tag_label || row.badge_text || 'INVENTORY',
    fullOfficeName: row.full_agency_name || row.full_office_name || 'Cebu Provincial Disaster Risk Reduction and Management Office',
    orgSubtitle: row.system_tagline || row.org_subtitle || 'Provincial Disaster Risk Reduction and Management Office',
    badgeBgColor: row.brand_accent_color || row.badge_bg_color || '#DC2626',
    customLogoUrl: row.logo_url || row.custom_logo_url || '',
    logoType: (row.logo_url || row.custom_logo_url) ? 'upload' : 'preset',
    logoPresetId: 'shield-alert',
  };
}

export function pendingCheckInToDb(p: PendingCheckIn): any {
  return {
    id: p.id,
    item_id: p.itemId,
    item_name: p.itemName,
    sku: p.sku,
    barcode: p.barcode || p.sku,
    quantity: p.quantity,
    condition: p.condition,
    location_id: p.locationId,
    location_name: p.locationName,
    notes: p.notes || null,
    submitted_by_user_id: p.submittedByUserId,
    submitted_by_user_name: p.submittedByUserName,
    submitted_by_user_role: p.submittedByUserRole,
    submitted_at: p.submittedAt,
    checkout_tx_id: p.checkoutTxId || null,
    status: p.status,
    reviewed_by_user_name: p.reviewedByUserName || null,
    reviewed_at: p.reviewedAt || null,
    rejection_reason: p.rejectionReason || null,
    admin_notes: p.adminNotes || null,
  };
}

export function dbToPendingCheckIn(row: any): PendingCheckIn {
  return {
    id: row.id,
    itemId: row.item_id || row.itemId,
    itemName: row.item_name || row.itemName || '',
    sku: row.sku,
    barcode: row.barcode || row.sku,
    quantity: Number(row.quantity ?? 0),
    condition: row.condition || 'Good',
    locationId: row.location_id || row.locationId,
    locationName: row.location_name || row.locationName || '',
    notes: row.notes,
    submittedByUserId: row.submitted_by_user_id || row.submittedByUserId,
    submittedByUserName: row.submitted_by_user_name || row.submittedByUserName,
    submittedByUserRole: row.submitted_by_user_role || row.submittedByUserRole,
    submittedAt: row.submitted_at || row.submittedAt,
    checkoutTxId: row.checkout_tx_id || row.checkoutTxId,
    status: row.status || 'PENDING',
    reviewedByUserName: row.reviewed_by_user_name || row.reviewedByUserName,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    rejectionReason: row.rejection_reason || row.rejectionReason,
    adminNotes: row.admin_notes || row.adminNotes,
  };
}

export function auditLogToDb(log: AuditLog): any {
  return {
    id: log.id,
    timestamp: log.timestamp,
    user_id: log.userId,
    user_name: log.userName,
    user_role: log.userRole,
    action: log.action,
    details: log.details,
    ip_address: log.ipAddress || '127.0.0.1',
    severity: log.severity || 'info',
  };
}

export function dbToAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id || row.userId,
    userName: row.user_name || row.userName || 'System',
    userRole: row.user_role || row.userRole || 'Staff',
    action: row.action,
    details: row.details,
    ipAddress: row.ip_address || row.ipAddress || '127.0.0.1',
    severity: row.severity || 'info',
  };
}

export function roleToDb(r: UserRole): any {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    permissions: r.permissions || {},
    created_at: new Date().toISOString(),
  };
}

export function dbToRole(row: any): UserRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions || {},
    isSystemDefault: row.name === 'Admin' || row.name === 'Staff',
  };
}

export function userToDb(u: User, passwordHash?: string, departments: Department[] = []): any {
  let roleId = u.roleId;
  if (
    !roleId ||
    (u.roleName && roleId.includes('staff') && u.roleName !== 'Staff') ||
    (u.roleName && roleId.includes('admin') && u.roleName !== 'Admin') ||
    (u.roleName && roleId.includes('manager') && u.roleName !== 'Inventory Manager') ||
    (u.roleName && roleId.includes('auditor') && u.roleName !== 'Auditor')
  ) {
    roleId =
      u.roleName === 'Admin'
        ? 'role-admin'
        : u.roleName === 'Inventory Manager'
        ? 'role-manager'
        : u.roleName === 'Auditor'
        ? 'role-auditor'
        : 'role-staff';
  }
  const generatedQr = u.userQrCode || `USR-QR-${u.id.toUpperCase()}`;

  // Match department_id from departments table
  const matchedDept = departments.find(
    (d) => d.id === u.department || d.name.toLowerCase() === (u.department || '').toLowerCase()
  );
  const deptId = matchedDept ? matchedDept.id : u.department || null;

  return {
    id: u.id,
    name: u.name,
    email: u.email.toLowerCase(),
    password_hash: passwordHash || u.password || 'staff123',
    role_id: roleId || 'role-staff',
    department_id: deptId,
    department: u.department || (matchedDept ? matchedDept.name : null),
    position: u.roleName || u.position || null,
    contact_number: u.contactNumber || u.phone || u.contact_number || null,
    user_qr_code: generatedQr,
    pin: u.pin || '1234',
    status: 'ACTIVE',
    assigned_location_id: u.assignedLocationId || null,
    avatar_url: u.avatarUrl || null,
  };
}

export function dbToUser(row: any, roles: UserRole[] = [], departments: Department[] = []): User {
  const matchedRole = roles.find(
    (r) => r.id === row.role_id || r.name.toLowerCase() === (row.role_id || '').toLowerCase()
  );
  const roleName = matchedRole
    ? matchedRole.name
    : row.role_id?.includes('admin') ||
      row.name?.toLowerCase().includes('admin') ||
      row.email?.toLowerCase().includes('admin')
    ? 'Admin'
    : row.role_id?.includes('manager')
    ? 'Inventory Manager'
    : row.role_id?.includes('auditor')
    ? 'Auditor'
    : 'Staff';

  const defaultRolePassword =
    roleName === 'Admin'
      ? 'admin123'
      : roleName === 'Inventory Manager'
      ? 'manager123'
      : roleName === 'Auditor'
      ? 'audit123'
      : 'staff123';

  const userQr = row.user_qr_code || row.userQrCode || `USR-QR-${row.id.toUpperCase()}`;

  // Match department by department_id or department name
  const matchedDept = departments.find(
    (d) => d.id === row.department_id || d.id === row.department
  );
  const resolvedDept = matchedDept ? matchedDept.name : row.department || '';
  const contactNum = row.contact_number || row.phone || '';

  return {
    id: row.id,
    name: row.name || row.email?.split('@')[0] || 'Officer',
    email: row.email,
    roleId: row.role_id || (matchedRole ? matchedRole.id : 'role-staff'),
    roleName: roleName,
    department: resolvedDept,
    assignedLocationId: row.assigned_location_id || undefined,
    avatarUrl:
      row.avatar_url ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    password: row.password_hash || defaultRolePassword,
    pin: row.pin || '1234',
    userQrCode: userQr,
    phone: contactNum,
    contactNumber: contactNum,
    contact_number: contactNum,
    position: row.position,
  };
}

export function purchaseOrderToDb(po: PurchaseOrder): any {
  return {
    id: po.id,
    po_number: po.poNumber,
    vendor_id: po.vendorId,
    total_amount: po.totalAmount,
    status: po.status,
    items: po.items || [],
    expected_delivery_date: po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : null,
    created_by: po.createdBy,
    created_at: po.createdAt || new Date().toISOString(),
  };
}

export function dbToPurchaseOrder(row: any): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number || row.poNumber || `PO-${row.id}`,
    vendorId: row.vendor_id || row.vendorId,
    vendorName: row.vendor_name || row.vendorName || '',
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items || [],
    totalAmount: Number(row.total_amount ?? row.totalAmount ?? 0),
    status: row.status || 'Draft',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    expectedDeliveryDate: row.expected_delivery_date || row.expectedDeliveryDate || '',
    createdBy: row.created_by || row.createdBy || 'Administrator',
    notes: row.notes,
  };
}

export function registrationRequestToDb(reg: UserRegistrationRequest): any {
  return {
    id: reg.id,
    full_name: reg.fullName,
    email: reg.email.toLowerCase(),
    department: reg.department,
    position: reg.position || null,
    contact_number: reg.contactNumber || null,
    requested_role_name: reg.requestedRoleName || 'Staff',
    password: reg.password || 'staff123',
    pin: reg.pin || '1234',
    reason_or_notes: reg.reasonOrNotes || null,
    status: reg.status,
    submitted_at: reg.submittedAt,
    reviewed_by_user_name: reg.reviewedByUserName || null,
    reviewed_at: reg.reviewedAt || null,
    rejection_reason: reg.rejectionReason || null,
    assigned_role_name: reg.assignedRoleName || null,
    assigned_user_id: reg.assignedUserId || null,
  };
}

export function dbToRegistrationRequest(row: any): UserRegistrationRequest {
  return {
    id: row.id,
    fullName: row.full_name || row.fullName || '',
    email: row.email,
    department: row.department || '',
    position: row.position,
    contactNumber: row.contact_number || row.contactNumber,
    requestedRoleName: row.requested_role_name || row.requestedRoleName || 'Staff',
    password: row.password,
    pin: row.pin,
    reasonOrNotes: row.reason_or_notes || row.reasonOrNotes,
    status: row.status || 'PENDING',
    submittedAt: row.submitted_at || row.submittedAt || new Date().toISOString(),
    reviewedByUserName: row.reviewed_by_user_name || row.reviewedByUserName,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    rejectionReason: row.rejection_reason || row.rejectionReason,
    assignedRoleName: row.assigned_role_name || row.assignedRoleName,
    assignedUserId: row.assigned_user_id || row.assignedUserId,
  };
}

// ============================================================================
// DYNAMIC CRUD OPERATIONS WITH SUPABASE
// ============================================================================

export async function fetchAllFromSupabase(): Promise<{
  items?: Item[];
  locations?: Location[];
  vendors?: Vendor[];
  transactions?: Transaction[];
  auditLogs?: AuditLog[];
  departments?: Department[];
  pendingCheckIns?: PendingCheckIn[];
  users?: User[];
  roles?: UserRole[];
  purchaseOrders?: PurchaseOrder[];
  registrationRequests?: UserRegistrationRequest[];
  systemIdentity?: OrgBrandingConfig;
}> {
  const client = getSupabase();
  if (!client) return {};

  const results: any = {};

  try {
    const { data: rolesData, error: rolesErr } = await client.from('roles').select('*');
    if (!rolesErr && rolesData) {
      results.roles = rolesData.map(dbToRole);
    }
  } catch (err) {
    console.warn('Roles table query skipped:', err);
  }

  try {
    const { data: deptData, error: deptErr } = await client.from('departments').select('*');
    if (!deptErr && deptData) {
      results.departments = deptData.map(dbToDepartment);
    }
  } catch (err) {
    console.warn('Departments table query skipped:', err);
  }

  try {
    const { data: usersData, error: usersErr } = await client.from('users').select('*');
    if (!usersErr && usersData) {
      const currentRoles = results.roles || [];
      const currentDepts = results.departments || [];
      results.users = usersData.map((u: any) => dbToUser(u, currentRoles, currentDepts));
    }
  } catch (err) {
    console.warn('Users table query skipped:', err);
  }

  try {
    const { data: locData, error: locErr } = await client.from('locations').select('*');
    if (!locErr && locData) {
      results.locations = locData.map(dbToLocation);
    }
  } catch (err) {
    console.warn('Locations table query skipped:', err);
  }

  try {
    const { data: venData, error: venErr } = await client.from('vendors').select('*');
    if (!venErr && venData) {
      results.vendors = venData.map(dbToVendor);
    }
  } catch (err) {
    console.warn('Vendors table query skipped:', err);
  }

  try {
    const { data: itemsData, error: itemsErr } = await client.from('items').select('*');
    if (!itemsErr && itemsData) {
      const locs = results.locations || [];
      const vens = results.vendors || [];
      results.items = itemsData.map((row: any) => dbToItem(row, locs, vens));
    }
  } catch (err) {
    console.warn('Items table query skipped:', err);
  }

  try {
    const { data: txData, error: txErr } = await client
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });
    if (!txErr && txData) {
      results.transactions = txData.map(dbToTransaction);
    }
  } catch (err) {
    console.warn('Transactions table query skipped:', err);
  }

  try {
    const { data: pendData, error: pendErr } = await client
      .from('pending_checkins')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (!pendErr && pendData) {
      results.pendingCheckIns = pendData.map(dbToPendingCheckIn);
    }
  } catch (err) {
    console.warn('Pending checkins table query skipped:', err);
  }

  try {
    const { data: logData, error: logErr } = await client
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (!logErr && logData) {
      results.auditLogs = logData.map(dbToAuditLog);
    }
  } catch (err) {
    console.warn('Audit logs table query skipped:', err);
  }

  try {
    const { data: poData, error: poErr } = await client
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!poErr && poData) {
      results.purchaseOrders = poData.map(dbToPurchaseOrder);
    }
  } catch (err) {
    console.warn('Purchase orders table query skipped:', err);
  }

  try {
    const { data: regData, error: regErr } = await client
      .from('registration_requests')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (!regErr && regData) {
      results.registrationRequests = regData.map(dbToRegistrationRequest);
    }
  } catch (err) {
    console.warn('Registration requests table query skipped:', err);
  }

  try {
    const { data: identityData, error: identityErr } = await client
      .from('system_identity')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (!identityErr && identityData) {
      results.systemIdentity = dbToSystemIdentity(identityData);
    }
  } catch (err) {
    console.warn('System identity table query skipped:', err);
  }

  return results;
}

export async function fetchItemsFromSupabase(): Promise<Item[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data: locData } = await client.from('locations').select('*');
    const { data: venData } = await client.from('vendors').select('*');
    const locs = (locData || []).map(dbToLocation);
    const vens = (venData || []).map(dbToVendor);
    const { data: itemsData, error } = await client.from('items').select('*');
    if (error) {
      console.error('❌ Supabase fetchItems error:', error);
      return [];
    }
    return (itemsData || []).map((row: any) => dbToItem(row, locs, vens));
  } catch (err) {
    console.error('❌ Failed to fetch items from Supabase:', err);
    return [];
  }
}

// System Identity CRUD
export async function dbUpsertSystemIdentity(identity: OrgBrandingConfig) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = systemIdentityToDb(identity);
    const { error: updateErr } = await client
      .from('system_identity')
      .upsert(payload, { onConflict: 'id' });
    if (updateErr) {
      console.warn('Supabase dbUpsertSystemIdentity notice:', updateErr.message);
    }
  } catch (err) {
    console.warn('Failed to upsert system_identity to Supabase:', err);
  }
}

// Item CRUD
export async function dbUpsertItem(item: Item): Promise<{ success: boolean; data?: any; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };
  try {
    const payload = itemToDb(item);
    const { data, error } = await client.from('items').upsert(payload, { onConflict: 'id' });
    if (error) {
      // If foreign key constraint failed on location or vendor, retry with null references
      if (error.code === '23503') {
        console.warn('Foreign key notice on items insert, retrying with nullable references:', error.message);
        const safePayload = { ...payload, location_id: null, vendor_id: null };
        const retryRes = await client.from('items').upsert(safePayload, { onConflict: 'id' });
        if (retryRes.error) {
          console.error('❌ Supabase items UPSERT retry error:', retryRes.error);
          return { success: false, error: retryRes.error };
        }
        return { success: true, data: retryRes.data };
      }
      console.error('❌ Supabase items UPSERT Error:', error.message, '| Code:', error.code, '| Details:', error.details, '| Hint:', error.hint);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to upsert item to Supabase exception:', err);
    return { success: false, error: err };
  }
}

export async function dbUpsertItems(items: Item[]): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };
  try {
    const payloads = items.map(itemToDb);
    const { error } = await client.from('items').upsert(payloads, { onConflict: 'id' });
    if (error) {
      if (error.code === '23503') {
        const safePayloads = payloads.map((p) => ({ ...p, location_id: null, vendor_id: null }));
        const retryRes = await client.from('items').upsert(safePayloads, { onConflict: 'id' });
        if (retryRes.error) {
          console.error('❌ Supabase bulk items UPSERT retry error:', retryRes.error);
          return { success: false, error: retryRes.error };
        }
        return { success: true };
      }
      console.error('❌ Supabase bulk items UPSERT error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to bulk upsert items to Supabase:', err);
    return { success: false, error: err };
  }
}

export async function dbDeleteItem(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    const { error } = await client.from('items').delete().eq('id', id);
    if (error) console.error('❌ Supabase items DELETE error:', error);
  } catch (err) {
    console.warn('Failed to delete item from Supabase:', err);
  }
}

// Transaction CRUD
export async function dbInsertTransaction(tx: Transaction): Promise<{ success: boolean; data?: any; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false };
  try {
    const payload = transactionToDb(tx);
    const { data, error } = await client.from('transactions').upsert(payload, { onConflict: 'id' });
    if (error) {
      if (error.code === '23503') {
        const safePayload = { ...payload, user_id: null, location_id: null };
        const retryRes = await client.from('transactions').upsert(safePayload, { onConflict: 'id' });
        return { success: !retryRes.error, error: retryRes.error };
      }
      console.error('❌ Supabase transaction insert error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Failed to insert transaction to Supabase:', err);
    return { success: false, error: err };
  }
}

export async function dbUpdateTransaction(tx: Transaction) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = transactionToDb(tx);
    const { error } = await client.from('transactions').upsert(payload, { onConflict: 'id' });
    if (error) console.error('❌ Supabase transaction update error:', error);
  } catch (err) {
    console.warn('Failed to update transaction in Supabase:', err);
  }
}

export async function dbDeleteTransaction(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    const { error } = await client.from('transactions').delete().eq('id', id);
    if (error) console.error('❌ Supabase transaction delete error:', error);
  } catch (err) {
    console.warn('Failed to delete transaction from Supabase:', err);
  }
}

// Location CRUD
export async function dbUpsertLocation(loc: Location) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = locationToDb(loc);

    // 1. Try upsert with onConflict on id
    const { error: upsertErr } = await client.from('locations').upsert(payload, { onConflict: 'id' });
    if (!upsertErr) return;

    // 2. Fallback: try update by id
    const { error: updateErr } = await client.from('locations').update(payload).eq('id', loc.id);
    if (!updateErr) return;

    // 3. Fallback: try update by unique code
    if (loc.code) {
      const { error: codeErr } = await client.from('locations').update(payload).eq('code', loc.code);
      if (codeErr) {
        console.warn('Supabase dbUpsertLocation update error:', codeErr.message);
      }
    }
  } catch (err) {
    console.warn('Failed to upsert location to Supabase:', err);
  }
}

export async function dbDeleteLocation(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    const { error } = await client.from('locations').delete().eq('id', id);
    if (error) {
      console.warn('Supabase dbDeleteLocation notice:', error.message);
    }
  } catch (err) {
    console.warn('Failed to delete location from Supabase:', err);
  }
}

// Vendor CRUD
export async function dbUpsertVendor(vendor: Vendor) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = vendorToDb(vendor);
    const { error } = await client.from('vendors').upsert(payload, { onConflict: 'id' });
    if (error) console.error('❌ Supabase vendors upsert error:', error);
  } catch (err) {
    console.warn('Failed to upsert vendor to Supabase:', err);
  }
}

export async function dbDeleteVendor(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    const { error } = await client.from('vendors').delete().eq('id', id);
    if (error) console.error('❌ Supabase vendors delete error:', error);
  } catch (err) {
    console.warn('Failed to delete vendor from Supabase:', err);
  }
}

// Department CRUD
export async function dbUpsertDepartment(dept: Department) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = departmentToDb(dept);

    // 1. Try upsert with onConflict on id
    const { error: upsertErr } = await client.from('departments').upsert(payload, { onConflict: 'id' });
    if (!upsertErr) return;

    // 2. Fallback: try update by id
    const { error: updateErr } = await client.from('departments').update(payload).eq('id', dept.id);
    if (!updateErr) return;

    // 3. Fallback: try update by department_name
    if (payload.department_name) {
      const { error: nameErr } = await client.from('departments').update(payload).eq('department_name', payload.department_name);
      if (nameErr) {
        console.warn('Supabase dbUpsertDepartment update notice:', nameErr.message);
      }
    }
  } catch (err) {
    console.warn('Failed to upsert department to Supabase:', err);
  }
}

export async function dbDeleteDepartment(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    const { error } = await client.from('departments').delete().eq('id', id);
    if (error) {
      console.warn('Supabase dbDeleteDepartment notice:', error.message);
    }
  } catch (err) {
    console.warn('Failed to delete department from Supabase:', err);
  }
}

// Pending Check-In Return Queue CRUD
export async function dbUpsertPendingCheckIn(pending: PendingCheckIn) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = pendingCheckInToDb(pending);
    const { error } = await client.from('pending_checkins').upsert(payload, { onConflict: 'id' });
    if (error) console.error('❌ Supabase pending_checkins upsert error:', error);
  } catch (err) {
    console.warn('Failed to upsert pending checkin to Supabase:', err);
  }
}

export async function dbDeletePendingCheckIn(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    const { error } = await client.from('pending_checkins').delete().eq('id', id);
    if (error) console.error('❌ Supabase pending_checkins delete error:', error);
  } catch (err) {
    console.warn('Failed to delete pending checkin from Supabase:', err);
  }
}

// Audit Log CRUD
export async function dbInsertAuditLog(log: AuditLog) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = auditLogToDb(log);
    const { error } = await client.from('audit_logs').upsert(payload, { onConflict: 'id' });
    if (error) {
      if (error.code === '23503') {
        const safePayload = { ...payload, user_id: null };
        await client.from('audit_logs').upsert(safePayload, { onConflict: 'id' });
        return;
      }
      console.error('❌ Supabase audit_logs upsert error:', error.message, '| Code:', error.code, '| Details:', error.details, '| Hint:', error.hint);
    }
  } catch (err) {
    console.warn('Failed to insert audit log to Supabase:', err);
  }
}

// User and Role CRUD (Synced directly with users & roles tables)
export async function dbUpsertRole(role: UserRole) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = roleToDb(role);
    await client.from('roles').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed to upsert role to Supabase:', err);
  }
}

export async function dbUpsertUser(user: User, passwordHash?: string, departments: Department[] = []) {
  const client = getSupabase();
  if (!client) return;
  try {
    const fullPayload = userToDb(user, passwordHash, departments);

    // 1. Try full upsert with onConflict on id
    const { error: upsertErr } = await client.from('users').upsert(fullPayload, { onConflict: 'id' });
    if (!upsertErr) return;

    // 2. Try update with full payload
    const { error: updateErr } = await client.from('users').update(fullPayload).eq('id', user.id);
    if (!updateErr) return;

    // 3. Fallback: try core columns matching Supabase users table schema
    const corePayload: any = {
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      password_hash: passwordHash || user.password || 'staff123',
      role_id: fullPayload.role_id,
      department_id: fullPayload.department_id,
      contact_number: user.contactNumber || user.phone || (user as any).contact_number || null,
      assigned_location_id: user.assignedLocationId || null,
      avatar_url: user.avatarUrl || null,
    };

    const { error: coreUpsertErr } = await client.from('users').upsert(corePayload, { onConflict: 'id' });
    if (!coreUpsertErr) return;

    const { error: coreUpdateErr } = await client.from('users').update(corePayload).eq('id', user.id);
    if (coreUpdateErr) {
      console.warn('Supabase dbUpsertUser notice:', coreUpdateErr.message);
    }
  } catch (err) {
    console.warn('Failed to upsert user to Supabase:', err);
  }
}

export async function dbDeleteUser(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    await client.from('users').delete().eq('id', id);
  } catch (err) {
    console.warn('Failed to delete user from Supabase:', err);
  }
}

// Purchase Order CRUD
export async function dbUpsertPurchaseOrder(po: PurchaseOrder) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = purchaseOrderToDb(po);
    await client.from('purchase_orders').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed to upsert purchase order to Supabase:', err);
  }
}

export async function dbDeletePurchaseOrder(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    await client.from('purchase_orders').delete().eq('id', id);
  } catch (err) {
    console.warn('Failed to delete purchase order from Supabase:', err);
  }
}

// Staff Registration Request CRUD
export async function dbUpsertRegistrationRequest(reg: UserRegistrationRequest) {
  const client = getSupabase();
  if (!client) return;
  try {
    const payload = registrationRequestToDb(reg);
    await client.from('registration_requests').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed to upsert registration request to Supabase:', err);
  }
}

export async function dbDeleteRegistrationRequest(id: string) {
  const client = getSupabase();
  if (!client) return;
  try {
    await client.from('registration_requests').delete().eq('id', id);
  } catch (err) {
    console.warn('Failed to delete registration request from Supabase:', err);
  }
}

// Purge & Wipe Utilities
export async function dbPurgeAuditLogs() {
  const client = getSupabase();
  if (!client) return;
  try {
    await client.from('audit_logs').delete().neq('id', '');
  } catch (err) {
    console.warn('Failed to purge audit logs in Supabase:', err);
  }
}

export async function dbWipeAllItems() {
  const client = getSupabase();
  if (!client) return;
  try {
    await client.from('items').delete().neq('id', '');
    await client.from('transactions').delete().neq('id', '');
    await client.from('pending_checkins').delete().neq('id', '');
  } catch (err) {
    console.warn('Failed to wipe inventory in Supabase:', err);
  }
}
