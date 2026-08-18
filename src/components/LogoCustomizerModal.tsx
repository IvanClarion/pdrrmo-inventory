import React, { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { OrgBrandingConfig, LogoPresetId } from '../types';
import { DEFAULT_BRANDING } from '../data/mockData';
import { uploadLogoToSupabase, isSupabaseConfigured } from '../lib/supabase';
import { BrandLogo, LOGO_PRESET_DEFINITIONS } from './BrandLogo';
import {
  Upload,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sparkles,
  Link,
  Shield,
  Palette,
  Eye,
  FileText,
  CreditCard,
  Building,
  AlertCircle,
  X,
} from 'lucide-react';

const COLOR_SWATCHES = [
  { name: 'Onyx Black', hex: '#000000' },
  { name: 'Disaster Crimson', hex: '#DC2626' },
  { name: 'Rescue Blue', hex: '#2563EB' },
  { name: 'Emergency Orange', hex: '#EA580C' },
  { name: 'Forest Emerald', hex: '#059669' },
  { name: 'Command Indigo', hex: '#4F46E5' },
  { name: 'Caution Amber', hex: '#D97706' },
  { name: 'Deep Slate', hex: '#334155' },
];

interface LogoCustomizerProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const LogoCustomizer: React.FC<LogoCustomizerProps> = ({
  isOpen = true,
  onClose,
  isEmbedded = false,
}) => {
  const { branding, updateBranding, resetBrandingToDefault, isAdmin } = useInventory();

  const [formData, setFormData] = useState<OrgBrandingConfig>(branding);
  const [activeMode, setActiveMode] = useState<'upload' | 'preset' | 'url'>(
    branding.logoType || 'preset'
  );
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'header' | 'agreement' | 'badge'>('header');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formData if branding changes externally
  React.useEffect(() => {
    setFormData(branding);
    setActiveMode(branding.logoType);
  }, [branding]);

  if (!isOpen && !isEmbedded) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file is larger than 5MB. Please select a smaller image.');
      return;
    }

    setUploadError(null);

    // Try Supabase Storage upload first
    if (isSupabaseConfigured()) {
      setIsUploading(true);
      try {
        const publicUrl = await uploadLogoToSupabase(file, branding.orgName || 'org_logo');
        setFormData((prev) => ({
          ...prev,
          logoType: 'upload',
          customLogoUrl: publicUrl,
        }));
        setActiveMode('upload');
        setIsUploading(false);
        setUploadError(null);
        setSaveNotification('Logo uploaded to Supabase "logo" bucket! Click Save to apply.');
        setTimeout(() => setSaveNotification(null), 4000);
        return;
      } catch (uploadErr: any) {
        console.warn('Supabase logo upload notice:', uploadErr);
        const errMsg = uploadErr?.message || 'Check storage permissions';
        setUploadError(`Storage notice (${errMsg}) — saving locally & to database.`);
        setIsUploading(false);
        // Fall through to Base64 fallback below
      }
    }

    // Fallback: compress to Base64 data URL (localStorage)
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png', 0.85);
          setFormData((prev) => ({
            ...prev,
            logoType: 'upload',
            customLogoUrl: compressed,
          }));
          setActiveMode('upload');
        } else {
          setFormData((prev) => ({
            ...prev,
            logoType: 'upload',
            customLogoUrl: rawBase64,
          }));
          setActiveMode('upload');
        }
      };
      img.onerror = () => {
        setFormData((prev) => ({
          ...prev,
          logoType: 'upload',
          customLogoUrl: rawBase64,
        }));
        setActiveMode('upload');
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!isAdmin) {
      alert('Access Denied: Only Admin can customize organization branding.');
      return;
    }
    updateBranding({
      ...formData,
      logoType: activeMode,
    });
    setSaveNotification('Organization branding & logo successfully saved!');
    setTimeout(() => {
      setSaveNotification(null);
      if (onClose) onClose();
    }, 1500);
  };

  const handleReset = () => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to restore the default PDRRMO organization branding and logo?')) {
      resetBrandingToDefault();
      setFormData(DEFAULT_BRANDING);
      setActiveMode('preset');
      setSaveNotification('Branding reset to default PDRRMO configuration.');
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {saveNotification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{saveNotification}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Left Controls, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Logo Source Selector */}
          <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-black" />
                <span>Logo Source Type</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">Select source format</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('upload');
                  setFormData((prev) => ({ ...prev, logoType: 'upload' }));
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  activeMode === 'upload'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-4 h-4 mb-1.5" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('preset');
                  setFormData((prev) => ({ ...prev, logoType: 'preset' }));
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  activeMode === 'preset'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Shield className="w-4 h-4 mb-1.5" />
                <span>Preset Icons</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('url');
                  setFormData((prev) => ({ ...prev, logoType: 'url' }));
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  activeMode === 'url'
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Link className="w-4 h-4 mb-1.5" />
                <span>Image URL</span>
              </button>
            </div>

            {/* Mode 1: Upload Image */}
            {activeMode === 'upload' && (
              <div className="space-y-3 pt-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-black rounded-xl p-6 text-center cursor-pointer transition bg-white space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-black">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Click to upload or drag and drop official seal / logo
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      PNG, JPG, SVG or WebP (transparent backgrounds recommended, max 2MB)
                    </p>
                  </div>
                </div>

                {formData.customLogoUrl && (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={formData.customLogoUrl}
                        alt="Uploaded preview"
                        className="w-8 h-8 rounded-lg object-contain border border-gray-200"
                      />
                      <span className="text-xs font-medium text-gray-700">Custom logo uploaded</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          customLogoUrl: '',
                          logoType: 'preset',
                        }))
                      }
                      className="text-xs font-bold text-red-600 hover:underline px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Upload progress indicator */}
                {isUploading && (
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl animate-pulse">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-blue-800">Uploading logo to cloud storage...</span>
                  </div>
                )}

                {/* Upload error */}
                {uploadError && (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-medium text-amber-800">{uploadError}</span>
                  </div>
                )}

                {/* Cloud storage badge */}
                {formData.customLogoUrl && formData.customLogoUrl.startsWith('http') && !isUploading && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-medium text-emerald-800">Logo stored in Supabase cloud — persists across devices</span>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Preset Vector Icons */}
            {activeMode === 'preset' && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] text-gray-500 font-medium">
                  Choose a vector icon preset tailored for emergency management & logistics:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {LOGO_PRESET_DEFINITIONS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected =
                      formData.logoPresetId === preset.id && activeMode === 'preset';
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            logoPresetId: preset.id,
                            logoType: 'preset',
                          }));
                          setActiveMode('preset');
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black ring-2 ring-black/20 shadow-sm'
                            : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-neutral-800' : 'bg-neutral-100'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${preset.color}`} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold leading-tight">{preset.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 3: Image URL */}
            {activeMode === 'url' && (
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-gray-700">Direct Image Web URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.customLogoUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customLogoUrl: e.target.value,
                        logoType: 'url',
                      }))
                    }
                    placeholder="https://example.com/pdrrmo-seal.png"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Provide a publicly accessible HTTPS image link.
                </p>
              </div>
            )}
          </div>

          {/* Organization Name & Agency Fields */}
          <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
              <Building className="w-4 h-4 text-black" />
              <span>Agency & System Identity</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Short Brand / Acronym</label>
                <input
                  type="text"
                  value={formData.orgName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, orgName: e.target.value }))}
                  placeholder="PDRRMO"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Badge Tag Label</label>
                <input
                  type="text"
                  value={formData.badgeText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, badgeText: e.target.value }))}
                  placeholder="INVENTORY"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700">Full Agency / Office Name</label>
                <input
                  type="text"
                  value={formData.fullOfficeName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fullOfficeName: e.target.value }))
                  }
                  placeholder="Provincial Disaster Risk Reduction and Management Office"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700">System Tagline / Subtitle</label>
                <input
                  type="text"
                  value={formData.orgSubtitle}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, orgSubtitle: e.target.value }))
                  }
                  placeholder="PDRRMO Inventory Management & Logistics Engine"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>
            </div>

            {/* Badge Accent Color */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-black" />
                <span>Brand Accent / Badge Color</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, badgeBgColor: swatch.hex }))
                    }
                    className={`w-7 h-7 rounded-lg border-2 transition transform cursor-pointer ${
                      formData.badgeBgColor === swatch.hex
                        ? 'border-black scale-110 shadow-xs'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                    title={swatch.name}
                  />
                ))}
                <input
                  type="color"
                  value={formData.badgeBgColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, badgeBgColor: e.target.value }))
                  }
                  className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300"
                  title="Custom hex color"
                />
              </div>
            </div>
          </div>

          {/* Action Save / Reset Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>

            <div className="flex items-center gap-2">
              {onClose && !isEmbedded && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Logo & Branding</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-black" />
                <span>Live Brand Preview</span>
              </h4>
              <div className="flex bg-[#F5F5F5] p-0.5 rounded-lg border border-gray-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('header')}
                  className={`px-2 py-1 rounded transition ${
                    previewTab === 'header' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Header
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('agreement')}
                  className={`px-2 py-1 rounded transition ${
                    previewTab === 'agreement' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Agreement
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('badge')}
                  className={`px-2 py-1 rounded transition ${
                    previewTab === 'badge' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                  }`}
                >
                  ID Badge
                </button>
              </div>
            </div>

            {/* Preview 1: Header Preview */}
            {previewTab === 'header' && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-500 font-medium">Top Navigation Header Appearance:</p>
                <div className="p-4 bg-white border border-[#E5E5E5] rounded-xl shadow-xs">
                  <div className="flex items-center gap-3">
                    <BrandLogo
                      branding={{ ...formData, logoType: activeMode }}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h1 className="font-bold tracking-tight text-base text-[#1A1A1A]">
                          {formData.orgName || 'PDRRMO'}
                        </h1>
                        <span
                          className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: formData.badgeBgColor || '#000000' }}
                        >
                          {formData.badgeText || 'INVENTORY'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {formData.orgSubtitle || 'PDRRMO Inventory Management & Logistics Engine'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview 2: Check-Out Agreement Slip Preview */}
            {previewTab === 'agreement' && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-500 font-medium">
                  Official Check-Out Custody & Agreement Slip Header:
                </p>
                <div className="p-4 bg-white border-2 border-black rounded-xl font-mono text-[11px] space-y-3">
                  <div className="flex items-center gap-3 border-b-2 border-black pb-3">
                    <BrandLogo
                      branding={{ ...formData, logoType: activeMode }}
                      size="lg"
                    />
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-black uppercase font-mono">
                        {formData.orgName || 'PDRRMO'} INVENTORY MANAGEMENT
                      </h2>
                      <p className="text-[10px] font-bold text-gray-800 uppercase">
                        {formData.fullOfficeName || 'Provincial Disaster Risk Reduction & Management Office'}
                      </p>
                      <p className="text-[9px] text-gray-500">
                        Official Equipment Custody & Check-Out Release Agreement
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 italic">
                    [Custody manifest, serial tracking, borrower signature block & terms]
                  </div>
                </div>
              </div>
            )}

            {/* Preview 3: ID Badge Preview */}
            {previewTab === 'badge' && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-500 font-medium">User QR Badge & Shelf Label Branding:</p>
                <div className="p-4 bg-white border border-gray-300 rounded-xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <BrandLogo
                        branding={{ ...formData, logoType: activeMode }}
                        size="xs"
                      />
                      <span className="text-xs font-bold font-mono">
                        {formData.orgName || 'PDRRMO'} ID
                      </span>
                    </div>
                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: formData.badgeBgColor || '#000000' }}
                    >
                      {formData.badgeText || 'INVENTORY'}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Personnel QR Badges and printed item barcode stickers will use this branding seal.
                  </div>
                </div>
              </div>
            )}

            {/* Explanatory notes */}
            <div className="p-3 bg-[#F9F9F9] border border-gray-200 rounded-xl text-[11px] text-gray-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-black">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Automatic Multi-Surface Synchronization</span>
              </div>
              <p className="text-gray-500 leading-relaxed">
                Updating your logo immediately synchronizes the system header, printable check-out agreement forms, barcode generator, user ID cards, and official reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E5E5E5] shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4 border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#1A1A1A]">
                Customize Organization Logo & Branding
              </h3>
              <p className="text-xs text-gray-500">
                Configure your agency seal, custom uploaded image, system title, and brand colors
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {content}
      </div>
    </div>
  );
};
