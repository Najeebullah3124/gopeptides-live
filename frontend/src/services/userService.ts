import { api, unwrap } from './api';
import type { User } from '@/types/user';
import type { Address, AddressInput } from '@/types/address';

export const userService = {
  getProfile(): Promise<User> {
    return unwrap(api.get('/users/profile'));
  },
  updateProfile(payload: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone'>>): Promise<User> {
    return unwrap(api.put('/users/profile', payload));
  },
  changePassword(currentPassword: string, newPassword: string): Promise<unknown> {
    return api.put('/users/password', { currentPassword, newPassword });
  },
  listAddresses(): Promise<Address[]> {
    return unwrap(api.get('/users/addresses'));
  },
  createAddress(payload: AddressInput): Promise<Address> {
    return unwrap(api.post('/users/addresses', payload));
  },
  updateAddress(id: string, payload: AddressInput): Promise<Address> {
    return unwrap(api.put(`/users/addresses/${id}`, payload));
  },
  deleteAddress(id: string): Promise<unknown> {
    return api.delete(`/users/addresses/${id}`);
  },
};
