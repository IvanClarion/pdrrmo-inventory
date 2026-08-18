import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { UserRegistrationRequest, UserRoleName } from '../types';
import { UserQRBadgeModal } from './UserQRBadgeModal';
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building,
  Briefcase,
  Phone,
  Mail,
  KeyRound,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  Check,
  X,
  QrCode,
  MapPin,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const AdminRegistrationsView: React.FC = () => {
  const {
    registrationRequests,
    pendingRegistrationCount,
    roles,
    locations,
    users,
    approveRegistration,
    rejectRegistration,
    deleteRegistrationRequest,
    isAdmin,
    isSessionAuthenticated,
    openLoginModal,
    currentUser,
    requiresAuth,
  } = useInventory();

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  // Approval Modal State
  const [selectedReqForApproval, setSelectedReqForApproval] = useState<UserRegistrationRequest | null>(null);
  const [assignedRoleId, setAssignedRoleId] = useState<string>('');
  const [assignedLocationId, setAssignedLocationId] = useState<string>('');

  // Rejection Modal State
  const [selectedReqForRejection, setSelectedReqForRejection] = useState<UserRegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Generated User QR Badge Preview
  const [viewingUserBadge, setViewingUserBadge] = useState<any | null>(null);

  // Success Feedback Banner
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleOpenApproveModal = (req: UserRegistrationRequest) => {
    if (requiresAuth(currentUser) && !isSessionAuthenticated) {
      openLoginModal(currentUser);
      return;
    }

    setSelectedReqForApproval(req);
    // Preselect role matching requested role or fallback to Staff
    const matchedRole = roles.find((r) => r.name.toLowerCase() === req.requestedRoleName?.toLowerCase()) || roles.find((r) => r.name === 'Staff') || roles[0];
    setAssignedRoleId(matchedRole?.id || roles[0]?.id || '');
    setAssignedLocationId(locations[0]?.id || '');
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForApproval) return;

    const result = approveRegistration(
      selectedReqForApproval.id,
      assignedRoleId,
      assignedLocationId || undefined
    );

    if (result.success) {
      const approvedReqName = selectedReqForApproval.fullName;
      const approvedEmail = selectedReqForApproval.email;
      setSelectedReqForApproval(null);
      setActionSuccessMsg(`Account for "${approvedReqName}" has been successfully approved and activated!`);
      setTimeout(() => setActionSuccessMsg(null), 5000);

      // Find the newly created user to allow badge view
      const newlyCreatedUser = users.find((u) => u.email.toLowerCase() === approvedEmail.toLowerCase());
      if (newlyCreatedUser) {
        setViewingUserBadge(newlyCreatedUser);
      }
    }
  };

  const handleOpenRejectModal = (req: UserRegistrationRequest) => {
    if (requiresAuth(currentUser) && !isSessionAuthenticated) {
      openLoginModal(currentUser);
      return;
    }
    setSelectedReqForRejection(req);
    setRejectionReason('');
  };

  const handleConfirmRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForRejection) return;

    const result = rejectRegistration(selectedReqForRejection.id, rejectionReason.trim());
    if (result.success) {
      const rejectedName = selectedReqForRejection.fullName;
      setSelectedReqForRejection(null);
      setActionSuccessMsg(`Registration application for "${rejectedName}" was declined.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const filteredRequests = registrationRequests
    .filter((r) => {
      if (filterStatus === 'ALL') return true;
      return r.status === filterStatus;
    })
    .filter((r) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        (r.position && r.position.toLowerCase().includes(q))
      );
    });

  const totalCount = registrationRequests.length;
  const pendingCount = registrationRequests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = registrationRequests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = registrationRequests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-[#1A1A1A]">
                Staff Registration & Access Approvals
              </h3>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[11px] animate-pulse">
                  {pendingCount} Action Required
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
              Review, verify, and confirm pending employee and disaster responder registration applications. Approved applicants are automatically assigned security credentials, roles, and printable QR badges.
            </p>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-[#F9F9F9] text-gray-600 border-[#E5E5E5] hover:bg-gray-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
              filterStatus === 'APPROVED'
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-[#F9F9F9] text-gray-600 border-[#E5E5E5] hover:bg-gray-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({approvedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
              filterStatus === 'REJECTED'
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-[#F9F9F9] text-gray-600 border-[#E5E5E5] hover:bg-gray-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({rejectedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-[#F9F9F9] text-gray-600 border-[#E5E5E5] hover:bg-gray-100'
            }`}
          >
            <span>All ({totalCount})</span>
          </button>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by applicant name, email, department, position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
          />
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Showing <span className="font-bold text-black">{filteredRequests.length}</span> registration {filteredRequests.length === 1 ? 'record' : 'records'}
        </div>
      </div>

      {/* Registrations List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-[#1A1A1A]">No Registration Requests Found</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {filterStatus === 'PENDING'
              ? 'There are currently no new registration applications awaiting Administrator review.'
              : `No registration records matching the selected status (${filterStatus}) or search term.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            const matchedActiveUser = users.find((u) => u.email.toLowerCase() === req.email.toLowerCase());

            return (
              <div
                key={req.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition space-y-4 flex flex-col justify-between ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200/50'
                    : 'border-[#E5E5E5] hover:border-gray-300'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 border border-slate-700 shadow-xs">
                        {req.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-[#1A1A1A] text-sm truncate">{req.fullName}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{req.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-300 shadow-xs">
                          <Clock className="w-3 h-3" />
                          <span>Pending Approval</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1 border border-emerald-300 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved & Active</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-black uppercase flex items-center gap-1 border border-rose-300 shadow-xs">
                          <XCircle className="w-3 h-3" />
                          <span>Declined</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-0.5">
                      <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <Building className="w-2.5 h-2.5" />
                        <span>Department</span>
                      </span>
                      <span className="font-bold text-[#1A1A1A] block truncate">{req.department}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-0.5">
                      <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5" />
                        <span>Position</span>
                      </span>
                      <span className="font-bold text-[#1A1A1A] block truncate">{req.position || 'Standard Staff'}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-0.5">
                      <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <KeyRound className="w-2.5 h-2.5" />
                        <span>Requested Role</span>
                      </span>
                      <span className="font-bold text-black block truncate">{req.requestedRoleName || 'Staff'}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-0.5">
                      <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        <span>Contact</span>
                      </span>
                      <span className="font-medium text-[#1A1A1A] block truncate">{req.contactNumber || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Notes / Reason */}
                  {req.reasonOrNotes && (
                    <div className="p-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-[11px] text-gray-600 space-y-1">
                      <span className="font-bold text-gray-700 block">Application Justification / Deployment:</span>
                      <p className="italic text-gray-600 leading-relaxed">"{req.reasonOrNotes}"</p>
                    </div>
                  )}

                  {/* Rejection Note */}
                  {isRejected && req.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 space-y-1">
                      <span className="font-bold text-rose-900 block">Rejection Reason:</span>
                      <p className="text-rose-700">{req.rejectionReason}</p>
                    </div>
                  )}

                  {/* Submission & Review Meta */}
                  <div className="text-[10px] text-gray-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Submitted: {new Date(req.submittedAt).toLocaleString()}</span>
                    </span>
                    {req.reviewedByUserName && (
                      <span className="font-medium text-gray-600">
                        Reviewed by: <strong>{req.reviewedByUserName}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between gap-2">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(req)}
                        className="px-3 py-2 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 border border-gray-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Decline</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenApproveModal(req)}
                        className="flex-1 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve & Confirm</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {isApproved && matchedActiveUser ? (
                        <button
                          type="button"
                          onClick={() => setViewingUserBadge(matchedActiveUser)}
                          className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View Official QR Badge</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Record archived</span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove this archived registration record for ${req.fullName}?`)) {
                            deleteRegistrationRequest(req.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remove archived record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* APPROVAL & ACTIVATION CONFIRMATION MODAL                 */}
      {/* ======================================================== */}
      {selectedReqForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden">
            <div className="p-4 bg-black text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Approve & Confirm Staff Registration</h3>
              </div>
              <button
                onClick={() => setSelectedReqForApproval(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="p-5 space-y-4 text-xs">
              {/* Applicant Preview Box */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Confirmed Applicant Profile</span>
                <p className="font-bold text-sm text-emerald-950">{selectedReqForApproval.fullName}</p>
                <p className="text-emerald-800 text-[11px]">{selectedReqForApproval.email}</p>
                <p className="text-gray-600 text-[11px]">
                  Division: <strong>{selectedReqForApproval.department}</strong> • Position: <strong>{selectedReqForApproval.position || 'Staff'}</strong>
                </p>
              </div>

              {/* Assign System Role */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#1A1A1A] block">
                  Assign System Role & Permissions *
                </label>
                <select
                  value={assignedRoleId}
                  onChange={(e) => setAssignedRoleId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:outline-none focus:border-black"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description?.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign Storage Location */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#1A1A1A] block">
                  Assigned Storage Location / Station
                </label>
                <select
                  value={assignedLocationId}
                  onChange={(e) => setAssignedLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium text-black focus:outline-none focus:border-black"
                >
                  <option value="">No fixed depot (All accessible facilities)</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Generated Badges & Security Notice */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-gray-600">
                <div className="flex items-center gap-1.5 font-bold text-black text-xs">
                  <QrCode className="w-4 h-4 text-black" />
                  <span>Automatic Security Provisioning</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Upon confirmation, a unique official employee QR code badge will be generated and linked directly to their user ID. The applicant can log in immediately.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReqForApproval(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded-xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Confirm & Activate User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REJECTION REASON MODAL                                   */}
      {/* ======================================================== */}
      {selectedReqForRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden">
            <div className="p-4 bg-rose-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm">Decline Registration Application</h3>
              </div>
              <button
                onClick={() => setSelectedReqForRejection(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="p-5 space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                You are declining the registration application submitted for <strong className="text-black">{selectedReqForRejection.fullName}</strong> ({selectedReqForRejection.email}).
              </p>

              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">
                  Reason for Decline / Administrative Remarks
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Unverified employee ID number, incorrect division selected, or duplicate entry..."
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReqForRejection(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded-xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Decline Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated User QR Badge Modal */}
      {viewingUserBadge && (
        <UserQRBadgeModal
          user={viewingUserBadge}
          isOpen={Boolean(viewingUserBadge)}
          onClose={() => setViewingUserBadge(null)}
        />
      )}
    </div>
  );
};
