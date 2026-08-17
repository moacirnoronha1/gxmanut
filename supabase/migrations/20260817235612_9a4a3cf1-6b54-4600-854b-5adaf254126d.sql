
DROP POLICY IF EXISTS "comprovantes_select" ON storage.objects;
CREATE POLICY "comprovantes_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes');
DROP POLICY IF EXISTS "comprovantes_insert" ON storage.objects;
CREATE POLICY "comprovantes_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes' AND owner = auth.uid());
DROP POLICY IF EXISTS "comprovantes_delete" ON storage.objects;
CREATE POLICY "comprovantes_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes' AND (owner = auth.uid() OR private.is_admin(auth.uid())));
