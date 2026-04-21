import type { FamilySetupDraft } from '@/lib/familySetupTypes';

interface ReviewSectionProps {
  draft: FamilySetupDraft;
}

export function ReviewSection({ draft }: ReviewSectionProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/95 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-foreground">Parent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {draft.parent.firstName} {draft.parent.lastName}
        </p>
        <p className="text-sm text-muted-foreground">
          {draft.parent.phoneNumber.trim() || 'No phone number provided'}
        </p>
        <p className="mt-3 text-sm text-foreground">
          Family name: <span className="font-semibold">{draft.familyName}</span>
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card/95 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-foreground">Spouse</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {draft.spouse.enabled ? draft.spouse.email : 'No spouse invite'}
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card/95 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-foreground">Children</h3>
        <div className="mt-4 space-y-4">
          {draft.children.length === 0 ? (
            <p className="text-sm text-muted-foreground">No children added yet.</p>
          ) : (
            draft.children.map((child, index) => (
              <div key={`${child.firstName}-${index}`} className="rounded-2xl border border-border/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-foreground">
                    {child.firstName} {child.lastName}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {child.accountMode === 'username' ? 'Username account' : 'Email invite'}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Birthdate: {child.birthdate}</p>
                <p className="text-sm text-muted-foreground">
                  {child.accountMode === 'username'
                    ? `Username: ${child.username} | Starter password: ${child.starterPassword}`
                    : `Invite email: ${child.email}`}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Chores: {child.chores.length > 0 ? child.chores.join(', ') : 'None'}
                </p>
              </div>
            ))
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Invited-child chores will start unassigned until the invite is accepted.
        </p>
      </section>
    </div>
  );
}
