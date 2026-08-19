import React, { useState, useMemo } from 'react';
import { useProcurement, formatDateTimeDisplay, sortUpdateLogsDescending } from '../ProcurementContext';
import {
  ProcurementDocument,
  ProcurementStatus,
  ProcurementSubDocument,
  isObrDocument,
  isTrustFundSource,
  isPrDocument,
  isSpendContributor,
} from '../types';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  AlertTriangle,
  FolderKanban,
  FileText,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Paperclip,
  History,
  Building2,
  RefreshCw,
} from 'lucide-react';

export const ProcurementTrackerTable: React.FC = () => {
  const {
    documents,
    filteredDocuments,
    filterState,
    setFilterState,
    resetFilters,
    customFields,
    documentTypes,
    fundSources,
    divisionSections,
    statuses,
    openNewDocumentModal,
    openEditDocumentModal,
    openDetailDrawer,
    openNewSubDocModal,
    openEditSubDocModal,
    deleteSubDocument,
    duplicateDocument,
    deleteDocument,
    openPdfViewer,
    canEdit,
    isAdmin,
    setIsWorkflowModalOpen,
    staleDaysThreshold,
    isLoadingDocuments,
    refreshDocumentsFromDb,
  } = useProcurement();

  // Column Visibility State (Order: Last Update and Status right next to each other)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    controlNo: true,
    documentName: true,
    documentType: true,
    amount: true,
    sourceOfFunds: true,
    divisionSection: true,
    inputDate: true,
    documentUpdate: true,
    status: true,
    assignedStaff: true,
    actions: true,
  });

  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('documentUpdate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Sub-documents row expansion state
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleExpand = (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Sorting
  const sortedDocuments = useMemo(() => {
    const list = [...filteredDocuments];
    list.sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];

      // Custom fields sorting
      if (sortField.startsWith('cf_')) {
        const cfKey = sortField.replace('cf_', '');
        aVal = a.customFields ? a.customFields[cfKey] : '';
        bVal = b.customFields ? b.customFields[cfKey] : '';
      }

      if (sortField === 'documentUpdate') {
        const topLogA = a.updateLogs && a.updateLogs.length > 0 ? a.updateLogs[0] : null;
        const topLogB = b.updateLogs && b.updateLogs.length > 0 ? b.updateLogs[0] : null;
        const timeA = new Date(topLogA?.timestamp || `${a.documentUpdate}T${topLogA?.time || '00:00:00'}`).getTime();
        const timeB = new Date(topLogB?.timestamp || `${b.documentUpdate}T${topLogB?.time || '00:00:00'}`).getTime();
        return sortAsc ? timeA - timeB : timeB - timeA;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal || '').toLowerCase();
      const strB = String(bVal || '').toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    return list;
  }, [filteredDocuments, sortField, sortAsc]);

  // Pagination Slice
  const totalPages = Math.ceil(sortedDocuments.length / pageSize) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDocuments.slice(start, start + pageSize);
  }, [sortedDocuments, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExportCSV = () => {
    const headers = [
      'Control No.',
      'Document Name',
      'Document Type',
      'Amount (PHP)',
      'Contributes to Spend',
      'Source of Funds',
      'Division / Section',
      'Input Date',
      'Last Update Date',
      'Status',
      'Assigned Staff',
      'Latest Update Notes',
      'Sub-Documents Count',
    ];

    const rows = sortedDocuments.map((doc) => [
      `"${doc.controlNo || ''}"`,
      `"${(doc.documentName || '').replace(/"/g, '""')}"`,
      `"${doc.documentType || ''}"`,
      doc.amount || 0,
      isObrDocument(doc.documentType)
        ? 'YES (OBR)'
        : isPrDocument(doc.documentType) && isTrustFundSource(doc.sourceOfFunds)
        ? 'YES (Trust Fund PR)'
        : 'NO',
      `"${doc.sourceOfFunds || ''}"`,
      `"${doc.divisionSection || ''}"`,
      `"${doc.inputDate || ''}"`,
      `"${doc.documentUpdate || ''}"`,
      `"${doc.status || ''}"`,
      `"${doc.assignedStaff || ''}"`,
      `"${(doc.latestUpdateNotes || '').replace(/"/g, '""')}"`,
      (doc.subDocuments || []).length,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PDRRMO-Procurement-Tracker-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'Approved':
      case 'Completed / Liquidated':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'BAC Processing':
      case 'Under Review':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Procurement Ongoing':
      case 'Delivered / For Inspection':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'On Hold':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls Bar */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search & Top Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterState.searchQuery}
              onChange={(e) => setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search by Control No, Document Name, Sub-Docs, or Logs..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden text-xs bg-neutral-50/50"
            />
            {filterState.searchQuery && (
              <button
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Columns Customizer */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
                title="Toggle Table Columns"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Columns</span>
              </button>

              {isColumnPickerOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E5E5] rounded-2xl shadow-xl p-3 z-30 space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 font-bold text-gray-700">
                    <span>Show/Hide Columns</span>
                    <button
                      type="button"
                      onClick={() => setIsColumnPickerOpen(false)}
                      className="text-gray-400 hover:text-black font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {[
                      { key: 'controlNo', label: 'Control No.' },
                      { key: 'documentName', label: 'Document Name' },
                      { key: 'documentType', label: 'Document Type' },
                      { key: 'amount', label: 'Amount (₱)' },
                      { key: 'sourceOfFunds', label: 'Source of Funds' },
                      { key: 'divisionSection', label: 'Division / Section' },
                      { key: 'inputDate', label: 'Input Date' },
                      { key: 'documentUpdate', label: 'Last Update (Date & Time)' },
                      { key: 'status', label: 'Status' },
                      { key: 'assignedStaff', label: 'Assigned Staff' },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-black">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key] !== false}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-gray-300 accent-black cursor-pointer"
                        />
                        <span className="font-medium text-gray-700">{col.label}</span>
                      </label>
                    ))}

                    {customFields.map((cf) => (
                      <label key={cf.id} className="flex items-center gap-2 cursor-pointer py-0.5 text-purple-900">
                        <input
                          type="checkbox"
                          checked={visibleColumns[`cf_${cf.key}`] !== false}
                          onChange={() => toggleColumn(`cf_${cf.key}`)}
                          className="rounded border-gray-300 accent-purple-700 cursor-pointer"
                        />
                        <span className="font-medium">{cf.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Supabase Cloud Sync / Refresh */}
            <button
              type="button"
              onClick={() => refreshDocumentsFromDb()}
              disabled={isLoadingDocuments}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer ${
                isLoadingDocuments ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Sync & Fetch Latest Data from Supabase Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoadingDocuments ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoadingDocuments ? 'Syncing...' : 'Live Sync'}</span>
            </button>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
              title="Export all records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl border border-transparent hover:bg-gray-100 text-gray-500 font-bold text-xs transition cursor-pointer"
              title="Reset all active filters"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs pt-1 border-t border-gray-100">
          {/* Document Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Document Type
            </label>
            <select
              value={filterState.documentType}
              onChange={(e) => setFilterState((prev) => ({ ...prev, documentType: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium"
            >
              <option value="ALL">All Types</option>
              {documentTypes.map((t) => (
                <option key={t} value={t}>
                  {t} {isObrDocument(t) ? '★ (OBR Spend)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Source of Funds Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Source of Funds
            </label>
            <select
              value={filterState.sourceOfFunds}
              onChange={(e) => setFilterState((prev) => ({ ...prev, sourceOfFunds: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium"
            >
              <option value="ALL">All Funds</option>
              {fundSources.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Division / Section Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Division / Section
            </label>
            <select
              value={filterState.divisionSection || 'ALL'}
              onChange={(e) => setFilterState((prev) => ({ ...prev, divisionSection: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium"
            >
              <option value="ALL">All Divisions</option>
              {divisionSections.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Status
            </label>
            <select
              value={filterState.status}
              onChange={(e) => setFilterState((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium"
            >
              <option value="ALL">All Statuses</option>
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Date Range
            </label>
            <select
              value={filterState.dateRange}
              onChange={(e) =>
                setFilterState((prev) => ({
                  ...prev,
                  dateRange: e.target.value as any,
                }))
              }
              className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">Past 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-[#E5E5E5] text-gray-500 font-bold uppercase text-[10px] tracking-wider select-none">
                {/* Sub-Docs Expand Toggle Column */}
                <th className="py-3 px-3 w-8 text-center">#</th>

                {/* Control No */}
                {visibleColumns.controlNo !== false && (
                  <th
                    onClick={() => handleSort('controlNo')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Control No.</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Document Name */}
                {visibleColumns.documentName !== false && (
                  <th
                    onClick={() => handleSort('documentName')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition min-w-[200px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Document Name / Title</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Type */}
                {visibleColumns.documentType !== false && (
                  <th
                    onClick={() => handleSort('documentType')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Type</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Amount */}
                {visibleColumns.amount !== false && (
                  <th
                    onClick={() => handleSort('amount')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount (₱)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Source of Funds */}
                {visibleColumns.sourceOfFunds !== false && (
                  <th
                    onClick={() => handleSort('sourceOfFunds')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Source of Funds</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Division / Section */}
                {visibleColumns.divisionSection !== false && (
                  <th
                    onClick={() => handleSort('divisionSection')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Division / Section</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Input Date */}
                {visibleColumns.inputDate !== false && (
                  <th
                    onClick={() => handleSort('inputDate')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Input Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Last Update Column (Latest Log Narrative & Date/Time) */}
                {visibleColumns.documentUpdate !== false && (
                  <th
                    onClick={() => handleSort('documentUpdate')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition min-w-[220px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Last Update (Date & Time)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Status Column (Immediately adjacent to Last Update) */}
                {visibleColumns.status !== false && (
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Assigned Staff */}
                {visibleColumns.assignedStaff !== false && (
                  <th
                    onClick={() => handleSort('assignedStaff')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>Assigned Staff</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                )}

                {/* Custom Dynamic Columns */}
                {customFields.map((cf) => {
                  if (visibleColumns[`cf_${cf.key}`] === false) return null;
                  return (
                    <th
                      key={cf.id}
                      onClick={() => handleSort(`cf_${cf.key}`)}
                      className="py-3 px-4 cursor-pointer hover:text-black transition text-purple-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>{cf.name}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  );
                })}

                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoadingDocuments ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-gray-400 bg-white">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                      <p className="font-bold text-xs text-gray-700">Loading live records from Supabase database...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-gray-400 bg-white">
                    <p className="font-bold text-sm text-gray-600">No Procurement Documents in Database</p>
                    <p className="text-xs text-gray-400 mt-1">Click "+ New Procurement Document" to register your first requisition.</p>
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => {
                  const now = new Date();
                  const sortedLogs = sortUpdateLogsDescending(doc.updateLogs || []);
                  const topLog = sortedLogs[0];
                  const updateDate = new Date(topLog?.date || doc.documentUpdate || doc.inputDate);
                  const diffDays = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
                  const isStale = doc.status !== 'Completed / Liquidated' && doc.status !== 'Cancelled' && diffDays >= staleDaysThreshold;
                  const isObr = isObrDocument(doc.documentType);
                  const isTrustFundPr = isPrDocument(doc.documentType) && isTrustFundSource(doc.sourceOfFunds);
                  const isSpend = isObr || isTrustFundPr;

                  const dateTimeDisplay = formatDateTimeDisplay(
                    topLog?.date || doc.documentUpdate,
                    topLog?.time,
                    topLog?.timestamp
                  );

                  const isExpanded = expandedDocIds.has(doc.id);
                  const subDocsCount = (doc.subDocuments || []).length;

                  return (
                    <React.Fragment key={doc.id}>
                      <tr
                        className={`hover:bg-neutral-50/80 transition group cursor-pointer ${
                          isExpanded ? 'bg-amber-50/30' : ''
                        }`}
                        onClick={() => openDetailDrawer(doc)}
                      >
                        {/* Sub-Docs Expand Chevron */}
                        <td
                          className="py-3.5 px-3 text-center"
                          onClick={(e) => toggleExpand(doc.id, e)}
                        >
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-black transition cursor-pointer"
                            title={isExpanded ? 'Collapse sub-documents' : 'Expand linked sub-documents'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>

                        {/* Control No */}
                        {visibleColumns.controlNo !== false && (
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-xs bg-gray-100 text-gray-900 px-2 py-0.5 rounded border border-gray-200">
                              {doc.controlNo}
                            </span>
                          </td>
                        )}

                        {/* Document Name & Sub-docs badge */}
                        {visibleColumns.documentName !== false && (
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 block group-hover:text-blue-600 transition truncate max-w-sm">
                                  {doc.documentName}
                                </span>
                                {(doc.fileData || doc.fileUrl) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPdfViewer(
                                        doc.documentName,
                                        doc.fileData || doc.fileUrl || '',
                                        doc.fileName || `${doc.controlNo}.pdf`,
                                        doc.fileSize,
                                        doc.assignedStaff
                                      );
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[9px] border border-red-200 flex items-center gap-0.5 shrink-0 transition cursor-pointer"
                                    title={`Preview PDF: ${doc.fileName || 'Document.pdf'}`}
                                  >
                                    <FileText className="w-2.5 h-2.5 text-red-600" />
                                    <span>PDF</span>
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.description && (
                                  <span className="text-[11px] text-gray-400 truncate max-w-xs block">
                                    {doc.description}
                                  </span>
                                )}
                                {subDocsCount > 0 && (
                                  <span
                                    onClick={(e) => toggleExpand(doc.id, e)}
                                    className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-200 flex items-center gap-0.5 shrink-0 hover:bg-blue-100"
                                    title="Click to view linked sub-documents"
                                  >
                                    <Paperclip className="w-2.5 h-2.5" />
                                    <span>{subDocsCount} sub-{subDocsCount === 1 ? 'doc' : 'docs'}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Type */}
                        {visibleColumns.documentType !== false && (
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-gray-800 text-xs">
                              {doc.documentType}
                            </span>
                          </td>
                        )}

                        {/* Amount */}
                        {visibleColumns.amount !== false && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isObr && (
                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  OBR
                                </span>
                              )}
                              {isTrustFundPr && (
                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold bg-teal-100 text-teal-900 border border-teal-300">
                                  Trust Fund PR
                                </span>
                              )}
                              <span className={`font-mono font-bold text-xs ${isSpend ? 'text-emerald-800' : 'text-gray-900'}`}>
                                ₱{(doc.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Source of Funds */}
                        {visibleColumns.sourceOfFunds !== false && (
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-gray-800 font-medium text-[11px] border border-gray-200">
                              {doc.sourceOfFunds}
                            </span>
                          </td>
                        )}

                        {/* Division / Section */}
                        {visibleColumns.divisionSection !== false && (
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50/60 text-indigo-900 font-medium text-[11px] border border-indigo-200">
                              {doc.divisionSection || 'Unassigned Division'}
                            </span>
                          </td>
                        )}

                        {/* Input Date */}
                        {visibleColumns.inputDate !== false && (
                          <td className="py-3.5 px-4 text-gray-600 font-medium font-mono text-[11px]">
                            {doc.inputDate}
                          </td>
                        )}

                        {/* Last Update Column (Date & Time + Narrative on top) */}
                        {visibleColumns.documentUpdate !== false && (
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                <span className={isStale ? 'text-amber-800 font-bold' : 'text-gray-900 font-bold'}>
                                  {dateTimeDisplay.dateFormatted}
                                </span>
                                <span className="text-[10px] text-gray-500 font-normal">
                                  {dateTimeDisplay.timeFormatted}
                                </span>

                                {sortedLogs.length > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-bold text-[9px] border border-gray-200">
                                    {sortedLogs.length} {sortedLogs.length === 1 ? 'log' : 'logs'}
                                  </span>
                                )}

                                {isStale && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[9px] border border-amber-200 shrink-0"
                                    title={`Not updated in ${diffDays} days`}
                                  >
                                    {diffDays}d overdue
                                  </span>
                                )}
                              </div>

                              {/* Top narrative log note */}
                              {(doc.latestUpdateNotes || topLog?.notes) && (
                                <p className="text-[10.5px] text-gray-600 truncate max-w-xs italic flex items-center gap-1">
                                  <span className="text-gray-400">↳</span>
                                  <span>{doc.latestUpdateNotes || topLog?.notes}</span>
                                </p>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Status Column (Immediately next to Last Update) */}
                        {visibleColumns.status !== false && (
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${getStatusBadgeClass(
                                doc.status
                              )}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{doc.status}</span>
                            </span>
                          </td>
                        )}

                        {/* Assigned Staff */}
                        {visibleColumns.assignedStaff !== false && (
                          <td className="py-3.5 px-4 text-gray-700 font-medium">
                            {doc.assignedStaff || 'Unassigned'}
                          </td>
                        )}

                        {/* Custom Dynamic Columns */}
                        {customFields.map((cf) => {
                          if (visibleColumns[`cf_${cf.key}`] === false) return null;
                          const val = doc.customFields ? doc.customFields[cf.key] : null;

                          return (
                            <td key={cf.id} className="py-3.5 px-4 text-gray-800 font-mono text-xs">
                              {cf.type === 'currency' && typeof val === 'number'
                                ? `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                                : cf.type === 'boolean'
                                ? val
                                  ? '✓ Yes'
                                  : '—'
                                : val !== undefined && val !== null && val !== ''
                                ? String(val)
                                : '—'}
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
                            {(doc.fileData || doc.fileUrl) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPdfViewer(
                                    doc.documentName,
                                    doc.fileData || doc.fileUrl || '',
                                    doc.fileName || `${doc.controlNo}.pdf`,
                                    doc.fileSize,
                                    doc.assignedStaff
                                  );
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition cursor-pointer"
                                title={`Preview PDF: ${doc.fileName || 'Document.pdf'}`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNewSubDocModal(doc);
                              }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition cursor-pointer"
                              title="Attach Linked Sub-Document"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailDrawer(doc);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black transition cursor-pointer"
                              title="View Document Details & Logs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDocumentModal(doc);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black transition cursor-pointer"
                                title="Edit Document & Append Log"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateDocument(doc.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black transition cursor-pointer"
                                title="Duplicate Document"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete document "${doc.controlNo}"?`)) {
                                    deleteDocument(doc.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                                title="Admin: Delete Document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-Documents Accordion Row with EXACT SAME VIEW as Main Document */}
                      {isExpanded && (
                        <tr className="bg-neutral-50/60 border-b border-gray-200">
                          <td colSpan={14} className="p-3 sm:p-4 bg-gray-50/80">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-2">
                              <div className="p-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                    <FileCheck2 className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-xs text-blue-950">
                                      Linked Sub-Documents for {doc.controlNo}
                                    </span>
                                    <span className="text-[11px] text-blue-700 ml-2 font-medium">
                                      ({(doc.subDocuments || []).length} attached instruments)
                                    </span>
                                  </div>
                                </div>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openNewSubDocModal(doc)}
                                    className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-green-400" />
                                    <span>Attach Sub-Document</span>
                                  </button>
                                )}
                              </div>

                              {(doc.subDocuments || []).length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                  <Paperclip className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                  <p className="font-bold text-xs text-gray-600">No Linked Sub-Documents Attached</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5">Click "Attach Sub-Document" to attach BAC resolutions, NOAs, NTPs, or delivery receipts.</p>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-gray-200 bg-neutral-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                                        {visibleColumns.controlNo !== false && <th className="py-2.5 px-4">Sub Control No.</th>}
                                        {visibleColumns.documentName !== false && <th className="py-2.5 px-4">Sub-Document Name</th>}
                                        {visibleColumns.documentType !== false && <th className="py-2.5 px-4">Type</th>}
                                        {visibleColumns.amount !== false && <th className="py-2.5 px-4 text-right">Amount (₱)</th>}
                                        {visibleColumns.sourceOfFunds !== false && <th className="py-2.5 px-4">Source of Funds</th>}
                                        {visibleColumns.divisionSection !== false && <th className="py-2.5 px-4">Division / Section</th>}
                                        {visibleColumns.inputDate !== false && <th className="py-2.5 px-4">Input Date</th>}
                                        {visibleColumns.documentUpdate !== false && <th className="py-2.5 px-4 min-w-[200px]">Last Update (Date & Time)</th>}
                                        {visibleColumns.status !== false && <th className="py-2.5 px-4">Status</th>}
                                        {visibleColumns.assignedStaff !== false && <th className="py-2.5 px-4">Assigned Staff</th>}
                                        {customFields.map((cf) => {
                                          if (visibleColumns[`cf_${cf.key}`] === false) return null;
                                          return (
                                            <th key={cf.id} className="py-2.5 px-4 text-purple-900">
                                              {cf.name}
                                            </th>
                                          );
                                        })}
                                        <th className="py-2.5 px-4 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(doc.subDocuments || []).map((sub, sIdx) => {
                                        const subLogs = sortUpdateLogsDescending(sub.updateLogs || []);
                                        const subTopLog = subLogs[0];
                                        const subDateTime = formatDateTimeDisplay(
                                          subTopLog?.date || sub.documentUpdate || sub.inputDate,
                                          subTopLog?.time,
                                          subTopLog?.timestamp
                                        );
                                        const subIsObr = isObrDocument(sub.documentType);
                                        const subIsTrustFundPr = isPrDocument(sub.documentType) && isTrustFundSource(sub.sourceOfFunds);
                                        const subIsSpend = subIsObr || subIsTrustFundPr;

                                        return (
                                          <tr
                                            key={sub.id}
                                            onClick={() => openEditSubDocModal(doc, sub)}
                                            className="hover:bg-blue-50/40 transition cursor-pointer group"
                                          >
                                            <td className="py-3 px-3 text-center text-gray-400 font-mono text-[10px]">
                                              ↳ {sIdx + 1}
                                            </td>

                                            {/* Control No */}
                                            {visibleColumns.controlNo !== false && (
                                              <td className="py-3 px-4">
                                                <span className="font-mono font-bold text-xs bg-gray-100 text-gray-900 px-2 py-0.5 rounded border border-gray-200">
                                                  {sub.controlNo}
                                                </span>
                                              </td>
                                            )}

                                            {/* Document Name */}
                                            {visibleColumns.documentName !== false && (
                                              <td className="py-3 px-4 min-w-[200px]">
                                                <div className="space-y-0.5">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 block group-hover:text-blue-600 transition truncate max-w-sm">
                                                      {sub.documentName}
                                                    </span>
                                                    {(sub.fileData || sub.fileUrl) && (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openPdfViewer(
                                                            sub.documentName,
                                                            sub.fileData || sub.fileUrl || '',
                                                            sub.fileName || `${sub.controlNo}.pdf`,
                                                            sub.fileSize,
                                                            sub.assignedStaff
                                                          );
                                                        }}
                                                        className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[9px] border border-red-200 flex items-center gap-0.5 shrink-0 transition cursor-pointer"
                                                        title={`Preview PDF: ${sub.fileName || 'Sub-Document.pdf'}`}
                                                      >
                                                        <FileText className="w-2.5 h-2.5 text-red-600" />
                                                        <span>PDF</span>
                                                      </button>
                                                    )}
                                                  </div>
                                                  {sub.description && (
                                                    <span className="text-[11px] text-gray-400 truncate max-w-xs block">
                                                      {sub.description}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                            )}

                                            {/* Type */}
                                            {visibleColumns.documentType !== false && (
                                              <td className="py-3 px-4">
                                                <span className="font-medium text-gray-800 text-xs">
                                                  {sub.documentType}
                                                </span>
                                              </td>
                                            )}

                                            {/* Amount */}
                                            {visibleColumns.amount !== false && (
                                              <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                  {subIsObr && (
                                                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                                      OBR
                                                    </span>
                                                  )}
                                                  {subIsTrustFundPr && (
                                                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold bg-teal-100 text-teal-900 border border-teal-300">
                                                      Trust Fund PR
                                                    </span>
                                                  )}
                                                  <span className={`font-mono font-bold text-xs ${subIsSpend ? 'text-emerald-800' : 'text-gray-900'}`}>
                                                    ₱{(sub.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                  </span>
                                                </div>
                                              </td>
                                            )}

                                            {/* Source of Funds */}
                                            {visibleColumns.sourceOfFunds !== false && (
                                              <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-gray-800 font-medium text-[11px] border border-gray-200">
                                                  {sub.sourceOfFunds}
                                                </span>
                                              </td>
                                            )}

                                            {/* Division / Section */}
                                            {visibleColumns.divisionSection !== false && (
                                              <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 rounded-md bg-indigo-50/60 text-indigo-900 font-medium text-[11px] border border-indigo-200">
                                                  {sub.divisionSection || doc.divisionSection || 'Unassigned'}
                                                </span>
                                              </td>
                                            )}

                                            {/* Input Date */}
                                            {visibleColumns.inputDate !== false && (
                                              <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                                                {sub.inputDate}
                                              </td>
                                            )}

                                            {/* Last Update */}
                                            {visibleColumns.documentUpdate !== false && (
                                              <td className="py-3 px-4 min-w-[200px]">
                                                <div className="space-y-0.5 font-mono text-[11px]">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-900">
                                                      {subDateTime.dateFormatted}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">
                                                      {subDateTime.timeFormatted}
                                                    </span>
                                                  </div>
                                                  {(sub.latestUpdateNotes || subTopLog?.notes) && (
                                                    <p className="text-[10.5px] text-gray-600 truncate max-w-xs italic">
                                                      ↳ {sub.latestUpdateNotes || subTopLog?.notes}
                                                    </p>
                                                  )}
                                                </div>
                                              </td>
                                            )}

                                            {/* Status */}
                                            {visibleColumns.status !== false && (
                                              <td className="py-3 px-4">
                                                <span
                                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${getStatusBadgeClass(
                                                    sub.status
                                                  )}`}
                                                >
                                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                  <span>{sub.status}</span>
                                                </span>
                                              </td>
                                            )}

                                            {/* Assigned Staff */}
                                            {visibleColumns.assignedStaff !== false && (
                                              <td className="py-3 px-4 text-gray-700 font-medium">
                                                {sub.assignedStaff || 'Unassigned'}
                                              </td>
                                            )}

                                            {/* Custom Fields */}
                                            {customFields.map((cf) => {
                                              if (visibleColumns[`cf_${cf.key}`] === false) return null;
                                              const val = sub.customFields ? sub.customFields[cf.key] : null;
                                              return (
                                                <td key={cf.id} className="py-3 px-4 text-gray-800 font-mono text-xs">
                                                  {val !== undefined && val !== null && val !== '' ? String(val) : '—'}
                                                </td>
                                              );
                                            })}

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right">
                                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
                                                {(sub.fileData || sub.fileUrl) && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openPdfViewer(
                                                        sub.documentName,
                                                        sub.fileData || sub.fileUrl || '',
                                                        sub.fileName || `${sub.controlNo}.pdf`,
                                                        sub.fileSize,
                                                        sub.assignedStaff
                                                      );
                                                    }}
                                                    className="p-1 rounded hover:bg-red-50 text-red-600 transition cursor-pointer"
                                                    title={`Preview PDF: ${sub.fileName || 'Sub-Document.pdf'}`}
                                                  >
                                                    <FileText className="w-3.5 h-3.5" />
                                                  </button>
                                                )}

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditSubDocModal(doc, sub);
                                                  }}
                                                  className="p-1 rounded hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                                                  title="Edit Sub-Document"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>

                                                {isAdmin && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (window.confirm(`Delete sub-document "${sub.controlNo}"?`)) {
                                                        deleteSubDocument(doc.id, sub.id);
                                                      }
                                                    }}
                                                    className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                                                    title="Admin: Delete Sub-Document"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-neutral-50/80 border-t border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-xl border border-gray-300 bg-white font-medium outline-hidden"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-gray-400 font-mono text-[11px] ml-2">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`p-1.5 rounded-xl border flex items-center justify-center ${
                currentPage === 1
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 hover:bg-white text-gray-700 cursor-pointer shadow-2xs'
              }`}
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .map((page, index, array) => {
                const prevPage = array[index - 1];
                const showEllipsis = prevPage && page - prevPage > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer text-xs ${
                        currentPage === page
                          ? 'bg-black text-white'
                          : 'border border-gray-300 hover:bg-white text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1.5 rounded-xl border flex items-center justify-center ${
                currentPage === totalPages
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 hover:bg-white text-gray-700 cursor-pointer shadow-2xs'
              }`}
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
