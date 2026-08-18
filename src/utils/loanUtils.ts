import { Transaction, User } from '../types';

/**
 * Checks whether a given CHECK_OUT transaction was checked out by or assigned to the specified user.
 */
export function isLoanAssignedToUser(tx: Transaction, user: User | null | undefined): boolean {
  if (!tx || !user) return false;
  if (tx.type !== 'CHECK_OUT') return false;

  const currentUserId = (user.id || '').trim();
  const currentUserName = (user.name || '').trim().toLowerCase();
  const currentUserEmail = (user.email || '').trim().toLowerCase();

  const txUserId = (tx.userId || '').trim();
  const txUserName = (tx.userName || '').trim().toLowerCase();
  const assignee = (tx.assigneeOrProject || '').trim().toLowerCase();

  // 1. Direct user ID match (who initiated or holds checkout)
  if (txUserId && currentUserId && txUserId === currentUserId) {
    return true;
  }

  // 2. Direct user name match with checkout initiator
  if (txUserName && currentUserName && txUserName === currentUserName) {
    return true;
  }

  // 3. Assignee / Recipient text matches current user's name or email
  if (assignee && currentUserName) {
    // Exact or substring match (e.g., "Carlos Mendez (DER Team Alpha)" matching "Carlos Mendez")
    if (assignee.includes(currentUserName) || currentUserName.includes(assignee)) {
      return true;
    }
  }

  if (assignee && currentUserEmail && assignee.includes(currentUserEmail)) {
    return true;
  }

  return false;
}

/**
 * Checks whether the user has administrator or management privileges to oversee/process any check-in.
 */
export function isPrivilegedStaffManager(user: User | null | undefined): boolean {
  if (!user) return false;
  const role = (user.roleName || '').trim();
  return role === 'Admin' || role === 'Inventory Manager';
}

/**
 * Calculates how many unreturned units of a specific item the given user currently has checked out on loan.
 */
export function getUserActiveCheckedOutQuantity(
  itemId: string,
  user: User | null | undefined,
  transactions: Transaction[]
): number {
  if (!user || !itemId || !transactions) return 0;
  return transactions
    .filter((tx) => {
      if (tx.type !== 'CHECK_OUT' || tx.itemId !== itemId) return false;
      const remaining = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;
      if (remaining <= 0) return false;
      return isLoanAssignedToUser(tx, user);
    })
    .reduce((sum, tx) => {
      const remaining = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;
      return sum + remaining;
    }, 0);
}

/**
 * Gets all active checked-out loan transactions for an item.
 */
export function getItemActiveLoans(itemId: string, transactions: Transaction[]): Transaction[] {
  if (!itemId || !transactions) return [];
  return transactions.filter((tx) => {
    if (tx.type !== 'CHECK_OUT' || tx.itemId !== itemId) return false;
    const remaining = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;
    return remaining > 0;
  });
}

/**
 * Gets active checked-out loan transactions for an item that belong to OTHER staff members.
 */
export function getOtherStaffLoansForItem(
  itemId: string,
  user: User | null | undefined,
  transactions: Transaction[]
): Transaction[] {
  if (!itemId || !transactions) return [];
  return transactions.filter((tx) => {
    if (tx.type !== 'CHECK_OUT' || tx.itemId !== itemId) return false;
    const remaining = tx.remainingOutQuantity !== undefined ? tx.remainingOutQuantity : tx.quantity;
    if (remaining <= 0) return false;
    return !isLoanAssignedToUser(tx, user);
  });
}
