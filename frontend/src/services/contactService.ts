import { api } from './api';

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactService = {
  submit(payload: ContactInput): Promise<unknown> {
    return api.post('/contact', payload);
  },
};
