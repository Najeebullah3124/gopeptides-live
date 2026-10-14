import 'dotenv/config';
import { isWallidConfigured } from '../src/config/wallid';
import { createWallidPayment } from '../src/services/wallidService';

async function main() {
  console.log('configured=', isWallidConfigured());
  console.log('base=', process.env.WALLID_API_BASE_URL || 'https://payment-api.wallid.co');
  const r = await createWallidPayment({
    total: 1,
    orderNumber: `WALLID-SMOKE-${Date.now()}`,
    currency: 'EUR',
    checkoutUrl: 'http://localhost:5173/checkout',
    successUrl: 'http://localhost:5173/order-confirmation?orderId=smoke&wallid=1',
    items: [
      {
        name: 'Smoke test peptide',
        quantity: 1,
        lineTotal: 1,
        imageUrl: 'https://gopeptides.nl/logo-336.webp',
        productUrl: 'https://gopeptides.nl/shop',
      },
    ],
  });
  console.log('paymentId=', r.paymentId);
  console.log('redirect=', r.redirectUrl.slice(0, 120) + '...');
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err.message || err);
  process.exit(1);
});
