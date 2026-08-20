
CREATE TABLE IF NOT EXISTS public.profile_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, setor_id)
);

GRANT SELECT ON public.profile_setores TO authenticated;
GRANT ALL ON public.profile_setores TO service_role;
ALTER TABLE public.profile_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver setores responsaveis" ON public.profile_setores FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Mestre gerencia setores responsaveis" ON public.profile_setores FOR ALL TO authenticated
USING (private.is_mestre(auth.uid()) OR private.is_admin(auth.uid()))
WITH CHECK (private.is_mestre(auth.uid()) OR private.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION private.responsavel_pelo_setor(_user_id uuid, _setor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT _setor_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profile_setores ps WHERE ps.user_id = _user_id AND ps.setor_id = _setor_id
  );
$$;
REVOKE EXECUTE ON FUNCTION private.responsavel_pelo_setor(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- backfill from existing single sector and sector responsible
INSERT INTO public.profile_setores (user_id, setor_id)
SELECT p.id, p.setor_id FROM public.profiles p WHERE p.setor_id IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO public.profile_setores (user_id, setor_id)
SELECT s.responsavel_id, s.id FROM public.setores s WHERE s.responsavel_id IS NOT NULL
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Ver OS conforme papel" ON public.ordens_servico;
CREATE POLICY "Ver OS conforme papel" ON public.ordens_servico FOR SELECT TO authenticated
USING (
  private.is_gestor_or_admin(auth.uid())
  OR private.is_mestre(auth.uid())
  OR solicitante_id = auth.uid()
  OR tecnico_id = auth.uid()
  OR private.responsavel_pelo_setor(auth.uid(), setor_id)
);

DROP POLICY IF EXISTS "Envolvidos atualizam OS" ON public.ordens_servico;
CREATE POLICY "Envolvidos atualizam OS" ON public.ordens_servico FOR UPDATE TO authenticated
USING (
  private.is_admin(auth.uid())
  OR private.is_mestre(auth.uid())
  OR tecnico_id = auth.uid()
  OR solicitante_id = auth.uid()
  OR private.responsavel_pelo_setor(auth.uid(), setor_id)
);
