
CREATE TABLE IF NOT EXISTS public.os_edicao_permissoes (
  role public.app_role NOT NULL,
  campo TEXT NOT NULL,
  permitido BOOLEAN NOT NULL DEFAULT false,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, campo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_edicao_permissoes TO authenticated;
GRANT ALL ON public.os_edicao_permissoes TO service_role;

ALTER TABLE public.os_edicao_permissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem permissoes de edicao" ON public.os_edicao_permissoes;
CREATE POLICY "Autenticados leem permissoes de edicao"
ON public.os_edicao_permissoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Mestre gerencia permissoes de edicao" ON public.os_edicao_permissoes;
CREATE POLICY "Mestre gerencia permissoes de edicao"
ON public.os_edicao_permissoes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master));

-- padrão inicial: técnicos e responsáveis podem editar os campos operacionais
INSERT INTO public.os_edicao_permissoes (role, campo, permitido)
SELECT r.role, c.campo, true
FROM (VALUES ('admin'::public.app_role), ('tecnico'::public.app_role), ('responsavel'::public.app_role)) AS r(role),
     (VALUES ('titulo'),('descricao'),('setor_id'),('local'),('equipamento_id'),('categoria_id'),
             ('urgencia_id'),('tecnico_id'),('tecnicos_apoio'),('data_desejada'),('recomendacoes'),
             ('anexos'),('status_id')) AS c(campo)
ON CONFLICT (role, campo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.editar_ordem_servico(
  p_os_id UUID,
  p_alteracoes JSONB DEFAULT '{}'::jsonb,
  p_tecnicos_apoio UUID[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_mestre BOOLEAN := false;
  v_final BOOLEAN := false;
  v_os public.ordens_servico%ROWTYPE;
  v_permitidos TEXT[];
  v_campo TEXT;
  v_campos_validos TEXT[] := ARRAY['titulo','descricao','setor_id','local','equipamento_id',
    'categoria_id','urgencia_id','tecnico_id','data_desejada','recomendacoes','status_id'];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão expirada.'; END IF;

  SELECT * INTO v_os FROM public.ordens_servico WHERE id = p_os_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordem de serviço não encontrada.'; END IF;

  SELECT COALESCE(is_master,false) INTO v_mestre FROM public.profiles WHERE id = v_user;

  SELECT COALESCE(v_os.concluida_em IS NOT NULL, false)
      OR COALESCE((SELECT is_final FROM public.status_os WHERE id = v_os.status_id), false)
    INTO v_final;

  IF NOT v_mestre THEN
    IF v_final THEN
      RAISE EXCEPTION 'Somente o Usuário Mestre pode editar uma OS concluída.';
    END IF;
    SELECT COALESCE(array_agg(DISTINCT e.campo), ARRAY[]::TEXT[]) INTO v_permitidos
    FROM public.os_edicao_permissoes e
    JOIN public.user_roles ur ON ur.role = e.role AND ur.user_id = v_user
    WHERE e.permitido;
  END IF;

  FOR v_campo IN SELECT jsonb_object_keys(COALESCE(p_alteracoes, '{}'::jsonb)) LOOP
    IF NOT (v_campo = ANY (v_campos_validos)) THEN
      RAISE EXCEPTION 'Campo não editável: %', v_campo;
    END IF;
    IF NOT v_mestre AND NOT (v_campo = ANY (v_permitidos)) THEN
      RAISE EXCEPTION 'Você não tem permissão para editar o campo %', v_campo;
    END IF;
  END LOOP;

  IF p_tecnicos_apoio IS NOT NULL AND NOT v_mestre
     AND NOT ('tecnicos_apoio' = ANY (v_permitidos)) THEN
    RAISE EXCEPTION 'Você não tem permissão para editar os técnicos de apoio.';
  END IF;

  IF COALESCE(p_alteracoes, '{}'::jsonb) <> '{}'::jsonb THEN
    UPDATE public.ordens_servico o SET
      titulo          = CASE WHEN p_alteracoes ? 'titulo' THEN n.titulo ELSE o.titulo END,
      descricao       = CASE WHEN p_alteracoes ? 'descricao' THEN n.descricao ELSE o.descricao END,
      setor_id        = CASE WHEN p_alteracoes ? 'setor_id' THEN n.setor_id ELSE o.setor_id END,
      local           = CASE WHEN p_alteracoes ? 'local' THEN n.local ELSE o.local END,
      equipamento_id  = CASE WHEN p_alteracoes ? 'equipamento_id' THEN n.equipamento_id ELSE o.equipamento_id END,
      categoria_id    = CASE WHEN p_alteracoes ? 'categoria_id' THEN n.categoria_id ELSE o.categoria_id END,
      urgencia_id     = CASE WHEN p_alteracoes ? 'urgencia_id' THEN n.urgencia_id ELSE o.urgencia_id END,
      tecnico_id      = CASE WHEN p_alteracoes ? 'tecnico_id' THEN n.tecnico_id ELSE o.tecnico_id END,
      data_desejada   = CASE WHEN p_alteracoes ? 'data_desejada' THEN n.data_desejada ELSE o.data_desejada END,
      recomendacoes   = CASE WHEN p_alteracoes ? 'recomendacoes' THEN n.recomendacoes ELSE o.recomendacoes END,
      status_id       = CASE WHEN p_alteracoes ? 'status_id' THEN n.status_id ELSE o.status_id END,
      concluida_em    = CASE
        WHEN p_alteracoes ? 'status_id'
             AND COALESCE((SELECT s.is_final FROM public.status_os s WHERE s.id = n.status_id), false)
          THEN COALESCE(o.concluida_em, now())
        WHEN p_alteracoes ? 'status_id'
          THEN NULL
        ELSE o.concluida_em END
    FROM jsonb_populate_record(NULL::public.ordens_servico, p_alteracoes) n
    WHERE o.id = p_os_id;
  END IF;

  IF p_tecnicos_apoio IS NOT NULL THEN
    DELETE FROM public.os_tecnicos t
    WHERE t.os_id = p_os_id AND t.papel = 'apoio'
      AND NOT (t.tecnico_id = ANY (p_tecnicos_apoio));
    INSERT INTO public.os_tecnicos (os_id, tecnico_id, papel, adicionado_por)
    SELECT p_os_id, x, 'apoio', v_user
    FROM unnest(p_tecnicos_apoio) AS x
    WHERE NOT EXISTS (
      SELECT 1 FROM public.os_tecnicos t WHERE t.os_id = p_os_id AND t.tecnico_id = x
    );
  END IF;

  INSERT INTO public.os_historico (os_id, usuario_id, acao, detalhes)
  VALUES (
    p_os_id, v_user,
    CASE WHEN v_final THEN 'OS editada após conclusão' ELSE 'OS editada' END,
    jsonb_build_object(
      'alteracoes', COALESCE(p_alteracoes, '{}'::jsonb),
      'tecnicos_apoio', to_jsonb(p_tecnicos_apoio)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.editar_ordem_servico(UUID, JSONB, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_ordem_servico(UUID, JSONB, UUID[]) TO authenticated;
