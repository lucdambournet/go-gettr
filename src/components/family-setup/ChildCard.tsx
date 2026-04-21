import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FamilySetupChildDraft } from '@/lib/familySetupTypes';
import type { FamilySetupChildErrors } from '@/lib/familySetupValidation';

interface ChildCardProps {
  child: FamilySetupChildDraft;
  errors?: FamilySetupChildErrors;
  index: number;
  suggestedChores: string[];
  onChange: (nextChild: FamilySetupChildDraft) => void;
}

export function ChildCard({
  child,
  errors,
  index,
  suggestedChores,
  onChange,
}: ChildCardProps) {
  const setField = <K extends keyof FamilySetupChildDraft>(key: K, value: FamilySetupChildDraft[K]) => {
    onChange({ ...child, [key]: value });
  };

  return (
    <div className="rounded-3xl border border-border bg-card/95 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Child {index + 1}</h3>
          <p className="text-xs text-muted-foreground">Add login details and starter chores now.</p>
        </div>

        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {child.accountMode === 'username' ? 'Local account' : 'Email invite'}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">First name</label>
          <Input
            aria-label={`Child ${index + 1} first name`}
            value={child.firstName}
            onChange={(event) => setField('firstName', event.target.value)}
          />
          {errors?.firstName ? <p className="text-xs text-destructive">{errors.firstName}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Last name</label>
          <Input
            aria-label={`Child ${index + 1} last name`}
            value={child.lastName}
            onChange={(event) => setField('lastName', event.target.value)}
          />
          {errors?.lastName ? <p className="text-xs text-destructive">{errors.lastName}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Birthdate</label>
          <Input
            aria-label={`Child ${index + 1} birthdate`}
            type="date"
            value={child.birthdate}
            onChange={(event) => setField('birthdate', event.target.value)}
          />
          {errors?.birthdate ? <p className="text-xs text-destructive">{errors.birthdate}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Account mode</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={child.accountMode === 'username' ? 'default' : 'outline'}
              onClick={() => setField('accountMode', 'username')}
            >
              Username
            </Button>
            <Button
              type="button"
              variant={child.accountMode === 'email' ? 'default' : 'outline'}
              onClick={() => setField('accountMode', 'email')}
            >
              Email
            </Button>
          </div>
        </div>

        {child.accountMode === 'username' ? (
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-foreground">Username</label>
            <Input
              aria-label={`Child ${index + 1} username`}
              value={child.username}
              onChange={(event) => setField('username', event.target.value)}
            />
            {errors?.username ? <p className="text-xs text-destructive">{errors.username}</p> : null}
            <p className="text-xs text-muted-foreground">
              Starter password suggestion: <span className="font-semibold text-foreground">{child.starterPassword || 'Will be suggested automatically'}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-foreground">Child email</label>
            <Input
              aria-label={`Child ${index + 1} email`}
              type="email"
              value={child.email}
              onChange={(event) => setField('email', event.target.value)}
            />
            {errors?.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold text-foreground">Child chores</label>
          <Textarea
            aria-label={`Child ${index + 1} chores`}
            value={child.choresInput}
            onChange={(event) => setField('choresInput', event.target.value)}
            placeholder="Clean room, Wash dishes"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            {suggestedChores.map((chore) => (
              <button
                key={chore}
                type="button"
                onClick={() => {
                  const nextValues = new Set(
                    child.choresInput
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  );
                  nextValues.add(chore);
                  setField('choresInput', Array.from(nextValues).join(', '));
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {chore}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
