import { describe, expect, it } from 'vitest';
import { createEmptyFamilySetupDraft, deriveDefaultFamilyName } from '../familySetupDraft';

describe('familySetupDraft', () => {
  it('derives a default family name from a first name', () => {
    expect(deriveDefaultFamilyName('Paul')).toBe('The Paul Family');
  });

  it('falls back to a safe default family name for blank input', () => {
    expect(deriveDefaultFamilyName('   ')).toBe('Your Family');
  });

  it('creates a draft with the requested number of username children', () => {
    const draft = createEmptyFamilySetupDraft({ childCount: 1 });

    expect(draft.children).toHaveLength(1);
    expect(draft.children[0]?.accountMode).toBe('username');
  });

  it('throws for an invalid child count', () => {
    expect(() => createEmptyFamilySetupDraft({ childCount: -1 })).toThrow(RangeError);
    expect(() => createEmptyFamilySetupDraft({ childCount: 1.5 })).toThrow(
      'childCount must be a non-negative integer',
    );
  });
});
