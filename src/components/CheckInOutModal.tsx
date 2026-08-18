import React, { useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Item, ItemCondition } from '../types';
import { PersonSelectorInput } from './PersonSelectorInput';
import {
  isLoanAssignedToUser,
  isPrivilegedStaffManager,
  getUserActiveCheckedOutQuantity,
  getOtherStaffLoansForItem,
} from '../utils/loanUtils';
import {
  X,
  ArrowRightLeft,
  CheckCircle2,
  PenTool,
  RotateCcw,
  Package,
  MapPin,
  FileText,
  Hash,
  Wrench,
  AlertTriangle,
  AlertOctagon,
  Lock,
  ArrowDownLeft,
  ShieldCheck,
  PackageCheck,
  UserX,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheckInOutModalDialogProps {
  item: Item;
  mode: 'CHECK_OUT' | 'CHECK_IN';
  onClose: () => void;
}

const CheckInOutModalDialog: React.FC<CheckInOutModalDialogProps> = ({
  item,
  mode,
  onClose,
}) => {
  const {
    checkOutItem,
    checkInItem,
    locations,
    currentUser,
    hasPermission,
    isPrivilegedManagerOrAdmin,
    canApproveCheckOut,
    isSessionAuthenticated,
    openLoginModal,
    openCheckoutFormModal,
    generateCheckoutFormFromBatch,
    transactions,
  } = useInventory();

  const isCheckOut = mode === 'CHECK_OUT';
  const isPrivileged = isPrivilegedStaffManager(currentUser);
  const userCheckedOutQty = getUserActiveCheckedOutQuantity(item.id, currentUser, transactions);
  const otherStaffLoans = getOtherStaffLoansForItem(item.id, currentUser, transactions);
  const isStaffReturnRestricted = !isCheckOut && !isPrivileged && userCheckedOutQty <= 0;

  // Form states
  const [quantity, setQuantity] = useState<number>(1);
  const [assigneeOrProject, setAssigneeOrProject] = useState<string>('');
  const [personCheckingIn, setPersonCheckingIn] = useState<string>('');
  const [locationId, setLocationId] = useState<string>(item.locationId);
  const [condition, setCondition] = useState<ItemCondition>('Good');
  const [notes, setNotes] = useState<string>('');
  const [needsRepair, setNeedsRepair] = useState<boolean>(false);
  const [repairNotes, setRepairNotes] = useState<string>('');

  // Digital Signature Pad Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSigned, setHasSigned] = useState<boolean>(false);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000'; // Black stroke
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

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

    let signatureUrl = undefined;
    if (hasSigned && canvasRef.current) {
      signatureUrl = canvasRef.current.toDataURL('image/png');
    }

    if (isCheckOut) {
      if (item.quantity <= 0) {
        alert('This SKU is currently out of stock / checked out on active loan. It cannot be checked out again until returned or checked in.');
        return;
      }
      if (!assigneeOrProject.trim()) {
        alert('Please specify the Assignee Name or Project ID for check-out audit tracking.');
        return;
      }
      const combinedNotes = notes || (needsRepair && repairNotes ? `[Inspection/Repair: ${repairNotes}]` : '');
      const success = checkOutItem(
        item.id,
        quantity,
        assigneeOrProject,
        condition,
        combinedNotes,
        signatureUrl,
        undefined
      );
      if (success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        const formData = generateCheckoutFormFromBatch(
          [
            {
              item,
              quantity,
              condition,
              notes: combinedNotes,
            },
          ],
          assigneeOrProject,
          notes,
          signatureUrl
        );
        onClose();
        openCheckoutFormModal(formData);
      }
    } else {
      let fullNotes = personCheckingIn
        ? `Returned By: ${personCheckingIn}${notes ? ' | ' + notes : ''}`
        : notes;
      if (needsRepair && repairNotes) {
        fullNotes = fullNotes ? `${fullNotes} | [Repair Needed: ${repairNotes}]` : `[Repair Needed: ${repairNotes}]`;
      }

      const success = checkInItem(
        item.id,
        quantity,
        locationId,
        condition,
        fullNotes,
        signatureUrl
      );
      if (success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        alert(`Check-in request submitted for ${quantity}x ${item.name}!\n\nStatus: PENDING ADMIN VERIFICATION\nAn Administrator will inspect item status & quantity before stock is updated.`);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E5E5] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] bg-[#F5F5F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-black">
              {isCheckOut ? <ArrowRightLeft className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">
                {isCheckOut ? 'Check-Out Item Workflow' : 'Check-In Item Workflow'}
              </h3>
              <p className="text-xs text-gray-500 font-mono">SKU: {item.sku} | Barcode: {item.barcode}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white text-gray-500 border border-[#E5E5E5] hover:text-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Target Item Brief */}
          <div className="p-3 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-white border border-[#E5E5E5]" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-center text-gray-400">
                  <Package className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[#1A1A1A] text-sm truncate">{item.name}</h4>
                <p className="text-xs text-gray-500 font-mono">
                  SKU: {item.sku} | Location: {item.locationName}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Stock</span>
              <span className={`font-extrabold text-sm ${item.quantity <= 0 ? 'text-red-600' : 'text-black'}`}>
                {item.quantity} {item.unitOfMeasure || 'Units'}
              </span>
            </div>
          </div>

          {/* Consumable Notice Callout */}
          {isCheckOut && item.isConsumable && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <PackageCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Consumable Supply (Non-Returnable)</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                This item is issued for permanent consumption or disaster relief distribution. It will <strong>not</strong> require a return or appear under active custody loans.
              </p>
            </div>
          )}

          {/* Out of Stock Warning Callout */}
          {isCheckOut && item.quantity <= 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>SKU Unavailable for Check-Out</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                All units of <strong>{item.name}</strong> (SKU: <span className="font-mono font-bold">{item.sku}</span>) are currently checked out on active loan. It cannot be checked out again until it is returned and verified via check-in.
              </p>
            </div>
          )}

          {/* Staff Return Policy Restriction Notice */}
          {!isCheckOut && !isPrivileged && (
            isStaffReturnRestricted ? (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <UserX className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Staff Custody Policy: Return Restricted</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  {otherStaffLoans.length > 0 ? (
                    <>
                      Staff can only return equipment they have checked out. This item is currently checked out to{' '}
                      <strong className="text-rose-950 underline">
                        {Array.from(new Set(otherStaffLoans.map((l) => l.assigneeOrProject || l.userName))).join(', ')}
                      </strong>
                      . You cannot return equipment checked out by other staff members.
                    </>
                  ) : (
                    <>
                      Staff can only return equipment they have checked out. You do not have an active check-out record for{' '}
                      <strong>{item.name}</strong>.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Your Active Custody: <strong>{userCheckedOutQty} {userCheckedOutQty === 1 ? 'unit' : 'units'}</strong> checked out to you
                  </span>
                </div>
                <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-mono text-[10px]">
                  Max Return: {userCheckedOutQty}
                </span>
              </div>
            )
          )}

          {/* Quantity Selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Quantity to {isCheckOut ? 'Check Out' : 'Check In'} *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={
                  isCheckOut
                    ? Math.max(1, item.quantity)
                    : !isPrivileged
                    ? Math.max(1, userCheckedOutQty)
                    : 9999
                }
                disabled={(isCheckOut && item.quantity <= 0) || (!isCheckOut && isStaffReturnRestricted)}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32 px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] font-bold text-base focus:outline-none focus:border-black disabled:bg-gray-100 disabled:opacity-60"
                required
              />
              <span className="text-xs text-gray-500 font-medium">
                {isCheckOut
                  ? `Max available: ${item.quantity}`
                  : !isPrivileged
                  ? `Your active loan: ${userCheckedOutQty} units`
                  : 'Adding to existing stock'}
              </span>
            </div>
          </div>

          {/* Check Out or Check In Person Selection */}
          {isCheckOut ? (
            <PersonSelectorInput
              label="Person Checking Out Item (Recipient / Assignee)"
              value={assigneeOrProject}
              onChange={(val) => setAssigneeOrProject(val)}
              required
              placeholder="Select person from dropdown or scan QR code..."
              helperText="Select recipient from dropdown or scan their physical QR badge."
            />
          ) : (
            <div className="space-y-3">
              <PersonSelectorInput
                label="Person Checking In Item (Returned By)"
                value={personCheckingIn}
                onChange={(val) => setPersonCheckingIn(val)}
                placeholder="Select returnee from dropdown or scan QR code..."
                helperText="Select returnee from dropdown or scan their physical QR badge."
              />

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-black" />
                  <span>Destination Storage Bin / Location *</span>
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-black"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Target Item SKU Identifier */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-black" />
              <span>Stock Keeping Unit (SKU)</span>
            </label>
            <div className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl flex items-center justify-between">
              <span className="font-mono font-bold text-black text-xs">{item.sku}</span>
              <span className="text-[11px] text-gray-500 font-medium">{item.category}</span>
            </div>
          </div>

          {/* Item Condition & Repair Inspection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 block">
                Physical Condition Inspection
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
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition text-center ${
                    condition === cond
                      ? cond === 'Damaged' || cond === 'Needs Maintenance'
                        ? 'bg-red-50 text-red-700 border-red-200 font-black'
                        : 'bg-black text-white border-black'
                      : 'bg-[#F5F5F5] text-gray-600 border-[#E5E5E5] hover:bg-[#EAEAEA]'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>

            {(needsRepair || condition === 'Needs Maintenance' || condition === 'Damaged') && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Check & Repair / Maintenance Inspection Notes</span>
                </div>
                <input
                  type="text"
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="Describe repair / calibration requirements..."
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-black placeholder-gray-400 focus:outline-none focus:border-black font-medium"
                />
              </div>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>General Notes / Purpose</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Scheduled deployment, returned after site survey..."
              className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-black font-medium"
            />
          </div>

          {/* Digital Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-black" />
                <span>Digital Sign-Off Signature</span>
              </label>
              {hasSigned && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[10px] text-gray-500 hover:text-black font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Pad</span>
                </button>
              )}
            </div>
            <div className="bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl p-1 relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={100}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-24 rounded-lg cursor-crosshair bg-white touch-none"
              />
              {!hasSigned && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-xs italic">
                  Draw signature on pad using touch or mouse...
                </div>
              )}
            </div>
          </div>

          {/* Authorization Notice if in Check Out Mode */}
          {isCheckOut && !isPrivilegedManagerOrAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Restricted Action: Only the <strong>Admin</strong> and <strong>Inventory Manager</strong> can Approve & Execute Check-Out.</span>
            </div>
          )}

          {isCheckOut && isPrivilegedManagerOrAdmin && !isSessionAuthenticated && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Session locked. Unlock your {currentUser.roleName} session to approve check-out.</span>
              </div>
              <button
                type="button"
                onClick={() => openLoginModal(currentUser)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
              >
                Unlock
              </button>
            </div>
          )}

          {!isCheckOut && !hasPermission('canCheckIn') && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Authorization Required: Your role (<strong>{currentUser.roleName}</strong>) does not have permission to check in items in the Role Permissions Matrix.</span>
            </div>
          )}

          {!isCheckOut && hasPermission('canCheckIn') && (
            <div className="p-3 bg-[#F9F9F9] border border-[#E5E5E5] rounded-xl text-[11px] text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Submitting check-in will place item in <strong>Pending Verification</strong>. Personnel with Verify & Approve Check-In permission will inspect status & approve stock return.</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                (isCheckOut && item.quantity <= 0) ||
                (isCheckOut && !canApproveCheckOut) ||
                (!isCheckOut && (!hasPermission('canCheckIn') || isStaffReturnRestricted))
              }
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-xs transition flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed ${
                isCheckOut
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-black hover:bg-neutral-800'
              }`}
            >
              {isCheckOut ? (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>
                    {item.quantity <= 0
                      ? 'SKU Unavailable for Check-Out (Out of Stock / On Loan)'
                      : !isPrivilegedManagerOrAdmin
                      ? 'Approve & Execute Check-Out (Admin / Manager Only)'
                      : 'Approve & Execute Check-Out'}
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>
                    {!hasPermission('canCheckIn')
                      ? `Check-In Restricted (${currentUser.roleName})`
                      : isStaffReturnRestricted
                      ? 'Return Restricted (Item Not In Your Custody)'
                      : 'Submit Check-In for Admin Verification'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CheckInOutModal: React.FC = () => {
  const { checkInOutModalItem, checkInOutMode, closeCheckInOutModal } = useInventory();

  if (!checkInOutModalItem || !checkInOutMode) {
    return null;
  }

  return (
    <CheckInOutModalDialog
      item={checkInOutModalItem}
      mode={checkInOutMode}
      onClose={closeCheckInOutModal}
    />
  );
};
