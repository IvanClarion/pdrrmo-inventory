import React, { useState } from 'react';
import { useProcurement } from '../ProcurementContext';
import {
  X,
  Sliders,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  CheckCircle2,
  FolderKanban,
  Building2,
} from 'lucide-react';

export const WorkflowCustomizerModal: React.FC = () => {
  const {
    isWorkflowModalOpen,
    setIsWorkflowModalOpen,
    fundSources,
    addFundSource,
    updateFundSource,
    deleteFundSource,
    reorderFundSources,
    statuses,
    addStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    divisionSections,
    addDivisionSection,
    updateDivisionSection,
    deleteDivisionSection,
    reorderDivisionSections,
    documentTypes,
    addDocumentType,
    deleteDocumentType,
    canManageFields,
  } = useProcurement();

  const [activeTab, setActiveTab] = useState<'funds' | 'divisions' | 'statuses' | 'types'>('funds');

  // Input states for adding new items
  const [newFundInput, setNewFundInput] = useState('');
  const [newDivisionInput, setNewDivisionInput] = useState('');
  const [newStatusInput, setNewStatusInput] = useState('');
  const [newTypeInput, setNewTypeInput] = useState('');

  // Editing state
  const [editingItem, setEditingItem] = useState<{
    type: 'fund' | 'division' | 'status';
    oldVal: string;
    newVal: string;
  } | null>(null);

  if (!isWorkflowModalOpen) return null;

  // Add handlers
  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFundInput.trim()) {
      addFundSource(newFundInput.trim());
      setNewFundInput('');
    }
  };

  const handleAddDivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDivisionInput.trim()) {
      addDivisionSection(newDivisionInput.trim());
      setNewDivisionInput('');
    }
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatusInput.trim()) {
      addStatus(newStatusInput.trim());
      setNewStatusInput('');
    }
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeInput.trim()) {
      addDocumentType(newTypeInput.trim());
      setNewTypeInput('');
    }
  };

  // Reorder handlers
  const handleMoveFund = (index: number, direction: 'up' | 'down') => {
    const list = [...fundSources];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    reorderFundSources(list);
  };

  const handleMoveDivision = (index: number, direction: 'up' | 'down') => {
    const list = [...divisionSections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    reorderDivisionSections(list);
  };

  const handleMoveStatus = (index: number, direction: 'up' | 'down') => {
    const list = [...statuses];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    reorderStatuses(list);
  };

  // Save inline edits
  const handleSaveInlineEdit = () => {
    if (!editingItem || !editingItem.newVal.trim()) return;
    if (editingItem.type === 'fund') {
      updateFundSource(editingItem.oldVal, editingItem.newVal.trim());
    } else if (editingItem.type === 'division') {
      updateDivisionSection(editingItem.oldVal, editingItem.newVal.trim());
    } else if (editingItem.type === 'status') {
      updateStatus(editingItem.oldVal, editingItem.newVal.trim());
    }
    setEditingItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E5E5E5] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A1A1A]">
                Customize Funds, Divisions & Statuses
              </h3>
              <p className="text-xs text-gray-500">
                Admin control: Add, rename, or reorder options across the Procurement Tracker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWorkflowModalOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-gray-100 flex items-center gap-2 text-xs font-bold shrink-0 bg-[#FAFAFA] overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('funds');
              setEditingItem(null);
            }}
            className={`pb-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'funds'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Source of Funds ({fundSources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('divisions');
              setEditingItem(null);
            }}
            className={`pb-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'divisions'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Divisions / Sections ({divisionSections.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('statuses');
              setEditingItem(null);
            }}
            className={`pb-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'statuses'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Statuses ({statuses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('types');
              setEditingItem(null);
            }}
            className={`pb-3 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'types'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
            <span>Document Types ({documentTypes.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: SOURCE OF FUNDS */}
          {activeTab === 'funds' && (
            <div className="space-y-4">
              <form onSubmit={handleAddFund} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newFundInput}
                  onChange={(e) => setNewFundInput(e.target.value)}
                  placeholder="Enter new source of funds (e.g. DRRM Quick Response Fund)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black outline-hidden text-xs bg-white font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-green-400" />
                  <span>Add Fund</span>
                </button>
              </form>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Active Funding Sources ({fundSources.length})
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {fundSources.map((source, idx) => {
                    const isEditing = editingItem?.type === 'fund' && editingItem.oldVal === source;

                    if (isEditing) {
                      return (
                        <div key={source} className="p-2.5 rounded-xl bg-neutral-50 border border-black flex gap-2">
                          <input
                            type="text"
                            value={editingItem.newVal}
                            onChange={(e) => setEditingItem({ ...editingItem, newVal: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={handleSaveInlineEdit}
                            className="px-3 py-1.5 rounded-lg bg-black text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="px-2.5 py-1.5 rounded-lg border text-gray-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={source}
                        className="p-3 rounded-2xl bg-white border border-[#E5E5E5] hover:border-gray-400 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-gray-900 text-xs truncate">{source}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveFund(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                              idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFund(idx, 'down')}
                            disabled={idx === fundSources.length - 1}
                            className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                              idx === fundSources.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem({ type: 'fund', oldVal: source, newVal: source })}
                            className="p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 cursor-pointer ml-1"
                            title="Rename Fund Source"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete fund source "${source}"?`)) {
                                deleteFundSource(source);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                            title="Delete Fund Source"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIVISIONS / SECTIONS */}
          {activeTab === 'divisions' && (
            <div className="space-y-4">
              <form onSubmit={handleAddDivision} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newDivisionInput}
                  onChange={(e) => setNewDivisionInput(e.target.value)}
                  placeholder="Enter new division / section (e.g. Search & Rescue Special Unit)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black outline-hidden text-xs bg-white font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-green-400" />
                  <span>Add Section</span>
                </button>
              </form>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Active Divisions & Sections ({divisionSections.length})
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {divisionSections.map((division, idx) => {
                    const isEditing = editingItem?.type === 'division' && editingItem.oldVal === division;

                    if (isEditing) {
                      return (
                        <div key={division} className="p-2.5 rounded-xl bg-neutral-50 border border-black flex gap-2">
                          <input
                            type="text"
                            value={editingItem.newVal}
                            onChange={(e) => setEditingItem({ ...editingItem, newVal: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={handleSaveInlineEdit}
                            className="px-3 py-1.5 rounded-lg bg-black text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="px-2.5 py-1.5 rounded-lg border text-gray-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={division}
                        className="p-3 rounded-2xl bg-white border border-[#E5E5E5] hover:border-gray-400 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-gray-900 text-xs truncate">{division}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveDivision(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                              idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDivision(idx, 'down')}
                            disabled={idx === divisionSections.length - 1}
                            className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                              idx === divisionSections.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem({ type: 'division', oldVal: division, newVal: division })}
                            className="p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 cursor-pointer ml-1"
                            title="Rename Division/Section"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete division/section "${division}"?`)) {
                                deleteDivisionSection(division);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                            title="Delete Division/Section"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENT STATUSES */}
          {activeTab === 'statuses' && (
            <div className="space-y-4">
              <form onSubmit={handleAddStatus} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newStatusInput}
                  onChange={(e) => setNewStatusInput(e.target.value)}
                  placeholder="Enter new status (e.g. For Pre-Bid Conference, For Final Billing)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black outline-hidden text-xs bg-white font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-green-400" />
                  <span>Add Status</span>
                </button>
              </form>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Active Document Statuses ({statuses.length})
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {statuses.map((statusItem, idx) => {
                    const isEditing = editingItem?.type === 'status' && editingItem.oldVal === statusItem;

                    if (isEditing) {
                      return (
                        <div key={statusItem} className="p-2.5 rounded-xl bg-neutral-50 border border-black flex gap-2">
                          <input
                            type="text"
                            value={editingItem.newVal}
                            onChange={(e) => setEditingItem({ ...editingItem, newVal: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border bg-white text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={handleSaveInlineEdit}
                            className="px-3 py-1.5 rounded-lg bg-black text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="px-2.5 py-1.5 rounded-lg border text-gray-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={statusItem}
                        className="p-3 rounded-2xl bg-white border border-[#E5E5E5] hover:border-gray-400 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-amber-50 text-amber-900 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 truncate">
                            {statusItem}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveStatus(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                              idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStatus(idx, 'down')}
                            disabled={idx === statuses.length - 1}
                            className={`p-1.5 rounded-lg border hover:bg-gray-100 ${
                              idx === statuses.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem({ type: 'status', oldVal: statusItem, newVal: statusItem })}
                            className="p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 cursor-pointer ml-1"
                            title="Rename Status"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete status "${statusItem}"?`)) {
                                deleteStatus(statusItem);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                            title="Delete Status"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENT TYPES */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <form onSubmit={handleAddType} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  placeholder="Enter new document type (e.g. Obligation Request (OBR))..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-black outline-hidden text-xs bg-white font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-green-400" />
                  <span>Add Type</span>
                </button>
              </form>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Active Document Types ({documentTypes.length})
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {documentTypes.map((typeItem, idx) => (
                    <div
                      key={typeItem}
                      className="p-3 rounded-2xl bg-white border border-[#E5E5E5] hover:border-gray-400 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-blue-50 text-blue-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-gray-900 text-xs truncate">{typeItem}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete document type "${typeItem}"?`)) {
                            deleteDocumentType(typeItem);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                        title="Delete Document Type"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F5F5F5] border-t border-[#E5E5E5] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => setIsWorkflowModalOpen(false)}
            className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl transition cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
