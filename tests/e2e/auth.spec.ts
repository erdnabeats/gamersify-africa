import { test, expect } from '@playwright/test';

test.describe('Gamersify authentication', () => {
  test('admin can authenticate through the real API', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;

    test.skip(
      !email || !password,
      'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required'
    );

    const response = await page.request.post('/api/auth/login', {
      data: {
        email,
        password,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe(email!.toLowerCase());
    expect(data.user.role).toBe('Super Admin');

    const me = await page.request.get('/api/auth/me');

    expect(me.ok()).toBeTruthy();

    const meData = await me.json();

    expect(meData.authenticated).toBe(true);
    expect(meData.user.email).toBe(email!.toLowerCase());
    expect(meData.user.role).toBe('Super Admin');
  });

  test('team manager can authenticate through the real API', async ({ page }) => {
    const email = process.env.E2E_MANAGER_EMAIL;
    const password = process.env.E2E_MANAGER_PASSWORD;

    test.skip(
      !email || !password,
      'E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD are required'
    );

    const response = await page.request.post('/api/auth/login', {
      data: {
        email,
        password,
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe(email!.toLowerCase());
    expect(data.user.role).toBe('Team Manager');
    expect(data.user.teamId).toBeTruthy();

    const me = await page.request.get('/api/auth/me');

    expect(me.ok()).toBeTruthy();

    const meData = await me.json();

    expect(meData.authenticated).toBe(true);
    expect(meData.user.role).toBe('Team Manager');
    expect(meData.user.teamId).toBeTruthy();
  });

  test('invalid credentials are rejected', async ({ page }) => {
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: 'invalid-e2e-user@gamersify.test',
        password: 'definitely-not-valid',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('unauthenticated admin API request is rejected', async ({ page }) => {
    const response = await page.request.get('/api/admin/backup/status');

    expect(response.status()).toBe(401);
  });
});
