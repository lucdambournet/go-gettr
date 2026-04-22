import { describe, expect, it, vi } from 'vitest';
import { createFamilyFromDraft } from '../familySetupSave';

describe('familySetupSave', () => {
  it('creates unassigned chores for email children and assigned chores for username children', async () => {
    const db = {
      createFamily: vi.fn().mockResolvedValue({ id: 'family-1' }),
      createProfile: vi.fn().mockResolvedValue({ id: 'child-1' }),
      createInvitation: vi.fn().mockResolvedValue({ id: 'invite-1' }),
      createChore: vi.fn().mockResolvedValue({ id: 'chore-1' }),
    };

    await createFamilyFromDraft({
      db,
      authUserId: 'auth-parent-1',
      authEmail: 'hidden@users.gogettr.local',
      draft: {
        parentAuth: { mode: 'username', username: 'jane-parent' },
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

    expect(db.createChore).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: 'Clean room', assigned_to: 'child-1' }),
    );
    expect(db.createChore).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Wash dishes', assigned_to: null }),
    );
    expect(db.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        birthdate: '2016-01-01',
      }),
    );
  });
});
