import { api, unwrap } from './api';
import type { Coupon, CouponInput, CouponValidation } from '@/types/coupon';

export const couponService = {
  validate(code: string, subtotal: number): Promise<CouponValidation> {
    return unwrap(api.post('/coupons/validate', { code, subtotal }));
  },
  adminList(): Promise<Coupon[]> {
    return unwrap(api.get('/coupons'));
  },
  adminCreate(payload: CouponInput): Promise<Coupon> {
    return unwrap(api.post('/coupons', payload));
  },
  adminUpdate(id: string, payload: Partial<CouponInput>): Promise<Coupon> {
    return unwrap(api.put(`/coupons/${id}`, payload));
  },
  adminDelete(id: string): Promise<unknown> {
    return api.delete(`/coupons/${id}`);
  },
};
