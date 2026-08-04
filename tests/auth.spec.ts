import { test, expect } from '@playwright/test';

test.describe('Authentication Lifecycle', () => {

  test('bootstrap succeeds and transitions to AUTHENTICATED', async ({ page }) => {
    // Mock the /auth/me endpoint to succeed
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, email: 'e2e@test.com' } })
      });
    });

    await page.goto('/login');
    // It should automatically redirect from login to dashboard on auth success
    await page.waitForURL('**/app/dashboard');
    expect(page.url()).toContain('/app/dashboard');
  });

  test('refresh failure falls back to guest mode', async ({ page }) => {
    // Mock auth/me to fail
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ status: 401 });
    });
    // Mock refresh to fail
    await page.route('**/api/v1/auth/refresh', async route => {
      await route.fulfill({ status: 401 });
    });
    // Mock guest/init to succeed
    await page.route('**/api/v1/guest/init', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'guest_token', executions_used: 0, executions_max: 10, expires_at: new Date(Date.now() + 86400000).toISOString() })
      });
    });

    await page.goto('/app/dashboard'); // AuthGuard is on dashboard
    // If guest succeeds but we need full auth for dashboard, it might bounce to /login or /signup
    // In our app, /login is the fallback for UNAUTHENTICATED or GUEST if trying to access /app
    await page.waitForURL('**/login*');
    expect(page.url()).toContain('/login');
  });

});
