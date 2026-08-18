import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Item, ItemBundleComponent } from '../../types';
import { X, Layers, Plus, Trash2, Check, Search, DollarSign, Package } from 'lucide-react';
import { generateValidUPC } from '../../utils/barcodeRenderer';

interface ItemSetBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bundleItem: Item) => void;
}

export const ItemSetBuilderModal: React.FC<ItemSetBuilderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { items, locations, vendors, categories, addItem, generateSku } = useInventory();

  const [setName, setSetName] = useState('');
  const [setSku, setSetSku] = useState(() => generateSku('Kits & Bundles'));
  const [setBarcode, setSetBarcode] = useState(() => generateValidUPC());
  const [category, setCategory] = useState(categories[0] || 'Equipment Sets');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80'
  );
  const [isLowStockMonitored, setIsLowStockMonitored] = useState(true);
  const [reorderPoint, setReorderPoint] = useState(2);
  const [safetyStock, setSafetyStock] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  // Search & Item Selection for Set
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<
    Record<string, { item: Item; quantity: number }>
  >({});

  if (!isOpen) return null;

  // Filter available non-bundle items
  const availableItems = items.filter((i) => !i.isSetOrBundle);
  const filteredAvailable = availableItems.filter((i) => {
    const q = itemSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      i.name.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  const toggleItemSelection = (item: Item) => {
    setSelectedComponents((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = { item, quantity: 1 };
      }
      return next;
    });
  };

  const updateComponentQty = (itemId: string, delta: number) => {
    setSelectedComponents((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const newQty = Math.max(1, current.quantity + delta);
      return {
        ...prev,
        [itemId]: { ...current, quantity: newQty },
      };
    });
  };

  // Compute total value of selected components
  const componentEntries = Object.values(selectedComponents) as Array<{ item: Item; quantity: number }>;

  const calculatedSumPrice = componentEntries.reduce((acc, curr) => {
    return acc + (curr.item.unitPrice || 0) * curr.quantity;
  }, 0);

  const calculatedSumCost = componentEntries.reduce((acc, curr) => {
    return acc + (curr.item.costPrice || 0) * curr.quantity;
  }, 0);

  const finalUnitPrice = customPrice !== null ? customPrice : calculatedSumPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim()) {
      alert('Please enter a name for this Item Set / Kit.');
      return;
    }
    const componentList: ItemBundleComponent[] = componentEntries.map((c) => ({
      itemId: c.item.id,
      itemName: c.item.name,
      sku: c.item.sku,
      barcode: c.item.barcode,
      quantity: c.quantity,
      unitPrice: c.item.unitPrice,
      imageUrl: c.item.imageUrl,
    }));

    if (componentList.length === 0) {
      alert('Please select at least one item to include in this Item Set.');
      return;
    }

    const selectedLoc = locations.find((l) => l.id === locationId);
    const selectedVendor = vendors.find((v) => v.id === vendorId);

    const createdSet = addItem({
      name: setName.trim(),
      sku: setSku.trim() || generateSku(category),
      barcode: setBarcode.trim() || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      barcodeType: 'CODE128',
      category: category,
      description:
        description.trim() ||
        `Item Set containing ${componentList.length} items: ${componentList
          .map((c) => `${c.itemName} [SKU: ${c.sku}] x${c.quantity}`)
          .join(', ')}`,
      quantity: Math.max(1, quantity),
      unitPrice: finalUnitPrice,
      costPrice: calculatedSumCost,
      locationId: locationId,
      locationName: selectedLoc?.name || 'Main Warehouse',
      vendorId: vendorId,
      vendorName: selectedVendor?.name || 'In-House Assembly',
      condition: 'Good',
      tags: ['Set', 'Kit', 'Bundle', category, ...componentList.map((c) => c.sku)],
      imageUrl: imageUrl,
      isSetOrBundle: true,
      bundleItems: componentList,
      pieceSkus: componentList.map((c) => c.sku),
      isLowStockMonitored: isLowStockMonitored,
      reorderPoint: isLowStockMonitored ? reorderPoint : 0,
      safetyStock: isLowStockMonitored ? safetyStock : 0,
    });

    onSuccess(createdSet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
                Create Item Set / Bundle
              </h3>
              <p className="text-xs text-gray-500 font-normal">
                Assemble a packaged kit or set by selecting existing inventory items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Set Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Item Set / Kit Name *
              </label>
              <input
                type="text"
                required
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="e.g. Field Responder First Aid & Tool Kit"
                className="w-full px-3.5 py-2.5 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Set Master SKU Code *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={setSku}
                  onChange={(e) => setSetSku(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setSetSku(generateSku('Kits & Bundles'))}
                  className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded-xl border border-[#E5E5E5] transition cursor-pointer"
                  title="Generate SKU"
                >
                  Regen
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Set Barcode Number *
              </label>
              <input
                type="text"
                required
                value={setBarcode}
                onChange={(e) => setSetBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Storage Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Available Set Stock Quantity (Default: 1)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Set Price (PHP ₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={finalUnitPrice}
                  onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-bold text-purple-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Sum of component items: ₱{calculatedSumPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-purple-700 font-medium mt-0.5">
                Note: Set price is not added to Total Stock Price or Total Assets Valuation to prevent double-counting component items.
              </p>
            </div>
          </div>

          {/* Low Stock Monitoring Toggle */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] block">
                  Monitor Set for Low Stock Alerts
                </span>
                <span className="text-[11px] text-gray-500">
                  Notify warehouse when total assembled sets drop below threshold
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLowStockMonitored}
                  onChange={(e) => setIsLowStockMonitored(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {isLowStockMonitored && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase">
                    Reorder Alert Point
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase">
                    Safety Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={safetyStock}
                    onChange={(e) => setSafetyStock(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Select Items from Inventory */}
          <div className="border border-[#E5E5E5] rounded-xl p-4 bg-gray-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                  Select Included Inventory Items ({Object.keys(selectedComponents).length} selected)
                </h4>
                <p className="text-[11px] text-gray-500">
                  Pick already available items from inventory to bundle into this set
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter available items..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Selected Components Summary Chips & Itemized SKU Manifest */}
            {componentEntries.length > 0 && (
              <div className="space-y-2 bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl">
                <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    Included Set Items & SKU Codes ({componentEntries.length} items)
                  </span>
                  <span className="text-[11px] font-mono text-purple-800">
                    Total Component Qty: {componentEntries.reduce((acc, c) => acc + c.quantity, 0)} pcs
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {componentEntries.map(({ item, quantity: compQty }, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-white border border-purple-200 rounded-lg shadow-2xs text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100'}
                          alt=""
                          className="w-7 h-7 rounded object-cover border border-[#E5E5E5] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-[#1A1A1A] truncate">{item.name}</div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                            <span className="font-bold text-purple-900 bg-purple-100/80 px-1 py-0.2 rounded border border-purple-200">
                              SKU: {item.sku}
                            </span>
                            <span>Barcode: {item.barcode}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-purple-200 rounded-md bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateComponentQty(item.id, -1)}
                            className="px-1.5 py-0.5 text-xs hover:bg-gray-100 font-bold text-gray-700 cursor-pointer"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-purple-700">
                            {compQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateComponentQty(item.id, 1)}
                            className="px-1.5 py-0.5 text-xs hover:bg-gray-100 font-bold text-gray-700 cursor-pointer"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleItemSelection(item)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition cursor-pointer"
                          title="Remove item from set"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Items List */}
            <div className="max-h-56 overflow-y-auto space-y-2 border border-[#E5E5E5] rounded-xl p-2 bg-white">
              {filteredAvailable.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  No matching inventory items found.
                </div>
              ) : (
                filteredAvailable.map((item) => {
                  const isSelected = !!selectedComponents[item.id];
                  const currentComp = selectedComponents[item.id];

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                        isSelected
                          ? 'border-purple-300 bg-purple-50/40'
                          : 'border-gray-100 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        onClick={() => toggleItemSelection(item)}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                            isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100'}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover border border-[#E5E5E5]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#1A1A1A]">{item.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            SKU: {item.sku} | In Stock: {item.quantity} | ₱
                            {item.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-500">Qty:</span>
                          <div className="flex items-center border border-purple-200 rounded-lg bg-white overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateComponentQty(item.id, -1)}
                              className="px-2 py-1 text-xs hover:bg-gray-100 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold text-purple-700">
                              {currentComp.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateComponentQty(item.id, 1)}
                              className="px-2 py-1 text-xs hover:bg-gray-100 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notes & Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Set Description & Assembly Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Standard field dispatch bundle. Contains all required emergency safety apparatus."
              className="w-full px-3 py-2 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-xs font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Save & Assemble Set ({Object.keys(selectedComponents).length} items)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
