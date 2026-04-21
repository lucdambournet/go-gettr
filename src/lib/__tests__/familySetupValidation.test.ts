import { describe, expect, it } from 'vitest';
import {
  parseChores,
  validateChildrenStep,
  validateParentDetailsStep,
  validateSpouseStep,
} from '../familySetupValidation';

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

  it('validates parent details with optional phone number formatting', () => {
    expect(
      validateParentDetailsStep({
        parent: {
          firstName: '',
          lastName: '',
          phoneNumber: '12',
        },
        familyName: '',
      }),
    ).toEqual({
      firstName: 'Enter a first name.',
      lastName: 'Enter a last name.',
      familyName: 'Enter a family name.',
      phoneNumber: 'Enter a valid phone number.',
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
