-- SECURITY DEFINER helpers bypass RLS when querying profiles internally,
-- breaking the self-referential recursion in profiles policies.
CREATE OR REPLACE FUNCTION public.my_family_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT family_id FROM profiles WHERE id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.i_am_parent()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'parent'); $$;

-- Fix the recursive SELECT policy
DROP POLICY IF EXISTS "Users can read profiles in their family" ON public.profiles;
CREATE POLICY "Users can read profiles in their family"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR family_id = my_family_id());

-- Fix the recursive UPDATE policy
DROP POLICY IF EXISTS "Parents can update other family members profiles" ON public.profiles;
CREATE POLICY "Parents can update other family members profiles"
  ON public.profiles FOR UPDATE
  USING (id != auth.uid() AND family_id = my_family_id() AND i_am_parent());
