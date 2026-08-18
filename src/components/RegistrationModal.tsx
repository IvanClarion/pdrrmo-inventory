import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { signUpWithSupabase } from '../lib/supabase';
import {
  X,
  UserPlus,
  ShieldCheck,
  Mail,
  Lock,
  Phone,
  Building,
  Briefcase,
  KeyRound,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose }) => {
  const { submitRegistration, branding, departments } = useInventory();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [reasonOrNotes, setReasonOrNotes] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ fullName: string; email: string } | null>(null);

  // Initialize selected department to the first available dynamic department
  useEffect(() => {
    if (departments && departments.length > 0 && !department) {
      setDepartment(departments[0].name);
    }
  }, [departments, department]);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setFullName('');
    setEmail('');
    setDepartment(departments[0]?.name || '');
    setCustomDepartment('');
    setPosition('');
    setContactNumber('');
    setPassword('');
    setPin('');
    setReasonOrNotes('');
    setErrorMessage(null);
    setSubmittedData(null);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const finalDepartment = department === 'OTHER' ? customDepartment.trim() : department;

    if (!cleanName) {
      setErrorMessage('Please enter your full official name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!finalDepartment) {
      setErrorMessage('Please select or specify your department / division.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('Please create a password of at least 4 characters.');
      return;
    }

    setIsSubmitting(true);

    // Register user account in Supabase Auth asynchronously
    signUpWithSupabase(cleanEmail, password, cleanName, 'Staff')
      .then((res) => {
        console.log('Supabase user registration initiated:', res);
      })
      .catch((sbErr) => {
        console.warn('Supabase Auth registration notice:', sbErr?.message || sbErr);
      })
      .finally(() => {
        const result = submitRegistration({
          fullName: cleanName,
          email: cleanEmail,
          department: finalDepartment,
          position: position.trim() || undefined,
          contactNumber: contactNumber.trim() || undefined,
          requestedRoleName: 'Staff', // Default system role for all self-registrations
          password,
          pin: pin.trim() || undefined,
          reasonOrNotes: reasonOrNotes.trim() || undefined,
        });

        setIsSubmitting(false);

        if (result.success) {
          setSubmittedData({ fullName: cleanName, email: cleanEmail });
        } else {
          setErrorMessage(result.error || 'Failed to submit registration request.');
        }
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-100 my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Staff Account Registration</h3>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-400 text-black">
                  Admin Approval Required
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {branding.orgName || 'CEBU PDRRMO'} Asset Inventory & Custody Management System
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {submittedData ? (
          /* Success Screen */
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-white">Registration Submitted Successfully!</h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Your registration application for <strong className="text-white font-bold">{submittedData.fullName}</strong> ({submittedData.email}) has been securely recorded.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Next Step: Administrator Confirmation</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                As an official government security policy, <strong>only the PDRRMO Administrator</strong> can approve and confirm your account.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Once confirmed in the Admin Control Panel, your profile will be assigned an official employee QR badge and you will be able to log in immediately with your password or QR badge.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                Return to Sign In Portal
              </button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
            {/* Security Notice Banner */}
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-start gap-2.5 text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-amber-300">Official Access Verification Notice</p>
                <p className="text-amber-200/80 leading-relaxed">
                  Registered accounts require verification and activation by the Administrator before access is granted.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Full Official Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Santos Dela Cruz"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Government / Office Email *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria.cruz@pdrrmo.gov.ph"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Contact Number */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Contact Mobile Number</span>
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+63 917 555 1234"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span>Department / Division *</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400 transition"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))}
                  <option value="OTHER">Other / Custom Division...</option>
                </select>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span>Official Job Position / Title</span>
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Field Logistics Officer"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Custom Department input if "OTHER" */}
              {department === 'OTHER' && (
                <div className="space-y-1.5 sm:col-span-2 animate-in fade-in">
                  <label className="font-bold text-slate-200">Specify Division Name *</label>
                  <input
                    type="text"
                    required
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    placeholder="Enter custom department name"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              )}

              {/* Account Password */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Create Account Password *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 4 characters"
                    className="w-full px-3.5 py-2.5 pr-9 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 4-Digit PIN */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>4-Digit Security PIN (Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 5678"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition text-center"
                />
              </div>

              {/* Deployment / Official Notes */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Deployment / Reason for Access</span>
                </label>
                <textarea
                  rows={2}
                  value={reasonOrNotes}
                  onChange={(e) => setReasonOrNotes(e.target.value)}
                  placeholder="Briefly state your operational post or equipment assignment (e.g. Assigned to Field Team 3 dispatch & emergency warehouse checkouts)..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !fullName || !email || !password}
                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-black rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/10 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting Application...</span>
                ) : (
                  <>
                    <span>Submit for Admin Approval</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
