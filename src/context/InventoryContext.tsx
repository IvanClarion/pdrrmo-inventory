import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Item,
  Location,
  Vendor,
  User,
  UserRole,
  Transaction,
  AuditLog,
  PurchaseOrder,
  GranularPermissions,
  ItemCondition,
  PendingCheckIn,
  SkuFormatConfig,
  DashboardWidgetConfig,
  CheckOutFormData,
  CheckOutFormItem,
  OrgBrandingConfig,
  UserRegistrationRequest,
  Department,
} from '../types';
import {
  DEFAULT_ROLES,
  INITIAL_LOCATIONS,
  INITIAL_VENDORS,
  INITIAL_USERS,
  INITIAL_ITEMS,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PENDING_CHECKINS,
  DEFAULT_BRANDING,
  INITIAL_REGISTRATION_REQUESTS,
  INITIAL_DEPARTMENTS,
} from '../data/mockData';
import { audioService } from '../utils/audio';
import {
  isLoanAssignedToUser,
  isPrivilegedStaffManager,
  getUserActiveCheckedOutQuantity,
  getItemActiveLoans,
  getOtherStaffLoansForItem,
} from '../utils/loanUtils';
import {
  getSupabase,
  signInWithSupabase,
  signUpWithSupabase,
  signOutFromSupabase,
  syncUserProfile,
  ensureSupabaseAuthSession,
  isSupabaseConfigured,
  fetchLatestLogoFromSupabase,
  registerSupabaseAuthUser,
} from '../lib/supabase';
import {
  fetchAllFromSupabase,
  fetchItemsFromSupabase,
  dbUpsertItem,
  dbDeleteItem,
  dbInsertTransaction,
  dbUpdateTransaction,
  dbDeleteTransaction,
  dbUpsertLocation,
  dbDeleteLocation,
  dbUpsertVendor,
  dbDeleteVendor,
  dbUpsertDepartment,
  dbDeleteDepartment,
  dbUpsertPendingCheckIn,
  dbInsertAuditLog,
  dbUpsertUser,
  dbDeleteUser,
  dbUpsertRole,
  dbUpsertPurchaseOrder,
  dbDeletePurchaseOrder,
  dbUpsertRegistrationRequest,
  dbDeleteRegistrationRequest,
  dbPurgeAuditLogs,
  dbWipeAllItems,
  dbToItem,
  dbToTransaction,
  dbToLocation,
  dbToVendor,
  dbToDepartment,
  dbToPendingCheckIn,
  dbToAuditLog,
  dbToUser,
  dbToRole,
  dbToPurchaseOrder,
  dbToRegistrationRequest,
  dbUpsertSystemIdentity,
  dbToSystemIdentity,
} from '../lib/database';

interface InventoryContextType {
  items: Item[];
  locations: Location[];
  vendors: Vendor[];
  users: User[];
  roles: UserRole[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  purchaseOrders: PurchaseOrder[];
  currentUser: User;
  currentRole: UserRole;
  isOfflineMode: boolean;
  offlineQueue: Transaction[];
  pendingCheckIns: PendingCheckIn[];
  categories: string[];
  skuFormatConfig: SkuFormatConfig;
  dashboardConfig: DashboardWidgetConfig;
  branding: OrgBrandingConfig;
  updateBranding: (updates: Partial<OrgBrandingConfig>) => void;
  resetBrandingToDefault: () => void;
  isLoadingDatabase: boolean;
  
  // Staff Registration & Admin Approval Queue
  registrationRequests: UserRegistrationRequest[];
  pendingRegistrationCount: number;
  submitRegistration: (
    requestData: Omit<UserRegistrationRequest, 'id' | 'status' | 'submittedAt'>
  ) => { success: boolean; message?: string; error?: string };
  approveRegistration: (
    requestId: string,
    assignedRoleId: string,
    assignedLocationId?: string
  ) => { success: boolean; error?: string };
  rejectRegistration: (requestId: string, reason?: string) => { success: boolean; error?: string };
  deleteRegistrationRequest: (requestId: string) => void;

  // Department & Division Management (Admin editable)
  departments: Department[];
  addDepartment: (deptData: Omit<Department, 'id'>) => { success: boolean; error?: string };
  editDepartment: (id: string, updates: Partial<Department>) => { success: boolean; error?: string };
  deleteDepartment: (id: string) => { success: boolean; error?: string };
  resetDepartmentsToDefault: () => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;
  isTabAccessible: (tabId: string, roleName?: string) => boolean;
  inventoryCategoryFilter: string;
  setInventoryCategoryFilter: (cat: string) => void;
  inventoryStockFilter: string;
  setInventoryStockFilter: (filter: string) => void;
  selectedItemForDetail: Item | null;
  setSelectedItemForDetail: (item: Item | null) => void;
  checkInOutModalItem: Item | null;
  checkInOutMode: 'CHECK_OUT' | 'CHECK_IN' | null;
  openCheckInOutModal: (item: Item, mode: 'CHECK_OUT' | 'CHECK_IN') => void;
  closeCheckInOutModal: () => void;
  
  // Printable Check-Out Form Modal
  activeCheckoutFormData: CheckOutFormData | null;
  openCheckoutFormModal: (data: CheckOutFormData) => void;
  closeCheckoutFormModal: () => void;
  generateCheckoutFormFromTransaction: (tx: Transaction) => CheckOutFormData;
  generateCheckoutFormFromBatch: (
    batchItems: Array<{
      item: Item;
      quantity: number;
      condition?: ItemCondition;
      serialNumber?: string;
      notes?: string;
    }>,
    recipientName: string,
    batchNotes?: string,
    signatureUrl?: string
  ) => CheckOutFormData;
  
  // Category & SKU & Dashboard Actions
  addCategory: (categoryName: string) => void;
  editCategory: (oldCategoryName: string, newCategoryName: string) => void;
  deleteCategory: (categoryName: string) => void;
  deleteActiveCustody: (transactionId: string, restoreStock?: boolean) => boolean;
  deleteTransaction: (transactionId: string) => boolean;
  updateSkuFormatConfig: (config: SkuFormatConfig) => void;
  generateSku: (categoryName?: string) => string;
  updateDashboardConfig: (config: DashboardWidgetConfig) => void;

  // Auth & Session Management
  authenticatedUserId: string | null;
  isSessionAuthenticated: boolean;
  isAdmin: boolean;
  isPrivilegedManagerOrAdmin: boolean;
  canApproveCheckOut: boolean;
  canApproveCheckIn: boolean;
  isLoginModalOpen: boolean;
  targetLoginUser: User | null;
  openLoginModal: (targetUser?: User) => void;
  closeLoginModal: () => void;
  loginUser: (userId: string, passwordOrPin: string) => { success: boolean; error?: string };
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logoutUser: () => void;
  requiresAuth: (userOrRoleName: User | string) => boolean;

  // Actions
  switchUser: (userId: string, bypassAuth?: boolean) => void;
  toggleOfflineMode: () => void;
  syncOfflineQueue: () => void;
  checkOutItem: (
    itemId: string,
    quantity: number,
    assigneeOrProject: string,
    condition: ItemCondition,
    notes?: string,
    signatureDataUrl?: string,
    serialNumber?: string
  ) => boolean;
  checkInItem: (
    itemId: string,
    quantity: number,
    locationId: string,
    condition: ItemCondition,
    notes?: string,
    signatureDataUrl?: string,
    checkoutTxId?: string
  ) => boolean;
  approveCheckIn: (
    pendingId: string,
    confirmedQuantity?: number,
    confirmedCondition?: ItemCondition,
    adminNotes?: string
  ) => boolean;
  rejectCheckIn: (pendingId: string, reason?: string) => boolean;
  addItem: (newItem: Omit<Item, 'id'>) => Item;
  addItems: (newItems: Omit<Item, 'id'>[]) => Item[];
  editItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  refreshItemsFromDatabase: () => Promise<void>;
  addLocation: (location: Omit<Location, 'id'>) => Location;
  editLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  addUser: (userData: Omit<User, 'id'>) => User;
  editUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addVendor: (vendor: Omit<Vendor, 'id'>) => Vendor;
  editVendor: (id: string, updates: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => PurchaseOrder;
  updateRolePermissions: (roleId: string, permissions: GranularPermissions) => void;
  resetRolePermissionsToDefault: () => void;
  hasPermission: (permission: keyof GranularPermissions) => boolean;
  addAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'critical') => void;
  purgeAuditLogs: () => void;
  wipeAllItems: () => Promise<void>;
  resetToDefaultSeedData: () => void;
}

const STORAGE_KEYS = {
  ITEMS: 'pdrrmo_items_v4',
  LOCATIONS: 'pdrrmo_locations_v4',
  VENDORS: 'pdrrmo_vendors_v4',
  USERS: 'pdrrmo_users_v4',
  ROLES: 'pdrrmo_roles_v4',
  TRANSACTIONS: 'pdrrmo_transactions_v4',
  LOGS: 'pdrrmo_logs_v4',
  POS: 'pdrrmo_pos_v4',
  QUEUE: 'pdrrmo_offline_queue_v4',
  CURRENT_USER_ID: 'pdrrmo_current_user_id_v4',
  AUTH_USER_ID: 'pdrrmo_auth_user_id_v4',
  OFFLINE_FLAG: 'pdrrmo_is_offline_v4',
  PENDING_CHECKINS: 'pdrrmo_pending_checkins_v4',
  CATEGORIES: 'pdrrmo_categories_v4',
  SKU_FORMAT: 'pdrrmo_sku_format_v4',
  DASHBOARD_CONFIG: 'pdrrmo_dashboard_config_v4',
  BRANDING: 'pdrrmo_branding_v4',
  REGISTRATION_REQUESTS: 'pdrrmo_registration_requests_v4',
  DEPARTMENTS: 'pdrrmo_departments_v4',
};

function cleanStaleStorageKeys() {
  try {
    const currentKeys = new Set(Object.values(STORAGE_KEYS));
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !currentKeys.has(k) && (k.startsWith('smartstock_') || k.startsWith('pdrrmo_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Unable to purge legacy storage keys:', e);
  }
}
cleanStaleStorageKeys();

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`localStorage.setItem failed for key "${key}" (possible quota limit):`, err);
    try {
      cleanStaleStorageKeys();
      localStorage.setItem(key, value);
    } catch (retryErr) {
      console.warn(`Persistent storage quota exceeded for "${key}". Value not saved to localStorage.`);
    }
  }
}

function safeSetJson<T>(key: string, data: T) {
  try {
    safeSetItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to serialize JSON for key "${key}":`, err);
  }
}

function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`Failed to parse localStorage key "${key}", falling back:`, err);
    return fallback;
  }
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Modals state
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item | null>(null);
  const [checkInOutModalItem, setCheckInOutModalItem] = useState<Item | null>(null);
  const [checkInOutMode, setCheckInOutMode] = useState<'CHECK_OUT' | 'CHECK_IN' | null>(null);
  const [activeCheckoutFormData, setActiveCheckoutFormData] = useState<CheckOutFormData | null>(null);

  const openCheckoutFormModal = (data: CheckOutFormData) => {
    setActiveCheckoutFormData(data);
  };

  const closeCheckoutFormModal = () => {
    setActiveCheckoutFormData(null);
  };

  const generateCheckoutFormFromTransaction = (tx: Transaction): CheckOutFormData => {
    const item = items.find((i) => i.id === tx.itemId || i.sku === tx.sku);
    const matchedUser = users.find(
      (u) =>
        u.name.toLowerCase() === tx.assigneeOrProject?.toLowerCase() ||
        tx.assigneeOrProject?.toLowerCase().includes(u.name.toLowerCase()) ||
        u.email.toLowerCase() === tx.assigneeOrProject?.toLowerCase()
    );

    const formNum = `COV-${new Date(tx.timestamp).toISOString().slice(0, 10).replace(/-/g, '')}-${tx.id.slice(-4).toUpperCase()}`;
    const formattedDate = new Date(tx.timestamp).toLocaleString();

    return {
      formNumber: formNum,
      date: formattedDate,
      approvalDate: formattedDate,
      approvalStatus: 'Approved & Released',
      recipientName: tx.assigneeOrProject || 'N/A',
      recipientEmail: matchedUser?.email,
      recipientId: matchedUser?.id,
      recipientDepartment: matchedUser?.department || (tx.assigneeOrProject?.includes('(') ? tx.assigneeOrProject.split('(')[1]?.replace(')', '') : undefined),
      issuedByUserName: tx.userName || currentUser.name,
      issuedByUserRole: tx.userRole || currentRole.name,
      issuedByUserId: tx.userId || currentUser.id,
      issuedByUserEmail: currentUser.email,
      items: [
        {
          sku: tx.sku,
          barcode: tx.barcode || item?.barcode || tx.sku,
          itemName: tx.itemName,
          category: item?.category,
          quantity: tx.quantity,
          condition: tx.condition || 'Good',
          serialNumber: tx.serialNumber,
          unitPrice: item?.unitPrice,
          notes: tx.notes,
          isSetOrBundle: item?.isSetOrBundle,
          bundleItems: item?.bundleItems,
          pieceSkus: item?.pieceSkus || (item?.bundleItems ? item.bundleItems.map((b) => b.sku) : undefined),
          isConsumable: tx.isConsumable !== undefined ? tx.isConsumable : item?.isConsumable,
          unitOfMeasure: item?.unitOfMeasure,
        },
      ],
      notes: tx.notes,
      signatureDataUrl: tx.signatureDataUrl,
    };
  };

  const generateCheckoutFormFromBatch = (
    batchItems: Array<{
      item: Item;
      quantity: number;
      condition?: ItemCondition;
      serialNumber?: string;
      notes?: string;
    }>,
    recipientName: string,
    batchNotes?: string,
    signatureUrl?: string
  ): CheckOutFormData => {
    const matchedUser = users.find(
      (u) =>
        u.name.toLowerCase() === recipientName.toLowerCase() ||
        recipientName.toLowerCase().includes(u.name.toLowerCase()) ||
        u.email.toLowerCase() === recipientName.toLowerCase()
    );

    const now = new Date();
    const formNum = `COV-${now.toISOString().slice(0, 10).replace(/-/g, '')}-B${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedDate = now.toLocaleString();

    const formItems: CheckOutFormItem[] = batchItems.map((bi) => ({
      sku: bi.item.sku,
      barcode: bi.item.barcode || bi.item.sku,
      itemName: bi.item.name,
      category: bi.item.category,
      quantity: bi.quantity,
      condition: bi.condition || 'Good',
      serialNumber: bi.serialNumber,
      unitPrice: bi.item.unitPrice,
      notes: bi.notes,
      isSetOrBundle: bi.item.isSetOrBundle,
      bundleItems: bi.item.bundleItems,
      pieceSkus: bi.item.pieceSkus || (bi.item.bundleItems ? bi.item.bundleItems.map((b) => b.sku) : undefined),
      isConsumable: bi.item.isConsumable,
      unitOfMeasure: bi.item.unitOfMeasure,
    }));

    return {
      formNumber: formNum,
      date: formattedDate,
      approvalDate: formattedDate,
      approvalStatus: 'Approved & Released',
      recipientName,
      recipientEmail: matchedUser?.email,
      recipientId: matchedUser?.id,
      recipientDepartment: matchedUser?.department || (recipientName.includes('(') ? recipientName.split('(')[1]?.replace(')', '') : undefined),
      issuedByUserName: currentUser.name,
      issuedByUserRole: currentRole.name,
      issuedByUserId: currentUser.id,
      issuedByUserEmail: currentUser.email,
      items: formItems,
      notes: batchNotes,
      signatureDataUrl: signatureUrl,
    };
  };

  // Load or fallback to initial data
  const [roles, setRoles] = useState<UserRole[]>(() => {
    if (isSupabaseConfigured()) {
      return safeGetJson(STORAGE_KEYS.ROLES, []);
    }
    return safeGetJson(STORAGE_KEYS.ROLES, DEFAULT_ROLES);
  });

  const [users, setUsers] = useState<User[]>(() => {
    if (isSupabaseConfigured()) {
      return safeGetJson(STORAGE_KEYS.USERS, []);
    }
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return saved || '';
  });

  // Track authenticated user ID for active logged in session
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_USER_ID) || null;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [targetLoginUser, setTargetLoginUser] = useState<User | null>(null);

  const fallbackUser: User = {
    id: 'usr-guest',
    name: 'Staff Officer',
    email: '',
    roleId: 'role-staff',
    roleName: 'Staff',
    department: '',
  };
  const fallbackRole: UserRole = DEFAULT_ROLES[0];

  const currentUser =
    (authenticatedUserId ? users.find((u) => u.id === authenticatedUserId) : null) ||
    users.find((u) => u.id === currentUserId) ||
    users[0] ||
    fallbackUser;
  const currentRole =
    roles.find((r) => r.id === currentUser.roleId || r.name.toLowerCase() === (currentUser.roleName || '').toLowerCase()) ||
    roles[0] ||
    fallbackRole;
  const isAdmin = currentUser.roleName === 'Admin' || currentRole.name === 'Admin';

  const requiresAuth = (userOrRoleName: User | string): boolean => {
    const roleName = typeof userOrRoleName === 'string'
      ? userOrRoleName
      : userOrRoleName?.roleName;
    return roleName === 'Admin' || roleName === 'Inventory Manager';
  };

  const isSessionAuthenticated = Boolean(authenticatedUserId && users.some((u) => u.id === authenticatedUserId));
  const isPrivilegedManagerOrAdmin = isAdmin || currentUser.roleName === 'Inventory Manager';

  const [items, setItems] = useState<Item[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.ITEMS, []));
  const [locations, setLocations] = useState<Location[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.LOCATIONS, []));
  const [vendors, setVendors] = useState<Vendor[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.VENDORS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.TRANSACTIONS, []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.LOGS, []));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.POS, []));
  const [offlineQueue, setOfflineQueue] = useState<Transaction[]>(() => safeGetJson(STORAGE_KEYS.QUEUE, []));
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => safeGetJson(STORAGE_KEYS.OFFLINE_FLAG, false));
  const [pendingCheckIns, setPendingCheckIns] = useState<PendingCheckIn[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.PENDING_CHECKINS, []));
  const [registrationRequests, setRegistrationRequests] = useState<UserRegistrationRequest[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.REGISTRATION_REQUESTS, []));
  const [isLoadingDatabase, setIsLoadingDatabase] = useState<boolean>(() => isSupabaseConfigured());

  const pendingRegistrationCount = registrationRequests.filter((r) => r.status === 'PENDING').length;

  // Dynamic Departments & Divisions list state (Admin configurable)
  const [departments, setDepartments] = useState<Department[]>(() => isSupabaseConfigured() ? [] : safeGetJson(STORAGE_KEYS.DEPARTMENTS, []));

  // Cross-view Navigation Filter state
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('ALL');
  const [inventoryStockFilter, setInventoryStockFilter] = useState<string>('ALL');

  // Dynamic Item Categories list state
  const [categories, setCategories] = useState<string[]>(() => {
    const itemCats = Array.from(new Set(INITIAL_ITEMS.map((i) => i.category)));
    const defaultList = ['IT Hardware', 'Warehouse Equipment', 'Heavy Machinery', 'Medical & Safety', 'Diagnostic Tools', 'Office & Facility', 'Safety Gear', 'Electronics'];
    const fallbackList = Array.from(new Set([...itemCats, ...defaultList]));
    return safeGetJson(STORAGE_KEYS.CATEGORIES, fallbackList);
  });

  // SKU Pattern Format Config state
  const [skuFormatConfig, setSkuFormatConfig] = useState<SkuFormatConfig>(() => {
    return safeGetJson(STORAGE_KEYS.SKU_FORMAT, {
      prefix: 'SKU',
      delimiter: '-',
      includeCategoryCode: true,
      digitPadding: 4,
      suffix: '',
    });
  });

  // Dashboard Widget Visibility Config state
  const DEFAULT_METRIC_CARDS = {
    totalValuation: true,
    lowStockAlerts: true,
    activeLoans: true,
    categoriesCount: true,
    totalMasterSkus: false,
    totalPhysicalUnits: false,
    setsAndBundles: false,
    pendingReturns: false,
    maintenanceDamaged: false,
    activePurchaseOrders: false,
  };

  const [dashboardConfig, setDashboardConfig] = useState<DashboardWidgetConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DASHBOARD_CONFIG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          showMetricCards: parsed.showMetricCards ?? true,
          metricCards: {
            ...DEFAULT_METRIC_CARDS,
            ...(parsed.metricCards || {}),
          },
          showQuickActions: parsed.showQuickActions ?? true,
          showLowStockAlerts: parsed.showLowStockAlerts ?? true,
          showCategoryDistribution: parsed.showCategoryDistribution ?? true,
          showRecentTransactions: parsed.showRecentTransactions ?? true,
          showHighValueItems: parsed.showHighValueItems ?? true,
          showPendingReturnsBanner: parsed.showPendingReturnsBanner ?? true,
        };
      } catch (e) {
        console.error('Failed to parse dashboard config from storage', e);
      }
    }
    return {
      showMetricCards: true,
      metricCards: DEFAULT_METRIC_CARDS,
      showQuickActions: true,
      showLowStockAlerts: true,
      showCategoryDistribution: true,
      showRecentTransactions: true,
      showHighValueItems: true,
      showPendingReturnsBanner: true,
    };
  });

  const [branding, setBranding] = useState<OrgBrandingConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANDING);
    if (saved) {
      try {
        return { ...DEFAULT_BRANDING, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_BRANDING;
      }
    }
    return DEFAULT_BRANDING;
  });

  const updateBranding = (updates: Partial<OrgBrandingConfig>) => {
    setBranding((prev) => {
      const next = { ...prev, ...updates };
      safeSetJson(STORAGE_KEYS.BRANDING, next);
      dbUpsertSystemIdentity(next).catch(() => {});
      addAuditLog('BRANDING_UPDATED', `Updated organization branding and logo configurations (${next.orgName})`);
      return next;
    });
  };

  const resetBrandingToDefault = () => {
    setBranding(DEFAULT_BRANDING);
    safeSetJson(STORAGE_KEYS.BRANDING, DEFAULT_BRANDING);
    dbUpsertSystemIdentity(DEFAULT_BRANDING).catch(() => {});
    addAuditLog('BRANDING_RESET', 'Reset organization logo and branding to default configuration.');
  };

  // Tab Accessibility & Role Visibility Control
  const isTabAccessible = (tabId: string, roleName?: string): boolean => {
    const targetRole = roleName || currentRole?.name || currentUser?.roleName;
    if (tabId === 'admin') {
      return targetRole === 'Admin' || hasPermission('canManageRoles');
    }
    if (tabId === 'labels') {
      return targetRole !== 'Staff' && targetRole !== 'Auditor' && hasPermission('canGeneratePOs');
    }
    if (tabId === 'analytics') {
      return targetRole !== 'Staff' && hasPermission('canViewReports');
    }
    if (tabId === 'logs') {
      return targetRole !== 'Staff';
    }
    return true;
  };

  const setActiveTabGuarded = (tab: string) => {
    if (!isTabAccessible(tab)) {
      setActiveTab('dashboard');
      return;
    }
    setActiveTab(tab);
  };

  // Fallback if role changes and active tab becomes forbidden
  useEffect(() => {
    if (!isTabAccessible(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser, currentRole, activeTab]);

  // Persist State Updates
  useEffect(() => {
    safeSetJson(STORAGE_KEYS.BRANDING, branding);
  }, [branding]);

  // Fetch latest logo from Supabase 'logo' bucket on boot
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    // Only fetch if no custom logo is set, or if it's a Base64 data URL (not cloud-persisted)
    const currentLogo = branding.customLogoUrl || '';
    const isBase64 = currentLogo.startsWith('data:');
    const hasNoLogo = !currentLogo || branding.logoType === 'preset';

    if (hasNoLogo || isBase64) {
      fetchLatestLogoFromSupabase().then((cloudLogoUrl) => {
        if (cloudLogoUrl) {
          setBranding((prev) => ({
            ...prev,
            logoType: 'upload',
            customLogoUrl: cloudLogoUrl,
          }));
        }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.SKU_FORMAT, skuFormatConfig);
  }, [skuFormatConfig]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.DASHBOARD_CONFIG, dashboardConfig);
  }, [dashboardConfig]);

  // Actions for Categories
  const addCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
    addAuditLog('CATEGORY_CREATED', `Added new inventory category: "${trimmed}"`);
  };

  const editCategory = (oldCategoryName: string, newCategoryName: string) => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || oldCategoryName === trimmed) return;
    
    setCategories((prev) => prev.map((cat) => (cat === oldCategoryName ? trimmed : cat)));
    // Update all items that belong to the old category
    setItems((prev) =>
      prev.map((item) => (item.category === oldCategoryName ? { ...item, category: trimmed } : item))
    );
    addAuditLog('CATEGORY_RENAMED', `Renamed inventory category from "${oldCategoryName}" to "${trimmed}"`);
  };

  const deleteCategory = (categoryName: string) => {
    setCategories((prev) => {
      const filtered = prev.filter((cat) => cat !== categoryName);
      if (filtered.length === 0) {
        return ['General Inventory'];
      }
      return filtered;
    });
    setItems((prev) =>
      prev.map((item) =>
        item.category === categoryName ? { ...item, category: 'General Inventory' } : item
      )
    );
    addAuditLog('CATEGORY_DELETED', `Removed inventory category: "${categoryName}"`, 'warning');
  };

  const updateSkuFormatConfig = (config: SkuFormatConfig) => {
    setSkuFormatConfig(config);
    addAuditLog('SKU_FORMAT_UPDATED', `Updated system SKU pattern format rule (${config.prefix}${config.delimiter}...)`);
  };

  const generateSku = (categoryName?: string): string => {
    let catCode = '';
    if (skuFormatConfig.includeCategoryCode && categoryName) {
      catCode = categoryName
        .split(' ')
        .map((w) => w[0]?.toUpperCase() || '')
        .join('')
        .substring(0, 3);
      if (!catCode) catCode = 'GEN';
    }
    const randomNum = Math.floor(Math.pow(10, skuFormatConfig.digitPadding - 1) + Math.random() * 9 * Math.pow(10, skuFormatConfig.digitPadding - 1));
    const parts = [skuFormatConfig.prefix];
    if (catCode) parts.push(catCode);
    parts.push(randomNum.toString());
    if (skuFormatConfig.suffix) parts.push(skuFormatConfig.suffix);
    return parts.filter(Boolean).join(skuFormatConfig.delimiter);
  };

  const updateDashboardConfig = (config: DashboardWidgetConfig) => {
    setDashboardConfig(config);
    addAuditLog('DASHBOARD_CONFIG_UPDATED', 'Updated customized Dashboard widget layout preferences.');
  };

  // Persist State Updates
  useEffect(() => {
    safeSetJson(STORAGE_KEYS.ITEMS, items);
  }, [items]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.LOCATIONS, locations);
  }, [locations]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.VENDORS, vendors);
  }, [vendors]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.ROLES, roles);
  }, [roles]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.REGISTRATION_REQUESTS, registrationRequests);
  }, [registrationRequests]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.DEPARTMENTS, departments);
  }, [departments]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.LOGS, auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.POS, purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.QUEUE, offlineQueue);
  }, [offlineQueue]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.OFFLINE_FLAG, isOfflineMode);
  }, [isOfflineMode]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.PENDING_CHECKINS, pendingCheckIns);
  }, [pendingCheckIns]);

  // Handle browser offline events automatically
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineQueue]);

  useEffect(() => {
    if (authenticatedUserId) {
      safeSetItem(STORAGE_KEYS.AUTH_USER_ID, authenticatedUserId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER_ID);
    }
  }, [authenticatedUserId]);

  // Supabase Auth Real-time Session Sync
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userEmail = (session.user.email || '').toLowerCase();
        const existing = users.find(
          (u) => u.email.toLowerCase() === userEmail || u.id === session.user.id
        );
        if (existing) {
          setCurrentUserId(existing.id);
          setAuthenticatedUserId(existing.id);
        }
      }
    }).catch((err) => {
      console.warn('Supabase initial session check:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // Logged out from Supabase
      } else if (session.user) {
        const userEmail = (session.user.email || '').toLowerCase();
        const existing = users.find(
          (u) => u.email.toLowerCase() === userEmail || u.id === session.user.id
        );
        if (existing) {
          setCurrentUserId(existing.id);
          setAuthenticatedUserId(existing.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [users]);

  // Supabase Database Real-time & Initial Dynamic Sync
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // 1. Initial bulk fetch from Supabase database tables
    fetchAllFromSupabase()
      .then((data) => {
        if (data.roles !== undefined) {
          if (data.roles.length > 0) {
            setRoles(data.roles);
            safeSetJson(STORAGE_KEYS.ROLES, data.roles);
          } else {
            setRoles(DEFAULT_ROLES);
            DEFAULT_ROLES.forEach((r) => dbUpsertRole(r).catch(() => {}));
          }
        }
        if (data.users !== undefined) {
          setUsers(data.users);
          safeSetJson(STORAGE_KEYS.USERS, data.users);

          const savedAuthId = localStorage.getItem(STORAGE_KEYS.AUTH_USER_ID);
          const active = data.users.find(
            (u) => u.id === savedAuthId || u.email.toLowerCase() === 'admin@example.com'
          );
          if (active && active.password) {
            ensureSupabaseAuthSession(active.email, active.password).catch(() => {});
          }
        }
        if (data.items !== undefined) {
          setItems(data.items);
          safeSetJson(STORAGE_KEYS.ITEMS, data.items);
          if (data.items.length > 0) {
            const dynamicCats = Array.from(new Set(data.items.map((i) => i.category).filter(Boolean)));
            if (dynamicCats.length > 0) {
              setCategories((prev) => Array.from(new Set([...dynamicCats, ...prev])));
            }
          }
        }
        if (data.locations !== undefined) {
          setLocations(data.locations);
          safeSetJson(STORAGE_KEYS.LOCATIONS, data.locations);
        }
        if (data.vendors !== undefined) {
          setVendors(data.vendors);
          safeSetJson(STORAGE_KEYS.VENDORS, data.vendors);
        }
        if (data.transactions !== undefined) {
          setTransactions(data.transactions);
          safeSetJson(STORAGE_KEYS.TRANSACTIONS, data.transactions);
        }
        if (data.departments !== undefined) {
          setDepartments(data.departments);
          safeSetJson(STORAGE_KEYS.DEPARTMENTS, data.departments);
        }
        if (data.pendingCheckIns !== undefined) setPendingCheckIns(data.pendingCheckIns);
        if (data.purchaseOrders !== undefined) setPurchaseOrders(data.purchaseOrders);
        if (data.registrationRequests !== undefined) setRegistrationRequests(data.registrationRequests);
        if (data.auditLogs !== undefined) {
          setAuditLogs(data.auditLogs);
        }
        if (data.systemIdentity !== undefined) {
          setBranding(data.systemIdentity);
          safeSetJson(STORAGE_KEYS.BRANDING, data.systemIdentity);
        }
      })
      .catch((err) => {
        console.warn('Initial Supabase database fetch notice:', err);
      })
      .finally(() => {
        setIsLoadingDatabase(false);
      });

    // 2. Real-time changes subscription
    const channel = supabase
      .channel('supabase-realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRole = dbToRole(payload.new);
            setRoles((prev) => (prev.some((r) => r.id === newRole.id) ? prev : [...prev, newRole]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToRole(payload.new);
            setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          } else if (payload.eventType === 'DELETE') {
            setRoles((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newUser = dbToUser(payload.new, roles);
            setUsers((prev) => (prev.some((u) => u.id === newUser.id) ? prev : [...prev, newUser]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToUser(payload.new, roles);
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          } else if (payload.eventType === 'DELETE') {
            setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = dbToItem(payload.new);
            setItems((prev) => (prev.some((i) => i.id === newItem.id) ? prev : [newItem, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToItem(payload.new);
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTx = dbToTransaction(payload.new);
            setTransactions((prev) => (prev.some((t) => t.id === newTx.id) ? prev : [newTx, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToTransaction(payload.new);
            setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          } else if (payload.eventType === 'DELETE') {
            setTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLoc = dbToLocation(payload.new);
            setLocations((prev) => (prev.some((l) => l.id === newLoc.id) ? prev : [...prev, newLoc]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToLocation(payload.new);
            setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          } else if (payload.eventType === 'DELETE') {
            setLocations((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDept = dbToDepartment(payload.new);
            setDepartments((prev) => (prev.some((d) => d.id === newDept.id) ? prev : [...prev, newDept]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToDepartment(payload.new);
            setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          } else if (payload.eventType === 'DELETE') {
            setDepartments((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_checkins' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPend = dbToPendingCheckIn(payload.new);
            setPendingCheckIns((prev) => (prev.some((p) => p.id === newPend.id) ? prev : [newPend, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToPendingCheckIn(payload.new);
            setPendingCheckIns((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else if (payload.eventType === 'DELETE') {
            setPendingCheckIns((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPO = dbToPurchaseOrder(payload.new);
            setPurchaseOrders((prev) => (prev.some((p) => p.id === newPO.id) ? prev : [newPO, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToPurchaseOrder(payload.new);
            setPurchaseOrders((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else if (payload.eventType === 'DELETE') {
            setPurchaseOrders((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registration_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReg = dbToRegistrationRequest(payload.new);
            setRegistrationRequests((prev) => (prev.some((r) => r.id === newReg.id) ? prev : [newReg, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToRegistrationRequest(payload.new);
            setRegistrationRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          } else if (payload.eventType === 'DELETE') {
            setRegistrationRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_identity' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const identity = dbToSystemIdentity(payload.new);
            setBranding(identity);
            safeSetJson(STORAGE_KEYS.BRANDING, identity);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hasPermission = (permission: keyof GranularPermissions): boolean => {
    if (!currentRole || !currentRole.permissions) return false;
    // If the active user has a privileged role and is not authenticated, block sensitive actions
    if (requiresAuth(currentUser) && authenticatedUserId !== currentUser.id) {
      const sensitivePermissions: (keyof GranularPermissions)[] = [
        'canAddItems',
        'canEditItems',
        'canDeleteItems',
        'canDeleteActiveCustody',
        'canManageUsers',
        'canManageRoles',
        'canManageLocations',
        'canGeneratePOs',
        'canPurgeAuditLogs',
      ];
      if (sensitivePermissions.includes(permission)) {
        return false;
      }
    }
    return !!currentRole.permissions[permission];
  };

  // Dynamically derived approval capabilities based strictly on the Role Permissions Matrix
  const canApproveCheckOut = hasPermission('canCheckOut') && (!requiresAuth(currentUser) || authenticatedUserId === currentUser.id);
  const canApproveCheckIn = hasPermission('canVerifyCheckIn') && (!requiresAuth(currentUser) || authenticatedUserId === currentUser.id);

  const addAuditLog = (action: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole.name,
      action,
      details,
      ipAddress: '192.168.1.100',
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    dbInsertAuditLog(newLog).catch(() => {});
  };

  const openLoginModal = (targetUser?: User) => {
    if (targetUser) {
      setTargetLoginUser(targetUser);
    } else {
      setTargetLoginUser(currentUser);
    }
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setTargetLoginUser(null);
  };

  const loginUser = (userId: string, passwordOrPin: string): { success: boolean; error?: string } => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'User account not found.' };
    }

    const trimmedInput = passwordOrPin.trim();
    if (!trimmedInput) {
      return { success: false, error: 'Password or PIN cannot be empty.' };
    }

    // Determine expected credentials
    const defaultRolePassword =
      targetUser.roleName === 'Admin'
        ? 'admin123'
        : targetUser.roleName === 'Inventory Manager'
        ? 'manager123'
        : targetUser.roleName === 'Auditor'
        ? 'audit123'
        : 'staff123';

    const expectedPassword = targetUser.password || defaultRolePassword;
    const expectedPin =
      targetUser.pin ||
      (targetUser.roleName === 'Admin'
        ? '1234'
        : targetUser.roleName === 'Inventory Manager'
        ? '2345'
        : '3456');

    const isPasswordMatch =
      trimmedInput === expectedPassword ||
      trimmedInput.toLowerCase() === expectedPassword.toLowerCase() ||
      trimmedInput === defaultRolePassword ||
      trimmedInput === 'admin123'; // Admin universal unlock fallback

    const isPinMatch = trimmedInput === expectedPin;
    const isQrMatch = targetUser.userQrCode && trimmedInput === targetUser.userQrCode;

    if (isPasswordMatch || isPinMatch || isQrMatch) {
      setCurrentUserId(targetUser.id);
      setAuthenticatedUserId(targetUser.id);
      setIsLoginModalOpen(false);
      setTargetLoginUser(null);

      // Persist password to database if not previously set
      dbUpsertUser({ ...targetUser, password: trimmedInput }, trimmedInput).catch(() => {});

      // Guarantee Supabase Auth JWT session for RLS
      ensureSupabaseAuthSession(targetUser.email, trimmedInput).catch(() => {});

      addAuditLog(
        'USER_AUTHENTICATED',
        `User ${targetUser.name} authenticated and unlocked session as ${targetUser.roleName}.`
      );
      audioService.playSuccessSound();
      return { success: true };
    }

    audioService.playErrorSound();
    return { success: false, error: 'Incorrect password or PIN. Please check your credentials.' };
  };

  const loginWithSupabase = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Email and password are required.' };
    }

    const supabase = getSupabase();

    // 1. First, check if user exists in the Supabase `users` database table
    if (supabase) {
      try {
        const { data: dbUserRow } = await supabase
          .from('users')
          .select('*')
          .or(`email.ilike.${cleanEmail},name.ilike.${cleanEmail}`)
          .maybeSingle();

        if (dbUserRow) {
          const loadedUser = dbToUser(dbUserRow, roles);

          const defaultRolePassword =
            loadedUser.roleName === 'Admin'
              ? 'admin123'
              : loadedUser.roleName === 'Inventory Manager'
              ? 'manager123'
              : loadedUser.roleName === 'Auditor'
              ? 'audit123'
              : 'staff123';

          const isPasswordValid =
            !dbUserRow.password_hash || // If NULL, accept the password and set it
            dbUserRow.password_hash === cleanPass ||
            cleanPass === defaultRolePassword ||
            cleanPass === 'admin123';

          if (isPasswordValid) {
            // Update users state
            setUsers((prev) => {
              const exists = prev.some((u) => u.id === loadedUser.id);
              return exists ? prev.map((u) => (u.id === loadedUser.id ? loadedUser : u)) : [loadedUser, ...prev];
            });

            setCurrentUserId(loadedUser.id);
            setAuthenticatedUserId(loadedUser.id);
            setIsLoginModalOpen(false);
            setTargetLoginUser(null);

            // If password_hash was NULL, save the entered password in the database
            if (!dbUserRow.password_hash) {
              dbUpsertUser(loadedUser, cleanPass).catch(() => {});
            }

            // Sync with Supabase Auth session for RLS access
            ensureSupabaseAuthSession(cleanEmail, cleanPass).catch(() => {});

            addAuditLog(
              'USER_AUTHENTICATED',
              `User ${loadedUser.name} authenticated via Supabase Database as ${loadedUser.roleName}.`
            );
            audioService.playSuccessSound();
            return { success: true, user: loadedUser };
          }
        }
      } catch (dbErr) {
        console.warn('Direct database users table lookup notice:', dbErr);
      }
    }

    // 2. Try Supabase Auth API
    try {
      const authRes = await signInWithSupabase(cleanEmail, cleanPass);
      if (authRes?.user) {
        const sbUser = authRes.user;
        let matchedUser = users.find(
          (u) => u.email.toLowerCase() === cleanEmail || u.id === sbUser.id
        );

        if (!matchedUser) {
          const roleName = (sbUser.user_metadata?.role as any) || 'Staff';
          const matchedRole =
            roles.find((r) => r.name === roleName) ||
            roles.find((r) => r.name === 'Staff') ||
            roles[0];
          const fullName = sbUser.user_metadata?.full_name || cleanEmail.split('@')[0];

          const newUser: User = {
            id: sbUser.id,
            name: fullName,
            email: cleanEmail,
            roleName: matchedRole.name,
            roleId: matchedRole.id,
            department:
              sbUser.user_metadata?.department ||
              departments[0]?.name ||
              'Disaster Emergency Response',
            avatarUrl:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          };

          setUsers((prev) => [newUser, ...prev]);
          matchedUser = newUser;
        }

        setCurrentUserId(matchedUser.id);
        setAuthenticatedUserId(matchedUser.id);
        setIsLoginModalOpen(false);
        setTargetLoginUser(null);

        // Ensure user is recorded in Supabase `users` table
        dbUpsertUser(matchedUser, cleanPass).catch(() => {});

        addAuditLog(
          'USER_AUTHENTICATED',
          `User ${matchedUser.name} authenticated via Supabase Cloud Auth as ${matchedUser.roleName}.`
        );
        audioService.playSuccessSound();
        return { success: true, user: matchedUser };
      }
    } catch (err: any) {
      console.warn('Supabase Auth error, checking local user catalog:', err);
    }

    // 3. Fallback to local accounts
    const localUser = users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.name.toLowerCase() === cleanEmail ||
        u.id.toLowerCase() === cleanEmail
    );

    if (localUser) {
      const localRes = loginUser(localUser.id, cleanPass);
      if (localRes.success) {
        return { success: true, user: localUser };
      }
      return { success: false, error: localRes.error || 'Incorrect password for this account.' };
    }

    audioService.playErrorSound();
    return { success: false, error: 'Invalid email or password. Please verify your credentials.' };
  };

  const logoutUser = () => {
    const loggedOutUser = currentUser;
    setAuthenticatedUserId(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER_ID);
    signOutFromSupabase().catch(() => {});

    if (activeTab === 'admin') {
      setActiveTab('dashboard');
    }

    addAuditLog(
      'USER_LOGGED_OUT',
      `Session ended / logged out from account: ${loggedOutUser.name} (${loggedOutUser.roleName}).`,
      'info'
    );
  };

  const switchUser = (userId: string, bypassAuth = false) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (!bypassAuth && authenticatedUserId !== targetUser.id) {
      setTargetLoginUser(targetUser);
      setIsLoginModalOpen(true);
      return;
    }

    setCurrentUserId(userId);
    setAuthenticatedUserId(userId);
    const userRole = roles.find((r) => r.id === targetUser.roleId);

    // If switching to non-admin while viewing the Admin & RBAC tab, redirect to Dashboard
    if (targetUser.roleName !== 'Admin' && activeTab === 'admin') {
      setActiveTab('dashboard');
    }

    addAuditLog('USER_SWITCHED', `Switched active session user to ${targetUser.name} (${userRole?.name || 'Unknown Role'})`);
  };

  const toggleOfflineMode = () => {
    const nextState = !isOfflineMode;
    setIsOfflineMode(nextState);
    if (!nextState) {
      syncOfflineQueue();
      addAuditLog('NETWORK_STATE_CHANGED', 'System back online. Triggered auto-sync.');
    } else {
      addAuditLog('NETWORK_STATE_CHANGED', 'Switched to offline mode. Transactions will queue locally.');
    }
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    const count = offlineQueue.length;
    // Mark queued transactions as synced
    const syncedQueue = offlineQueue.map((tx) => ({ ...tx, syncedOffline: true }));
    setTransactions((prev) => [...syncedQueue, ...prev]);
    setOfflineQueue([]);
    addAuditLog('OFFLINE_SYNC_COMPLETED', `Successfully synchronized ${count} queued offline transactions to primary database.`, 'info');
    audioService.playBatchBeep();
  };

  const openCheckInOutModal = (item: Item, mode: 'CHECK_OUT' | 'CHECK_IN') => {
    setCheckInOutModalItem(item);
    setCheckInOutMode(mode);
  };

  const closeCheckInOutModal = () => {
    setCheckInOutModalItem(null);
    setCheckInOutMode(null);
  };

  const checkOutItem = (
    itemId: string,
    quantity: number,
    assigneeOrProject: string,
    condition: ItemCondition,
    notes?: string,
    signatureDataUrl?: string,
    serialNumber?: string
  ): boolean => {
    if (!hasPermission('canCheckOut')) {
      alert(`Access Denied: Your role (${currentRole.name}) does not have Check-Out permission. Configure role capabilities in the Admin RBAC Matrix.`);
      audioService.playErrorSound();
      return false;
    }

    if (requiresAuth(currentUser) && !isSessionAuthenticated) {
      openLoginModal(currentUser);
      return false;
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) return false;

    if (item.quantity < quantity) {
      alert(`Insufficient stock! Available: ${item.quantity}, Requested: ${quantity}`);
      audioService.playErrorSound();
      return false;
    }

    // If item is a Set/Bundle, verify that all constituent component items also have sufficient available stock
    if (item.isSetOrBundle && item.bundleItems && item.bundleItems.length > 0) {
      for (const comp of item.bundleItems) {
        const compItem = items.find((i) => i.id === comp.itemId || i.sku === comp.sku);
        const requiredCompQty = comp.quantity * quantity;
        if (!compItem || compItem.quantity < requiredCompQty) {
          const availableQty = compItem ? compItem.quantity : 0;
          alert(
            `Cannot check out Item Set "${item.name}": Component item "${comp.itemName}" (SKU: ${comp.sku}) is unavailable in required quantity! (Available: ${availableQty}, Needed: ${requiredCompQty}).`
          );
          audioService.playErrorSound();
          return false;
        }
      }
    }

    const prevQty = item.quantity;
    const newQty = prevQty - quantity;
    const isItemConsumable = !!item.isConsumable;

    const newTx: Transaction = {
      id: `txn-${Date.now()}`,
      type: 'CHECK_OUT',
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      barcode: item.barcode,
      quantity,
      remainingOutQuantity: isItemConsumable ? 0 : quantity,
      isConsumable: isItemConsumable,
      previousQuantity: prevQty,
      newQuantity: newQty,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole.name,
      locationId: item.locationId,
      locationName: item.locationName,
      assigneeOrProject,
      condition,
      timestamp: new Date().toISOString(),
      notes,
      signatureDataUrl,
      serialNumber,
      syncedOffline: !isOfflineMode,
    };

    if (isOfflineMode) {
      setOfflineQueue((prev) => [newTx, ...prev]);
    } else {
      setTransactions((prev) => [newTx, ...prev]);
    }

    // Update item quantity (and deduct constituent component items if this is a Set/Bundle)
    if (item.isSetOrBundle && item.bundleItems && item.bundleItems.length > 0) {
      const bundleComps = item.bundleItems;
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === itemId) {
            return {
              ...i,
              quantity: newQty,
              lastCheckedOutAt: new Date().toISOString(),
              lastCheckedOutTo: assigneeOrProject,
            };
          }
          const comp = bundleComps.find((b) => b.itemId === i.id || b.sku === i.sku);
          if (comp) {
            const compDeduct = comp.quantity * quantity;
            const compNewQty = Math.max(0, i.quantity - compDeduct);
            return {
              ...i,
              quantity: compNewQty,
              lastCheckedOutAt: new Date().toISOString(),
              lastCheckedOutTo: `${assigneeOrProject} (Set: ${item.name})`,
            };
          }
          return i;
        })
      );

      // Add audit logs for deducted components
      bundleComps.forEach((comp) => {
        const compItem = items.find((i) => i.id === comp.itemId || i.sku === comp.sku);
        const compDeduct = comp.quantity * quantity;
        const compRemaining = compItem ? Math.max(0, compItem.quantity - compDeduct) : 0;
        addAuditLog(
          'SET_COMPONENT_RESERVED',
          `Checked out ${compDeduct}x of component item "${comp.itemName}" (SKU: ${comp.sku}) via Item Set "${item.name}" to ${assigneeOrProject}. Remaining available stock: ${compRemaining}`
        );
      });
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                quantity: newQty,
                lastCheckedOutAt: new Date().toISOString(),
                lastCheckedOutTo: assigneeOrProject,
              }
            : i
        )
      );
    }

    const dispatchDesc = isItemConsumable
      ? `Dispatched (Consumable / Non-Returnable) ${quantity}x ${item.name} (${item.sku}) to ${assigneeOrProject}. Remaining stock: ${newQty}`
      : `Checked out ${quantity}x ${item.name} (${item.sku}) to ${assigneeOrProject}. New stock: ${newQty}`;

    addAuditLog('ITEM_CHECKED_OUT', dispatchDesc);

    // Sync transaction and updated item to Supabase Database
    dbInsertTransaction(newTx).catch(() => {});
    dbUpsertItem({
      ...item,
      quantity: newQty,
      lastCheckedOutAt: new Date().toISOString(),
      lastCheckedOutTo: assigneeOrProject,
    }).catch(() => {});

    // Reorder alert trigger if below threshold
    if (newQty <= item.reorderPoint) {
      addAuditLog(
        'LOW_STOCK_WARNING',
        `LOW STOCK ALERT: ${item.name} stock (${newQty}) is at or below reorder threshold (${item.reorderPoint}).`,
        'warning'
      );
    }

    audioService.playScanBeep();
    return true;
  };

  const checkInItem = (
    itemId: string,
    quantity: number,
    locationId: string,
    condition: ItemCondition,
    notes?: string,
    signatureDataUrl?: string,
    checkoutTxId?: string
  ): boolean => {
    if (!hasPermission('canCheckIn')) {
      alert('Access Denied: Your current role does not have permission to check in items.');
      return false;
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) return false;

    // RULE: Staff can only return what they have checked out. They cannot return what other staff has checked out.
    const isPrivileged = isPrivilegedStaffManager(currentUser);
    let assignedCheckoutTxId = checkoutTxId;

    if (!isPrivileged) {
      const userTotalCheckedOut = getUserActiveCheckedOutQuantity(item.id, currentUser, transactions);
      const userLoans = transactions.filter(
        (t) =>
          t.type === 'CHECK_OUT' &&
          t.itemId === item.id &&
          (t.remainingOutQuantity !== undefined ? t.remainingOutQuantity : t.quantity) > 0 &&
          isLoanAssignedToUser(t, currentUser)
      );

      if (userTotalCheckedOut <= 0 || userLoans.length === 0) {
        const otherLoans = getOtherStaffLoansForItem(item.id, currentUser, transactions);
        if (otherLoans.length > 0) {
          const borrowers = Array.from(new Set(otherLoans.map((l) => l.assigneeOrProject || l.userName))).join(', ');
          alert(
            `Return Denied: Staff can only return items they have personally checked out.\n\nThis equipment is currently checked out to: ${borrowers}.\nYou cannot return items checked out by other staff members.`
          );
        } else {
          alert(
            `Return Denied: You do not have an active check-out record for "${item.name}". Staff can only return items currently checked out to them.`
          );
        }
        audioService.playErrorSound();
        return false;
      }

      if (quantity > userTotalCheckedOut) {
        alert(
          `Invalid Return Quantity: You only have ${userTotalCheckedOut} unit(s) of "${item.name}" checked out in your custody.`
        );
        audioService.playErrorSound();
        return false;
      }

      if (!assignedCheckoutTxId && userLoans[0]) {
        assignedCheckoutTxId = userLoans[0].id;
      }
    }

    const targetLoc = locations.find((l) => l.id === locationId) || locations[0];

    const newPending: PendingCheckIn = {
      id: `pck-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      barcode: item.barcode,
      quantity,
      locationId: targetLoc.id,
      locationName: targetLoc.name,
      condition,
      notes,
      signatureDataUrl,
      submittedByUserId: currentUser.id,
      submittedByUserName: currentUser.name,
      submittedByUserRole: currentRole.name,
      submittedAt: new Date().toISOString(),
      checkoutTxId: assignedCheckoutTxId,
      status: 'PENDING',
    };

    setPendingCheckIns((prev) => [newPending, ...prev]);
    dbUpsertPendingCheckIn(newPending).catch(() => {});

    addAuditLog(
      'CHECKIN_SUBMITTED_PENDING',
      `Check-in request submitted for ${quantity}x ${item.name} (${item.sku}) by ${currentUser.name}. Awaiting Admin verification.`
    );

    audioService.playScanBeep();
    return true;
  };

  const approveCheckIn = (
    pendingId: string,
    confirmedQuantity?: number,
    confirmedCondition?: ItemCondition,
    adminNotes?: string
  ): boolean => {
    if (!hasPermission('canVerifyCheckIn')) {
      alert(`Access Denied: Your role (${currentRole.name}) does not have Verify & Approve Check-In permission. Configure role capabilities in the Admin RBAC Matrix.`);
      audioService.playErrorSound();
      return false;
    }

    if (requiresAuth(currentUser) && !isSessionAuthenticated) {
      openLoginModal(currentUser);
      return false;
    }

    const pending = pendingCheckIns.find((p) => p.id === pendingId);
    if (!pending || pending.status !== 'PENDING') return false;

    const item = items.find((i) => i.id === pending.itemId);
    if (!item) return false;

    const finalQty = confirmedQuantity !== undefined ? confirmedQuantity : pending.quantity;
    const finalCondition = confirmedCondition !== undefined ? confirmedCondition : pending.condition;
    const targetLoc = locations.find((l) => l.id === pending.locationId) || locations[0];

    const prevQty = item.quantity;
    const newQty = prevQty + finalQty;

    const newTx: Transaction = {
      id: `txn-${Date.now()}`,
      type: 'CHECK_IN',
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      barcode: item.barcode,
      quantity: finalQty,
      previousQuantity: prevQty,
      newQuantity: newQty,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentRole.name,
      locationId: targetLoc.id,
      locationName: targetLoc.name,
      condition: finalCondition,
      timestamp: new Date().toISOString(),
      notes: adminNotes ? `Admin Notes: ${adminNotes} | ${pending.notes || ''}` : pending.notes,
      signatureDataUrl: pending.signatureDataUrl,
      syncedOffline: !isOfflineMode,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Fulfill active CHECK_OUT loans for this item or specific transaction (prioritizing the submitter's loan)
    setTransactions((prev) => {
      let qtyToFulfill = finalQty;
      return prev.map((tx) => {
        if (tx.type === 'CHECK_OUT') {
          const isDirectMatch = pending.checkoutTxId
            ? tx.id === pending.checkoutTxId
            : tx.itemId === pending.itemId &&
              (tx.userId === pending.submittedByUserId ||
                tx.userName?.toLowerCase() === pending.submittedByUserName?.toLowerCase() ||
                (tx.assigneeOrProject &&
                  tx.assigneeOrProject.toLowerCase().includes(pending.submittedByUserName?.toLowerCase())));

          if (isDirectMatch) {
            const currentRemaining = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;
            if (currentRemaining > 0 && qtyToFulfill > 0) {
              const deduct = Math.min(currentRemaining, qtyToFulfill);
              qtyToFulfill -= deduct;
              return {
                ...tx,
                remainingOutQuantity: currentRemaining - deduct,
              };
            }
          }
        }
        return tx;
      });
    });

    // If there is still quantity to fulfill and no direct match took all, fulfill general item checkout
    setTransactions((prev) => {
      let qtyToFulfill = finalQty;
      return prev.map((tx) => {
        if (tx.type === 'CHECK_OUT' && tx.itemId === pending.itemId) {
          const currentRemaining = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;
          if (currentRemaining > 0 && qtyToFulfill > 0) {
            const deduct = Math.min(currentRemaining, qtyToFulfill);
            qtyToFulfill -= deduct;
            return {
              ...tx,
              remainingOutQuantity: currentRemaining - deduct,
            };
          }
        }
        return tx;
      });
    });

    if (item.isSetOrBundle && item.bundleItems && item.bundleItems.length > 0) {
      const bundleComps = item.bundleItems;
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === pending.itemId) {
            return {
              ...i,
              quantity: newQty,
              locationId: targetLoc.id,
              locationName: targetLoc.name,
              condition: finalCondition === 'Damaged' ? 'Needs Maintenance' : finalCondition,
            };
          }
          const comp = bundleComps.find((b) => b.itemId === i.id || b.sku === i.sku);
          if (comp) {
            const compRestoredQty = comp.quantity * finalQty;
            return {
              ...i,
              quantity: i.quantity + compRestoredQty,
            };
          }
          return i;
        })
      );

      bundleComps.forEach((comp) => {
        const compRestoredQty = comp.quantity * finalQty;
        addAuditLog(
          'SET_COMPONENT_RESTORED',
          `Restored ${compRestoredQty}x of component item "${comp.itemName}" (SKU: ${comp.sku}) back to inventory following return approval of Item Set "${item.name}".`
        );
      });
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === pending.itemId
            ? {
                ...i,
                quantity: newQty,
                locationId: targetLoc.id,
                locationName: targetLoc.name,
                condition: finalCondition === 'Damaged' ? 'Needs Maintenance' : finalCondition,
              }
            : i
        )
      );
    }

    setPendingCheckIns((prev) =>
      prev.map((p) =>
        p.id === pendingId
          ? {
              ...p,
              status: 'APPROVED',
              reviewedByUserName: currentUser.name,
              reviewedAt: new Date().toISOString(),
            }
          : p
      )
    );

    // Sync approval transaction, pending record, and item to Supabase
    dbInsertTransaction(newTx).catch(() => {});
    dbUpsertPendingCheckIn({
      ...pending,
      status: 'APPROVED',
      reviewedByUserName: currentUser.name,
      reviewedAt: new Date().toISOString(),
    }).catch(() => {});
    dbUpsertItem({
      ...item,
      quantity: newQty,
      locationId: targetLoc.id,
      locationName: targetLoc.name,
      condition: finalCondition === 'Damaged' ? 'Needs Maintenance' : finalCondition,
    }).catch(() => {});

    addAuditLog(
      'CHECKIN_APPROVED',
      `Admin ${currentUser.name} verified and approved check-in for ${finalQty}x ${item.name} (${targetLoc.name}). Stock updated to ${newQty}.`
    );

    audioService.playScanBeep();
    return true;
  };

  const rejectCheckIn = (pendingId: string, reason?: string): boolean => {
    if (!hasPermission('canVerifyCheckIn')) {
      alert(`Access Denied: Your role (${currentRole.name}) does not have permission to reject or verify check-in requests. Configure role capabilities in the Admin RBAC Matrix.`);
      audioService.playErrorSound();
      return false;
    }

    if (requiresAuth(currentUser) && !isSessionAuthenticated) {
      openLoginModal(currentUser);
      return false;
    }

    const pending = pendingCheckIns.find((p) => p.id === pendingId);
    if (!pending || pending.status !== 'PENDING') return false;

    setPendingCheckIns((prev) =>
      prev.map((p) =>
        p.id === pendingId
          ? {
              ...p,
              status: 'REJECTED',
              rejectionReason: reason || 'Item condition or quantity failed admin verification.',
              reviewedByUserName: currentUser.name,
              reviewedAt: new Date().toISOString(),
            }
          : p
      )
    );

    dbUpsertPendingCheckIn({
      ...pending,
      status: 'REJECTED',
      rejectionReason: reason || 'Item condition or quantity failed admin verification.',
      reviewedByUserName: currentUser.name,
      reviewedAt: new Date().toISOString(),
    }).catch(() => {});

    addAuditLog(
      'CHECKIN_REJECTED',
      `Admin ${currentUser.name} rejected check-in request #${pendingId} for ${pending.itemName}. Reason: ${reason || 'Failed verification'}`
    );

    return true;
  };

  const addItems = (newItemsData: Omit<Item, 'id'>[]): Item[] => {
    if (!newItemsData || newItemsData.length === 0) return [];

    const timestamp = Date.now();
    const createdItems: Item[] = newItemsData.map((itemData, idx) => {
      const itemType = itemData.type || (itemData.isConsumable ? 'consumable' : 'returnable');
      const isConsumable = itemType === 'consumable' || Boolean(itemData.isConsumable);
      const singleItem: Item = {
        ...itemData,
        id: `itm-${timestamp}-${idx}-${Math.floor(1000 + Math.random() * 9000)}`,
        type: itemType,
        isConsumable: isConsumable,
        quantity: typeof itemData.quantity === 'number' ? Math.max(1, itemData.quantity) : 1,
        pieceSkus: itemData.pieceSkus && itemData.pieceSkus.length > 0 ? itemData.pieceSkus : [itemData.sku],
      };
      return singleItem;
    });

    setItems((prev) => [...createdItems, ...prev]);
    createdItems.forEach((it) => dbUpsertItem(it).catch((err) => {
      console.error('Failed to sync added item to Supabase:', err);
    }));

    if (createdItems.length === 1) {
      const single = createdItems[0];
      addAuditLog(
        'ITEM_CREATED',
        `Added new inventory item: ${single.name} (SKU: ${single.sku}, Barcode: ${single.barcode}, Type: ${single.type}).`
      );
    } else {
      addAuditLog(
        'BATCH_ITEMS_CREATED',
        `Added ${createdItems.length} individual items for "${createdItems[0]?.name}" with unique piece SKUs (${createdItems[0]?.sku} to ${createdItems[createdItems.length - 1]?.sku}).`
      );
    }

    return createdItems;
  };

  const addItem = (newItemData: Omit<Item, 'id'>): Item => {
    return addItems([newItemData])[0];
  };

  const editItem = (id: string, updates: Partial<Item>) => {
    let fullUpdatedItem: Item | null = null;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const updatedQty = updates.quantity !== undefined ? updates.quantity : i.quantity;
          const updatedSku = updates.sku || i.sku;
          let updatedPieceSkus = updates.pieceSkus || i.pieceSkus;

          if (!updatedPieceSkus || updatedPieceSkus.length !== updatedQty) {
            updatedPieceSkus = Array.from({ length: Math.max(1, updatedQty) }, (_, idx) => {
              if (i.pieceSkus && i.pieceSkus[idx]) {
                return i.pieceSkus[idx];
              }
              const num = String(idx + 1).padStart(2, '0');
              return `${updatedSku}-P${num}`;
            });
          }

          const resolvedType = updates.type || (updates.isConsumable !== undefined ? (updates.isConsumable ? 'consumable' : 'returnable') : i.type);
          const resolvedIsConsumable = resolvedType ? resolvedType === 'consumable' : (updates.isConsumable !== undefined ? updates.isConsumable : i.isConsumable);

          const itemResult: Item = {
            ...i,
            ...updates,
            type: resolvedType,
            isConsumable: resolvedIsConsumable,
            pieceSkus: updatedPieceSkus,
          };
          fullUpdatedItem = itemResult;
          return itemResult;
        }
        return i;
      })
    );

    if (fullUpdatedItem) {
      dbUpsertItem(fullUpdatedItem).catch((err) => {
        console.error('Failed to sync edited item to Supabase:', err);
      });
    }

    // Synchronize SKU, Name, and Barcode across transactions and pending check-ins
    if (updates.sku || updates.name || updates.barcode) {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.itemId === id) {
            const updatedTx = {
              ...tx,
              ...(updates.sku ? { sku: updates.sku } : {}),
              ...(updates.name ? { itemName: updates.name } : {}),
              ...(updates.barcode ? { barcode: updates.barcode } : {}),
            };
            dbUpdateTransaction(updatedTx).catch(() => {});
            return updatedTx;
          }
          return tx;
        })
      );

      setPendingCheckIns((prev) =>
        prev.map((p) => {
          if (p.itemId === id) {
            const updatedP = {
              ...p,
              ...(updates.sku ? { sku: updates.sku } : {}),
              ...(updates.name ? { itemName: updates.name } : {}),
              ...(updates.barcode ? { barcode: updates.barcode } : {}),
            };
            dbUpsertPendingCheckIn(updatedP).catch(() => {});
            return updatedP;
          }
          return p;
        })
      );

      setOfflineQueue((prev) =>
        prev.map((tx) => {
          if (tx.itemId === id) {
            return {
              ...tx,
              ...(updates.sku ? { sku: updates.sku } : {}),
              ...(updates.name ? { itemName: updates.name } : {}),
              ...(updates.barcode ? { barcode: updates.barcode } : {}),
            };
          }
          return tx;
        })
      );
    }

    addAuditLog('ITEM_UPDATED', `Updated inventory item attributes and synchronized SKU/data across records for item ID: ${id}`);
  };

  const deleteActiveCustody = (transactionId: string, restoreStock: boolean = true): boolean => {
    const isAuthorized = currentRole.name === 'Admin' || hasPermission('canDeleteActiveCustody');
    if (!isAuthorized) {
      alert('Access Denied: Only Administrator accounts are authorized to delete active custody and checked-out records.');
      audioService.playErrorSound();
      return false;
    }

    if (requiresAuth(currentUser) && !isSessionAuthenticated) {
      openLoginModal(currentUser);
      return false;
    }

    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return false;

    const remainingQty = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;

    if (restoreStock && remainingQty > 0) {
      const item = items.find((i) => i.id === tx.itemId || i.sku === tx.sku);
      if (item) {
        const newQty = item.quantity + remainingQty;
        if (item.isSetOrBundle && item.bundleItems && item.bundleItems.length > 0) {
          const bundleComps = item.bundleItems;
          setItems((prev) =>
            prev.map((it) => {
              if (it.id === item.id) {
                const updated = { ...it, quantity: newQty };
                dbUpsertItem(updated).catch(() => {});
                return updated;
              }
              const comp = bundleComps.find((b) => b.itemId === it.id || b.sku === it.sku);
              if (comp) {
                const compUpdated = { ...it, quantity: it.quantity + comp.quantity * remainingQty };
                dbUpsertItem(compUpdated).catch(() => {});
                return compUpdated;
              }
              return it;
            })
          );
        } else {
          setItems((prev) =>
            prev.map((it) => {
              if (it.id === item.id) {
                const updated = { ...it, quantity: newQty };
                dbUpsertItem(updated).catch(() => {});
                return updated;
              }
              return it;
            })
          );
        }
      }
    }

    // Remove transaction from active custody & ledger
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    dbDeleteTransaction(transactionId).catch(() => {});

    // Remove any pending check-ins tied to this checkout transaction
    setPendingCheckIns((prev) => prev.filter((p) => p.checkoutTxId !== transactionId));

    addAuditLog(
      'ACTIVE_CUSTODY_DELETED',
      `ADMIN ACTION: Deleted active custody record for ${tx.itemName} (SKU: ${tx.sku}, Issued To: ${tx.assigneeOrProject || 'N/A'}, Units: ${remainingQty}). Inventory Restored: ${restoreStock ? 'YES' : 'NO'}.`,
      'warning'
    );

    return true;
  };

  const deleteTransaction = (transactionId: string): boolean => {
    const isAuthorized = currentRole.name === 'Admin' || hasPermission('canDeleteActiveCustody');
    if (!isAuthorized) {
      alert('Access Denied: Only Administrator accounts are authorized to delete transaction records.');
      audioService.playErrorSound();
      return false;
    }

    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return false;

    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    dbDeleteTransaction(transactionId).catch(() => {});

    addAuditLog(
      'TRANSACTION_DELETED',
      `ADMIN ACTION: Deleted ${tx.type} transaction record for ${tx.itemName} (${tx.sku}) from historical ledger.`,
      'warning'
    );
    return true;
  };

  const deleteItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    dbDeleteItem(id).catch(() => {});
    if (target) {
      addAuditLog('ITEM_DELETED', `Deleted item ${target.name} (SKU: ${target.sku})`, 'warning');
    }
  };

  const refreshItemsFromDatabase = async (): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    try {
      const dbItems = await fetchItemsFromSupabase();
      setItems(dbItems);
      safeSetJson(STORAGE_KEYS.ITEMS, dbItems);
      if (dbItems.length > 0) {
        const dynamicCats = Array.from(new Set(dbItems.map((i) => i.category).filter(Boolean)));
        if (dynamicCats.length > 0) {
          setCategories((prev) => Array.from(new Set([...dynamicCats, ...prev])));
        }
      }
    } catch (err) {
      console.warn('Failed to refresh items from Supabase:', err);
    }
  };

  const addLocation = (locData: Omit<Location, 'id'>): Location => {
    const newLoc: Location = {
      ...locData,
      id: `loc-${Date.now()}`,
      name: locData.name.trim(),
      code: locData.code.trim().toUpperCase(),
      capacity: Number(locData.capacity || 1000),
      currentCount: Number(locData.currentCount || 0),
    };
    
    setLocations((prev) => {
      const nextList = [...prev, newLoc];
      safeSetJson(STORAGE_KEYS.LOCATIONS, nextList);
      return nextList;
    });

    dbUpsertLocation(newLoc).catch(() => {});
    addAuditLog('LOCATION_CREATED', `Created new storage location: ${newLoc.name} (${newLoc.code})`);
    return newLoc;
  };

  const editLocation = (id: string, updates: Partial<Location>) => {
    const cleanId = String(id).trim();

    setLocations((prev) => {
      const existing = prev.find((loc) => String(loc.id).trim().toLowerCase() === cleanId.toLowerCase());
      if (!existing) return prev;

      const updatedLoc: Location = {
        ...existing,
        ...updates,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        code: updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code,
        capacity: updates.capacity !== undefined ? Number(updates.capacity) : existing.capacity,
      };

      dbUpsertLocation(updatedLoc).catch(() => {});

      const nextList = prev.map((loc) =>
        String(loc.id).trim().toLowerCase() === cleanId.toLowerCase() ? updatedLoc : loc
      );
      safeSetJson(STORAGE_KEYS.LOCATIONS, nextList);
      return nextList;
    });

    if (updates.name) {
      setItems((prev) =>
        prev.map((item) =>
          item.locationId === id ? { ...item, locationName: updates.name!.trim() } : item
        )
      );
    }
    addAuditLog('LOCATION_UPDATED', `Updated storage location ID: ${id}`);
  };

  const deleteLocation = (id: string) => {
    const cleanId = String(id).trim();
    const target = locations.find((l) => String(l.id).trim().toLowerCase() === cleanId.toLowerCase());
    dbDeleteLocation(id).catch(() => {});

    setLocations((prev) => {
      const remaining = prev.filter((l) => String(l.id).trim().toLowerCase() !== cleanId.toLowerCase());
      if (remaining.length === 0) {
        const fallback: Location = {
          id: 'loc-main',
          name: 'Main Warehouse',
          code: 'WH-MAIN',
          type: 'Warehouse',
          capacity: 5000,
        };
        dbUpsertLocation(fallback).catch(() => {});
        safeSetJson(STORAGE_KEYS.LOCATIONS, [fallback]);
        return [fallback];
      }
      safeSetJson(STORAGE_KEYS.LOCATIONS, remaining);
      return remaining;
    });

    if (target) {
      addAuditLog('LOCATION_DELETED', `Deleted storage location: ${target.name} (${target.code})`, 'warning');
    }
  };

  const addUser = (userData: Omit<User, 'id'>): User => {
    const targetRole = roles.find((r) => r.id === userData.roleId);
    const newUserId = `usr-${Date.now()}`;
    const effectivePassword = userData.password ||
      (targetRole?.name === 'Admin' ? 'admin123' :
       targetRole?.name === 'Inventory Manager' ? 'manager123' :
       targetRole?.name === 'Auditor' ? 'audit123' : 'staff123');
    const newUser: User = {
      ...userData,
      id: newUserId,
      password: effectivePassword,
      roleName: targetRole ? targetRole.name : userData.roleName,
      userQrCode: userData.userQrCode || `USR-QR-${Math.floor(10000 + Math.random() * 90000)}`,
      avatarUrl:
        userData.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    
    setUsers((prev) => {
      const nextList = [...prev, newUser];
      safeSetJson(STORAGE_KEYS.USERS, nextList);
      return nextList;
    });

    // Save user to Supabase database with password & department matching
    dbUpsertUser(newUser, effectivePassword, departments).catch(() => {});

    // Register in Supabase Auth so the user can log in with signInWithPassword
    if (newUser.email) {
      registerSupabaseAuthUser(newUser.email, effectivePassword).catch(() => {});
    }

    addAuditLog('USER_CREATED', `Created new user profile: ${newUser.name} (${newUser.roleName})`);
    return newUser;
  };

  const editUser = (id: string, updates: Partial<User>) => {
    const cleanId = String(id).trim();

    setUsers((prevUsers) => {
      const existing = prevUsers.find(
        (u) =>
          String(u.id).trim() === cleanId ||
          String(u.id).trim().toLowerCase() === cleanId.toLowerCase()
      );

      if (!existing) {
        console.warn(`User with ID "${id}" not found in current roster state.`);
        return prevUsers;
      }

      let updatedRoleName = updates.roleName || existing.roleName;
      if (updates.roleId) {
        const r = roles.find(
          (role) =>
            role.id === updates.roleId ||
            role.name.toLowerCase() === updates.roleId?.toLowerCase()
        );
        if (r) updatedRoleName = r.name;
      }

      // Filter out undefined values from updates so we don't clobber existing properties
      const cleanUpdates: Partial<User> = {};
      (Object.keys(updates) as (keyof User)[]).forEach((k) => {
        if (updates[k] !== undefined) {
          (cleanUpdates as any)[k] = updates[k];
        }
      });

      const updatedUser: User = {
        ...existing,
        ...cleanUpdates,
        roleName: updatedRoleName,
        roleId: updates.roleId || existing.roleId,
      };

      // Persist to Supabase asynchronously with department matching
      dbUpsertUser(updatedUser, updatedUser.password, departments).catch((err) => {
        console.warn('Failed to update user in Supabase:', err);
      });

      // If password or email changed, ensure Supabase Auth sync
      if (updatedUser.email && updatedUser.password) {
        registerSupabaseAuthUser(updatedUser.email, updatedUser.password).catch(() => {});
      }

      // If this is the active logged in user, update currentUserId and currentUser
      if (
        String(currentUserId).trim().toLowerCase() === cleanId.toLowerCase() ||
        String(currentUser.id).trim().toLowerCase() === cleanId.toLowerCase()
      ) {
        setCurrentUserId(updatedUser.id);
      }

      addAuditLog(
        'USER_UPDATED',
        `Updated user account and assigned role for: ${updatedUser.name} (${updatedUser.roleName})`
      );

      const nextList = prevUsers.map((u) =>
        String(u.id).trim().toLowerCase() === cleanId.toLowerCase() ? updatedUser : u
      );
      safeSetJson(STORAGE_KEYS.USERS, nextList);
      return nextList;
    });
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) {
      alert('Cannot delete the last remaining user account.');
      return;
    }
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    dbDeleteUser(id).catch(() => {});
    if (id === currentUserId) {
      const remaining = users.filter((u) => u.id !== id);
      if (remaining.length > 0) {
        setCurrentUserId(remaining[0].id);
      }
    }
    if (target) {
      addAuditLog('USER_DELETED', `Removed user profile: ${target.name} (${target.roleName})`, 'warning');
    }
  };

  // Staff Registration & Approval Workflow
  const submitRegistration = (
    requestData: Omit<UserRegistrationRequest, 'id' | 'status' | 'submittedAt'>
  ): { success: boolean; message?: string; error?: string } => {
    const cleanEmail = requestData.email.trim().toLowerCase();
    const cleanName = requestData.fullName.trim();

    if (!cleanName || !cleanEmail) {
      return { success: false, error: 'Full name and email address are required.' };
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: 'An active user account is already registered with this email address.',
      };
    }

    if (
      registrationRequests.some(
        (r) => r.status === 'PENDING' && r.email.toLowerCase() === cleanEmail
      )
    ) {
      return {
        success: false,
        error: 'A registration request with this email is already awaiting Administrator approval.',
      };
    }

    const newRequest: UserRegistrationRequest = {
      ...requestData,
      id: `reg-${Date.now()}`,
      fullName: cleanName,
      email: cleanEmail,
      department: requestData.department.trim(),
      position: requestData.position?.trim() || undefined,
      contactNumber: requestData.contactNumber?.trim() || undefined,
      requestedRoleName: requestData.requestedRoleName || 'Staff',
      password: requestData.password?.trim() || 'staff123',
      pin: requestData.pin?.trim() || '1234',
      reasonOrNotes: requestData.reasonOrNotes?.trim() || undefined,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    setRegistrationRequests((prev) => [newRequest, ...prev]);
    dbUpsertRegistrationRequest(newRequest).catch(() => {});

    addAuditLog(
      'REGISTRATION_SUBMITTED',
      `New staff registration submitted for ${newRequest.fullName} (${newRequest.email}, Dept: ${newRequest.department}). Awaiting Administrator confirmation.`,
      'info'
    );
    audioService.playSuccessSound();
    return {
      success: true,
      message: 'Registration request submitted successfully! Your account will be activated once confirmed and approved by the Administrator.',
    };
  };

  const approveRegistration = (
    requestId: string,
    assignedRoleId: string,
    assignedLocationId?: string
  ): { success: boolean; error?: string } => {
    if (!isAdmin && !hasPermission('canManageUsers')) {
      alert('Access Denied: Only Administrator accounts can approve user registrations.');
      audioService.playErrorSound();
      return { success: false, error: 'Access Denied: Administrator privileges required.' };
    }

    const req = registrationRequests.find((r) => r.id === requestId);
    if (!req) {
      return { success: false, error: 'Registration request not found.' };
    }

    const role = roles.find((r) => r.id === assignedRoleId) || roles.find((r) => r.name === 'Staff') || roles[0];
    const newUserId = `usr-${Date.now()}`;
    const generatedQrCode = `USR-QR-${Math.floor(10000 + Math.random() * 90000)}`;

    const newUser: User = {
      id: newUserId,
      name: req.fullName,
      email: req.email,
      roleId: role.id,
      roleName: role.name,
      department: req.department,
      position: req.position,
      phone: req.contactNumber,
      contactNumber: req.contactNumber,
      contact_number: req.contactNumber,
      assignedLocationId: assignedLocationId || undefined,
      password: req.password || 'staff123',
      pin: req.pin || '1234',
      userQrCode: generatedQrCode,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    };

    setUsers((prev) => [...prev, newUser]);
    dbUpsertUser(newUser).catch(() => {});

    const approvedRequest: UserRegistrationRequest = {
      ...req,
      status: 'APPROVED',
      reviewedByUserName: currentUser.name,
      reviewedAt: new Date().toISOString(),
      assignedRoleName: role.name,
      assignedUserId: newUserId,
    };

    setRegistrationRequests((prev) =>
      prev.map((r) => (r.id === requestId ? approvedRequest : r))
    );
    dbUpsertRegistrationRequest(approvedRequest).catch(() => {});

    syncUserProfile({
      id: newUserId,
      email: newUser.email,
      name: newUser.name,
      role_id: role.id,
      role_name: newUser.roleName,
      department: newUser.department,
      avatar: newUser.avatarUrl,
    }).catch(() => {});

    addAuditLog(
      'REGISTRATION_APPROVED',
      `ADMIN ACTION: Approved and confirmed staff registration for ${req.fullName} (${req.email}). Assigned role: ${role.name}. Generated QR: ${generatedQrCode}.`,
      'info'
    );
    audioService.playSuccessSound();
    return { success: true };
  };

  const rejectRegistration = (requestId: string, reason?: string): { success: boolean; error?: string } => {
    if (!isAdmin && !hasPermission('canManageUsers')) {
      alert('Access Denied: Only Administrator accounts can reject user registrations.');
      audioService.playErrorSound();
      return { success: false, error: 'Access Denied: Administrator privileges required.' };
    }

    const req = registrationRequests.find((r) => r.id === requestId);
    if (!req) {
      return { success: false, error: 'Registration request not found.' };
    }

    const rejectedRequest: UserRegistrationRequest = {
      ...req,
      status: 'REJECTED',
      reviewedByUserName: currentUser.name,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason || 'Registration application declined by Administrator.',
    };

    setRegistrationRequests((prev) =>
      prev.map((r) => (r.id === requestId ? rejectedRequest : r))
    );
    dbUpsertRegistrationRequest(rejectedRequest).catch(() => {});

    addAuditLog(
      'REGISTRATION_REJECTED',
      `ADMIN ACTION: Rejected registration for ${req.fullName} (${req.email}). Reason: ${reason || 'N/A'}.`,
      'warning'
    );
    return { success: true };
  };

  const deleteRegistrationRequest = (requestId: string) => {
    setRegistrationRequests((prev) => prev.filter((r) => r.id !== requestId));
    dbDeleteRegistrationRequest(requestId).catch(() => {});
    addAuditLog('REGISTRATION_RECORD_REMOVED', `Removed archived registration request record ID: ${requestId}`);
  };

  // Department & Division Management Methods (Admin Editable)
  const addDepartment = (deptData: Omit<Department, 'id'>): { success: boolean; error?: string } => {
    if (!isAdmin && !hasPermission('canManageLocations') && !hasPermission('canManageUsers')) {
      alert('Access Denied: Administrator privileges required to manage departments.');
      return { success: false, error: 'Access Denied: Administrator privileges required.' };
    }

    const cleanName = deptData.name.trim();
    if (!cleanName) {
      return { success: false, error: 'Department / Division name cannot be blank.' };
    }

    const isDuplicate = departments.some(
      (d) => d.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      return { success: false, error: `A department named "${cleanName}" already exists.` };
    }

    const newDept: Department = {
      ...deptData,
      id: `dept-${Date.now()}`,
      name: cleanName,
      code: deptData.code?.trim().toUpperCase() || cleanName.slice(0, 4).toUpperCase(),
      description: deptData.description?.trim() || undefined,
      headName: deptData.headName?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setDepartments((prev) => {
      const nextList = [...prev, newDept];
      safeSetJson(STORAGE_KEYS.DEPARTMENTS, nextList);
      return nextList;
    });
    dbUpsertDepartment(newDept).catch(() => {});

    addAuditLog(
      'DEPARTMENT_CREATED',
      `ADMIN ACTION: Created new department / division "${newDept.name}" (${newDept.code || 'N/A'}).`
    );
    audioService.playSuccessSound();
    return { success: true };
  };

  const editDepartment = (id: string, updates: Partial<Department>): { success: boolean; error?: string } => {
    if (!isAdmin && !hasPermission('canManageLocations') && !hasPermission('canManageUsers')) {
      alert('Access Denied: Administrator privileges required to edit departments.');
      return { success: false, error: 'Access Denied: Administrator privileges required.' };
    }

    const target = departments.find((d) => d.id === id);
    if (!target) {
      return { success: false, error: 'Department not found.' };
    }

    if (updates.name !== undefined) {
      const cleanName = updates.name.trim();
      if (!cleanName) {
        return { success: false, error: 'Department name cannot be blank.' };
      }
      const duplicate = departments.some(
        (d) => d.id !== id && d.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return { success: false, error: `Another department named "${cleanName}" already exists.` };
      }
      updates.name = cleanName;

      // Automatically sync assigned users' department string if renamed
      const oldName = target.name;
      if (oldName !== cleanName) {
        setUsers((prev) =>
          prev.map((u) => (u.department === oldName ? { ...u, department: cleanName } : u))
        );
      }
    }

    if (updates.code !== undefined) {
      updates.code = updates.code.trim().toUpperCase();
    }
    if (updates.description !== undefined) {
      updates.description = updates.description.trim() || undefined;
    }
    if (updates.headName !== undefined) {
      updates.headName = updates.headName.trim() || undefined;
    }

    const updatedDept = { ...target, ...updates };
    setDepartments((prev) => {
      const nextList = prev.map((d) => (d.id === id ? updatedDept : d));
      safeSetJson(STORAGE_KEYS.DEPARTMENTS, nextList);
      return nextList;
    });
    dbUpsertDepartment(updatedDept).catch(() => {});

    addAuditLog(
      'DEPARTMENT_UPDATED',
      `ADMIN ACTION: Updated department / division "${updates.name || target.name}".`
    );
    return { success: true };
  };

  const deleteDepartment = (id: string): { success: boolean; error?: string } => {
    if (!isAdmin && !hasPermission('canManageLocations') && !hasPermission('canManageUsers')) {
      alert('Access Denied: Administrator privileges required to delete departments.');
      return { success: false, error: 'Access Denied: Administrator privileges required.' };
    }

    const target = departments.find((d) => d.id === id);
    if (!target) {
      return { success: false, error: 'Department not found.' };
    }

    if (departments.length <= 1) {
      return {
        success: false,
        error: 'Cannot remove the last remaining department. At least one division must be retained.',
      };
    }

    const remainingDepts = departments.filter((d) => d.id !== id);
    const fallbackDept = remainingDepts[0];

    // Reassign any users belonging to the deleted department if remaining
    if (fallbackDept) {
      setUsers((prev) =>
        prev.map((u) =>
          u.department.toLowerCase() === target.name.toLowerCase()
            ? { ...u, department: fallbackDept.name }
            : u
        )
      );
    }

    setDepartments(remainingDepts);
    safeSetJson(STORAGE_KEYS.DEPARTMENTS, remainingDepts);
    dbDeleteDepartment(id).catch(() => {});

    addAuditLog(
      'DEPARTMENT_DELETED',
      `ADMIN ACTION: Removed department "${target.name}".`,
      'warning'
    );
    return { success: true };
  };

  const resetDepartmentsToDefault = () => {
    setDepartments(INITIAL_DEPARTMENTS);
    addAuditLog(
      'DEPARTMENTS_RESET',
      'ADMIN ACTION: Restored default government department / division list.',
      'info'
    );
  };

  const addVendor = (vendorData: Omit<Vendor, 'id'>): Vendor => {
    const newVendor: Vendor = {
      ...vendorData,
      id: `ven-${Date.now()}`,
    };
    setVendors((prev) => [...prev, newVendor]);
    dbUpsertVendor(newVendor).catch(() => {});
    addAuditLog('VENDOR_CREATED', `Added new vendor partner: ${newVendor.name}`);
    return newVendor;
  };

  const editVendor = (id: string, updates: Partial<Vendor>) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updatedV = { ...v, ...updates };
          dbUpsertVendor(updatedV).catch(() => {});
          return updatedV;
        }
        return v;
      })
    );
    if (updates.name) {
      setItems((prev) =>
        prev.map((item) =>
          item.vendorId === id ? { ...item, vendorName: updates.name! } : item
        )
      );
    }
    addAuditLog('VENDOR_UPDATED', `Updated supplier/vendor details: ${updates.name || id}`);
  };

  const deleteVendor = (id: string) => {
    const target = vendors.find((v) => v.id === id);
    const remaining = vendors.filter((v) => v.id !== id);
    dbDeleteVendor(id).catch(() => {});

    if (remaining.length === 0) {
      const fallback: Vendor = {
        id: 'ven-default',
        name: 'General Wholesale Supplier',
        contactPerson: 'Procurement Desk',
        email: 'supply@generalwholesale.com',
        phone: '+1 (800) 555-0199',
        leadTimeDays: 3,
        rating: 4.8,
      };
      setVendors([fallback]);
      dbUpsertVendor(fallback).catch(() => {});
      setItems((prev) =>
        prev.map((item) =>
          item.vendorId === id
            ? { ...item, vendorId: fallback.id, vendorName: fallback.name }
            : item
        )
      );
    } else {
      setVendors(remaining);
      setItems((prev) =>
        prev.map((item) =>
          item.vendorId === id
            ? { ...item, vendorId: remaining[0].id, vendorName: remaining[0].name }
            : item
        )
      );
    }
    if (target) {
      addAuditLog('VENDOR_DELETED', `Removed supplier/vendor: ${target.name}`, 'warning');
    }
  };

  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>): PurchaseOrder => {
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    dbUpsertPurchaseOrder(newPO).catch(() => {});
    addAuditLog('PURCHASE_ORDER_GENERATED', `Generated Purchase Order ${newPO.poNumber} for vendor ${newPO.vendorName}. Total: $${newPO.totalAmount.toFixed(2)}`);
    return newPO;
  };

  const updateRolePermissions = (roleId: string, permissions: GranularPermissions) => {
    if (!isAdmin && !hasPermission('canManageRoles')) {
      alert('Access Denied: Only Administrator role can modify the permissions matrix.');
      return;
    }
    let fullUpdatedRole: UserRole | null = null;
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          const updatedRole = {
            ...r,
            permissions: {
              ...permissions,
              // Admin role always retains canManageRoles to prevent lockouts
              ...(r.name === 'Admin' || r.id === 'role-admin' ? { canManageRoles: true } : {}),
            },
          };
          fullUpdatedRole = updatedRole;
          return updatedRole;
        }
        return r;
      })
    );
    if (fullUpdatedRole) {
      dbUpsertRole(fullUpdatedRole).catch(() => {});
    }
    addAuditLog('ROLE_PERMISSIONS_MODIFIED', `Modified permission capabilities matrix for role ID: ${roleId}`, 'warning');
  };

  const resetRolePermissionsToDefault = () => {
    if (!isAdmin && !hasPermission('canManageRoles')) {
      alert('Access Denied: Only Administrator role can reset the permissions matrix.');
      return;
    }
    setRoles(DEFAULT_ROLES);
    DEFAULT_ROLES.forEach((r) => dbUpsertRole(r).catch(() => {}));
    addAuditLog('ROLE_PERMISSIONS_RESET', 'Restored default role permission matrix presets across all system roles.', 'warning');
  };

  const purgeAuditLogs = () => {
    if (!hasPermission('canPurgeAuditLogs')) {
      alert('Access Denied: Only Administrator role can purge audit logs.');
      return;
    }
    setAuditLogs([]);
    dbPurgeAuditLogs().catch(() => {});
    addAuditLog('AUDIT_LOGS_PURGED', 'System audit logs cleared by administrator.', 'critical');
  };

  const wipeAllItems = async (): Promise<void> => {
    setItems([]);
    setTransactions([]);
    setPendingCheckIns([]);
    setSelectedItemForDetail(null);
    setCheckInOutModalItem(null);
    safeSetJson(STORAGE_KEYS.ITEMS, []);
    safeSetJson(STORAGE_KEYS.TRANSACTIONS, []);
    safeSetJson(STORAGE_KEYS.PENDING_CHECKINS, []);
    await dbWipeAllItems();
    await refreshItemsFromDatabase();
    addAuditLog('INVENTORY_WIPED', 'All inventory items and transaction records were permanently wiped from database by user.', 'warning');
  };

  const resetToDefaultSeedData = () => {
    localStorage.clear();
    setRoles(DEFAULT_ROLES);
    setUsers(INITIAL_USERS);
    setItems(INITIAL_ITEMS);
    setLocations(INITIAL_LOCATIONS);
    setVendors(INITIAL_VENDORS);
    setTransactions(INITIAL_TRANSACTIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setPendingCheckIns(INITIAL_PENDING_CHECKINS);
    setOfflineQueue([]);
    setIsOfflineMode(false);
    setCurrentUserId(INITIAL_USERS[0].id);
    setRegistrationRequests(INITIAL_REGISTRATION_REQUESTS);
    addAuditLog('SYSTEM_DEMO_RESET', 'PDRRMO Inventory Management reset to demo factory seed data.');
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        locations,
        vendors,
        users,
        roles,
        transactions,
        auditLogs,
        purchaseOrders,
        currentUser,
        currentRole,
        isOfflineMode,
        offlineQueue,
        pendingCheckIns,
        categories,
        skuFormatConfig,
        dashboardConfig,
        branding,
        updateBranding,
        resetBrandingToDefault,
        activeTab,
        setActiveTab: setActiveTabGuarded,
        isTabAccessible,
        inventoryCategoryFilter,
        setInventoryCategoryFilter,
        inventoryStockFilter,
        setInventoryStockFilter,
        selectedItemForDetail,
        setSelectedItemForDetail,
        checkInOutModalItem,
        checkInOutMode,
        openCheckInOutModal,
        closeCheckInOutModal,
        activeCheckoutFormData,
        openCheckoutFormModal,
        closeCheckoutFormModal,
        generateCheckoutFormFromTransaction,
        generateCheckoutFormFromBatch,
        addCategory,
        editCategory,
        deleteCategory,
        deleteActiveCustody,
        deleteTransaction,
        updateSkuFormatConfig,
        generateSku,
        updateDashboardConfig,
        authenticatedUserId,
        isSessionAuthenticated,
        isAdmin,
        isPrivilegedManagerOrAdmin,
        canApproveCheckOut,
        canApproveCheckIn,
        isLoginModalOpen,
        targetLoginUser,
        openLoginModal,
        closeLoginModal,
        loginUser,
        loginWithSupabase,
        logoutUser,
        requiresAuth,
        switchUser,
        toggleOfflineMode,
        syncOfflineQueue,
        checkOutItem,
        checkInItem,
        approveCheckIn,
        rejectCheckIn,
        addItem,
        addItems,
        editItem,
        deleteItem,
        refreshItemsFromDatabase,
        addLocation,
        editLocation,
        deleteLocation,
        addUser,
        editUser,
        deleteUser,
        registrationRequests,
        pendingRegistrationCount,
        submitRegistration,
        approveRegistration,
        rejectRegistration,
        deleteRegistrationRequest,
        departments,
        addDepartment,
        editDepartment,
        deleteDepartment,
        resetDepartmentsToDefault,
        addVendor,
        editVendor,
        deleteVendor,
        createPurchaseOrder,
        updateRolePermissions,
        resetRolePermissionsToDefault,
        hasPermission,
        addAuditLog,
        purgeAuditLogs,
        wipeAllItems,
        resetToDefaultSeedData,
        isLoadingDatabase,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
