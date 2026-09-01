-- Edição controlada e auditada de Ordens de Serviço.
CREATE TABLE IF NOT EXISTS public.os_edicao_permissoes (
  role public.app_role NOT NULL,
  campo TEXT NOT NULL CHECK (campo IN (
    'titulo', 'descricao', 'setor_id', 'local', 'equipamento_id',
    'categoria_id', 'urgencia_id', 'tecnico_id', 'tecnicos_apoio',
    'data_desejada', 'recomendacoes', 'anexos', 'status_id'
  )),
  permitido BOOLEAN NOT NULL DEFAULT false,
  atualizado_por UUID REFERENCES public.profiles(id),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, campo)
);

ALTER TABLE public.os_edicao_permissoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.os_edicao_permissoes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.os_edicao_permissoes TO authenticated;

DROP POLICY IF EXISTS "Autenticados leem permissoes de edicao OS" ON public.os_edicao_permissoes;
CREATE POLICY "Autenticados leem permissoes de edicao OS"
ON public.os_edicao_permissoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Mestre configura permissoes de edicao OS" ON public.os_edicao_permissoes;
CREATE POLICY "Mestre configura permissoes de edicao OS"
ON public.os_edicao_permissoes FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master)
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'mestre')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master)
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'mestre')
);

INSERT INTO public.os_edicao_permissoes(role, campo, permitido)
SELECT role::public.app_role, campo, true
FROM (VALUES
  ('admin', 'titulo'), ('admin', 'descricao'), ('admin', 'setor_id'), ('admin', 'local'),
  ('admin', 'equipamento_id'), ('admin', 'categoria_id'), ('admin', 'urgencia_id'),
  ('admin', 'tecnico_id'), ('admin', 'tecnicos_apoio'), ('admin', 'data_desejada'),
  ('admin', 'recomendacoes'), ('admin', 'anexos'), ('admin', 'status_id'),
  ('tecnico', 'descricao'), ('tecnico', 'local'), ('tecnico', 'equipamento_id'),
  ('tecnico', 'categoria_id'), ('tecnico', 'urgencia_id'), ('tecnico', 'tecnico_id'),
  ('tecnico', 'tecnicos_apoio'), ('tecnico', 'data_desejada'), ('tecnico', 'recomendacoes'),
  ('tecnico', 'anexos'), ('tecnico', 'status_id'),
  ('responsavel', 'titulo'), ('responsavel', 'descricao'), ('responsavel', 'setor_id'),
  ('responsavel', 'local'), ('responsavel', 'equipamento_id'), ('responsavel', 'categoria_id'),
  ('responsavel', 'urgencia_id'), ('responsavel', 'data_desejada'),
  ('responsavel', 'recomendacoes'), ('responsavel', 'anexos')
) AS defaults(role, campo)
ON CONFLICT (role, campo) DO NOTHING;

-- Responsáveis do setor e perfis operacionais autorizados podem passar pela RLS;
-- a função transacional abaixo ainda valida cada campo individualmente.
DROP POLICY IF EXISTS "Envolvidos atualizam OS" ON public.ordens_servico;
CREATE POLICY "Perfis autorizados atualizam OS" ON public.ordens_servico
FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR solicitante_id = auth.uid()
  OR tecnico_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.os_tecnicos ot WHERE ot.os_id = id AND ot.tecnico_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profile_setores ps ON ps.user_id = ur.user_id AND ps.setor_id = setor_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'responsavel'
  )
)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.editar_ordem_servico(
  p_os_id UUID,
  p_alteracoes JSONB,
  p_tecnicos_apoio UUID[] DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.ordens_servico%ROWTYPE;
  v_new public.ordens_servico%ROWTYPE;
  v_user UUID := auth.uid();
  v_mestre BOOLEAN;
  v_role_permitida BOOLEAN;
  v_acesso BOOLEAN;
  v_concluida BOOLEAN;
  v_campo TEXT;
  v_apoio_anterior JSONB;
  v_apoio_novo JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;

  SELECT * INTO v_old FROM public.ordens_servico WHERE id = p_os_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordem de Serviço não encontrada'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user AND p.is_master)
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_user AND r.role = 'mestre')
    INTO v_mestre;
  SELECT v_mestre
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_user AND r.role IN ('admin', 'tecnico'))
      OR EXISTS (
        SELECT 1 FROM public.user_roles r
        JOIN public.profile_setores ps ON ps.user_id = r.user_id AND ps.setor_id = v_old.setor_id
        WHERE r.user_id = v_user AND r.role = 'responsavel'
      )
    INTO v_acesso;
  IF NOT v_acesso THEN RAISE EXCEPTION 'Seu perfil não pode editar esta Ordem de Serviço'; END IF;
  SELECT v_old.concluida_em IS NOT NULL OR COALESCE(s.is_final, false)
    INTO v_concluida FROM public.status_os s WHERE s.id = v_old.status_id;

  IF COALESCE(v_concluida, v_old.concluida_em IS NOT NULL) AND NOT v_mestre THEN
    RAISE EXCEPTION 'Somente o Usuário Mestre pode editar uma OS concluída';
  END IF;

  FOR v_campo IN SELECT jsonb_object_keys(COALESCE(p_alteracoes, '{}'::jsonb)) LOOP
    IF v_campo NOT IN ('titulo','descricao','setor_id','local','equipamento_id','categoria_id','urgencia_id','tecnico_id','data_desejada','recomendacoes','status_id') THEN
      RAISE EXCEPTION 'Campo não permitido para edição: %', v_campo;
    END IF;
    IF NOT v_mestre THEN
      SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.os_edicao_permissoes ep ON ep.role = ur.role AND ep.campo = v_campo AND ep.permitido
        WHERE ur.user_id = v_user
      ) INTO v_role_permitida;
      IF NOT v_role_permitida THEN RAISE EXCEPTION 'Seu perfil não pode alterar o campo %', v_campo; END IF;
    END IF;
  END LOOP;

  IF p_tecnicos_apoio IS NOT NULL AND NOT v_mestre THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.os_edicao_permissoes ep ON ep.role = ur.role AND ep.campo = 'tecnicos_apoio' AND ep.permitido
      WHERE ur.user_id = v_user
    ) INTO v_role_permitida;
    IF NOT v_role_permitida THEN RAISE EXCEPTION 'Seu perfil não pode alterar técnicos de apoio'; END IF;
  END IF;

  v_new := jsonb_populate_record(v_old, COALESCE(p_alteracoes, '{}'::jsonb));
  UPDATE public.ordens_servico SET
    titulo = v_new.titulo, descricao = v_new.descricao, setor_id = v_new.setor_id,
    local = v_new.local, equipamento_id = v_new.equipamento_id, categoria_id = v_new.categoria_id,
    urgencia_id = v_new.urgencia_id, tecnico_id = v_new.tecnico_id,
    data_desejada = v_new.data_desejada, recomendacoes = v_new.recomendacoes,
    status_id = v_new.status_id
  WHERE id = p_os_id;

  IF p_tecnicos_apoio IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(tecnico_id ORDER BY tecnico_id), '[]'::jsonb) INTO v_apoio_anterior
      FROM public.os_tecnicos WHERE os_id = p_os_id AND papel = 'apoio';
    DELETE FROM public.os_tecnicos WHERE os_id = p_os_id AND papel = 'apoio'
      AND NOT (tecnico_id = ANY(p_tecnicos_apoio));
    INSERT INTO public.os_tecnicos(os_id, tecnico_id, papel, adicionado_por)
      SELECT p_os_id, tecnico, 'apoio', v_user FROM unnest(p_tecnicos_apoio) AS tecnico
      ON CONFLICT DO NOTHING;
    SELECT COALESCE(jsonb_agg(tecnico_id ORDER BY tecnico_id), '[]'::jsonb) INTO v_apoio_novo
      FROM public.os_tecnicos WHERE os_id = p_os_id AND papel = 'apoio';
    IF v_apoio_anterior IS DISTINCT FROM v_apoio_novo THEN
      INSERT INTO public.os_historico(os_id, usuario_id, acao, detalhes)
      VALUES (p_os_id, v_user,
        CASE WHEN v_concluida THEN 'OS editada após conclusão' ELSE 'OS editada' END,
        jsonb_build_object('tecnicos_apoio', jsonb_build_object('anterior', v_apoio_anterior, 'novo', v_apoio_novo)));
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_ordem_servico(UUID, JSONB, UUID[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.editar_ordem_servico(UUID, JSONB, UUID[]) FROM PUBLIC, anon;

-- Auditoria campo a campo, com valor anterior e novo.
CREATE OR REPLACE FUNCTION public.tg_auditar_os()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_changes JSONB := '{}'::jsonb;
  v_old JSONB;
  v_new JSONB;
  v_key TEXT;
  v_concluida_antes BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.os_historico(os_id, usuario_id, acao, detalhes)
    VALUES (NEW.id, v_user, 'OS criada', jsonb_build_object('numero', NEW.numero));
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);
  SELECT OLD.concluida_em IS NOT NULL OR COALESCE(s.is_final, false)
    INTO v_concluida_antes FROM public.status_os s WHERE s.id = OLD.status_id;

  FOREACH v_key IN ARRAY ARRAY[
    'titulo','descricao','setor_id','local','equipamento_id','categoria_id',
    'urgencia_id','tecnico_id','data_desejada','recomendacoes','status_id',
    'iniciada_em','concluida_em','cancelada_motivo','diagnostico','correcao',
    'materiais_utilizados','testes_realizados','resultado_testes'
  ] LOOP
    IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
      v_changes := v_changes || jsonb_build_object(v_key,
        jsonb_build_object('anterior', v_old -> v_key, 'novo', v_new -> v_key));
    END IF;
  END LOOP;

  IF v_changes <> '{}'::jsonb THEN
    INSERT INTO public.os_historico(os_id, usuario_id, acao, detalhes)
    VALUES (NEW.id, v_user,
      CASE WHEN v_concluida_antes THEN 'OS editada após conclusão' ELSE 'OS editada' END,
      v_changes);
  END IF;
  RETURN NEW;
END; $$;
