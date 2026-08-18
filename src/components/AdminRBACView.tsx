import React, { useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useInventory } from '../context/InventoryContext';
import { GranularPermissions, UserRole, User, Location, LocationType, Department } from '../types';
import { DEFAULT_ROLES } from '../data/mockData';
import { UserQRBadgeModal } from './UserQRBadgeModal';
import { ProfilePhotoUploadInput } from './ProfilePhotoUploadInput';
import { LogoCustomizer } from './LogoCustomizerModal';
import { AdminRegistrationsView } from './AdminRegistrationsView';
import {
  ShieldCheck,
  User as UserIcon,
  MapPin,
  Check,
  X,
  Plus,
  Lock,
  Building,
  KeyRound,
  Edit2,
  Trash2,
  QrCode,
  Search,
  ChevronRight,
  Layers,
  Save,
  Boxes,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  Palette,
  UserCheck,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AdminRBACView: React.FC = () => {
  const {
    roles,
    users,
    locations,
    items,
    registrationRequests,
    pendingRegistrationCount,
    departments,
    addDepartment,
    editDepartment,
    deleteDepartment,
    updateRolePermissions,
    resetRolePermissionsToDefault,
    hasPermission,
    addLocation,
    editLocation,
    deleteLocation,
    addUser,
    editUser,
    deleteUser,
    currentUser,
    isAdmin,
    isSessionAuthenticated,
    openLoginModal,
    requiresAuth,
    setActiveTab,
    isLoadingDatabase,
  } = useInventory();

  const [activeSubTab, setActiveSubTab] = useState<'rbac' | 'users' | 'departments' | 'locations' | 'branding' | 'registrations'>('registrations');

  // Selected User for QR Badge Modal
  const [selectedUserForQr, setSelectedUserForQr] = useState<User | null>(null);

  // Use database roles directly (or DEFAULT_ROLES only as offline fallback)
  const standardOrder = ['Staff', 'Inventory Manager', 'Auditor', 'Admin'];
  const availableRoles = (roles.length > 0 ? roles : DEFAULT_ROLES).slice().sort((a, b) => {
    const idxA = standardOrder.indexOf(a.name);
    const idxB = standardOrder.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const defaultStaffRole = availableRoles.find((r) => r.name.toLowerCase() === 'staff') || availableRoles[0];

  // User Edit / Add Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    roleId: defaultStaffRole?.id || 'role-staff',
    department: '',
    assignedLocationId: '',
    avatarUrl: '',
    userQrCode: '',
    password: '',
    pin: '',
  });

  // User search
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Location Edit Modal State
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    type: 'Warehouse' as LocationType,
    parentLocationId: '',
    capacity: 1000,
  });

  // Department Management State (Admin Editable)
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    headName: '',
  });
  const [newQuickDeptName, setNewQuickDeptName] = useState('');
  const [newQuickDeptCode, setNewQuickDeptCode] = useState('');
  const [newQuickDeptHead, setNewQuickDeptHead] = useState('');
  const [newQuickDeptDesc, setNewQuickDeptDesc] = useState('');
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [deptActionError, setDeptActionError] = useState<string | null>(null);

  // New Quick Location Form state
  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocType, setNewLocType] = useState<LocationType>('Warehouse');
  const [newLocCapacity, setNewLocCapacity] = useState<number>(1000);

  // Deletion confirmation states
  const [deletingLocId, setDeletingLocId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Role matrix feedback notification
  const [matrixFeedback, setMatrixFeedback] = useState<string | null>(null);

  const permissionKeys: { key: keyof GranularPermissions; label: string; desc: string; category: string }[] = [
    { key: 'canAddItems', label: 'Create New Stock Items', desc: 'Add new products and SKUs to database.', category: 'Inventory Operations' },
    { key: 'canEditItems', label: 'Edit Item Attributes', desc: 'Modify reorder thresholds, pricing, and specs.', category: 'Inventory Operations' },
    { key: 'canDeleteItems', label: 'Delete Stock Records', desc: 'Permanently remove items from system.', category: 'Inventory Operations' },
    { key: 'canDeleteActiveCustody', label: 'Delete Active Custody & Loans', desc: 'Admin-only right to force delete or void active custody records & loans.', category: 'Workflow & Circulation' },
    { key: 'canCheckOut', label: 'Perform Item Check-Out', desc: 'Check out tools, assets, or inventory.', category: 'Workflow & Circulation' },
    { key: 'canCheckIn', label: 'Submit Item Check-In & Returns', desc: 'Initiate return requests and stage items for check-in verification.', category: 'Workflow & Circulation' },
    { key: 'canVerifyCheckIn', label: 'Verify & Approve Check-In', desc: 'Inspect returned item condition, verify quantity, and approve stock return.', category: 'Workflow & Circulation' },
    { key: 'canViewCosts', label: 'View Cost Price & Margins', desc: 'Access wholesale cost pricing data.', category: 'Financial & Pricing' },
    { key: 'canGeneratePOs', label: 'Create Purchase Orders', desc: 'Generate 1-click supplier POs.', category: 'Financial & Pricing' },
    { key: 'canViewReports', label: 'View Analytics & Audits', desc: 'Access financial valuation reports.', category: 'Compliance & Audits' },
    { key: 'canManageLocations', label: 'Manage Warehouses & Bins', desc: 'Create aisles, bins, and facilities.', category: 'System Administration' },
    { key: 'canManageUsers', label: 'Manage User Accounts', desc: 'Create users and assign role permissions.', category: 'System Administration' },
    { key: 'canManageRoles', label: 'Edit RBAC Permissions', desc: 'Modify role permission matrices.', category: 'System Administration' },
    { key: 'canPurgeAuditLogs', label: 'Purge Audit Trail', desc: 'Clear system audit history (Admin).', category: 'System Administration' },
  ];

  const handleTogglePermission = (role: UserRole, permKey: keyof GranularPermissions) => {
    if (!isAdmin) {
      alert('Access Denied: Only Admin role can modify the role permissions matrix.');
      return;
    }
    if (requiresAuth(currentUser) && !isSessionAuthenticated) {
      openLoginModal(currentUser);
      return;
    }
    // Prevent unchecking canManageRoles on Admin to prevent lockout
    if ((role.name === 'Admin' || role.id === 'role-admin') && permKey === 'canManageRoles') {
      alert('System Protection: The Administrator role must always retain RBAC Management permissions.');
      return;
    }

    const currentVal = !!role.permissions[permKey];
    const updated = {
      ...role.permissions,
      [permKey]: !currentVal,
    };
    updateRolePermissions(role.id, updated);
    setMatrixFeedback(`Updated "${role.name}": ${permKey} is now ${!currentVal ? 'ENABLED' : 'DISABLED'}`);
    setTimeout(() => setMatrixFeedback(null), 4000);
  };

  const handleResetMatrix = () => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to restore the default Role Permissions Matrix presets? All standard role capabilities will be reset to factory defaults.')) {
      resetRolePermissionsToDefault();
      setMatrixFeedback('Role Permissions Matrix restored to factory defaults.');
      setTimeout(() => setMatrixFeedback(null), 4000);
    }
  };

  // Top level Access Restriction Guard for non-admin roles
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#1A1A1A]">Administrator Access Only</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            The <strong>Admin & RBAC</strong> module is strictly accessible by the System Administrator. Your current account (<strong>{currentUser.name}</strong>, Role: <strong>{currentUser.roleName}</strong>) does not have authorization to view or configure administrative settings.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full sm:w-auto px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => {
              const adminUser = users.find((u) => u.roleName === 'Admin');
              if (adminUser) openLoginModal(adminUser);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#F9F9F9] text-[#1A1A1A] border border-[#E5E5E5] rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Switch to Administrator Account
          </button>
        </div>
      </div>
    );
  }

  // User Actions
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      roleId: defaultStaffRole?.id || 'role-staff',
      department: departments[0]?.name || '',
      assignedLocationId: locations[0]?.id || '',
      avatarUrl: '',
      userQrCode: `USR-QR-${Math.floor(10000 + Math.random() * 90000)}`,
      password: '',
      pin: '',
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    const matchedRole = availableRoles.find(
      (r) => r.id === u.roleId || r.name.toLowerCase() === (u.roleName || '').toLowerCase()
    );
    const effectiveRoleId = matchedRole ? matchedRole.id : u.roleId || defaultStaffRole?.id || 'role-staff';

    setUserForm({
      name: u.name || '',
      email: u.email || '',
      roleId: effectiveRoleId,
      department: u.department || departments[0]?.name || '',
      assignedLocationId: u.assignedLocationId || '',
      avatarUrl: u.avatarUrl || '',
      userQrCode: u.userQrCode || `USR-QR-${u.id.toUpperCase()}`,
      password: u.password || '',
      pin: u.pin || '',
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) return;

    const selectedRole = availableRoles.find(
      (r) => r.id === userForm.roleId || r.name.toLowerCase() === userForm.roleId.toLowerCase()
    );
    const roleName = selectedRole ? selectedRole.name : 'Staff';
    const roleId = selectedRole ? selectedRole.id : userForm.roleId || 'role-staff';

    if (editingUser) {
      editUser(editingUser.id, {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        roleId: roleId,
        roleName: roleName as any,
        department: userForm.department.trim(),
        assignedLocationId: userForm.assignedLocationId || undefined,
        avatarUrl: userForm.avatarUrl || undefined,
        userQrCode: userForm.userQrCode.trim(),
        password: userForm.password.trim() || undefined,
        pin: userForm.pin.trim() || undefined,
      });
    } else {
      addUser({
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        roleId: roleId,
        roleName: roleName as any,
        department: userForm.department.trim(),
        assignedLocationId: userForm.assignedLocationId || undefined,
        avatarUrl: userForm.avatarUrl || undefined,
        userQrCode: userForm.userQrCode.trim(),
        password: userForm.password.trim() || (roleName === 'Admin' ? 'admin123' : roleName === 'Inventory Manager' ? 'manager123' : roleName === 'Auditor' ? 'audit123' : 'staff123'),
        pin: userForm.pin.trim() || (roleName === 'Admin' ? '1234' : roleName === 'Inventory Manager' ? '2345' : '3456'),
      });
    }
    setUserModalOpen(false);
  };

  // Location Actions
  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || !newLocCode.trim()) return;
    addLocation({
      name: newLocName.trim(),
      code: newLocCode.trim().toUpperCase(),
      type: newLocType,
      capacity: Number(newLocCapacity || 1000),
    });
    setNewLocName('');
    setNewLocCode('');
    setNewLocCapacity(1000);
  };

  const handleOpenEditLocation = (loc: Location) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name || '',
      code: loc.code || '',
      type: loc.type || 'Warehouse',
      parentLocationId: loc.parentLocationId || '',
      capacity: loc.capacity || 1000,
    });
    setLocationModalOpen(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation || !locationForm.name.trim() || !locationForm.code.trim()) return;
    editLocation(editingLocation.id, {
      name: locationForm.name.trim(),
      code: locationForm.code.trim().toUpperCase(),
      type: locationForm.type,
      parentLocationId: locationForm.parentLocationId || undefined,
      capacity: Number(locationForm.capacity || 1000),
    });
    setLocationModalOpen(false);
  };

  // Department Management Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptForm({
      name: '',
      code: '',
      description: '',
      headName: '',
    });
    setDeptActionError(null);
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      headName: dept.headName || '',
    });
    setDeptActionError(null);
    setDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    setDeptActionError(null);
    if (!deptForm.name.trim()) return;

    if (editingDept) {
      const res = editDepartment(editingDept.id, {
        name: deptForm.name,
        code: deptForm.code,
        description: deptForm.description,
        headName: deptForm.headName,
      });
      if (!res.success) {
        setDeptActionError(res.error || 'Failed to update department.');
        return;
      }
    } else {
      const res = addDepartment({
        name: deptForm.name,
        code: deptForm.code,
        description: deptForm.description,
        headName: deptForm.headName,
      });
      if (!res.success) {
        setDeptActionError(res.error || 'Failed to create department.');
        return;
      }
    }
    setDeptModalOpen(false);
  };

  const handleQuickCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickDeptName.trim()) return;
    const res = addDepartment({
      name: newQuickDeptName,
      code: newQuickDeptCode,
      headName: newQuickDeptHead,
      description: newQuickDeptDesc,
    });
    if (res.success) {
      setNewQuickDeptName('');
      setNewQuickDeptCode('');
      setNewQuickDeptHead('');
      setNewQuickDeptDesc('');
    } else {
      alert(res.error || 'Failed to add department.');
    }
  };

  const handleDeleteDept = (id: string) => {
    const res = deleteDepartment(id);
    if (!res.success) {
      alert(res.error || 'Failed to remove department.');
    }
    setDeletingDeptId(null);
  };

  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(deptSearchTerm.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(deptSearchTerm.toLowerCase())) ||
      (d.description && d.description.toLowerCase().includes(deptSearchTerm.toLowerCase())) ||
      (d.headName && d.headName.toLowerCase().includes(deptSearchTerm.toLowerCase()))
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.roleName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.userQrCode && u.userQrCode.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-black" />
            <span>Admin Control Panel & User Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage assigned roles, user credentials, QR badges, and storage mapping facilities.
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E5E5E5] shadow-xs overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('registrations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'registrations' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Staff Registrations</span>
            {pendingRegistrationCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                {pendingRegistrationCount}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">
                {registrationRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'users' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Assigned Roles & Roster ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('departments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'departments' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Departments / Divisions ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('locations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'locations' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Storage Mapping ({locations.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('rbac')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'rbac' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Role Permissions Matrix</span>
          </button>
          <button
            onClick={() => setActiveSubTab('branding')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'branding' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Logo & Branding</span>
          </button>
        </div>
      </div>

      {requiresAuth(currentUser) && !isSessionAuthenticated && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-950">Administrative Session Locked</p>
              <p className="text-amber-800/90 leading-relaxed mt-0.5">
                You are currently in read-only mode for <strong>{currentUser.name}</strong> ({currentUser.roleName}). Authenticate with your password or 4-digit PIN to perform management changes.
              </p>
            </div>
          </div>
          <button
            onClick={() => openLoginModal(currentUser)}
            className="px-4 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl shrink-0 transition cursor-pointer shadow-xs"
          >
            Unlock & Sign In
          </button>
        </div>
      )}

      {activeSubTab === 'registrations' ? (
        /* Staff Registrations Review & Approval Tab */
        <AdminRegistrationsView />
      ) : activeSubTab === 'users' ? (
        /* User Roster & Assigned Roles */
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by name, role, department or QR code..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
              />
            </div>

            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New User Account</span>
            </button>
          </div>

          {isLoadingDatabase ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton circle width={44} height={44} />
                      <div className="flex-1 min-w-0">
                        <Skeleton width="75%" height={14} />
                        <Skeleton width="90%" height={10} className="mt-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] flex justify-between items-center">
                        <div className="w-1/2">
                          <Skeleton width="50%" height={8} />
                          <Skeleton width="80%" height={12} className="mt-1" />
                        </div>
                        <Skeleton width={50} height={18} borderRadius={4} />
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-1.5">
                        <Skeleton width="100%" height={10} />
                        <Skeleton width="100%" height={10} />
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#E5E5E5] flex gap-2">
                    <Skeleton width="45%" height={28} borderRadius={8} />
                    <Skeleton width="35%" height={28} borderRadius={8} />
                    <Skeleton width="15%" height={28} borderRadius={8} />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-700">No Users in Database</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Create your first staff or administrative account using the &quot;Add New User Account&quot; button above.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8 text-center text-gray-400 text-xs">
              No users found matching &quot;{userSearchTerm}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredUsers.map((u) => {
                const assignedLoc = locations.find((l) => l.id === u.assignedLocationId);
                return (
                  <div
                    key={u.id}
                    className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={u.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-black shrink-0"
                          />
                          <div>
                            <h4 className="font-bold text-[#1A1A1A] text-sm leading-tight">{u.name}</h4>
                            <span className="text-[10px] text-gray-500 font-medium block truncate max-w-[130px]">{u.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {/* Role & Dept badge */}
                        <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] text-xs flex justify-between items-center">
                          <div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase block">Assigned Role</span>
                            <span className="font-bold text-black text-xs">{u.roleName}</span>
                          </div>
                          {u.department && (
                            <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold truncate max-w-[110px]">
                              {u.department}
                            </span>
                          )}
                        </div>

                        {/* Storage Mapping & User QR Badge */}
                        <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              Facility:
                            </span>
                            <span className="font-bold text-[#1A1A1A] truncate max-w-[120px]">
                              {assignedLoc ? assignedLoc.name : 'All Warehouses'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E5E5E5]">
                            <span className="text-gray-500 font-medium flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-gray-400" />
                              QR Badge:
                            </span>
                            <span className="font-mono text-[10px] font-bold text-black bg-white px-1.5 py-0.5 rounded border border-[#E5E5E5]">
                              {u.userQrCode || `USR-QR-${u.id.toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-[#E5E5E5] flex items-center gap-1.5">
                      {deletingUserId === u.id ? (
                        <div className="flex-1 flex items-center justify-between bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                          <span className="text-[11px] font-bold text-red-700">Delete user?</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                deleteUser(u.id);
                                setDeletingUserId(null);
                              }}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingUserId(null)}
                              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold transition"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setSelectedUserForQr(u)}
                            className="flex-1 py-1.5 px-2 bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                            title="View QR ID Badge"
                          >
                            <QrCode className="w-3.5 h-3.5 text-black" />
                            <span>Badge</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="py-1.5 px-2.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                            title="Edit Assigned Role & Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingUserId(u.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeSubTab === 'departments' ? (
        /* Departments & Divisions Management Tab */
        <div className="space-y-6">
          {/* Header & Controls Bar */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search departments, division codes, heads, or descriptions..."
                value={deptSearchTerm}
                onChange={(e) => setDeptSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenCreateDept}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Add Department Form */}
            <form
              onSubmit={handleQuickCreateDept}
              className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-3 lg:col-span-1 h-fit"
            >
              <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-2">
                <Building className="w-4 h-4 text-black" />
                <h3 className="font-bold text-[#1A1A1A] text-sm">Quick Add Division / Unit</h3>
              </div>

              <div>
                <label className="text-xs text-gray-600 font-bold block mb-1">Department / Division Name *</label>
                <input
                  type="text"
                  required
                  value={newQuickDeptName}
                  onChange={(e) => setNewQuickDeptName(e.target.value)}
                  placeholder="e.g. Incident Command Support"
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600 font-bold block mb-1">Acronym / Code</label>
                  <input
                    type="text"
                    value={newQuickDeptCode}
                    onChange={(e) => setNewQuickDeptCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ICS"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-mono font-medium focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-bold block mb-1">Division Head / Lead</label>
                  <input
                    type="text"
                    value={newQuickDeptHead}
                    onChange={(e) => setNewQuickDeptHead(e.target.value)}
                    placeholder="e.g. Chief Inspector"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 font-bold block mb-1">Operational Mandate / Notes</label>
                <textarea
                  rows={2}
                  value={newQuickDeptDesc}
                  onChange={(e) => setNewQuickDeptDesc(e.target.value)}
                  placeholder="Brief summary of department operations..."
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save New Department</span>
              </button>
            </form>

            {/* Departments Grid List */}
            <div className="lg:col-span-2 space-y-3">
              {isLoadingDatabase ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Skeleton width={32} height={32} borderRadius={12} />
                        <div className="flex-1">
                          <Skeleton width="65%" height={14} />
                          <Skeleton width="30%" height={10} className="mt-1" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Skeleton width="40%" height={10} />
                        <Skeleton width="90%" height={10} />
                      </div>
                      <div className="pt-3 border-t border-[#E5E5E5] flex justify-between">
                        <Skeleton width={80} height={14} />
                        <Skeleton width={40} height={14} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredDepartments.map((dept) => {
                    const assignedUsers = users.filter((u) => u.department === dept.name);
                    const isDeleting = deletingDeptId === dept.id;

                    return (
                      <div
                        key={dept.id}
                        className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 hover:border-gray-400 transition"
                      >
                        <div className="space-y-2">
                          {/* Top Badge & Code */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                                <Building className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-[#1A1A1A] leading-tight">
                                  {dept.name}
                                </h4>
                                {dept.code && (
                                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-mono font-bold">
                                    {dept.code}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Head & Description */}
                          {dept.headName && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                              <span className="text-gray-400">Head:</span>
                              <span className="font-semibold text-gray-800">{dept.headName}</span>
                            </div>
                          )}

                          {dept.description && (
                            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                              {dept.description}
                            </p>
                          )}
                        </div>

                        {/* Footer: Personnel Count & Actions */}
                        <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[11px] font-bold text-gray-700">
                              {assignedUsers.length} {assignedUsers.length === 1 ? 'staff' : 'staff members'}
                            </span>
                          </div>

                          {isDeleting ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                              <span className="text-[10px] text-red-700 font-bold px-1">Confirm delete?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteDept(dept.id)}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingDeptId(null)}
                                className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold transition"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDept(dept)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                title="Edit Department"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingDeptId(dept.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete Department"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isLoadingDatabase && departments.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
                  <Building className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-gray-700">No Departments in Database</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Add your official disaster response divisions or operational units using the form on the left.
                  </p>
                </div>
              ) : !isLoadingDatabase && filteredDepartments.length === 0 ? (
                <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8 text-center text-gray-400 text-xs">
                  No departments found matching &quot;{deptSearchTerm}&quot;.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : activeSubTab === 'locations' ? (
        /* Storage Mapping Manager */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Location Form */}
          <form
            onSubmit={handleCreateLocation}
            className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4 h-fit"
          >
            <div>
              <label className="text-xs text-gray-500 font-bold block mb-1">Location Name *</label>
              <input
                type="text"
                required
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="e.g. Aisle C2 - Power Diagnostic Bin"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-bold block mb-1">Location Code *</label>
              <input
                type="text"
                required
                value={newLocCode}
                onChange={(e) => setNewLocCode(e.target.value)}
                placeholder="e.g. DC1-C2-BIN09"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-mono font-medium focus:outline-none focus:border-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 font-bold block mb-1">Facility Type</label>
                <select
                  value={newLocType}
                  onChange={(e) => setNewLocType(e.target.value as LocationType)}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
                >
                  <option value="Warehouse">Warehouse</option>
                  <option value="Aisle">Aisle</option>
                  <option value="Bin">Bin</option>
                  <option value="Department">Department</option>
                  <option value="Vehicle">Vehicle / Mobile</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold block mb-1">Capacity (Units)</label>
                <input
                  type="number"
                  value={newLocCapacity}
                  onChange={(e) => setNewLocCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Storage Mapping</span>
            </button>
          </form>

          {/* Configured Locations Table / List */}
          <div className="lg:col-span-2 bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">Configured Multi-Warehouse Storage Mapping</h3>
                <p className="text-xs text-gray-500">
                  Manage storage locations, bins, aisles, and facility capacities across operations.
                </p>
              </div>
            </div>

            {isLoadingDatabase ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <Skeleton width="60%" height={14} />
                      <Skeleton width={50} height={16} borderRadius={4} />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton width="40%" height={10} />
                      <Skeleton width="45%" height={10} />
                    </div>
                    <div className="pt-2 border-t border-[#E5E5E5] flex justify-end gap-1">
                      <Skeleton width={24} height={24} borderRadius={6} />
                      <Skeleton width={24} height={24} borderRadius={6} />
                    </div>
                  </div>
                ))}
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-[#FAFAFA]">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-700">No Storage Locations in Database</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Add your first warehouse, aisle, or storage bin using the form on the left.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locations.map((loc) => {
                  const mappedItems = items.filter(
                    (i) => i.locationId === loc.id || (i.locationName && i.locationName.toLowerCase() === loc.name.toLowerCase())
                  );
                  const mappedItemsCount = mappedItems.length;
                  const mappedUnitsCount = mappedItems.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);

                  return (
                    <div
                      key={loc.id}
                      className="p-3.5 rounded-2xl bg-[#F9F9F9] border border-[#E5E5E5] text-xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-[#1A1A1A] leading-tight">{loc.name}</h4>
                          <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold shrink-0">
                            {loc.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                          <span>Code: {loc.code}</span>
                          <span className="text-gray-700 font-sans font-medium flex items-center gap-1" title={`${mappedUnitsCount} total units stored`}>
                            <Boxes className="w-3 h-3 text-gray-400" />
                            {mappedItemsCount} Items ({mappedUnitsCount} Units)
                          </span>
                        </div>
                        {loc.capacity && (
                          <div className="text-[10px] text-gray-400">Capacity: {loc.capacity} units</div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-end gap-1.5">
                        {deletingLocId === loc.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                            <span className="text-[11px] font-bold text-red-700">Delete location?</span>
                            <button
                              onClick={() => {
                                deleteLocation(loc.id);
                                setDeletingLocId(null);
                              }}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingLocId(null)}
                              className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEditLocation(loc)}
                              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#1A1A1A] border border-[#E5E5E5] rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            >
                              <Edit2 className="w-3 h-3 text-black" />
                              <span>Edit Mapping</span>
                            </button>
                            <button
                              onClick={() => setDeletingLocId(loc.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Location"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'rbac' ? (
        /* RBAC Permission Matrix Table */
        <div className="space-y-4">
          {matrixFeedback && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 font-bold flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span>{matrixFeedback}</span>
              </div>
              <span className="text-[10px] text-green-700 font-normal">Changes applied dynamically</span>
            </div>
          )}

          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-black" />
                  <span>Granular Capabilities Role Permissions Matrix</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Click checkmarks to toggle live role capabilities in real time across inventory operations, approvals, and PO generation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetMatrix}
                  className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#1A1A1A] border border-[#E5E5E5] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Reset all role permissions to factory presets"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Factory Defaults</span>
                </button>
              </div>
            </div>

            {/* Role Summary Badges */}
            {(() => {
              const standardOrder = ['Admin', 'Inventory Manager', 'Staff', 'Auditor'];
              const matrixRoles = (roles.length > 0 ? roles : DEFAULT_ROLES).slice().sort((a, b) => {
                const idxA = standardOrder.indexOf(a.name);
                const idxB = standardOrder.indexOf(b.name);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.name.localeCompare(b.name);
              });

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {matrixRoles.map((r) => {
                      const activeCount = Object.values(r.permissions).filter(Boolean).length;
                      const totalCount = Object.keys(r.permissions).length;
                      return (
                        <div
                          key={r.id}
                          className="p-3 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-black">{r.name}</span>
                            <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-bold">
                              {activeCount}/{totalCount}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{r.description || 'System Role'}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#E5E5E5]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5] text-[#1A1A1A] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 min-w-[240px]">Capability / Action Scope</th>
                          <th className="py-3 px-3 min-w-[140px]">Category</th>
                          {matrixRoles.map((r) => (
                            <th key={r.id} className="py-3 px-4 text-center min-w-[120px]">
                              <span className="font-bold text-[#1A1A1A] block text-xs">{r.name}</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({r.isSystemDefault ? 'System' : 'Custom'})
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5E5]">
                        {permissionKeys.map((p) => (
                          <tr key={p.key} className="hover:bg-[#F9F9F9] transition">
                            <td className="py-3 px-4">
                              <span className="font-bold text-[#1A1A1A] block">{p.label}</span>
                              <span className="text-[10px] text-gray-400">{p.desc}</span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0F0F0] text-gray-700">
                                {p.category}
                              </span>
                            </td>

                            {matrixRoles.map((r) => {
                              const isAllowed = !!r.permissions[p.key];
                              const isLockedAdminRole = (r.name === 'Admin' || r.id === 'role-admin') && p.key === 'canManageRoles';

                              return (
                                <td key={r.id} className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePermission(r, p.key)}
                                    disabled={isLockedAdminRole}
                                    title={
                                      isLockedAdminRole
                                        ? 'Administrator must maintain RBAC Management capability'
                                        : `Click to ${isAllowed ? 'revoke' : 'grant'} "${p.label}" for ${r.name}`
                                    }
                                    className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition cursor-pointer ${
                                      isAllowed
                                        ? 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                                        : 'bg-[#F5F5F5] text-gray-400 border border-[#E5E5E5] hover:bg-[#EAEAEA]'
                                    } disabled:cursor-not-allowed disabled:opacity-75 shadow-2xs`}
                                  >
                                    {isAllowed ? <Check className="w-4 h-4 font-extrabold text-green-700" /> : <X className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong>Operational Dynamic RBAC:</strong> Modifying permissions directly updates workflow permissions across the entire application in real time, including Check-In verification authorization, Check-Out staging actions, Purchase Order creation, Cost price visibility, and Audit trail access.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Branding & Logo Customizer Tab */
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-[#E5E5E5] pb-4">
            <h3 className="font-extrabold text-base text-[#1A1A1A] flex items-center gap-2">
              <Palette className="w-5 h-5 text-black" />
              <span>Organization Logo & Agency Identity Customization</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload your official department seal/logo, select disaster response icon presets, configure agency titles, and customize badge colors across the platform.
            </p>
          </div>
          <LogoCustomizer isEmbedded />
        </div>
      )}

      {/* User Edit / Add Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden">
            <div className="p-4 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingUser ? `Edit Account & Role: ${editingUser.name}` : 'Create New User Account'}
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">Assigned Role *</label>
                  <select
                    value={userForm.roleId}
                    onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:outline-none focus:border-black"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.name === 'Staff' ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">Department / Division *</label>
                  <select
                    value={userForm.department}
                    onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:outline-none focus:border-black"
                  >
                    {departments.length === 0 && !userForm.department && (
                      <option value="">No departments created yet (Add in Departments tab)</option>
                    )}
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name} {dept.code ? `(${dept.code})` : ''}
                      </option>
                    ))}
                    {!departments.some((d) => d.name === userForm.department) && userForm.department && (
                      <option value={userForm.department}>{userForm.department}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">Assigned Storage Facility</label>
                <select
                  value={userForm.assignedLocationId}
                  onChange={(e) => setUserForm({ ...userForm, assignedLocationId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                >
                  <option value="">All Storage Facilities</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">Account Password</label>
                  <input
                    type="text"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="e.g. admin123"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">4-Digit Quick PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 1234"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              <ProfilePhotoUploadInput
                label="Profile Photo / Avatar"
                value={userForm.avatarUrl}
                onChange={(avatarDataUrl) => setUserForm({ ...userForm, avatarUrl: avatarDataUrl })}
              />

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Storage Location Edit Modal */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden">
            <div className="p-4 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit Storage Mapping Location</h3>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">Location Code *</label>
                <input
                  type="text"
                  required
                  value={locationForm.code}
                  onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">Facility Type</label>
                  <select
                    value={locationForm.type}
                    onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value as LocationType })}
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:outline-none focus:border-black"
                  >
                    <option value="Warehouse">Warehouse</option>
                    <option value="Aisle">Aisle</option>
                    <option value="Bin">Bin</option>
                    <option value="Department">Department</option>
                    <option value="Vehicle">Vehicle / Mobile</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">Capacity (Units)</label>
                  <input
                    type="number"
                    value={locationForm.capacity}
                    onChange={(e) => setLocationForm({ ...locationForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Location</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Edit / Add Modal */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden">
            <div className="p-4 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                <span>{editingDept ? `Edit Department: ${editingDept.name}` : 'Create Department / Division'}</span>
              </h3>
              <button
                onClick={() => setDeptModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-5 space-y-4 text-xs">
              {deptActionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deptActionError}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">Department / Division Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Disaster Risk Reduction & Management"
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">Acronym / Code</label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. DRRM"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1A1A1A] block mb-1">Division Head / Lead</label>
                  <input
                    type="text"
                    value={deptForm.headName}
                    onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1A1A1A] block mb-1">Operational Mandate / Notes</label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Describe the responsibilities and scope of this department..."
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingDept ? 'Update Department' : 'Save Department'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User QR ID Badge Modal */}
      <UserQRBadgeModal
        user={selectedUserForQr}
        isOpen={Boolean(selectedUserForQr)}
        onClose={() => setSelectedUserForQr(null)}
      />
    </div>
  );
};
