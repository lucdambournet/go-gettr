import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const draftStorageKey = 'family-setup-draft-v1';
const authStorageKey = 'gogettr-e2e-auth';
const storageResetMarkerKey = 'gogettr-e2e-storage-reset';

async function seedAuthenticatedParentWithoutProfile(page: Page) {
  await page.addInitScript((storageKey) => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        user: {
          id: 'e2e-parent-auth-user',
          email: 'parent@example.com',
        },
        profile: null,
        family: null,
      }),
    );
  }, authStorageKey);
}

test.describe('family setup wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(([draftKey, authKey, markerKey]) => {
      if (window.sessionStorage.getItem(markerKey)) {
        return;
      }

      window.sessionStorage.removeItem(draftKey);
      window.sessionStorage.removeItem(authKey);
      window.sessionStorage.setItem(markerKey, 'true');
    }, [draftStorageKey, authStorageKey, storageResetMarkerKey]);
  });

  test('shows the parent account entry points on login', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /^create account$/i }).nth(1)).toBeVisible();
  });

  test('persists wizard draft data across refresh', async ({ page }) => {
    await seedAuthenticatedParentWithoutProfile(page);
    await page.goto('/family/setup');

    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Paul');
    await page.reload();

    await expect(page.getByLabel('First name')).toHaveValue('Jane');
    await expect(page.getByLabel('Last name')).toHaveValue('Paul');
    await expect(page.getByLabel('Family name')).toHaveValue('The Paul Family');
  });

  test('creates the family only on final submit and clears the draft after success', async ({ page }) => {
    await seedAuthenticatedParentWithoutProfile(page);
    await page.goto('/family/setup');

    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Paul');
    await page.getByRole('button', { name: /^continue$/i }).click();

    await page.getByRole('button', { name: /no spouse invite/i }).click();
    await page.getByRole('button', { name: /^continue$/i }).click();

    await page.getByLabel('Number of children').fill('1');
    await page.getByLabel('Child 1 first name').fill('Mia');
    await page.getByLabel('Child 1 last name').fill('Paul');
    await page.getByLabel('Child 1 birthdate').fill('2016-01-01');
    await page.getByLabel('Child 1 username').fill('mia');
    await page.getByLabel('Child 1 chores').fill('Clean room, Wash dishes');
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expect(page.getByText(/the paul family/i)).toBeVisible();
    await expect(page.getByText(/clean room/i)).toBeVisible();

    const draftBeforeSubmit = await page.evaluate((storageKey) => {
      return window.sessionStorage.getItem(storageKey);
    }, draftStorageKey);
    expect(draftBeforeSubmit).not.toBeNull();

    await page.getByRole('button', { name: /create family/i }).click();

    await expect(page).toHaveURL(/\/Daily/);

    const draftAfterSubmit = await page.evaluate((storageKey) => {
      return window.sessionStorage.getItem(storageKey);
    }, draftStorageKey);
    expect(draftAfterSubmit).toBeNull();
  });
});
