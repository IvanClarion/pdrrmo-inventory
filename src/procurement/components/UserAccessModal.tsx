import React, { useState } from 'react';
import { useProcurement } from '../ProcurementContext';
import { useInventory } from '../../context/InventoryContext';
import { ProcurementRole } from '../types';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Users,
  Search,
  Lock,
  Unlock,
} from 'lucide-react';

export const UserAccessModal: React.FC = () => {
  const {
    isUserAccessModalOpen,
    setIsUserAccessModalOpen,
    userAccessList,
    grantUserAccess,
    revokeUserAccess,
    updateUserRole,
    canManageAccess,
  } = useProcurement();

  const { users } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isUserAccessModalOpen) return null;

  // Filter system users by search query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      u.roleName.toLowerCase().includes(q)
    );
  });

  const totalUsers = users.length;
  const grantedCount = users.filter((u) => {
    if (u.roleName === 'Admin') return true;
    const access = userAccessList.find(
      (a) => a.userId === u.id || a.userEmail.toLowerCase() === u.email.toLowerCase()
    );
    return Boolean(access?.hasAccess);
  }).length;

  const handleToggleAccess = (user: (typeof users)[0], currentlyGranted: boolean) => {
    if (user.roleName === 'Admin') return; // Admins always have master access

    if (currentlyGranted) {
      revokeUserAccess(user.id);
    } else {
      const defaultRole: ProcurementRole =
        user.roleName === 'Inventory Manager' ? 'Procurement Officer' : 'Procurement Staff / Viewer';
      grantUserAccess(user.id, user.name, user.email, defaultRole);
    }
  };

  const handleRoleChange = (userId: string, newRole: ProcurementRole) => {
    updateUserRole(userId, newRole);
  };

  // Quick Preset Actions
  const handleGrantAdminsAndManagers = () => {
    users.forEach((u) => {
      if (u.roleName === 'Admin' || u.roleName === 'Inventory Manager') {
        grantUserAccess(
          u.id,
          u.name,
          u.email,
          u.roleName === 'Admin' ? 'Procurement Admin' : 'Procurement Officer'
        );
      } else {
        revokeUserAccess(u.id);
      }
    });
  };

  const handleGrantAll = () => {
    users.forEach((u) => {
      let role: ProcurementRole = 'Procurement Staff / Viewer';
      if (u.roleName === 'Admin') role = 'Procurement Admin';
      else if (u.roleName === 'Inventory Manager') role = 'Procurement Officer';
      grantUserAccess(u.id, u.name, u.email, role);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E5E5E5] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1A1A1A]">
                  Procurement Access & Role Control
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                  {grantedCount} of {totalUsers} Granted Access
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Admin authority: Grant or restrict access to the Procurement Documents Tracker module
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUserAccessModalOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls & Presets */}
        <div className="p-4 bg-[#F9F9F9] border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name, email, department..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-300 focus:border-black outline-hidden"
            />
          </div>

          {canManageAccess && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500">Quick Presets:</span>
              <button
                type="button"
                onClick={handleGrantAdminsAndManagers}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-100 text-gray-800 font-bold transition cursor-pointer"
              >
                Admins & Managers Only
              </button>
              <button
                type="button"
                onClick={handleGrantAll}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-gray-100 text-gray-800 font-bold transition cursor-pointer"
              >
                Grant All Users
              </button>
            </div>
          )}
        </div>

        {/* User Table List */}
        <div className="overflow-y-auto flex-1 p-6 text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3 px-3">Officer / User</th>
                <th className="pb-3 px-3">Department</th>
                <th className="pb-3 px-3">System Role</th>
                <th className="pb-3 px-3 text-center">Module Access</th>
                <th className="pb-3 px-3">Procurement Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => {
                const isSystemAdmin = u.roleName === 'Admin';
                const accessRecord = userAccessList.find(
                  (a) => a.userId === u.id || a.userEmail.toLowerCase() === u.email.toLowerCase()
                );
                const isGranted = isSystemAdmin || Boolean(accessRecord?.hasAccess);
                const currentProcRole: ProcurementRole = isSystemAdmin
                  ? 'Procurement Admin'
                  : accessRecord?.role || 'Procurement Staff / Viewer';

                return (
                  <tr key={u.id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block text-xs">{u.name}</span>
                          <span className="text-gray-400 text-[11px]">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-gray-600 font-medium">{u.department || 'PDRRMO'}</td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold text-[10px] uppercase tracking-wider">
                        {u.roleName}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {isSystemAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black text-white font-bold text-[10px]">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Admin (Always Granted)</span>
                        </span>
                      ) : canManageAccess ? (
                        <button
                          type="button"
                          onClick={() => handleToggleAccess(u, isGranted)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] transition cursor-pointer ${
                            isGranted
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                          }`}
                        >
                          {isGranted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                              <span>Granted</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-gray-400" />
                              <span>Restricted</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isGranted
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isGranted ? 'Granted' : 'Restricted'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {isSystemAdmin ? (
                        <span className="font-bold text-gray-900 font-mono text-[11px]">
                          Procurement Admin
                        </span>
                      ) : isGranted && canManageAccess ? (
                        <select
                          value={currentProcRole}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as ProcurementRole)}
                          className="px-2.5 py-1 rounded-lg border border-gray-300 focus:border-black outline-hidden bg-white font-medium text-xs"
                        >
                          <option value="Procurement Admin">Procurement Admin (Full)</option>
                          <option value="Procurement Officer">Procurement Officer (Edit)</option>
                          <option value="Procurement Staff / Viewer">Staff / Viewer (Read)</option>
                        </select>
                      ) : (
                        <span className="text-gray-400 italic">
                          {isGranted ? currentProcRole : 'No Access'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F5F5F5] border-t border-[#E5E5E5] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => setIsUserAccessModalOpen(false)}
            className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl transition cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
