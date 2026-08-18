import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Item } from '../../types';
import {
  X,
  Edit,
  Trash2,
  Barcode,
  QrCode,
  MapPin,
  Building2,
  DollarSign,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Tag,
  ExternalLink,
  ZoomIn,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';
import { renderBarcodeToCanvas, renderQRCodeToCanvas } from '../../utils/barcodeRenderer';

interface ItemDetailInspectorDrawerProps {
  item: Item | null;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDeletePrompt: (item: Item) => void;
  onCheckInOut: (item: Item, mode: 'CHECK_OUT' | 'CHECK_IN') => void;
  onOpenLabelModal?: (item: Item) => void;
}

export const ItemDetailInspectorDrawer: React.FC<ItemDetailInspectorDrawerProps> = ({
  item,
  onClose,
  onEdit,
  onDeletePrompt,
  onCheckInOut,
  onOpenLabelModal,
}) => {
  const { hasPermission, setActiveTab } = useInventory();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  const barcodeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const qrCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    if (item) {
      if (barcodeCanvasRef.current) {
        renderBarcodeToCanvas(barcodeCanvasRef.current, item.barcode, {
          format: item.barcodeType === 'UPC' ? 'UPC' : 'CODE128',
          width: 1.8,
          height: 50,
          displayValue: true,
        });
      }
      if (qrCanvasRef.current) {
        renderQRCodeToCanvas(
          qrCanvasRef.current,
          JSON.stringify({
            sku: item.sku,
            barcode: item.barcode,
            name: item.name,
            location: item.locationName,
          }),
          { width: 140 }
        );
      }
    }
  }, [item]);

  if (!item) return null;

  const isLowStock = item.isLowStockMonitored !== false && item.quantity <= item.reorderPoint;
  const isOutOfStock = item.quantity === 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
        <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-[#E5E5E5] animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-gray-50/80 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                {item.isSetOrBundle ? 'Item Set / Bundle' : 'Inventory Asset'}
              </span>
              <span className="text-xs text-gray-500 font-mono font-bold">ID: {item.id}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-1">
            {/* Top Photo Section */}
            <div className="relative group rounded-2xl overflow-hidden border border-[#E5E5E5] shadow-sm bg-gray-100 h-56 flex items-center justify-center">
              <img
                src={item.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400'}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400';
                }}
              />
              <button
                onClick={() => setIsPhotoZoomed(true)}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/75 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition shadow-md cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>View Full Photo</span>
              </button>
              {item.isSetOrBundle && (
                <div className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                  <Layers className="w-3.5 h-3.5" />
                  <span>PACKAGED SET</span>
                </div>
              )}
            </div>

            {/* Title & Basic Identifiers */}
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                  {item.category}
                </span>
                {item.isConsumable ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <PackageCheck className="w-3 h-3 text-amber-700" />
                    Consumable (Non-Returnable)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-700" />
                    Returnable Durable Asset
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.condition === 'Good'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {item.condition}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] leading-tight">{item.name}</h2>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-[#E5E5E5]">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">
                  Current Stock
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-[#1A1A1A]">{item.quantity}</span>
                  <span className="text-xs text-gray-500 font-medium lowercase">
                    {item.unitOfMeasure || 'units'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">
                  Price (PHP)
                </span>
                <span className="text-base font-bold text-emerald-700">
                  ₱{item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">
                  {item.isSetOrBundle ? 'Package Valuation' : 'Total Valuation'}
                </span>
                <span className="text-base font-bold text-[#1A1A1A]">
                  ₱{(item.quantity * item.unitPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
                {item.isSetOrBundle && (
                  <span className="text-[9px] text-purple-700 block font-medium">
                    Excl. from total stock valuation
                  </span>
                )}
              </div>
            </div>

            {/* Consumable Info Banner */}
            {item.isConsumable ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <PackageCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Consumable Supply Notice</span>
                  <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                    This item is consumed or distributed upon checkout. It is not tracked for returns and will not appear under active personnel custody or pending return logs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Durable Equipment Tracking</span>
                  <p className="text-[11px] text-blue-800 leading-snug mt-0.5">
                    Standard check-out tracks active personnel custody and requires physical return inspection and verification.
                  </p>
                </div>
              </div>
            )}

            {/* Low Stock Status Banner */}
            {item.isLowStockMonitored !== false ? (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  isOutOfStock
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : isLowStock
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isLowStock || isOutOfStock ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {isOutOfStock
                      ? 'Out of Stock Alert'
                      : isLowStock
                      ? `Low Stock Warning (Threshold: ${item.reorderPoint})`
                      : 'Stock Level Healthy'}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Reorder: {item.reorderPoint} | Safety: {item.safetyStock}
                </span>
              </div>
            ) : (
              <div className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center justify-between">
                <span>Low Stock Monitoring: Disabled</span>
                <span className="text-[10px] font-bold uppercase text-gray-500">Unmonitored</span>
              </div>
            )}

            {/* SKU & Barcode Details Box */}
            <div className="p-4 bg-white border border-[#E5E5E5] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Master SKU Code
                </span>
                <button
                  onClick={() => copyToClipboard(item.sku, 'sku')}
                  className="flex items-center gap-1 text-xs font-mono font-bold text-black hover:underline cursor-pointer"
                >
                  <span>{item.sku}</span>
                  {copiedField === 'sku' ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Barcode Number
                </span>
                <button
                  onClick={() => copyToClipboard(item.barcode, 'barcode')}
                  className="flex items-center gap-1 text-xs font-mono font-bold text-black hover:underline cursor-pointer"
                >
                  <span>{item.barcode}</span>
                  {copiedField === 'barcode' ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>

              {item.manufacturerSerialNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Manufacturer Serial Number
                  </span>
                  <span className="text-xs font-mono font-bold text-[#1A1A1A]">
                    {item.manufacturerSerialNumber}
                  </span>
                </div>
              )}

              {/* Barcode & QR Canvases */}
              <div className="pt-3 border-t border-gray-100 space-y-2 bg-gray-50/70 p-3 rounded-xl">
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                  <div className="flex flex-col items-center">
                    <canvas ref={barcodeCanvasRef} className="h-12 max-w-[180px]" />
                    <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">1D Barcode</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <canvas ref={qrCanvasRef} className="w-16 h-16" />
                    <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">2D QR Code</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenLabelModal) {
                      onOpenLabelModal(item);
                    } else {
                      setActiveTab('labels');
                    }
                    onClose();
                  }}
                  className="w-full py-2 bg-white hover:bg-gray-100 border border-gray-200 text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Tag className="w-3.5 h-3.5 text-black" />
                  <span>Open in QR & Barcode Print Center</span>
                </button>
              </div>
            </div>

            {/* Set / Bundle Component Breakdown (If Set) */}
            {item.isSetOrBundle && item.bundleItems && item.bundleItems.length > 0 && (
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-700" />
                    Included Set Components ({item.bundleItems.length} items)
                  </span>
                </div>
                <div className="space-y-2">
                  {item.bundleItems.map((comp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white border border-purple-100 rounded-xl shadow-2xs text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            comp.imageUrl ||
                            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100'
                          }
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div>
                          <div className="font-bold text-[#1A1A1A]">{comp.itemName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded border border-purple-200">
                              SKU: {comp.sku}
                            </span>
                            {comp.barcode && (
                              <span className="text-[10px] text-gray-500 font-mono">
                                Barcode: {comp.barcode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                          Qty: {comp.quantity}
                        </span>
                        {comp.unitPrice !== undefined && (
                          <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                            ₱{comp.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Supplier */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 border border-[#E5E5E5] rounded-xl space-y-1">
                <div className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-500" />
                  Location
                </div>
                <div className="font-bold text-[#1A1A1A]">{item.locationName}</div>
              </div>
              <div className="p-3 bg-gray-50 border border-[#E5E5E5] rounded-xl space-y-1">
                <div className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-gray-500" />
                  Supplier
                </div>
                <div className="font-bold text-[#1A1A1A]">{item.vendorName}</div>
              </div>
            </div>

            {/* Description & Notes */}
            {item.description && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Description & Notes
                </span>
                <p className="text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-[#E5E5E5] leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-gray-400" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="p-4 border-t border-[#E5E5E5] bg-gray-50 flex flex-wrap items-center justify-between gap-2 sticky bottom-0 z-10">
            {hasPermission('canDeleteItems') && (
              <button
                onClick={() => onDeletePrompt(item)}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => onCheckInOut(item, 'CHECK_OUT')}
                className="px-3 py-2 bg-white border border-[#E5E5E5] text-xs font-bold rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Check-Out
              </button>
              <button
                onClick={() => onCheckInOut(item, 'CHECK_IN')}
                className="px-3 py-2 bg-white border border-[#E5E5E5] text-xs font-bold rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Check-In
              </button>
              {hasPermission('canEditItems') && (
                <button
                  onClick={() => onEdit(item)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Customize Item</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Zoom Lightbox Modal */}
      {isPhotoZoomed && (
        <div
          onClick={() => setIsPhotoZoomed(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl p-2">
            <img
              src={item.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'}
              alt={item.name}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            <div className="p-3 text-white text-center text-xs font-bold">
              {item.name} (SKU: {item.sku}) - Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};
