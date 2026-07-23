
-- 1. Private schema for permission helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_gestor_or_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_mestre(uuid) SET SCHEMA private;
ALTER FUNCTION public.pode_ver_os(uuid, uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_gestor_or_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_mestre(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.pode_ver_os(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_gestor_or_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_mestre(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.pode_ver_os(uuid, uuid) TO authenticated, service_role;

-- 2. Restrict broad-read policies to users with an assigned role
DROP POLICY IF EXISTS "Autenticados leem setores" ON public.setores;
CREATE POLICY "Usuarios com papel leem setores" ON public.setores
  FOR SELECT TO authenticated
  USING (
    private.is_mestre(auth.uid())
    OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(), 'tecnico')
    OR private.has_role(auth.uid(), 'responsavel')
  );

DROP POLICY IF EXISTS "Autenticados leem equipamentos" ON public.equipamentos;
CREATE POLICY "Usuarios com papel leem equipamentos" ON public.equipamentos
  FOR SELECT TO authenticated
  USING (
    private.is_mestre(auth.uid())
    OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(), 'tecnico')
    OR private.has_role(auth.uid(), 'responsavel')
  );

DROP POLICY IF EXISTS "Autenticados leem preventivos" ON public.planos_preventivos;
CREATE POLICY "Gestao le preventivos" ON public.planos_preventivos
  FOR SELECT TO authenticated
  USING (
    private.is_mestre(auth.uid())
    OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(), 'tecnico')
  );

-- 3. Prevent mestre from granting roles to themselves
DROP POLICY IF EXISTS "mestre insere roles" ON public.user_roles;
CREATE POLICY "mestre insere roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_mestre(auth.uid())
    AND role <> 'mestre'
    AND user_id <> auth.uid()
  );
