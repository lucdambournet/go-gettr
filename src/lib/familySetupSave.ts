import type { FamilySetupDraft } from './familySetupTypes';

interface FamilySetupDb {
  createFamily: (input: { name: string; created_by: string }) => Promise<{ id: string }>;
  createParentProfile: (input: Record<string, unknown>) => Promise<{ id: string }>;
  createChildProfile: (input: Record<string, unknown>) => Promise<{ id: string }>;
  createInvitation: (input: Record<string, unknown>) => Promise<{ id: string }>;
  createChore: (input: Record<string, unknown>) => Promise<{ id: string }>;
}

interface CreateFamilyFromDraftInput {
  db: FamilySetupDb;
  authUserId: string;
  authEmail: string;
  draft: FamilySetupDraft;
}

export async function createFamilyFromDraft({
  db,
  authUserId,
  authEmail,
  draft,
}: CreateFamilyFromDraftInput) {
  const family = await db.createFamily({
    name: draft.familyName,
    created_by: authUserId,
  });

  await db.createParentProfile({
    auth_user_id: authUserId,
    first_name: draft.parent.firstName,
    last_name: draft.parent.lastName,
    email: authEmail,
    phone_number: draft.parent.phoneNumber.trim() || null,
    role: 'parent',
    family_id: family.id,
  });

  if (draft.spouse.enabled) {
    await db.createInvitation({
      family_id: family.id,
      email: draft.spouse.email.trim().toLowerCase(),
      role: 'parent',
    });
  }

  for (const child of draft.children) {
    if (child.accountMode === 'username') {
      const profile = await db.createChildProfile({
        first_name: child.firstName,
        last_name: child.lastName,
        email: child.username.trim(),
        role: 'child',
        family_id: family.id,
      });

      for (const chore of child.chores) {
        await db.createChore({
          title: chore,
          assigned_to: profile.id,
        });
      }

      continue;
    }

    await db.createInvitation({
      family_id: family.id,
      email: child.email.trim().toLowerCase(),
      role: 'child',
    });

    for (const chore of child.chores) {
      await db.createChore({
        title: chore,
        assigned_to: null,
      });
    }
  }
}
