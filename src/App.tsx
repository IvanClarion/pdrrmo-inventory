import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { ProcurementProvider } from './procurement/ProcurementContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { InventoryModuleView } from './components/InventoryModuleView';
import { AdminRBACView } from './components/AdminRBACView';
import { PRDAndSchemaModal } from './components/PRDAndSchemaModal';
import { CheckOutFormModal } from './components/CheckOutFormModal';
import { CheckInOutModal } from './components/CheckInOutModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProcurementModuleView } from './procurement/ProcurementModuleView';

const AppContent: React.FC = () => {
  const { isSessionAuthenticated, mainTab, activeCheckoutFormData, closeCheckoutFormModal } = useInventory();
  const [isPrdModalOpen, setIsPrdModalOpen] = useState<boolean>(false);

  // If user is not authenticated, display the full-screen Login Page
  if (!isSessionAuthenticated) {
    return (
      <>
        <LoginPage onOpenPrdModal={() => setIsPrdModalOpen(true)} />
        <PRDAndSchemaModal isOpen={isPrdModalOpen} onClose={() => setIsPrdModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] flex flex-col font-sans selection:bg-black selection:text-white pb-16 lg:pb-0">
      {/* Top Application Header */}
      <Header onOpenPrdModal={() => setIsPrdModalOpen(true)} />

      {/* Top-Level Main Navigation (Inventory | Procurement | Admin & RBAC) */}
      <BottomNav />

      {/* Main Screen Router for 3 Core Modules */}
      <main className="flex-1 overflow-x-hidden">
        {mainTab === 'inventory' && <InventoryModuleView onOpenPrdModal={() => setIsPrdModalOpen(true)} />}
        {mainTab === 'procurement' && <ProcurementModuleView />}
        {mainTab === 'admin' && <AdminRBACView />}
      </main>

      {/* Check In / Out Modal Drawer */}
      <CheckInOutModal />

      {/* Printable Check-Out Form Modal */}
      <CheckOutFormModal
        isOpen={!!activeCheckoutFormData}
        formData={activeCheckoutFormData}
        onClose={closeCheckoutFormModal}
      />

      {/* Account Login / Unlock Modal */}
      <LoginModal />

      {/* PRD & Database Schema Viewer Modal */}
      <PRDAndSchemaModal isOpen={isPrdModalOpen} onClose={() => setIsPrdModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <InventoryProvider>
        <ProcurementProvider>
          <AppContent />
        </ProcurementProvider>
      </InventoryProvider>
    </ErrorBoundary>
  );
}
