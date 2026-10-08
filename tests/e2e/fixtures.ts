import { test as base, expect, type Page } from '@playwright/test';

type AuthenticatedFixtures = {
  adminPage: Page;
  managerPage: Page;
};

async function loginThroughUI(
  page: Page,
  email: string | undefined,
  password: string | undefined,
  type: 'admin' | 'manager'
) {
  if (!email || !password) {
    throw new Error(
      `${type} credentials are not configured. ` +
      `Set the required E2E environment variables first.`
    );
  }

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const loginButton =
    type === 'admin'
      ? page.getByRole('button', { name: /Admin Login|Admin/i }).first()
      : page.getByRole('button', { name: /Team Manager/i }).first();

  await expect(loginButton).toBeVisible();
  await loginButton.click();

  await expect(
    page.getByRole('heading', {
      name:
        type === 'admin'
          ? 'Admin Login'
          : 'Team Manager Login',
    })
  ).toBeVisible();

  const emailInput = page.locator(
    'input[type="email"], input[placeholder*="email" i]'
  ).first();

  const passwordInput = page.locator(
    'input[type="password"]'
  ).first();

  await emailInput.fill(email);
  await passwordInput.fill(password);

  const loginResponsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/auth/login') &&
      response.request().method() === 'POST'
  );

  await page.getByRole('button', { name: 'Sign In' }).click();

  const loginResponse = await loginResponsePromise;

  const loginStatus = loginResponse.status();
  const loginBody = await loginResponse.text();

  if (!loginResponse.ok()) {
    throw new Error(
      `${type} UI login failed. ` +
      `POST /api/auth/login returned ${loginStatus}: ${loginBody}`
    );
  }

  // Give the browser a moment to process Set-Cookie and update the UI.
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(250);

  const cookies = await page.context().cookies();

  const sessionCookie = cookies.find(
    cookie => cookie.name === 'gamersify_session'
  );

  if (!sessionCookie) {
    throw new Error(
      `${type} login returned ${loginStatus} but no ` +
      `gamersify_session cookie was stored. ` +
      `Login response: ${loginBody}`
    );
  }

  if (type === 'admin') {
    await expect(page.locator('body')).toContainText(
      /Gamersify Africa \/ Operations/i
    );
  } else {
    const managerResponse = await page.request.get('/api/manager/me');

    if (!managerResponse.ok()) {
      const body = await managerResponse.text();

      throw new Error(
        `Manager login returned ${loginStatus} and created a session cookie, ` +
        `but GET /api/manager/me returned ${managerResponse.status()}: ${body}`
      );
    }

    const managerData = await managerResponse.json();

    expect(managerData?.user?.role).toBe('Team Manager');
    expect(managerData?.user?.teamId).toBeTruthy();
  }

  return sessionCookie;
}

export const test = base.extend<AuthenticatedFixtures>({
  adminPage: async ({ page }, use) => {
    await loginThroughUI(
      page,
      process.env.E2E_ADMIN_EMAIL,
      process.env.E2E_ADMIN_PASSWORD,
      'admin'
    );

    await use(page);
  },

  managerPage: async ({ page }, use) => {
    await loginThroughUI(
      page,
      process.env.E2E_MANAGER_EMAIL,
      process.env.E2E_MANAGER_PASSWORD,
      'manager'
    );

    await use(page);
  },
});

export { expect };