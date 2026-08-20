import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Item, ItemCondition, Location, LocationType, Vendor } from '../../types';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Barcode,
  QrCode,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  MapPin,
  Building2,
  Edit3,
  Settings2,
  Check,
  Search,
  Phone,
  Mail,
  Truck,
  Warehouse,
  ExternalLink,
  ChevronRight,
  Info,
  ShieldCheck,
  PackageCheck,
  Flame,
  Droplets,
  Boxes,
  RotateCcw,
  Calendar,
  CalendarClock,
  Clock,
  AlertOctagon,
  Timer,
} from 'lucide-react';
import { renderBarcodeToCanvas, renderQRCodeToCanvas, generateValidUPC, formatAsValidUPC } from '../../utils/barcodeRenderer';
import { uploadItemImageToSupabase } from '../../lib/supabase';
import { evaluateItemExpiry, getFutureDatePreset } from '../../utils/expiryUtils';

const PRESET_PHOTOS = [
  { label: 'Laptop', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80' },
  { label: 'Barcode Scanner', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80' },
  { label: 'Generator', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80' },
  { label: 'AED Medical', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80' },
  { label: 'Diagnostic Tool', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80' },
  { label: 'Respirator PPE', url: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=400&auto=format&fit=crop&q=80' },
  { label: 'Power Drill', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&auto=format&fit=crop&q=80' },
  { label: 'Safety Helmet', url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400&auto=format&fit=crop&q=80' },
];

const generatePieceSkuString = (baseSku: string, unitIndex: number, format: string = '-01') => {
  const cleanBase = baseSku.trim() || 'SKU';
  const num2 = String(unitIndex).padStart(2, '0');
  const num3 = String(unitIndex).padStart(3, '0');
  const alpha = String.fromCharCode(64 + (((unitIndex - 1) % 26) + 1));
  if (format === '-P01') return `${cleanBase}-P${num2}`;
  if (format === '-001') return `${cleanBase}-${num3}`;
  if (format === '-1') return `${cleanBase}-${unitIndex}`;
  if (format === 'ALPHA') return `${cleanBase}-${alpha}`;
  return `${cleanBase}-${num2}`;
};

const generatePieceBarcodeString = (baseBarcode: string, unitIndex: number) => {
  const cleanBarcode = (baseBarcode || '').trim();
  if (!cleanBarcode) return generateValidUPC();
  const digitsOnly = cleanBarcode.replace(/\D/g, '');
  if (digitsOnly.length >= 8) {
    const prefix8 = digitsOnly.slice(0, 8).padEnd(8, '0');
    const unit3 = String(unitIndex).padStart(3, '0');
    return formatAsValidUPC(`${prefix8}${unit3}`);
  }
  const num3 = String(unitIndex).padStart(3, '0');
  return `${cleanBarcode}-${num3}`;
};

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: Item | null;
  onOpenCategoryManager?: () => void;
  onDeleteItemPrompt?: (item: Item) => void;
}

export const AddEditItemModal: React.FC<AddEditItemModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  onOpenCategoryManager,
  onDeleteItemPrompt,
}) => {
  const {
    locations,
    vendors,
    categories,
    addItem,
    addItems,
    editItem,
    generateSku,
    addCategory,
    addLocation,
    editLocation,
    deleteLocation,
    addVendor,
    editVendor,
    deleteVendor,
    hasPermission,
    currentRole,
  } = useInventory();

  const isAdmin = hasPermission('canManageRoles') || currentRole.name === 'Admin' || currentRole.id === 'role-admin' || hasPermission('canEditItems');

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeType, setBarcodeType] = useState<'UPC' | 'EAN13' | 'CODE128' | 'QR'>('UPC');
  const [category, setCategory] = useState(categories[0] || 'IT Hardware');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [unitOfMeasure, setUnitOfMeasure] = useState('units');
  const [isConsumable, setIsConsumable] = useState(false);
  const [unitPrice, setUnitPrice] = useState(0); // in PHP ₱
  const [costPrice, setCostPrice] = useState(0); // in PHP ₱
  const [description, setDescription] = useState('');
  const [manufacturerSerialNumber, setManufacturerSerialNumber] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Good');
  const [tags, setTags] = useState('Stock, Equipment');
  const [imageUrl, setImageUrl] = useState(PRESET_PHOTOS[0].url);

  // Expiration & Batch/Lot Tracking states
  const [hasExpiry, setHasExpiry] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [expirationTime, setExpirationTime] = useState<string>('23:59');
  const [batchLotNumber, setBatchLotNumber] = useState<string>('');

  // Location Customization States
  const [isAddingLocationInline, setIsAddingLocationInline] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState<{
    name: string;
    code: string;
    type: LocationType;
    capacity: number;
  }>({
    name: '',
    code: '',
    type: 'Warehouse',
    capacity: 1000,
  });

  const [isEditingLocationInline, setIsEditingLocationInline] = useState(false);
  const [editingLocationForm, setEditingLocationForm] = useState<{
    id: string;
    name: string;
    code: string;
    type: LocationType;
    capacity: number;
  }>({
    id: '',
    name: '',
    code: '',
    type: 'Warehouse',
    capacity: 1000,
  });

  const [isManageLocationsModalOpen, setIsManageLocationsModalOpen] = useState(false);
  const [locationSearchTerm, setLocationSearchTerm] = useState('');

  // Supplier / Vendor Customization States
  const [isAddingVendorInline, setIsAddingVendorInline] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState<{
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    leadTimeDays: number;
  }>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    leadTimeDays: 3,
  });

  const [isEditingVendorInline, setIsEditingVendorInline] = useState(false);
  const [editingVendorForm, setEditingVendorForm] = useState<{
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    leadTimeDays: number;
  }>({
    id: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    leadTimeDays: 3,
  });

  const [isManageVendorsModalOpen, setIsManageVendorsModalOpen] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');

  // Confirmation state for deleting locations and vendors
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);

  // Low Stock Monitoring toggle
  const [isLowStockMonitored, setIsLowStockMonitored] = useState(true);
  const [reorderPoint, setReorderPoint] = useState(3);
  const [safetyStock, setSafetyStock] = useState(1);

  // Multi-Item discrete creation options (When quantity > 1)
  const [createAsDiscreteItems, setCreateAsDiscreteItems] = useState(true);
  const [skuNumberingFormat, setSkuNumberingFormat] = useState<'-01' | '-P01' | '-001' | '-1' | 'ALPHA'>('-01');

  // Photo mode
  const [photoMode, setPhotoMode] = useState<'PRESET' | 'URL' | 'FILE'>('PRESET');

  // Quick Inline Category Add
  const [isAddingNewCategoryInline, setIsAddingNewCategoryInline] = useState(false);
  const [inlineNewCategoryName, setInlineNewCategoryName] = useState('');

  // Live Barcode Preview Ref
  const barcodeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const qrCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Reset or Populate form on open/edit
  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      setName(editingItem.name);
      setSku(editingItem.sku);
      setBarcode(editingItem.barcode);
      setBarcodeType(editingItem.barcodeType as any);
      setCategory(editingItem.category || categories[0] || 'IT Hardware');
      setLocationId(editingItem.locationId || locations[0]?.id || '');
      setVendorId(editingItem.vendorId || vendors[0]?.id || '');
      setQuantity(editingItem.quantity);
      setUnitOfMeasure(editingItem.unitOfMeasure || 'units');
      const isCons = editingItem.type?.toLowerCase() === 'consumable' || !!editingItem.isConsumable;
      setIsConsumable(isCons);
      const expDate = editingItem.expirationDate || editingItem.expiryDate || '';
      const cleanExpDate = expDate.includes('T') ? expDate.split('T')[0] : expDate;
      setExpirationDate(cleanExpDate);
      setExpirationTime(editingItem.expirationTime || '23:59');
      setBatchLotNumber(editingItem.batchLotNumber || '');
      setHasExpiry(Boolean(cleanExpDate || editingItem.batchLotNumber || isCons));
      setUnitPrice(editingItem.unitPrice);
      setCostPrice(editingItem.costPrice);
      setDescription(editingItem.description || '');
      setManufacturerSerialNumber(editingItem.manufacturerSerialNumber || '');
      setCondition(editingItem.condition || 'Good');
      setTags(editingItem.tags?.join(', ') || '');
      setImageUrl(editingItem.imageUrl || PRESET_PHOTOS[0].url);
      setIsLowStockMonitored(editingItem.isLowStockMonitored !== false);
      setReorderPoint(editingItem.reorderPoint || 0);
      setSafetyStock(editingItem.safetyStock || 0);
      setCreateAsDiscreteItems(false);
    } else {
      const initialCat = categories[0] || 'IT Hardware';
      const initialSku = generateSku(initialCat);
      const initialBarcode = generateValidUPC();
      setName('');
      setSku(initialSku);
      setBarcode(initialBarcode);
      setBarcodeType('UPC');
      setCategory(initialCat);
      setLocationId(locations[0]?.id || '');
      setVendorId(vendors[0]?.id || '');
      setQuantity(1);
      setUnitOfMeasure('units');
      setIsConsumable(false);
      setExpirationDate('');
      setExpirationTime('23:59');
      setBatchLotNumber('');
      setHasExpiry(false);
      setUnitPrice(0);
      setCostPrice(0);
      setDescription('');
      setManufacturerSerialNumber('');
      setCondition('Good');
      setTags('Stock, Equipment');
      setImageUrl(PRESET_PHOTOS[0].url);
      setIsLowStockMonitored(true);
      setReorderPoint(3);
      setSafetyStock(1);
      setCreateAsDiscreteItems(true);
    }
  }, [isOpen, editingItem]);

  // Live render Barcode and QR previews
  useEffect(() => {
    if (barcodeCanvasRef.current && barcode) {
      renderBarcodeToCanvas(barcodeCanvasRef.current, barcode, {
        format: barcodeType === 'UPC' ? 'UPC' : 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
      });
    }
    if (qrCanvasRef.current && (sku || barcode)) {
      renderQRCodeToCanvas(qrCanvasRef.current, JSON.stringify({ sku, barcode, name }), {
        width: 80,
      });
    }
  }, [barcode, sku, name, barcodeType]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setImageUrl(uploadEvent.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage 'item_image' bucket
    try {
      const publicUrl = await uploadItemImageToSupabase(file, name || sku || 'item');
      if (publicUrl) {
        setImageUrl(publicUrl);
      }
    } catch (uploadErr) {
      console.warn('Direct Supabase item_image bucket upload notice (fallback to preview):', uploadErr);
    }
  };

  const handleCreateInlineCategory = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inlineNewCategoryName.trim()) {
      addCategory(inlineNewCategoryName.trim());
      setCategory(inlineNewCategoryName.trim());
      setInlineNewCategoryName('');
      setIsAddingNewCategoryInline(false);
    }
  };

  // Location Handlers
  const handleSaveNewLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newLocationForm.name.trim()) {
      alert('Please enter a location name.');
      return;
    }
    const code = newLocationForm.code.trim() || `LOC-${Math.floor(100 + Math.random() * 900)}`;
    const created = addLocation({
      name: newLocationForm.name.trim(),
      code: code.toUpperCase(),
      type: newLocationForm.type,
      capacity: newLocationForm.capacity || 1000,
    });
    setLocationId(created.id);
    setNewLocationForm({
      name: '',
      code: '',
      type: 'Warehouse',
      capacity: 1000,
    });
    setIsAddingLocationInline(false);
  };

  const handleUpdateLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editingLocationForm.name.trim()) {
      alert('Please enter a location name.');
      return;
    }
    editLocation(editingLocationForm.id, {
      name: editingLocationForm.name.trim(),
      code: (editingLocationForm.code.trim() || 'LOC').toUpperCase(),
      type: editingLocationForm.type,
      capacity: editingLocationForm.capacity || 1000,
    });
    setIsEditingLocationInline(false);
  };

  // Vendor / Supplier Handlers
  const handleSaveNewVendor = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newVendorForm.name.trim()) {
      alert('Please enter a supplier or vendor company name.');
      return;
    }
    const created = addVendor({
      name: newVendorForm.name.trim(),
      contactPerson: newVendorForm.contactPerson.trim() || 'Sales Representative',
      email: newVendorForm.email.trim() || 'contact@supplier.com',
      phone: newVendorForm.phone.trim() || '+63 900 000 0000',
      leadTimeDays: Math.max(1, newVendorForm.leadTimeDays || 3),
    });
    setVendorId(created.id);
    setNewVendorForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      leadTimeDays: 3,
    });
    setIsAddingVendorInline(false);
  };

  const handleUpdateVendor = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editingVendorForm.name.trim()) {
      alert('Please enter a supplier or vendor company name.');
      return;
    }
    editVendor(editingVendorForm.id, {
      name: editingVendorForm.name.trim(),
      contactPerson: editingVendorForm.contactPerson.trim() || 'Sales Representative',
      email: editingVendorForm.email.trim(),
      phone: editingVendorForm.phone.trim(),
      leadTimeDays: Math.max(1, editingVendorForm.leadTimeDays || 3),
    });
    setIsEditingVendorInline(false);
  };

  const handleDeleteLocation = (id: string) => {
    deleteLocation(id);
    if (locationId === id) {
      const remaining = locations.filter((l) => l.id !== id);
      if (remaining.length > 0) {
        setLocationId(remaining[0].id);
      }
    }
    setDeletingLocationId(null);
    if (editingLocationForm.id === id) {
      setIsEditingLocationInline(false);
    }
  };

  const handleDeleteVendor = (id: string) => {
    deleteVendor(id);
    if (vendorId === id) {
      const remaining = vendors.filter((v) => v.id !== id);
      if (remaining.length > 0) {
        setVendorId(remaining[0].id);
      }
    }
    setDeletingVendorId(null);
    if (editingVendorForm.id === id) {
      setIsEditingVendorInline(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter an item name.');
      return;
    }
    if (!sku.trim()) {
      alert('Please enter or generate a SKU code.');
      return;
    }

    const selectedLoc = locations.find((l) => l.id === locationId);
    const selectedVendor = vendors.find((v) => v.id === vendorId);
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const basePayload = {
      name: name.trim(),
      category: category,
      description: description.trim(),
      unitPrice: Math.max(0, unitPrice),
      costPrice: Math.max(0, costPrice),
      locationId: locationId,
      locationName: selectedLoc?.name || 'Main Distribution Center',
      vendorId: vendorId,
      vendorName: selectedVendor?.name || 'Authorized Supplier',
      condition: condition,
      tags: parsedTags,
      imageUrl: imageUrl,
      isLowStockMonitored: isLowStockMonitored,
      reorderPoint: isLowStockMonitored ? Math.max(0, reorderPoint) : 0,
      safetyStock: isLowStockMonitored ? Math.max(0, safetyStock) : 0,
      barcodeType: barcodeType,
      type: (isConsumable ? 'consumable' : 'returnable') as 'returnable' | 'consumable',
      isConsumable: isConsumable,
      unitOfMeasure: unitOfMeasure.trim() || (isConsumable ? 'pcs' : 'units'),
      expirationDate: hasExpiry && expirationDate.trim() ? expirationDate.trim() : undefined,
      expiryDate: hasExpiry && expirationDate.trim() ? expirationDate.trim() : undefined,
      expirationTime: hasExpiry && expirationDate.trim() && expirationTime.trim() ? expirationTime.trim() : undefined,
      batchLotNumber: hasExpiry && batchLotNumber.trim() ? batchLotNumber.trim() : undefined,
    };

    if (editingItem) {
      // Editing existing item
      editItem(editingItem.id, {
        ...basePayload,
        sku: sku.trim(),
        barcode: barcode.trim(),
        quantity: Math.max(0, quantity),
        manufacturerSerialNumber: manufacturerSerialNumber.trim() || undefined,
      });
    } else {
      // Adding new item(s)
      if (!isConsumable && quantity > 1 && createAsDiscreteItems) {
        // Returnable asset: User requested distinct serialized items for each unit quantity
        const discreteItems = Array.from({ length: quantity }, (_, idx) => {
          const unitIdx = idx + 1;
          const pieceSku = generatePieceSkuString(sku, unitIdx, skuNumberingFormat);
          const pieceBarcode = generatePieceBarcodeString(barcode, unitIdx);
          const pieceSerial = manufacturerSerialNumber
            ? `${manufacturerSerialNumber.trim()}-${String(unitIdx).padStart(2, '0')}`
            : undefined;

          return {
            ...basePayload,
            sku: pieceSku,
            barcode: pieceBarcode,
            quantity: 1,
            manufacturerSerialNumber: pieceSerial,
            pieceSkus: [pieceSku],
          };
        });

        addItems(discreteItems);
      } else {
        // Consumable supply or bulk non-discrete asset: Single inventory record with total bulk quantity
        addItem({
          ...basePayload,
          sku: sku.trim(),
          barcode: barcode.trim(),
          quantity: Math.max(1, quantity),
          manufacturerSerialNumber: manufacturerSerialNumber.trim() || undefined,
          pieceSkus: [sku.trim()],
        });
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  const selectedLoc = locations.find((l) => l.id === locationId) || locations[0];
  const selectedVendor = vendors.find((v) => v.id === vendorId) || vendors[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-3xl my-4 sm:my-8 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E5E5] bg-gray-50/70">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-xs shrink-0">
              {editingItem ? '✎' : '+'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-[#1A1A1A] truncate">
                {editingItem ? `Edit Item: ${editingItem.name}` : 'Add New Inventory Item'}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 font-normal truncate">
                {editingItem
                  ? 'Customize stock details, photo, price, barcodes, and thresholds'
                  : 'Register items with dedicated SKU, scannable Barcode, and high-res photo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Top Section: Photo Selector & Live Barcode Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 p-3 sm:p-4 bg-gray-50/60 rounded-2xl border border-[#E5E5E5]">
            {/* Photo Preview & Controls */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-gray-200">
                <img
                  src={imageUrl}
                  alt="Item Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_PHOTOS[0].url;
                  }}
                />
                <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Photo
                </div>
              </div>

              {/* Photo Mode Switcher */}
              <div className="flex rounded-lg bg-gray-200 p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPhotoMode('PRESET')}
                  className={`px-2 py-1 rounded-md transition ${
                    photoMode === 'PRESET' ? 'bg-white text-black shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode('FILE')}
                  className={`px-2 py-1 rounded-md transition ${
                    photoMode === 'FILE' ? 'bg-white text-black shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode('URL')}
                  className={`px-2 py-1 rounded-md transition ${
                    photoMode === 'URL' ? 'bg-white text-black shadow-xs' : 'text-gray-600'
                  }`}
                >
                  URL
                </button>
              </div>
            </div>

            {/* Photo Selection Content */}
            <div className="md:col-span-2 space-y-3">
              {photoMode === 'PRESET' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Choose from Preset Equipment Photos
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_PHOTOS.map((photo) => (
                      <button
                        key={photo.label}
                        type="button"
                        onClick={() => setImageUrl(photo.url)}
                        className={`p-1 rounded-xl border-2 transition flex flex-col items-center gap-1 group cursor-pointer ${
                          imageUrl === photo.url
                            ? 'border-black bg-black/5 shadow-xs'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="text-[9px] font-medium text-gray-600 truncate w-full text-center">
                          {photo.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {photoMode === 'FILE' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Upload Photo or Take Picture
                  </label>
                  <label className="border-2 border-dashed border-gray-300 hover:border-black rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white transition text-center">
                    <Camera className="w-6 h-6 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-700">
                      Click to upload an image from file or camera
                    </span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, WebP supported</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {photoMode === 'URL' && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Custom Image Web URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/item-photo.jpg"
                    className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-[10px] text-gray-400">
                    Paste any public image link or CDN address
                  </p>
                </div>
              )}

              {/* Scannable Barcode & QR code Live Canvas Preview */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                <div className="bg-white p-2 rounded-xl border border-[#E5E5E5] flex flex-col items-center">
                  <canvas ref={barcodeCanvasRef} className="h-9 max-w-[140px]" />
                </div>
                <div className="bg-white p-1 rounded-xl border border-[#E5E5E5] flex flex-col items-center">
                  <canvas ref={qrCanvasRef} className="w-12 h-12" />
                </div>
                <div className="text-[10px] text-gray-500">
                  <span className="font-bold text-gray-700 block">Auto-Generated Visuals</span>
                  Ready for scanning & label printing
                </div>
              </div>
            </div>
          </div>

          {/* Primary Item Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Classification: Returnable Durable Asset vs Consumable Supply */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Item Classification & Return Obligation *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsConsumable(false);
                    setCreateAsDiscreteItems(true);
                    if (unitOfMeasure === 'pcs') setUnitOfMeasure('units');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                    !isConsumable
                      ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/20'
                      : 'bg-[#F9F9F9] border-[#E5E5E5] hover:bg-gray-100/70 text-gray-600'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      !isConsumable ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${!isConsumable ? 'text-blue-950' : 'text-gray-800'}`}>
                        Returnable Durable Asset
                      </span>
                      {!isConsumable && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                          Active Loan
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                      Equipment & tools checked out on loan (e.g. radios, generators, chainsaws). Expected to be returned upon mission completion.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsConsumable(true);
                    setCreateAsDiscreteItems(false);
                    if (unitOfMeasure === 'units') setUnitOfMeasure('pcs');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                    isConsumable
                      ? 'bg-amber-50/90 border-amber-600 ring-2 ring-amber-500/20'
                      : 'bg-[#F9F9F9] border-[#E5E5E5] hover:bg-gray-100/70 text-gray-600'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isConsumable ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isConsumable ? 'text-amber-950' : 'text-gray-800'}`}>
                        Consumable Supply (Non-Returnable)
                      </span>
                      {isConsumable && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                          No Return
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                      Disaster relief goods, medical bandages, food rations, N95 masks, fuel, water tablets. Consumed upon issue; no return required.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Item Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isConsumable ? "e.g. Sterile Compression Trauma Bandages (Box of 50)" : "e.g. Lenovo ThinkPad T14 Gen 3 / Icom VHF Handheld Radio"}
                className="w-full px-3.5 py-2.5 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-sm font-bold text-[#1A1A1A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* SKU Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={() => setSku(generateSku(category))}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate New
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-IT-1004"
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-mono font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Barcode Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Barcode Number *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setBarcode(Math.floor(100000000000 + Math.random() * 900000000000).toString())
                  }
                  className="text-[10px] font-bold text-gray-600 hover:text-black flex items-center gap-1 cursor-pointer"
                >
                  Randomize
                </button>
              </div>
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="123456789012"
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-mono font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Category with Inline Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategoryInline(!isAddingNewCategoryInline)}
                  className="text-[10px] font-bold text-black hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  New Category
                </button>
              </div>

              {isAddingNewCategoryInline ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inlineNewCategoryName}
                    onChange={(e) => setInlineNewCategoryName(e.target.value)}
                    placeholder="Category name..."
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleCreateInlineCategory}
                    className="px-2.5 py-1.5 bg-black text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategoryInline(false)}
                    className="px-2 text-gray-400 hover:text-black text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Location with Customization */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Location *</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingLocationInline(!isAddingLocationInline);
                      setIsEditingLocationInline(false);
                    }}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition cursor-pointer"
                    title="Add a new storage location"
                  >
                    <Plus className="w-3 h-3" />
                    {isAddingLocationInline ? 'Cancel' : 'New'}
                  </button>
                  {selectedLoc && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLocationForm({
                          id: selectedLoc.id,
                          name: selectedLoc.name,
                          code: selectedLoc.code,
                          type: selectedLoc.type || 'Warehouse',
                          capacity: selectedLoc.capacity || 1000,
                        });
                        setIsEditingLocationInline(!isEditingLocationInline);
                        setIsAddingLocationInline(false);
                      }}
                      className="text-[10px] font-bold text-gray-700 hover:text-black flex items-center gap-0.5 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg border border-gray-200 transition cursor-pointer"
                      title="Edit currently selected location"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsManageLocationsModalOpen(true)}
                    className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-gray-100 transition cursor-pointer"
                    title="Manage all storage facilities and bins"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Location Form */}
              {isAddingLocationInline && (
                <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                    <span>Add New Storage Facility / Location</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingLocationInline(false)}
                      className="text-gray-400 hover:text-black cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newLocationForm.name}
                      onChange={(e) => setNewLocationForm({ ...newLocationForm, name: e.target.value })}
                      placeholder="Location Name (e.g. Bin B-04 / South Warehouse)"
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newLocationForm.code}
                      onChange={(e) => setNewLocationForm({ ...newLocationForm, code: e.target.value })}
                      placeholder="Code (e.g. BIN-B4)"
                      className="px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold"
                    />
                    <select
                      value={newLocationForm.type}
                      onChange={(e) => setNewLocationForm({ ...newLocationForm, type: e.target.value as LocationType })}
                      className="px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <option value="Warehouse">Warehouse</option>
                      <option value="Aisle">Aisle</option>
                      <option value="Bin">Bin</option>
                      <option value="Department">Department</option>
                      <option value="Vehicle">Vehicle</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-indigo-700 font-medium">Capacity: 1,000 units</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingLocationInline(false)}
                        className="px-2 py-1 text-gray-500 hover:text-black text-[11px] font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewLocation}
                        className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Save & Select
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Inline Edit Location Form */}
              {isEditingLocationInline && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                    <span>Customize Location: {editingLocationForm.name}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingLocationInline(false)}
                      className="text-gray-400 hover:text-black cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={editingLocationForm.name}
                      onChange={(e) => setEditingLocationForm({ ...editingLocationForm, name: e.target.value })}
                      placeholder="Location Name"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editingLocationForm.code}
                      onChange={(e) => setEditingLocationForm({ ...editingLocationForm, code: e.target.value })}
                      placeholder="Code"
                      className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                    />
                    <select
                      value={editingLocationForm.type}
                      onChange={(e) => setEditingLocationForm({ ...editingLocationForm, type: e.target.value as LocationType })}
                      className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <option value="Warehouse">Warehouse</option>
                      <option value="Aisle">Aisle</option>
                      <option value="Bin">Bin</option>
                      <option value="Department">Department</option>
                      <option value="Vehicle">Vehicle</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {locations.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(editingLocationForm.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-lg border border-red-200 transition cursor-pointer flex items-center gap-1"
                        title="Delete this location"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    ) : <span />}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingLocationInline(false)}
                        className="px-2 py-1 text-gray-500 hover:text-black text-[11px] font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateLocation}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Select */}
              {!isAddingLocationInline && !isEditingLocationInline && (
                <div>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code}) • {loc.type || 'Warehouse'}
                      </option>
                    ))}
                  </select>
                  {selectedLoc && (
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 px-1">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-gray-700 truncate max-w-[130px]">{selectedLoc.name}</span>
                        <span className="px-1 py-0.2 bg-gray-100 border border-gray-200 rounded text-[9px] font-mono">
                          {selectedLoc.code}
                        </span>
                      </span>
                      <span className="text-[9px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                        {selectedLoc.type || 'Warehouse'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity and Unit of Measure */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Unit of Measure
                </label>
                <input
                  type="text"
                  list="unitOfMeasureOptions"
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  placeholder="units / boxes / packs"
                  className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
                <datalist id="unitOfMeasureOptions">
                  <option value="units" />
                  <option value="pcs" />
                  <option value="boxes" />
                  <option value="packs" />
                  <option value="tubs" />
                  <option value="bottles" />
                  <option value="rolls" />
                  <option value="liters" />
                  <option value="kits" />
                  <option value="sets" />
                </datalist>
              </div>
            </div>

            {/* Price in PHP Currency */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Price in PHP (₱ Currency) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Cost Price in PHP Currency */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Unit Cost in PHP (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Supplier / Vendor with Customization */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Supplier / Vendor *</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingVendorInline(!isAddingVendorInline);
                      setIsEditingVendorInline(false);
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition cursor-pointer"
                    title="Add a new vendor or supplier partner"
                  >
                    <Plus className="w-3 h-3" />
                    {isAddingVendorInline ? 'Cancel' : 'New'}
                  </button>
                  {selectedVendor && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVendorForm({
                          id: selectedVendor.id,
                          name: selectedVendor.name,
                          contactPerson: selectedVendor.contactPerson || '',
                          email: selectedVendor.email || '',
                          phone: selectedVendor.phone || '',
                          leadTimeDays: selectedVendor.leadTimeDays || 3,
                        });
                        setIsEditingVendorInline(!isEditingVendorInline);
                        setIsAddingVendorInline(false);
                      }}
                      className="text-[10px] font-bold text-gray-700 hover:text-black flex items-center gap-0.5 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg border border-gray-200 transition cursor-pointer"
                      title="Edit currently selected supplier"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsManageVendorsModalOpen(true)}
                    className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-gray-100 transition cursor-pointer"
                    title="Manage all vendor and supplier partners"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Vendor Form */}
              {isAddingVendorInline && (
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
                    <span>Add New Supplier Partner</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingVendorInline(false)}
                      className="text-gray-400 hover:text-black cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newVendorForm.name}
                      onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                      placeholder="Supplier / Company Name *"
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newVendorForm.contactPerson}
                      onChange={(e) => setNewVendorForm({ ...newVendorForm, contactPerson: e.target.value })}
                      placeholder="Contact Person (e.g. Maria Tan)"
                      className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium"
                    />
                    <input
                      type="number"
                      min="1"
                      value={newVendorForm.leadTimeDays}
                      onChange={(e) => setNewVendorForm({ ...newVendorForm, leadTimeDays: parseInt(e.target.value) || 1 })}
                      placeholder="Lead Days"
                      className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={newVendorForm.email}
                      onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                      placeholder="Email Address"
                      className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium"
                    />
                    <input
                      type="text"
                      value={newVendorForm.phone}
                      onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                      placeholder="Phone (+63...)"
                      className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingVendorInline(false)}
                      className="px-2 py-1 text-gray-500 hover:text-black text-[11px] font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewVendor}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Save & Select
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Edit Vendor Form */}
              {isEditingVendorInline && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                    <span>Customize Supplier: {editingVendorForm.name}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingVendorInline(false)}
                      className="text-gray-400 hover:text-black cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={editingVendorForm.name}
                      onChange={(e) => setEditingVendorForm({ ...editingVendorForm, name: e.target.value })}
                      placeholder="Supplier Company Name"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editingVendorForm.contactPerson}
                      onChange={(e) => setEditingVendorForm({ ...editingVendorForm, contactPerson: e.target.value })}
                      placeholder="Contact Person"
                      className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium"
                    />
                    <input
                      type="number"
                      min="1"
                      value={editingVendorForm.leadTimeDays}
                      onChange={(e) => setEditingVendorForm({ ...editingVendorForm, leadTimeDays: parseInt(e.target.value) || 1 })}
                      placeholder="Lead Days"
                      className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={editingVendorForm.email}
                      onChange={(e) => setEditingVendorForm({ ...editingVendorForm, email: e.target.value })}
                      placeholder="Email Address"
                      className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium"
                    />
                    <input
                      type="text"
                      value={editingVendorForm.phone}
                      onChange={(e) => setEditingVendorForm({ ...editingVendorForm, phone: e.target.value })}
                      placeholder="Phone Number"
                      className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {vendors.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteVendor(editingVendorForm.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-lg border border-red-200 transition cursor-pointer flex items-center gap-1"
                        title="Delete this supplier"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    ) : <span />}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditingVendorInline(false)}
                        className="px-2 py-1 text-gray-500 hover:text-black text-[11px] font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateVendor}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor Select */}
              {!isAddingVendorInline && !isEditingVendorInline && (
                <div>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.contactPerson})
                      </option>
                    ))}
                  </select>
                  {selectedVendor && (
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 px-1">
                      <span className="truncate max-w-[150px]">
                        <span className="font-semibold text-gray-700">{selectedVendor.contactPerson}</span> • {selectedVendor.phone || selectedVendor.email}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 shrink-0 ml-1">
                        ⚡ {selectedVendor.leadTimeDays || 3}d lead
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Manufacturer Serial Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Manufacturer Serial Number (Optional)
              </label>
              <input
                type="text"
                value={manufacturerSerialNumber}
                onChange={(e) => setManufacturerSerialNumber(e.target.value)}
                placeholder="SN-982143-AB"
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Physical Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
              >
                <option value="Good">Good (Ready for Dispatch)</option>
                <option value="Fair">Fair (Minor Wear)</option>
                <option value="Damaged">Damaged (Needs Repair)</option>
                <option value="Needs Maintenance">Needs Maintenance (Scheduled)</option>
              </select>
            </div>
          </div>

          {/* MULTI-QUANTITY HANDLING (When quantity > 1 on Add Item) */}
          {!editingItem && quantity > 1 && (
            isConsumable ? (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-950">
                      Bulk Consumable Supply Batch ({quantity} {unitOfMeasure || 'pcs'})
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Single Record
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed mt-1">
                    Managed as a single bulk inventory entry with <span className="font-bold text-black">{quantity} {unitOfMeasure || 'pcs'}</span> total stock. Check-outs and issues will deduct directly from this shared balance without generating separate individual piece rows.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-blue-950">
                      Multi-Quantity SKU & Barcode Generator ({quantity} Units)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-blue-900 cursor-pointer flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={createAsDiscreteItems}
                        onChange={(e) => setCreateAsDiscreteItems(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Create {quantity} separate inventory items (Each with unique SKU & Barcode)</span>
                    </label>
                  </div>
                </div>

                {createAsDiscreteItems && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 font-semibold text-[11px]">SKU Format Suffix:</span>
                      <select
                        value={skuNumberingFormat}
                        onChange={(e) => setSkuNumberingFormat(e.target.value as any)}
                        className="px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold"
                      >
                        <option value="-01">Dash Two Digits: {sku || 'SKU'}-01, -02...</option>
                        <option value="-P01">Piece Notation: {sku || 'SKU'}-P01, -P02...</option>
                        <option value="-001">Three Digits: {sku || 'SKU'}-001, -002...</option>
                        <option value="-1">Simple Number: {sku || 'SKU'}-1, -2...</option>
                        <option value="ALPHA">Alphabetical: {sku || 'SKU'}-A, -B...</option>
                      </select>
                    </div>

                    {/* Discrete Piece Preview Box */}
                    <div className="p-3 bg-white rounded-xl border border-blue-200 max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono">
                      <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                        Generated Individual Items Preview:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {Array.from({ length: Math.min(6, quantity) }, (_, i) => {
                          const unitNum = i + 1;
                          const pSku = generatePieceSkuString(sku, unitNum, skuNumberingFormat);
                          const pBarcode = generatePieceBarcodeString(barcode, unitNum);
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px]"
                            >
                              <span className="font-bold text-black">{pSku}</span>
                              <span className="text-gray-500 text-[10px]">Barcode: {pBarcode}</span>
                            </div>
                          );
                        })}
                        {quantity > 6 && (
                          <div className="text-[10px] text-gray-400 italic py-1 col-span-full">
                            + {quantity - 6} more individual pieces will be generated...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* EXPIRATION DATE & SHELF-LIFE TRACKING (6m, 3m, 1m & Expired Intervals) */}
          <div className="bg-[#FFFDF7] border border-amber-200/80 p-4 rounded-2xl space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-amber-600" />
                  <span>Shelf-Life & Expiration Date Tracking</span>
                  {isConsumable && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.2 rounded-full border border-amber-200">
                      Recommended for Consumables
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">
                  Tracks deterioration windows in intervals (6 months, 3 months, 1 month, and expired) with Dashboard alerts
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasExpiry}
                  onChange={(e) => {
                    setHasExpiry(e.target.checked);
                    if (e.target.checked && !expirationDate) {
                      setExpirationDate(getFutureDatePreset(12)); // default 1 year ahead
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {hasExpiry ? (
              <div className="space-y-3 pt-2 border-t border-amber-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Expiration Date */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Expiration Date *
                    </label>
                    <input
                      type="date"
                      required={hasExpiry}
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Expiration Time */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>Cut-Off Time (Optional)</span>
                    </label>
                    <input
                      type="time"
                      value={expirationTime}
                      onChange={(e) => setExpirationTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Batch / Lot Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Batch / Lot Number
                    </label>
                    <input
                      type="text"
                      value={batchLotNumber}
                      onChange={(e) => setBatchLotNumber(e.target.value)}
                      placeholder="e.g. LOT-2026-MED08"
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono font-medium text-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">
                    Quick Expiry Presets:
                  </span>
                  {[
                    { label: '+1 Month (Critical)', months: 1 },
                    { label: '+3 Months', months: 3 },
                    { label: '+6 Months', months: 6 },
                    { label: '+1 Year', months: 12 },
                    { label: '+2 Years', months: 24 },
                    { label: '+3 Years', months: 36 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setExpirationDate(getFutureDatePreset(preset.months))}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Live Expiration Evaluation Preview */}
                {expirationDate && (
                  (() => {
                    const evalResult = evaluateItemExpiry({ expirationDate, expirationTime });
                    return (
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${evalResult.bgLightColor} ${evalResult.borderColor}`}
                      >
                        <div className="flex items-center gap-2">
                          <AlertOctagon className={`w-4 h-4 shrink-0 ${evalResult.textColor}`} />
                          <div>
                            <span className={`font-bold block ${evalResult.textColor}`}>
                              Tracking Interval: {evalResult.badgeLabel}
                            </span>
                            <span className="text-[11px] text-gray-600">
                              Target Date: {evalResult.formattedDate} {evalResult.formattedTime ? `@ ${evalResult.formattedTime}` : ''}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${evalResult.badgeClass}`}>
                          {evalResult.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })()
                )}
              </div>
            ) : (
              <div className="text-[11px] text-gray-500 italic pt-1 border-t border-amber-100">
                No expiration date tracked. Item will not trigger shelf-life or expiry disposal warnings.
              </div>
            )}
          </div>

          {/* LOW STOCK MONITORING TOGGLE & THRESHOLDS */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Monitor for Low Stock Alerts
                </span>
                <span className="text-[11px] text-gray-500">
                  Enable automated warnings and reorder alerts when inventory drops below threshold
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLowStockMonitored}
                  onChange={(e) => setIsLowStockMonitored(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
              </label>
            </div>

            {isLowStockMonitored ? (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Reorder Alert Point (Quantity Threshold)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:ring-2 focus:ring-black"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Triggers low stock badge when current quantity ≤ this value
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Safety Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={safetyStock}
                    onChange={(e) => setSafetyStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-xl text-xs font-bold text-black focus:ring-2 focus:ring-black"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Emergency minimum reserve cushion
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200">
                Low stock monitoring is disabled for this item. No alerts or reorder warnings will be triggered.
              </div>
            )}
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Description & Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical specifications, storage handling procedures, asset warranty notes, or dispatch instructions..."
              className="w-full px-3.5 py-2.5 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Tags & Search Keywords (Comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Hardware, Critical, Portable, Field"
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
            {editingItem && onDeleteItemPrompt ? (
              <button
                type="button"
                onClick={() => onDeleteItemPrompt(editingItem)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Item</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>
                  {editingItem
                    ? 'Save Item Changes'
                    : quantity > 1 && createAsDiscreteItems
                    ? `Save & Create ${quantity} Distinct Items`
                    : 'Save & Register Item'}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* Manage All Locations Modal */}
        {isManageLocationsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col border border-gray-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Manage Storage Locations</h3>
                    <p className="text-[11px] text-gray-500">Configure warehouses, aisles, bins, and vehicles</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManageLocationsModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Add New Location Bar in Modal */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
                <span className="text-[11px] font-bold text-indigo-950 block">Quick Add New Location</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newLocationForm.name}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, name: e.target.value })}
                    placeholder="Location Name *"
                    className="col-span-2 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={newLocationForm.code}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, code: e.target.value })}
                    placeholder="Code (e.g. AISLE-3)"
                    className="px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <select
                    value={newLocationForm.type}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, type: e.target.value as LocationType })}
                    className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <option value="Warehouse">Warehouse</option>
                    <option value="Aisle">Aisle</option>
                    <option value="Bin">Bin</option>
                    <option value="Department">Department</option>
                    <option value="Vehicle">Vehicle</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newLocationForm.name.trim()) return;
                      const code = newLocationForm.code.trim() || newLocationForm.name.slice(0, 4).toUpperCase();
                      const created = addLocation({
                        name: newLocationForm.name.trim(),
                        code: code,
                        type: newLocationForm.type,
                        capacity: 1000,
                      });
                      if (created?.id) {
                        setLocationId(created.id);
                      }
                      setNewLocationForm({ name: '', code: '', type: 'Warehouse', capacity: 1000 });
                    }}
                    className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Select</span>
                  </button>
                </div>
              </div>

              {/* List of existing locations */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100 max-h-[320px]">
                {locations.map((loc) => {
                  const isSelected = loc.id === locationId;
                  const isEditingThis = isEditingLocationInline && editingLocationForm.id === loc.id;
                  return (
                    <div key={loc.id} className="pt-2 first:pt-0 flex items-center justify-between py-1.5 gap-2">
                      {isEditingThis ? (
                        <div className="flex-1 space-y-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={editingLocationForm.name}
                              onChange={(e) => setEditingLocationForm({ ...editingLocationForm, name: e.target.value })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-semibold"
                            />
                            <input
                              type="text"
                              value={editingLocationForm.code}
                              onChange={(e) => setEditingLocationForm({ ...editingLocationForm, code: e.target.value })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <select
                              value={editingLocationForm.type}
                              onChange={(e) => setEditingLocationForm({ ...editingLocationForm, type: e.target.value as LocationType })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-semibold cursor-pointer"
                            >
                              <option value="Warehouse">Warehouse</option>
                              <option value="Aisle">Aisle</option>
                              <option value="Bin">Bin</option>
                              <option value="Department">Department</option>
                              <option value="Vehicle">Vehicle</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingLocationInline(false)}
                                className="px-2 py-1 text-gray-500 text-xs hover:text-black cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleUpdateLocation}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900">{loc.name}</span>
                                <span className="px-1.5 py-0.2 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-700 font-semibold">
                                  {loc.code}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-medium">{loc.type || 'Warehouse'} • Max {loc.capacity || 1000} items</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setLocationId(loc.id);
                                setIsManageLocationsModalOpen(false);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700'
                              }`}
                            >
                              {isSelected ? 'Active' : 'Select'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLocationForm({
                                  id: loc.id,
                                  name: loc.name,
                                  code: loc.code,
                                  type: loc.type || 'Warehouse',
                                  capacity: loc.capacity || 1000,
                                });
                                setIsEditingLocationInline(true);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer"
                              title="Edit location"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {locations.length > 1 && (
                              deletingLocationId === loc.id ? (
                                <div className="flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded-lg border border-red-200 animate-in fade-in">
                                  <span className="text-[10px] font-bold text-red-700">Delete?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLocation(loc.id)}
                                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingLocationId(null)}
                                    className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingLocationId(loc.id)}
                                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="Delete location"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageLocationsModalOpen(false)}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage All Vendors / Suppliers Modal */}
        {isManageVendorsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col border border-gray-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Manage Suppliers & Vendors</h3>
                    <p className="text-[11px] text-gray-500">Configure procurement partners, contact info, and lead times</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManageVendorsModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Add New Supplier Bar in Modal */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <span className="text-[11px] font-bold text-emerald-950 block">Quick Add New Supplier</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newVendorForm.name}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                    placeholder="Supplier / Company Name *"
                    className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={newVendorForm.contactPerson}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, contactPerson: e.target.value })}
                    placeholder="Contact Person (e.g. Jose Reyes)"
                    className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="email"
                    value={newVendorForm.email}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                    placeholder="Email Address"
                    className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium"
                  />
                  <input
                    type="text"
                    value={newVendorForm.phone}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                    placeholder="Phone"
                    className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newVendorForm.leadTimeDays}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, leadTimeDays: parseInt(e.target.value) || 1 })}
                    placeholder="Lead (Days)"
                    className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newVendorForm.name.trim()) return;
                      const created = addVendor({
                        name: newVendorForm.name.trim(),
                        contactPerson: newVendorForm.contactPerson.trim() || 'Account Rep',
                        email: newVendorForm.email.trim() || 'vendor@example.com',
                        phone: newVendorForm.phone.trim() || '+63 (02) 8000-0000',
                        leadTimeDays: newVendorForm.leadTimeDays || 3,
                        rating: 4.8,
                      });
                      if (created?.id) {
                        setVendorId(created.id);
                      }
                      setNewVendorForm({
                        name: '',
                        contactPerson: '',
                        email: '',
                        phone: '',
                        leadTimeDays: 3,
                      });
                    }}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Select</span>
                  </button>
                </div>
              </div>

              {/* List of existing vendors */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100 max-h-[320px]">
                {vendors.map((v) => {
                  const isSelected = v.id === vendorId;
                  const isEditingThis = isEditingVendorInline && editingVendorForm.id === v.id;
                  return (
                    <div key={v.id} className="pt-2 first:pt-0 flex items-center justify-between py-1.5 gap-2">
                      {isEditingThis ? (
                        <div className="flex-1 space-y-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={editingVendorForm.name}
                              onChange={(e) => setEditingVendorForm({ ...editingVendorForm, name: e.target.value })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-semibold"
                            />
                            <input
                              type="text"
                              value={editingVendorForm.contactPerson}
                              onChange={(e) => setEditingVendorForm({ ...editingVendorForm, contactPerson: e.target.value })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-medium"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <input
                              type="email"
                              value={editingVendorForm.email}
                              onChange={(e) => setEditingVendorForm({ ...editingVendorForm, email: e.target.value })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-medium"
                            />
                            <input
                              type="text"
                              value={editingVendorForm.phone}
                              onChange={(e) => setEditingVendorForm({ ...editingVendorForm, phone: e.target.value })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-medium"
                            />
                            <input
                              type="number"
                              min="1"
                              value={editingVendorForm.leadTimeDays}
                              onChange={(e) => setEditingVendorForm({ ...editingVendorForm, leadTimeDays: parseInt(e.target.value) || 1 })}
                              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-medium"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsEditingVendorInline(false)}
                              className="px-2 py-1 text-gray-500 text-xs hover:text-black cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdateVendor}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900">{v.name}</span>
                                <span className="text-[10px] text-gray-500">({v.contactPerson})</span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-medium">
                                {v.phone || v.email} • ⚡ {v.leadTimeDays || 3}d lead
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setVendorId(v.id);
                                setIsManageVendorsModalOpen(false);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700'
                              }`}
                            >
                              {isSelected ? 'Active' : 'Select'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVendorForm({
                                  id: v.id,
                                  name: v.name,
                                  contactPerson: v.contactPerson || '',
                                  email: v.email || '',
                                  phone: v.phone || '',
                                  leadTimeDays: v.leadTimeDays || 3,
                                });
                                setIsEditingVendorInline(true);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-black hover:bg-gray-100 transition cursor-pointer"
                              title="Edit vendor"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {vendors.length > 1 && (
                              deletingVendorId === v.id ? (
                                <div className="flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded-lg border border-red-200 animate-in fade-in">
                                  <span className="text-[10px] font-bold text-red-700">Delete?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVendor(v.id)}
                                    className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingVendorId(null)}
                                    className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingVendorId(v.id)}
                                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="Delete vendor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageVendorsModalOpen(false)}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
