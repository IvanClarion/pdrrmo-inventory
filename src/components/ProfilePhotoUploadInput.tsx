import React, { useRef, useState } from 'react';
import { Camera, Upload, X, User as UserIcon, Link, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadUserProfilePhotoToSupabase, isSupabaseConfigured } from '../lib/supabase';

interface ProfilePhotoUploadInputProps {
  value?: string;
  onChange: (avatarUrl: string) => void;
  label?: string;
  dark?: boolean;
  userNameHint?: string;
}

export const ProfilePhotoUploadInput: React.FC<ProfilePhotoUploadInputProps> = ({
  value = '',
  onChange,
  label = 'Profile Photo / Avatar',
  dark = false,
  userNameHint = 'user_avatar',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlText, setUrlText] = useState('');

  const handleFileChange = async (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size is too large. Please select an image under 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage(null);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase client is not connected.');
      }

      // Automatically compresses image to max 600x600 WebP/PNG before uploading to 'user_profile' bucket
      const publicUrl = await uploadUserProfilePhotoToSupabase(file, userNameHint);
      if (publicUrl) {
        onChange(publicUrl);
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    } catch (err: any) {
      console.error('Supabase storage user_profile upload error:', err);
      const msg = err?.message || 'Failed to upload photo to storage bucket.';
      setErrorMessage(msg);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlText.trim()) {
      onChange(urlText.trim());
      setShowUrlInput(false);
      setUrlText('');
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-bold flex items-center gap-1.5 ${dark ? 'text-slate-200' : 'text-gray-700'}`}>
          <Camera className={`w-3.5 h-3.5 ${dark ? 'text-amber-400' : 'text-black'}`} />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className={`text-[10px] font-bold flex items-center gap-1 cursor-pointer transition ${
            dark ? 'text-slate-400 hover:text-amber-300' : 'text-gray-500 hover:text-black'
          }`}
        >
          <Link className="w-3 h-3" />
          <span>{showUrlInput ? 'Upload File' : 'Paste Image URL'}</span>
        </button>
      </div>

      {showUrlInput ? (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className={`flex-1 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none transition ${
              dark
                ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400'
                : 'bg-[#F5F5F5] border-[#E5E5E5] text-black focus:border-black'
            }`}
          />
          <button
            type="submit"
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              dark
                ? 'bg-amber-400 text-black hover:bg-amber-300 font-extrabold'
                : 'bg-black text-white hover:bg-neutral-800'
            }`}
          >
            Apply
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          {/* Main Upload / Drag-and-Drop Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`p-4 rounded-2xl border-2 border-dashed transition cursor-pointer flex items-center gap-4 ${
              isDragging
                ? dark
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-emerald-500 bg-emerald-50/50'
                : value && !value.startsWith('data:')
                ? dark
                  ? 'border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-950/50'
                  : 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50'
                : dark
                ? 'border-slate-800 bg-slate-950/80 hover:bg-slate-950 hover:border-slate-700'
                : 'border-gray-300 bg-[#F5F5F5] hover:bg-[#EAEAEA]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            {/* Profile Avatar Frame */}
            <div className="relative shrink-0">
              {isUploading ? (
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${dark ? 'bg-slate-800' : 'bg-black/10'}`}>
                  <Loader2 className={`w-6 h-6 animate-spin ${dark ? 'text-amber-400' : 'text-black'}`} />
                </div>
              ) : value ? (
                <div className="relative">
                  <img
                    src={value}
                    alt="Profile Avatar"
                    className={`w-14 h-14 rounded-full object-cover border-2 shadow-xs ${dark ? 'border-amber-400' : 'border-black'}`}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange('');
                      setUploadStatus('idle');
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow-xs cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className={`w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center ${
                  dark ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-gray-200 border-gray-400 text-gray-500'
                }`}>
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Instruction Text */}
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-xs flex items-center gap-1.5 ${dark ? 'text-white' : 'text-[#1A1A1A]'}`}>
                <Upload className={`w-3.5 h-3.5 ${dark ? 'text-amber-400' : 'text-black'}`} />
                <span>
                  {isUploading
                    ? 'Compressing & uploading to user_profile bucket...'
                    : value
                    ? 'Change Profile Photo'
                    : 'Upload to user_profile Bucket'}
                </span>
              </p>
              <p className={`text-[10px] mt-0.5 truncate ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                {isUploading
                  ? 'Optimizing dimensions and syncing to cloud bucket...'
                  : value && !value.startsWith('data:')
                  ? 'Cloud photo linked to user_profile bucket'
                  : 'Auto-compressed before upload (PNG, JPG, WebP)'}
              </p>
            </div>
          </div>

          {/* Upload Status Toast */}
          {uploadStatus === 'success' && (
            <div className={`px-3 py-1.5 border rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-fade-in ${
              dark ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Compressed & uploaded directly to Supabase &quot;user_profile&quot; bucket!</span>
            </div>
          )}

          {uploadStatus === 'error' && errorMessage && (
            <div className={`px-3 py-1.5 border rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-fade-in ${
              dark ? 'bg-red-950/80 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
