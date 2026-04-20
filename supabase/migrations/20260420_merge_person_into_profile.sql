-- ─────────────────────────────────────────────────────────────────────────────
-- Merge person → profiles
--
-- Changes:
--   • Decouples profiles.id from auth.users (kids can have profiles w/o accounts)
--   • Adds auth_user_id UUID FK to auth.users (nullable, unique) for login lookup
--   • Adds Person fields to profiles (active, avatar_color, weekly_allowance, etc.)
--   • Drops legacy person/chore tables and recreates them with profile_id FKs
--   • Rewrites all RLS policies and helper functions to use auth_user_id
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old person-related tables (no data to preserve)
DROP TABLE IF EXISTS public.achievement   CASCADE;
DROP TABLE IF EXISTS public.notification  CASCADE;
DROP TABLE IF EXISTS public.payout        CASCADE;
DROP TABLE IF EXISTS public.streak        CASCADE;
DROP TABLE IF EXISTS public.chore_log     CASCADE;
DROP TABLE IF EXISTS public.chore         CASCADE;
DROP TABLE IF EXISTS public.person        CASCADE;

-- Drop helper functions that rely on old profiles.id = auth.uid() pattern
DROP FUNCTION IF EXISTS public.my_family_id() CASCADE;
DROP FUNCTION IF EXISTS public.i_am_parent() CASCADE;

-- ── Rebuild profiles ──────────────────────────────────────────────────────────
-- Drop existing profiles (CASCADE removes its RLS policies)
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id             UUID         UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name               TEXT         NOT NULL,
  last_name                TEXT         NOT NULL,
  email                    TEXT         NOT NULL DEFAULT '',
  role                     TEXT         NOT NULL DEFAULT 'child'
                           CHECK (role IN ('parent', 'child')),
  family_id                UUID         REFERENCES public.families(id) ON DELETE SET NULL,
  active                   BOOLEAN      NOT NULL DEFAULT true,
  avatar_color             TEXT,
  weekly_allowance         NUMERIC(10,2),
  notify_on_payout_request BOOLEAN      NOT NULL DEFAULT false,
  max_single_payout        NUMERIC(10,2),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Chore tables with profile_id FKs ─────────────────────────────────────────

CREATE TABLE public.chore (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT         NOT NULL,
  description           TEXT,
  assigned_to           UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  frequency             TEXT         DEFAULT 'weekly',
  icon                  TEXT,
  active                BOOLEAN      NOT NULL DEFAULT true,
  payout_per_completion NUMERIC(10,2),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE public.chore_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id    UUID        NOT NULL REFERENCES public.chore(id) ON DELETE CASCADE,
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start  TEXT        NOT NULL,
  day         TEXT        NOT NULL,
  completed   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.streak (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak       INTEGER      NOT NULL DEFAULT 0,
  longest_streak       INTEGER      NOT NULL DEFAULT 0,
  last_checkin_date    TEXT,
  total_rewards_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE public.payout (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  status         TEXT         NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid')),
  requested_date TEXT         NOT NULL,
  paid_date      TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE public.notification (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  read       BOOLEAN     NOT NULL DEFAULT false,
  icon       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.achievement (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon        TEXT        NOT NULL,
  earned_date TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Enable RLS ────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement  ENABLE ROW LEVEL SECURITY;

-- ── SECURITY DEFINER helpers (avoid RLS recursion) ────────────────────────────

CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.my_family_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.i_am_parent()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'parent'); $$;

-- ── profiles policies ─────────────────────────────────────────────────────────

CREATE POLICY "Users can read own profile and family profiles"
  ON public.profiles FOR SELECT
  USING (auth_user_id = auth.uid() OR family_id = my_family_id());

-- Self-registration (FamilySetup, invite accept)
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- Parents creating local profiles for kids (no auth account)
CREATE POLICY "Parents can create local profiles in their family"
  ON public.profiles FOR INSERT
  WITH CHECK (auth_user_id IS NULL AND family_id = my_family_id() AND i_am_parent());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Parents can update family member profiles"
  ON public.profiles FOR UPDATE
  USING (
    (auth_user_id IS NULL OR auth_user_id != auth.uid())
    AND family_id = my_family_id()
    AND i_am_parent()
  );

-- ── families policies (update to use auth_user_id) ────────────────────────────

DROP POLICY IF EXISTS "Family members can read their family"  ON public.families;
DROP POLICY IF EXISTS "Parents can update their family"       ON public.families;

CREATE POLICY "Family members can read their family"
  ON public.families FOR SELECT
  USING (id = my_family_id() OR created_by = auth.uid());

CREATE POLICY "Parents can update their family"
  ON public.families FOR UPDATE
  USING (id = my_family_id() AND i_am_parent());

-- ── family_invitations policies (update to use auth_user_id) ─────────────────

DROP POLICY IF EXISTS "Parents can create invitations"              ON public.family_invitations;
DROP POLICY IF EXISTS "Parents can update their family invitations" ON public.family_invitations;

CREATE POLICY "Parents can create invitations"
  ON public.family_invitations FOR INSERT
  WITH CHECK (family_id = my_family_id() AND i_am_parent());

CREATE POLICY "Parents can update their family invitations"
  ON public.family_invitations FOR UPDATE
  USING (family_id = my_family_id() AND i_am_parent());

-- ── chore policies ────────────────────────────────────────────────────────────

CREATE POLICY "Family members can read chores"
  ON public.chore FOR SELECT
  USING (
    assigned_to IS NULL
    OR assigned_to IN (SELECT id FROM public.profiles WHERE family_id = my_family_id())
  );

CREATE POLICY "Parents can insert chores"
  ON public.chore FOR INSERT
  WITH CHECK (i_am_parent());

CREATE POLICY "Parents can update chores"
  ON public.chore FOR UPDATE
  USING (i_am_parent());

CREATE POLICY "Parents can delete chores"
  ON public.chore FOR DELETE
  USING (i_am_parent());

-- ── chore_log policies ────────────────────────────────────────────────────────

CREATE POLICY "Family members can read chore logs"
  ON public.chore_log FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE family_id = my_family_id()));

CREATE POLICY "Family members can create chore logs"
  ON public.chore_log FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE family_id = my_family_id()));

CREATE POLICY "Family members can delete chore logs"
  ON public.chore_log FOR DELETE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE family_id = my_family_id()));

-- ── streak policies ───────────────────────────────────────────────────────────

CREATE POLICY "Family members can manage streaks"
  ON public.streak FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE family_id = my_family_id()));

-- ── payout policies ───────────────────────────────────────────────────────────

CREATE POLICY "Family members can read payouts"
  ON public.payout FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE family_id = my_family_id()));

CREATE POLICY "Family members can create payouts"
  ON public.payout FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE family_id = my_family_id()));

CREATE POLICY "Parents can update payouts"
  ON public.payout FOR UPDATE
  USING (i_am_parent());

-- ── notification policies ─────────────────────────────────────────────────────

CREATE POLICY "Users can manage own notifications"
  ON public.notification FOR ALL
  USING (profile_id = my_profile_id() OR profile_id IS NULL);

CREATE POLICY "Authenticated users can create notifications"
  ON public.notification FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── achievement policies ──────────────────────────────────────────────────────

CREATE POLICY "Family members can read achievements"
  ON public.achievement FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE family_id = my_family_id()));

-- ── Update RPCs ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_profile_by_email(search_email TEXT)
RETURNS TABLE(id UUID, first_name TEXT, last_name TEXT, email TEXT, family_id UUID, role TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.email, p.family_id, p.role
  FROM profiles p
  WHERE p.email = search_email
    AND auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.add_profile_to_family(
  target_profile_id UUID,
  target_role       TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_family_id UUID;
  requester_role      TEXT;
BEGIN
  SELECT family_id, role INTO requester_family_id, requester_role
  FROM profiles WHERE auth_user_id = auth.uid();

  IF requester_role != 'parent' THEN
    RAISE EXCEPTION 'Only parents can add family members';
  END IF;

  IF requester_family_id IS NULL THEN
    RAISE EXCEPTION 'Parent must belong to a family';
  END IF;

  UPDATE profiles
  SET family_id  = requester_family_id,
      role       = target_role,
      updated_at = now()
  WHERE id = target_profile_id AND family_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or already belongs to a family';
  END IF;
END;
$$;
