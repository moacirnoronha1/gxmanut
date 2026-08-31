
CREATE TABLE public.os_tecnicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel TEXT NOT NULL DEFAULT 'apoio' CHECK (papel IN ('principal','apoio')),
  adicionado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (os_id, tecnico_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_tecnicos TO authenticated;
GRANT ALL ON public.os_tecnicos TO service_role;

ALTER TABLE public.os_tecnicos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_tecnico(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = 'tecnico'
      AND p.ativo = true AND p.bloqueado = false
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_tecnico(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.na_equipe_os(_user_id uuid, _os_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.os_tecnicos t WHERE t.os_id = _os_id AND t.tecnico_id = _user_id);
$$;
REVOKE EXECUTE ON FUNCTION private.na_equipe_os(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE POLICY "Equipe e gestao veem tecnicos da OS" ON public.os_tecnicos FOR SELECT TO authenticated
USING (
  private.is_gestor_or_admin(auth.uid()) OR private.is_mestre(auth.uid())
  OR private.is_tecnico(auth.uid())
  OR EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = os_id AND o.solicitante_id = auth.uid())
);

CREATE POLICY "Gestao adiciona tecnicos" ON public.os_tecnicos FOR INSERT TO authenticated
WITH CHECK (
  private.is_gestor_or_admin(auth.uid()) OR private.is_mestre(auth.uid())
  OR (tecnico_id = auth.uid() AND private.is_tecnico(auth.uid()))
);

CREATE POLICY "Gestao atualiza tecnicos" ON public.os_tecnicos FOR UPDATE TO authenticated
USING (private.is_gestor_or_admin(auth.uid()) OR private.is_mestre(auth.uid()))
WITH CHECK (private.is_gestor_or_admin(auth.uid()) OR private.is_mestre(auth.uid()));

CREATE POLICY "Gestao remove tecnicos" ON public.os_tecnicos FOR DELETE TO authenticated
USING (private.is_gestor_or_admin(auth.uid()) OR private.is_mestre(auth.uid()));

CREATE TRIGGER trg_os_tecnicos_updated BEFORE UPDATE ON public.os_tecnicos
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP POLICY "Ver OS conforme papel" ON public.ordens_servico;
CREATE POLICY "Ver OS conforme papel" ON public.ordens_servico FOR SELECT TO authenticated
USING (
  private.is_gestor_or_admin(auth.uid())
  OR private.is_mestre(auth.uid())
  OR private.is_tecnico(auth.uid())
  OR solicitante_id = auth.uid()
  OR tecnico_id = auth.uid()
  OR assumida_por = auth.uid()
  OR private.na_equipe_os(auth.uid(), id)
  OR private.responsavel_pelo_setor(auth.uid(), setor_id)
);

DROP POLICY "Envolvidos atualizam OS" ON public.ordens_servico;
CREATE POLICY "Envolvidos atualizam OS" ON public.ordens_servico FOR UPDATE TO authenticated
USING (
  private.is_admin(auth.uid())
  OR private.is_mestre(auth.uid())
  OR private.is_tecnico(auth.uid())
  OR tecnico_id = auth.uid()
  OR assumida_por = auth.uid()
  OR private.na_equipe_os(auth.uid(), id)
  OR solicitante_id = auth.uid()
  OR private.responsavel_pelo_setor(auth.uid(), setor_id)
);

CREATE INDEX IF NOT EXISTS idx_os_tecnicos_os ON public.os_tecnicos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_tecnicos_tecnico ON public.os_tecnicos(tecnico_id);
