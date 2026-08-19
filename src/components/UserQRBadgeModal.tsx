import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { useInventory } from '../context/InventoryContext';
import { renderQRCodeToCanvas, generateQRDataUrl } from '../utils/barcodeRenderer';
import { ProfilePhotoUploadInput } from './ProfilePhotoUploadInput';
import { BrandLogo } from './BrandLogo';
import { X, QrCode, Download, Printer, Shield, Building, Camera, Loader2 } from 'lucide-react';

interface UserQRBadgeModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserQRBadgeModal: React.FC<UserQRBadgeModalProps> = ({ user, isOpen, onClose }) => {
  const { editUser, branding } = useInventory();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const qrPayload = user?.userQrCode || (user ? `USR-QR-${user.id.toUpperCase()}` : '');

  useEffect(() => {
    if (isOpen && user && canvasRef.current) {
      renderQRCodeToCanvas(canvasRef.current, qrPayload, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    }
  }, [isOpen, user, qrPayload]);

  if (!isOpen || !user) return null;

  // Helper to load image for canvas drawing
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  };

  const handleDownload = async () => {
    if (!user) return;
    setIsDownloading(true);

    try {
      // 1. Generate high-res QR code image
      const qrDataUrl = await generateQRDataUrl(qrPayload, {
        width: 400,
        margin: 1,
        darkColor: '#0f172a',
        lightColor: '#ffffff',
      });

      // 2. Create high-resolution canvas (700 x 1050 px)
      const canvas = document.createElement('canvas');
      canvas.width = 700;
      canvas.height = 1050;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      // Card Background (Rounded)
      const radius = 36;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(10, 10, 680, 1030, radius);
      ctx.fill();

      // Card Outer Border
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Top Header Pill (Left: Agency ID)
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(40, 45, 260, 48, 24);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // Left Pill Logo & Text
      const logoUrl = branding.customLogoUrl || '/assets/logo/logo.jpg';
      try {
        const logoImg = await loadImage(logoUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(68, 69, 16, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, 52, 53, 32, 32);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(68, 69, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${branding.orgName || 'CEBU PDRRMO'} ID`, 95, 75);

      // Top Header Pill (Right: Badge Tag / INVENTORY)
      const badgeBgColor = branding.badgeBgColor || '#DC2626';
      ctx.fillStyle = badgeBgColor;
      ctx.beginPath();
      ctx.roundRect(460, 45, 200, 48, 24);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🛡️ ${branding.badgeText || 'INVENTORY'}`, 560, 75);
      ctx.textAlign = 'left';

      // Profile Photo Avatar (Circular with border)
      const avatarCenterX = 350;
      const avatarCenterY = 200;
      const avatarRadius = 65;

      const avatarSrc =
        user.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      try {
        const avatarImg = await loadImage(avatarSrc);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          avatarImg,
          avatarCenterX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarRadius * 2,
          avatarRadius * 2
        );
        ctx.restore();
      } catch {
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          user.name.split(' ').map((n) => n[0]).slice(0, 2).join(''),
          avatarCenterX,
          avatarCenterY + 12
        );
        ctx.textAlign = 'left';
      }

      // Avatar Ring Border
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Officer Full Name
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(user.name, 350, 310);

      // Role Badge Pill
      const roleText = user.roleName.toUpperCase();
      ctx.font = 'bold 15px sans-serif';
      const roleTextWidth = ctx.measureText(roleText).width;
      const rolePillWidth = Math.max(120, roleTextWidth + 36);

      ctx.fillStyle = user.roleName === 'Admin' ? '#000000' : '#0F172A';
      ctx.beginPath();
      ctx.roundRect(350 - rolePillWidth / 2, 330, rolePillWidth, 34, 17);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(roleText, 350, 353);

      // Department & Email Container
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(60, 390, 580, 75, 18);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`🏢 ${user.department || 'General Administration'}`, 350, 422);

      ctx.fillStyle = '#64748B';
      ctx.font = '14px monospace';
      ctx.fillText(user.email, 350, 448);

      // QR Code Container Box
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(140, 490, 420, 420, 24);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // Render High-Res QR code
      if (qrDataUrl) {
        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, 160, 510, 380, 380);
      }

      // Serial / Payload Number Below QR
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`ID CODE: ${qrPayload}`, 350, 935);

      // Bottom Agency Footer
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(
        'CEBU PROVINCIAL DISASTER RISK REDUCTION AND MANAGEMENT OFFICE',
        350,
        980
      );

      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px sans-serif';
      ctx.fillText('Official Property & Identity Credentials • Scan to Authenticate', 350, 1005);

      // 3. Trigger PNG Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `CEBU_PDRRMO_User_Badge_${user.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Badge PNG generation error:', err);
      // Fallback: download QR canvas if full card render fails
      if (canvasRef.current) {
        const fallbackData = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `User-QR-${user.name.replace(/\s+/g, '_')}.png`;
        link.href = fallbackData;
        link.click();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!user) return;
    setIsPrinting(true);

    try {
      const qrDataUrl = await generateQRDataUrl(qrPayload, {
        width: 320,
        margin: 1,
        darkColor: '#0f172a',
        lightColor: '#ffffff',
      });

      const logoUrl = branding.customLogoUrl || '/assets/logo/logo.jpg';
      const avatarSrc =
        user.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      // Create isolated hidden iframe for clean printing
      const existingFrame = document.getElementById('user-badge-print-iframe');
      if (existingFrame && document.body.contains(existingFrame)) {
        document.body.removeChild(existingFrame);
      }

      const printFrame = document.createElement('iframe');
      printFrame.id = 'user-badge-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) throw new Error('Cannot access print frame document');

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${branding.orgName || 'CEBU PDRRMO'} User ID Badge - ${user.name}</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background-color: #f8fafc;
              padding: 20px;
            }
            .badge-card {
              width: 340px;
              background: #ffffff;
              border: 2px solid #0f172a;
              border-radius: 24px;
              padding: 22px;
              text-align: center;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .header-bar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 16px;
            }
            .pill-left {
              display: flex;
              align-items: center;
              gap: 6px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 800;
              color: #0f172a;
            }
            .pill-left img {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              object-fit: cover;
            }
            .pill-right {
              background: ${branding.badgeBgColor || '#dc2626'};
              color: #ffffff;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .avatar-wrap {
              margin: 8px auto 12px auto;
            }
            .avatar-img {
              width: 72px;
              height: 72px;
              border-radius: 50%;
              object-fit: cover;
              border: 2.5px solid #0f172a;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .user-name {
              font-size: 18px;
              font-weight: 900;
              color: #0f172a;
              margin-bottom: 4px;
              letter-spacing: -0.3px;
            }
            .role-pill {
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 10px;
              border-radius: 6px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            .dept-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 8px;
              margin-bottom: 14px;
              font-size: 11px;
            }
            .dept-name {
              font-weight: 700;
              color: #1e293b;
            }
            .dept-email {
              font-family: monospace;
              color: #64748b;
              font-size: 9.5px;
              margin-top: 2px;
            }
            .qr-wrap {
              background: #ffffff;
              border: 1.5px solid #e2e8f0;
              border-radius: 16px;
              padding: 10px;
              display: inline-block;
              margin-bottom: 8px;
            }
            .qr-img {
              width: 170px;
              height: 170px;
              display: block;
            }
            .serial-code {
              font-family: monospace;
              font-size: 9px;
              color: #64748b;
              font-weight: 700;
              margin-bottom: 10px;
            }
            .footer-tagline {
              font-size: 8.5px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.3;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
            }
            .footer-sub {
              font-size: 7.5px;
              color: #94a3b8;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="badge-card">
            <div class="header-bar">
              <div class="pill-left">
                <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
                <span>${branding.orgName || 'CEBU PDRRMO'} ID</span>
              </div>
              <div class="pill-right">
                <span>🛡️ ${branding.badgeText || 'INVENTORY'}</span>
              </div>
            </div>

            <div class="avatar-wrap">
              <img src="${avatarSrc}" alt="${user.name}" class="avatar-img" />
            </div>

            <div class="user-name">${user.name}</div>
            <div class="role-pill">${user.roleName}</div>

            <div class="dept-card">
              <div class="dept-name">🏢 ${user.department || 'General Operations'}</div>
              <div class="dept-email">${user.email}</div>
            </div>

            <div class="qr-wrap">
              <img src="${qrDataUrl}" alt="QR Code" class="qr-img" />
            </div>

            <div class="serial-code">ID CODE: ${qrPayload}</div>

            <div class="footer-tagline">
              CEBU PROVINCIAL DISASTER RISK REDUCTION AND MANAGEMENT OFFICE
            </div>
            <div class="footer-sub">
              Official Property & Identity Credentials • Scan to Authenticate
            </div>
          </div>
        </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setIsPrinting(false);
      }, 500);
    } catch (err) {
      console.error('Badge print error:', err);
      window.print();
      setIsPrinting(false);
    }
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
                  src={
                    user.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
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
                  userNameHint={user.name}
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
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-snug">
            Scan this QR code at the Quick Terminal or Mobile Scanner to instantly identify yourself during Check-In/Check-Out.
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="py-2.5 px-3 bg-[#F5F5F5] hover:bg-[#EAEAEA] disabled:opacity-50 text-[#1A1A1A] border border-[#E5E5E5] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-black" />
                  <span>Download PNG</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="py-2.5 px-3 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Badge</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
