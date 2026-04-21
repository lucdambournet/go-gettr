# Family Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a draft-backed onboarding wizard that lets a parent authenticate, define a family, add spouse and children, assign chores during child setup, and persist nothing until the final `Create Family` submit.

**Architecture:** Keep the public `/login` route as the auth entry point, then move authenticated users without a profile into a session-backed `/family/setup` wizard. Extract wizard state, validation, username auth aliasing, and final save orchestration into focused helper modules so the page components stay small and the tricky behavior is unit-tested instead of buried in JSX.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Supabase auth/database, Zod, Playwright, Vitest

---

## File Structure

### New files

- `docs/superpowers/plans/2026-04-20-family-setup-wizard.md`
- `src/lib/familySetupDraft.ts`
- `src/lib/familySetupTypes.ts`
- `src/lib/familySetupValidation.ts`
- `src/lib/familySetupAuth.ts`
- `src/lib/familySetupSave.ts`
- `src/components/family-setup/ChildCard.tsx`
- `src/components/family-setup/StepHeader.tsx`
- `src/components/family-setup/ReviewSection.tsx`
- `tests/family-setup.spec.ts`
- `src/lib/__tests__/familySetupDraft.test.ts`
- `src/lib/__tests__/familySetupValidation.test.ts`
- `src/lib/__tests__/familySetupAuth.test.ts`
- `src/lib/__tests__/familySetupSave.test.ts`
- `vitest.config.ts`
- `src/test/setup.ts`
- `supabase/migrations/20260420_add_profile_phone_number.sql`

### Modified files

- `package.json`
- `src/pages/Login.tsx`
- `src/pages/FamilySetup.tsx`
- `src/lib/AuthContext.tsx`
- `src/types/entities.ts`
- `playwright.config.ts`

### Responsibilities

- `familySetupTypes.ts` defines the wizard draft and save payload shapes.
- `familySetupDraft.ts` owns session-storage persistence and default draft creation.
- `familySetupValidation.ts` owns all per-step validation and helper transforms.
- `familySetupAuth.ts` owns username normalization, internal auth-email alias generation, and starter-password suggestion rules.
- `familySetupSave.ts` owns the final database write orchestration and is the single place where wizard data becomes database rows.
- `Login.tsx` handles auth entry and the parent account step only.
- `FamilySetup.tsx` handles the authenticated wizard UI only.

### Implementation notes

- Do not store child starter passwords in the database during this feature. Generate and display them in the wizard draft and success state only.
- Keep chores unassigned for email-invite children because no child profile exists yet.
- Use Vitest for helper-level TDD and Playwright for end-to-end happy path coverage.

---

### Task 1: Add a Fast Test Harness for Wizard Helpers

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Test: `src/lib/__tests__/familySetupDraft.test.ts`

- [ ] **Step 1: Write the failing draft test**

```ts
import { describe, expect, it } from 'vitest';
import {
  createEmptyFamilySetupDraft,
  deriveDefaultFamilyName,
} from '@/lib/familySetupDraft';

describe('familySetupDraft', () => {
  it('derives the default family name from the parent last name', () => {
    expect(deriveDefaultFamilyName('Paul')).toBe('The Paul Family');
  });

  it('creates a draft with one empty child slot when requested', () => {
    const draft = createEmptyFamilySetupDraft({ childCount: 1 });
    expect(draft.children).toHaveLength(1);
    expect(draft.children[0].accountMode).toBe('username');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/familySetupDraft.test.ts`

Expected: FAIL with module-not-found errors for `familySetupDraft`.

- [ ] **Step 3: Add the Vitest configuration and minimal draft implementation**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

```ts
// src/lib/familySetupDraft.ts
export function deriveDefaultFamilyName(lastName: string) {
  const trimmed = lastName.trim();
  return trimmed ? `The ${trimmed} Family` : '';
}

export function createEmptyFamilySetupDraft({
  childCount = 0,
}: { childCount?: number } = {}) {
  return {
    parent: { firstName: '', lastName: '', phoneNumber: '' },
    familyName: '',
    familyNameManuallyEdited: false,
    spouse: { enabled: false, email: '' },
    children: Array.from({ length: childCount }, () => ({
      firstName: '',
      lastName: '',
      birthdate: '',
      accountMode: 'username' as const,
      email: '',
      username: '',
      starterPassword: '',
      choresInput: '',
      chores: [],
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/familySetupDraft.test.ts`

Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts src/test/setup.ts src/lib/familySetupDraft.ts src/lib/__tests__/familySetupDraft.test.ts
git commit -m "test: add wizard helper test harness"
```

---

### Task 2: Add the Database Field and Shared Wizard Types

**Files:**
- Create: `supabase/migrations/20260420_add_profile_phone_number.sql`
- Create: `src/lib/familySetupTypes.ts`
- Modify: `src/types/entities.ts`
- Test: `src/lib/__tests__/familySetupAuth.test.ts`

- [ ] **Step 1: Write the failing auth helper test**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildInternalAuthEmail,
  suggestStarterPassword,
} from '@/lib/familySetupAuth';

describe('familySetupAuth', () => {
  it('builds a hidden internal auth email from a username', () => {
    expect(buildInternalAuthEmail('mom@gmail.com')).toBe('mom-at-gmail-com@users.gogettr.local');
  });

  it('builds a memorable starter password from the last name', () => {
    expect(suggestStarterPassword('Paul')).toBe('Paul123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/familySetupAuth.test.ts`

Expected: FAIL with module-not-found errors for `familySetupAuth`.

- [ ] **Step 3: Add the migration, auth helpers, and types**

```sql
-- supabase/migrations/20260420_add_profile_phone_number.sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;
```

```ts
// src/lib/familySetupAuth.ts
export function buildInternalAuthEmail(username: string) {
  const normalized = username.trim().toLowerCase().replace(/@/g, '-at-').replace(/\./g, '-');
  return `${normalized}@users.gogettr.local`;
}

export function suggestStarterPassword(lastName: string) {
  const safe = lastName.trim().replace(/[^a-z0-9]/gi, '') || 'Kid';
  return `${safe}123`;
}
```

```ts
// src/lib/familySetupTypes.ts
export type ChildAccountMode = 'email' | 'username';

export interface FamilySetupChildDraft {
  firstName: string;
  lastName: string;
  birthdate: string;
  accountMode: ChildAccountMode;
  email: string;
  username: string;
  starterPassword: string;
  choresInput: string;
  chores: string[];
}

export interface FamilySetupDraft {
  parent: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  familyName: string;
  familyNameManuallyEdited: boolean;
  spouse: {
    enabled: boolean;
    email: string;
  };
  children: FamilySetupChildDraft[];
}
```

```ts
// src/types/entities.ts
export interface Profile {
  id: string;
  auth_user_id?: string | null;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone_number?: string | null;
  role: 'parent' | 'child';
  is_parent: boolean;
  family_id: string | null;
  // ...
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/familySetupAuth.test.ts`

Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260420_add_profile_phone_number.sql src/lib/familySetupTypes.ts src/lib/familySetupAuth.ts src/types/entities.ts src/lib/__tests__/familySetupAuth.test.ts
git commit -m "feat: add family setup auth helpers and phone field"
```

---

### Task 3: Add Draft Persistence and Validation Rules

**Files:**
- Modify: `src/lib/familySetupDraft.ts`
- Create: `src/lib/familySetupValidation.ts`
- Test: `src/lib/__tests__/familySetupValidation.test.ts`

- [ ] **Step 1: Write the failing validation test**

```ts
import { describe, expect, it } from 'vitest';
import {
  parseChores,
  validateChildrenStep,
  validateSpouseStep,
} from '@/lib/familySetupValidation';

describe('familySetupValidation', () => {
  it('deduplicates comma-delimited chores', () => {
    expect(parseChores('Wash dishes, Clean room, Wash dishes')).toEqual([
      'Wash dishes',
      'Clean room',
    ]);
  });

  it('requires spouse email when spouse setup is enabled', () => {
    expect(validateSpouseStep({ enabled: true, email: '' })).toEqual({
      email: 'Enter your spouse email.',
    });
  });

  it('requires birthdate and username for username-mode children', () => {
    expect(
      validateChildrenStep([
        {
          firstName: 'Mia',
          lastName: 'Paul',
          birthdate: '',
          accountMode: 'username',
          email: '',
          username: '',
          starterPassword: 'Paul123',
          choresInput: '',
          chores: [],
        },
      ]),
    ).toEqual([
      {
        birthdate: 'Enter a birthdate.',
        username: 'Enter a username.',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/familySetupValidation.test.ts`

Expected: FAIL with missing export or module errors.

- [ ] **Step 3: Implement draft persistence and validation**

```ts
// src/lib/familySetupDraft.ts
const STORAGE_KEY = 'family-setup-draft-v1';

export function readFamilySetupDraft() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function writeFamilySetupDraft(draft: FamilySetupDraft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearFamilySetupDraft() {
  sessionStorage.removeItem(STORAGE_KEY);
}
```

```ts
// src/lib/familySetupValidation.ts
export function parseChores(input: string) {
  return [...new Set(
    input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )];
}

export function validateSpouseStep(spouse: { enabled: boolean; email: string }) {
  if (!spouse.enabled) return {};
  if (!spouse.email.trim()) return { email: 'Enter your spouse email.' };
  if (!/^\S+@\S+\.\S+$/.test(spouse.email)) return { email: 'Enter a valid email.' };
  return {};
}
```

```ts
export function validateChildrenStep(children: FamilySetupChildDraft[]) {
  return children.map((child) => {
    const errors: Record<string, string> = {};
    if (!child.firstName.trim()) errors.firstName = 'Enter a first name.';
    if (!child.lastName.trim()) errors.lastName = 'Enter a last name.';
    if (!child.birthdate) errors.birthdate = 'Enter a birthdate.';
    if (child.accountMode === 'email') {
      if (!child.email.trim()) errors.email = 'Enter an email.';
      else if (!/^\S+@\S+\.\S+$/.test(child.email)) errors.email = 'Enter a valid email.';
    } else if (!child.username.trim()) {
      errors.username = 'Enter a username.';
    }
    return errors;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/familySetupValidation.test.ts`

Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/familySetupDraft.ts src/lib/familySetupValidation.ts src/lib/__tests__/familySetupValidation.test.ts
git commit -m "feat: add family setup draft persistence and validation"
```

---

### Task 4: Build the Final Save Orchestrator Before Wiring the UI

**Files:**
- Create: `src/lib/familySetupSave.ts`
- Test: `src/lib/__tests__/familySetupSave.test.ts`

- [ ] **Step 1: Write the failing save test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createFamilyFromDraft } from '@/lib/familySetupSave';

describe('familySetupSave', () => {
  it('creates unassigned chores for email-invite children and assigned chores for username children', async () => {
    const db = {
      createFamily: vi.fn().mockResolvedValue({ id: 'family-1' }),
      createParentProfile: vi.fn().mockResolvedValue({ id: 'parent-1' }),
      createChildProfile: vi.fn().mockResolvedValue({ id: 'child-1' }),
      createInvitation: vi.fn().mockResolvedValue({ id: 'invite-1' }),
      createChore: vi.fn().mockResolvedValue({ id: 'chore-1' }),
    };

    await createFamilyFromDraft({
      db,
      authUserId: 'auth-parent-1',
      authEmail: 'hidden@users.gogettr.local',
      draft: {
        parent: { firstName: 'Jane', lastName: 'Paul', phoneNumber: '555-0100' },
        familyName: 'The Paul Family',
        familyNameManuallyEdited: false,
        spouse: { enabled: false, email: '' },
        children: [
          {
            firstName: 'Mia',
            lastName: 'Paul',
            birthdate: '2016-01-01',
            accountMode: 'username',
            email: '',
            username: 'mia',
            starterPassword: 'Paul123',
            choresInput: '',
            chores: ['Clean room'],
          },
          {
            firstName: 'Leo',
            lastName: 'Paul',
            birthdate: '2018-01-01',
            accountMode: 'email',
            email: 'leo@example.com',
            username: '',
            starterPassword: '',
            choresInput: '',
            chores: ['Wash dishes'],
          },
        ],
      },
    });

    expect(db.createChore).toHaveBeenNthCalledWith(1, expect.objectContaining({ title: 'Clean room', assigned_to: 'child-1' }));
    expect(db.createChore).toHaveBeenNthCalledWith(2, expect.objectContaining({ title: 'Wash dishes', assigned_to: null }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/familySetupSave.test.ts`

Expected: FAIL with missing export or module errors.

- [ ] **Step 3: Implement the save orchestrator**

```ts
// src/lib/familySetupSave.ts
interface CreateFamilyDeps {
  db: {
    createFamily: (input: { name: string; created_by: string }) => Promise<{ id: string }>;
    createParentProfile: (input: Record<string, unknown>) => Promise<{ id: string }>;
    createChildProfile: (input: Record<string, unknown>) => Promise<{ id: string }>;
    createInvitation: (input: Record<string, unknown>) => Promise<{ id: string }>;
    createChore: (input: Record<string, unknown>) => Promise<{ id: string }>;
  };
  authUserId: string;
  authEmail: string;
  draft: FamilySetupDraft;
}

export async function createFamilyFromDraft({ db, authUserId, authEmail, draft }: CreateFamilyDeps) {
  const family = await db.createFamily({ name: draft.familyName, created_by: authUserId });

  await db.createParentProfile({
    auth_user_id: authUserId,
    first_name: draft.parent.firstName,
    last_name: draft.parent.lastName,
    email: authEmail,
    phone_number: draft.parent.phoneNumber || null,
    role: 'parent',
    family_id: family.id,
  });

  for (const child of draft.children) {
    if (child.accountMode === 'username') {
      const profile = await db.createChildProfile({
        first_name: child.firstName,
        last_name: child.lastName,
        email: child.username,
        role: 'child',
        family_id: family.id,
      });

      for (const chore of child.chores) {
        await db.createChore({ title: chore, assigned_to: profile.id });
      }
      continue;
    }

    await db.createInvitation({
      family_id: family.id,
      email: child.email,
      role: 'child',
    });

    for (const chore of child.chores) {
      await db.createChore({ title: chore, assigned_to: null });
    }
  }

  if (draft.spouse.enabled) {
    await db.createInvitation({
      family_id: family.id,
      email: draft.spouse.email,
      role: 'parent',
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/familySetupSave.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/familySetupSave.ts src/lib/__tests__/familySetupSave.test.ts
git commit -m "feat: add family setup save orchestration"
```

---

### Task 5: Replace the Login and Setup Pages with the Wizard Flow

**Files:**
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/FamilySetup.tsx`
- Create: `src/components/family-setup/ChildCard.tsx`
- Create: `src/components/family-setup/StepHeader.tsx`
- Create: `src/components/family-setup/ReviewSection.tsx`
- Modify: `src/lib/AuthContext.tsx`
- Test: `tests/family-setup.spec.ts`

- [ ] **Step 1: Write the failing Playwright wizard test**

```ts
import { test, expect } from '@playwright/test';

test('new family setup stays draft-only until final submit', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByLabel(/username/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();

  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/family\/setup/);
  await expect(page.getByRole('heading', { name: /tell us about your family/i })).toBeVisible();
  await expect(page.getByLabel(/phone number/i)).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/family-setup.spec.ts --project=chromium`

Expected: FAIL because the wizard fields and flow do not exist yet.

- [ ] **Step 3: Implement the login step and authenticated wizard**

```tsx
// src/pages/Login.tsx
const handleUsernameSubmit = async () => {
  const authEmail = buildInternalAuthEmail(username);
  if (mode === 'signup') {
    const { error } = await supabase.auth.signUp({ email: authEmail, password });
    if (error) throw error;
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) throw error;
  }
};
```

```tsx
// src/pages/FamilySetup.tsx
const [draft, setDraft] = useState(() => readFamilySetupDraft() ?? createEmptyFamilySetupDraft());
const [step, setStep] = useState<'parent' | 'spouse' | 'children' | 'review'>('parent');

useEffect(() => {
  writeFamilySetupDraft(draft);
}, [draft]);

const updateParentLastName = (lastName: string) => {
  setDraft((current) => ({
    ...current,
    parent: { ...current.parent, lastName },
    familyName: current.familyNameManuallyEdited ? current.familyName : deriveDefaultFamilyName(lastName),
  }));
};
```

```tsx
// src/components/family-setup/ChildCard.tsx
export default function ChildCard({ child, onChange, suggestions }: ChildCardProps) {
  return (
    <div className="rounded-2xl border border-border p-4 space-y-4">
      <Input aria-label="First name" value={child.firstName} onChange={(e) => onChange({ firstName: e.target.value })} />
      <Input aria-label="Birthdate" type="date" value={child.birthdate} onChange={(e) => onChange({ birthdate: e.target.value })} />
      <Input aria-label={child.accountMode === 'email' ? 'Child email' : 'Child username'} />
      <Input aria-label="Child chores" value={child.choresInput} onChange={(e) => onChange({ choresInput: e.target.value, chores: parseChores(e.target.value) })} />
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => onChange({ chores: [...new Set([...child.chores, suggestion])] })}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/family-setup.spec.ts --project=chromium`

Expected: PASS for the initial wizard visibility flow.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Login.tsx src/pages/FamilySetup.tsx src/components/family-setup/ChildCard.tsx src/components/family-setup/StepHeader.tsx src/components/family-setup/ReviewSection.tsx src/lib/AuthContext.tsx tests/family-setup.spec.ts
git commit -m "feat: add draft-backed family setup wizard UI"
```

---

### Task 6: Wire the Final Submit Path and Expand End-to-End Coverage

**Files:**
- Modify: `src/pages/FamilySetup.tsx`
- Modify: `tests/family-setup.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write the failing final-submit Playwright test**

```ts
test('creates the family only on final submit and clears the draft after success', async ({ page }) => {
  await page.goto('/family/setup');

  await page.getByLabel(/first name/i).fill('Jane');
  await page.getByLabel(/last name/i).fill('Paul');
  await page.getByRole('button', { name: /continue/i }).click();

  await page.getByRole('button', { name: /skip spouse/i }).click();
  await page.getByLabel(/number of children/i).fill('1');
  await page.getByLabel(/child first name/i).fill('Mia');
  await page.getByLabel(/birthdate/i).fill('2016-01-01');
  await page.getByLabel(/child username/i).fill('mia');
  await page.getByLabel(/child chores/i).fill('Clean room, Wash dishes');
  await page.getByRole('button', { name: /review/i }).click();

  await expect(page.getByText(/the paul family/i)).toBeVisible();
  await expect(page.getByText(/clean room/i)).toBeVisible();

  await page.getByRole('button', { name: /create family/i }).click();

  await expect(page).toHaveURL(/\/Daily/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/family-setup.spec.ts --project=chromium --grep "creates the family only on final submit"`

Expected: FAIL because the final submit orchestration and redirects are not wired yet.

- [ ] **Step 3: Implement the final save path and success cleanup**

```tsx
// src/pages/FamilySetup.tsx
const handleCreateFamily = async () => {
  if (!user) return;
  setSaving(true);
  setError('');

  try {
    await createFamilyFromDraft({
      db: {
        createFamily: (input) => supabase.from('families').insert(input).select().single().then(({ data, error }) => {
          if (error || !data) throw error ?? new Error('Failed to create family');
          return data;
        }),
        createParentProfile: (input) => supabase.from('profiles').insert(input).select().single().then(({ data, error }) => {
          if (error || !data) throw error ?? new Error('Failed to create parent profile');
          return data;
        }),
        createChildProfile: (input) => supabase.from('profiles').insert(input).select().single().then(({ data, error }) => {
          if (error || !data) throw error ?? new Error('Failed to create child profile');
          return data;
        }),
        createInvitation: (input) => supabase.from('family_invitations').insert(input).select().single().then(({ data, error }) => {
          if (error || !data) throw error ?? new Error('Failed to create invitation');
          return data;
        }),
        createChore: (input) => supabase.from('chore').insert(input).select().single().then(({ data, error }) => {
          if (error || !data) throw error ?? new Error('Failed to create chore');
          return data;
        }),
      },
      authUserId: user.id,
      authEmail: user.email ?? buildInternalAuthEmail(usernameFromDraftOrStorage),
      draft,
    });

    clearFamilySetupDraft();
    await refreshProfile();
    navigate('/Daily', { replace: true });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to create family.');
  } finally {
    setSaving(false);
  }
};
```

```ts
// tests/family-setup.spec.ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.clear());
});
```

- [ ] **Step 4: Run the verification suite**

Run: `npx vitest run`
Expected: PASS with all helper tests green

Run: `npx playwright test tests/family-setup.spec.ts --project=chromium`
Expected: PASS with the new wizard coverage green

Run: `npm run typecheck`
Expected: exit code 0

Run: `npm run lint`
Expected: exit code 0

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 5: Commit**

```bash
git add src/pages/FamilySetup.tsx tests/family-setup.spec.ts playwright.config.ts
git commit -m "feat: persist family setup on final submit only"
```

---

## Self-Review

### Spec coverage

- Parent Google or username/password auth: covered in Task 5
- Username path always treated as username: covered in Task 2 and Task 5
- No database writes until final submit: covered in Task 4, Task 5, and Task 6
- Parent phone number field and persistence: covered in Task 2 and Task 6
- Spouse invite: covered in Task 4 and Task 6
- Child birthdate: covered in Task 3 and Task 5
- Child email invite vs username local profile split: covered in Task 4 and Task 6
- Per-child chores with suggestions: covered in Task 5
- Unassigned chores for invited children: covered in Task 4 and Task 6
- Family-name auto-generation and manual override: covered in Task 1, Task 3, and Task 5

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Each task names exact files, commands, and code snippets.

### Type consistency

- `FamilySetupDraft`, `FamilySetupChildDraft`, `buildInternalAuthEmail`, `suggestStarterPassword`, `parseChores`, and `createFamilyFromDraft` are introduced consistently and reused with the same names across tasks.

