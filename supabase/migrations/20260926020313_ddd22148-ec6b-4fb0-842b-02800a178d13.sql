ALTER TABLE public.manutencao_auditoria
  DROP CONSTRAINT manutencao_auditoria_manutencao_id_fkey;

ALTER TABLE public.manutencao_auditoria
  ADD CONSTRAINT manutencao_auditoria_manutencao_id_fkey
  FOREIGN KEY (manutencao_id) REFERENCES public.manutencoes_periodicas(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Gestao gerencia manutencoes" ON public.manutencoes_periodicas;
CREATE POLICY "Gestao gerencia manutencoes"
ON public.manutencoes_periodicas FOR ALL TO authenticated
USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Tecnicos gerenciam manutencoes preventivas" ON public.manutencoes_periodicas;
CREATE POLICY "Tecnicos criam manutencoes preventivas"
ON public.manutencoes_periodicas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'tecnico'::public.app_role
      AND p.ativo = true AND COALESCE(p.bloqueado, false) = false
  )
);
CREATE POLICY "Tecnicos atualizam manutencoes preventivas"
ON public.manutencoes_periodicas FOR UPDATE TO authenticated
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

CREATE OR REPLACE FUNCTION public.tg_registrar_auditoria_manutencao()
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
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão expirada.'; END IF;

  v_registro := COALESCE(NEW.id, OLD.id);
  IF TG_TABLE_NAME = 'manutencoes_periodicas' THEN
    v_manutencao := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.id END;
  ELSE
    v_manutencao := COALESCE(NEW.manutencao_id, OLD.manutencao_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_detalhes := jsonb_build_object('novo', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_detalhes := jsonb_build_object('anterior', to_jsonb(OLD));
  ELSE
    v_detalhes := jsonb_build_object('anterior', to_jsonb(OLD), 'novo', to_jsonb(NEW));
  END IF;

  INSERT INTO public.manutencao_auditoria
    (entidade, registro_id, manutencao_id, usuario_id, acao, detalhes)
  VALUES
    (TG_TABLE_NAME, v_registro, v_manutencao, v_user, lower(TG_OP), v_detalhes);
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.tg_registrar_auditoria_manutencao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_registrar_auditoria_manutencao() TO service_role;

DROP TRIGGER IF EXISTS trg_auditar_manutencao_preventiva ON public.manutencoes_periodicas;
CREATE TRIGGER trg_auditar_manutencao_preventiva
AFTER INSERT OR UPDATE OR DELETE ON public.manutencoes_periodicas
FOR EACH ROW EXECUTE FUNCTION public.tg_registrar_auditoria_manutencao();