export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  oncePerUser: boolean;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CouponValidation {
  code: string;
  type: 'percent' | 'fixed';
  discount: number;
  discountAmount: number;
  minOrder: number | null;
  oncePerUser?: boolean;
}

export interface CouponInput {
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  minOrder?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  oncePerUser?: boolean;
}
