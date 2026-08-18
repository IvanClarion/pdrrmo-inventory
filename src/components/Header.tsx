import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { UserQRBadgeModal } from './UserQRBadgeModal';
import { BrandLogo } from './BrandLogo';
import { LogoCustomizer } from './LogoCustomizerModal';
import {
  Boxes,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  FileCode,
  User,
  RotateCcw,
  QrCode,
  Lock,
  Unlock,
  LogOut,
  LogIn,
  KeyRound,
  Palette,
  Database,
} from 'lucide-react';

export const Header: React.FC<{ onOpenPrdModal: () => void }> = ({ onOpenPrdModal }) => {
  const {
    currentUser,
    currentRole,
    users,
    switchUser,
    isOfflineMode,
    toggleOfflineMode,
    offlineQueue,
    syncOfflineQueue,
    resetToDefaultSeedData,
    authenticatedUserId,
    isSessionAuthenticated,
    openLoginModal,
    logoutUser,
    requiresAuth,
    branding,
    isAdmin,
  } = useInventory();

  const [isQrBadgeOpen, setIsQrBadgeOpen] = useState(false);
  const [isLogoCustomizerOpen, setIsLogoCustomizerOpen] = useState(false);

  const isPrivileged = requiresAuth(currentUser);
  const isAuthenticated = !isPrivileged || authenticatedUserId === currentUser.id;

  return (
    <header className="sticky top-0 z-30 bg-white text-[#1A1A1A] border-b border-[#E5E5E5] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative group/logo">
            <BrandLogo branding={branding} size="md" />
            {isAdmin && (
              <button
                onClick={() => setIsLogoCustomizerOpen(true)}
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition shadow-sm cursor-pointer hover:bg-neutral-800"
                title="Customize Organization Logo"
              >
                <Palette className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold tracking-tight text-base sm:text-lg text-[#1A1A1A]">
                {branding.orgName || 'PDRRMO'}
              </h1>
              <span
                className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: branding.badgeBgColor || '#000000' }}
              >
                {branding.badgeText || 'INVENTORY'}
              </span>
              {isAdmin && (
                <button
                  onClick={() => setIsLogoCustomizerOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-black transition ml-1 px-1.5 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
                  title="Customize Logo & Branding"
                >
                  <Palette className="w-3 h-3 text-gray-500" />
                  <span>Edit Logo</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block font-medium">
              {branding.orgSubtitle || 'PDRRMO Inventory Management & Logistics Engine'}
            </p>
          </div>
        </div>

        {/* User Role Switcher, Login & Action Controls */}
        <div className="flex items-center gap-2">
          {/* PRD Specs Button */}
          <button
            onClick={onOpenPrdModal}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#1A1A1A] border border-[#E5E5E5] transition cursor-pointer"
            title="System Architecture & Database ERD"
          >
            <FileCode className="w-3.5 h-3.5 text-black" />
            <span className="hidden md:inline">PRD & Specs</span>
          </button>

          {/* Offline Mode Toggle & Sync Status */}
          <div className="flex items-center bg-[#F5F5F5] p-1 rounded-xl border border-[#E5E5E5]">
            <button
              onClick={toggleOfflineMode}
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                isOfflineMode ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-green-700 bg-green-50'
              }`}
              title="Toggle Simulated Offline Mode"
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Offline Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-green-600" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </button>

            {offlineQueue.length > 0 && (
              <button
                onClick={syncOfflineQueue}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 ml-1 rounded-lg bg-black text-white animate-pulse hover:bg-neutral-800 cursor-pointer"
                title="Sync offline queued changes now"
              >
                <RefreshCw className="w-3 h-3 animate-spin text-green-400" />
                <span>{offlineQueue.length} Queue</span>
              </button>
            )}
          </div>

          {/* Live Supabase Cloud Database Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold" title="Connected to Supabase PostgreSQL Database">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase DB Live</span>
          </div>

          {/* Sign Out / Exit Session Button */}
          <button
            onClick={logoutUser}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 border border-[#E5E5E5] transition cursor-pointer"
            title="Log out of session and return to Login Screen"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Dynamic RBAC Role Switcher & Profile Dropdown */}
          <div className="relative group">
            <div className="flex items-center gap-2 bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] px-3 py-1.5 rounded-xl text-xs cursor-pointer transition">
              <div className="relative">
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
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[#1A1A1A] block truncate max-w-[85px] sm:max-w-[120px]">
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
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block -mt-0.5">
                  {currentRole.name}
                </span>
              </div>
            </div>

            {/* Role Switcher & Login Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-[#E5E5E5] rounded-2xl shadow-xl p-2.5 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1.5 border-b border-[#E5E5E5] mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Account & Auth</p>
                {isPrivileged && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isAuthenticated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isAuthenticated ? 'Authenticated' : 'Locked'}
                  </span>
                )}
              </div>

              {/* Sign Out Action */}
              <button
                onClick={logoutUser}
                className="w-full mb-2 p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-[#E5E5E5] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-500" />
                <span>Log Out / Switch User</span>
              </button>

              {/* View My QR Badge Button */}
              <button
                onClick={() => setIsQrBadgeOpen(true)}
                className="w-full mb-2 p-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>My QR ID Badge</span>
              </button>

              <div className="px-2.5 py-1 border-b border-[#E5E5E5] mb-1.5 flex items-center justify-between">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Switch Account / Login</p>
                <span className="text-[9px] text-gray-400 font-mono">RBAC Auth</span>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto">
                {users.map((u) => {
                  const roleRequiresAuth = requiresAuth(u);
                  const isUserAuth = !roleRequiresAuth || authenticatedUserId === u.id;
                  const isCurrent = u.id === currentUser.id;

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        if (roleRequiresAuth && (!isUserAuth || !isCurrent)) {
                          openLoginModal(u);
                        } else {
                          switchUser(u.id);
                        }
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        isCurrent
                          ? 'bg-[#F0F0F0] text-black font-bold border border-[#E5E5E5]'
                          : 'text-gray-600 hover:bg-[#F9F9F9]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={
                            u.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover border border-[#E5E5E5] shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="block font-bold text-[#1A1A1A] truncate">{u.name}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
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
                        {isCurrent && <ShieldCheck className="w-4 h-4 text-black shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#E5E5E5]">
                <button
                  onClick={resetToDefaultSeedData}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-gray-500 hover:text-black hover:bg-[#F5F5F5] flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                  <span>Reset Demo Data & Credentials</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UserQRBadgeModal
        user={currentUser}
        isOpen={isQrBadgeOpen}
        onClose={() => setIsQrBadgeOpen(false)}
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
