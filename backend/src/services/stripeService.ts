import Stripe from 'stripe';
import { getStripe } from '../config/stripe';

export interface CreateIntentInput {
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  description?: string;
}

export async function createPaymentIntent(input: CreateIntentInput): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: input.currency || 'eur',
    automatic_payment_methods: { enabled: true },
    receipt_email: input.customerEmail,
    description: input.description,
    metadata: input.metadata || {},
  });
}

export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.retrieve(id);
}

export async function refundPayment(paymentIntentId: string, amountCents?: number): Promise<Stripe.Refund> {
  const stripe = getStripe();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });
}

export function constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
