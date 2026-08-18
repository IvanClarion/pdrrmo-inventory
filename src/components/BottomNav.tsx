import React from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  LayoutDashboard,
  QrCode,
  Package,
  ArrowUpDown,
  Tag,
  BarChart3,
  History,
  ShieldCheck,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scanner', icon: QrCode, highlight: true },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'checkinout', label: 'Check In/Out', icon: ArrowUpDown },
  { id: 'labels', label: 'Labels & POs', icon: Tag },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'logs', label: 'Audit Trail', icon: History },
  { id: 'admin', label: 'Admin & RBAC', icon: ShieldCheck },
];

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, offlineQueue, isTabAccessible, pendingRegistrationCount } = useInventory();

  const visibleNavItems = NAV_ITEMS.filter((item) => isTabAccessible(item.id));

  return (
    <>
      {/* Desktop Sub-Header Navigation */}
      <nav className="hidden lg:block bg-white border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-6 flex items-center space-x-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition ${
                  isActive
                    ? 'border-black text-[#1A1A1A] font-bold bg-[#F0F0F0] rounded-t-xl'
                    : 'border-transparent text-gray-500 hover:text-[#1A1A1A] hover:bg-[#F9F9F9] rounded-t-xl'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.highlight ? 'text-black' : ''}`} />
                <span>{item.label}</span>
                {item.id === 'scanner' && offlineQueue.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                )}
                {item.id === 'admin' && (
                  pendingRegistrationCount > 0 ? (
                    <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                      {pendingRegistrationCount}
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold bg-black text-white px-1.5 py-0.5 rounded ml-1">
                      Admin
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Sticky fixed bottom) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] shadow-lg px-1 py-1">
        <div
          className="grid gap-0.5 items-center max-w-lg mx-auto"
          style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition ${
                  isActive
                    ? 'text-black bg-[#F0F0F0] font-bold'
                    : 'text-gray-500 hover:text-[#1A1A1A]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${item.highlight ? 'text-black' : ''}`} />
                  {item.id === 'scanner' && offlineQueue.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
                  )}
                  {item.id === 'admin' && pendingRegistrationCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-amber-500 text-white font-black text-[8px] rounded-full flex items-center justify-center border border-white">
                      {pendingRegistrationCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] truncate mt-0.5 max-w-[52px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
