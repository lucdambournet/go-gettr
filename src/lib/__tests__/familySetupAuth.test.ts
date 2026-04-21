import { describe, expect, it } from 'vitest';
import { buildInternalAuthEmail, suggestStarterPassword } from '../familySetupAuth';

describe('familySetupAuth', () => {
  it('builds an internal auth email from a Gmail address', () => {
    expect(buildInternalAuthEmail('mom@gmail.com')).toBe('mom-at-gmail-com@users.gogettr.local');
  });

  it('builds a sensible internal auth email for a plain username', () => {
    expect(buildInternalAuthEmail('kid')).toBe('kid@users.gogettr.local');
  });

  it('rejects blank auth email input', () => {
    expect(() => buildInternalAuthEmail('   ')).toThrow('email must not be blank');
  });

  it('suggests a starter password from a first name', () => {
    expect(suggestStarterPassword('Paul')).toBe('Paul123');
  });

  it('rejects blank starter password input', () => {
    expect(() => suggestStarterPassword('   ')).toThrow('firstName must not be blank');
  });
});
