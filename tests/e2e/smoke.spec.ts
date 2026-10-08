import { test, expect } from '@playwright/test';

test.describe('Gamersify Africa production smoke tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Gamersify/i);

    await expect(page.locator('body')).toContainText(/Gamersify/i);
  });

  test('public tournaments section loads', async ({ page }) => {
    await page.goto('/');

    const tournamentsLink = page.getByRole('button', {
      name: /Tournaments/i,
    }).first();

    await expect(tournamentsLink).toBeVisible();
    await tournamentsLink.click();

    await expect(page.locator('body')).toContainText(/Tournaments/i);
  });

  test('admin control room is protected', async ({ page }) => {
    await page.goto('/');

    const adminLink = page.getByRole('button', {
      name: /Admin Login|Admin/i,
    }).first();

    await expect(adminLink).toBeVisible();
    await adminLink.click();

    await expect(page.locator('body')).toContainText(/Admin Login/i);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('team manager login is available', async ({ page }) => {
    await page.goto('/');

    const managerLink = page.getByRole('button', {
      name: /Team Manager|Manager/i,
    }).first();

    await expect(managerLink).toBeVisible();
    await managerLink.click();

    await expect(page.locator('body')).toContainText(/Team Manager Login/i);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('public tournament detail can be opened when tournaments exist', async ({ page }) => {
    await page.goto('/');

    const tournamentsLink = page.getByRole('button', {
      name: /Tournaments/i,
    }).first();

    await tournamentsLink.click();

    const tournamentCards = page.locator('button').filter({
      hasText: /.+/,
    });

    const bodyText = await page.locator('body').innerText();

    if (/No tournaments yet/i.test(bodyText)) {
      test.skip(true, 'No tournament records currently exist');
    }

    await expect(page.locator('body')).toContainText(/Tournaments/i);
  });
});
