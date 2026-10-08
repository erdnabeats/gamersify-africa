import { test, expect } from './fixtures';

test.describe('Team Manager portal', () => {
  test('team manager session is recognized', async ({ managerPage }) => {
    const response = await managerPage.request.get('/api/auth/me');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    expect(data.authenticated).toBe(true);
    expect(data.user.role).toBe('Team Manager');
    expect(data.user.teamId).toBeTruthy();
  });

  test('team manager can access manager data', async ({ managerPage }) => {
    const response = await managerPage.request.get('/api/manager/me');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    expect(data).toBeTruthy();
  });
});
