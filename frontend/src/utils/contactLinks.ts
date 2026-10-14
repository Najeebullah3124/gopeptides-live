import { CONTACT } from '@/constants';

type ContactLike = {
  email?: string;
  whatsappNumber?: string;
};

type SocialLike = {
  whatsapp?: string;
};

function digitsOnly(value?: string): string {
  return (value || '').replace(/\D/g, '');
}

export function resolveSupportEmail(contact?: ContactLike): string {
  return contact?.email || CONTACT.email;
}

export function resolveWhatsAppHref(contact?: ContactLike, social?: SocialLike): string {
  const configuredNumber = digitsOnly(contact?.whatsappNumber);
  if (configuredNumber) {
    return `https://api.whatsapp.com/send?phone=${configuredNumber}`;
  }

  const socialValue = (social?.whatsapp || '').trim();
  if (socialValue) {
    if (/^https?:\/\//i.test(socialValue)) {
      return socialValue;
    }

    const socialNumber = digitsOnly(socialValue);
    if (socialNumber) {
      return `https://api.whatsapp.com/send?phone=${socialNumber}`;
    }
  }

  return `https://api.whatsapp.com/send?phone=${digitsOnly(CONTACT.whatsappNumber)}`;
}
