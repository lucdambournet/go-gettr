-- ──────────────────────────────────────────────────────────────────────────────
-- Family system: families, profiles, invitations
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. families
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. profiles (one per auth user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'child'
              CHECK (role IN ('parent', 'child')),
  family_id   UUID        REFERENCES public.families(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. family_invitations
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'child'
              CHECK (role IN ('parent', 'child')),
  token       UUID        UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  invited_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE public.families           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- ── families policies ─────────────────────────────────────────────────────────

CREATE POLICY "Family members can read their family"
  ON public.families FOR SELECT
  USING (id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Parents can update their family"
  ON public.families FOR UPDATE
  USING (id IN (
    SELECT family_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'parent'
  ));

-- ── profiles policies ─────────────────────────────────────────────────────────

CREATE POLICY "Users can read profiles in their family"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR family_id IN (
      SELECT family_id FROM public.profiles
      WHERE id = auth.uid() AND family_id IS NOT NULL
    )
  );

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Parents can update other family members profiles"
  ON public.profiles FOR UPDATE
  USING (
    id != auth.uid()
    AND family_id = (
      SELECT family_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'parent'
      LIMIT 1
    )
  );

-- ── family_invitations policies ───────────────────────────────────────────────

-- Anyone with the token can read a pending invitation (token is the secret)
CREATE POLICY "Anyone can read pending invitations"
  ON public.family_invitations FOR SELECT
  USING (status = 'pending' AND expires_at > now());

-- Family members can see all invitations for their family
CREATE POLICY "Family members can read their family invitations"
  ON public.family_invitations FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Parents can create invitations"
  ON public.family_invitations FOR INSERT
  WITH CHECK (family_id IN (
    SELECT family_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'parent'
  ));

-- Users can accept their own invitation (matched by email)
CREATE POLICY "Users can accept their own invitation"
  ON public.family_invitations FOR UPDATE
  USING (email = auth.email() AND status = 'pending')
  WITH CHECK (status = 'accepted');

-- Parents can cancel/update invitations for their family
CREATE POLICY "Parents can update their family invitations"
  ON public.family_invitations FOR UPDATE
  USING (family_id IN (
    SELECT family_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'parent'
  ));

-- ── RPC: search profile by email ──────────────────────────────────────────────
-- SECURITY DEFINER so it can search across all profiles, not just the requester's family
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

-- ── RPC: add existing profile to a family ─────────────────────────────────────
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
  FROM profiles WHERE id = auth.uid();

  IF requester_role != 'parent' THEN
    RAISE EXCEPTION 'Only parents can add family members';
  END IF;

  IF requester_family_id IS NULL THEN
    RAISE EXCEPTION 'Parent must belong to a family';
  END IF;

  UPDATE profiles
  SET family_id = requester_family_id,
      role      = target_role,
      updated_at = now()
  WHERE id = target_profile_id AND family_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or already belongs to a family';
  END IF;
END;
$$;
