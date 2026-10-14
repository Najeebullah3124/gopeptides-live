import { test, expect } from '@playwright/test';

test.describe('GoPeptides Customer Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('Verify Age Gate, Welcome Pop-up, Cart, and Checkout Payment Methods', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // 1. Age Gate Popup and verification
    const ageGateTitle = page.locator('#agegate-title');
    await expect(ageGateTitle).toBeVisible();
    await expect(ageGateTitle).toContainText(/18/);

    // Accept Age Gate
    const confirmButton = page.locator('button.btn-cta.agegate-btn');
    await confirmButton.click();
    await expect(ageGateTitle).not.toBeVisible();

    // Verify localStorage key
    const isAgeVerified = await page.evaluate(() => localStorage.getItem('gp-age-verified'));
    expect(isAgeVerified).toBe('yes');

    // 2. Welcome 10% Pop-up triggering, submitting email and copying coupon
    // Wait for the popup timer (set to 1000ms in code)
    const welcomeTitle = page.locator('[role="dialog"] h2:has-text("10%")');
    await expect(welcomeTitle).toBeVisible({ timeout: 5000 });

    // Submit email
    await page.fill('[role="dialog"] input[type="email"]', 'test-popup@example.com');
    await page.click('[role="dialog"] button[type="submit"]');

    // Click "Copy Code"
    const copyButton = page.locator('button:has-text("Copy Code"), button:has-text("Kopieer code")');
    await copyButton.click();
    await expect(page.locator('button:has-text("Copied!"), button:has-text("Gekopieerd!")')).toBeVisible();

    // Check clipboard contents (if permission allowed) or verify dismiss
    const exploreButton = page.locator('button:has-text("Start Exploring"), button:has-text("Begin met ontdekken")');
    await exploreButton.click();
    await expect(welcomeTitle).not.toBeVisible();

    // 3. Browse shop, add a product to cart
    // Go to shop
    await page.goto('/shop');
    
    // Select first product card
    const firstProductCard = page.locator('.product-card').first();
    await expect(firstProductCard).toBeVisible();
    await firstProductCard.click();
    await page.waitForURL(/\/shop\/peptides\/.+/);

    // In Product Details page, click "Add to Cart"
    const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("In winkelwagen"), button:has-text("In Winkelwagen")').first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Click checkout in drawer / cart
    await page.goto('/cart');
    const checkoutBtn = page.locator('a:has-text("Checkout"), a:has-text("Afrekenen"), button:has-text("Checkout"), button:has-text("Afrekenen"), button:has-text("Doorgaan")');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // 4. Entering Checkout and selecting payment methods
    await expect(page).toHaveURL(/\/checkout/);

    // Verify Stripe payment method (default)
    const stripeBtn = page.locator('button:has-text("Card / iDEAL / PayPal")');
    await expect(stripeBtn).toBeVisible();
    await expect(stripeBtn).toHaveClass(/border-primary/);

    // Verify NOWPayments crypto payment method option
    const cryptoBtn = page.locator('button:has-text("Cryptocurrency (NOWPayments)")');
    await expect(cryptoBtn).toBeVisible();
    await cryptoBtn.click();
    await expect(cryptoBtn).toHaveClass(/border-primary/);
    await expect(stripeBtn).not.toHaveClass(/border-primary/);
  });
});
