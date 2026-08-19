import React, { useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useInventory } from '../context/InventoryContext';
import {
  History,
  Search,
  ShieldAlert,
  Download,
  Trash2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, transactions, hasPermission, purgeAuditLogs, isLoadingDatabase } = useInventory();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [signatureModalUrl, setSignatureModalUrl] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const exportLogsToCsv = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Severity', 'Details', 'IP Address'];
    const rows = auditLogs.map((l) => [
      l.timestamp,
      l.userName,
      l.userRole,
      l.action,
      l.severity,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pdrrmo_inventory_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-6 w-full min-w-0">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A] flex items-center gap-2 tracking-tight">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-black shrink-0" />
            <span>Immutable Audit Trail & Activity Logs</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
            Real-time compliance ledger recording every check-in, check-out, adjustment, and permission change.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportLogsToCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F5F5] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {hasPermission('canPurgeAuditLogs') && (
            <button
              onClick={() => {
                if (confirm('CRITICAL: Are you sure you want to purge all audit logs?')) {
                  purgeAuditLogs();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge Audit Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Severity Filter */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, user name, or detail keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
        >
          <option value="ALL">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="w-full max-w-full min-w-0 bg-white border border-[#E5E5E5] rounded-2xl shadow-sm overflow-hidden">
        {/* Scrollable table viewport */}
        <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-visible touch-pan-x overscroll-x-contain pb-1">
          <table className="w-full min-w-[880px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5] text-[#1A1A1A] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-4 min-w-[180px]">Timestamp</th>
                <th className="py-3 px-4 min-w-[150px]">User & Role</th>
                <th className="py-3 px-4 min-w-[150px]">Action</th>
                <th className="py-3 px-4 min-w-[90px]">Severity</th>
                <th className="py-3 px-4 min-w-[240px]">Audit Details</th>
                <th className="py-3 px-4 min-w-[110px]">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {isLoadingDatabase ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4">
                      <Skeleton width={140} height={12} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Skeleton circle width={24} height={24} />
                        <div>
                          <Skeleton width={80} height={12} />
                          <Skeleton width={50} height={8} className="mt-0.5" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton width={100} height={14} />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton width={60} height={18} borderRadius={4} />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton width="90%" height={12} />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton width={70} height={10} />
                    </td>
                  </tr>
                ))
              ) : (
                filteredLogs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleString();
                return (
                  <tr key={log.id} className="hover:bg-[#F9F9F9] transition">
                    <td className="py-3 px-4 font-mono text-gray-500 whitespace-nowrap flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{dateStr}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[#1A1A1A] font-bold text-[10px]">
                          {log.userName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-[#1A1A1A] block">{log.userName}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{log.userRole}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-black whitespace-nowrap">
                      {log.action}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.severity === 'critical'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : log.severity === 'warning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {log.severity.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-gray-700 max-w-md">{log.details}</td>

                    <td className="py-3 px-4 font-mono text-[10px] text-gray-400">{log.ipAddress}</td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Physical Transactions with Signatures Section */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-[#1A1A1A] text-sm">Recent Signed Movement Log Entries</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {transactions.slice(0, 6).map((tx) => (
            <div key={tx.id} className="p-3.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] text-xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span
                    className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                      tx.type === 'CHECK_OUT'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}
                  >
                    {tx.type}
                  </span>
                  <h4 className="font-bold text-[#1A1A1A] mt-1 truncate">{tx.itemName}</h4>
                </div>
                <span className="font-bold text-[#1A1A1A]">{tx.quantity} Units</span>
              </div>

              <p className="text-[10px] text-gray-500">
                User: <span className="text-[#1A1A1A] font-bold">{tx.userName}</span> | Assignee: <span className="text-[#1A1A1A] font-bold">{tx.assigneeOrProject || 'N/A'}</span>
              </p>

              {tx.signatureDataUrl && (
                <button
                  onClick={() => setSignatureModalUrl(tx.signatureDataUrl!)}
                  className="text-[10px] text-black font-bold hover:underline block"
                >
                  ✍️ View Digital Signature
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Signature Modal */}
      {signatureModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <h3 className="font-bold text-[#1A1A1A]">Digital Sign-Off Signature</h3>
            <div className="bg-[#F9F9F9] p-2 rounded-xl border border-[#E5E5E5]">
              <img src={signatureModalUrl} alt="Signature" className="w-full h-32 object-contain" />
            </div>
            <button
              onClick={() => setSignatureModalUrl(null)}
              className="w-full py-2 bg-black text-white rounded-xl font-bold text-xs hover:bg-neutral-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
