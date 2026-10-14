import type { Order } from '@/types/order';

export type BankTransferDetails = {
  accountHolder: string;
  iban: string;
  bic: string;
  reference: string;
};

export type OrderConfirmStash = {
  order: Order;
  bankTransferDetails?: BankTransferDetails | null;
};

const key = (orderId: string) => `gp-order-confirm:${orderId}`;

/** Keep confirmation payload for guests (auth-only GET /orders/:id) and refreshes. */
export function stashOrderConfirm(data: OrderConfirmStash): void {
  try {
    sessionStorage.setItem(key(data.order.id), JSON.stringify(data));
  } catch {
    // private mode / quota — confirmation still works once via navigate state
  }
}

export function readOrderConfirm(orderId: string): OrderConfirmStash | null {
  try {
    const raw = sessionStorage.getItem(key(orderId));
    if (!raw) return null;
    return JSON.parse(raw) as OrderConfirmStash;
  } catch {
    return null;
  }
}
