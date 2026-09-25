ALTER TABLE public.manutencoes_periodicas
  ADD COLUMN IF NOT EXISTS checklist_id uuid REFERENCES public.checklists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.mp_execucoes
  ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE public.manutencao_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade text NOT NULL,
  registro_id uuid NOT NULL,
  manutencao_id uuid REFERENCES public.manutencoes_periodicas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  acao text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manutencao_auditoria TO authenticated;
GRANT ALL ON public.manutencao_auditoria TO service_role;
ALTER TABLE public.manutencao_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com perfil leem auditoria preventiva"
ON public.manutencao_auditoria FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  OR private.is_mestre(auth.uid())
);

DROP POLICY IF EXISTS "Tecnicos gerenciam manutencoes preventivas" ON public.manutencoes_periodicas;
CREATE POLICY "Tecnicos gerenciam manutencoes preventivas"
ON public.manutencoes_periodicas FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'tecnico'::public.app_role
      AND p.ativo = true AND COALESCE(p.bloqueado, false) = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'tecnico'::public.app_role
      AND p.ativo = true AND COALESCE(p.bloqueado, false) = false
  )
);

DROP POLICY IF EXISTS "Tecnicos gerenciam lembretes preventivos" ON public.mp_lembretes;
CREATE POLICY "Tecnicos gerenciam lembretes preventivos"
ON public.mp_lembretes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'tecnico'::public.app_role
      AND p.ativo = true AND COALESCE(p.bloqueado, false) = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'tecnico'::public.app_role
      AND p.ativo = true AND COALESCE(p.bloqueado, false) = false
  )
);

DROP POLICY IF EXISTS "Tecnicos e gestao atualizam execucoes" ON public.mp_execucoes;
CREATE POLICY "Tecnicos e gestao atualizam execucoes"
ON public.mp_execucoes FOR UPDATE TO authenticated
USING (
  private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'tecnico'::public.app_role
      AND p.ativo = true AND COALESCE(p.bloqueado, false) = false
  )
)
WITH CHECK (
  private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'tecnico'::public.app_role
      AND p.ativo = true AND COALESCE(p.bloqueado, false) = false
  )
);

CREATE OR REPLACE FUNCTION public.tg_auditar_manutencao_preventiva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_registro uuid;
  v_manutencao uuid;
  v_detalhes jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.';
  END IF;

  IF TG_TABLE_NAME = 'manutencoes_periodicas' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.criado_por := v_user;
      NEW.atualizado_por := v_user;
    ELSE
      NEW.criado_por := OLD.criado_por;
      NEW.atualizado_por := v_user;
    END IF;
    v_registro := NEW.id;
    v_manutencao := NEW.id;
  ELSIF TG_TABLE_NAME = 'mp_execucoes' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.criado_por := v_user;
      NEW.atualizado_por := v_user;
    ELSE
      NEW.criado_por := OLD.criado_por;
      NEW.atualizado_por := v_user;
    END IF;
    v_registro := NEW.id;
    v_manutencao := NEW.manutencao_id;
  ELSIF TG_TABLE_NAME = 'mp_reagendamentos' THEN
    NEW.usuario_id := v_user;
    v_registro := NEW.id;
    v_manutencao := NEW.manutencao_id;
  ELSIF TG_TABLE_NAME = 'mp_lembretes' THEN
    v_registro := NEW.id;
    v_manutencao := NEW.manutencao_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_detalhes := jsonb_build_object('novo', to_jsonb(NEW));
  ELSE
    v_detalhes := jsonb_build_object('anterior', to_jsonb(OLD), 'novo', to_jsonb(NEW));
  END IF;

  INSERT INTO public.manutencao_auditoria
    (entidade, registro_id, manutencao_id, usuario_id, acao, detalhes)
  VALUES
    (TG_TABLE_NAME, v_registro, v_manutencao, v_user, lower(TG_OP), v_detalhes);

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tg_auditar_manutencao_preventiva() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_auditar_manutencao_preventiva() TO service_role;

DROP TRIGGER IF EXISTS trg_auditar_manutencao_preventiva ON public.manutencoes_periodicas;
CREATE TRIGGER trg_auditar_manutencao_preventiva
BEFORE INSERT OR UPDATE ON public.manutencoes_periodicas
FOR EACH ROW EXECUTE FUNCTION public.tg_auditar_manutencao_preventiva();

DROP TRIGGER IF EXISTS trg_auditar_mp_execucao ON public.mp_execucoes;
CREATE TRIGGER trg_auditar_mp_execucao
BEFORE INSERT OR UPDATE ON public.mp_execucoes
FOR EACH ROW EXECUTE FUNCTION public.tg_auditar_manutencao_preventiva();

DROP TRIGGER IF EXISTS trg_auditar_mp_reagendamento ON public.mp_reagendamentos;
CREATE TRIGGER trg_auditar_mp_reagendamento
BEFORE INSERT ON public.mp_reagendamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_auditar_manutencao_preventiva();

DROP TRIGGER IF EXISTS trg_auditar_mp_lembrete ON public.mp_lembretes;
CREATE TRIGGER trg_auditar_mp_lembrete
BEFORE INSERT OR UPDATE ON public.mp_lembretes
FOR EACH ROW EXECUTE FUNCTION public.tg_auditar_manutencao_preventiva();