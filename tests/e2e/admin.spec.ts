import { test, expect } from './fixtures';

test.describe('Admin control room', () => {
  test('admin can access the control room', async ({ adminPage }) => {
    await expect(adminPage.locator('body')).toContainText(
      /Gamersify Africa \/ Operations/i
    );

    await expect(
      adminPage.getByRole('button', { name: 'Overview' }).first()
    ).toBeVisible();

    await expect(
      adminPage.getByRole('button', { name: 'Teams' }).first()
    ).toBeVisible();

    await expect(
      adminPage.getByRole('button', { name: 'Tournaments' }).first()
    ).toBeVisible();

    await expect(
      adminPage.getByRole('button', { name: 'Matches' }).first()
    ).toBeVisible();
  });

  test('admin session is recognized by the frontend', async ({ adminPage }) => {
    const response = await adminPage.request.get('/api/auth/me');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    expect(data.authenticated).toBe(true);
    expect(data.user.role).toBe('Super Admin');
  });
});
