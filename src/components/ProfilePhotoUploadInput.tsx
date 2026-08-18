import React, { useRef, useState } from 'react';
import { Camera, Upload, X, User as UserIcon, Link, Sparkles } from 'lucide-react';
import { uploadUserProfilePhotoToSupabase } from '../lib/supabase';

interface ProfilePhotoUploadInputProps {
  value?: string;
  onChange: (avatarDataUrl: string) => void;
  label?: string;
}

export const ProfilePhotoUploadInput: React.FC<ProfilePhotoUploadInputProps> = ({
  value = '',
  onChange,
  label = 'Profile Photo / Avatar',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlText, setUrlText] = useState('');

  const handleFileChange = async (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Limit file size to ~5MB before encoding
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size is too large. Please select an image under 5MB.');
      return;
    }

    // Immediate local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage 'user_profile' bucket
    setIsUploading(true);
    try {
      const publicUrl = await uploadUserProfilePhotoToSupabase(file, label || 'avatar');
      if (publicUrl) {
        onChange(publicUrl);
      }
    } catch (err) {
      console.warn('Direct Supabase user_profile bucket upload notice (fallback to preview):', err);
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
    }
  };

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-black" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] text-gray-500 hover:text-black font-bold flex items-center gap-1 cursor-pointer"
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
            className="flex-1 px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:outline-none focus:border-black"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
          >
            Apply
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          {/* Main Upload / Drag-and-Drop Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 rounded-2xl border-2 border-dashed transition cursor-pointer flex items-center gap-4 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : value
                ? 'border-[#E5E5E5] bg-[#F9F9F9] hover:bg-[#F0F0F0]'
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
              {value ? (
                <div className="relative">
                  <img
                    src={value}
                    alt="Profile Avatar Preview"
                    className="w-14 h-14 rounded-full object-cover border-2 border-black shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange('');
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow-xs"
                    title="Remove Photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500">
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Instruction Text */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs text-[#1A1A1A] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-black" />
                <span>{value ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Drag & drop image file here, or click to browse (PNG, JPG up to 3MB)
              </p>
            </div>
          </div>

          {/* Quick Preset Samples */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Or Choose Sample Avatar:
            </p>
            <div className="flex items-center gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange(url)}
                  className={`w-8 h-8 rounded-full border-2 transition overflow-hidden cursor-pointer ${
                    value === url ? 'border-black ring-2 ring-emerald-400' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
