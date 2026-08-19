import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { User } from '../types';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  CheckCircle2,
  QrCode,
  ArrowRight,
  User as UserIcon,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    targetLoginUser,
    closeLoginModal,
    loginUser,
    users,
    requiresAuth,
  } = useInventory();

  // Selected user to authenticate
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Auth mode: 'password' | 'pin'
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [password, setPassword] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update selected user when modal opens or targetLoginUser changes
  useEffect(() => {
    if (isLoginModalOpen) {
      const defaultUser = targetLoginUser || users.find((u) => requiresAuth(u)) || users[0];
      setSelectedUser(defaultUser);
      setPassword('');
      setPinDigits(['', '', '', '']);
      setErrorMessage(null);
      
      // Auto-focus input
      setTimeout(() => {
        if (authMode === 'password') {
          passwordInputRef.current?.focus();
        } else {
          pinInputRefs.current[0]?.focus();
        }
      }, 100);
    }
  }, [isLoginModalOpen, targetLoginUser, authMode]);

  if (!isLoginModalOpen || !selectedUser) return null;

  // Always use the latest live user object from users roster
  const liveUser = users.find((u) => u.id === selectedUser.id) || selectedUser;
  const currentRoleName = liveUser.roleName;
  const isPrivileged = requiresAuth(liveUser);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }
    executeLogin(password.trim());
  };

  const handlePinDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance to next input
    if (value && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // If all 4 digits entered, auto-submit
    if (value && index === 3 && newDigits.every((d) => d !== '')) {
      const fullPin = newDigits.join('');
      executeLogin(fullPin);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const executeLogin = (credential: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    setTimeout(() => {
      const result = loginUser(liveUser.id, credential);
      setIsSubmitting(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
        if (authMode === 'pin') {
          setPinDigits(['', '', '', '']);
          pinInputRefs.current[0]?.focus();
        }
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#E5E5E5] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-black text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Account Authentication Required</h3>
              <p className="text-[11px] text-gray-400">
                {isPrivileged ? `${currentRoleName} Privileged Access` : 'User Sign In'}
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target Account Badge */}
          <div className="p-3.5 bg-[#F9F9F9] border border-[#E5E5E5] rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {liveUser.avatarUrl ? (
                <img
                  src={liveUser.avatarUrl}
                  alt={liveUser.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-black shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-orange-500 text-white font-bold text-sm flex items-center justify-center border-2 border-black shrink-0 shadow-xs">
                  {liveUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-[#1A1A1A] truncate">{liveUser.name}</h4>
                  <span
                    className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                      liveUser.roleName === 'Admin'
                        ? 'bg-black text-white'
                        : liveUser.roleName === 'Inventory Manager'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {liveUser.roleName}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{liveUser.email}</p>
                <p className="text-[10px] text-gray-400 font-medium">{liveUser.department}</p>
              </div>
            </div>

            {/* Switch Target User Dropdown */}
            {users.length > 1 && (
              <select
                value={liveUser.id}
                onChange={(e) => {
                  const u = users.find((usr) => usr.id === e.target.value);
                  if (u) {
                    setSelectedUser(u);
                    setPassword('');
                    setPinDigits(['', '', '', '']);
                    setErrorMessage(null);
                  }
                }}
                className="text-[11px] font-bold bg-white border border-[#E5E5E5] rounded-xl px-2 py-1.5 text-gray-700 cursor-pointer shadow-2xs hover:border-black transition"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.roleName})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Role Access Requirement Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Security Authentication Gate</p>
              <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                <strong>{liveUser.name}</strong> holds the <strong>{liveUser.roleName}</strong> role. Please verify your password or PIN to unlock full administrative and management permissions.
              </p>
            </div>
          </div>

          {/* Auth Method Tabs */}
          <div className="flex items-center bg-[#F5F5F5] p-1 rounded-xl border border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'password' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'pin' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>4-Digit PIN</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Auth Form Body */}
          {authMode === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">
                  Enter Password for {liveUser.name}
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter account password"
                    className="w-full px-3.5 py-2.5 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black focus:bg-white pr-10 transition shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password}
                className="w-full py-2.5 bg-black hover:bg-neutral-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Unlock Account & Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-2 text-center">
                  Enter 4-Digit Security PIN
                </label>
                <div className="flex items-center justify-center gap-3">
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        pinInputRefs.current[idx] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      className="w-12 h-12 text-center text-lg font-black bg-[#F9F9F9] border-2 border-[#E5E5E5] focus:border-black focus:bg-white rounded-2xl outline-none transition shadow-xs"
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const fullPin = pinDigits.join('');
                  if (fullPin.length === 4) {
                    executeLogin(fullPin);
                  } else {
                    setErrorMessage('Please enter all 4 digits of your PIN.');
                  }
                }}
                disabled={isSubmitting || pinDigits.some((d) => !d)}
                className="w-full py-2.5 bg-black hover:bg-neutral-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Verifying PIN...</span>
                ) : (
                  <>
                    <span>Sign In with PIN</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
