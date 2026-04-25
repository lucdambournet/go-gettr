import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const DRAFT_KEY = 'family-setup-draft-v1';
const AUTH_KEY = 'gogettr-e2e-auth';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function seedParentWithoutProfile(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        user: { id: 'e2e-parent-auth-user', email: 'parent@example.com' },
        profile: null,
        family: null,
      }),
    );
  }, AUTH_KEY);
}

async function clearAllE2EStorage(page: Page) {
  await page.evaluate(([draftKey, authKey]) => {
    window.sessionStorage.removeItem(draftKey);
    window.sessionStorage.removeItem(authKey);
  }, [DRAFT_KEY, AUTH_KEY]);
}

async function completeStep1(page: Page, opts: { firstName: string; lastName: string; phone?: string }) {
  await page.getByLabel('First name').fill(opts.firstName);
  await page.getByLabel('Last name').fill(opts.lastName);
  if (opts.phone) await page.getByLabel('Phone number').fill(opts.phone);
  await page.getByRole('button', { name: /^continue$/i }).click();
}

async function completeStep2NoSpouse(page: Page) {
  await page.getByRole('button', { name: /no spouse invite/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();
}

async function completeStep2WithSpouse(page: Page, email: string) {
  await page.getByRole('button', { name: /yes, add spouse/i }).click();
  await page.getByLabel('Spouse email').fill(email);
  await page.getByRole('button', { name: /^continue$/i }).click();
}

// ── Landing page + login panel ────────────────────────────────────────────────

test.describe('landing page', () => {
  test.afterEach(async ({ page }) => {
    await clearAllE2EStorage(page);
  });

  test('shows marketing content and login button when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    // Hero headline uses &nbsp; so match just the first word
    await expect(page.getByText(/make chores/i).first()).toBeVisible();
    await expect(page.getByText(/keep everyone accountable/i)).toBeVisible();
  });

  test('login panel slides in when Login button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('login panel closes when backdrop is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
    // Click the backdrop (outside the panel — left side of screen)
    await page.mouse.click(100, 300);
    await expect(page.getByRole('heading', { name: 'Get started' })).not.toBeVisible({ timeout: 3000 });
  });

  test('login panel closes when X button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('heading', { name: 'Get started' })).not.toBeVisible({ timeout: 3000 });
  });

  test('Get Started Free button opens the login panel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started free/i }).click();
    await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
  });

  test('authenticated user with profile is redirected to /Daily', async ({ page }) => {
    await page.addInitScript((key) => {
      window.sessionStorage.setItem(key, JSON.stringify({
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
        family: { id: 'e2e-family-1', name: 'The Paul Family', created_by: 'e2e-parent-auth-user' },
      }));
    }, AUTH_KEY);
    await page.goto('/');
    await expect(page).toHaveURL(/\/Daily/);
  });

  test('authenticated user without profile is redirected to /family/setup', async ({ page }) => {
    await seedParentWithoutProfile(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/family\/setup/);
  });
});

// ── Family setup wizard ───────────────────────────────────────────────────────

test.describe('family setup wizard', () => {
  test.beforeEach(async ({ page }) => {
    await seedParentWithoutProfile(page);
  });

  test.afterEach(async ({ page }) => {
    await clearAllE2EStorage(page);
  });

  // ── Step navigation ──────────────────────────────────────────────────────

  test('starts on step 1 and shows parent detail fields', async ({ page }) => {
    await page.goto('/family/setup');
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Family name')).toBeVisible();
    await expect(page.getByLabel('Phone number')).toBeVisible();
  });

  test('family name auto-derives from last name and stays in sync', async ({ page }) => {
    await page.goto('/family/setup');
    await page.getByLabel('Last name').fill('Johnson');
    await expect(page.getByLabel('Family name')).toHaveValue('The Johnson Family');
    // Manual edit stops auto-sync
    await page.getByLabel('Family name').fill('Team Johnson');
    await page.getByLabel('Last name').fill('Smith');
    await expect(page.getByLabel('Family name')).toHaveValue('Team Johnson');
  });

  test('wizard draft persists across page reload', async ({ page }) => {
    await page.goto('/family/setup');
    await page.getByLabel('First name').fill('Sarah');
    await page.getByLabel('Last name').fill('Johnson');
    await page.reload();
    await expect(page.getByLabel('First name')).toHaveValue('Sarah');
    await expect(page.getByLabel('Last name')).toHaveValue('Johnson');
    await expect(page.getByLabel('Family name')).toHaveValue('The Johnson Family');
  });

  test('step 1 blocks continue with empty required fields', async ({ page }) => {
    await page.goto('/family/setup');
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page.getByText('Enter a first name.')).toBeVisible();
    await expect(page.getByText('Enter a last name.')).toBeVisible();
  });

  test('Cancel setup signs out and navigates to /login', async ({ page }) => {
    await page.goto('/family/setup');
    await page.getByRole('button', { name: /cancel setup/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('back button returns to previous step', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await expect(page.getByRole('button', { name: /yes, add spouse/i })).toBeVisible();
    await page.getByRole('button', { name: /^back$/i }).click();
    await expect(page.getByLabel('First name')).toBeVisible();
  });

  // ── Spouse step ──────────────────────────────────────────────────────────

  test('step 2 blocks continue when spouse enabled but email is empty', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await page.getByRole('button', { name: /yes, add spouse/i }).click();
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page.getByText('Enter your spouse email.')).toBeVisible();
  });

  test('step 2 blocks continue when spouse email is invalid', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await page.getByRole('button', { name: /yes, add spouse/i }).click();
    await page.getByLabel('Spouse email').fill('not-an-email');
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page.getByText('Enter a valid email.')).toBeVisible();
  });

  // ── Children step ────────────────────────────────────────────────────────

  test('step 3 with 0 children shows empty state and allows continue', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await completeStep2NoSpouse(page);
    await expect(page.getByText(/no children added yet/i)).toBeVisible();
    await page.getByRole('button', { name: /^continue$/i }).click();
    // Should reach step 4
    await expect(page.getByRole('button', { name: /create family/i })).toBeVisible();
  });

  test('child fields are validated before continuing', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await completeStep2NoSpouse(page);
    await page.getByLabel('Number of children').fill('1');
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page.getByText('Enter a first name.')).toBeVisible();
    await expect(page.getByText('Enter a last name.')).toBeVisible();
    await expect(page.getByText('Enter a birthdate.')).toBeVisible();
  });

  test('child username auto-fills from first name', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await completeStep2NoSpouse(page);
    await page.getByLabel('Number of children').fill('1');
    await page.getByLabel('Child 1 first name').fill('Emma');
    // Username should auto-derive from first name
    await expect(page.getByLabel('Child 1 username')).toHaveValue('emma');
  });

  test('duplicate child usernames are blocked', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await completeStep2NoSpouse(page);
    await page.getByLabel('Number of children').fill('2');

    // Fill names first, then override auto-filled usernames with the same value
    await page.getByLabel('Child 1 first name').fill('Emma');
    await page.getByLabel('Child 1 last name').fill('Paul');
    await page.getByLabel('Child 1 birthdate').fill('2015-03-15');
    await page.getByLabel('Child 1 username').fill('dupuser');

    await page.getByLabel('Child 2 first name').fill('Liam');
    await page.getByLabel('Child 2 last name').fill('Paul');
    await page.getByLabel('Child 2 birthdate').fill('2018-07-22');
    // Override Liam's auto-filled username with the same as Emma's
    await page.getByLabel('Child 2 username').fill('dupuser');

    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page.getByText('Choose a unique username.').first()).toBeVisible();
  });

  // ── Review step ──────────────────────────────────────────────────────────

  test('review shows all entered information', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul', phone: '555-123-4567' });
    await completeStep2WithSpouse(page, 'jake@example.com');
    await page.getByLabel('Number of children').fill('1');
    await page.getByLabel('Child 1 first name').fill('Emma');
    await page.getByLabel('Child 1 last name').fill('Paul');
    await page.getByLabel('Child 1 birthdate').fill('2015-03-15');
    await page.getByLabel('Child 1 username').fill('emma');
    await page.getByLabel('Child 1 chores').fill('Make bed, Feed the dog');
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expect(page.getByText(/the paul family/i)).toBeVisible();
    await expect(page.getByText('jake@example.com')).toBeVisible();
    await expect(page.getByText(/emma/i).first()).toBeVisible();
    await expect(page.getByText(/make bed/i)).toBeVisible();
    await expect(page.getByText(/feed the dog/i)).toBeVisible();
  });

  // ── Full end-to-end flows ────────────────────────────────────────────────

  test('complete flow: parent only (no spouse, no children)', async ({ page }) => {
    await page.goto('/family/setup');

    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await completeStep2NoSpouse(page);
    // 0 children — just continue
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expect(page.getByRole('button', { name: /create family/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create family/i })).not.toBeDisabled();

    const draftBefore = await page.evaluate((k) => window.sessionStorage.getItem(k), DRAFT_KEY);
    expect(draftBefore).not.toBeNull();

    await page.getByRole('button', { name: /create family/i }).click();

    await expect(page).toHaveURL(/\/Daily/, { timeout: 10000 });

    const draftAfter = await page.evaluate((k) => window.sessionStorage.getItem(k), DRAFT_KEY);
    expect(draftAfter).toBeNull();
  });

  test('complete flow: parent + spouse invite + 1 username child with chores', async ({ page }) => {
    await page.goto('/family/setup');

    await completeStep1(page, { firstName: 'Sarah', lastName: 'Johnson', phone: '555-999-0001' });
    await completeStep2WithSpouse(page, 'jake@example.com');

    await page.getByLabel('Number of children').fill('1');
    await page.getByLabel('Child 1 first name').fill('Emma');
    await page.getByLabel('Child 1 last name').fill('Johnson');
    await page.getByLabel('Child 1 birthdate').fill('2015-03-15');
    await page.getByLabel('Child 1 username').fill('emma-j');
    await page.getByLabel('Child 1 chores').fill('Make bed, Clean room, Homework check');
    await page.getByRole('button', { name: /^continue$/i }).click();

    // Review step
    await expect(page.getByText(/the johnson family/i)).toBeVisible();
    await expect(page.getByText('jake@example.com')).toBeVisible();
    await expect(page.getByText(/emma/i).first()).toBeVisible();
    await expect(page.getByText(/make bed/i)).toBeVisible();

    await page.getByRole('button', { name: /create family/i }).click();

    await expect(page).toHaveURL(/\/Daily/, { timeout: 10000 });
    const draftAfter = await page.evaluate((k) => window.sessionStorage.getItem(k), DRAFT_KEY);
    expect(draftAfter).toBeNull();
  });

  test('complete flow: parent + 2 children (1 username, 1 email-invite)', async ({ page }) => {
    await page.goto('/family/setup');

    await completeStep1(page, { firstName: 'Mike', lastName: 'Rivera' });
    await completeStep2NoSpouse(page);

    await page.getByLabel('Number of children').fill('2');

    // Child 1: username mode (default)
    await page.getByLabel('Child 1 first name').fill('Sofia');
    await page.getByLabel('Child 1 last name').fill('Rivera');
    await page.getByLabel('Child 1 birthdate').fill('2014-06-10');
    await page.getByLabel('Child 1 username').fill('sofia-r');
    await page.getByLabel('Child 1 chores').fill('Wash dishes, Set the table');

    // Child 2: switch to email invite mode
    await page.getByLabel('Child 2 first name').fill('Marco');
    await page.getByLabel('Child 2 last name').fill('Rivera');
    await page.getByLabel('Child 2 birthdate').fill('2017-11-22');
    // Switch child 2 to email mode — find the Email button in child 2's card
    const emailButtons = page.getByRole('button', { name: /^email$/i });
    await emailButtons.last().click();
    await page.getByLabel('Child 2 email').fill('marco@example.com');

    await page.getByRole('button', { name: /^continue$/i }).click();

    // Review
    await expect(page.getByText(/the rivera family/i)).toBeVisible();
    await expect(page.getByText(/sofia/i).first()).toBeVisible();
    await expect(page.getByText(/marco/i).first()).toBeVisible();
    await expect(page.getByText(/email invite/i)).toBeVisible();
    await expect(page.getByText(/wash dishes/i)).toBeVisible();

    await page.getByRole('button', { name: /create family/i }).click();

    await expect(page).toHaveURL(/\/Daily/, { timeout: 10000 });
    const draftAfter = await page.evaluate((k) => window.sessionStorage.getItem(k), DRAFT_KEY);
    expect(draftAfter).toBeNull();
  });

  test('complete flow: clicking a suggested chore chip adds it to the input', async ({ page }) => {
    await page.goto('/family/setup');
    await completeStep1(page, { firstName: 'Jane', lastName: 'Paul' });
    await completeStep2NoSpouse(page);
    await page.getByLabel('Number of children').fill('1');
    await page.getByLabel('Child 1 first name').fill('Mia');
    await page.getByLabel('Child 1 last name').fill('Paul');
    await page.getByLabel('Child 1 birthdate').fill('2016-01-01');

    // Click a suggested chore chip
    await page.getByRole('button', { name: 'Make bed' }).click();
    const choreInput = page.getByLabel('Child 1 chores');
    await expect(choreInput).toHaveValue(/Make bed/);

    // Click another chip — it should be appended
    await page.getByRole('button', { name: 'Take out trash' }).click();
    await expect(choreInput).toHaveValue(/Make bed/);
    await expect(choreInput).toHaveValue(/Take out trash/);
  });
});
