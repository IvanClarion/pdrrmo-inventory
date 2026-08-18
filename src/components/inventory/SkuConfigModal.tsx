import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { SkuFormatConfig } from '../../types';
import { X, Hash, Save, Sparkles } from 'lucide-react';

interface SkuConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkuConfigModal: React.FC<SkuConfigModalProps> = ({ isOpen, onClose }) => {
  const { skuFormatConfig, updateSkuFormatConfig, generateSku } = useInventory();
  const [form, setForm] = useState<SkuFormatConfig>(skuFormatConfig);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSkuFormatConfig(form);
    onClose();
  };

  const sampleSku = generateSku('IT Hardware');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <Hash className="w-5 h-5 text-black" />
            <h3 className="text-sm font-bold text-[#1A1A1A]">SKU Generation Rule Pattern</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Prefix Text
            </label>
            <input
              type="text"
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Delimiter Character
            </label>
            <select
              value={form.delimiter}
              onChange={(e) => setForm({ ...form, delimiter: e.target.value })}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold"
            >
              <option value="-">Hyphen (-)</option>
              <option value="_">Underscore (_)</option>
              <option value="/">Slash (/)</option>
              <option value=".">Dot (.)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <span className="text-xs font-bold text-[#1A1A1A] block">Include Category Code</span>
              <span className="text-[10px] text-gray-500">Injects 3-letter category abbreviation</span>
            </div>
            <input
              type="checkbox"
              checked={form.includeCategoryCode}
              onChange={(e) => setForm({ ...form, includeCategoryCode: e.target.checked })}
              className="rounded text-black focus:ring-black h-4 w-4"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Random Sequence Digit Padding
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={form.digitPadding}
              onChange={(e) => setForm({ ...form, digitPadding: parseInt(e.target.value) || 4 })}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-bold"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Sample Generated SKU
            </span>
            <span className="font-mono text-sm font-bold text-blue-950 block">{sampleSku}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save SKU Rules</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
