import { api, unwrap } from './api';
import type { Order, OrderAddress, OrderStatus } from '@/types/order';
import type { PaginationMeta } from '@/types/api';

export interface CreateOrderInput {
  items: { productId: string; quantity: number }[];
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress;
  couponCode?: string;
  notes?: string;
  paymentMethod?: string;
  guestEmail?: string;
  expressDelivery?: boolean;
}

export interface CreateOrderResponse {
  order: Order;
  clientSecret: string | null;
  cryptoDetails?: { invoiceUrl: string; paymentAddress?: string; payAmount?: number } | null;
  bankTransferDetails?: {
    accountHolder: string;
    iban: string;
    bic: string;
    reference: string;
  } | null;
  wallidRedirectUrl?: string | null;
  ecomtradeRedirectUrl?: string | null;
  publishableKey: string | null;
}

export const orderService = {
  create(payload: CreateOrderInput): Promise<CreateOrderResponse> {
    return unwrap(api.post('/orders', payload));
  },
  createGuest(payload: CreateOrderInput): Promise<CreateOrderResponse> {
    return unwrap(api.post('/orders/guest', payload));
  },
  myOrders(page = 1, status?: OrderStatus): Promise<{ data: Order[]; meta: PaginationMeta }> {
    return api
      .get<{ data: Order[]; meta: PaginationMeta }>('/orders/my-orders', { params: { page, limit: 10, status } })
      .then((r) => r.data);
  },
  get(id: string): Promise<Order> {
    return unwrap(api.get(`/orders/${id}`));
  },
};
