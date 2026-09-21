-- A função valida explicitamente o papel e executa a conclusão de forma atômica,
-- permitindo que qualquer técnico ativo conclua a OS mesmo antes de assumi-la.
CREATE OR REPLACE FUNCTION public.concluir_ordem_servico(
  p_os_id uuid,
  p_diagnostico text DEFAULT NULL,
  p_correcao text DEFAULT NULL,
  p_materiais_utilizados text DEFAULT NULL,
  p_testes_realizados text DEFAULT NULL,
  p_resultado_testes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_status_concluida uuid;
  v_agora timestamptz := now();
  v_numero integer;
  v_autorizado boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = v_user
      AND ur.role IN ('tecnico'::public.app_role, 'admin'::public.app_role, 'mestre'::public.app_role)
      AND p.ativo = true
      AND COALESCE(p.bloqueado, false) = false
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user AND p.is_master = true AND p.ativo = true
      AND COALESCE(p.bloqueado, false) = false
  ) INTO v_autorizado;

  IF NOT v_autorizado THEN
    RAISE EXCEPTION 'Somente Técnico de Manutenção, Administrador ou Usuário Mestre pode concluir uma OS.';
  END IF;

  SELECT s.id INTO v_status_concluida
  FROM public.status_os s
  WHERE s.ativo = true AND s.is_final = true
    AND lower(s.nome) IN ('concluída', 'concluida')
  ORDER BY s.ordem LIMIT 1;

  IF v_status_concluida IS NULL THEN
    SELECT s.id INTO v_status_concluida
    FROM public.status_os s
    WHERE s.ativo = true AND s.is_final = true
      AND lower(s.nome) LIKE 'conclu%'
    ORDER BY s.ordem LIMIT 1;
  END IF;

  IF v_status_concluida IS NULL THEN
    RAISE EXCEPTION 'O status Concluída não está configurado.';
  END IF;

  UPDATE public.ordens_servico o
  SET status_id = v_status_concluida,
      concluida_em = v_agora,
      diagnostico = p_diagnostico,
      correcao = p_correcao,
      materiais_utilizados = p_materiais_utilizados,
      testes_realizados = p_testes_realizados,
      resultado_testes = p_resultado_testes
  WHERE o.id = p_os_id AND o.concluida_em IS NULL
  RETURNING o.numero INTO v_numero;

  IF v_numero IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = p_os_id) THEN
      RAISE EXCEPTION 'Ordem de serviço não encontrada.';
    END IF;
    RAISE EXCEPTION 'Esta ordem de serviço já está concluída.';
  END IF;

  INSERT INTO public.os_historico (os_id, usuario_id, acao, detalhes)
  VALUES (p_os_id, v_user, 'concluída pelo técnico',
    jsonb_build_object('usuario_id', v_user, 'concluida_em', v_agora, 'status_id', v_status_concluida));

  RETURN jsonb_build_object('ok', true, 'os_id', p_os_id, 'numero', v_numero,
    'status_id', v_status_concluida, 'concluida_em', v_agora, 'usuario_id', v_user);
END;
$function$;

REVOKE ALL ON FUNCTION public.concluir_ordem_servico(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.concluir_ordem_servico(uuid, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.concluir_ordem_servico(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.concluir_ordem_servico(uuid, text, text, text, text, text) TO service_role;
