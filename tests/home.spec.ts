import { test, expect } from '@playwright/test';

const authStorageKey = 'gogettr-e2e-auth';

function seedFullyAuthenticatedParent(page: import('@playwright/test').Page) {
  return page.addInitScript((storageKey) => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        user: { id: 'e2e-parent-auth-user', email: 'parent@example.com' },
        profile: {
          id: 'e2e-parent-profile-1',
          auth_user_id: 'e2e-parent-auth-user',
          first_name: 'Jane',
          last_name: 'Paul',
          name: 'Jane Paul',
          email: 'parent@example.com',
          role: 'parent',
          is_parent: true,
          family_id: 'e2e-family-1',
        },
        family: {
          id: 'e2e-family-1',
          name: 'The Paul Family',
          created_by: 'e2e-parent-auth-user',
        },
      }),
    );
  }, authStorageKey);
}

test.describe('Home page (Daily)', () => {
  test.beforeEach(async ({ page }) => {
    await seedFullyAuthenticatedParent(page);
    await page.goto('/Daily');
    await page.waitForURL('**/Daily');
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate((key) => {
      try { window.sessionStorage.removeItem(key); } catch { /* cross-origin pages have no storage */ }
    }, authStorageKey);
  });

  test('landing page redirects authenticated user from / to /Daily', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/Daily/);
  });

  test('renders the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: "Today's Chores" })).toBeVisible();
  });

  test('displays the current day label', async ({ page }) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[new Date().getDay()];
    await expect(page.getByText(new RegExp(dayName))).toBeVisible();
  });

  test('shows the app layout with navigation', async ({ page }) => {
    await expect(page.getByRole('link', { name: /today/i }).first()).toBeVisible();
  });

  test('shows page heading - not blank', async ({ page }) => {
    await expect(page.getByRole('heading', { name: "Today's Chores" })).toBeVisible({ timeout: 10000 });
  });

  test('page title is GoGettr', async ({ page }) => {
    await expect(page).toHaveTitle('GoGettr');
  });
});
