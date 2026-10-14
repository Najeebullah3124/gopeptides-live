export interface Address {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id' | 'userId' | 'phone' | 'isDefault'> & {
  phone?: string;
  isDefault?: boolean;
};
