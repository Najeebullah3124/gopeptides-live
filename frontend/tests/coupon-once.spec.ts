import { test, expect } from '@playwright/test';

test.describe('Coupon Once-Per-User Feature', () => {
  const backendUrl = 'http://localhost:3001/api';

  test('should enforce once-per-user restriction on coupons', async ({ request }) => {
    // 1. Log in as admin to manage coupons
    const loginRes = await request.post(`${backendUrl}/auth/login`, {
      data: {
        email: 'admin@gopeptides.nl',
        password: process.env.E2E_ADMIN_PASSWORD || ''
      }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const adminToken = loginData.data.accessToken;

    // 2. Fetch a product to place orders
    const productsRes = await request.get(`${backendUrl}/products`);
    expect(productsRes.ok()).toBeTruthy();
    const productsData = await productsRes.json();
    const product = productsData.data[0];
    expect(product).toBeDefined();

    // 3. Create a unique coupon with oncePerUser: true
    const couponCode = `ONCE_${Date.now()}`;
    const createRes = await request.post(`${backendUrl}/coupons`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      data: {
        code: couponCode,
        discount: 10,
        type: 'percent',
        oncePerUser: true,
        isActive: true
      }
    });
    expect(createRes.ok()).toBeTruthy();

    // 4. Validate the coupon for the first time for guest email (should succeed)
    const guestEmail = `test-${Date.now()}@example.com`;
    const validateRes1 = await request.post(`${backendUrl}/coupons/validate`, {
      data: {
        code: couponCode,
        subtotal: 100,
        email: guestEmail
      }
    });
    expect(validateRes1.ok()).toBeTruthy();
    const validateData1 = await validateRes1.json();
    expect(validateData1.data.code).toBe(couponCode);

    // 5. Place a guest order with that coupon
    const orderRes1 = await request.post(`${backendUrl}/orders/guest`, {
      data: {
        guestEmail,
        couponCode,
        paymentMethod: 'stripe',
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: 'Test Street 123',
          city: 'Amsterdam',
          postalCode: '1234 AB',
          country: 'Netherlands'
        }
      }
    });
    expect(orderRes1.ok()).toBeTruthy();

    // 6. Try to validate the coupon again for the same guest email (should fail)
    const validateRes2 = await request.post(`${backendUrl}/coupons/validate`, {
      data: {
        code: couponCode,
        subtotal: 100,
        email: guestEmail
      }
    });
    expect(validateRes2.status()).toBe(400);
    const validateData2 = await validateRes2.json();
    expect(validateData2.message).toContain('Coupon has already been used by this user');

    // 7. Try to place a second order with the same coupon and email (should fail)
    const orderRes2 = await request.post(`${backendUrl}/orders/guest`, {
      data: {
        guestEmail,
        couponCode,
        paymentMethod: 'stripe',
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: 'Test Street 123',
          city: 'Amsterdam',
          postalCode: '1234 AB',
          country: 'Netherlands'
        }
      }
    });
    expect(orderRes2.status()).toBe(400);
    const orderData2 = await orderRes2.json();
    expect(orderData2.message).toContain('Coupon has already been used by this user');

    // 8. Try to validate the coupon with a DIFFERENT email (should succeed)
    const otherEmail = `other-${Date.now()}@example.com`;
    const validateRes3 = await request.post(`${backendUrl}/coupons/validate`, {
      data: {
        code: couponCode,
        subtotal: 100,
        email: otherEmail
      }
    });
    expect(validateRes3.ok()).toBeTruthy();
  });
});
