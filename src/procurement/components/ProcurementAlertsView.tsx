import React, { useState } from 'react';
import { useProcurement } from '../ProcurementContext';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  DollarSign,
  UserX,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  Bell,
  ArrowRight,
} from 'lucide-react';

export const ProcurementAlertsView: React.FC = () => {
  const {
    alerts,
    documents,
    staleDaysThreshold,
    setStaleDaysThreshold,
    openDetailDrawer,
    openEditDocumentModal,
    canManageFields,
  } = useProcurement();

  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'critical' | 'warning' | 'info'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STALE_UPDATE' | 'HIGH_VALUE' | 'UNASSIGNED_STAFF'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info').length;

  const handleDocumentClick = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      openDetailDrawer(doc);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Threshold Settings Card */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider">
              Alerts & Notifications Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-800 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
              {alerts.length} Active System Notices
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] tracking-tight">
            Procurement Monitoring & Exceptions Alert Center
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Automated alerts for delayed status updates, high-value procurement thresholds, and missing personnel assignments.
          </p>
        </div>

        {/* Admin Threshold Configurator */}
        {canManageFields && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 border border-[#E5E5E5] shrink-0 text-xs">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Stale Update Alert Threshold
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={staleDaysThreshold}
                  onChange={(e) => setStaleDaysThreshold(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white font-bold text-xs"
                >
                  <option value={7}>7 Days (Strict Monitoring)</option>
                  <option value={14}>14 Days (Standard Oversight)</option>
                  <option value={21}>21 Days (Relaxed)</option>
                  <option value={30}>30 Days (Monthly Sweep)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-xs text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-400 font-bold uppercase text-[10px] mr-1">Severity:</span>
          <button
            type="button"
            onClick={() => setSeverityFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              severityFilter === 'ALL'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('critical')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'critical'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Critical ({criticalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('warning')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warning ({warningCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('info')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Information ({infoCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase text-[10px]">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium"
          >
            <option value="ALL">All Alert Types</option>
            <option value="STALE_UPDATE">Delayed / Stale Updates</option>
            <option value="HIGH_VALUE">High-Value Requisitions</option>
            <option value="UNASSIGNED_STAFF">Unassigned Staff</option>
          </select>
        </div>
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-bold mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900">All Procurement Documents Up to Date</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              No overdue update exceptions or missing assignments found. The system continuously monitors all active procurement items.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                onClick={() => handleDocumentClick(alert.documentId)}
                className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                  isCritical
                    ? 'border-red-300 hover:border-red-500 bg-gradient-to-r from-red-50/40 via-white to-white'
                    : isWarning
                    ? 'border-amber-300 hover:border-amber-500 bg-gradient-to-r from-amber-50/40 via-white to-white'
                    : 'border-blue-200 hover:border-blue-400 bg-gradient-to-r from-blue-50/40 via-white to-white'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-xs ${
                      isCritical
                        ? 'bg-red-600 text-white'
                        : isWarning
                        ? 'bg-amber-500 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {alert.type === 'STALE_UPDATE' ? (
                      <Clock className="w-5 h-5" />
                    ) : alert.type === 'HIGH_VALUE' ? (
                      <DollarSign className="w-5 h-5" />
                    ) : (
                      <UserX className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCritical
                            ? 'bg-red-100 text-red-900 border border-red-200'
                            : isWarning
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}
                      >
                        {alert.title}
                      </span>
                      <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                        {alert.documentControlNo}
                      </span>
                    </div>

                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                      {alert.documentName}
                    </h4>

                    <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
                      {alert.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDocumentClick(alert.documentId);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                  >
                    <span>Inspect File</span>
                    <ArrowRight className="w-3.5 h-3.5 text-green-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
