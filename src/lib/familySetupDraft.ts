import type { FamilySetupDraft } from './familySetupTypes';

const STORAGE_KEY = 'family-setup-draft-v1';

export function deriveDefaultFamilyName(firstName: string) {
  const trimmedFirstName = firstName.trim();

  if (!trimmedFirstName) {
    return 'Your Family';
  }

  return `The ${trimmedFirstName} Family`;
}

export function createEmptyFamilySetupDraft({ childCount }: { childCount: number }): FamilySetupDraft {
  if (!Number.isInteger(childCount) || childCount < 0) {
    throw new RangeError('childCount must be a non-negative integer');
  }

  return {
    parentAuth: {
      mode: 'username',
      username: '',
    },
    parent: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
    },
    familyName: '',
    familyNameManuallyEdited: false,
    spouse: {
      enabled: false,
      email: '',
    },
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

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function normalizeFamilySetupDraft(value: unknown): FamilySetupDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const draft = value as Partial<FamilySetupDraft>;
  const fallback = createEmptyFamilySetupDraft({ childCount: 0 });

  return {
    parentAuth: {
      mode: draft.parentAuth?.mode === 'google' ? 'google' : 'username',
      username: typeof draft.parentAuth?.username === 'string' ? draft.parentAuth.username : '',
    },
    parent: {
      firstName: typeof draft.parent?.firstName === 'string' ? draft.parent.firstName : '',
      lastName: typeof draft.parent?.lastName === 'string' ? draft.parent.lastName : '',
      phoneNumber: typeof draft.parent?.phoneNumber === 'string' ? draft.parent.phoneNumber : '',
    },
    familyName: typeof draft.familyName === 'string' ? draft.familyName : '',
    familyNameManuallyEdited:
      typeof draft.familyNameManuallyEdited === 'boolean'
        ? draft.familyNameManuallyEdited
        : false,
    spouse: {
      enabled: typeof draft.spouse?.enabled === 'boolean' ? draft.spouse.enabled : false,
      email: typeof draft.spouse?.email === 'string' ? draft.spouse.email : '',
    },
    children: Array.isArray(draft.children)
      ? draft.children.map((child) => ({
          ...fallback.children[0],
          firstName: typeof child?.firstName === 'string' ? child.firstName : '',
          lastName: typeof child?.lastName === 'string' ? child.lastName : '',
          birthdate: typeof child?.birthdate === 'string' ? child.birthdate : '',
          accountMode: child?.accountMode === 'email' ? 'email' : 'username',
          email: typeof child?.email === 'string' ? child.email : '',
          username: typeof child?.username === 'string' ? child.username : '',
          starterPassword: typeof child?.starterPassword === 'string' ? child.starterPassword : '',
          choresInput: typeof child?.choresInput === 'string' ? child.choresInput : '',
          chores: Array.isArray(child?.chores)
            ? child.chores.filter((value): value is string => typeof value === 'string')
            : [],
        }))
      : [],
  };
}

export function readFamilySetupDraft(): FamilySetupDraft | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawDraft = window.sessionStorage.getItem(STORAGE_KEY);

  if (!rawDraft) {
    return null;
  }

  try {
    return normalizeFamilySetupDraft(JSON.parse(rawDraft));
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeFamilySetupDraft(draft: FamilySetupDraft) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearFamilySetupDraft() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
