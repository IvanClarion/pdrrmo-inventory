import React, { useState } from 'react';
import { OrgBrandingConfig, LogoPresetId } from '../types';
import {
  ShieldAlert,
  Building2,
  Boxes,
  HeartPulse,
  Truck,
  Radio,
  Flame,
  Compass,
  Shield,
  Sparkles,
} from 'lucide-react';

interface BrandLogoProps {
  branding: OrgBrandingConfig;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
}

export const LOGO_PRESET_DEFINITIONS: {
  id: LogoPresetId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}[] = [
  {
    id: 'shield-alert',
    label: 'Disaster Shield',
    icon: ShieldAlert,
    description: 'Emergency & Disaster Response Shield',
    color: 'text-amber-400',
  },
  {
    id: 'building-gov',
    label: 'Government Agency',
    icon: Building2,
    description: 'Civic & Provincial Office Seal',
    color: 'text-blue-400',
  },
  {
    id: 'cube-box',
    label: 'Logistics Warehouse',
    icon: Boxes,
    description: 'Relief Supply & Inventory Logistics',
    color: 'text-emerald-400',
  },
  {
    id: 'cross-aid',
    label: 'Medical & First Aid',
    icon: HeartPulse,
    description: 'Emergency Medical & Health Relief',
    color: 'text-rose-400',
  },
  {
    id: 'truck-fast',
    label: 'Rapid Transport',
    icon: Truck,
    description: 'Field Vehicle & Distribution Fleet',
    color: 'text-cyan-400',
  },
  {
    id: 'radio-wave',
    label: 'Emergency Comms',
    icon: Radio,
    description: 'Incident Command & Telecommunications',
    color: 'text-purple-400',
  },
  {
    id: 'flame-rescue',
    label: 'Rescue & Fire Ops',
    icon: Flame,
    description: 'Search, Rescue & Emergency Defense',
    color: 'text-orange-400',
  },
  {
    id: 'anchor-port',
    label: 'Maritime & Search',
    icon: Compass,
    description: 'Coastal Operations & Field Scouting',
    color: 'text-teal-400',
  },
];

export const BrandLogo: React.FC<BrandLogoProps> = ({
  branding,
  size = 'md',
  className = '',
  showBorder = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: {
      container: 'w-6 h-6 rounded-md',
      icon: 'w-3.5 h-3.5',
      img: 'w-6 h-6 rounded-md',
    },
    sm: {
      container: 'w-7 h-7 rounded-lg',
      icon: 'w-4 h-4',
      img: 'w-7 h-7 rounded-lg',
    },
    md: {
      container: 'w-9 h-9 rounded-xl',
      icon: 'w-5 h-5',
      img: 'w-9 h-9 rounded-xl',
    },
    lg: {
      container: 'w-12 h-12 rounded-2xl',
      icon: 'w-6 h-6',
      img: 'w-12 h-12 rounded-2xl',
    },
    xl: {
      container: 'w-16 h-16 rounded-2xl',
      icon: 'w-8 h-8',
      img: 'w-16 h-16 rounded-2xl',
    },
    '2xl': {
      container: 'w-24 h-24 rounded-3xl',
      icon: 'w-12 h-12',
      img: 'w-24 h-24 rounded-3xl',
    },
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  // Custom Image URL or Uploaded Base64
  const hasCustomImage =
    Boolean(branding.customLogoUrl) &&
    !imageError;

  if (hasCustomImage) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-white ${
          selectedSize.container
        } ${showBorder ? 'border border-[#E5E5E5] shadow-xs' : ''} ${className}`}
      >
        <img
          src={branding.customLogoUrl}
          alt={`${branding.orgName} Logo`}
          className={`object-contain w-full h-full p-0.5 ${selectedSize.img}`}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Preset Vector Icon
  const matchedPreset =
    LOGO_PRESET_DEFINITIONS.find((p) => p.id === branding.logoPresetId) ||
    LOGO_PRESET_DEFINITIONS[0];
  const IconComponent = matchedPreset.icon;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 bg-black text-white shadow-xs ${
        selectedSize.container
      } ${showBorder ? 'border border-neutral-700' : ''} ${className}`}
      style={{
        backgroundColor: branding.badgeBgColor && branding.badgeBgColor !== '#000000' ? branding.badgeBgColor : '#111111',
      }}
    >
      <IconComponent className={`${selectedSize.icon} ${matchedPreset.color}`} />
    </div>
  );
};
