import React, { useState, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useInventory } from '../context/InventoryContext';
import { Item } from '../types';
import {
  Package,
  Search,
  Plus,
  MapPin,
  Barcode,
  ArrowRightLeft,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  X,
  Camera,
  Image as ImageIcon,
  FolderPlus,
  Grid,
  Table as TableIcon,
  Hash,
  AlertTriangle,
  FileText,
  Layers,
  Copy,
  Check,
  Building2,
  DollarSign,
  Tag,
  ZoomIn,
  Sparkles,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';
import { renderBarcodeToCanvas, renderQRCodeToCanvas } from '../utils/barcodeRenderer';
import { ItemSetBuilderModal } from './inventory/ItemSetBuilderModal';
import { AddEditItemModal } from './inventory/AddEditItemModal';
import { ItemDetailInspectorDrawer } from './inventory/ItemDetailInspectorDrawer';
import { CategoryManagerModal } from './inventory/CategoryManagerModal';
import { SkuConfigModal } from './inventory/SkuConfigModal';

export const InventoryView: React.FC = () => {
  const {
    items,
    locations,
    vendors,
    categories,
    hasPermission,
    editItem,
    deleteItem,
    wipeAllItems,
    openCheckInOutModal,
    inventoryCategoryFilter,
    setInventoryCategoryFilter,
    inventoryStockFilter,
    setInventoryStockFilter,
    selectedItemForDetail,
    setSelectedItemForDetail,
    isLoadingDatabase,
  } = useInventory();

  // Layout View Mode: 'table' | 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSetBuilderOpen, setIsSetBuilderOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSkuConfigModalOpen, setIsSkuConfigModalOpen] = useState(false);

  // In-App Confirmation Dialog States
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Inline Quick Editing state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({
    name: '',
    sku: '',
    quantity: 1,
    unitPrice: 0,
    manufacturerSerialNumber: '',
  });

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleCopySku = (sku: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleConfirmDeleteItem = () => {
    if (itemToDelete) {
      const name = itemToDelete.name;
      const sku = itemToDelete.sku;
      deleteItem(itemToDelete.id);
      setItemToDelete(null);
      if (selectedItemForDetail?.id === itemToDelete.id) {
        setSelectedItemForDetail(null);
      }
      if (editingItem?.id === itemToDelete.id) {
        setIsAddModalOpen(false);
        setEditingItem(null);
      }
      showToast(`Item "${name}" (${sku}) deleted.`);
    }
  };

  const handleConfirmWipeAll = () => {
    const count = items.length;
    wipeAllItems();
    setIsWipeModalOpen(false);
    setSelectedItemForDetail(null);
    setIsAddModalOpen(false);
    showToast(`Successfully wiped all ${count} items from inventory.`);
  };

  // Inline Editing
  const handleStartInlineEdit = (item: Item, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInlineEditingId(item.id);
    setInlineForm({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      manufacturerSerialNumber: item.manufacturerSerialNumber || '',
    });
  };

  const handleSaveInlineEdit = (itemId: string) => {
    if (!inlineForm.name.trim() || !inlineForm.sku.trim()) {
      alert('Name and SKU are required.');
      return;
    }
    editItem(itemId, {
      name: inlineForm.name.trim(),
      sku: inlineForm.sku.trim(),
      quantity: Math.max(0, inlineForm.quantity),
      unitPrice: Math.max(0, inlineForm.unitPrice),
      manufacturerSerialNumber: inlineForm.manufacturerSerialNumber.trim() || undefined,
    });
    setInlineEditingId(null);
    showToast('Item quick-saved successfully.');
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      (item.manufacturerSerialNumber && item.manufacturerSerialNumber.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q) ||
      item.locationName.toLowerCase().includes(q) ||
      item.vendorName.toLowerCase().includes(q) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));

    const matchesCategory = inventoryCategoryFilter === 'ALL' || item.category === inventoryCategoryFilter;
    const matchesLocation = locationFilter === 'ALL' || item.locationId === locationFilter;

    let matchesStock = true;
    if (inventoryStockFilter === 'LOW_STOCK') {
      matchesStock = item.isLowStockMonitored !== false && item.quantity <= item.reorderPoint;
    } else if (inventoryStockFilter === 'CONSUMABLES') {
      matchesStock = !!item.isConsumable;
    } else if (inventoryStockFilter === 'DURABLE_ONLY') {
      matchesStock = !item.isConsumable;
    } else if (inventoryStockFilter === 'SETS_ONLY') {
      matchesStock = !!item.isSetOrBundle;
    } else if (inventoryStockFilter === 'UNMONITORED') {
      matchesStock = item.isLowStockMonitored === false;
    } else if (inventoryStockFilter === 'DAMAGED') {
      matchesStock = item.condition === 'Damaged' || item.condition === 'Needs Maintenance';
    }

    return matchesSearch && matchesCategory && matchesLocation && matchesStock;
  });

  const totalValuationPHP = items
    .filter((i) => !i.isSetOrBundle)
    .reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const totalPhysicalUnits = items
    .filter((i) => !i.isSetOrBundle)
    .reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed top-20 right-6 z-50 bg-black text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Main Header & Metric Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2 tracking-tight">
              <Package className="w-6 h-6 text-black" />
              <span>Inventory Database</span>
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
              {items.length} Total SKUs
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Tracking <span className="font-bold text-black">{totalPhysicalUnits} physical units</span> | Total Asset Valuation:{' '}
            <span className="text-emerald-700 font-bold">
              ₱{totalValuationPHP.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Table / Grid Layout Toggle */}
          <div className="flex items-center bg-[#F0F0F0] border border-[#E5E5E5] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-black shadow-xs border border-[#E5E5E5]'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-black shadow-xs border border-[#E5E5E5]'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {/* Admin Categories Manager */}
          {hasPermission('canEditItems') && (
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:bg-gray-50 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline">Categories</span>
            </button>
          )}

          {/* Admin SKU Rules Config */}
          {hasPermission('canManageRoles') && (
            <button
              onClick={() => setIsSkuConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:bg-gray-50 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Hash className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline">SKU Rules</span>
            </button>
          )}

          {/* Create Item Set / Bundle Button */}
          {hasPermission('canAddItems') && (
            <button
              onClick={() => setIsSetBuilderOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Create Item Set</span>
            </button>
          )}

          {/* Add Item Button */}
          {hasPermission('canAddItems') && (
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-green-400" />
              <span>Add Item</span>
            </button>
          )}

          {/* Wipe All Data Button */}
          {hasPermission('canDeleteItems') && items.length > 0 && (
            <button
              onClick={() => setIsWipeModalOpen(true)}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition cursor-pointer"
              title="Wipe All Inventory Data"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Name, SKU, Serial Number, Barcode, Category, Supplier, Tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-black text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={inventoryCategoryFilter}
              onChange={(e) => setInventoryCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock & Set Status Filter */}
          <div>
            <select
              value={inventoryStockFilter}
              onChange={(e) => setInventoryStockFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
            >
              <option value="ALL">All Item Classifications</option>
              <option value="DURABLE_ONLY">🛡️ Returnable Durable Assets Only</option>
              <option value="CONSUMABLES">📦 Consumable Supplies (Non-Returnable)</option>
              <option value="LOW_STOCK">⚠️ Low Stock Only (Monitored)</option>
              <option value="SETS_ONLY">📦 Item Sets & Bundles Only</option>
              <option value="UNMONITORED">🔕 Unmonitored Items</option>
              <option value="DAMAGED">🛠 Damaged / Maintenance</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Tag Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            Quick Views:
          </span>
          <button
            onClick={() => {
              setInventoryCategoryFilter('ALL');
              setInventoryStockFilter('ALL');
              setLocationFilter('ALL');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              inventoryCategoryFilter === 'ALL' && inventoryStockFilter === 'ALL'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setInventoryStockFilter('DURABLE_ONLY')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              inventoryStockFilter === 'DURABLE_ONLY'
                ? 'bg-blue-700 text-white'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Returnable Assets ({items.filter((i) => !i.isConsumable).length})</span>
          </button>
          <button
            onClick={() => setInventoryStockFilter('CONSUMABLES')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              inventoryStockFilter === 'CONSUMABLES'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <PackageCheck className="w-3 h-3" />
            <span>Consumables ({items.filter((i) => i.isConsumable).length})</span>
          </button>
          <button
            onClick={() => setInventoryStockFilter('LOW_STOCK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              inventoryStockFilter === 'LOW_STOCK'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>
              Low Stock (
              {items.filter((i) => i.isLowStockMonitored !== false && i.quantity <= i.reorderPoint).length}
              )
            </span>
          </button>
          <button
            onClick={() => setInventoryStockFilter('SETS_ONLY')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              inventoryStockFilter === 'SETS_ONLY'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Sets & Kits ({items.filter((i) => i.isSetOrBundle).length})</span>
          </button>
        </div>
      </div>

      {/* ITEMS LIST (TABLE VIEW) */}
      {viewMode === 'table' && (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Photo & Item</th>
                  <th className="py-3.5 px-4">SKU / Barcode</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Location / Supplier</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
              <th className="py-3.5 px-4">Price (PHP)</th>
                  <th className="py-3.5 px-4">Monitoring Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {isLoadingDatabase ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-[#E5E5E5]">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton width={44} height={44} borderRadius={12} />
                          <div className="flex-1">
                            <Skeleton width="70%" height={14} />
                            <Skeleton width="40%" height={10} className="mt-1" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton width={80} height={14} />
                        <Skeleton width={60} height={10} className="mt-1" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton width={70} height={20} borderRadius={6} />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton width={90} height={12} />
                        <Skeleton width={70} height={10} className="mt-1" />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Skeleton width={40} height={16} className="mx-auto" />
                        <Skeleton width={60} height={8} className="mx-auto mt-1" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton width={60} height={14} />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton width={70} height={20} borderRadius={6} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Skeleton width={24} height={24} borderRadius={6} />
                          <Skeleton width={24} height={24} borderRadius={6} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400">
                      <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <div className="font-bold text-gray-600">No items found matching your criteria.</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Try clearing search filters or click "+ Add Item" to register stock.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isInline = inlineEditingId === item.id;
                    const isLow = item.isLowStockMonitored !== false && item.quantity <= item.reorderPoint;
                    const isOutOfStock = item.quantity === 0;

                    if (isInline) {
                      return (
                        <tr key={item.id} className="bg-blue-50/50">
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={inlineForm.name}
                              onChange={(e) => setInlineForm({ ...inlineForm, name: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-blue-400 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={inlineForm.sku}
                              onChange={(e) => setInlineForm({ ...inlineForm, sku: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-blue-400 rounded-lg text-xs font-mono font-bold"
                            />
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-semibold">{item.category}</td>
                          <td className="py-3 px-4 text-gray-500">{item.locationName}</td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              value={inlineForm.quantity}
                              onChange={(e) =>
                                setInlineForm({ ...inlineForm, quantity: parseInt(e.target.value) || 0 })
                              }
                              className="w-16 px-2 py-1 bg-white border border-blue-400 rounded-lg text-xs font-bold text-center"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={inlineForm.unitPrice}
                              onChange={(e) =>
                                setInlineForm({ ...inlineForm, unitPrice: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 px-2 py-1 bg-white border border-blue-400 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">Editing...</td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={() => handleSaveInlineEdit(item.id)}
                              className="px-2.5 py-1 bg-black text-white rounded-lg font-bold text-xs hover:bg-neutral-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setInlineEditingId(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemForDetail(item)}
                        className="hover:bg-[#F9F9F9] transition cursor-pointer group"
                      >
                        {/* Photo & Item Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-[#E5E5E5] bg-gray-100 flex-shrink-0">
                              <img
                                src={
                                  item.imageUrl ||
                                  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200'
                                }
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200';
                                }}
                              />
                              {item.isSetOrBundle && (
                                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[8px] px-1 font-bold">
                                  SET
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#1A1A1A] group-hover:text-blue-600 transition flex items-center gap-1.5 flex-wrap">
                                <span className="truncate max-w-[200px]">{item.name}</span>
                                {item.isConsumable ? (
                                  <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5" title="Consumable: Non-returnable upon issue">
                                    <PackageCheck className="w-2.5 h-2.5 text-amber-700" />
                                    Consumable
                                  </span>
                                ) : (
                                  <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5" title="Durable Asset: Return tracked">
                                    <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                                    Returnable
                                  </span>
                                )}
                                {item.isSetOrBundle && (
                                  <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                    Set ({item.bundleItems?.length || 0})
                                  </span>
                                )}
                              </div>
                              {item.manufacturerSerialNumber && (
                                <div className="text-[10px] text-gray-400 font-mono truncate max-w-[180px]">
                                  SN: {item.manufacturerSerialNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SKU & Barcode */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[#1A1A1A] text-xs">{item.sku}</span>
                            <button
                              onClick={(e) => handleCopySku(item.sku, e)}
                              className="p-1 text-gray-400 hover:text-black rounded"
                              title="Copy SKU"
                            >
                              {copiedSku === item.sku ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-gray-400" />
                            <span>{item.barcode}</span>
                          </div>
                          {item.isSetOrBundle && item.bundleItems && item.bundleItems.length > 0 && (
                            <div
                              className="text-[9px] text-purple-700 font-mono truncate max-w-[170px] mt-0.5"
                              title={`Included Item SKUs: ${item.bundleItems.map((b) => b.sku).join(', ')}`}
                            >
                              SKUs: {item.bundleItems.map((b) => b.sku).join(', ')}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold border border-gray-200">
                            {item.category}
                          </span>
                        </td>

                        {/* Location & Supplier */}
                        <td className="py-3.5 px-4">
                          <div className="text-gray-700 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="truncate max-w-[120px]">{item.locationName}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-300" />
                            <span className="truncate max-w-[120px]">{item.vendorName}</span>
                          </div>
                        </td>

                        {/* Quantity Stock */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-bold text-xs ${
                                isOutOfStock
                                  ? 'bg-red-100 text-red-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {item.quantity}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium lowercase">
                              {item.unitOfMeasure || 'units'}
                            </span>
                          </div>
                        </td>

                        {/* Unit Price in PHP */}
                        <td className="py-3.5 px-4 font-bold text-[#1A1A1A]">
                          <div>₱{item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                          {item.isSetOrBundle && (
                            <span className="text-[9px] font-medium text-purple-700 block mt-0.5">
                              Bundle Price (Excl. from Total Valuation)
                            </span>
                          )}
                        </td>

                        {/* Monitoring Status Badge */}
                        <td className="py-3.5 px-4">
                          {item.isLowStockMonitored !== false ? (
                            isLow ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Low (≤{item.reorderPoint})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Monitored</span>
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-medium border border-gray-200 w-fit">
                              Unmonitored
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedItemForDetail(item)}
                              className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition"
                              title="Inspect Details & QR"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {hasPermission('canEditItems') && (
                              <>
                                <button
                                  onClick={(e) => handleStartInlineEdit(item, e)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition"
                                  title="Quick Edit Row"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition"
                                  title="Customize All Details"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {hasPermission('canDeleteItems') && (
                              <button
                                onClick={() => setItemToDelete(item)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ITEMS LIST (CARD GRID VIEW) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoadingDatabase ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-2xs space-y-3"
              >
                <Skeleton height={160} borderRadius={12} />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton width="30%" height={12} />
                    <Skeleton width="40%" height={12} />
                  </div>
                  <Skeleton width="85%" height={16} />
                  <Skeleton width="60%" height={12} />
                  <div className="p-2.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] flex justify-between">
                    <Skeleton width="40%" height={14} />
                    <Skeleton width="30%" height={14} />
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E5E5E5] flex justify-between">
                  <Skeleton width="30%" height={24} borderRadius={6} />
                  <Skeleton width="30%" height={24} borderRadius={6} />
                </div>
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full bg-white border border-[#E5E5E5] rounded-2xl p-12 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <div className="font-bold text-gray-600">No items found matching your criteria.</div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLow = item.isLowStockMonitored !== false && item.quantity <= item.reorderPoint;
              const isOutOfStock = item.quantity === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemForDetail(item)}
                  className="bg-white border border-[#E5E5E5] hover:border-black/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group space-y-3"
                >
                  <div>
                    {/* Card Photo & Badges */}
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 h-40 border border-[#E5E5E5] mb-3">
                      <img
                        src={
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400'
                        }
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400';
                        }}
                      />
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold">
                          {item.category}
                        </span>
                        {item.isConsumable ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-amber-950 text-[10px] font-bold flex items-center gap-1 shadow-xs border border-amber-400/50">
                            <PackageCheck className="w-3 h-3" />
                            <span>Consumable</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Returnable</span>
                          </span>
                        )}
                        {item.isSetOrBundle && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                            <Layers className="w-3 h-3" />
                            <span>Set ({item.bundleItems?.length || 0})</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2 right-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                            isOutOfStock
                              ? 'bg-red-600 text-white'
                              : isLow
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {item.quantity} {item.unitOfMeasure || 'units'}
                        </span>
                      </div>
                    </div>

                    {/* Card Info */}
                    <h3 className="font-bold text-sm text-[#1A1A1A] line-clamp-1 group-hover:text-blue-600 transition">
                      {item.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs font-mono text-gray-500 mt-1">
                      <span className="font-bold text-black">{item.sku}</span>
                      <span>₱{item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {item.isSetOrBundle && item.bundleItems && item.bundleItems.length > 0 && (
                      <div
                        className="text-[9px] text-purple-700 font-mono truncate bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-1.5"
                        title={`Included Piece SKUs: ${item.bundleItems.map((b) => b.sku).join(', ')}`}
                      >
                        Piece SKUs: {item.bundleItems.map((b) => b.sku).join(', ')}
                      </div>
                    )}

                    <div className="text-[11px] text-gray-500 mt-2 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{item.locationName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{item.vendorName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div
                    className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold">
                      {item.isLowStockMonitored !== false ? (
                        isLow ? (
                          <span className="text-amber-700">Reorder Alert</span>
                        ) : (
                          <span className="text-emerald-700">Monitored</span>
                        )
                      ) : (
                        <span className="text-gray-400">Unmonitored</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedItemForDetail(item)}
                        className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100"
                        title="Inspect"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {hasPermission('canEditItems') && (
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {hasPermission('canDeleteItems') && (
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM (Customization modal with discrete SKU generator & photo upload) */}
      <AddEditItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
        onDeleteItemPrompt={(item) => setItemToDelete(item)}
      />

      {/* MODAL: CREATE ITEM SET / BUNDLE */}
      <ItemSetBuilderModal
        isOpen={isSetBuilderOpen}
        onClose={() => setIsSetBuilderOpen(false)}
        onSuccess={(createdSet) => {
          showToast(`Item Set "${createdSet.name}" (${createdSet.sku}) successfully created!`);
          setSelectedItemForDetail(createdSet);
        }}
      />

      {/* DRAWER: ITEM DETAIL INSPECTOR */}
      <ItemDetailInspectorDrawer
        item={selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        onEdit={(item) => {
          setEditingItem(item);
          setIsAddModalOpen(true);
        }}
        onDeletePrompt={(item) => setItemToDelete(item)}
        onCheckInOut={(item, mode) => openCheckInOutModal(item, mode)}
      />

      {/* MODAL: CATEGORY MANAGER */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onDeleteCategoryPrompt={(cat) => {
          setActionToast(`Category "${cat}" removed successfully.`);
          setTimeout(() => setActionToast(null), 3500);
        }}
      />

      {/* MODAL: SKU PATTERN CONFIG */}
      <SkuConfigModal
        isOpen={isSkuConfigModalOpen}
        onClose={() => setIsSkuConfigModalOpen(false)}
      />

      {/* IN-APP CONFIRMATION MODAL: SINGLE ITEM DELETE */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Delete Inventory Item</h3>
                <p className="text-xs text-gray-500">This action will remove the item permanently.</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="font-bold text-[#1A1A1A]">{itemToDelete.name}</div>
              <div className="text-gray-500 font-mono">
                SKU: {itemToDelete.sku} | Barcode: {itemToDelete.barcode}
              </div>
              <div className="text-gray-500 font-semibold">
                Current Stock Quantity: {itemToDelete.quantity} units
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL: WIPE ALL INVENTORY */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Wipe Entire Inventory</h3>
                <p className="text-xs text-gray-500">
                  Are you sure you want to delete all {items.length} items?
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-red-50 p-3 rounded-xl border border-red-200">
              Warning: This will permanently remove all stock records, piece serials, and historical
              inventory entries.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWipeAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Yes, Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
