import React from 'react';
import { useProcurement } from './ProcurementContext';
import { ProcurementDashboard } from './components/ProcurementDashboard';
import { ProcurementTrackerTable } from './components/ProcurementTrackerTable';
import { ProcurementAlertsView } from './components/ProcurementAlertsView';
import { DocumentModal } from './components/DocumentModal';
import { DocumentDetailDrawer } from './components/DocumentDetailDrawer';
import { CustomFieldsModal } from './components/CustomFieldsModal';
import { UserAccessModal } from './components/UserAccessModal';
import { WorkflowCustomizerModal } from './components/WorkflowCustomizerModal';
import { SubDocumentModal } from './components/SubDocumentModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import {
  LayoutDashboard,
  FolderKanban,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Plus,
  RotateCcw,
  Lock,
  Sliders,
} from 'lucide-react';

export const ProcurementModuleView: React.FC = () => {
  const {
    activeSubTab,
    setActiveSubTab,
    alerts,
    documents,
    openNewDocumentModal,
    setIsCustomFieldsModalOpen,
    setIsUserAccessModalOpen,
    setIsWorkflowModalOpen,
    resetToDefaultData,
    hasAccess,
    canEdit,
    canManageFields,
    canManageAccess,
    currentUserProcurementRole,
  } = useProcurement();

  // If user does not have permission granted by Admin
  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Procurement Documents Tracker Access Restricted
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          You do not currently have authorized access to view or manage provincial procurement documents. Please contact the PDRRMO Administrator to request permission.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Sub-Navigation Bar */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-2 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('documents')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'documents'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Documents Tracker</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-200 text-neutral-800">
              {documents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('alerts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'alerts'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alerts & Exceptions</span>
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {canManageFields && (
            <button
              type="button"
              onClick={() => setIsCustomFieldsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition cursor-pointer"
              title="Admin: Configure Custom Fields"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Custom Fields</span>
            </button>
          )}

          {canManageFields && (
            <button
              type="button"
              onClick={() => setIsWorkflowModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition cursor-pointer"
              title="Admin: Customize Fund Sources & Statuses"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Funds & Statuses</span>
            </button>
          )}

          {canManageAccess && (
            <button
              type="button"
              onClick={() => setIsUserAccessModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition cursor-pointer"
              title="Admin: Manage User Access and Roles"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Access & Roles</span>
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset Procurement Documents Tracker to demo default records?')) {
                resetToDefaultData();
              }
            }}
            className="p-2 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
            title="Reset to Demo Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openNewDocumentModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-green-400" />
              <span>New Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Router */}
      {activeSubTab === 'dashboard' && <ProcurementDashboard />}
      {activeSubTab === 'documents' && <ProcurementTrackerTable />}
      {activeSubTab === 'alerts' && <ProcurementAlertsView />}

      {/* Modals & Drawers */}
      <DocumentModal />
      <DocumentDetailDrawer />
      <CustomFieldsModal />
      <UserAccessModal />
      <WorkflowCustomizerModal />
      <SubDocumentModal />
      <PdfViewerModal />
    </div>
  );
};
