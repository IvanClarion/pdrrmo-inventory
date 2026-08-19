export type UserRoleName = 'Admin' | 'Inventory Manager' | 'Staff' | 'Auditor';

export interface GranularPermissions {
  canAddItems: boolean;
  canEditItems: boolean;
  canDeleteItems: boolean;
  canDeleteActiveCustody: boolean;
  canCheckOut: boolean;
  canCheckIn: boolean;
  canVerifyCheckIn: boolean;
  canViewCosts: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageLocations: boolean;
  canGeneratePOs: boolean;
  canViewReports: boolean;
  canPurgeAuditLogs: boolean;
}

export interface UserRole {
  id: string;
  name: UserRoleName;
  description: string;
  permissions: GranularPermissions;
  isSystemDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: UserRoleName;
  department: string;
  assignedLocationId?: string;
  avatarUrl?: string;
  userQrCode?: string;
  password?: string;
  pin?: string;
  quick_pin?: string;
  quickPin?: string;
  phone?: string;
  contactNumber?: string;
  contact_number?: string;
  position?: string;
}

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserRegistrationRequest {
  id: string;
  fullName: string;
  email: string;
  department: string;
  position?: string;
  contactNumber?: string;
  requestedRoleName?: UserRoleName;
  password?: string;
  pin?: string;
  avatarUrl?: string;
  avatar_url?: string;
  reasonOrNotes?: string;
  status: RegistrationStatus;
  submittedAt: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  assignedRoleName?: UserRoleName;
  assignedUserId?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  headName?: string;
  createdAt?: string;
}

export type LocationType = 'Warehouse' | 'Aisle' | 'Bin' | 'Department' | 'Vehicle';

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  parentLocationId?: string;
  capacity?: number;
  currentCount?: number;
}

export type ItemCondition = 'Good' | 'Fair' | 'Damaged' | 'Needs Maintenance';

export interface MaintenanceRecord {
  id: string;
  date: string;
  technician: string;
  notes: string;
  nextScheduledDate?: string;
  cost?: number;
}

export interface ItemBundleComponent {
  itemId: string;
  itemName: string;
  sku: string;
  barcode: string;
  quantity: number;
  unitPrice?: number;
  imageUrl?: string;
  isConsumable?: boolean;
}

export type ItemType = 'returnable' | 'consumable';

export interface Item {
  id: string;
  sku: string;
  barcode: string;
  barcodeType: 'UPC' | 'EAN13' | 'CODE128' | 'QR' | 'DATAMATRIX';
  name: string;
  category: string;
  description: string;
  quantity: number;
  reorderPoint: number;
  safetyStock: number;
  unitPrice: number;
  costPrice: number;
  locationId: string;
  locationName: string;
  vendorId: string;
  vendorName: string;
  manufacturerSerialNumber?: string;
  serialNumbers?: string[];
  batchLotNumber?: string;
  expiryDate?: string;
  expirationDate?: string;
  expirationTime?: string;
  condition: ItemCondition;
  maintenanceHistory?: MaintenanceRecord[];
  scheduledMaintenanceDate?: string;
  lastCheckedOutAt?: string;
  lastCheckedOutTo?: string;
  tags: string[];
  imageUrl?: string;
  pieceSkus?: string[];
  isLowStockMonitored?: boolean;
  isSetOrBundle?: boolean;
  bundleItems?: ItemBundleComponent[];
  supplierNotes?: string;
  type?: ItemType;
  isConsumable?: boolean;
  unitOfMeasure?: string;
}

export type ExpiryStatus =
  | 'EXPIRED'
  | 'EXPIRING_1_MONTH'
  | 'EXPIRING_3_MONTHS'
  | 'EXPIRING_6_MONTHS'
  | 'GOOD'
  | 'NO_EXPIRY';

export interface SkuFormatConfig {
  prefix: string;
  delimiter: string;
  includeCategoryCode: boolean;
  digitPadding: number;
  suffix?: string;
}

export interface DashboardTopMetricsConfig {
  totalValuation: boolean;
  lowStockAlerts: boolean;
  activeLoans: boolean;
  categoriesCount: boolean;
  totalMasterSkus?: boolean;
  totalPhysicalUnits?: boolean;
  setsAndBundles?: boolean;
  pendingReturns?: boolean;
  maintenanceDamaged?: boolean;
  activePurchaseOrders?: boolean;
  expiryAlerts?: boolean;
}

export interface DashboardWidgetConfig {
  showMetricCards: boolean;
  metricCards?: DashboardTopMetricsConfig;
  showQuickActions: boolean;
  showLowStockAlerts: boolean;
  showCategoryDistribution: boolean;
  showRecentTransactions: boolean;
  showHighValueItems: boolean;
  showPendingReturnsBanner: boolean;
  showExpiryBanner?: boolean;
}

export type PendingCheckInStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PendingCheckIn {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  barcode: string;
  quantity: number;
  locationId: string;
  locationName: string;
  condition: ItemCondition;
  notes?: string;
  signatureDataUrl?: string;
  submittedByUserId: string;
  submittedByUserName: string;
  submittedByUserRole: string;
  submittedAt: string;
  checkoutTxId?: string;
  status: PendingCheckInStatus;
  reviewedByUserName?: string;
  reviewedAt?: string;
  adminNotes?: string;
  rejectionReason?: string;
}

export type TransactionType = 'CHECK_OUT' | 'CHECK_IN' | 'ADJUSTMENT' | 'LOSS' | 'TRANSFER';

export interface Transaction {
  id: string;
  type: TransactionType;
  itemId: string;
  itemName: string;
  sku: string;
  barcode: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  userId: string;
  userName: string;
  userRole: string;
  locationId: string;
  locationName: string;
  assigneeOrProject?: string;
  condition?: ItemCondition;
  timestamp: string;
  notes?: string;
  signatureDataUrl?: string;
  syncedOffline?: boolean;
  serialNumber?: string;
  remainingOutQuantity?: number;
  isConsumable?: boolean;
}

export interface CheckOutFormItem {
  sku: string;
  barcode?: string;
  qrCode?: string;
  itemName: string;
  category?: string;
  quantity: number;
  condition: string;
  serialNumber?: string;
  unitPrice?: number;
  notes?: string;
  isSetOrBundle?: boolean;
  bundleItems?: ItemBundleComponent[];
  pieceSkus?: string[];
  isConsumable?: boolean;
  unitOfMeasure?: string;
}

export interface CheckOutFormData {
  formNumber: string;
  date: string;
  approvalDate?: string;
  approvalStatus?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientId?: string;
  recipientDepartment?: string;
  issuedByUserName: string;
  issuedByUserRole?: string;
  issuedByUserId?: string;
  issuedByUserEmail?: string;
  items: CheckOutFormItem[];
  notes?: string;
  signatureDataUrl?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  rating?: number;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantityRequested: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Received' | 'Cancelled';
  createdAt: string;
  expectedDeliveryDate: string;
  createdBy: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ScanResult {
  code: string;
  type: string;
  itemFound?: Item;
  scannedAt: string;
}

export interface BatchScanQueueItem {
  id: string;
  barcode: string;
  item?: Item;
  scannedAt: string;
  actionType: 'CHECK_OUT' | 'CHECK_IN' | 'AUDIT';
  quantity: number;
}

export type LogoPresetId =
  | 'shield-alert'
  | 'building-gov'
  | 'cube-box'
  | 'cross-aid'
  | 'truck-fast'
  | 'radio-wave'
  | 'flame-rescue'
  | 'anchor-port';

export interface OrgBrandingConfig {
  orgName: string;
  orgSubtitle: string;
  fullOfficeName: string;
  logoType: 'preset' | 'upload' | 'url';
  logoPresetId: LogoPresetId;
  customLogoUrl: string;
  badgeText: string;
  badgeBgColor: string;
}
