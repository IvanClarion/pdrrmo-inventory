import React, { useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { UserQRBadgeModal } from './UserQRBadgeModal';
import { BrandLogo } from './BrandLogo';
import { LogoCustomizer } from './LogoCustomizerModal';
import { EditProfileModal } from './EditProfileModal';
import {
  ShieldCheck,
  QrCode,
  Lock,
  Unlock,
  LogOut,
  Palette,
  UserCog,
  ChevronDown,
} from 'lucide-react';

export const Header: React.FC<{ onOpenPrdModal?: () => void }> = () => {
  const {
    currentUser,
    currentRole,
    users,
    authenticatedUserId,
    openLoginModal,
    logoutUser,
    requiresAuth,
    branding,
    isAdmin,
  } = useInventory();

  const [isQrBadgeOpen, setIsQrBadgeOpen] = useState(false);
  const [isLogoCustomizerOpen, setIsLogoCustomizerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPrivileged = requiresAuth(currentUser);
  const isAuthenticated = !isPrivileged || authenticatedUserId === currentUser.id;
  const canSwitchAccounts =
    isAdmin ||
    currentUser.roleName === 'Inventory Manager' ||
    currentRole.name === 'Inventory Manager';

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white text-[#1A1A1A] border-b border-[#E5E5E5] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand Logo & Organization Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative group/logo shrink-0">
            <BrandLogo branding={branding} size="md" />
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsLogoCustomizerOpen(true)}
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition shadow-sm cursor-pointer hover:bg-neutral-800"
                title="Customize Organization Logo"
              >
                <Palette className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold tracking-tight text-sm sm:text-base text-[#1A1A1A] truncate max-w-[150px] sm:max-w-[280px]">
                {branding.orgName || 'PDRRMO'}
              </h1>
              <span
                className="text-[9px] sm:text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded text-white shrink-0"
                style={{ backgroundColor: branding.badgeBgColor || '#000000' }}
              >
                {branding.badgeText || 'INVENTORY'}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsLogoCustomizerOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-black transition px-1.5 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
                  title="Customize Logo & Branding"
                >
                  <Palette className="w-3 h-3 text-gray-500" />
                  <span>Edit Logo</span>
                </button>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-gray-400 hidden sm:block font-medium truncate max-w-[320px] lg:max-w-none">
              {branding.orgSubtitle || 'PDRRMO Inventory Management & Logistics Engine'}
            </p>
          </div>
        </div>

        {/* User Account & Profile Pill Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs cursor-pointer transition select-none"
          >
            <div className="relative shrink-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-black shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  {currentUser.name.split(' ').map((n) => n[0]).join('')}
                </div>
              )}
              {isPrivileged && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  title={isAuthenticated ? 'Logged in & verified' : 'Authentication required'}
                />
              )}
            </div>
            <div className="text-left hidden xs:block sm:block">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[#1A1A1A] block truncate max-w-[90px] sm:max-w-[140px]">
                  {currentUser.name}
                </span>
                {isPrivileged && (
                  isAuthenticated ? (
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                  )
                )}
              </div>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block -mt-0.5">
                {currentRole.name}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block ml-0.5" />
          </button>

          {/* Role Switcher & Login Dropdown */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#E5E5E5] rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1.5 border-b border-[#E5E5E5] mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-800">{currentUser.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{currentRole.name}</p>
                </div>
                {isPrivileged && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isAuthenticated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isAuthenticated ? 'Authenticated' : 'Locked'}
                  </span>
                )}
              </div>

              {/* Edit My Profile Button */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  setIsEditProfileOpen(true);
                }}
                className="w-full mb-1.5 p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <UserCog className="w-3.5 h-3.5" />
                <span>Edit My Profile</span>
              </button>

              {/* View My QR Badge Button */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  setIsQrBadgeOpen(true);
                }}
                className="w-full mb-1.5 p-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>My QR ID Badge</span>
              </button>

              {/* Sign Out Action */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  logoutUser();
                }}
                className="w-full mb-2 p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-[#E5E5E5] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-500" />
                <span>Log Out</span>
              </button>

              {/* Switch Account Section - Restricted for Staff & Auditor */}
              {canSwitchAccounts && (
                <>
                  <div className="px-2.5 py-1 border-b border-[#E5E5E5] mb-1.5 flex items-center justify-between">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Switch Account / Login</p>
                    <span className="text-[9px] text-gray-400 font-mono">RBAC Auth</span>
                  </div>

                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {users.map((u) => {
                      const roleRequiresAuth = requiresAuth(u);
                      const isUserAuth = !roleRequiresAuth || authenticatedUserId === u.id;
                      const isCurrent = u.id === currentUser.id;

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            if (!isCurrent) {
                              openLoginModal(u);
                            }
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                            isCurrent
                              ? 'bg-[#F0F0F0] text-black font-bold border border-[#E5E5E5]'
                              : 'text-gray-600 hover:bg-[#F9F9F9]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                className="w-6 h-6 rounded-full object-cover border border-[#E5E5E5] shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {u.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="block font-bold text-[#1A1A1A] truncate text-[11px]">{u.name}</span>
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                                {u.roleName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {roleRequiresAuth && (
                              <span
                                className={`p-1 rounded-md text-[10px] flex items-center gap-0.5 ${
                                  isUserAuth && isCurrent
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                                title={
                                  isUserAuth && isCurrent
                                    ? 'Authenticated'
                                    : 'Requires password or PIN login'
                                }
                              >
                                {isUserAuth && isCurrent ? (
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Lock className="w-3 h-3 text-amber-600" />
                                )}
                              </span>
                            )}
                            {isCurrent && <ShieldCheck className="w-3.5 h-3.5 text-black shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <UserQRBadgeModal
        user={currentUser}
        isOpen={isQrBadgeOpen}
        onClose={() => setIsQrBadgeOpen(false)}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {isAdmin && (
        <LogoCustomizer
          isOpen={isLogoCustomizerOpen}
          onClose={() => setIsLogoCustomizerOpen(false)}
        />
      )}
    </header>
  );
};
