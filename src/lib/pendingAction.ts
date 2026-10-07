/**
 * Bridges "review" screens and the Confirm-with-PIN screen.
 *
 * A screen that needs PIN approval registers an action (an async function that
 * receives the entered PIN and calls the API), then navigates to
 * /security/confirm-pin. The confirm screen runs the action and forwards its
 * result to the receipt screen. Module-level state is safe here: React Native
 * runs a single JS context and only one confirmation can be active at a time.
 */
import type { Transaction } from '@/types';

export interface PendingAction {
  /** e.g. "Confirm transfer" */
  title: string;
  /** e.g. "₦45,000" */
  amountLabel: string;
  /** e.g. "to Amaka Bello · GTBank 0123456789" */
  subtitle: string;
  run: (pin: string) => Promise<Transaction>;
}

let current: PendingAction | null = null;

export function setPendingAction(action: PendingAction) {
  current = action;
}

export function getPendingAction(): PendingAction | null {
  return current;
}

export function clearPendingAction() {
  current = null;
}
