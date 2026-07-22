DROP POLICY IF EXISTS "Admin gerencia setores" ON public.setores;
CREATE POLICY "Admin ou mestre gerencia setores" ON public.setores
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_mestre(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_mestre(auth.uid()));