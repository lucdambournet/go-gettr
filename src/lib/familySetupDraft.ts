import type { FamilySetupDraft } from './familySetupTypes';

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
