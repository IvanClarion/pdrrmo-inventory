import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { useInventory } from '../context/InventoryContext';
import { renderQRCodeToCanvas } from '../utils/barcodeRenderer';
import { ProfilePhotoUploadInput } from './ProfilePhotoUploadInput';
import { BrandLogo } from './BrandLogo';
import { X, QrCode, Download, Printer, Shield, Building, Camera } from 'lucide-react';

interface UserQRBadgeModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserQRBadgeModal: React.FC<UserQRBadgeModalProps> = ({ user, isOpen, onClose }) => {
  const { editUser, branding } = useInventory();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);

  const qrPayload = user?.userQrCode || (user ? `USR-QR-${user.id.toUpperCase()}` : '');

  useEffect(() => {
    if (isOpen && user && canvasRef.current) {
      renderQRCodeToCanvas(canvasRef.current, qrPayload, {
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    }
  }, [isOpen, user, qrPayload]);

  if (!isOpen || !user) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR-Badge-${user.name.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full border border-[#E5E5E5] shadow-2xl overflow-hidden relative">
        {/* Header bar */}
        <div className="bg-black text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo branding={branding} size="sm" />
            <div>
              <h3 className="font-bold text-sm tracking-tight">{branding.orgName || 'PDRRMO'} User ID Badge</h3>
              <p className="text-[10px] text-gray-300">Scan-to-Identify QR Credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Badge Content */}
        <div className="p-6 text-center space-y-4 print:p-0">
          {/* Badge Card Wrapper */}
          <div className="p-5 rounded-2xl bg-[#F9F9F9] border-2 border-[#E5E5E5] shadow-xs space-y-3 relative overflow-hidden">
            {/* Top decorative badge tag */}
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-gray-700 bg-white px-2 py-0.5 rounded border border-[#E5E5E5] flex items-center gap-1">
                <BrandLogo branding={branding} size="xs" />
                <span>{branding.orgName || 'PDRRMO'} ID</span>
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-2xs"
                style={{ backgroundColor: branding.badgeBgColor || '#000000' }}
              >
                <Shield className="w-3 h-3 text-white" />
                <span>{branding.badgeText || 'VERIFIED'}</span>
              </span>
            </div>

            {/* Avatar & Name */}
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="relative group cursor-pointer" onClick={() => setIsEditingPhoto(!isEditingPhoto)}>
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-black shadow-xs group-hover:opacity-90 transition"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black text-white border-2 border-white flex items-center justify-center shadow-xs">
                  <Camera className="w-3 h-3 text-emerald-400" />
                </div>
              </div>

              <div>
                <h4 className="font-bold text-base text-[#1A1A1A] tracking-tight">{user.name}</h4>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className="text-xs font-bold text-black bg-black text-white px-2 py-0.5 rounded-md">
                    {user.roleName}
                  </span>
                  <button
                    onClick={() => setIsEditingPhoto(!isEditingPhoto)}
                    className="text-[10px] text-gray-500 hover:text-black font-bold underline ml-1 cursor-pointer"
                  >
                    {isEditingPhoto ? 'Close Editor' : 'Update Photo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Photo Uploader Drawer */}
            {isEditingPhoto && (
              <div className="p-3 bg-white rounded-2xl border border-gray-200 text-left shadow-md space-y-2 animate-fade-in">
                <ProfilePhotoUploadInput
                  label="Upload New Profile Photo"
                  value={user.avatarUrl}
                  onChange={(newAvatarUrl) => {
                    editUser(user.id, { avatarUrl: newAvatarUrl });
                    setIsEditingPhoto(false);
                  }}
                />
              </div>
            )}

            {/* Department info */}
            <div className="text-xs text-gray-500 font-medium space-y-0.5 bg-white p-2.5 rounded-xl border border-[#E5E5E5]">
              <div className="flex items-center justify-center gap-1 text-gray-700">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                <span>{user.department}</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono truncate">{user.email}</p>
            </div>

            {/* Rendered QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-[#E5E5E5] shadow-inner">
              <canvas ref={canvasRef} className="max-w-[170px] max-h-[170px]" />
              <span className="text-[11px] font-mono font-bold text-[#1A1A1A] mt-1 tracking-wider bg-gray-100 px-2 py-0.5 rounded border border-[#E5E5E5]">
                {qrPayload}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-snug">
            Scan this QR code at the Quick Terminal or Mobile Scanner to instantly identify yourself during Check-In/Check-Out.
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleDownload}
              className="py-2.5 px-3 bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#1A1A1A] border border-[#E5E5E5] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Badge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
