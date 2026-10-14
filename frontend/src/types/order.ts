export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface OrderAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  /** Express EU delivery opted in at checkout (see utils/expressEu). */
  expressDelivery?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  name: string;
  product?: { images: { url: string; isPrimary: boolean }[] };
}

export interface OrderUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  user?: OrderUser | null;
  guestEmail: string | null;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress | null;
  paymentMethod: string;
  paymentIntentId: string | null;
  paymentStatus: string;
  couponCode: string | null;
  notes: string | null;
  trackingNumber: string | null;
  courier: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
