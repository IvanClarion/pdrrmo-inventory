import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Item, PurchaseOrder } from '../types';
import {
  Printer,
  Tag,
  QrCode,
  Barcode,
  ShoppingBag,
  AlertTriangle,
  FileCheck,
  Plus,
  CheckCircle2,
  X,
  FileText,
  Search,
  Download,
  Copy,
  Check,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  ExternalLink,
  ChevronRight,
  Package,
  Calendar,
  Building2,
  MapPin,
  DollarSign,
  History,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  renderBarcodeToCanvas,
  renderQRCodeToCanvas,
  generateQRDataUrl,
} from '../utils/barcodeRenderer';
import { BrandLogo } from './BrandLogo';

// ==========================================
// SUB-COMPONENT: Item Label Canvas Renderer
// ==========================================
interface LabelItemCanvasProps {
  item: Item;
  labelType: 'qr' | 'barcode' | 'dual';
  qrPayloadType: 'sku' | 'barcode' | 'json' | 'url';
  qrSize: 'sm' | 'md' | 'lg';
  showOrgHeader: boolean;
  showName: boolean;
  showSku: boolean;
  showLocation: boolean;
  showCategory: boolean;
  showPrice: boolean;
  showSerial: boolean;
  borderStyle: 'solid' | 'dashed' | 'none';
  orgName: string;
  preset: 'avery-5160' | 'avery-5163' | 'zebra-4x6' | 'dymo-30252' | 'mini-bin-qr' | 'card-badge';
}

const LabelItemCanvas: React.FC<LabelItemCanvasProps> = ({
  item,
  labelType,
  qrPayloadType,
  qrSize,
  showOrgHeader,
  showName,
  showSku,
  showLocation,
  showCategory,
  showPrice,
  showSerial,
  borderStyle,
  orgName,
  preset,
}) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine QR Code Payload string
  const getQrPayload = (): string => {
    switch (qrPayloadType) {
      case 'sku':
        return item.sku;
      case 'barcode':
        return item.barcode || item.sku;
      case 'json':
        return JSON.stringify({
          sku: item.sku,
          name: item.name,
          cat: item.category,
          loc: item.locationName,
          p: item.unitPrice,
          id: item.id,
        });
      case 'url':
        return `https://smartstock.internal/scan?sku=${encodeURIComponent(item.sku)}`;
      default:
        return item.sku;
    }
  };

  const qrPixelWidth = qrSize === 'sm' ? 68 : qrSize === 'lg' ? 120 : 90;

  useEffect(() => {
    if (labelType === 'qr' || labelType === 'dual') {
      if (qrCanvasRef.current) {
        renderQRCodeToCanvas(qrCanvasRef.current, getQrPayload(), {
          width: qrPixelWidth,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
      }
    }
    if (labelType === 'barcode' || labelType === 'dual') {
      if (barcodeCanvasRef.current) {
        renderBarcodeToCanvas(barcodeCanvasRef.current, item.barcode || item.sku, {
          format: item.barcodeType === 'UPC' ? 'UPC' : 'CODE128',
          height: preset === 'zebra-4x6' ? 44 : 26,
          width: 1.3,
          displayValue: false,
        });
      }
    }
  }, [item, labelType, qrPayloadType, qrSize, preset]);

  // Preset-specific layout sizing
  const getPresetContainerClasses = () => {
    switch (preset) {
      case 'avery-5160':
        return 'min-h-[105px] p-2.5';
      case 'avery-5163':
        return 'min-h-[155px] p-3.5';
      case 'zebra-4x6':
        return 'min-h-[260px] p-5';
      case 'dymo-30252':
        return 'min-h-[95px] p-2';
      case 'mini-bin-qr':
        return 'min-h-[115px] p-2';
      case 'card-badge':
        return 'min-h-[200px] p-4';
      default:
        return 'min-h-[110px] p-3';
    }
  };

  const getBorderClasses = () => {
    switch (borderStyle) {
      case 'dashed':
        return 'border border-dashed border-slate-300';
      case 'solid':
        return 'border border-slate-300 shadow-xs';
      case 'none':
        return 'border-none shadow-none';
      default:
        return 'border border-slate-200';
    }
  };

  return (
    <div
      className={`bg-white text-slate-950 rounded-lg flex flex-col justify-between overflow-hidden transition-all ${getPresetContainerClasses()} ${getBorderClasses()}`}
    >
      {/* Top Header */}
      {showOrgHeader && (
        <div className="w-full flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-1">
          <span className="truncate max-w-[130px]">{orgName || 'SMARTSTOCK INVENTORY'}</span>
          <span className="font-mono text-slate-500">{item.sku}</span>
        </div>
      )}

      {/* Item Name */}
      {showName && (
        <div className="w-full">
          <h4 className="font-bold text-[11px] leading-tight text-slate-900 line-clamp-1">
            {item.name}
          </h4>
          {showCategory && (
            <span className="inline-block text-[8px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded mt-0.5">
              {item.category}
            </span>
          )}
        </div>
      )}

      {/* Center Codes (QR, Barcode, or Dual) */}
      <div className="my-1.5 flex items-center justify-center gap-2">
        {/* QR Code Container */}
        {(labelType === 'qr' || labelType === 'dual') && (
          <div className="flex flex-col items-center justify-center shrink-0">
            <canvas
              ref={qrCanvasRef}
              className="rounded border border-slate-100 bg-white p-0.5"
            />
            {labelType === 'qr' && (
              <span className="text-[8px] font-mono font-bold text-slate-600 mt-0.5 tracking-tight">
                {item.sku}
              </span>
            )}
          </div>
        )}

        {/* 1D Barcode Container */}
        {(labelType === 'barcode' || labelType === 'dual') && (
          <div className="flex flex-col items-center justify-center overflow-hidden">
            <canvas ref={barcodeCanvasRef} className="max-w-full" />
            <span className="text-[8px] font-mono font-bold text-slate-700 mt-0.5 tracking-wider">
              {item.barcode || item.sku}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Metadata Badges */}
      <div className="w-full flex items-center justify-between text-[8px] text-slate-600 border-t border-slate-100 pt-1 mt-0.5">
        {showLocation ? (
          <span className="truncate max-w-[90px] flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            {item.locationName.split(' ')[0]}
          </span>
        ) : (
          <span />
        )}

        {showPrice && (
          <span className="font-bold text-slate-950 font-mono">
            ₱{item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        )}

        {showSerial && (
          <span className="font-mono text-[7px] text-slate-400">
            S/N: {item.manufacturerSerialNumber || 'N/A'}
          </span>
        )}
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: Dedicated PO QR Canvas
// ==========================================
interface PoQrCodeProps {
  po: PurchaseOrder;
  size?: number;
}

const PoQrCode: React.FC<PoQrCodeProps> = ({ po, size = 110 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const payload = JSON.stringify({
        type: 'PURCHASE_ORDER',
        poNumber: po.poNumber,
        vendor: po.vendorName,
        total: po.totalAmount,
        itemsCount: po.items.length,
        deliveryDate: po.expectedDeliveryDate,
        createdAt: po.createdAt,
      });
      renderQRCodeToCanvas(canvasRef.current, payload, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    }
  }, [po, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-slate-200 bg-white p-1 shadow-xs shrink-0"
    />
  );
};

// ==========================================
// SUB-COMPONENT: Inline Item QR for PO Table
// ==========================================
const PoItemInlineQr: React.FC<{ sku: string; size?: number }> = ({ sku, size = 48 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderQRCodeToCanvas(canvasRef.current, sku, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    }
  }, [sku, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded border border-slate-200 bg-white p-0.5 shrink-0"
      title={`Scan SKU: ${sku}`}
    />
  );
};

// ==========================================
// MAIN COMPONENT: LabelGeneratorModal
// ==========================================
export const LabelGeneratorModal: React.FC = () => {
  const {
    items,
    vendors,
    purchaseOrders,
    createPurchaseOrder,
    hasPermission,
    branding,
    categories,
  } = useInventory();

  const [activeSubTab, setActiveSubTab] = useState<'labels' | 'reorder' | 'archive'>('labels');

  // Label Configuration State
  const [labelType, setLabelType] = useState<'qr' | 'barcode' | 'dual'>('qr');
  const [qrPayloadType, setQrPayloadType] = useState<'sku' | 'barcode' | 'json' | 'url'>('sku');
  const [qrSize, setQrSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [labelFormat, setLabelFormat] = useState<
    'avery-5160' | 'avery-5163' | 'zebra-4x6' | 'dymo-30252' | 'mini-bin-qr' | 'card-badge'
  >('avery-5160');
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'none'>('dashed');

  // Field Toggles
  const [showOrgHeader, setShowOrgHeader] = useState<boolean>(true);
  const [showName, setShowName] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showCategory, setShowCategory] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showSerial, setShowSerial] = useState<boolean>(false);

  // Item Picker & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    items.slice(0, 4).map((i) => i.id)
  );

  // Single Item QR Modal / Download
  const [inspectQrItem, setInspectQrItem] = useState<Item | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Reorder & PO Generator State
  const lowStockItems = items.filter((i) => i.quantity <= i.reorderPoint);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
  const [poNotes, setPoNotes] = useState<string>(
    'Official emergency inventory procurement order. Fast-receiving QR Code attached for batch verification.'
  );
  const [createdPo, setCreatedPo] = useState<PurchaseOrder | null>(
    purchaseOrders.length > 0 ? purchaseOrders[0] : null
  );
  const [isPoGenerating, setIsPoGenerating] = useState<boolean>(false);

  // Filtered items for selection list
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedItems = items.filter((i) => selectedItemIds.includes(i.id));

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredItems.map((i) => i.id);
    setSelectedItemIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleSelectLowStock = () => {
    const lowStockIds = lowStockItems.map((i) => i.id);
    setSelectedItemIds(lowStockIds);
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
  };

  // 1-Click Print Label Sheet
  const handlePrintLabels = () => {
    window.print();
  };

  // 1-Click Generate PO with QR Code
  const handleGeneratePO = () => {
    setIsPoGenerating(true);
    const vendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];
    const vendorItems = lowStockItems.filter((i) => i.vendorId === vendor.id || !i.vendorId);

    const targetList = vendorItems.length > 0 ? vendorItems : lowStockItems;
    if (targetList.length === 0) {
      alert('All stock levels are currently healthy! Adding first 3 items as a replenishment batch.');
    }

    const itemsToOrder = (targetList.length > 0 ? targetList : items.slice(0, 3)).map((i) => {
      const qtyNeeded = Math.max(5, (i.reorderPoint || 10) * 2 - i.quantity);
      return {
        itemId: i.id,
        itemName: i.name,
        sku: i.sku,
        quantityRequested: qtyNeeded,
        unitCost: i.costPrice || i.unitPrice * 0.7,
      };
    });

    const total = itemsToOrder.reduce((acc, i) => acc + i.quantityRequested * i.unitCost, 0);

    const po = createPurchaseOrder({
      vendorId: vendor.id,
      vendorName: vendor.name,
      items: itemsToOrder,
      totalAmount: total,
      status: 'Approved',
      expectedDeliveryDate: new Date(Date.now() + 86400000 * (vendor.leadTimeDays || 3))
        .toISOString()
        .split('T')[0],
      createdBy: branding.orgName || 'PDRRMO Logistics Officer',
      notes: poNotes,
    });

    setCreatedPo(po);
    setIsPoGenerating(false);
  };

  // 1-Click: "Print Receiving QR Labels for this PO"
  const handleLoadPoItemsForQrPrinting = (po: PurchaseOrder) => {
    const poItemIds = po.items.map((i) => i.itemId);
    setSelectedItemIds(poItemIds);
    setLabelType('qr');
    setActiveSubTab('labels');
  };

  // Download Individual QR Code
  const handleDownloadQrPng = async (item: Item) => {
    const dataUrl = await generateQRDataUrl(item.sku, { width: 600, margin: 2 });
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${item.sku}_${item.name.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  // Copy QR Payload to Clipboard
  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Helper grid columns based on preset
  const getGridColsClasses = () => {
    switch (labelFormat) {
      case 'avery-5160':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case 'avery-5163':
        return 'grid-cols-1 sm:grid-cols-2';
      case 'zebra-4x6':
        return 'grid-cols-1 max-w-md mx-auto';
      case 'dymo-30252':
        return 'grid-cols-1 sm:grid-cols-2';
      case 'mini-bin-qr':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case 'card-badge':
        return 'grid-cols-1 sm:grid-cols-2';
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Header & Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <span>QR & Barcode Print Center</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate high-resolution 2D QR stickers, 1D barcode rolls, and official Purchase Order PDF documents with verification QR codes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('labels')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'labels'
                ? 'bg-white text-black shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Label Generator</span>
            {selectedItemIds.length > 0 && (
              <span className="px-1.5 py-0.2 bg-black text-white text-[10px] font-bold rounded-full">
                {selectedItemIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reorder')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'reorder'
                ? 'bg-white text-black shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Smart Reorder & POs</span>
            {lowStockItems.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                {lowStockItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('archive')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'archive'
                ? 'bg-white text-black shadow-xs'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>PO Archive ({purchaseOrders.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: QR & BARCODE LABEL GENERATOR */}
      {/* ======================================================== */}
      {activeSubTab === 'labels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls Configuration Sidebar (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Control Box: Code Technology & Presets */}
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-black" />
                  <span>1. Label Technology & Format</span>
                </h3>
              </div>

              {/* Code Mode Selector: QR vs Barcode vs Dual */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                  Code Symbology
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setLabelType('qr')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      labelType === 'qr'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>2D QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLabelType('barcode')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      labelType === 'barcode'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <Barcode className="w-4 h-4" />
                    <span>1D Barcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLabelType('dual')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      labelType === 'dual'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-0.5">
                      <QrCode className="w-3.5 h-3.5" />
                      <span className="text-[10px]">+</span>
                      <Barcode className="w-3.5 h-3.5" />
                    </div>
                    <span>Dual (Both)</span>
                  </button>
                </div>
              </div>

              {/* QR Payload Content Encoding */}
              {(labelType === 'qr' || labelType === 'dual') && (
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                    QR Code Payload Content
                  </label>
                  <select
                    value={qrPayloadType}
                    onChange={(e) => setQrPayloadType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E5E5E5] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="sku">Standard SKU Code (e.g. SKU-IT-0001)</option>
                    <option value="barcode">Authentic Barcode Number (UPC-A / 128)</option>
                    <option value="json">SmartStock Rich JSON (Instant Scanner Lookup)</option>
                    <option value="url">Direct Web Asset URL (https://smartstock...)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {qrPayloadType === 'json' &&
                      '✨ Encodes full metadata: SKU, name, category, location, and unit price for instant multi-field scanning.'}
                    {qrPayloadType === 'sku' &&
                      'Standard inventory identifier, compatible with both mobile cameras and hardware scanners.'}
                    {qrPayloadType === 'barcode' &&
                      'Encodes exact numeric barcode for legacy UPC verification systems.'}
                    {qrPayloadType === 'url' &&
                      'Scannable by general phone cameras to open direct asset record.'}
                  </p>
                </div>
              )}

              {/* Sheet Template Preset */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                    Sheet / Roll Preset
                  </label>
                  <select
                    value={labelFormat}
                    onChange={(e) => setLabelFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E5E5E5] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="avery-5160">Avery 5160 (30 / Sheet)</option>
                    <option value="avery-5163">Avery 5163 (10 / Sheet)</option>
                    <option value="zebra-4x6">Zebra 4" x 6" Direct</option>
                    <option value="dymo-30252">Dymo 30252 (1-1/8"x3.5")</option>
                    <option value="mini-bin-qr">Mini Bin QR Tag (1.5"x1.5")</option>
                    <option value="card-badge">Asset Card Badge (2.25"x3.5")</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                    Copies Per Item
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={copiesCount}
                      onChange={(e) => setCopiesCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-gray-50 border border-[#E5E5E5] rounded-xl text-xs font-semibold text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Label Field Customizer Toggles */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  Visible Label Elements
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOrgHeader}
                      onChange={(e) => setShowOrgHeader(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <span className="text-gray-700">Org Header</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showName}
                      onChange={(e) => setShowName(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <span className="text-gray-700">Item Name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLocation}
                      onChange={(e) => setShowLocation(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <span className="text-gray-700">Location Tag</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <span className="text-gray-700">Unit Price</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCategory}
                      onChange={(e) => setShowCategory(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <span className="text-gray-700">Category Pill</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSerial}
                      onChange={(e) => setShowSerial(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <span className="text-gray-700">Serial # / S/N</span>
                  </label>
                </div>
              </div>

              {/* Border Cut Guide & QR Size */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                    Cutting Guides
                  </label>
                  <select
                    value={borderStyle}
                    onChange={(e) => setBorderStyle(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium"
                  >
                    <option value="dashed">Dashed Cut Line</option>
                    <option value="solid">Solid Border</option>
                    <option value="none">Borderless</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                    QR Matrix Size
                  </label>
                  <select
                    value={qrSize}
                    onChange={(e) => setQrSize(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium"
                  >
                    <option value="sm">Compact (68px)</option>
                    <option value="md">Standard (90px)</option>
                    <option value="lg">Large (120px)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Control Box: Item Selection List */}
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-black" />
                  <span>2. Select Inventory Items ({selectedItemIds.length})</span>
                </h3>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    All ({filteredItems.length})
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleSelectLowStock}
                    className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                  >
                    Low Stock
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[10px] font-bold text-gray-400 hover:text-black cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SKU, name, barcode..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium max-w-[130px]"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Checklist */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-1.5 bg-gray-50 rounded-xl border border-gray-200">
                {filteredItems.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs">No items match filter</div>
                ) : (
                  filteredItems.map((item) => {
                    const isChecked = selectedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`p-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition border ${
                          isChecked
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-black pointer-events-none"
                          />
                          <div className="min-w-0">
                            <div className="font-bold truncate max-w-[170px] leading-tight">
                              {item.name}
                            </div>
                            <div
                              className={`text-[10px] font-mono ${
                                isChecked ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              {item.sku} • {item.locationName.split(' ')[0]}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectQrItem(item);
                            }}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isChecked
                                ? 'hover:bg-neutral-800 text-gray-300 hover:text-white'
                                : 'hover:bg-gray-200 text-gray-500 hover:text-black'
                            }`}
                            title="Quick QR Inspect & Download"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Primary Print Button */}
              <button
                type="button"
                onClick={handlePrintLabels}
                disabled={selectedItems.length === 0}
                className="w-full py-3.5 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-40 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  Print Sticker Sheet (
                  {selectedItems.length * copiesCount} Label
                  {selectedItems.length * copiesCount === 1 ? '' : 's'})
                </span>
              </button>
            </div>
          </div>

          {/* Right Live Sheet Preview Canvas (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Eye className="w-4 h-4 text-black" />
                    <span>Printable Sheet Layout Preview</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Target Format: <strong className="text-black">{labelFormat.toUpperCase()}</strong> • Mode: <strong className="text-black">{labelType.toUpperCase()}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                    {selectedItems.length * copiesCount} total stickers
                  </span>
                  <button
                    type="button"
                    onClick={handlePrintLabels}
                    className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* The Actual Sheet Grid (Matches printable CSS) */}
              <div
                id="printable-labels-area"
                className="bg-gray-50 border border-gray-200 rounded-2xl p-5 min-h-[500px] max-h-[75vh] overflow-y-auto printable-labels-sheet"
              >
                {selectedItems.length === 0 ? (
                  <div className="py-24 text-center text-gray-400 space-y-3">
                    <Tag className="w-12 h-12 mx-auto text-gray-300 stroke-1" />
                    <div className="text-sm font-bold text-gray-600">No items selected</div>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Check items from the list on the left to instantly generate real-time printable QR Code and Barcode stickers.
                    </p>
                  </div>
                ) : (
                  <div className={`grid gap-3.5 ${getGridColsClasses()}`}>
                    {selectedItems.map((item) =>
                      Array.from({ length: copiesCount }).map((_, idx) => (
                        <LabelItemCanvas
                          key={`${item.id}-${idx}`}
                          item={item}
                          labelType={labelType}
                          qrPayloadType={qrPayloadType}
                          qrSize={qrSize}
                          showOrgHeader={showOrgHeader}
                          showName={showName}
                          showSku={showSku}
                          showLocation={showLocation}
                          showCategory={showCategory}
                          showPrice={showPrice}
                          showSerial={showSerial}
                          borderStyle={borderStyle}
                          orgName={branding.orgName}
                          preset={labelFormat}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Printing Tips Guide */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-black shrink-0 mt-0.5" />
                <div>
                  <strong className="text-black font-bold">Printer Setup Tip: </strong>
                  When the system print dialog opens, set <strong>Margins</strong> to <em>"None"</em> or <em>"Minimum"</em> and ensure <strong>Scale</strong> is set to <em>"100%"</em> to align with pre-cut Avery or thermal label rolls.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: SMART REORDER & PURCHASE ORDER GENERATOR */}
      {/* ======================================================== */}
      {activeSubTab === 'reorder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls & Low Stock Items (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Low Stock Trigger Items ({lowStockItems.length})</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Replenishment Trigger
                </span>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All inventory stock counts are safely above minimum thresholds!</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-[#1A1A1A]">{item.name}</div>
                          <div className="text-[10px] font-mono text-gray-500">
                            {item.sku} • {item.category}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                          {item.quantity} on hand
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-200/60 pt-1">
                        <span>Reorder Level: {item.reorderPoint}</span>
                        <span>Supplier: {item.vendorName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PO Target Supplier & Settings */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Select Target Vendor / Supplier *
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E5E5E5] rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (Lead Time: {v.leadTimeDays || 3} days)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    PO Order Notes & Receiving Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-[#E5E5E5] rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePO}
                  disabled={!hasPermission('canGeneratePOs') || isPoGenerating}
                  className="w-full py-3.5 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-40 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>1-Click Generate PO Document with QR Code</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Printable PO Preview with High-Res QR Code (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-black" />
                  <span>Purchase Order Preview (Printable PDF Document)</span>
                </h3>

                {createdPo && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadPoItemsForQrPrinting(createdPo)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Generate item sticker labels matching this PO"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Print Receiving QR Labels</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print PO</span>
                    </button>
                  </div>
                )}
              </div>

              {createdPo ? (
                <div
                  id="printable-po-document"
                  className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs font-sans printable-po"
                >
                  {/* PO Document Header */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BrandLogo branding={branding} size="sm" />
                        <h2 className="text-base font-black text-slate-900 tracking-tight">
                          {branding.orgName || 'SMARTSTOCK LOGISTICS'}
                        </h2>
                      </div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        OFFICIAL PURCHASE & REPLENISHMENT ORDER
                      </p>
                      <div className="text-xs font-mono font-bold text-blue-700">
                        {createdPo.poNumber}
                      </div>
                    </div>

                    {/* PO Verification QR Code Container */}
                    <div className="flex flex-col items-center p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <PoQrCode po={createdPo} size={90} />
                      <span className="text-[8px] font-mono font-bold text-slate-600 mt-1">
                        SCAN TO VERIFY PO
                      </span>
                    </div>
                  </div>

                  {/* PO Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">
                        Vendor Partner
                      </span>
                      <span className="font-bold text-slate-900">{createdPo.vendorName}</span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">
                        Order Issue Date
                      </span>
                      <span className="font-semibold text-slate-800">{createdPo.createdAt}</span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">
                        Expected Delivery
                      </span>
                      <span className="font-semibold text-slate-800">
                        {createdPo.expectedDeliveryDate}
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table with QR Code Column */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 bg-slate-50/50">
                          <th className="py-2.5 px-2">Item QR</th>
                          <th className="py-2.5 px-2">Item Description</th>
                          <th className="py-2.5 px-2">SKU</th>
                          <th className="py-2.5 px-2 text-right">Quantity</th>
                          <th className="py-2.5 px-2 text-right">Unit Cost</th>
                          <th className="py-2.5 px-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createdPo.items.map((poItem) => (
                          <tr key={poItem.itemId} className="border-b border-slate-100 text-xs">
                            <td className="py-2 px-2">
                              <PoItemInlineQr sku={poItem.sku} size={36} />
                            </td>
                            <td className="py-2 px-2 font-bold text-slate-900">{poItem.itemName}</td>
                            <td className="py-2 px-2 font-mono text-[10px] text-slate-600">
                              {poItem.sku}
                            </td>
                            <td className="py-2 px-2 text-right font-black text-slate-900">
                              {poItem.quantityRequested}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-700">
                              ₱{poItem.unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900">
                              ₱
                              {(poItem.quantityRequested * poItem.unitCost).toLocaleString(
                                'en-PH',
                                { minimumFractionDigits: 2 }
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <div className="text-right space-y-0.5">
                      <span className="text-xs text-slate-500 font-semibold">
                        Total Order Valuation:
                      </span>
                      <div className="text-2xl font-black text-slate-950">
                        ₱
                        {createdPo.totalAmount.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Notes & Receiving Fast-Scan Notice */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                    <QrCode className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-950 font-bold">Fast Receiving Notice: </strong>
                      Receiving warehouse personnel can scan the PO QR header with the SmartStock Scanner View to fast-verify line counts and log incoming receipts automatically.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-gray-400 space-y-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 stroke-1" />
                  <div className="text-sm font-bold text-gray-600">No PO Generated Yet</div>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Select a supplier on the left and click "Generate PO Document with QR Code" to preview the official requisition order.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: PURCHASE ORDERS ARCHIVE & QR LOG */}
      {/* ======================================================== */}
      {activeSubTab === 'archive' && (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1A1A1A]">Purchase Orders History Archive</h3>
              <p className="text-xs text-gray-500">
                View, reprint, or generate sticker QR rolls for all historical purchase requisitions.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-gray-100 text-xs font-bold text-gray-800">
              {purchaseOrders.length} Requisitions
            </span>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-gray-300" />
              <div className="text-xs font-bold text-gray-600">No past POs logged</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-700 block">
                        {po.poNumber}
                      </span>
                      <h4 className="font-bold text-xs text-[#1A1A1A] mt-0.5">{po.vendorName}</h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        po.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.status === 'Received'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <PoQrCode po={po} size={64} />
                    <div className="text-[11px] space-y-1 text-gray-600">
                      <div>
                        Date: <strong className="text-black">{po.createdAt}</strong>
                      </div>
                      <div>
                        Items: <strong className="text-black">{po.items.length} lines</strong>
                      </div>
                      <div className="text-xs font-black text-black">
                        ₱{po.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedPo(po);
                        setActiveSubTab('reorder');
                      }}
                      className="flex-1 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View PO</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadPoItemsForQrPrinting(po)}
                      className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Print Item QR Labels for this PO"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Labels</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Single Item QR Quick Inspect & Download */}
      {/* ======================================================== */}
      {inspectQrItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-black" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">Asset QR Code</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectQrItem(null)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-3">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 inline-block">
                <canvas
                  ref={(canvas) => {
                    if (canvas) {
                      renderQRCodeToCanvas(canvas, inspectQrItem.sku, {
                        width: 180,
                        margin: 1,
                        errorCorrectionLevel: 'H',
                      });
                    }
                  }}
                />
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#1A1A1A]">{inspectQrItem.name}</h4>
                <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">
                  SKU: {inspectQrItem.sku}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Location: {inspectQrItem.locationName} • Category: {inspectQrItem.category}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDownloadQrPng(inspectQrItem)}
                className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download High-Res PNG (600x600)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyPayload(inspectQrItem.sku)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied SKU to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SKU Payload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
