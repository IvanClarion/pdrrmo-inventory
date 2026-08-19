import React from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Package,
  FolderKanban,
  ShieldCheck,
} from 'lucide-react';

export const MAIN_NAV_ITEMS = [
  {
    id: 'inventory' as const,
    label: 'Inventory',
    icon: Package,
  },
  {
    id: 'procurement' as const,
    label: 'Procurement',
    icon: FolderKanban,
  },
  {
    id: 'admin' as const,
    label: 'Admin & RBAC',
    icon: ShieldCheck,
  },
];

export const BottomNav: React.FC = () => {
  const {
    mainTab,
    setMainTab,
    offlineQueue,
    isTabAccessible,
    pendingRegistrationCount,
  } = useInventory();

  const visibleNavItems = MAIN_NAV_ITEMS.filter((item) => isTabAccessible(item.id));

  return (
    <>
      {/* Desktop Main Navigation Header */}
      <nav className="hidden lg:block bg-white border-b border-[#E5E5E5] sticky top-[53px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = mainTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMainTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-black text-[#1A1A1A] bg-[#F5F5F5] rounded-t-xl shadow-2xs'
                    : 'border-transparent text-gray-500 hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-t-xl'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-500'}`} />
                <span className="text-xs sm:text-sm tracking-tight">{item.label}</span>

                {item.id === 'inventory' && offlineQueue.length > 0 && (
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] shadow-lg px-2 py-1">
        <div
          className="grid gap-1 items-center max-w-lg mx-auto"
          style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = mainTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMainTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition cursor-pointer ${
                  isActive
                    ? 'text-black bg-[#F0F0F0] font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-[#1A1A1A]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-500'}`} />
                  {item.id === 'inventory' && offlineQueue.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
                  )}
                  {item.id === 'admin' && pendingRegistrationCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-amber-500 text-white font-black text-[8px] rounded-full flex items-center justify-center border border-white">
                      {pendingRegistrationCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold truncate mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
