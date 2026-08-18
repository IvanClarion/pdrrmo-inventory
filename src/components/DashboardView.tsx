import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { DashboardTopMetricsConfig, DashboardWidgetConfig, Item } from '../types';
import {
  Boxes,
  QrCode,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Tag,
  Zap,
  TrendingUp,
  FileCode,
  WifiOff,
  SlidersHorizontal,
  X,
  Package,
  Layers,
  Building2,
  DollarSign,
  ChevronRight,
  Eye,
  ShieldCheck,
  FolderOpen,
  AlertCircle,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const DEFAULT_METRICS: DashboardTopMetricsConfig = {
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

export const DashboardView: React.FC<{ onOpenPrdModal: () => void }> = ({ onOpenPrdModal }) => {
  const {
    items,
    transactions,
    offlineQueue,
    pendingCheckIns,
    categories,
    purchaseOrders,
    dashboardConfig,
    updateDashboardConfig,
    setActiveTab,
    setInventoryCategoryFilter,
    setInventoryStockFilter,
    setSelectedItemForDetail,
    openCheckInOutModal,
    isOfflineMode,
    currentUser,
    currentRole,
    hasPermission,
  } = useInventory();

  // Admin Dashboard Customization Modal State
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState<boolean>(false);
  const [customizeModalTab, setCustomizeModalTab] = useState<'metrics' | 'sections'>('metrics');
  const [tempWidgetConfig, setTempWidgetConfig] = useState<DashboardWidgetConfig>(dashboardConfig);

  const isAdmin = hasPermission('canManageRoles') || currentRole.name === 'Admin' || currentRole.id === 'role-admin' || hasPermission('canEditItems');

  // Metrics Data Computations
  const lowStockItems = items.filter((i) => i.isLowStockMonitored !== false && i.quantity <= i.reorderPoint);
  const totalValuationPHP = items
    .filter((i) => !i.isSetOrBundle)
    .reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const totalPhysicalUnits = items
    .filter((i) => !i.isSetOrBundle)
    .reduce((acc, i) => acc + i.quantity, 0);
  const setsAndBundlesCount = items.filter((i) => i.isSetOrBundle).length;
  const damagedOrMaintenanceItems = items.filter(
    (i) => i.condition === 'Damaged' || i.condition === 'Needs Maintenance' || (i.scheduledMaintenanceDate && new Date(i.scheduledMaintenanceDate) <= new Date())
  );
  const activePurchaseOrdersCount = purchaseOrders.filter((po) => po.status !== 'Received' && po.status !== 'Cancelled').length;

  const activeCheckedOutTxns = transactions.filter(
    (t) => t.type === 'CHECK_OUT' && (t.remainingOutQuantity === undefined ? t.quantity > 0 : t.remainingOutQuantity > 0)
  );
  const pendingVerificationCount = pendingCheckIns.filter((p) => p.status === 'PENDING').length;

  // Category counts (exclude item sets to prevent double-counting asset valuation)
  const categoryCounts = categories.map((cat) => {
    const matchingItems = items.filter((i) => i.category === cat);
    const count = matchingItems.length;
    const valuation = matchingItems
      .filter((i) => !i.isSetOrBundle)
      .reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    return { category: cat, count, valuation };
  });

  // Top high value items (exclude item sets from asset ranking)
  const highValueItems = items
    .filter((i) => !i.isSetOrBundle)
    .sort((a, b) => b.unitPrice * b.quantity - a.unitPrice * a.quantity)
    .slice(0, 5);

  const handleCardClick = (tab: string, catFilter: string = 'ALL', stockFilter: string = 'ALL') => {
    setInventoryCategoryFilter(catFilter);
    setInventoryStockFilter(stockFilter);
    setActiveTab(tab);
  };

  // Top Metric Card Definitions Catalog
  const METRIC_CARD_DEFINITIONS: Array<{
    id: keyof DashboardTopMetricsConfig;
    title: string;
    description: string;
    category: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    badgeText?: string;
    badgeClass?: string;
    hintText: string;
    getValue: () => string;
    onClick: () => void;
  }> = [
    {
      id: 'totalValuation',
      title: 'Total Assets Valuation',
      description: 'Current aggregate monetary value of all physical inventory in PHP (₱)',
      category: 'Financial',
      icon: DollarSign,
      iconBg: 'bg-emerald-50 text-emerald-600',
      badgeText: '+4.2% mo/mo',
      badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
      hintText: 'Click to open Analytics Report →',
      getValue: () => `₱${totalValuationPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      onClick: () => handleCardClick('analytics'),
    },
    {
      id: 'lowStockAlerts',
      title: 'Stock Safety Alerts',
      description: 'SKUs currently at or below their safety reorder threshold point',
      category: 'Inventory',
      icon: AlertTriangle,
      iconBg: 'bg-red-50 text-red-600',
      badgeText: 'Requires Reorder',
      badgeClass: 'text-red-700 bg-red-50 border border-red-200',
      hintText: 'Click to view Low Stock list →',
      getValue: () => `${lowStockItems.length} SKUs`,
      onClick: () => handleCardClick('inventory', 'ALL', 'LOW_STOCK'),
    },
    {
      id: 'activeLoans',
      title: 'Active Field Loans',
      description: 'Assets currently checked out to team members, vehicles, or projects',
      category: 'Operations',
      icon: ArrowRightLeft,
      iconBg: 'bg-blue-50 text-blue-600',
      badgeText: 'Deployed Out',
      badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200',
      hintText: 'Click to open Check-Out Terminal →',
      getValue: () => `${activeCheckedOutTxns.length} Items`,
      onClick: () => handleCardClick('checkinout'),
    },
    {
      id: 'categoriesCount',
      title: 'Active Categories',
      description: 'Distinct classification taxonomy groups organized in master inventory',
      category: 'Catalog',
      icon: Boxes,
      iconBg: 'bg-purple-50 text-purple-600',
      badgeText: 'Configured',
      badgeClass: 'text-purple-700 bg-purple-50 border border-purple-200',
      hintText: 'Click to view Inventory Master →',
      getValue: () => `${categories.length} Categories`,
      onClick: () => handleCardClick('inventory'),
    },
    {
      id: 'totalMasterSkus',
      title: 'Master Catalog SKUs',
      description: 'Total number of distinct inventory SKU items registered in database',
      category: 'Catalog',
      icon: Package,
      iconBg: 'bg-neutral-100 text-neutral-800',
      badgeText: 'Master Catalog',
      badgeClass: 'text-neutral-700 bg-neutral-100 border border-neutral-200',
      hintText: 'Click to view Master Catalog →',
      getValue: () => `${items.length} SKUs`,
      onClick: () => handleCardClick('inventory'),
    },
    {
      id: 'totalPhysicalUnits',
      title: 'Total Physical Units',
      description: 'Sum of all individual physical units across warehouse & field locations',
      category: 'Inventory',
      icon: Layers,
      iconBg: 'bg-indigo-50 text-indigo-600',
      badgeText: 'Physical Units',
      badgeClass: 'text-indigo-700 bg-indigo-50 border border-indigo-200',
      hintText: 'Click to browse all physical units →',
      getValue: () => `${totalPhysicalUnits} Units`,
      onClick: () => handleCardClick('inventory'),
    },
    {
      id: 'setsAndBundles',
      title: 'Equipment Sets & Kits',
      description: 'Pre-packaged kit bundles composed of multi-piece components',
      category: 'Operations',
      icon: Boxes,
      iconBg: 'bg-amber-50 text-amber-600',
      badgeText: 'Kits & Sets',
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
      hintText: 'Click to filter Sets & Bundles →',
      getValue: () => `${setsAndBundlesCount} Bundles`,
      onClick: () => handleCardClick('inventory'),
    },
    {
      id: 'pendingReturns',
      title: 'Pending Return Approvals',
      description: 'Return check-ins submitted by field staff waiting for Admin verification',
      category: 'Operations',
      icon: Clock,
      iconBg: 'bg-orange-50 text-orange-600',
      badgeText: 'Needs Inspection',
      badgeClass: 'text-orange-700 bg-orange-50 border border-orange-200',
      hintText: 'Click to verify pending returns →',
      getValue: () => `${pendingVerificationCount} Requests`,
      onClick: () => handleCardClick('checkinout'),
    },
    {
      id: 'maintenanceDamaged',
      title: 'Damaged & Maintenance',
      description: 'Items reported with damage, fair wear, or due for scheduled servicing',
      category: 'Condition',
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600',
      badgeText: 'Attention Needed',
      badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200',
      hintText: 'Click to inspect items →',
      getValue: () => `${damagedOrMaintenanceItems.length} Items`,
      onClick: () => handleCardClick('inventory'),
    },
    {
      id: 'activePurchaseOrders',
      title: 'Active Purchase Orders',
      description: 'Procurement orders currently in Draft, Sent, or Approved status',
      category: 'Financial',
      icon: Building2,
      iconBg: 'bg-cyan-50 text-cyan-600',
      badgeText: 'Procurement',
      badgeClass: 'text-cyan-700 bg-cyan-50 border border-cyan-200',
      hintText: 'Click to view PO Analytics →',
      getValue: () => `${activePurchaseOrdersCount} Orders`,
      onClick: () => handleCardClick('analytics'),
    },
  ];

  // Active metrics configuration resolution
  const activeMetricsConfig = {
    ...DEFAULT_METRICS,
    ...(dashboardConfig.metricCards || {}),
  };

  const visibleMetricCards = METRIC_CARD_DEFINITIONS.filter(
    (card) => activeMetricsConfig[card.id] === true
  );

  // Helper for modal metric updates
  const setMetricCardEnabled = (metricId: keyof DashboardTopMetricsConfig, enabled: boolean) => {
    const currentCards = {
      ...DEFAULT_METRICS,
      ...(tempWidgetConfig.metricCards || {}),
    };
    setTempWidgetConfig({
      ...tempWidgetConfig,
      metricCards: {
        ...currentCards,
        [metricId]: enabled,
      },
    });
  };

  const applyMetricPreset = (preset: 'default' | 'all' | 'ops' | 'financial' | 'none') => {
    let newCards: DashboardTopMetricsConfig;
    if (preset === 'default') {
      newCards = { ...DEFAULT_METRICS };
    } else if (preset === 'all') {
      newCards = {
        totalValuation: true,
        lowStockAlerts: true,
        activeLoans: true,
        categoriesCount: true,
        totalMasterSkus: true,
        totalPhysicalUnits: true,
        setsAndBundles: true,
        pendingReturns: true,
        maintenanceDamaged: true,
        activePurchaseOrders: true,
      };
    } else if (preset === 'ops') {
      newCards = {
        totalValuation: false,
        lowStockAlerts: true,
        activeLoans: true,
        categoriesCount: true,
        totalMasterSkus: true,
        totalPhysicalUnits: true,
        setsAndBundles: true,
        pendingReturns: true,
        maintenanceDamaged: true,
        activePurchaseOrders: false,
      };
    } else if (preset === 'financial') {
      newCards = {
        totalValuation: true,
        lowStockAlerts: true,
        activeLoans: true,
        categoriesCount: true,
        totalMasterSkus: false,
        totalPhysicalUnits: false,
        setsAndBundles: false,
        pendingReturns: false,
        maintenanceDamaged: false,
        activePurchaseOrders: true,
      };
    } else {
      newCards = {
        totalValuation: false,
        lowStockAlerts: false,
        activeLoans: false,
        categoriesCount: false,
        totalMasterSkus: false,
        totalPhysicalUnits: false,
        setsAndBundles: false,
        pendingReturns: false,
        maintenanceDamaged: false,
        activePurchaseOrders: false,
      };
    }

    setTempWidgetConfig({
      ...tempWidgetConfig,
      metricCards: newCards,
    });
  };

  const tempMetricsConfig = {
    ...DEFAULT_METRICS,
    ...(tempWidgetConfig.metricCards || {}),
  };

  const tempActiveCount = Object.values(tempMetricsConfig).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Welcome & Quick Action Hero Banner */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#F0F0F0] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider border border-[#E5E5E5]">
                Role: {currentRole.name}
              </span>
              {isOfflineMode && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Offline Queueing Active
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] tracking-tight">
              Welcome back, {currentUser.name}
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 font-normal">
              Monitoring <span className="font-bold text-[#1A1A1A]">{items.length} master SKUs</span> across <span className="font-bold text-[#1A1A1A]">{totalPhysicalUnits} total physical units</span>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => {
                  setTempWidgetConfig(dashboardConfig);
                  setCustomizeModalTab('metrics');
                  setIsCustomizeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#1A1A1A] font-bold text-xs shadow-2xs transition cursor-pointer"
                title="Admin: Configure Dashboard Cards"
              >
                <SlidersHorizontal className="w-4 h-4 text-gray-700" />
                <span>Customize Dashboard</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('scanner')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-green-400" />
              <span>Barcode Scanner</span>
            </button>

            <button
              onClick={onOpenPrdModal}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-bold transition cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-gray-600" />
              <span>PRD Specs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Check-Ins Return Verification Banner */}
      {dashboardConfig.showPendingReturnsBanner && pendingVerificationCount > 0 && (
        <div
          onClick={() => setActiveTab('checkinout')}
          className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-400 transition shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                {pendingVerificationCount} Pending Return Check-In Requests
              </h4>
              <p className="text-xs text-amber-800">
                Staff submitted field items requiring Admin inspection & approval before stock reintegration.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-3 py-1.5 rounded-xl">
            Review Now →
          </span>
        </div>
      )}

      {/* Top Metric Cards Section */}
      {dashboardConfig.showMetricCards && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Top Metric Cards
              </h3>
              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                {visibleMetricCards.length} of {METRIC_CARD_DEFINITIONS.length} Active
              </span>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setTempWidgetConfig(dashboardConfig);
                  setCustomizeModalTab('metrics');
                  setIsCustomizeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#1A1A1A] font-bold text-xs shadow-2xs transition cursor-pointer group"
                title="Admin: Choose which top metric cards to display"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500 group-hover:text-black transition" />
                <span>Choose Metric Cards</span>
              </button>
            )}
          </div>

          {visibleMetricCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visibleMetricCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={card.onClick}
                    className="bg-white border border-[#E5E5E5] hover:border-black cursor-pointer rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider truncate pr-2">
                          {card.title}
                        </p>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">{card.getValue()}</h3>
                        {card.badgeText && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${card.badgeClass}`}>
                            {card.badgeText}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 group-hover:text-black mt-3 block transition flex items-center justify-between">
                      <span>{card.hintText}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-black transition shrink-0" />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-white border border-dashed border-gray-300 rounded-2xl text-center space-y-2">
              <p className="text-sm font-bold text-gray-700">No Top Metric Cards Selected</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                All metric cards are currently hidden. Choose which KPIs to display on your dashboard.
              </p>
              {isAdmin && (
                <button
                  onClick={() => {
                    setTempWidgetConfig(dashboardConfig);
                    setCustomizeModalTab('metrics');
                    setIsCustomizeModalOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Choose Cards to Display</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Workflows Bar */}
          {dashboardConfig.showQuickActions && (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-[#1A1A1A] text-sm uppercase tracking-wider">Quick Operational Workflows</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab('scanner')}
                  className="p-4 rounded-xl bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] text-left transition space-y-2 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <span className="font-bold text-[#1A1A1A] text-xs block">Scan Barcode</span>
                    <span className="text-[10px] text-gray-400 font-medium block">Camera / Hardware Gun</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (items[0]) openCheckInOutModal(items[0], 'CHECK_OUT');
                  }}
                  className="p-4 rounded-xl bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] text-left transition space-y-2 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#1A1A1A] text-xs block">Check Out</span>
                    <span className="text-[10px] text-gray-400 font-medium block">Assign User / Project</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (items[0]) openCheckInOutModal(items[0], 'CHECK_IN');
                  }}
                  className="p-4 rounded-xl bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] text-left transition space-y-2 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#1A1A1A] text-xs block">Check In</span>
                    <span className="text-[10px] text-gray-400 font-medium block">Condition Inspection</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('labels')}
                  className="p-4 rounded-xl bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] text-left transition space-y-2 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#1A1A1A] text-xs block">Print Labels</span>
                    <span className="text-[10px] text-gray-400 font-medium block">Avery / Zebra Barcodes</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Category Distribution Breakdown */}
          {dashboardConfig.showCategoryDistribution && (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Category Distribution (Click to Filter Inventory)</span>
                </h3>
                <button
                  onClick={() => handleCardClick('inventory')}
                  className="text-xs text-black hover:underline font-bold"
                >
                  View All Categories →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categoryCounts.map(({ category, count, valuation }) => (
                  <div
                    key={category}
                    onClick={() => handleCardClick('inventory', category)}
                    className="p-3.5 rounded-xl bg-[#F9F9F9] hover:bg-[#F0F0F0] border border-[#E5E5E5] hover:border-black cursor-pointer transition text-xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1A1A1A] truncate">{category}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-black transition shrink-0" />
                    </div>
                    <p className="text-[11px] text-blue-700 font-bold">{count} SKUs Registered</p>
                    <p className="text-[10px] text-gray-400">Valuation: ₱{valuation.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Items Action Card */}
          {dashboardConfig.showLowStockAlerts && (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Low Stock Safety Reorder Alerts ({lowStockItems.length})</span>
                </h3>
                <button
                  onClick={() => handleCardClick('inventory', 'ALL', 'LOW_STOCK')}
                  className="text-xs text-red-600 hover:underline font-bold"
                >
                  Manage Stock Levels →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemForDetail(item)}
                    className="p-3.5 rounded-xl bg-red-50/50 hover:bg-red-50 border border-red-200 cursor-pointer transition text-xs flex justify-between items-center group"
                  >
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] truncate max-w-[140px] group-hover:text-red-700">{item.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-600 block">{item.quantity} Left</span>
                      <span className="text-[10px] text-gray-400">Reorder at: {item.reorderPoint}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top High-Value Inventory Catalog */}
          {dashboardConfig.showHighValueItems && (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>Top High-Value Assets</span>
                </h3>
                <span className="text-xs text-gray-400 font-medium">Click row for Item Inspector</span>
              </div>

              <div className="space-y-2">
                {highValueItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemForDetail(item)}
                    className="p-3 rounded-xl bg-[#F9F9F9] hover:bg-gray-100 border border-[#E5E5E5] cursor-pointer transition text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                      <div>
                        <h4 className="font-bold text-[#1A1A1A]">{item.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono">SKU: {item.sku} | Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#1A1A1A] block">₱{(item.unitPrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[10px] text-gray-400">₱{item.unitPrice.toLocaleString('en-PH')} / unit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Dark Scanner Quick Launch Tile */}
          <div className="bg-[#151619] rounded-3xl p-6 text-white flex flex-col items-center text-center shadow-xl border border-[#2D2E32]">
            <div className="w-14 h-14 bg-[#2D2E32] rounded-2xl flex items-center justify-center mb-4 border border-[#3D3E42]">
              <QrCode className="w-7 h-7 text-green-400" />
            </div>
            <h5 className="font-bold text-lg mb-1 text-white">Live Barcode Terminal</h5>
            <p className="text-xs text-gray-400 mb-5">Scan barcodes or QR codes for fast checkout & condition verification.</p>
            <button
              onClick={() => setActiveTab('scanner')}
              className="w-full py-3 bg-white text-black font-bold text-xs rounded-2xl hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
            >
              Open Camera Scanner
            </button>
            <p className="text-[10px] text-gray-500 mt-3 tracking-widest uppercase font-bold">Gun Scanner Auto-Detect Active</p>
          </div>

          {/* Recent Movement Activity Feed */}
          {dashboardConfig.showRecentTransactions && (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                <h3 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Recent Activity Feed</span>
                </h3>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black"
                >
                  View Logs
                </button>
              </div>

              <div className="space-y-2.5">
                {transactions.slice(0, 5).map((tx) => {
                  const matchingItem = items.find((i) => i.id === tx.itemId);
                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (matchingItem) setSelectedItemForDetail(matchingItem);
                      }}
                      className="p-3 rounded-xl bg-[#F9F9F9] hover:bg-gray-100 border border-[#E5E5E5] cursor-pointer transition text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === 'CHECK_OUT'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-green-50 text-green-600'
                          }`}
                        >
                          {tx.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="font-bold text-[#1A1A1A] truncate">{tx.itemName}</h4>
                      <p className="text-[10px] text-gray-500">
                        By <span className="font-medium text-[#1A1A1A]">{tx.userName}</span> ({tx.userRole})
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Dashboard Configuration Modal */}
      {isCustomizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-[#F5F5F5] border-b border-[#E5E5E5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-base">Customize Dashboard</h3>
                  <p className="text-[11px] text-gray-500">Choose which Top Metric Cards and modular sections are visible</p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="p-1.5 rounded-lg bg-white text-gray-500 hover:text-black border border-[#E5E5E5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-[#E5E5E5] bg-white">
              <button
                onClick={() => setCustomizeModalTab('metrics')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  customizeModalTab === 'metrics'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Top Metric Cards</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                  {tempActiveCount}/{METRIC_CARD_DEFINITIONS.length}
                </span>
              </button>

              <button
                onClick={() => setCustomizeModalTab('sections')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  customizeModalTab === 'sections'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Modular Sections</span>
              </button>
            </div>

            {/* Modal Tab Content Area */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              {customizeModalTab === 'metrics' ? (
                <div className="space-y-4">
                  {/* Presets Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-neutral-50 border border-[#E5E5E5]">
                    <span className="text-[11px] font-bold text-gray-600">Quick Presets:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyMetricPreset('default')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E5E5] hover:bg-gray-100 text-[#1A1A1A] font-bold text-[11px] transition cursor-pointer"
                      >
                        Default (4 Cards)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMetricPreset('all')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E5E5] hover:bg-gray-100 text-[#1A1A1A] font-bold text-[11px] transition cursor-pointer"
                      >
                        Show All (10)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMetricPreset('ops')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E5E5] hover:bg-gray-100 text-[#1A1A1A] font-bold text-[11px] transition cursor-pointer"
                      >
                        Warehouse & Operations
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMetricPreset('financial')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E5E5] hover:bg-gray-100 text-[#1A1A1A] font-bold text-[11px] transition cursor-pointer"
                      >
                        Financial & POs
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMetricPreset('none')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E5E5] hover:bg-red-50 text-red-600 font-bold text-[11px] transition cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs">
                    Select which KPI metric cards to display at the top of the dashboard. Click any card row to toggle visibility:
                  </p>

                  {/* Metric Cards List */}
                  <div className="space-y-2.5">
                    {METRIC_CARD_DEFINITIONS.map((def) => {
                      const isEnabled = tempMetricsConfig[def.id] === true;
                      const Icon = def.icon;
                      return (
                        <label
                          key={def.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                            isEnabled
                              ? 'bg-white border-black shadow-xs ring-1 ring-black/5'
                              : 'bg-[#F9F9F9] border-[#E5E5E5] hover:bg-gray-50 opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => setMetricCardEnabled(def.id, e.target.checked)}
                              className="rounded border-gray-300 w-4 h-4 accent-black cursor-pointer shrink-0"
                            />
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${def.iconBg}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1A1A1A] text-xs truncate">{def.title}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {def.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 truncate">{def.description}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-3">
                            <span className="font-bold text-[#1A1A1A] text-xs block font-mono">{def.getValue()}</span>
                            <span className={`text-[10px] font-bold ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                              {isEnabled ? '✓ Displayed' : 'Hidden'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500">
                    Toggle major modular section blocks on the main Dashboard view:
                  </p>

                  {[
                    { key: 'showMetricCards', label: 'Top KPI Metric Cards Section (Master Toggle)', desc: 'Display top row of KPI metric cards' },
                    { key: 'showQuickActions', label: 'Quick Operational Workflows Shortcuts', desc: 'Shortcuts to Scan, Check-Out, Check-In, Print Labels' },
                    { key: 'showLowStockAlerts', label: 'Low Stock Safety Reorder Alerts Card', desc: 'Summary of items below safety stock threshold' },
                    { key: 'showCategoryDistribution', label: 'Category Distribution Breakdown Cards', desc: 'Interactive grid of SKU categories with click-to-filter' },
                    { key: 'showRecentTransactions', label: 'Recent Activity Trail Feed', desc: 'Live log of recent check-outs, returns, and audits' },
                    { key: 'showHighValueItems', label: 'Top High-Value Assets Table', desc: 'List of top monetary value catalog items' },
                    { key: 'showPendingReturnsBanner', label: 'Pending Check-In Return Verification Banner', desc: 'Alert banner for field staff returns awaiting inspection' },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F9F9F9] border border-[#E5E5E5] cursor-pointer hover:bg-gray-100 transition">
                      <input
                        type="checkbox"
                        checked={(tempWidgetConfig as any)[key]}
                        onChange={(e) =>
                          setTempWidgetConfig({ ...tempWidgetConfig, [key]: e.target.checked })
                        }
                        className="rounded border-gray-300 w-4 h-4 accent-black mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-[#1A1A1A] block">{label}</span>
                        <span className="text-[11px] text-gray-500">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F5F5F5] border-t border-[#E5E5E5] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setTempWidgetConfig({
                    showMetricCards: true,
                    metricCards: DEFAULT_METRICS,
                    showQuickActions: true,
                    showLowStockAlerts: true,
                    showCategoryDistribution: true,
                    showRecentTransactions: true,
                    showHighValueItems: true,
                    showPendingReturnsBanner: true,
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-100 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateDashboardConfig(tempWidgetConfig);
                    setIsCustomizeModalOpen(false);
                  }}
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Apply & Save Layout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

