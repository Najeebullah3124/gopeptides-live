import { test, expect } from '@playwright/test';

test.describe('GoPeptides Admin Settings & Categories Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Login page
    await page.goto('/login');

    // Explicitly seed localStorage to bypass age gate and welcome popup
    await page.evaluate(() => {
      localStorage.setItem('gp-age-verified', 'yes');
      localStorage.setItem('gp-welcome-dismissed', 'yes');
    });

    // Reload page to apply localStorage settings
    await page.reload();

    // Log in as administrator
    await page.fill('input[type="email"]', 'admin@gopeptides.nl');
    await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD || '');
    const loginResponse = page.waitForResponse(
      (res) => res.url().includes('/api/auth/login') && res.status() === 200,
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /Inloggen|Log in/i }).click();
    await loginResponse;
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Verify Admin Settings Panel extensions and Guides', async ({ page }) => {
    // Navigate to Admin Settings
    await page.goto('/admin/settings');
    
    // Check main panel title
    await expect(page.locator('h2').first()).toContainText(/(Control Panel Settings|Website Instellingen|admin.settings.title)/i);

    // 1. Integrations tab checking
    const integrationsTabBtn = page.locator('button:has-text("Integrations"), button:has-text("Integraties"), button:has-text("Integrationen")');
    await expect(integrationsTabBtn).toBeVisible();
    await integrationsTabBtn.click();

    // Verify presence of Telegram, Email Alerts, NOWPayments, and PrintNode panels
    await expect(page.locator('h3').filter({ hasText: /(Telegram Bot Alerts|Telegram Bot Meldingen|Telegram-Bot-Benachrichtigungen)/ })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: /(Email Order Alerts|E-mail Bestellingswaarschuwingen|E-Mail-Bestellbenachrichtigungen)/ })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: /(NOWPayments \(Crypto Payments\)|NOWPayments \(Crypto Betalingen\)|NOWPayments \(Krypto-Zahlungen\))/ })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: /(PrintNode Cloud Printing|PrintNode Cloud Printen|PrintNode Cloud-Drucken)/ })).toBeVisible();

    // 2. Verify settings form fields inside Integrations
    const telegramTokenField = page.locator('input[placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"]');
    await expect(telegramTokenField).toBeVisible();

    const nowPaymentsKeyField = page.locator('input[placeholder="NOWPAYMENTS-API-KEY-HERE"]');
    await expect(nowPaymentsKeyField).toBeVisible();

    const printNodeKeyField = page.locator('input[placeholder="PRINTNODE-API-KEY-HERE"]');
    await expect(printNodeKeyField).toBeVisible();

    // 3. Guides & Help tab validation
    const guidesTabBtn = page.locator('button:has-text("Guides & Help"), button:has-text("Gidsen & Hulp"), button:has-text("Anleitungen & Hilfe")');
    await expect(guidesTabBtn).toBeVisible();
    await guidesTabBtn.click();

    // Verify guides contents are visible
    await expect(page.locator('h3').filter({ hasText: /(Bank Payout Connection Guide|Bank Uitbetaling Connectie Gids|Leitfaden für Bankauszahlungsverbindungen)/ })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: /(Custom Payment Gateway Integration|Aangepaste Betalingsgateway Integratie|Integration benutzerdefinierter Zahlungsgateways)/ })).toBeVisible();
  });

  test('Verify Admin Categories CRUD Operations', async ({ page }) => {
    const uniqueId = Date.now();
    const categoryName = `Test Category Playwright ${uniqueId}`;
    const categorySlug = `test-category-playwright-${uniqueId}`;
    const categoryNameUpdated = `Test Category Updated ${uniqueId}`;

    // Navigate to Admin Categories page
    await page.goto('/admin/categories');
    await expect(page.locator('h2').first()).toContainText(/(Product Categories|Productcategorieën|Produktkategorien|admin.categories.title)/i);

    // CREATE operation
    const newCategoryBtn = page.locator('button:has-text("New Category"), button:has-text("Nieuwe categorie"), button:has-text("Neue Kategorie")');
    await expect(newCategoryBtn).toBeVisible();
    await newCategoryBtn.click();

    // Form inputs in modal
    await page.fill('input[placeholder="Peptides"]', categoryName);
    // Slug is auto-generated
    await expect(page.locator('input[placeholder="peptides"]')).toHaveValue(categorySlug);
    await page.fill('textarea[placeholder="Category description..."]', 'This is a test category created by automation.');
    
    // Save/Create Category
    await page.click('button:has-text("Create"), button:has-text("Aanmaken"), button:has-text("Erstellen")');
    
    // Wait for the modal/dialog to close completely
    await expect(page.locator('role=dialog')).not.toBeVisible();
    
    // Verify it exists in table
    const createdCell = page.locator(`td:has-text("${categoryName}")`);
    await expect(createdCell).toBeVisible();

    // UPDATE operation
    const row = page.locator(`tr:has(td:has-text("${categoryName}"))`);
    await row.locator('button:has-text("Edit"), button:has-text("Bewerken"), button:has-text("Bearbeiten")').click();
    await page.fill('input[placeholder="Peptides"]', categoryNameUpdated);
    await page.click('button:has-text("Save"), button:has-text("Opslaan"), button:has-text("Speichern")');

    // Wait for the modal/dialog to close completely
    await expect(page.locator('role=dialog')).not.toBeVisible();

    // Verify it updated
    const updatedCell = page.locator(`td:has-text("${categoryNameUpdated}")`);
    await expect(updatedCell).toBeVisible();

    // DELETE operation
    // Dialog confirm is mocked in Playwright
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete category');
      await dialog.accept();
    });
    
    const updatedRow = page.locator(`tr:has(td:has-text("${categoryNameUpdated}"))`);
    await updatedRow.locator('button:has-text("Delete"), button:has-text("Verwijderen"), button:has-text("Löschen")').click();

    // Verify it was deleted
    await expect(updatedCell).not.toBeVisible();
  });
});
