import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { User } from '../types';
import { User as UserIcon, QrCode, ShieldCheck, Check, Search, Sparkles } from 'lucide-react';

interface PersonSelectorInputProps {
  value: string;
  onChange: (personName: string, matchedUser?: User) => void;
  label: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}

export const PersonSelectorInput: React.FC<PersonSelectorInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Type name, email, or scan QR code...',
  helperText = 'Select person from roster or scan their QR badge.',
}) => {
  const { users } = useInventory();
  const [qrInput, setQrInput] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Find if current value or qrInput matches any user
  const matchedUser = users.find(
    (u) =>
      (u.userQrCode && u.userQrCode.toLowerCase() === value.trim().toLowerCase()) ||
      (u.userQrCode && u.userQrCode.toLowerCase() === qrInput.trim().toLowerCase()) ||
      u.name.toLowerCase() === value.trim().toLowerCase() ||
      value.toLowerCase().includes(u.name.toLowerCase()) ||
      u.email.toLowerCase() === value.trim().toLowerCase()
  );

  const handleDropdownSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    if (!selectedUserId) return;
    const target = users.find((u) => u.id === selectedUserId);
    if (target) {
      const formatted = `${target.name} (${target.department})`;
      onChange(formatted, target);
      setQrInput(target.userQrCode || '');
    }
  };

  const handleQrInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    const target = users.find(
      (u) =>
        (u.userQrCode && u.userQrCode.toLowerCase() === qrInput.trim().toLowerCase()) ||
        u.email.toLowerCase() === qrInput.trim().toLowerCase() ||
        u.name.toLowerCase() === qrInput.trim().toLowerCase()
    );

    if (target) {
      const formatted = `${target.name} (${target.department})`;
      onChange(formatted, target);
      setShowQrModal(false);
    } else {
      // If freeform text typed
      onChange(qrInput.trim());
      setShowQrModal(false);
    }
  };

  const handleSimulateQrScan = (user: User) => {
    const formatted = `${user.name} (${user.department})`;
    setQrInput(user.userQrCode || '');
    onChange(formatted, user);
    setShowQrModal(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <UserIcon className="w-3.5 h-3.5 text-black" />
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
        </label>
        <span className="text-[10px] text-gray-400 font-medium">Select Dropdown or Scan QR Code</span>
      </div>

      {/* Main Selection Area: Dropdown or Direct Input */}
      <div className="space-y-2">
        {/* Dropdown Menu */}
        <div className="relative">
          <select
            value={matchedUser ? matchedUser.id : ''}
            onChange={handleDropdownSelect}
            className="w-full px-3 py-2 bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] rounded-xl text-xs font-bold text-[#1A1A1A] focus:outline-none focus:border-black cursor-pointer transition"
          >
            <option value="">-- Select Person from Dropdown Roster --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.roleName} ({u.department})
              </option>
            ))}
          </select>
        </div>

        {/* Manual Text / QR Input with Quick Scan Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const val = e.target.value;
                setQrInput(val);
                // Check direct QR or name match
                const target = users.find(
                  (u) =>
                    (u.userQrCode && u.userQrCode.toLowerCase() === val.trim().toLowerCase()) ||
                    u.name.toLowerCase() === val.trim().toLowerCase()
                );
                onChange(val, target);
              }}
              placeholder={placeholder}
              required={required && !value}
              className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-medium text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-black"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-3 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition shadow-xs cursor-pointer"
            title="Scan or Simulate User QR Badge"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Scan QR</span>
          </button>
        </div>
      </div>

      {/* Verified User Card Preview when matched */}
      {matchedUser && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={
                matchedUser.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={matchedUser.name}
              className="w-8 h-8 rounded-full object-cover border border-emerald-400 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black truncate">{matchedUser.name}</span>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-200 text-emerald-800 rounded uppercase">
                  {matchedUser.roleName}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 font-mono truncate">
                QR ID: {matchedUser.userQrCode} • {matchedUser.department}
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Verified
          </span>
        </div>
      )}

      {/* QR Code Scan / Select Dialog Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-[#E5E5E5] shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-black" />
                <h4 className="font-bold text-sm text-[#1A1A1A]">Scan or Select User QR Badge</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-gray-400 hover:text-black font-bold text-xs"
              >
                Cancel
              </button>
            </div>

            {/* Quick QR Code Code Input */}
            <form onSubmit={handleQrInputSubmit} className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Scan or Type QR Code Payload:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="e.g. USR-QR-USD01"
                  autoFocus
                  className="flex-1 px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-black"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
                >
                  Verify
                </button>
              </div>
            </form>

            {/* Simulate Scan from Available User QR Badges */}
            <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Or Click Any QR Badge to Simulate Scan:
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSimulateQrScan(u)}
                    className="w-full p-2 rounded-xl bg-[#F9F9F9] hover:bg-emerald-50 border border-[#E5E5E5] hover:border-emerald-300 text-left transition flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[#1A1A1A] group-hover:text-emerald-900 truncate">
                          {u.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono truncate">{u.userQrCode || u.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-700 bg-white px-2 py-0.5 rounded border border-[#E5E5E5] shrink-0">
                      Scan
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
