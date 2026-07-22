
-- 1) Fix usuarios_auditoria INSERT policy (ator must be the caller)
DROP POLICY IF EXISTS "auditoria insert" ON public.usuarios_auditoria;
CREATE POLICY "auditoria insert" ON public.usuarios_auditoria
  FOR INSERT TO authenticated
  WITH CHECK (ator_id = auth.uid());

-- 2) Restrict fornecedores reads to gestor/admin (contains contact info)
DROP POLICY IF EXISTS "Autenticados leem fornecedores" ON public.fornecedores;
CREATE POLICY "Gestor/admin leem fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()));

-- 3) Lock down SECURITY DEFINER helper functions from anon/public.
--    Authenticated keeps EXECUTE because RLS policies invoke these helpers
--    in the querying user's context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_gestor_or_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_mestre(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pode_ver_os(uuid, uuid) FROM PUBLIC, anon;

-- Trigger-only functions: no direct callers needed at all.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_auditar_os() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
