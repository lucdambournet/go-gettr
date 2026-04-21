import type { FamilySetupChildDraft, FamilySetupDraft } from './familySetupTypes';

export interface FamilySetupSpouseErrors {
  email?: string;
}

export interface FamilySetupChildErrors {
  firstName?: string;
  lastName?: string;
  birthdate?: string;
  email?: string;
  username?: string;
}

export interface FamilySetupParentErrors {
  firstName?: string;
  lastName?: string;
  familyName?: string;
  phoneNumber?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]{7,}$/;

export function parseChores(input: string): string[] {
  return [...new Set(input.split(',').map((value) => value.trim()).filter(Boolean))];
}

export function validateSpouseStep(spouse: FamilySetupDraft['spouse']): FamilySetupSpouseErrors {
  if (!spouse.enabled) {
    return {};
  }

  const normalizedEmail = spouse.email.trim();

  if (!normalizedEmail) {
    return { email: 'Enter your spouse email.' };
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { email: 'Enter a valid email.' };
  }

  return {};
}

export function validateParentDetailsStep(draft: Pick<FamilySetupDraft, 'parent' | 'familyName'>): FamilySetupParentErrors {
  const errors: FamilySetupParentErrors = {};

  if (!draft.parent.firstName.trim()) {
    errors.firstName = 'Enter a first name.';
  }

  if (!draft.parent.lastName.trim()) {
    errors.lastName = 'Enter a last name.';
  }

  if (!draft.familyName.trim()) {
    errors.familyName = 'Enter a family name.';
  }

  if (draft.parent.phoneNumber.trim() && !PHONE_PATTERN.test(draft.parent.phoneNumber.trim())) {
    errors.phoneNumber = 'Enter a valid phone number.';
  }

  return errors;
}

export function validateChildrenStep(children: FamilySetupChildDraft[]): FamilySetupChildErrors[] {
  return children.map((child) => {
    const errors: FamilySetupChildErrors = {};

    if (!child.firstName.trim()) {
      errors.firstName = 'Enter a first name.';
    }

    if (!child.lastName.trim()) {
      errors.lastName = 'Enter a last name.';
    }

    if (!child.birthdate) {
      errors.birthdate = 'Enter a birthdate.';
    }

    if (child.accountMode === 'email') {
      const normalizedEmail = child.email.trim();

      if (!normalizedEmail) {
        errors.email = 'Enter an email.';
      } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
        errors.email = 'Enter a valid email.';
      }
    }

    if (child.accountMode === 'username' && !child.username.trim()) {
      errors.username = 'Enter a username.';
    }

    return errors;
  });
}
