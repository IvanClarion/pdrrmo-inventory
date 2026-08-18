import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  QrCode,
  Volume2,
  VolumeX,
  Layers,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Trash2,
  Package,
  Keyboard,
  Barcode,
  UserCheck,
  User as UserIcon,
  ShieldCheck,
  Printer,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioService } from '../utils/audio';
import { Item, BatchScanQueueItem, User } from '../types';

import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { dbToItem } from '../lib/database';

/**
 * Intelligently extracts search terms (SKU, barcode, ID, serial) from raw scanned input.
 * Handles:
 * 1. JSON QR payloads: { "sku": "...", "barcode": "...", "id": "..." }
 * 2. URL scan formats: https://.../?sku=... or /item/123
 * 3. AIM symbology prefixes from hardware scanners: ]C1, ]e0, etc.
 * 4. Leading/trailing zeros in UPC/EAN: "0012345678905" -> ["0012345678905", "012345678905", "12345678905"]
 */
function extractPotentialKeys(rawCode: string): string[] {
  const clean = rawCode.trim();
  if (!clean) return [];

  const keys: Set<string> = new Set();
  keys.add(clean);

  // 1. Check if rawCode is JSON (from QR code labels)
  if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
    try {
      const parsed = JSON.parse(clean);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.sku) keys.add(String(parsed.sku).trim());
        if (parsed.barcode) keys.add(String(parsed.barcode).trim());
        if (parsed.id) keys.add(String(parsed.id).trim());
        if (parsed.name) keys.add(String(parsed.name).trim());
      }
    } catch {
      // not JSON
    }
  }

  // 2. Check if rawCode is a URL
  try {
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const url = new URL(clean);
      const skuParam = url.searchParams.get('sku');
      const barcodeParam = url.searchParams.get('barcode');
      const idParam = url.searchParams.get('id');
      if (skuParam) keys.add(skuParam.trim());
      if (barcodeParam) keys.add(barcodeParam.trim());
      if (idParam) keys.add(idParam.trim());
      const pathSegments = url.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        keys.add(pathSegments[pathSegments.length - 1]);
      }
    }
  } catch {
    // not URL
  }

  // 3. Strip AIM Symbology Identifiers (e.g. ]C1, ]E0, ]d2, ]Q3) from 2D/1D scanners
  if (clean.startsWith(']') && clean.length > 3) {
    const strippedAim = clean.slice(3).trim();
    keys.add(strippedAim);
  }

  // 4. Barcode Numeric variations (strip leading zeroes or pad to 12/13 digits)
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 6) {
    keys.add(digitsOnly);
    // Strip leading zeroes (e.g. 012345678905 -> 12345678905)
    keys.add(digitsOnly.replace(/^0+/, ''));
    // Pad to 12 digits (UPC-A)
    if (digitsOnly.length < 12) {
      keys.add(digitsOnly.padStart(12, '0'));
    }
    // Pad to 13 digits (EAN-13)
    if (digitsOnly.length === 12) {
      keys.add(`0${digitsOnly}`);
    }
  }

  return Array.from(keys).filter(Boolean);
}

export const ScannerView: React.FC = () => {
  const {
    items,
    users,
    switchUser,
    currentUser,
    openCheckInOutModal,
    hasPermission,
    isPrivilegedManagerOrAdmin,
    canApproveCheckOut,
    isSessionAuthenticated,
    openLoginModal,
    checkOutItem,
    openCheckoutFormModal,
    generateCheckoutFormFromBatch,
    setActiveTab,
  } = useInventory();

  // Mode states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualInput, setManualInput] = useState<string>('');
  const [batchAssignee, setBatchAssignee] = useState<string>('');
  const [isSearchingDb, setIsSearchingDb] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    item?: Item;
    user?: User;
    timestamp: string;
  } | null>(null);

  // Batch queue
  const [batchQueue, setBatchQueue] = useState<BatchScanQueueItem[]>([]);

  // Hardware barcode scanner keypress buffer
  const [hardwareBuffer, setHardwareBuffer] = useState<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Ref for scanner DOM element
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Physical Hardware Barcode Scanner Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing into an input field or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (hardwareBuffer.length >= 3) {
          processScannedBarcode(hardwareBuffer, 'HARDWARE');
          setHardwareBuffer('');
        }
      } else if (e.key.length === 1) {
        if (timeDiff < 50 || hardwareBuffer.length === 0) {
          setHardwareBuffer((prev) => prev + e.key);
        } else {
          setHardwareBuffer(e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hardwareBuffer, items, isBatchMode]);

  // Start Camera Scan Engine
  const startCameraScanner = async () => {
    setIsCameraActive(true);
    setScannedResult(null);

    // Short delay to ensure container div is mounted
    setTimeout(async () => {
      try {
        if (!scannerRef.current) return;
        const html5Qrcode = new Html5Qrcode('qr-reader-container');
        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            processScannedBarcode(decodedText, 'CAMERA');
            if (!isBatchMode) {
              stopCameraScanner();
            }
          },
          () => {
            // Scanning errors ignore
          }
        );
      } catch (err) {
        console.warn('Camera access denied or unmounted, fallback to simulation mode', err);
      }
    }, 200);
  };

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const processScannedBarcode = async (rawCode: string, source: 'CAMERA' | 'HARDWARE' | 'MANUAL') => {
    const rawTrimmed = rawCode.trim();
    if (!rawTrimmed) return;

    if (soundEnabled) {
      if (isBatchMode) {
        audioService.playBatchBeep();
      } else {
        audioService.playScanBeep();
      }
    }

    const candidateKeys = extractPotentialKeys(rawTrimmed);
    const candidateKeysLower = candidateKeys.map((k) => k.toLowerCase());

    // 1. Search in local in-memory items
    let foundItem = items.find((i) => {
      const bLower = (i.barcode || '').toLowerCase();
      const sLower = (i.sku || '').toLowerCase();
      const idLower = (i.id || '').toLowerCase();
      const nameLower = (i.name || '').toLowerCase();
      const batchLower = (i.batchLotNumber || '').toLowerCase();

      return (
        candidateKeysLower.includes(bLower) ||
        candidateKeysLower.includes(sLower) ||
        candidateKeysLower.includes(idLower) ||
        candidateKeysLower.includes(nameLower) ||
        candidateKeysLower.includes(batchLower) ||
        (i.serialNumbers && i.serialNumbers.some((sn) => candidateKeysLower.includes(sn.toLowerCase()))) ||
        (i.pieceSkus && i.pieceSkus.some((ps) => candidateKeysLower.includes(ps.toLowerCase())))
      );
    });

    // 2. Direct Supabase Database Query Fallback
    if (!foundItem && isSupabaseConfigured()) {
      setIsSearchingDb(true);
      try {
        const client = getSupabase();
        if (client) {
          for (const key of candidateKeys) {
            const { data: dbRows, error: dbErr } = await client
              .from('items')
              .select('*')
              .or(`barcode.eq.${key},sku.eq.${key},id.eq.${key},name.ilike.%${key}%`)
              .limit(1);

            if (!dbErr && dbRows && dbRows.length > 0) {
              foundItem = dbToItem(dbRows[0]);
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Direct database item scan search fallback notice:', err);
      } finally {
        setIsSearchingDb(false);
      }
    }

    if (foundItem) {
      const pieceMatch = foundItem.pieceSkus?.find((ps) => candidateKeysLower.includes(ps.toLowerCase()));
      if (pieceMatch) {
        foundItem = {
          ...foundItem,
          sku: pieceMatch,
        };
      }
    }

    // 3. Search in user QR badges, ID, or email
    const foundUser = users.find((u) => {
      const uQrLower = (u.userQrCode || '').toLowerCase();
      const uEmailLower = (u.email || '').toLowerCase();
      const uIdLower = (u.id || '').toLowerCase();
      const uNameLower = (u.name || '').toLowerCase();

      return (
        candidateKeysLower.includes(uQrLower) ||
        candidateKeysLower.includes(uEmailLower) ||
        candidateKeysLower.includes(uIdLower) ||
        candidateKeysLower.includes(uNameLower)
      );
    });

    const result = {
      code: rawTrimmed,
      item: foundItem,
      user: foundUser,
      timestamp: new Date().toLocaleTimeString(),
    };

    setScannedResult(result);

    if (isBatchMode && foundItem) {
      const newQueueItem: BatchScanQueueItem = {
        id: `batch-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        barcode: rawTrimmed,
        item: foundItem,
        scannedAt: new Date().toLocaleTimeString(),
        actionType: 'CHECK_OUT',
        quantity: 1,
      };
      setBatchQueue((prev) => [newQueueItem, ...prev]);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput) {
      processScannedBarcode(manualInput, 'MANUAL');
      setManualInput('');
    }
  };

  const removeFromBatchQueue = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExecuteBatchCheckout = () => {
    if (batchQueue.length === 0) {
      alert('Batch queue is empty. Scan barcodes to add items.');
      return;
    }
    if (!batchAssignee.trim()) {
      alert('Please enter the Assignee / Borrower name for this batch checkout.');
      return;
    }

    const batchItemsToProcess: Array<{
      item: Item;
      quantity: number;
      condition?: any;
      notes?: string;
    }> = [];

    let successCount = 0;
    batchQueue.forEach((queueItem) => {
      if (queueItem.item) {
        const ok = checkOutItem(
          queueItem.item.id,
          queueItem.quantity || 1,
          batchAssignee,
          'Good',
          `Batch scanner checkout to ${batchAssignee}`
        );
        if (ok) {
          successCount++;
          batchItemsToProcess.push({
            item: queueItem.item,
            quantity: queueItem.quantity || 1,
            condition: 'Good',
            notes: `Batch scan code: ${queueItem.barcode}`,
          });
        }
      }
    });

    if (successCount > 0) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      const formData = generateCheckoutFormFromBatch(batchItemsToProcess, batchAssignee);
      setBatchQueue([]);
      setBatchAssignee('');
      openCheckoutFormModal(formData);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                High Speed
              </span>
              <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Barcode & QR Scanner Engine</h2>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 font-normal">
              Continuous camera scanning, USB/Bluetooth hardware guns, UPC, EAN, Code 128, and QR codes.
            </p>
          </div>

          {/* Mode Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                isBatchMode
                  ? 'bg-black text-white border-black'
                  : 'bg-[#F5F5F5] text-gray-700 border-[#E5E5E5] hover:bg-[#EAEAEA]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Continuous Batch {isBatchMode ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-[#F0F0F0] text-black border-[#E5E5E5]'
                  : 'bg-[#F5F5F5] text-gray-400 border-[#E5E5E5]'
              }`}
              title="Toggle Scan Sound Effect"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Scanner Card / Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Camera or Manual Scanner */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-black" />
              <h3 className="font-bold text-[#1A1A1A] text-sm">Live Camera Viewport</h3>
            </div>
            {isCameraActive && (
              <span className="flex items-center gap-1.5 text-xs text-green-700 font-bold bg-green-50 px-2.5 py-0.5 rounded-md border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-ping" />
                Scanning Active
              </span>
            )}
          </div>

          {/* Camera Container or Placeholder */}
          <div className="relative bg-[#F9F9F9] border-2 border-dashed border-[#E5E5E5] rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center text-center p-4">
            {isCameraActive ? (
              <div className="w-full h-full flex flex-col items-center">
                <div id="qr-reader-container" ref={scannerRef} className="w-full max-w-xs rounded-lg overflow-hidden border border-[#E5E5E5]" />
                <button
                  onClick={stopCameraScanner}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition"
                >
                  Stop Camera Scanner
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F0F0F0] border border-[#E5E5E5] flex items-center justify-center text-black">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[#1A1A1A] text-sm font-bold">Start Camera Scanner</p>
                  <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
                    Requires camera permission. Position standard barcode or QR code inside frame.
                  </p>
                </div>
                <button
                  onClick={startCameraScanner}
                  className="px-5 py-2.5 rounded-xl bg-black text-white font-bold text-xs shadow-sm hover:bg-neutral-800 transition"
                >
                  Launch Camera Viewport
                </button>
              </div>
            )}
          </div>

          {/* Manual / Hardware Barcode Input */}
          <form onSubmit={handleManualSearch} className="space-y-2 pt-2 border-t border-[#E5E5E5]">
            <label className="text-xs font-bold text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-black" />
                <span>Barcode or Hardware Input</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Auto-detects USB Scanners</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Type barcode/SKU (e.g. 885909384912)..."
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-black font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#1A1A1A] font-bold text-xs rounded-xl border border-[#E5E5E5] transition"
              >
                Lookup
              </button>
            </div>
          </form>

          {/* Quick Demo Sample Barcodes */}
          <div className="pt-2 border-t border-[#E5E5E5] space-y-2">
            <div>
              <p className="text-[10px] font-bold text-gray-500 mb-1">Item Barcode Simulation Samples:</p>
              <div className="flex flex-wrap gap-1.5">
                {items.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => processScannedBarcode(item.barcode, 'MANUAL')}
                    className="px-2 py-0.5 bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E5E5E5] rounded-lg text-[10px] text-[#1A1A1A] font-mono transition flex items-center gap-1 font-bold"
                  >
                    <Barcode className="w-3 h-3 text-gray-500" />
                    <span>{item.barcode}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 mb-1">User QR Badge Simulation Samples:</p>
              <div className="flex flex-wrap gap-1.5">
                {users.slice(0, 3).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => processScannedBarcode(u.userQrCode || u.email, 'MANUAL')}
                    className="px-2 py-0.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900 rounded-lg text-[10px] font-mono transition flex items-center gap-1 font-bold"
                  >
                    <QrCode className="w-3 h-3 text-orange-600" />
                    <span>{u.name} ({u.userQrCode})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Scan Results & Immediate Actions */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5E5]">
              <h3 className="font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-black" />
                <span>Scan Lookup Result</span>
              </h3>
              {scannedResult && (
                <span className="text-[11px] text-gray-400 font-mono">Scanned: {scannedResult.timestamp}</span>
              )}
            </div>

            {scannedResult ? (
              scannedResult.user ? (
                <div className="space-y-4">
                  {/* Found User QR Badge Card */}
                  <div className="p-4 rounded-xl bg-neutral-900 text-white border border-neutral-800 shadow-md flex gap-3 relative overflow-hidden">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-inner">
                      {scannedResult.user.name.split(' ').map((n) => n[0]).join('')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-base truncate">{scannedResult.user.name}</h4>
                          <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest block">
                            {scannedResult.user.roleName} • {scannedResult.user.department}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          USER VERIFIED
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-neutral-300 space-y-1 font-mono">
                        <p><span className="text-neutral-500">Email:</span> {scannedResult.user.email}</p>
                        <p><span className="text-neutral-500">QR Code ID:</span> {scannedResult.user.userQrCode || scannedResult.user.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Actions for Scanned User */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">User QR Badge Workflow Actions:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          switchUser(scannedResult.user!.id);
                          alert(`Switched active system operator to ${scannedResult.user!.name} (${scannedResult.user!.roleName})!`);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Switch System Operator to {scannedResult.user.name}</span>
                      </button>

                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                        <p className="font-bold text-black mb-1">Checking In / Checking Out Items?</p>
                        <p>Go to the <strong>Check In/Out</strong> tab to perform batch transactions assigned to <strong>{scannedResult.user.name}</strong>.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : scannedResult.item ? (
                <div className="space-y-4">
                  {/* Found Item Card */}
                  <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] flex gap-3">
                    {scannedResult.item.imageUrl ? (
                      <img
                        src={scannedResult.item.imageUrl}
                        alt={scannedResult.item.name}
                        className="w-16 h-16 rounded-lg object-cover border border-[#E5E5E5] bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-center text-gray-400">
                        <Package className="w-8 h-8" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-[#1A1A1A] text-sm truncate">{scannedResult.item.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          MATCH FOUND
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {scannedResult.item.sku}</p>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-[#E5E5E5]">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Stock</span>
                          <span className="font-bold text-[#1A1A1A] text-sm">{scannedResult.item.quantity} Units</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-[#E5E5E5]">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Location</span>
                          <span className="font-medium text-gray-700 text-xs truncate block">{scannedResult.item.locationName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Workflow Action Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Execute Transaction Workflow:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openCheckInOutModal(scannedResult.item!, 'CHECK_OUT')}
                        disabled={!hasPermission('canCheckOut')}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Check Out</span>
                      </button>

                      <button
                        onClick={() => openCheckInOutModal(scannedResult.item!, 'CHECK_IN')}
                        disabled={!hasPermission('canCheckIn')}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Check In</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-[#F9F9F9] rounded-xl border border-amber-300 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-sm">Item Not Found</h4>
                    <p className="text-gray-500 text-xs mt-1">
                      Scanned code <code className="text-black font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200">{scannedResult.code}</code> does not match any existing item in memory or database.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>View Inventory Items</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Barcode className="w-12 h-12 mx-auto opacity-30 text-black" />
                <p className="text-xs font-medium">Scan a barcode or type input on the left to see item details.</p>
              </div>
            )}
          </div>

          {/* Continuous Batch Scan Queue Section */}
          {isBatchMode && (
            <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-black flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Batch Queue ({batchQueue.length})</span>
                </span>
                {batchQueue.length > 0 && (
                  <button
                    onClick={() => setBatchQueue([])}
                    className="text-[10px] text-gray-400 hover:text-red-600 font-bold"
                  >
                    Clear Queue
                  </button>
                )}
              </div>

              {batchQueue.length === 0 ? (
                <p className="text-[11px] text-gray-400 py-2">No items queued yet. Continue scanning barcodes.</p>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {batchQueue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F5F5F5] border border-[#E5E5E5] text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-[#1A1A1A] truncate block">
                            {item.item ? item.item.name : `Barcode: ${item.barcode}`}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            SKU: {item.item?.sku || item.barcode} | {item.scannedAt}
                          </span>
                        </div>

                        <button
                          onClick={() => removeFromBatchQueue(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Batch Process Execution Form */}
                  <div className="pt-2 border-t border-[#E5E5E5] space-y-2">
                    {!isPrivilegedManagerOrAdmin && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Only the Admin and Inventory Manager can Approve & Execute Check-Out.</span>
                      </div>
                    )}

                    {isPrivilegedManagerOrAdmin && !isSessionAuthenticated && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span>Unlock session to approve check-out.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openLoginModal(currentUser)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shrink-0 cursor-pointer"
                        >
                          Unlock
                        </button>
                      </div>
                    )}

                    <input
                      type="text"
                      value={batchAssignee}
                      onChange={(e) => setBatchAssignee(e.target.value)}
                      placeholder="Assignee / Borrower Name (e.g. Alex Morgan - Field Eng)..."
                      className="w-full px-3 py-1.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg text-xs font-bold text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                    <button
                      onClick={handleExecuteBatchCheckout}
                      disabled={!canApproveCheckOut || !batchAssignee.trim()}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-300" />
                      <span>
                        {!isPrivilegedManagerOrAdmin
                          ? 'Approve Batch Check-Out (Admin / Manager Only)'
                          : 'Approve Batch Check-Out & Generate Agreement Slip'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
