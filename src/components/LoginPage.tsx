import React, { useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { User } from '../types';
import { BrandLogo } from './BrandLogo';
import { Html5Qrcode } from 'html5-qrcode';
import { audioService } from '../utils/audio';
import { RegistrationModal } from './RegistrationModal';
import {
  isSupabaseConfigured,
  getSupabaseStatus,
  resetPasswordWithSupabase,
  getSupabase,
} from '../lib/supabase';
import { dbToUser } from '../lib/database';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  QrCode,
  ArrowRight,
  User as UserIcon,
  Camera,
  CheckCircle2,
  RefreshCw,
  Mail,
  Shield,
  ScanLine,
  RotateCcw,
  UserPlus,
  Cloud,
  Database,
  Loader2,
  Sparkles,
  ShieldAlert,
  X,
} from 'lucide-react';

interface LoginPageProps {
  onOpenPrdModal?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const {
    users,
    roles,
    loginUser,
    loginWithSupabase,
    branding,
    resetToDefaultSeedData,
    sessionExpiryNotice,
    setSessionExpiryNotice,
  } = useInventory();

  // Supabase live status
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; message: string } | null>(null);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState<boolean>(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Authentication Mode: 'qr' (Scan QR Badge then Password) or 'name_password' (Type Name/Email & Password)
  const [loginMethod, setLoginMethod] = useState<'qr' | 'name_password'>('qr');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);

  // QR Badge Flow States
  // Step 1: scan badge -> Step 2: badge verified, enter password
  const [scannedUser, setScannedUser] = useState<User | null>(null);
  const [badgeInput, setBadgeInput] = useState<string>('');
  const [qrPassword, setQrPassword] = useState<string>('');
  const [showQrPassword, setShowQrPassword] = useState<boolean>(false);
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);

  // Name & Password Flow States
  const [nameOrEmail, setNameOrEmail] = useState<string>('');
  const [manualPassword, setManualPassword] = useState<string>('');
  const [showManualPassword, setShowManualPassword] = useState<boolean>(false);

  // Common States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // References
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const qrPasswordInputRef = useRef<HTMLInputElement>(null);
  const manualNameInputRef = useRef<HTMLInputElement>(null);
  const manualPasswordInputRef = useRef<HTMLInputElement>(null);
  const badgeInputRef = useRef<HTMLInputElement>(null);
  const hardwareBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Clear errors when switching tabs
  useEffect(() => {
    setErrorMessage(null);
    stopCameraScanner();

    const timer = setTimeout(() => {
      if (loginMethod === 'qr') {
        if (scannedUser) {
          qrPasswordInputRef.current?.focus();
        } else {
          badgeInputRef.current?.focus();
        }
      } else {
        manualNameInputRef.current?.focus();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [loginMethod]);

  // Focus password input when QR badge is verified
  useEffect(() => {
    if (scannedUser) {
      setQrPassword('');
      const timer = setTimeout(() => {
        qrPasswordInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [scannedUser]);

  // Hardware Scanner Global Listener (USB / Bluetooth barcode guns)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in a password or text field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (loginMethod !== 'qr' || scannedUser) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (hardwareBufferRef.current.length >= 3) {
          handleVerifyBadgeCode(hardwareBufferRef.current);
          hardwareBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        if (timeDiff < 60 || hardwareBufferRef.current.length === 0) {
          hardwareBufferRef.current += e.key;
        } else {
          hardwareBufferRef.current = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMethod, scannedUser, users]);

  // Cleanup camera scanner on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Camera Scanner Functions
  const startCameraScanner = async () => {
    setErrorMessage(null);
    setIsCameraScanning(true);

    setTimeout(async () => {
      try {
        const container = document.getElementById('login-qr-reader');
        if (!container) return;

        if (html5QrcodeRef.current) {
          try {
            await html5QrcodeRef.current.stop();
          } catch {}
        }

        const html5Qrcode = new Html5Qrcode('login-qr-reader');
        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            handleVerifyBadgeCode(decodedText);
            stopCameraScanner();
          },
          () => {}
        );
      } catch (err) {
        console.warn('Camera scanner unavailable, falling back to manual input:', err);
        setIsCameraScanning(false);
        setErrorMessage('Camera access was denied or unavailable. Please type your Badge ID or Name.');
      }
    }, 200);
  };

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping QR scanner:', err);
      }
      html5QrcodeRef.current = null;
    }
    setIsCameraScanning(false);
  };

  // Extract and normalize potential user lookup keys from raw scan input
  const extractPotentialUserKeys = (rawInput: string): string[] => {
    const clean = rawInput.trim();
    if (!clean) return [];

    const keys = new Set<string>();
    keys.add(clean);
    keys.add(clean.toLowerCase());
    keys.add(clean.toUpperCase());

    // 1. JSON payload parsing
    if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
      try {
        const parsed = JSON.parse(clean);
        if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.userQrCode) keys.add(String(parsed.userQrCode).trim());
          if (parsed.qrCode) keys.add(String(parsed.qrCode).trim());
          if (parsed.badge) keys.add(String(parsed.badge).trim());
          if (parsed.id) keys.add(String(parsed.id).trim());
          if (parsed.userId) keys.add(String(parsed.userId).trim());
          if (parsed.email) keys.add(String(parsed.email).trim());
        }
      } catch {}
    }

    // 2. Hardware AIM symbology prefix stripping
    const strippedAim = clean.replace(/^\][A-Za-z0-9]{2}/, '').trim();
    if (strippedAim && strippedAim !== clean) {
      keys.add(strippedAim);
      keys.add(strippedAim.toLowerCase());
      keys.add(strippedAim.toUpperCase());
    }

    // 3. URL query parameter extraction
    if (clean.includes('?') || clean.includes('/')) {
      try {
        const url = new URL(clean.startsWith('http') ? clean : `http://localhost/${clean}`);
        const codeParam = url.searchParams.get('code') || url.searchParams.get('id') || url.searchParams.get('qr') || url.searchParams.get('email');
        if (codeParam) {
          keys.add(codeParam.trim());
          keys.add(codeParam.trim().toLowerCase());
        }
      } catch {}
    }

    // 4. USR-QR prefix variations
    if (clean.toUpperCase().startsWith('USR-QR-')) {
      const rawId = clean.slice(7).trim();
      if (rawId) {
        keys.add(rawId);
        keys.add(`usr-${rawId.toLowerCase()}`);
      }
    }

    return Array.from(keys).filter(Boolean);
  };

  // Verify scanned or typed QR Badge ID
  const handleVerifyBadgeCode = async (code: string) => {
    const rawClean = code.trim();
    if (!rawClean) {
      setErrorMessage('Please enter or scan a valid QR Badge ID.');
      return;
    }

    const potentialKeys = extractPotentialUserKeys(rawClean);

    // 1. Search in local memory users
    let matchedUser = users.find((u) => {
      const uQr = (u.userQrCode || '').toLowerCase();
      const uId = (u.id || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uDerivedQr = `usr-qr-${u.id.toUpperCase()}`.toLowerCase();

      return potentialKeys.some((k) => {
        const kLower = k.toLowerCase();
        return (
          (uQr && uQr === kLower) ||
          uId === kLower ||
          uEmail === kLower ||
          uDerivedQr === kLower
        );
      });
    });

    // 2. Dynamic Supabase Database Query Fallback if not in memory
    if (!matchedUser && isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        try {
          for (const key of potentialKeys) {
            const { data, error } = await client
              .from('users')
              .select('*')
              .or(`user_qr_code.ilike.${key},id.ilike.${key},email.ilike.${key}`)
              .limit(1);

            if (!error && data && data.length > 0) {
              const dbUser = dbToUser(data[0], roles);
              matchedUser = dbUser;
              break;
            }
          }
        } catch (dbErr) {
          console.warn('Supabase live user query error:', dbErr);
        }
      }
    }

    if (matchedUser) {
      audioService.playSuccessSound();
      setScannedUser(matchedUser);
      setBadgeInput('');
      setErrorMessage(null);
      stopCameraScanner();
    } else {
      audioService.playErrorSound();
      setErrorMessage(`Badge ID "${rawClean}" is not recognized in staff records.`);
    }
  };

  // Submit Password after QR Badge is verified
  const handleQrPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedUser) return;
    if (!qrPassword.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    setTimeout(() => {
      const result = loginUser(scannedUser.id, qrPassword.trim());
      setIsSubmitting(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Incorrect password. Please try again.');
        qrPasswordInputRef.current?.focus();
      }
    }, 200);
  };

  // Check Supabase Cloud Connection Status on mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      getSupabaseStatus().then((status) => {
        setSupabaseStatus(status);
      });
    }
  }, []);

  // Submit Name/Email + Password with Supabase integration
  const handleNamePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdentifier = nameOrEmail.trim();
    const cleanPass = manualPassword.trim();

    if (!cleanIdentifier) {
      setErrorMessage('Please enter your full name or email address.');
      manualNameInputRef.current?.focus();
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Please enter your password.');
      manualPasswordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await loginWithSupabase(cleanIdentifier, cleanPass);
      setIsSubmitting(false);

      if (!result.success) {
        setErrorMessage(result.error || 'Incorrect credentials. Please verify your email and password.');
        manualPasswordInputRef.current?.focus();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'An unexpected error occurred during authentication.');
    }
  };

  // Handle Supabase Password Reset Request
  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setIsForgotSubmitting(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      await resetPasswordWithSupabase(cleanEmail);
      setIsForgotSubmitting(false);
      setForgotSuccess(`Password reset instructions have been sent to ${cleanEmail}. Check your inbox!`);
    } catch (err: any) {
      setIsForgotSubmitting(false);
      setForgotError(err.message || 'Failed to send password reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-400 selection:text-black">
      {/* Background Atmosphere & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/60 via-[#0F172A] to-[#090D16] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Application Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo branding={branding} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-base sm:text-lg text-white">
                CEBU PDRRMO Asset Inventory System
              </span>
              <span
                className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded text-white shadow-xs"
                style={{ backgroundColor: branding.badgeBgColor || '#000000' }}
              >
                OFFICIAL PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Provincial Disaster Risk Reduction and Management Office • Cebu Province
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Gov Cloud Online</span>
            <span className="sm:hidden">Online</span>
          </div>
        </div>
      </header>

      {/* Main Login Workspace Center */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14">
        {/* Left Side: System Information & Security Governance */}
        <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure Role-Based Access Control (RBAC)</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              CEBU PDRRMO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200">
                Asset Inventory System
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto lg:mx-0 leading-relaxed font-normal">
              Official authentication portal for emergency disaster response dispatch, equipment tracking, field warehouse custody, and logistics auditing.
            </p>
          </div>

          {/* Key Security Notice Cards */}
          <div className="space-y-3 max-w-md mx-auto lg:mx-0 text-left">
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-2xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">QR Badge Authentication</h4>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  Scan your official PDRRMO employee QR badge to identify your officer profile, then enter your security password.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-2xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Authorized Access Only</h4>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  All transactions, check-outs, item modifications, and approvals are cryptographically audited and logged in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Gateway Card */}
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Auto Logout Security Notice Banner */}
            {sessionExpiryNotice && (
              <div className="p-3.5 bg-amber-950/80 border border-amber-600/60 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5 shadow-lg animate-in fade-in zoom-in-95">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold block text-amber-300">Session Locked (Security Policy)</span>
                  <span className="text-[11px] leading-relaxed text-amber-200/90">{sessionExpiryNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSessionExpiryNotice(null)}
                  className="text-amber-400 hover:text-white transition p-1 cursor-pointer"
                  title="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Login Method Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('qr');
                  setScannedUser(null);
                }}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  loginMethod === 'qr'
                    ? 'bg-amber-400 text-black shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Scan QR Badge</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('name_password');
                  stopCameraScanner();
                }}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  loginMethod === 'name_password'
                    ? 'bg-amber-400 text-black shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Name & Password</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* METHOD 1: SCAN QR BADGE -> ENTER PASSWORD                */}
            {/* ======================================================== */}
            {loginMethod === 'qr' && (
              <div className="space-y-4">
                {!scannedUser ? (
                  // Step 1: Scan / Enter Badge
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-bold text-white">Step 1: Scan Staff QR Badge</h3>
                      <p className="text-xs text-slate-400">
                        Hold your employee ID card to the camera or use a handheld barcode scanner
                      </p>
                    </div>

                    {/* Camera Scanner Viewport */}
                    {isCameraScanning ? (
                      <div className="space-y-3">
                        <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400 bg-black aspect-square max-h-56 mx-auto flex items-center justify-center shadow-lg">
                          <div id="login-qr-reader" className="w-full h-full" />
                          <div className="absolute inset-0 border-2 border-dashed border-amber-400/50 rounded-xl pointer-events-none m-4" />
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 rounded text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>SCANNING...</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={stopCameraScanner}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Close Camera Scanner</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startCameraScanner}
                        className="w-full py-6 bg-slate-950/80 hover:bg-slate-950 border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-2xl flex flex-col items-center justify-center gap-2 transition group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-amber-400/10 group-hover:bg-amber-400 text-amber-400 group-hover:text-black flex items-center justify-center transition">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-white group-hover:text-amber-400 block transition">
                            Launch Camera QR Scanner
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Point device camera at employee badge QR code
                          </span>
                        </div>
                      </button>
                    )}

                    {/* Manual Badge ID Input Fallback */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <label className="block text-xs font-bold text-slate-300">
                        Or Type Employee QR Badge ID:
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={badgeInputRef}
                          type="text"
                          value={badgeInput}
                          onChange={(e) => {
                            setBadgeInput(e.target.value);
                            setErrorMessage(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleVerifyBadgeCode(badgeInput);
                            }
                          }}
                          placeholder="e.g. USR-QR-USD01"
                          className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyBadgeCode(badgeInput)}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <ScanLine className="w-3.5 h-3.5 text-amber-400" />
                          <span>Verify</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Step 2: Badge Verified -> Enter Password
                  <form onSubmit={handleQrPasswordSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                    {/* Verified Officer Card */}
                    <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/60 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {scannedUser.avatarUrl ? (
                            <img
                              src={scannedUser.avatarUrl}
                              alt={scannedUser.name}
                              className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400 shadow-sm"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-emerald-500 text-black font-black text-xs flex items-center justify-center">
                              {scannedUser.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 text-black rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white truncate">{scannedUser.name}</span>
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-400 text-black">
                              {scannedUser.roleName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{scannedUser.department}</p>
                          <p className="text-[10px] font-mono text-emerald-400">
                            Badge: {scannedUser.userQrCode || scannedUser.id}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setScannedUser(null);
                          setQrPassword('');
                          setErrorMessage(null);
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
                        title="Scan different badge"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Step 2 Prompt */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Step 2: Enter Account Password
                      </label>
                      <div className="relative">
                        <input
                          ref={qrPasswordInputRef}
                          type={showQrPassword ? 'text' : 'password'}
                          value={qrPassword}
                          onChange={(e) => {
                            setQrPassword(e.target.value);
                            setErrorMessage(null);
                          }}
                          placeholder="Enter your security password"
                          className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 pr-10 transition font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowQrPassword(!showQrPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          {showQrPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting || !qrPassword}
                        className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition cursor-pointer"
                      >
                        {isSubmitting ? (
                          <span>Verifying Credentials...</span>
                        ) : (
                          <>
                            <span>Sign In to System</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScannedUser(null);
                          setQrPassword('');
                          setErrorMessage(null);
                        }}
                        className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Scan a Different Badge</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* METHOD 2: MANUAL NAME/EMAIL & PASSWORD                   */}
            {/* ======================================================== */}
            {loginMethod === 'name_password' && (
              <form onSubmit={handleNamePasswordSubmit} className="space-y-4 animate-in fade-in duration-150">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-white">Officer Credentials Login</h3>
                  <p className="text-xs text-slate-400">
                    Type your full name or email and your security password
                  </p>
                </div>

                {/* Name / Email Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Full Name or Email Address
                  </label>
                  <div className="relative">
                    <input
                      ref={manualNameInputRef}
                      type="text"
                      value={nameOrEmail}
                      onChange={(e) => {
                        setNameOrEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="e.g. Alexander Vance or alex.vance@pdrrmo.gov.ph"
                      className="w-full px-3.5 py-3 pl-10 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition font-medium"
                    />
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Account Password
                  </label>
                  <div className="relative">
                    <input
                      ref={manualPasswordInputRef}
                      type={showManualPassword ? 'text' : 'password'}
                      value={manualPassword}
                      onChange={(e) => {
                        setManualPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Enter account password"
                      className="w-full px-3.5 py-3 pl-10 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition font-medium"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowManualPassword(!showManualPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showManualPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !nameOrEmail || !manualPassword}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In with Credentials</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
            {/* Register Account Section */}
            <div className="pt-4 border-t border-slate-800 text-center space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">New responder or staff?</span>
                <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider">
                  Admin Verification
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800/80 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-amber-400/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Register Staff Account</span>
              </button>
              <p className="text-[10px] text-slate-500 leading-tight">
                Self-registered accounts must be approved & confirmed by the PDRRMO Administrator before logging in.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Staff Registration Modal */}
      <RegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {/* Footer Info */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900">
        <div className="flex items-center gap-2">
          <span>CEBU PDRRMO Asset Inventory System v3.5</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">Offline Synchronized</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset system data back to default initial seed?')) {
                resetToDefaultSeedData();
              }
            }}
            className="text-slate-500 hover:text-slate-300 transition underline cursor-pointer text-[11px]"
          >
            Reset Seed Data
          </button>
        </div>
      </footer>
    </div>
  );
};
