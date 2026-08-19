import { Item, ExpiryStatus } from '../types';

export interface ExpiryEvaluation {
  status: ExpiryStatus;
  daysRemaining: number | null;
  hoursRemaining?: number | null;
  formattedDate: string;
  formattedTime?: string;
  badgeLabel: string;
  badgeClass: string;
  textColor: string;
  bgLightColor: string;
  borderColor: string;
  isUrgent: boolean;
  intervalCategory: 'expired' | '1month' | '3months' | '6months' | 'safe' | 'none';
}

export interface ExpirySummary {
  expired: Item[];
  expiring1Month: Item[];
  expiring3Months: Item[];
  expiring6Months: Item[];
  good: Item[];
  noExpiry: Item[];
  totalAlerts: number; // expired + 1m + 3m + 6m
  criticalCount: number; // expired + 1m
}

/**
 * Evaluates the expiration status of an item based on its expiration date and optional time.
 */
export function evaluateItemExpiry(item: Partial<Item> | null | undefined): ExpiryEvaluation {
  if (!item) {
    return {
      status: 'NO_EXPIRY',
      daysRemaining: null,
      formattedDate: 'N/A',
      badgeLabel: 'No Expiry',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      textColor: 'text-gray-600',
      bgLightColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      isUrgent: false,
      intervalCategory: 'none',
    };
  }

  const rawDateStr = item.expirationDate || item.expiryDate;
  if (!rawDateStr || !rawDateStr.trim()) {
    return {
      status: 'NO_EXPIRY',
      daysRemaining: null,
      formattedDate: 'No Expiry Date',
      badgeLabel: 'No Expiry',
      badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',
      textColor: 'text-gray-500',
      bgLightColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      isUrgent: false,
      intervalCategory: 'none',
    };
  }

  // Extract clean YYYY-MM-DD
  const dateOnly = rawDateStr.includes('T') ? rawDateStr.split('T')[0] : rawDateStr;
  const timeOnly = item.expirationTime || '23:59:59';

  // Construct target DateTime in local timezone
  const targetDate = new Date(`${dateOnly}T${timeOnly}`);
  const now = new Date();

  // Difference in milliseconds
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  const formattedDate = new Date(`${dateOnly}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = item.expirationTime
    ? new Date(`2000-01-01T${item.expirationTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : undefined;

  // 1. Expired (Past target date/time)
  if (diffMs <= 0 || diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: 'EXPIRED',
      daysRemaining: diffDays,
      hoursRemaining: diffHours,
      formattedDate,
      formattedTime,
      badgeLabel: overdueDays === 0 ? 'Expired Today' : `Expired ${overdueDays}d ago`,
      badgeClass: 'bg-red-600 text-white border-red-700 font-bold shadow-xs',
      textColor: 'text-red-700',
      bgLightColor: 'bg-red-50',
      borderColor: 'border-red-300',
      isUrgent: true,
      intervalCategory: 'expired',
    };
  }

  // 2. Expiring in <= 30 Days (1 Month Interval - Critical)
  if (diffDays <= 30) {
    return {
      status: 'EXPIRING_1_MONTH',
      daysRemaining: diffDays,
      hoursRemaining: diffHours,
      formattedDate,
      formattedTime,
      badgeLabel: diffDays === 1 ? 'Expires Tomorrow!' : `Expires in ${diffDays}d (≤ 1 Mo)`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      textColor: 'text-rose-700',
      bgLightColor: 'bg-rose-50',
      borderColor: 'border-rose-300',
      isUrgent: true,
      intervalCategory: '1month',
    };
  }

  // 3. Expiring in 31-90 Days (3 Months Interval - High Attention)
  if (diffDays <= 90) {
    return {
      status: 'EXPIRING_3_MONTHS',
      daysRemaining: diffDays,
      hoursRemaining: diffHours,
      formattedDate,
      formattedTime,
      badgeLabel: `Expires in ~${Math.ceil(diffDays / 30)} mos (${diffDays}d)`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      textColor: 'text-amber-800',
      bgLightColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      isUrgent: false,
      intervalCategory: '3months',
    };
  }

  // 4. Expiring in 91-180 Days (6 Months Interval - Early Warning)
  if (diffDays <= 180) {
    return {
      status: 'EXPIRING_6_MONTHS',
      daysRemaining: diffDays,
      hoursRemaining: diffHours,
      formattedDate,
      formattedTime,
      badgeLabel: `Expires in ~${Math.ceil(diffDays / 30)} mos (≤ 6 Mo)`,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-semibold',
      textColor: 'text-blue-700',
      bgLightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      isUrgent: false,
      intervalCategory: '6months',
    };
  }

  // 5. Valid / Safe (> 180 Days)
  return {
    status: 'GOOD',
    daysRemaining: diffDays,
    hoursRemaining: diffHours,
    formattedDate,
    formattedTime,
    badgeLabel: `Valid (${formattedDate})`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium',
    textColor: 'text-emerald-700',
    bgLightColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    isUrgent: false,
    intervalCategory: 'safe',
  };
}

/**
 * Summarizes the expiration health across an entire item catalog.
 */
export function getExpiryCatalogSummary(items: Item[]): ExpirySummary {
  const expired: Item[] = [];
  const expiring1Month: Item[] = [];
  const expiring3Months: Item[] = [];
  const expiring6Months: Item[] = [];
  const good: Item[] = [];
  const noExpiry: Item[] = [];

  for (const item of items) {
    const evaluation = evaluateItemExpiry(item);
    switch (evaluation.intervalCategory) {
      case 'expired':
        expired.push(item);
        break;
      case '1month':
        expiring1Month.push(item);
        break;
      case '3months':
        expiring3Months.push(item);
        break;
      case '6months':
        expiring6Months.push(item);
        break;
      case 'safe':
        good.push(item);
        break;
      default:
        noExpiry.push(item);
        break;
    }
  }

  return {
    expired,
    expiring1Month,
    expiring3Months,
    expiring6Months,
    good,
    noExpiry,
    totalAlerts: expired.length + expiring1Month.length + expiring3Months.length + expiring6Months.length,
    criticalCount: expired.length + expiring1Month.length,
  };
}

/**
 * Calculates a future date string YYYY-MM-DD from today given a months offset.
 */
export function getFutureDatePreset(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().split('T')[0];
}
