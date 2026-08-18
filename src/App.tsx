import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { ScannerView } from './components/ScannerView';
import { InventoryView } from './components/InventoryView';
import { CheckInOutView } from './components/CheckInOutView';
import { CheckInOutModal } from './components/CheckInOutModal';
import { LabelGeneratorModal } from './components/LabelGeneratorModal';
import { AuditLogsView } from './components/AuditLogsView';
import { AnalyticsView } from './components/AnalyticsView';
import { AdminRBACView } from './components/AdminRBACView';
import { PRDAndSchemaModal } from './components/PRDAndSchemaModal';
import { CheckOutFormModal } from './components/CheckOutFormModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { isSessionAuthenticated, activeTab, activeCheckoutFormData, closeCheckoutFormModal } = useInventory();
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

      {/* Navigation Sub-Header (Desktop) */}
      <BottomNav />

      {/* Main Screen Router */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'dashboard' && <DashboardView onOpenPrdModal={() => setIsPrdModalOpen(true)} />}
        {activeTab === 'scanner' && <ScannerView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'checkinout' && <CheckInOutView />}
        {activeTab === 'labels' && <LabelGeneratorModal />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'logs' && <AuditLogsView />}
        {activeTab === 'admin' && <AdminRBACView />}
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
        <AppContent />
      </InventoryProvider>
    </ErrorBoundary>
  );
}
