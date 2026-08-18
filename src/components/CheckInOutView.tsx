import React, { useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Item, ItemCondition, PendingCheckIn } from '../types';
import { PersonSelectorInput } from './PersonSelectorInput';
import {
  isLoanAssignedToUser,
  isPrivilegedStaffManager,
  getUserActiveCheckedOutQuantity,
  getItemActiveLoans,
  getOtherStaffLoansForItem,
} from '../utils/loanUtils';
import {
  ArrowRightLeft,
  CheckCircle2,
  Search,
  Package,
  UserCheck,
  Clock,
  PenTool,
  RotateCcw,
  MapPin,
  FileText,
  Hash,
  Filter,
  Check,
  AlertTriangle,
  AlertOctagon,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  XCircle,
  Plus,
  Trash2,
  ShoppingCart,
  ListChecks,
  PlusCircle,
  Minus,
  Printer,
  FileCheck2,
  QrCode,
  Barcode,
  Scan,
  Wrench,
  Sparkles,
  ShieldCheck,
  PackageCheck,
  Lock,
  UserX,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface StagedCheckoutItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  barcode: string;
  quantity: number;
  availableStock: number;
  condition: ItemCondition;
  serialNumber?: string;
  notes?: string;
  imageUrl?: string;
  needsRepair?: boolean;
  repairNotes?: string;
  isConsumable?: boolean;
  unitOfMeasure?: string;
}

interface PendingCardProps {
  pending: PendingCheckIn;
  item?: Item;
  onApprove: (id: string, qty: number, cond: ItemCondition, notes?: string) => void;
  onReject: (id: string, reason: string) => void;
  isPrivileged: boolean;
  isSessionAuth: boolean;
  currentUserRoleName: string;
  onUnlock: () => void;
}

const PendingCheckInItemCard: React.FC<PendingCardProps> = ({
  pending,
  item,
  onApprove,
  onReject,
  isPrivileged,
  isSessionAuth,
  currentUserRoleName,
  onUnlock,
}) => {
  const [verifiedQty, setVerifiedQty] = useState<number>(pending.quantity);
  const [verifiedCond, setVerifiedCond] = useState<ItemCondition>(pending.condition);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  const displaySku = item ? item.sku : pending.sku;
  const displayName = item ? item.name : pending.itemName;
  const displayBarcode = item ? item.barcode : pending.barcode;

  const handleApprove = () => {
    onApprove(pending.id, verifiedQty, verifiedCond, adminNotes);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please enter a reason for rejecting this check-in request.');
      return;
    }
    onReject(pending.id, rejectReason);
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                Awaiting Admin Verification
              </span>
              <span className="text-xs text-gray-400 font-mono">{new Date(pending.submittedAt).toLocaleString()}</span>
            </div>
            <h4 className="text-base font-bold text-[#1A1A1A] mt-1">{displayName}</h4>
            <p className="text-xs text-gray-500 font-mono">
              SKU: <strong className="text-black font-semibold">{displaySku}</strong> | Barcode: {displayBarcode}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-[#F9F9F9] p-2.5 rounded-xl border border-[#E5E5E5]">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">Submitted By</span>
          <span className="text-xs font-bold text-[#1A1A1A]">{pending.submittedByUserName}</span>
          <span className="text-[10px] text-gray-500 block">({pending.submittedByUserRole})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Reported Quantity</span>
          <span className="font-bold text-black text-base">{pending.quantity} Units</span>
        </div>
        <div className="p-3 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Reported Condition</span>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
            pending.condition === 'Good' ? 'bg-green-100 text-green-800' :
            pending.condition === 'Fair' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {pending.condition}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Destination Location</span>
          <span className="font-bold text-[#1A1A1A]">{pending.locationName}</span>
        </div>
      </div>

      {pending.notes && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
          <span className="font-bold text-gray-700 block mb-0.5">User Submitted Notes:</span>
          <p className="text-gray-600 italic">"{pending.notes}"</p>
        </div>
      )}

      {pending.signatureDataUrl && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
          <span className="font-bold text-gray-700 block mb-1">Captured Signature:</span>
          <img src={pending.signatureDataUrl} alt="Signature" className="h-10 object-contain border border-gray-300 rounded bg-white p-1" />
        </div>
      )}

      {/* Admin / Inventory Manager Verification Panel */}
      {isPrivileged ? (
        isSessionAuth ? (
          <div className="pt-3 border-t border-[#E5E5E5] bg-[#FAF9F6] p-4 rounded-xl border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-black" />
                <span>Admin Status & Quantity Verification Panel</span>
              </span>
              <span className="text-[10px] text-gray-500">Verify count & physical condition before crediting stock</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Confirmed Quantity to Credit:</label>
                <input
                  type="number"
                  min={1}
                  value={verifiedQty}
                  onChange={(e) => setVerifiedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Confirmed Physical Condition:</label>
                <select
                  value={verifiedCond}
                  onChange={(e) => setVerifiedCond(e.target.value as ItemCondition)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold text-black focus:outline-none focus:border-black"
                >
                  <option value="Good">Good Condition</option>
                  <option value="Fair">Fair (Minor Wear)</option>
                  <option value="Damaged">Damaged / Needs Maintenance</option>
                  <option value="Needs Maintenance">Needs Scheduled Maintenance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Admin Verification Notes (Optional):</label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Physical count matches, packaging verified intact."
                className="w-full px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs text-black placeholder-gray-400 focus:outline-none focus:border-black"
              />
            </div>

            {showRejectBox && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-red-800">Rejection Reason:</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Specify why check-in is rejected (e.g. Quantity discrepancy, missing parts)..."
                  className="w-full px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs text-black focus:outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="px-3 py-1 bg-white text-gray-700 rounded-lg text-xs font-bold border border-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {!showRejectBox && (
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="w-full sm:flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>Confirm Status & Approve Check-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Permission Restricted: Your role (<strong>{currentUserRoleName}</strong>) does not have Verify & Approve Check-In permission. This return is awaiting authorized verification in accordance with the Role Permissions Matrix.</span>
          </div>
        )
      ) : (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Permission Restricted: Your role (<strong>{currentUserRoleName}</strong>) does not have Verify & Approve Check-In permission in the Role Permissions Matrix.</span>
        </div>
      )}
    </div>
  );
};

export const CheckInOutView: React.FC = () => {
  const {
    items,
    transactions,
    locations,
    users,
    pendingCheckIns,
    checkOutItem,
    checkInItem,
    approveCheckIn,
    rejectCheckIn,
    deleteActiveCustody,
    deleteTransaction,
    currentUser,
    currentRole,
    hasPermission,
    isPrivilegedManagerOrAdmin,
    canApproveCheckOut,
    canApproveCheckIn,
    isSessionAuthenticated,
    requiresAuth,
    openLoginModal,
    openCheckInOutModal,
    openCheckoutFormModal,
    generateCheckoutFormFromBatch,
    generateCheckoutFormFromTransaction,
  } = useInventory();

  // Active view mode within Check In/Out tab: 'terminal' | 'pending_verification' | 'active_loans' | 'history'
  const [subTab, setSubTab] = useState<'terminal' | 'pending_verification' | 'active_loans' | 'history'>('terminal');

  // Deletion modals for Active Custody & Transaction Ledger (Admin Only)
  const [activeCustodyToDelete, setActiveCustodyToDelete] = useState<any | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);

  const canDeleteCustody = currentRole.name === 'Admin' || hasPermission('canDeleteActiveCustody');

  // Terminal State
  const [selectedItem, setSelectedItem] = useState<Item | null>(items[0] || null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mode, setMode] = useState<'CHECK_OUT' | 'CHECK_IN'>('CHECK_OUT');

  // Quick Barcode / SKU Scan Input in Terminal
  const [quickScanCode, setQuickScanCode] = useState<string>('');

  // Form inputs
  const [quantity, setQuantity] = useState<number>(1);
  const [assigneeOrProject, setAssigneeOrProject] = useState<string>('');
  const [personCheckingIn, setPersonCheckingIn] = useState<string>('');
  const [locationId, setLocationId] = useState<string>(locations[0]?.id || '');
  const [condition, setCondition] = useState<ItemCondition>('Good');
  const [notes, setNotes] = useState<string>('');
  const [needsRepair, setNeedsRepair] = useState<boolean>(false);
  const [repairNotes, setRepairNotes] = useState<string>('');

  // Check-Out Staging List State (strictly unique by SKU)
  const [stagedCheckoutItems, setStagedCheckoutItems] = useState<StagedCheckoutItem[]>([]);

  // Calculate how many units of an item SKU are currently in the staging cart
  const getStagedQtyForSku = (sku: string) => {
    return stagedCheckoutItems
      .filter((s) => s.sku.toLowerCase() === sku.toLowerCase())
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  // Calculate effective available stock (accounting for both current stock in DB and staging cart)
  const getEffectiveAvailableStock = (item: Item | null) => {
    if (!item) return 0;
    const staged = getStagedQtyForSku(item.sku);
    return Math.max(0, item.quantity - staged);
  };

  // Rapid Barcode / SKU Scanner Handler
  const handleQuickScanAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = quickScanCode.trim().toLowerCase();
    if (!cleanCode) return;

    // Search for item matching exact SKU or Barcode
    const matched = items.find(
      (i) =>
        i.sku.toLowerCase() === cleanCode ||
        i.barcode.toLowerCase() === cleanCode ||
        i.id.toLowerCase() === cleanCode ||
        (i.pieceSkus && i.pieceSkus.some((ps) => ps.toLowerCase() === cleanCode))
    );

    if (!matched) {
      alert(`No inventory item found matching SKU / Barcode: "${quickScanCode}". Please verify SKU or select from catalog.`);
      return;
    }

    if (matched.quantity <= 0) {
      alert(`SKU "${matched.sku}" (${matched.name}) is NO LONGER AVAILABLE for check-out. All units are currently checked out on active loan. It cannot be checked out again until returned or checked in.`);
      setSelectedItem(matched);
      return;
    }

    const effectiveStock = getEffectiveAvailableStock(matched);
    if (effectiveStock <= 0) {
      alert(`All ${matched.quantity} unit(s) of SKU "${matched.sku}" (${matched.name}) are already added to your check-out list!`);
      setSelectedItem(matched);
      return;
    }

    // Check if this item SKU is already staged with same condition
    const isRepair = condition === 'Needs Maintenance' || condition === 'Damaged' || needsRepair;
    const existingIndex = stagedCheckoutItems.findIndex(
      (s) => s.itemId === matched.id && s.condition === condition && s.needsRepair === isRepair
    );

    if (existingIndex >= 0) {
      const existing = stagedCheckoutItems[existingIndex];
      const totalStagedForThisItem = stagedCheckoutItems
        .filter((s) => s.itemId === matched.id)
        .reduce((sum, s) => sum + s.quantity, 0);

      if (totalStagedForThisItem + 1 > matched.quantity) {
        alert(`Cannot add more units of SKU "${matched.sku}". Staged quantity would exceed stock (${matched.quantity}).`);
        return;
      }
      setStagedCheckoutItems((prev) =>
        prev.map((s, idx) => (idx === existingIndex ? { ...s, quantity: s.quantity + 1 } : s))
      );
    } else {
      const newItem: StagedCheckoutItem = {
        id: `stg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemId: matched.id,
        itemName: matched.name,
        sku: matched.sku,
        barcode: matched.barcode,
        quantity: 1,
        availableStock: matched.quantity,
        condition: condition,
        notes: notes || undefined,
        imageUrl: matched.imageUrl,
        needsRepair: isRepair,
        repairNotes: repairNotes || undefined,
        isConsumable: matched.isConsumable,
        unitOfMeasure: matched.unitOfMeasure,
      };
      setStagedCheckoutItems((prev) => [...prev, newItem]);
    }

    setQuickScanCode('');
    setSelectedItem(matched);
  };

  // Add selected item to checkout staging list by SKU
  const handleAddToCheckoutList = () => {
    if (!selectedItem) return;

    if (selectedItem.quantity <= 0) {
      alert(`SKU "${selectedItem.sku}" (${selectedItem.name}) is fully checked out on loan. It must be checked in or returned before it can be checked out again.`);
      return;
    }

    const effectiveAvailable = getEffectiveAvailableStock(selectedItem);
    if (effectiveAvailable <= 0) {
      alert(`All ${selectedItem.quantity} unit(s) of SKU "${selectedItem.sku}" are already staged in your check-out list. No further units are available.`);
      return;
    }

    if (quantity <= 0) {
      alert('Please specify a valid quantity to check out.');
      return;
    }

    if (quantity > effectiveAvailable) {
      alert(`Requested quantity (${quantity}) exceeds available stock (${effectiveAvailable}) for SKU ${selectedItem.sku}.`);
      return;
    }

    const isRepairFlagged = condition === 'Needs Maintenance' || condition === 'Damaged' || needsRepair;
    const targetSku = selectedItem.sku;
    const existingIndex = stagedCheckoutItems.findIndex(
      (s) =>
        s.sku.toLowerCase() === targetSku.toLowerCase() &&
        s.condition === condition &&
        s.needsRepair === isRepairFlagged
    );

    if (existingIndex >= 0) {
      const existing = stagedCheckoutItems[existingIndex];
      const newTotalQty = existing.quantity + quantity;
      if (newTotalQty > selectedItem.quantity) {
        alert(`Cannot add ${quantity} more units. Total staged quantity (${newTotalQty}) would exceed available stock (${selectedItem.quantity}).`);
        return;
      }

      setStagedCheckoutItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: newTotalQty, condition, notes: notes || item.notes, repairNotes: repairNotes || item.repairNotes }
            : item
        )
      );
    } else {
      // Distinct SKU or condition creates an independent line item
      const newItem: StagedCheckoutItem = {
        id: `stg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        sku: targetSku,
        barcode: selectedItem.barcode,
        quantity,
        availableStock: selectedItem.quantity,
        condition,
        notes: notes.trim() || (isRepairFlagged && repairNotes ? `[Inspection: ${repairNotes}]` : undefined),
        imageUrl: selectedItem.imageUrl,
        needsRepair: isRepairFlagged,
        repairNotes: repairNotes.trim() || undefined,
        isConsumable: selectedItem.isConsumable,
        unitOfMeasure: selectedItem.unitOfMeasure,
      };
      setStagedCheckoutItems((prev) => [...prev, newItem]);
    }

    setNotes('');
    setRepairNotes('');
    setNeedsRepair(false);
    setQuantity(1);
  };

  const handleRemoveStagedItem = (id: string) => {
    setStagedCheckoutItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateStagedQty = (id: string, delta: number) => {
    setStagedCheckoutItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = Math.max(1, Math.min(item.availableStock, item.quantity + delta));
          return { ...item, quantity: updated };
        }
        return item;
      })
    );
  };

  const handleApproveBatchCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedCheckoutItems.length === 0) {
      alert('Your check-out list is empty! Add items from the panel above before approving.');
      return;
    }

    if (!assigneeOrProject.trim()) {
      alert('Please enter an Assignee / Person / Project ID for this check-out batch.');
      return;
    }

    let signatureUrl = undefined;
    if (hasSigned && canvasRef.current) {
      signatureUrl = canvasRef.current.toDataURL('image/png');
    }

    // Build batch list for checkout processing and agreement report generation
    const batchItemsToProcess: Array<{
      item: Item;
      quantity: number;
      condition?: ItemCondition;
      serialNumber?: string;
      notes?: string;
    }> = [];

    let successCount = 0;
    stagedCheckoutItems.forEach((staged) => {
      const ok = checkOutItem(
        staged.itemId,
        staged.quantity,
        assigneeOrProject,
        staged.condition,
        staged.notes || (staged.needsRepair ? `[Inspection/Repair: ${staged.repairNotes}]` : notes),
        signatureUrl,
        staged.serialNumber
      );
      if (ok) {
        successCount++;
        const matchedItem: Item = items.find((i) => i.id === staged.itemId) || {
          id: staged.itemId,
          name: staged.itemName,
          sku: staged.sku,
          barcode: staged.barcode,
          barcodeType: 'CODE128',
          category: 'General',
          description: '',
          quantity: staged.quantity,
          reorderPoint: 5,
          safetyStock: 2,
          unitPrice: 0,
          costPrice: 0,
          locationId: locations[0]?.id || '',
          locationName: locations[0]?.name || '',
          vendorId: '',
          vendorName: '',
          condition: staged.condition || 'Good',
          tags: [],
        };
        batchItemsToProcess.push({
          item: {
            ...matchedItem,
            sku: staged.sku,
            barcode: staged.barcode,
          },
          quantity: staged.quantity,
          condition: staged.condition,
          serialNumber: staged.serialNumber,
          notes: staged.notes || (staged.needsRepair ? `[Repair Flagged: ${staged.repairNotes}]` : notes),
        });
      }
    });

    if (successCount > 0) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      
      // Immediately generate printable checkout agreement form data and open the release document modal
      const checkoutFormData = generateCheckoutFormFromBatch(
        batchItemsToProcess,
        assigneeOrProject,
        notes,
        signatureUrl
      );

      setStagedCheckoutItems([]);
      setAssigneeOrProject('');
      setNotes('');
      setRepairNotes('');
      setNeedsRepair(false);
      clearCanvas();

      openCheckoutFormModal(checkoutFormData);
    }
  };

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSigned, setHasSigned] = useState<boolean>(false);

  // Initialize or reset signature pad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000'; // Black stroke for clean theme
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [selectedItem, mode, subTab]);

  // Handle item selection change
  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setQuantity(1);
    setLocationId(item.locationId);
    clearCanvas();
  };

  // Drawing handlers for signature pad
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSigned(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasSigned(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    let signatureUrl = undefined;
    if (hasSigned && canvasRef.current) {
      signatureUrl = canvasRef.current.toDataURL('image/png');
    }

    if (mode === 'CHECK_OUT') {
      if (!assigneeOrProject.trim()) {
        alert('Please specify assignee or project for check-out tracking.');
        return;
      }
      const success = checkOutItem(
        selectedItem.id,
        quantity,
        assigneeOrProject,
        condition,
        notes,
        signatureUrl,
        undefined
      );
      if (success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setNotes('');
        setAssigneeOrProject('');
        clearCanvas();
      }
    } else {
      const fullNotes = personCheckingIn
        ? `Returned By: ${personCheckingIn}${notes ? ' | ' + notes : ''}`
        : notes;

      const success = checkInItem(
        selectedItem.id,
        quantity,
        locationId,
        condition,
        fullNotes,
        signatureUrl
      );
      if (success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        alert(`Check-in request for "${selectedItem.name}" submitted successfully!\n\nStatus: PENDING ADMIN VERIFICATION\nAn Administrator must inspect physical status and quantity before stock is updated.`);
        setSubTab('pending_verification');
        setNotes('');
        setPersonCheckingIn('');
        clearCanvas();
      }
    }
  };

  // Filter items for search - synchronized with InventoryView filters
  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.pieceSkus && i.pieceSkus.some((ps) => ps.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (i.tags && i.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Staff & Privileged Permissions for Check-In Custody Restriction
  const isPrivileged = isPrivilegedStaffManager(currentUser);

  // Active checked out transactions (all loans currently unreturned in organization)
  const allCheckedOutTransactions = transactions.filter((t) => {
    if (t.type !== 'CHECK_OUT') return false;
    const remaining = t.remainingOutQuantity !== undefined ? t.remainingOutQuantity : t.quantity;
    return remaining > 0;
  });

  // For Active Custody tab: Admins/Managers see all; Field/Staff users see their personal loans
  const myCheckedOutLoans = allCheckedOutTransactions.filter((tx) => isLoanAssignedToUser(tx, currentUser));
  const checkedOutTransactions = isPrivileged ? allCheckedOutTransactions : myCheckedOutLoans;

  // Selected item custody stats
  const selectedItemMyCheckedOutQty = selectedItem
    ? getUserActiveCheckedOutQuantity(selectedItem.id, currentUser, transactions)
    : 0;
  const selectedItemOtherLoans = selectedItem
    ? getOtherStaffLoansForItem(selectedItem.id, currentUser, transactions)
    : [];
  const isSelectedItemRestrictedForStaff =
    mode === 'CHECK_IN' && !isPrivileged && selectedItemMyCheckedOutQty <= 0;

  const pendingRequests = pendingCheckIns.filter((p) => p.status === 'PENDING');
  const reviewedRequests = pendingCheckIns.filter((p) => p.status !== 'PENDING');
  const hasAdminAccess = currentRole.name === 'Admin' || currentRole.name === 'Inventory Manager' || hasPermission('canManageUsers') || hasPermission('canVerifyCheckIn');

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* View Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2 tracking-tight">
            <ArrowRightLeft className="w-6 h-6 text-black" />
            <span>Check-In / Check-Out Station</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Process equipment check-outs, submit check-ins for admin verification, track custody assignments, and capture signatures.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E5E5E5] shadow-xs flex-wrap">
          <button
            onClick={() => setSubTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'terminal' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Quick Terminal</span>
          </button>
          <button
            onClick={() => setSubTab('pending_verification')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'pending_verification' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Verification</span>
            {pendingRequests.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                subTab === 'pending_verification' ? 'bg-amber-400 text-black' : 'bg-amber-500 text-white'
              }`}>
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('active_loans')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'active_loans' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Active Custody ({checkedOutTransactions.length})</span>
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              subTab === 'history' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Movement History</span>
          </button>
        </div>
      </div>

      {subTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Item Selection List (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[#E5E5E5] rounded-2xl p-4 shadow-sm flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <h3 className="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">Select Item to Process</h3>
              <span className="text-[10px] text-gray-400 font-bold">{filteredItems.length} Available SKUs</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, SKU, or barcode..."
                className="w-full pl-9 pr-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-black font-medium"
              />
            </div>

              {/* Scrollable Item List */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const effectiveStock = getEffectiveAvailableStock(item);
                const isFullyCheckedOut = item.quantity <= 0;
                const isFullyStaged = item.quantity > 0 && effectiveStock <= 0;
                const myCheckedOutForThisItem = getUserActiveCheckedOutQuantity(item.id, currentUser, transactions);
                const otherLoansForThisItem = getOtherStaffLoansForItem(item.id, currentUser, transactions);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-[#F0F0F0] border-black shadow-xs'
                        : isFullyCheckedOut && mode === 'CHECK_OUT'
                        ? 'bg-gray-50 border-gray-200 opacity-75 hover:opacity-100 hover:bg-[#F9F9F9]'
                        : 'bg-white border-[#E5E5E5] hover:bg-[#F9F9F9]'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-[#F5F5F5] border border-[#E5E5E5]" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-gray-400 shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-[#1A1A1A] text-xs truncate">{item.name}</h4>
                        {mode === 'CHECK_IN' && !isPrivileged ? (
                          myCheckedOutForThisItem > 0 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0 flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                              <span>In Your Custody ({myCheckedOutForThisItem})</span>
                            </span>
                          ) : otherLoansForThisItem.length > 0 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Held by Others</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                              {item.quantity} In Stock
                            </span>
                          )
                        ) : isFullyCheckedOut ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Checked Out</span>
                          </span>
                        ) : isFullyStaged && mode === 'CHECK_OUT' ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                            Staged ({item.quantity})
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            item.quantity <= item.reorderPoint ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {mode === 'CHECK_OUT' ? `${effectiveStock} Avail` : `${item.quantity} Qty`}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {item.sku}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                        <span className="truncate">{item.locationName}</span>
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <span className="text-[9px] text-blue-600 font-mono font-bold shrink-0 ml-1">
                            {item.serialNumbers.length} SNs
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive Check In/Out Terminal (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-6">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E5E5] gap-3">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-base flex items-center gap-2">
                  <span>Terminal Mode: {mode === 'CHECK_OUT' ? 'Check-Out Dispatch' : 'Item Check-In Return'}</span>
                </h3>
                <p className="text-gray-400 font-mono text-[11px]">
                  {mode === 'CHECK_OUT'
                    ? 'Stage items by SKU into a check-out list before final approval'
                    : 'Submit items for admin count, physical condition & repair verification'}
                </p>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center bg-[#F5F5F5] p-1 rounded-xl border border-[#E5E5E5] shrink-0">
                <button
                  type="button"
                  onClick={() => setMode('CHECK_OUT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    mode === 'CHECK_OUT'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Check Out Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('CHECK_IN')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    mode === 'CHECK_IN'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Check In Mode</span>
                </button>
              </div>
            </div>

            {mode === 'CHECK_OUT' ? (
              <div className="space-y-6 text-xs">
                {/* Quick Scan / Barcode Gun Input */}
                <form onSubmit={handleQuickScanAdd} className="p-3 bg-white border border-[#E5E5E5] rounded-xl flex items-center gap-2 shadow-xs">
                  <div className="flex items-center gap-2 text-black font-bold text-xs shrink-0 pl-1">
                    <Scan className="w-4 h-4 text-blue-600" />
                    <span className="hidden sm:inline">Quick SKU / Barcode Scan:</span>
                  </div>
                  <input
                    type="text"
                    value={quickScanCode}
                    onChange={(e) => setQuickScanCode(e.target.value)}
                    placeholder="Scan or type exact SKU / Barcode (press Enter to stage)..."
                    className="flex-1 px-3 py-1.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-black font-semibold"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Scan & Add SKU</span>
                  </button>
                </form>

                {/* Section 1: Item Selector & Staging Configurator */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E5E5] rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                    <span className="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-blue-600" />
                      <span>Configure Item (SKU) to Stage</span>
                    </span>
                    {selectedItem && (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          selectedItem.quantity <= 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : getEffectiveAvailableStock(selectedItem) <= 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          Available Stock: {getEffectiveAvailableStock(selectedItem)} / {selectedItem.quantity} Units
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedItem ? (
                    <div className="space-y-4">
                      {/* Item Summary Banner */}
                      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E5E5]">
                        <div className="flex items-center gap-3">
                          {selectedItem.imageUrl ? (
                            <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-11 h-11 rounded-lg object-cover bg-white border border-gray-200" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-[#1A1A1A] text-sm">{selectedItem.name}</h4>
                            <p className="text-gray-500 font-mono text-[10px]">
                              SKU: <span className="font-bold text-black">{selectedItem.sku}</span> | Barcode: {selectedItem.barcode} | Location: {selectedItem.locationName}
                            </p>
                          </div>
                        </div>

                        {selectedItem.quantity <= 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setMode('CHECK_IN');
                              setSelectedItem(selectedItem);
                            }}
                            className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Check-In Item</span>
                          </button>
                        )}
                      </div>

                      {/* Out of Stock / Staged Lock Warning Callout */}
                      {selectedItem.quantity <= 0 ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>SKU Unavailable for Check-Out (Active Loan)</span>
                          </div>
                          <p className="text-xs text-rose-800 leading-relaxed">
                            This item’s SKU (<span className="font-mono font-bold">{selectedItem.sku}</span>) has <strong>0 available units in stock</strong> because all units have been checked out on active loans. It is <strong>no longer available for check out</strong> unless it has been returned or checked in.
                          </p>
                        </div>
                      ) : getEffectiveAvailableStock(selectedItem) <= 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>All Units Staged in Current Check-Out List</span>
                          </div>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            All {selectedItem.quantity} unit(s) of SKU <span className="font-mono font-bold">{selectedItem.sku}</span> are already in your check-out staging list below. No additional units can be staged.
                          </p>
                        </div>
                      ) : null}

                      {/* Main Configuration Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Target Item SKU Info */}
                        <div>
                          <label className="text-gray-700 font-bold mb-1 block">
                            Target SKU
                          </label>
                          <div className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-lg font-mono font-bold text-black text-xs flex items-center justify-between">
                            <span>{selectedItem.sku}</span>
                            <span className="text-[10px] text-gray-400 font-normal">{selectedItem.category}</span>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="text-gray-700 font-bold mb-1 block">
                            Quantity to Stage * (Max: {getEffectiveAvailableStock(selectedItem)})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, getEffectiveAvailableStock(selectedItem))}
                            disabled={getEffectiveAvailableStock(selectedItem) <= 0}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(getEffectiveAvailableStock(selectedItem), parseInt(e.target.value) || 1)))}
                            className="w-full px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-black font-bold text-xs focus:outline-none focus:border-black disabled:bg-gray-100 disabled:opacity-60"
                          />
                        </div>
                      </div>

                      {/* Equipment Condition & Inspection / Check & Repair Controls */}
                      <div className="p-3 bg-white border border-[#E5E5E5] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-gray-700 font-bold text-xs flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-black" />
                            <span>Physical Condition & Maintenance / Check & Repair Inspection</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setNeedsRepair(!needsRepair)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                              needsRepair
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                            }`}
                          >
                            <Wrench className="w-3 h-3" />
                            <span>{needsRepair ? '✓ Flagged for Check & Repair' : 'Flag for Check & Repair'}</span>
                          </button>
                        </div>

                        {/* Condition Selector Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['Good', 'Fair', 'Damaged', 'Needs Maintenance'] as ItemCondition[]).map((cond) => (
                            <button
                              type="button"
                              key={cond}
                              onClick={() => {
                                setCondition(cond);
                                if (cond === 'Needs Maintenance' || cond === 'Damaged') {
                                  setNeedsRepair(true);
                                }
                              }}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                condition === cond
                                  ? cond === 'Damaged' || cond === 'Needs Maintenance'
                                    ? 'bg-red-50 text-red-700 border-red-300 font-black'
                                    : 'bg-black text-white border-black'
                                  : 'bg-[#F9F9F9] text-gray-600 border-[#E5E5E5] hover:bg-[#F0F0F0]'
                              }`}
                            >
                              {cond === 'Needs Maintenance' && <Wrench className="w-3 h-3 text-red-500" />}
                              <span>{cond}</span>
                            </button>
                          ))}
                        </div>

                        {/* Check & Repair / Maintenance Inspection Notes Panel */}
                        {(needsRepair || condition === 'Needs Maintenance' || condition === 'Damaged') && (
                          <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Equipment Check & Repair Notice</span>
                            </div>
                            <input
                              type="text"
                              value={repairNotes}
                              onChange={(e) => setRepairNotes(e.target.value)}
                              placeholder="Describe check & repair requirement (e.g. calibration check, screen flicker, replace connector)..."
                              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-black placeholder-gray-400 focus:outline-none focus:border-black font-medium"
                            />
                          </div>
                        )}
                      </div>

                      {/* Staging Action Button */}
                      <div>
                        <button
                          type="button"
                          onClick={handleAddToCheckoutList}
                          disabled={getEffectiveAvailableStock(selectedItem) <= 0}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:border disabled:border-gray-300 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>
                            {getEffectiveAvailableStock(selectedItem) <= 0
                              ? 'SKU Unavailable for Check-Out (Check In / Return Required)'
                              : '+ Add SKU to Check-Out List'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">Select an item from the catalog on the left to configure.</p>
                  )}
                </div>

                {/* Section 2: List of Items to be Checked Out */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-black" />
                      <h4 className="font-bold text-[#1A1A1A] text-sm uppercase tracking-wider">
                        List of Items to be Checked Out
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                      {stagedCheckoutItems.length} {stagedCheckoutItems.length === 1 ? 'Item SKU' : 'Item SKUs'} Staged
                    </span>
                  </div>

                  {stagedCheckoutItems.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[#E5E5E5] rounded-2xl text-center space-y-2 bg-[#F9F9F9]">
                      <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto" />
                      <h5 className="font-bold text-[#1A1A1A] text-xs">No Items Staged for Check-Out</h5>
                      <p className="text-gray-400 text-[11px] max-w-sm mx-auto">
                        Select an item from the left catalog, set quantity, and click <span className="font-bold text-blue-600">+ Add SKU to Check-Out List</span> to build your list before approval.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Staged Items Cards */}
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {stagedCheckoutItems.map((staged) => (
                          <div
                            key={staged.id}
                            className="bg-white border border-[#E5E5E5] rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-400 transition"
                          >
                            <div className="flex items-center gap-3">
                              {staged.imageUrl ? (
                                <img src={staged.imageUrl} alt={staged.itemName} className="w-10 h-10 rounded-lg object-cover bg-gray-50 border" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-50 border flex items-center justify-center text-gray-400 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <h5 className="font-bold text-[#1A1A1A] text-xs">{staged.itemName}</h5>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-gray-800 font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                    SKU: {staged.sku}
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                                    staged.condition === 'Damaged' || staged.condition === 'Needs Maintenance'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-green-50 text-green-700 border-green-200'
                                  }`}>
                                    {staged.condition}
                                  </span>
                                  {staged.needsRepair && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                      <Wrench className="w-2.5 h-2.5 text-amber-700" />
                                      <span>Check & Repair</span>
                                    </span>
                                  )}
                                </div>
                                {staged.repairNotes && (
                                  <p className="text-[10px] text-amber-700 mt-1 italic">
                                    Repair: {staged.repairNotes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                              {/* Quantity Stepper */}
                              <div className="flex items-center border border-[#E5E5E5] rounded-lg bg-[#F5F5F5] overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStagedQty(staged.id, -1)}
                                  className="px-2 py-1 hover:bg-gray-200 text-gray-700 font-bold transition cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 py-1 font-bold text-xs bg-white text-black text-center min-w-[32px]">
                                  {staged.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStagedQty(staged.id, 1)}
                                  className="px-2 py-1 hover:bg-gray-200 text-gray-700 font-bold transition cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveStagedItem(staged.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Remove from list"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Staging List Totals Bar */}
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-bold text-blue-900">
                        <span>Check-Out Batch Totals:</span>
                        <span>
                          {stagedCheckoutItems.length} SKUs | {stagedCheckoutItems.reduce((acc, curr) => acc + curr.quantity, 0)} Total Units
                        </span>
                      </div>

                      {/* Section 3: Batch Approval Form */}
                      <form onSubmit={handleApproveBatchCheckout} className="space-y-4 pt-3 border-t border-[#E5E5E5]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <PersonSelectorInput
                            label="Assignee / Recipient Person (Checking Out)"
                            value={assigneeOrProject}
                            onChange={(val) => setAssigneeOrProject(val)}
                            required
                            placeholder="Select from dropdown or scan QR code..."
                          />

                          <div>
                            <label className="text-gray-700 font-bold mb-1 block">
                              Transaction Purpose / Notes (Optional)
                            </label>
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="e.g. Scheduled site equipment deployment"
                              className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] focus:outline-none focus:border-black text-xs"
                            />
                          </div>
                        </div>

                        {/* Digital Sign-off Pad */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-gray-700 font-bold flex items-center gap-1.5">
                              <PenTool className="w-3.5 h-3.5 text-black" />
                              <span>Recipient Sign-Off Signature</span>
                            </label>
                            {hasSigned && (
                              <button
                                type="button"
                                onClick={clearCanvas}
                                className="text-[10px] text-gray-500 hover:text-black font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Clear Signature</span>
                              </button>
                            )}
                          </div>
                          <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl p-1 relative">
                            <canvas
                              ref={canvasRef}
                              width={400}
                              height={80}
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={stopDrawing}
                              className="w-full h-16 rounded-lg cursor-crosshair bg-white touch-none"
                            />
                            {!hasSigned && (
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-[11px] italic">
                                Draw signature here before approval...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Role Authorization Warnings */}
                        {!hasPermission('canCheckOut') && (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Authorization Required: Your role (<strong>{currentUser.roleName}</strong>) does not have permission to check out items in the Role Permissions Matrix.</span>
                          </div>
                        )}

                        {hasPermission('canCheckOut') && requiresAuth(currentUser) && !isSessionAuthenticated && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                              <span>Session locked. Unlock your {currentUser.roleName} session to approve check-out.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => openLoginModal(currentUser)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                            >
                              Unlock Session
                            </button>
                          </div>
                        )}

                        {/* Approve Button */}
                        <button
                          type="submit"
                          disabled={!canApproveCheckOut || !assigneeOrProject.trim()}
                          className="w-full py-3 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span>
                            {!hasPermission('canCheckOut')
                              ? `Check-Out Restricted (${currentUser.roleName})`
                              : !isSessionAuthenticated && requiresAuth(currentUser)
                              ? 'Unlock Session to Approve Check-Out'
                              : `Approve & Execute Check-Out (${stagedCheckoutItems.length} ${stagedCheckoutItems.length === 1 ? 'Item' : 'Items'})`}
                          </span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* CHECK IN MODE FORM */
              selectedItem ? (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {/* Stock Overview Card */}
                  <div className="p-3.5 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Item</span>
                      <span className="font-bold text-[#1A1A1A] text-xs truncate block">{selectedItem.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Bin Location</span>
                      <span className="font-bold text-gray-700 text-xs truncate block">{selectedItem.locationName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Active Stock</span>
                      <span className="font-bold text-gray-700 text-xs">{selectedItem.quantity} Units</span>
                    </div>
                  </div>

                  {/* Staff Return Restriction Notice */}
                  {!isPrivileged && (
                    isSelectedItemRestrictedForStaff ? (
                      <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                          <UserX className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Staff Return Policy Restriction</span>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed">
                          {selectedItemOtherLoans.length > 0 ? (
                            <>
                              Staff can only return equipment they have checked out. This item is currently in the custody of{' '}
                              <strong className="text-rose-950 underline">
                                {Array.from(new Set(selectedItemOtherLoans.map((l) => l.assigneeOrProject || l.userName))).join(', ')}
                              </strong>
                              . You cannot return equipment checked out by other staff members.
                            </>
                          ) : (
                            <>
                              Staff can only return equipment they have checked out. You do not currently have an active check-out record for{' '}
                              <strong>{selectedItem.name}</strong>.
                            </>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            Your Active Custody: <strong>{selectedItemMyCheckedOutQty} {selectedItemMyCheckedOutQty === 1 ? 'unit' : 'units'}</strong> checked out to you
                          </span>
                        </div>
                        <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-mono text-[10px]">
                          Max Return: {selectedItemMyCheckedOutQty}
                        </span>
                      </div>
                    )
                  )}

                  {/* Person Checking In (Returned By) */}
                  <PersonSelectorInput
                    label="Person Checking In Item (Returned By)"
                    value={personCheckingIn}
                    onChange={(val) => setPersonCheckingIn(val)}
                    placeholder="Select returnee from dropdown or scan QR code..."
                  />

                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-700 font-bold mb-1 block">Quantity to Check In *</label>
                      <input
                        type="number"
                        min={1}
                        max={!isPrivileged ? Math.max(1, selectedItemMyCheckedOutQty) : 9999}
                        disabled={isSelectedItemRestrictedForStaff}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] font-bold text-sm focus:outline-none focus:border-black disabled:bg-gray-100 disabled:opacity-60"
                        required
                      />
                      {!isPrivileged && (
                        <span className="text-[10px] text-gray-500 mt-1 block">
                          {isSelectedItemRestrictedForStaff
                            ? 'Cannot return item not in your custody'
                            : `Max returnable from your loan: ${selectedItemMyCheckedOutQty}`}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-gray-700 font-bold mb-1 block">Destination Bin / Location</label>
                      <select
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Condition & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-700 font-bold mb-1 block">Returned Item Condition</label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as ItemCondition)}
                        className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] font-bold focus:outline-none focus:border-black"
                      >
                        <option value="Good">Good Condition</option>
                        <option value="Fair">Fair (Minor Wear)</option>
                        <option value="Damaged">Damaged / Needs Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-700 font-bold mb-1 block">Return Notes</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Returned after site survey"
                        className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  {/* Signature Pad */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-gray-700 font-bold flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-black" />
                        <span>Returnee Signature</span>
                      </label>
                      {hasSigned && (
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-[10px] text-gray-500 hover:text-black font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear Signature</span>
                        </button>
                      )}
                    </div>
                    <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl p-1 relative">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={80}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-16 rounded-lg cursor-crosshair bg-white touch-none"
                      />
                      {!hasSigned && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-[11px] italic">
                          Draw signature here using mouse or touchscreen...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Submit Button */}
                  {!hasPermission('canCheckIn') && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Authorization Required: Your role (<strong>{currentUser.roleName}</strong>) does not have permission to check in items in the Role Permissions Matrix.</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={!hasPermission('canCheckIn') || isSelectedItemRestrictedForStaff}
                    className="w-full py-3 rounded-xl font-bold text-xs text-white bg-black hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>
                      {!hasPermission('canCheckIn')
                        ? `Check-In Restricted (${currentUser.roleName})`
                        : isSelectedItemRestrictedForStaff
                        ? 'Return Restricted (Item Not In Your Custody)'
                        : 'Submit Check-In Request for Admin Verification'}
                    </span>
                  </button>
                </form>
              ) : (
                <div className="py-20 text-center text-gray-400 space-y-2">
                  <Package className="w-12 h-12 mx-auto opacity-30 text-black" />
                  <p className="text-xs font-medium">Select an item from the catalog on the left to process a check-in return.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {subTab === 'pending_verification' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-sm">Admin Pending Check-In Verification Station</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Items returned by personnel remain in <span className="font-bold text-amber-700">PENDING</span> custody status until an Administrator or Inventory Manager confirms physical item count and condition.
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs font-bold text-gray-700 flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Queue: {pendingRequests.length} Pending</span>
            </div>
          </div>

          {/* Pending Requests List */}
          {pendingRequests.length === 0 ? (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-12 text-center text-gray-400 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#1A1A1A] text-sm">All Clear! No Pending Verification Requests</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                All item returns have been physically verified and credited to active stock inventory.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((pending) => {
                const item = items.find((i) => i.id === pending.itemId);
                return (
                  <PendingCheckInItemCard
                    key={pending.id}
                    pending={pending}
                    item={item}
                    onApprove={(id, qty, cond, notes) => {
                      approveCheckIn(id, qty, cond, notes);
                      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                    }}
                    onReject={(id, reason) => {
                      rejectCheckIn(id, reason);
                    }}
                    isPrivileged={hasPermission('canVerifyCheckIn')}
                    isSessionAuth={isSessionAuthenticated}
                    currentUserRoleName={currentUser.roleName}
                    onUnlock={() => openLoginModal(currentUser)}
                  />
                );
              })}
            </div>
          )}

          {/* Recently Reviewed Requests History */}
          {reviewedRequests.length > 0 && (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4 mt-8">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">Verification Decision Log</h3>
                  <p className="text-xs text-gray-500">Audit trail of approved and rejected check-in requests.</p>
                </div>
                <span className="text-xs text-gray-400 font-bold">{reviewedRequests.length} Reviewed</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5] text-[#1A1A1A] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Submitted By</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Reviewed By</th>
                      <th className="py-2.5 px-3">Notes / Reason</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {reviewedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F9F9F9]">
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#1A1A1A]">{req.itemName}</td>
                        <td className="py-2.5 px-3 text-gray-700">{req.submittedByUserName}</td>
                        <td className="py-2.5 px-3 font-bold">{req.quantity}</td>
                        <td className="py-2.5 px-3 text-gray-600">{req.reviewedByUserName || 'System Admin'}</td>
                        <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">{req.rejectionReason || req.adminNotes || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-400 text-[10px]">{new Date(req.submittedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'active_loans' && (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E5E5] pb-3 gap-2">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                <span>Active Custody & Checked-Out Items</span>
                {!isPrivileged && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                    My Custody
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                {!isPrivileged
                  ? `Showing your personal active loans (${checkedOutTransactions.length}). Staff can only return equipment they personally checked out.`
                  : 'List of equipment currently issued out to field staff, projects, or work sites.'}
              </p>
            </div>
          </div>

          {checkedOutTransactions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto opacity-30 text-green-600" />
              <p className="text-xs font-medium">
                {!isPrivileged
                  ? 'You currently have no equipment checked out under your custody.'
                  : 'No items currently checked out! All equipment is in inventory.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkedOutTransactions.map((tx) => {
                const matchedItem = items.find((i) => i.id === tx.itemId || i.sku === tx.sku);
                const displaySku = matchedItem ? matchedItem.sku : tx.sku;
                const displayName = matchedItem ? matchedItem.name : tx.itemName;
                const displayBarcode = matchedItem ? matchedItem.barcode : (tx.barcode || tx.sku);
                const remainingQty = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;
                const isMyLoan = isLoanAssignedToUser(tx, currentUser);
                const isRestrictedForThisStaff = !isPrivileged && !isMyLoan;

                // Check pending & rejected verification states for this checkout loan
                const pendingVerification = pendingCheckIns.find(
                  (p) => (p.checkoutTxId === tx.id || (!p.checkoutTxId && p.itemId === tx.itemId)) && p.status === 'PENDING'
                );
                const isPending = !!pendingVerification;

                const latestRejectedVerification = pendingCheckIns.find(
                  (p) => (p.checkoutTxId === tx.id || (!p.checkoutTxId && p.itemId === tx.itemId)) && p.status === 'REJECTED'
                );

                const handleQuickReturn = () => {
                  if (!matchedItem || isPending || isRestrictedForThisStaff) return;
                  const success = checkInItem(
                    matchedItem.id,
                    remainingQty,
                    matchedItem.locationId,
                    'Good',
                    `Returned from ${tx.assigneeOrProject || 'Active Loan'}`,
                    undefined,
                    tx.id
                  );
                  if (success) {
                    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                  }
                };

                return (
                  <div key={tx.id} className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {isPending ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            PENDING VERIFICATION
                          </span>
                        ) : latestRejectedVerification ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            CHECKED OUT (RETURN REJECTED)
                          </span>
                        ) : isMyLoan ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            MY ACTIVE LOAN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 uppercase">
                            CHECKED OUT
                          </span>
                        )}
                        <h4 className="font-bold text-[#1A1A1A] text-sm mt-1">{displayName}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black text-sm">{remainingQty} Units</span>
                        {canDeleteCustody && (
                          <button
                            onClick={() => {
                              setActiveCustodyToDelete(tx);
                              setRestoreStockOnDelete(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200 cursor-pointer"
                            title="Admin: Delete / Void Active Custody Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="font-bold">Return Pending Verification:</span> Submitted for {pendingVerification.quantity} units by {pendingVerification.submittedByUserName}. Awaiting Admin physical count & inspection.
                        </div>
                      </div>
                    )}

                    {!isPending && latestRejectedVerification && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Return Rejected:</span> {latestRejectedVerification.rejectionReason || 'Physical verification failed.'}
                          <div className="text-[10px] text-rose-700 mt-0.5 font-normal">You can re-inspect the equipment and re-submit the return to stock.</div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-gray-800 bg-white px-1.5 py-0.5 rounded border border-[#E5E5E5] font-semibold">
                          SKU: {displaySku}
                        </span>
                        <span className="font-mono text-[10px] text-gray-700 bg-white px-1.5 py-0.5 rounded border border-[#E5E5E5]">
                          Code: {displayBarcode}
                        </span>
                        {tx.serialNumber && (
                          <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                            SN: {tx.serialNumber}
                          </span>
                        )}
                      </div>
                      <p>
                        Assignee: <span className="font-bold text-[#1A1A1A]">{tx.assigneeOrProject || 'N/A'}</span>
                      </p>
                      <p>
                        Issued By: <span className="text-gray-700 font-medium">{tx.userName}</span>
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">Date: {tx.timestamp}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                      <button
                        onClick={() => openCheckoutFormModal(generateCheckoutFormFromTransaction(tx))}
                        className="flex-1 py-2 bg-white hover:bg-gray-100 text-black border border-[#E5E5E5] rounded-lg font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Print Check-Out Release Agreement Voucher"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span>Print Voucher</span>
                      </button>

                      {matchedItem && (
                        <button
                          onClick={handleQuickReturn}
                          disabled={!hasPermission('canCheckIn') || isPending || isRestrictedForThisStaff}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-90'
                              : isRestrictedForThisStaff
                              ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                              : latestRejectedVerification
                              ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                              : 'bg-black hover:bg-neutral-800 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                          title={
                            isPending
                              ? 'Check-in request submitted — awaiting Admin inspection & verification'
                              : isRestrictedForThisStaff
                              ? `Return restricted: Only ${tx.assigneeOrProject || tx.userName} or an Admin can return this item.`
                              : !hasPermission('canCheckIn')
                              ? 'Check-in permission required'
                              : latestRejectedVerification
                              ? 'Re-submit return request'
                              : 'Return item back to stock'
                          }
                        >
                          {isPending ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                              <span>Pending Verification</span>
                            </>
                          ) : isRestrictedForThisStaff ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-gray-500" />
                              <span>Held by Other Staff</span>
                            </>
                          ) : latestRejectedVerification ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 text-white" />
                              <span>Re-submit Return</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                              <span>Return to Stock</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'history' && (
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-sm">Completed Movement History & Custody Ledger</h3>
              <p className="text-xs text-gray-500">Historical check-in and check-out logs with explicit SKU tracking, barcodes, signatures, and printable release agreements.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5] text-[#1A1A1A] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Unique SKU</th>
                  <th className="py-2.5 px-3">Barcode / QR</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3">Borrower / Assignee</th>
                  <th className="py-2.5 px-3">Processed By</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-center">Agreement Slip</th>
                  {canDeleteCustody && <th className="py-2.5 px-3 text-center">Admin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {transactions.map((tx) => {
                  const matchedItem = items.find((i) => i.id === tx.itemId || i.sku === tx.sku);
                  const displaySku = matchedItem ? matchedItem.sku : tx.sku;
                  const displayName = matchedItem ? matchedItem.name : tx.itemName;
                  const displayBarcode = matchedItem ? matchedItem.barcode : (tx.barcode || tx.sku);

                  return (
                    <tr key={tx.id} className="hover:bg-[#F9F9F9]">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          tx.type === 'CHECK_OUT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#1A1A1A]">{displayName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{displaySku}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600 text-[11px]">{displayBarcode}</td>
                      <td className="py-2.5 px-3 text-center font-black">{tx.quantity}</td>
                      <td className="py-2.5 px-3 text-gray-700 font-medium">{tx.assigneeOrProject || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-600">{tx.userName}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 text-[10px]">{tx.timestamp}</td>
                      <td className="py-2.5 px-3 text-center">
                        {tx.type === 'CHECK_OUT' ? (
                          <button
                            onClick={() => openCheckoutFormModal(generateCheckoutFormFromTransaction(tx))}
                            className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Print or view Check-Out Agreement Slip"
                          >
                            <Printer className="w-3 h-3 text-emerald-400" />
                            <span>Print Slip</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-mono">Verified In</span>
                        )}
                      </td>
                      {canDeleteCustody && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setTransactionToDelete(tx)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Admin: Delete Historical Log Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Delete / Void Active Custody Modal */}
      {activeCustodyToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Void Active Custody Record</h3>
                <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  Admin Authorization Verified
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              You are about to permanently delete the active custody loan record for this equipment. This action cannot be undone.
            </p>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-gray-500">Item Name:</span>
                <span className="font-bold text-gray-900">{activeCustodyToDelete.itemName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Master SKU:</span>
                <span className="font-mono font-bold text-gray-800">{activeCustodyToDelete.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Borrower / Assignee:</span>
                <span className="font-bold text-gray-900">{activeCustodyToDelete.assigneeOrProject || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Checked Out Units:</span>
                <span className="font-bold text-blue-700">
                  {activeCustodyToDelete.remainingOutQuantity !== undefined
                    ? activeCustodyToDelete.remainingOutQuantity
                    : activeCustodyToDelete.quantity}{' '}
                  Units
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/50 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-black focus:ring-black"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-blue-950 block">Restore items back to inventory stock</span>
                <p className="text-[11px] text-blue-800">
                  Automatically returns the remaining units back to available stock. If this is an Item Set, component item quantities will also be restored.
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveCustodyToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const ok = deleteActiveCustody(activeCustodyToDelete.id, restoreStockOnDelete);
                  if (ok) {
                    setActiveCustodyToDelete(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete Custody</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Transaction Log Modal */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-bold text-sm text-gray-900">Delete Ledger Record</h3>
                <span className="text-[10px] font-semibold text-gray-500 uppercase">Admin Action</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Remove the {transactionToDelete.type} entry for <strong>{transactionToDelete.itemName}</strong> ({transactionToDelete.sku}) from historical records?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTransactionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const ok = deleteTransaction(transactionToDelete.id);
                  if (ok) {
                    setTransactionToDelete(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs"
              >
                Delete Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
