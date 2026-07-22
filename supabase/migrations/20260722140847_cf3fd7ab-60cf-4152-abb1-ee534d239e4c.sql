
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_gestor_or_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pode_ver_os(UUID, UUID) FROM PUBLIC, anon;
