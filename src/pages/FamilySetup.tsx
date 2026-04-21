import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { isE2EMockAuthEnabled, readE2EAuthState, writeE2EAuthState } from '@/lib/e2eAuth';
import { supabase } from '@/lib/supabase';
import { suggestStarterPassword } from '@/lib/familySetupAuth';
import {
  clearFamilySetupDraft,
  createEmptyFamilySetupDraft,
  deriveDefaultFamilyName,
  readFamilySetupDraft,
  writeFamilySetupDraft,
} from '@/lib/familySetupDraft';
import type { FamilySetupChildDraft, FamilySetupDraft } from '@/lib/familySetupTypes';
import { createFamilyFromDraft } from '@/lib/familySetupSave';
import {
  parseChores,
  validateChildrenStep,
  validateParentDetailsStep,
  validateSpouseStep,
} from '@/lib/familySetupValidation';
import { ChildCard } from '@/components/family-setup/ChildCard';
import { ReviewSection } from '@/components/family-setup/ReviewSection';
import { StepHeader } from '@/components/family-setup/StepHeader';

const TOTAL_STEPS = 4;
const SUGGESTED_CHORES = [
  'Take out trash',
  'Wash dishes',
  'Clean room',
  'Feed pet',
  'Put away laundry',
  'Make bed',
  'Homework check',
  'Set the table',
];

function sanitizeUsernameSeed(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function suggestUniqueUsername(children: FamilySetupChildDraft[], targetIndex: number, child: FamilySetupChildDraft) {
  const baseUsername =
    sanitizeUsernameSeed(child.username) ||
    sanitizeUsernameSeed(child.firstName) ||
    sanitizeUsernameSeed(`${child.firstName}-${child.lastName}`) ||
    `child-${targetIndex + 1}`;

  const takenUsernames = new Set(
    children
      .map((currentChild, index) =>
        index === targetIndex || currentChild.accountMode !== 'username'
          ? ''
          : currentChild.username.trim().toLowerCase(),
      )
      .filter(Boolean),
  );

  let candidate = baseUsername;
  let suffix = 2;

  while (takenUsernames.has(candidate)) {
    candidate = `${baseUsername}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function createEmptyChildDraft(): FamilySetupChildDraft {
  return createEmptyFamilySetupDraft({ childCount: 1 }).children[0] as FamilySetupChildDraft;
}

function withChildDerivedFields(
  child: FamilySetupChildDraft,
  children: FamilySetupChildDraft[],
  targetIndex: number,
): FamilySetupChildDraft {
  const chores = parseChores(child.choresInput);

  if (child.accountMode === 'username') {
    const nextUsername = child.username.trim()
      ? child.username
      : suggestUniqueUsername(children, targetIndex, child);

    return {
      ...child,
      email: '',
      username: nextUsername,
      starterPassword: child.lastName.trim() ? suggestStarterPassword(child.lastName) : '',
      chores,
    };
  }

  return {
    ...child,
    username: '',
    starterPassword: '',
    chores,
  };
}

export default function FamilySetup() {
  const { user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<FamilySetupDraft>(() => {
    return readFamilySetupDraft() ?? createEmptyFamilySetupDraft({ childCount: 0 });
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const parentErrors = validateParentDetailsStep(draft);
  const spouseErrors = validateSpouseStep(draft.spouse);
  const childErrors = validateChildrenStep(draft.children);
  const hasChildErrors = childErrors.some((child) => Object.keys(child).length > 0);
  const hasReviewErrors =
    Object.keys(parentErrors).length > 0 ||
    Object.keys(spouseErrors).length > 0 ||
    hasChildErrors;

  useEffect(() => {
    writeFamilySetupDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (draft.familyNameManuallyEdited) {
      return;
    }

    const derivedFamilyName = deriveDefaultFamilyName(draft.parent.lastName);

    if (draft.familyName !== derivedFamilyName) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        familyName: deriveDefaultFamilyName(currentDraft.parent.lastName),
      }));
    }
  }, [draft.familyName, draft.familyNameManuallyEdited, draft.parent.lastName]);

  const updateDraft = (updater: (currentDraft: FamilySetupDraft) => FamilySetupDraft) => {
    setDraft((currentDraft) => updater(currentDraft));
    setError('');
  };

  const setChildCount = (count: number) => {
    const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

    updateDraft((currentDraft) => {
      const nextChildren = [...currentDraft.children];

      while (nextChildren.length < safeCount) {
        nextChildren.push(createEmptyChildDraft());
      }

      return {
        ...currentDraft,
        children: nextChildren.slice(0, safeCount),
      };
    });
  };

  const goNext = () => {
    if (step === 1 && Object.keys(parentErrors).length > 0) {
      setError('Fix the parent details before continuing.');
      return;
    }

    if (step === 2 && Object.keys(spouseErrors).length > 0) {
      setError('Fix the spouse invite details before continuing.');
      return;
    }

    if (step === 3 && hasChildErrors) {
      setError('Fix the child details before continuing.');
      return;
    }

    setError('');
    setStep((currentStep) => Math.min(TOTAL_STEPS, currentStep + 1));
  };

  const goBack = () => {
    setError('');
    setStep((currentStep) => Math.max(1, currentStep - 1));
  };

  const handleSubmit = async () => {
    if (!user) {
      return;
    }

    if (hasReviewErrors) {
      setError('Resolve the remaining validation errors before creating the family.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isE2EMockAuthEnabled()) {
        const familyName = draft.familyName.trim();
        const mockFamily = {
          id: 'e2e-family-1',
          name: familyName,
          created_by: user.id,
        };
        const mockProfile = {
          id: 'e2e-parent-profile-1',
          auth_user_id: user.id,
          first_name: draft.parent.firstName.trim(),
          last_name: draft.parent.lastName.trim(),
          name: `${draft.parent.firstName.trim()} ${draft.parent.lastName.trim()}`.trim(),
          email: user.email ?? '',
          phone_number: draft.parent.phoneNumber.trim() || null,
          role: 'parent' as const,
          is_parent: true,
          family_id: mockFamily.id,
        };

        writeE2EAuthState({
          user: readE2EAuthState()?.user ?? { id: user.id, email: user.email ?? '' },
          profile: mockProfile,
          family: mockFamily,
        });

        clearFamilySetupDraft();
        await refreshProfile();
        navigate('/Daily', { replace: true });
        return;
      }

      await createFamilyFromDraft({
        authUserId: user.id,
        authEmail: user.email ?? '',
        draft,
        db: {
          async createFamily(input) {
            const { data, error: queryError } = await supabase
              .from('families')
              .insert(input)
              .select()
              .single();

            if (queryError || !data) {
              throw queryError ?? new Error('Failed to create family.');
            }

            return { id: data.id as string };
          },
          async createParentProfile(input) {
            const { data, error: queryError } = await supabase
              .from('profiles')
              .insert(input)
              .select()
              .single();

            if (queryError || !data) {
              throw queryError ?? new Error('Failed to create parent profile.');
            }

            return { id: data.id as string };
          },
          async createChildProfile(input) {
            const { data, error: queryError } = await supabase
              .from('profiles')
              .insert(input)
              .select()
              .single();

            if (queryError || !data) {
              throw queryError ?? new Error('Failed to create child profile.');
            }

            return { id: data.id as string };
          },
          async createInvitation(input) {
            const { data, error: queryError } = await supabase
              .from('family_invitations')
              .insert(input)
              .select()
              .single();

            if (queryError || !data) {
              throw queryError ?? new Error('Failed to create invitation.');
            }

            return { id: data.id as string };
          },
          async createChore(input) {
            const { data, error: queryError } = await supabase
              .from('chore')
              .insert(input)
              .select()
              .single();

            if (queryError || !data) {
              throw queryError ?? new Error('Failed to create chore.');
            }

            return { id: data.id as string };
          },
        },
      });

      clearFamilySetupDraft();
      await refreshProfile();
      navigate('/Daily', { replace: true });
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create family.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.14),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepHeader
            step={step}
            totalSteps={TOTAL_STEPS}
            title={
              step === 1
                ? 'Tell us about your family'
                : step === 2
                ? 'Add a spouse invite'
                : step === 3
                ? 'Add children and chores'
                : 'Review everything before create'
            }
            description={
              step === 1
                ? 'We only need the basics here. Family name will keep syncing from your last name until you edit it manually.'
                : step === 2
                ? 'Invite a second parent now, or skip this step and do it later.'
                : step === 3
                ? 'Choose email invites or local username access for each child, then assign starter chores.'
                : 'Nothing will be written until you press Create Family.'
            }
          />

          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              clearFamilySetupDraft();
              await signOut();
              navigate('/login', { replace: true });
            }}
            className="rounded-2xl"
          >
            Cancel setup
          </Button>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-xl shadow-primary/5 backdrop-blur">
          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">First name</label>
                <Input
                  aria-label="First name"
                  value={draft.parent.firstName}
                  onChange={(event) =>
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      parent: { ...currentDraft.parent, firstName: event.target.value },
                    }))
                  }
                />
                {parentErrors.firstName ? <p className="text-xs text-destructive">{parentErrors.firstName}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Last name</label>
                <Input
                  aria-label="Last name"
                  value={draft.parent.lastName}
                  onChange={(event) =>
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      parent: { ...currentDraft.parent, lastName: event.target.value },
                    }))
                  }
                />
                {parentErrors.lastName ? <p className="text-xs text-destructive">{parentErrors.lastName}</p> : null}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">Phone number</label>
                <Input
                  aria-label="Phone number"
                  value={draft.parent.phoneNumber}
                  onChange={(event) =>
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      parent: { ...currentDraft.parent, phoneNumber: event.target.value },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Highly recommended so parents can stay up to date on completed tasks and family activity.
                </p>
                {parentErrors.phoneNumber ? <p className="text-xs text-destructive">{parentErrors.phoneNumber}</p> : null}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">Family name</label>
                <Input
                  aria-label="Family name"
                  value={draft.familyName}
                  onChange={(event) =>
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      familyName: event.target.value,
                      familyNameManuallyEdited: true,
                    }))
                  }
                />
                {parentErrors.familyName ? <p className="text-xs text-destructive">{parentErrors.familyName}</p> : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={draft.spouse.enabled ? 'default' : 'outline'}
                  className="rounded-2xl"
                  onClick={() =>
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      spouse: { ...currentDraft.spouse, enabled: true },
                    }))
                  }
                >
                  Yes, add spouse
                </Button>
                <Button
                  type="button"
                  variant={!draft.spouse.enabled ? 'default' : 'outline'}
                  className="rounded-2xl"
                  onClick={() =>
                    updateDraft((currentDraft) => ({
                      ...currentDraft,
                      spouse: { enabled: false, email: '' },
                    }))
                  }
                >
                  No spouse invite
                </Button>
              </div>

              {draft.spouse.enabled ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Spouse email</label>
                  <Input
                    aria-label="Spouse email"
                    type="email"
                    value={draft.spouse.email}
                    onChange={(event) =>
                      updateDraft((currentDraft) => ({
                        ...currentDraft,
                        spouse: { ...currentDraft.spouse, email: event.target.value },
                      }))
                    }
                  />
                  {spouseErrors.email ? <p className="text-xs text-destructive">{spouseErrors.email}</p> : null}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  You can always invite another parent later from family settings.
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">How many children are you setting up?</label>
                <Input
                  aria-label="Number of children"
                  type="number"
                  min="0"
                  value={draft.children.length}
                  onChange={(event) => setChildCount(Number(event.target.value))}
                  className="max-w-40"
                />
              </div>

              <div className="space-y-4">
                {draft.children.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    No children added yet. You can still create the family now and add them later.
                  </div>
                ) : (
                  draft.children.map((child, index) => (
                    <ChildCard
                      key={`child-${index}`}
                      child={child}
                      index={index}
                      errors={childErrors[index]}
                      suggestedChores={SUGGESTED_CHORES}
                      onChange={(nextChild) =>
                        updateDraft((currentDraft) => ({
                          ...currentDraft,
                          children: currentDraft.children.map((currentChild, childIndex) =>
                            childIndex === index
                              ? withChildDerivedFields(nextChild, currentDraft.children, index)
                              : currentChild,
                          ),
                        }))
                      }
                    />
                  ))
                )}
              </div>
            </div>
          ) : null}

          {step === 4 ? <ReviewSection draft={draft} /> : null}

          {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Draft is saved in this browser session until family creation succeeds or you cancel.
            </div>

            <div className="flex gap-2">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={goBack} className="rounded-2xl">
                  Back
                </Button>
              ) : null}

              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={goNext} className="rounded-2xl">
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || hasReviewErrors}
                  className="rounded-2xl"
                >
                  {saving ? 'Creating family…' : 'Create Family'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
