-- Allow the creator to read their own family immediately after INSERT,
-- before a profile linking them to it exists.
CREATE POLICY "Creators can read their own family"
  ON public.families FOR SELECT
  USING (created_by = auth.uid());
