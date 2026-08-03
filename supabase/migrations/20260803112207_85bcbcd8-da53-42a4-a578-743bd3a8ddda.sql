CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','mestre'));
$function$;

CREATE OR REPLACE FUNCTION private.is_gestor_or_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gestor','mestre'));
$function$;

CREATE OR REPLACE FUNCTION private.pode_ver_os(_user_id uuid, _os_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT
    private.is_gestor_or_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.ordens_servico o
      WHERE o.id = _os_id
        AND (o.solicitante_id = _user_id OR o.tecnico_id = _user_id)
    );
$function$;