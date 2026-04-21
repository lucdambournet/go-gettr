# Family Setup Wizard Design

Date: 2026-04-20
Project: GoGettr
Status: Proposed and user-validated

## Goal

Replace the current lightweight family setup flow with a wizard that lets a new parent:

- create or sign into their own account with Google or username/password
- define the initial family record
- optionally add a spouse by pending invite
- add children with either email invite or local username-based starter credentials
- assign chores during child setup

Nothing in the application database should be created until the final `Create Family` action.

## Existing Context

The app already has:

- a public `/login` route
- an authenticated `/family/setup` gate for users who have an auth session but no `profiles` row yet
- `families`, `profiles`, `family_invitations`, and `chore` tables
- support for local child profiles without auth accounts
- support for invitation-based family membership

This feature should extend those patterns rather than introduce a parallel onboarding system.

## Product Decisions

### Parent auth behavior

- The first step offers two explicit choices:
  - `Continue with Google`
  - `Continue with username/password`
- Google auth only happens when the user clicks the Google button.
- Anything typed into the username/password form is treated as a username, never as Google auth, even if it looks like an email address or ends with `@gmail.com`.
- For username/password sign-up, the visible username is what the parent entered.
- Because Supabase auth requires an email, the app will generate an internal auth email alias for username-based parent accounts behind the scenes.
- The internal alias is implementation detail only and should never be surfaced in the UI after creation.

### Family creation timing

- No rows are created in `families`, `profiles`, `family_invitations`, or `chore` until the final wizard submit.
- Wizard progress is stored locally in a draft so the user can move across routes and survive page refresh or OAuth redirect.

### Family naming

- The family name auto-fills as `The {parentLastName} Family`.
- The user may edit the generated value before final submit.
- The auto-generated value keeps updating from the parent last name until the family name field is manually edited.

### Spouse handling

- Spouse is optional.
- If the parent indicates they have a spouse and provides an email, the spouse is created as a pending `family_invitations` row with role `parent` on final submit.
- No spouse `profiles` row is created during setup.

### Child handling

- The wizard asks how many children the family has.
- Each child gets an editable card.
- Required child fields:
  - first name
  - last name
  - birthdate
  - account mode
- Account modes:
  - `email`
  - `username`

#### Child with email

- Requires a valid email address.
- On final submit, the app creates a pending `family_invitations` row with role `child`.
- Because invited children do not yet have a `profiles` row, any chores entered for that child are created as unassigned chores.

#### Child with username

- Requires a non-empty username.
- The wizard auto-suggests a starter password using the child last name plus simple numbers.
- Example: `Paul123`.
- The starter password is displayed to the parent as a memorable credential suggestion.
- On final submit, the app creates a local `profiles` row for the child with no auth account.
- If a password-like value is persisted anywhere in app data, it must be stored as a one-way hash rather than reversible encryption.

### Parent phone number

- Parent phone number is optional but highly recommended.
- The UI should explicitly explain that it is recommended so parents can stay up to date on completed tasks and family activity.
- The phone number will be stored on the parent `profiles` row in a new database field.

### Chore entry

- Chore entry moves into each child card instead of a separate wizard step.
- Each child card includes:
  - comma-delimited chore input
  - quick-add suggestion chips for common chores
- Suggested chores include:
  - Take out trash
  - Wash dishes
  - Clean room
  - Feed pet
  - Put away laundry
  - Make bed
  - Homework check
  - Set the table
- Duplicates are removed before save.
- Child chores are created assigned to the local child profile when that child uses username mode.
- Child chores are created unassigned when that child uses email invite mode.

## UX Flow

### Step 1: Parent account

Route: `/login`

Purpose:

- authenticate the parent
- begin a persistent setup draft

Fields and actions:

- Google sign-in button
- username field
- password field
- account mode toggle for sign-in vs create account

Behavior:

- Google button launches OAuth and preserves the setup draft in session storage.
- Username/password submit creates or signs into the parent auth account using the username and password path only.
- After auth succeeds, route to `/family/setup`.

### Step 2: Parent details

Route: `/family/setup`

Fields:

- first name
- last name
- phone number
- family name

Behavior:

- family name defaults from the parent last name
- phone input includes helper copy emphasizing that it is highly recommended

### Step 3: Spouse

Fields:

- yes or no choice for adding a spouse
- spouse email if enabled

### Step 4: Children

Fields:

- child count
- dynamically repeated child cards

Per child card:

- first name
- last name
- birthdate
- account mode selector
- email or username input
- starter password suggestion when using username mode
- chore entry and quick-add chips

### Step 5: Review

Summary shows:

- parent identity and phone number
- final family name
- spouse invite if present
- each child, including account mode and birthdate
- chore summary for each child
- clear note that invited-child chores will start as unassigned until the invite is accepted

Final CTA:

- `Create Family`

## Validation

Validation should run inline and at step boundaries.

### Parent account step

- username required for username/password path
- password required for username/password path
- password must satisfy minimum length and strength rule chosen by implementation
- sign-in and sign-up errors should be mapped to user-friendly messages

### Parent details step

- first name required
- last name required
- family name required
- phone number optional, but validated if entered

### Spouse step

- spouse email required and must be valid if spouse toggle is enabled

### Children step

- child count must be zero or greater
- each child requires first name, last name, and birthdate
- email-mode child requires valid email
- username-mode child requires non-empty username
- username suggestions should remain unique within the draft when possible
- chore parsing ignores empty tokens and removes duplicates

### Review step

- final submit disabled while saving
- final submit disabled if any prior-step validation still fails

## Draft Persistence

Wizard state should live in a dedicated session-storage-backed draft object.

The draft must survive:

- refresh
- route changes
- Google OAuth redirect return

The draft should include:

- parent auth path metadata
- parent details
- family name
- spouse email
- child count
- child cards
- per-child chores
- flags for generated vs manually edited fields

The draft should be cleared only after successful family creation or explicit cancellation.

## Save Orchestration

All writes happen only after the user clicks `Create Family`.

Recommended order:

1. Create `families`
2. Create parent `profiles` row with:
   - `auth_user_id`
   - `first_name`
   - `last_name`
   - `email`
   - `phone_number`
   - `role = 'parent'`
   - `family_id`
3. Create local child `profiles` rows for username-mode children
4. Create pending `family_invitations` rows for:
   - spouse email as `parent`
   - child emails as `child`
5. Create chores:
   - assigned to the created child profile when child is username mode
   - unassigned when child is invite mode
6. Refresh auth/profile state and route into the authenticated app

## Failure Handling

- Any save error should keep the user on the review step with a clear error message.
- The UI must not claim success until the save sequence completes.
- Partial-write risk should be minimized.
- If implementation complexity stays manageable, prefer consolidating the final creation flow into a single Supabase RPC or edge function for more atomic behavior.

## Data Model Changes

### Profiles

Add:

- `phone_number TEXT`

Potentially add for username-based children only if product decides the starter password must be stored:

- a hashed starter-password field, or
- a separate secure credential metadata table

If starter passwords do not need to persist beyond the review/success UI, do not store them in the database.

### Wizard draft utilities

Add a local utility module for:

- reading the draft
- writing the draft
- clearing the draft
- handling schema-safe parsing and migration of draft versions

## Components and Boundaries

Recommended implementation structure:

- enrich [src/pages/Login.tsx](/\\?\\UNC\\wsl.localhost\\Ubuntu-24.04\\home\\rapha\\projects\\go-gettr\\src\\pages\\Login.tsx)
- replace [src/pages/FamilySetup.tsx](/\\?\\UNC\\wsl.localhost\\Ubuntu-24.04\\home\\rapha\\projects\\go-gettr\\src\\pages\\FamilySetup.tsx) with a multi-step wizard
- add a wizard draft helper in `src/lib`
- add validation helpers for parent, spouse, child, and review steps
- add a save orchestrator to keep Supabase write logic out of the page component

## Testing Strategy

Cover:

- username-based parent sign-up flow
- Google parent sign-in flow with draft restoration
- no database writes before final submit
- spouse invite creation
- username child local profile creation
- email child invite creation
- child birthdate validation
- per-child chore parsing and deduplication
- chore assignment for username children
- unassigned chores for invited children
- family name auto-generation and manual override behavior

## Open Implementation Notes

- The internal auth-email alias scheme for username-based parent accounts must be deterministic and collision-safe.
- The password-strength requirement for parent username/password auth should be defined during implementation planning.
- If storing starter passwords is required, use one-way hashing only. Do not store reversible encrypted values.
