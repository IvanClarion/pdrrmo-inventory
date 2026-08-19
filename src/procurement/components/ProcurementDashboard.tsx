import React, { useState, useMemo } from 'react';
import { useProcurement } from '../ProcurementContext';
import { isObrDocument, isTrustFundSource, isPrDocument, isSpendContributor } from '../types';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Layers,
  ShieldCheck,
  TrendingUp,
  FolderKanban,
  ChevronRight,
  ArrowUpRight,
  PieChart,
  BarChart3,
  Calendar,
  AlertOctagon,
  Sliders,
  Building2,
  Info,
  Check,
} from 'lucide-react';

export const ProcurementDashboard: React.FC = () => {
  const {
    documents,
    totalDocuments,
    totalAmount,
    totalSpendDocsCount,
    totalObrCount,
    totalAllDocsAmount,
    activeDocumentsCount,
    completedCount,
    bacProcessingCount,
    staleDocumentsCount,
    alerts,
    fundSources,
    divisionSections,
    documentTypes,
    openNewDocumentModal,
    openDetailDrawer,
    setIsCustomFieldsModalOpen,
    setIsUserAccessModalOpen,
    setIsWorkflowModalOpen,
    setActiveSubTab,
    canEdit,
    canManageFields,
    canManageAccess,
    staleDaysThreshold,
    isAdmin,
  } = useProcurement();

  // Switch between Spend by Source of Fund OR Division/Section
  const [spendGroupBy, setSpendGroupBy] = useState<'fund' | 'division'>('fund');

  // Filter documents contributing to total spend: OBRs + Trust Fund PRs (Strictly from Supabase DB)
  const spendDocuments = useMemo(() => documents.filter((d) => isSpendContributor(d)), [documents]);
  const totalSpendAmount = totalAmount;

  // Count breakdowns
  const trustFundPrCount = useMemo(
    () => spendDocuments.filter((d) => isPrDocument(d.documentType) && isTrustFundSource(d.sourceOfFunds)).length,
    [spendDocuments]
  );

  // Dynamic database fund sources (from Supabase lookup table + distinct in docs)
  const allDbFundSources = useMemo(() => {
    const list = [...fundSources];
    spendDocuments.forEach((d) => {
      if (d.sourceOfFunds && !list.includes(d.sourceOfFunds)) {
        list.push(d.sourceOfFunds);
      }
    });
    return list;
  }, [fundSources, spendDocuments]);

  // 1. Spend by Fund Source Breakdown (OBRs + Trust Fund PRs) - 100% Database Driven
  const fundSpend = useMemo(() => {
    return allDbFundSources
      .map((source) => {
        const matchingDocs = spendDocuments.filter((d) => d.sourceOfFunds === source);
        const amount = matchingDocs.reduce((acc, d) => acc + (d.amount || 0), 0);
        const count = matchingDocs.length;
        const percentage = totalSpendAmount > 0 ? (amount / totalSpendAmount) * 100 : 0;
        const isTrustFund = isTrustFundSource(source);
        return { name: source, amount, count, percentage, isTrustFund };
      })
      .filter((f) => f.count > 0 || fundSources.includes(f.name))
      .sort((a, b) => b.amount - a.amount);
  }, [allDbFundSources, spendDocuments, totalSpendAmount, fundSources]);

  // Dynamic database divisions
  const allDbDivisions = useMemo(() => {
    const list = [...divisionSections];
    spendDocuments.forEach((d) => {
      if (d.divisionSection && !list.includes(d.divisionSection)) {
        list.push(d.divisionSection);
      }
    });
    return list;
  }, [divisionSections, spendDocuments]);

  // 2. Spend by Division / Section Breakdown (OBRs + Trust Fund PRs) - 100% Database Driven
  const divisionSpend = useMemo(() => {
    return allDbDivisions
      .map((division) => {
        const matchingDocs = spendDocuments.filter((d) => d.divisionSection === division);
        const amount = matchingDocs.reduce((acc, d) => acc + (d.amount || 0), 0);
        const count = matchingDocs.length;
        const percentage = totalSpendAmount > 0 ? (amount / totalSpendAmount) * 100 : 0;
        return { name: division, amount, count, percentage };
      })
      .filter((d) => d.count > 0 || divisionSections.includes(d.name))
      .sort((a, b) => b.amount - a.amount);
  }, [allDbDivisions, spendDocuments, totalSpendAmount, divisionSections]);

  const activeSpendList = spendGroupBy === 'fund' ? fundSpend : divisionSpend;

  // Document count and spend by Type (Dynamic Database Driven)
  const allDbDocumentTypes = useMemo(() => {
    const list = [...documentTypes];
    documents.forEach((d) => {
      if (d.documentType && !list.includes(d.documentType)) {
        list.push(d.documentType);
      }
    });
    return list;
  }, [documentTypes, documents]);

  const typeBreakdown = useMemo(() => {
    return allDbDocumentTypes
      .map((type) => {
        const matchingDocs = documents.filter((d) => d.documentType === type);
        const spendContributingDocs = matchingDocs.filter((d) => isSpendContributor(d));
        const spendAmount = spendContributingDocs.reduce((acc, d) => acc + (d.amount || 0), 0);
        const isObr = isObrDocument(type);
        const isPr = isPrDocument(type);
        const amount = matchingDocs.reduce((acc, d) => acc + (d.amount || 0), 0);
        const count = matchingDocs.length;
        return {
          type,
          count,
          amount,
          spendAmount,
          spendCount: spendContributingDocs.length,
          isObr,
          isPr,
          isFullContributor: isObr,
          isPartialContributor: isPr && spendContributingDocs.length > 0,
        };
      })
      .filter((t) => t.count > 0)
      .sort((a, b) => (b.isFullContributor || b.isPartialContributor ? 1 : 0) - (a.isFullContributor || a.isPartialContributor ? 1 : 0) || b.count - a.count);
  }, [allDbDocumentTypes, documents]);

  // Recent 5 documents
  const recentDocuments = [...documents]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome / Hero Banner */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-black text-white text-[10px] font-extrabold uppercase tracking-wider">
                Procurement Tracker
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                OBR & Trust Fund PR Valuation Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] tracking-tight">
              Procurement Documents & Requisition Dashboard
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
              Monitoring <span className="font-bold text-[#1A1A1A]">{totalDocuments} total procurement documents</span> • Total Spend Valuation:{' '}
              <span className="font-bold text-emerald-700 font-mono">
                ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>{' '}
              ({totalObrCount} OBRs{trustFundPrCount > 0 ? ` + ${trustFundPrCount} Trust Fund PRs` : ''})
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={openNewDocumentModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-green-400" />
                <span>New Document</span>
              </button>
            )}

            {canManageFields && (
              <button
                type="button"
                onClick={() => setIsWorkflowModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#1A1A1A] font-bold text-xs transition cursor-pointer"
                title="Customize Source of Funds, Divisions/Sections, Statuses & Types"
              >
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>Funds, Divisions & Statuses</span>
              </button>
            )}

            {canManageFields && (
              <button
                type="button"
                onClick={() => setIsCustomFieldsModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#1A1A1A] font-bold text-xs transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Custom Fields</span>
              </button>
            )}

            {canManageAccess && (
              <button
                type="button"
                onClick={() => setIsUserAccessModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-50 text-[#1A1A1A] font-bold text-xs transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Access & Roles</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stale Updates Warning Alert Banner */}
      {staleDocumentsCount > 0 && (
        <div
          onClick={() => setActiveSubTab('alerts')}
          className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-50 to-white border border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-400 transition shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <span>{staleDocumentsCount} Procurement Document{staleDocumentsCount === 1 ? '' : 's'} Require Status Updates</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  Overdue &gt; {staleDaysThreshold} Days
                </span>
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Requisitions and purchase orders with no progress logged in more than {staleDaysThreshold} days. Click to view alert details and update progress.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0">
            <span>View Alerts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Top 5 KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Value (Obligation Request / OBR + Trust Fund PR) */}
        <div
          onClick={() => setActiveSubTab('documents')}
          className="bg-white border border-emerald-300 hover:border-black cursor-pointer rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-emerald-900 font-bold uppercase tracking-wider">Total Value</p>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  OBR + Trust Fund PR
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 font-bold">
                ₱
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-xl sm:text-2xl font-bold font-mono text-emerald-950 tracking-tight truncate">
                ₱
                {totalAmount >= 1000000
                  ? `${(totalAmount / 1000000).toFixed(2)}M`
                  : totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 group-hover:text-black mt-3 block transition flex items-center justify-between">
            <span>{totalSpendDocsCount} spend docs ({totalObrCount} OBRs{trustFundPrCount > 0 ? `, ${trustFundPrCount} PRs` : ''}) →</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Card 2: Active Documents */}
        <div
          onClick={() => setActiveSubTab('documents')}
          className="bg-white border border-[#E5E5E5] hover:border-black cursor-pointer rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Documents</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
                {activeDocumentsCount} Docs
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded text-blue-700 bg-blue-50 border border-blue-200">
                In Pipeline
              </span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-black mt-3 block transition flex items-center justify-between">
            <span>Browse active list →</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Card 3: BAC Processing */}
        <div
          onClick={() => setActiveSubTab('documents')}
          className="bg-white border border-[#E5E5E5] hover:border-black cursor-pointer rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">BAC & Review</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 text-purple-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
                {bacProcessingCount} Docs
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded text-purple-700 bg-purple-50 border border-purple-200">
                Pending BAC
              </span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-black mt-3 block transition flex items-center justify-between">
            <span>Filter BAC stage →</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Card 4: Completed / Liquidated */}
        <div
          onClick={() => setActiveSubTab('documents')}
          className="bg-white border border-[#E5E5E5] hover:border-black cursor-pointer rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Completed / Paid</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-teal-50 text-teal-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
                {completedCount} Docs
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded text-teal-700 bg-teal-50 border border-teal-200">
                Liquidated
              </span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-black mt-3 block transition flex items-center justify-between">
            <span>View completed →</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Card 5: Stale Updates Alert */}
        <div
          onClick={() => setActiveSubTab('alerts')}
          className={`bg-white border hover:border-black cursor-pointer rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between ${
            staleDocumentsCount > 0 ? 'border-amber-300' : 'border-[#E5E5E5]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Status Alerts</p>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  staleDocumentsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <h3
                className={`text-2xl font-bold tracking-tight ${
                  staleDocumentsCount > 0 ? 'text-amber-900' : 'text-[#1A1A1A]'
                }`}
              >
                {staleDocumentsCount} Alerts
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  staleDocumentsCount > 0
                    ? 'text-amber-800 bg-amber-100 border border-amber-200'
                    : 'text-gray-600 bg-gray-100'
                }`}
              >
                {staleDocumentsCount > 0 ? 'Action Req.' : 'All Updated'}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 group-hover:text-black mt-3 block transition flex items-center justify-between">
            <span>View alert center →</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Main Analytics Grid: Spend Breakdown & Document Types Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Spending Breakdown (Source of Fund OR Division/Section) */}
        <div className="lg:col-span-2 bg-white border border-[#E5E5E5] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#1A1A1A]">
                    Procurement Spend ({spendGroupBy === 'fund' ? 'Source of Funds' : 'Division / Section'})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    OBR + Trust Fund PR
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Includes Obligation Requests (OBR) and Purchase Requests (PR) funded by Trust Funds
                </p>
              </div>
            </div>

            {/* View Selector (Source of Fund vs Division/Section) & Customize Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSpendGroupBy('fund')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    spendGroupBy === 'fund'
                      ? 'bg-white text-black shadow-2xs'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>Source of Fund</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpendGroupBy('division')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    spendGroupBy === 'division'
                      ? 'bg-white text-black shadow-2xs'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span>Division / Section</span>
                </button>
              </div>

              {canManageFields && (
                <button
                  type="button"
                  onClick={() => setIsWorkflowModalOpen(true)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                  title="Customize Source of Funds & Division Lists (Admin)"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Spend List with Progress Bars */}
          <div className="space-y-3.5">
            {activeSpendList.map((item, idx) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-4 h-4 rounded-full bg-black text-white text-[9px] font-mono flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-gray-800 truncate">{item.name}</span>
                    <span className="text-gray-400 text-[11px] shrink-0">
                      ({item.count} {item.count === 1 ? 'doc' : 'docs'})
                    </span>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="font-bold text-gray-900">
                      ₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-gray-500 text-[10px] ml-2">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(item.percentage, item.amount > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 flex-wrap gap-2">
            <span className="flex items-center gap-1 italic">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>OBR documents & Trust Fund Purchase Requests contribute to spend totals. Other requisitions are logged for tracking.</span>
            </span>
            <span className="font-bold font-mono text-emerald-800">
              Total Spend: ₱{totalSpendAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Right Column: Document Type Volume Breakdown */}
        <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1A1A1A]">Document Types</h3>
                <p className="text-[11px] text-gray-500">Volume by document classification</p>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {typeBreakdown.length} Categories
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1">
            {typeBreakdown.map((item) => (
              <div
                key={item.type}
                className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                  item.isFullContributor
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : item.isPartialContributor
                    ? 'bg-teal-50/50 border-teal-300'
                    : 'bg-neutral-50 hover:bg-gray-100 border-[#E5E5E5]'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-900 text-xs block truncate">{item.type}</span>
                    {item.isFullContributor && (
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-200 text-emerald-900">
                        Summed in Spend (All OBR)
                      </span>
                    )}
                    {item.isPartialContributor && (
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-teal-200 text-teal-900">
                        Summed ({item.spendCount} Trust Fund PR)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Total Face: ₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-gray-900 font-bold text-xs shadow-2xs font-mono">
                    {item.count} Docs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Procurement Feed */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <FolderKanban className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A]">Recently Updated Procurement Documents</h3>
              <p className="text-[11px] text-gray-500">Latest active files and status transitions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('documents')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({totalDocuments})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {recentDocuments.map((doc) => {
            const isObr = isObrDocument(doc.documentType);
            const isTrustPr = isPrDocument(doc.documentType) && isTrustFundSource(doc.sourceOfFunds);
            const isSpend = isObr || isTrustPr;

            return (
              <div
                key={doc.id}
                onClick={() => openDetailDrawer(doc)}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70 p-2 rounded-2xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                      isObr
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isTrustPr
                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isObr ? 'OBR' : doc.documentType.includes('PR') ? 'PR' : doc.documentType.includes('PO') ? 'PO' : 'DOC'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {doc.controlNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {doc.status}
                      </span>
                      {doc.divisionSection && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-neutral-100 text-gray-700 border border-gray-200">
                          {doc.divisionSection}
                        </span>
                      )}
                      {isTrustPr && (
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                          Trust Fund PR (In Spend)
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-900 text-xs truncate mt-0.5">
                      {doc.documentName}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">
                      Fund: {doc.sourceOfFunds} • Officer: {doc.assignedStaff || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 pl-12 sm:pl-0">
                  <span
                    className={`font-mono font-bold text-sm ${
                      isSpend ? 'text-emerald-700' : 'text-gray-800'
                    }`}
                  >
                    ₱{(doc.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Updated: {doc.documentUpdate || doc.inputDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
