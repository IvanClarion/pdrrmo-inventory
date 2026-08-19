import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ProfilePhotoUploadInput } from './ProfilePhotoUploadInput';
import { audioService } from '../utils/audio';
import {
  X,
  UserCheck,
  Mail,
  Lock,
  Phone,
  Building,
  Briefcase,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, editUser, departments } = useInventory();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setContactNumber(
        currentUser.contactNumber ||
        currentUser.phone ||
        (currentUser as any).contact_number ||
        ''
      );
      setDepartment(currentUser.department || departments[0]?.name || '');
      setCustomDepartment('');
      setPosition(currentUser.position || '');
      setPassword(currentUser.password || '');
      setPin(
        currentUser.quick_pin ||
        currentUser.pin ||
        (currentUser as any).quickPin ||
        ''
      );
      setAvatarUrl(currentUser.avatarUrl || '');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentUser, departments]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const finalDepartment = department === 'OTHER' ? customDepartment.trim() : department;

    if (!cleanName) {
      setErrorMessage('Full name cannot be empty.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!finalDepartment) {
      setErrorMessage('Please select or specify your department/division.');
      return;
    }

    setIsSubmitting(true);

    try {
      await editUser(currentUser.id, {
        name: cleanName,
        email: cleanEmail,
        department: finalDepartment,
        position: position.trim(),
        contactNumber: contactNumber.trim(),
        phone: contactNumber.trim(),
        contact_number: contactNumber.trim(),
        password: password.trim() || undefined,
        pin: pin.trim() || undefined,
        quick_pin: pin.trim() || undefined,
        quickPin: pin.trim() || undefined,
        avatarUrl: avatarUrl.trim(),
      });

      audioService.playSuccessSound();
      setSuccessMessage('Profile updated successfully and synced to database!');
      
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrorMessage(err?.message || 'Failed to update profile.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E5E5E5] shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-black text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm leading-tight text-white">Edit My Profile & Credentials</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-black">
                  {currentUser.roleName}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Update your personal information, profile photo, password, and quick PIN.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* Profile Photo Uploader */}
          <ProfilePhotoUploadInput
            label="Profile Picture / Avatar"
            value={avatarUrl}
            onChange={setAvatarUrl}
            userNameHint={name || currentUser.name}
            dark={false}
          />

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#1A1A1A]">Full Official Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ivan Dale Clarion"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-medium focus:outline-none focus:border-black"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
                <Mail className="w-3 h-3 text-gray-400" />
                <span>Email Address *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="idclarion@pdrrmo.gov.ph"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-medium focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Contact Number & Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400" />
                <span>Contact Mobile Number</span>
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="09506939114"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-medium focus:outline-none focus:border-black"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-gray-400" />
                <span>Position / Job Title</span>
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Disaster Response Specialist"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-medium focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Department / Division */}
          <div className="space-y-1 text-xs">
            <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
              <Building className="w-3 h-3 text-gray-400" />
              <span>Department / Division *</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-medium focus:outline-none focus:border-black cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name} {dept.code ? `(${dept.code})` : ''}
                </option>
              ))}
              <option value="OTHER">Other / Custom Division...</option>
            </select>
          </div>

          {department === 'OTHER' && (
            <div className="space-y-1 text-xs animate-in fade-in">
              <label className="font-bold text-[#1A1A1A]">Specify Department Name *</label>
              <input
                type="text"
                required
                value={customDepartment}
                onChange={(e) => setCustomDepartment(e.target.value)}
                placeholder="Enter division name"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-medium focus:outline-none focus:border-black"
              />
            </div>
          )}

          {/* Account Password & 4-Digit Quick PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="space-y-1">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
                <Lock className="w-3 h-3 text-gray-400" />
                <span>Account Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 pr-9 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-mono font-medium focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#1A1A1A] flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-gray-400" />
                <span>4-Digit Quick PIN</span>
              </label>
              <input
                type="text"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 1234"
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl font-mono font-bold focus:outline-none focus:border-black text-center"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] text-gray-600 flex items-start gap-2">
            <Shield className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Role permissions (<strong className="text-black">{currentUser.roleName}</strong>) are managed centrally by Administrators in the Admin Console.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !email.trim()}
              className="px-5 py-2 bg-black hover:bg-neutral-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
