import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { DashboardView } from './DashboardView';
import { ScannerView } from './ScannerView';
import { InventoryView } from './InventoryView';
import { CheckInOutView } from './CheckInOutView';
import { LabelGeneratorModal } from './LabelGeneratorModal';
import { AnalyticsView } from './AnalyticsView';
import { AuditLogsView } from './AuditLogsView';
import {
  LayoutDashboard,
  QrCode,
  Package,
  ArrowUpDown,
  Tag,
  BarChart3,
  History,
} from 'lucide-react';

export const INVENTORY_SUB_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scanner', icon: QrCode, highlight: true },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'checkinout', label: 'Check In/Out', icon: ArrowUpDown },
  { id: 'labels', label: 'Label & POs', icon: Tag },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'logs', label: 'Audit Trail', icon: History },
];

export const InventoryModuleView: React.FC<{ onOpenPrdModal: () => void }> = ({ onOpenPrdModal }) => {
  const {
    inventorySubTab,
    setInventorySubTab,
    isTabAccessible,
    offlineQueue,
  } = useInventory();

  // Filter sub-navigation tabs based on user role authorization
  const visibleSubTabs = INVENTORY_SUB_NAV_ITEMS.filter((item) => isTabAccessible(item.id));

  return (
    <div className="grid gap-2.5 p-2 sm:p-4 max-w-7xl mx-auto w-full">
      {/* Inventory Module Sub-Navigation Toolbar (Grid-based spacing, zero margin waste, mobile responsive) */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-1 shadow-2xs">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1">
          {visibleSubTabs.map((item) => {
            const Icon = item.icon;
            const isActive = inventorySubTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setInventorySubTab(item.id)}
                className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer text-center select-none ${
                  isActive
                    ? 'bg-black text-white shadow-2xs'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-black' : 'text-gray-500'}`} />
                <span className="truncate">{item.label}</span>
                {item.id === 'scanner' && offlineQueue.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Inventory Sub-View Router */}
      <div className="grid w-full">
        {inventorySubTab === 'dashboard' && <DashboardView onOpenPrdModal={onOpenPrdModal} />}
        {inventorySubTab === 'scanner' && <ScannerView />}
        {inventorySubTab === 'inventory' && <InventoryView />}
        {inventorySubTab === 'checkinout' && <CheckInOutView />}
        {inventorySubTab === 'labels' && <LabelGeneratorModal />}
        {inventorySubTab === 'analytics' && <AnalyticsView />}
        {inventorySubTab === 'logs' && <AuditLogsView />}
      </div>
    </div>
  );
};
