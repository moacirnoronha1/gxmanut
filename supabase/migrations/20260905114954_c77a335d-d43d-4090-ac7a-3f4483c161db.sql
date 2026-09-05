ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS data_ocorrencia TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS solicitante_nome TEXT,
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.ordens_servico SET data_ocorrencia = COALESCE(data_ocorrencia, created_at);
ALTER TABLE public.ordens_servico ALTER COLUMN data_ocorrencia SET DEFAULT now();
ALTER TABLE public.ordens_servico ALTER COLUMN data_ocorrencia SET NOT NULL;
UPDATE public.ordens_servico SET registrado_por = COALESCE(registrado_por, solicitante_id);

CREATE TABLE IF NOT EXISTS public.os_exclusao_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  os_numero INTEGER,
  solicitado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  decidido_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decidido_em TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_exclusao_solicitacoes TO authenticated;
GRANT ALL ON public.os_exclusao_solicitacoes TO service_role;

ALTER TABLE public.os_exclusao_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exclusao_select" ON public.os_exclusao_solicitacoes
  FOR SELECT TO authenticated
  USING (
    solicitado_por = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master)
  );

CREATE POLICY "exclusao_insert" ON public.os_exclusao_solicitacoes
  FOR INSERT TO authenticated
  WITH CHECK (solicitado_por = auth.uid());

CREATE POLICY "exclusao_update_mestre" ON public.os_exclusao_solicitacoes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master));

CREATE POLICY "exclusao_delete_mestre" ON public.os_exclusao_solicitacoes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_master));

CREATE UNIQUE INDEX IF NOT EXISTS os_exclusao_pendente_unica
  ON public.os_exclusao_solicitacoes (os_id) WHERE status = 'pendente';

CREATE TRIGGER trg_os_exclusao_updated BEFORE UPDATE ON public.os_exclusao_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.excluir_os_definitivo(p_solicitacao_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_os UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão expirada.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user AND p.is_master) THEN
    RAISE EXCEPTION 'Somente o Usuário Mestre pode excluir definitivamente uma OS.';
  END IF;

  SELECT os_id INTO v_os FROM public.os_exclusao_solicitacoes
   WHERE id = p_solicitacao_id AND status = 'pendente';
  IF v_os IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada ou já decidida.'; END IF;

  DELETE FROM public.checklist_respostas WHERE execucao_id IN (
    SELECT id FROM public.checklist_execucoes WHERE os_id = v_os);
  DELETE FROM public.checklist_execucoes WHERE os_id = v_os;
  DELETE FROM public.os_custo_evidencias WHERE custo_id IN (
    SELECT id FROM public.os_custos WHERE os_id = v_os);
  UPDATE public.estoque_movimentacoes SET os_id = NULL, os_custo_id = NULL WHERE os_id = v_os;
  DELETE FROM public.os_custos WHERE os_id = v_os;
  DELETE FROM public.os_anexos WHERE os_id = v_os;
  DELETE FROM public.os_comentarios WHERE os_id = v_os;
  DELETE FROM public.os_historico WHERE os_id = v_os;
  DELETE FROM public.os_tecnicos WHERE os_id = v_os;
  DELETE FROM public.equipamento_historico WHERE os_id = v_os;
  DELETE FROM public.estoque_reservas WHERE os_id = v_os;
  DELETE FROM public.notificacoes WHERE os_id = v_os;
  UPDATE public.mp_execucoes SET os_id = NULL WHERE os_id = v_os;
  UPDATE public.ordens_servico SET reaberta_de = NULL WHERE reaberta_de = v_os;

  UPDATE public.os_exclusao_solicitacoes
     SET status = 'aprovada', decidido_por = v_user, decidido_em = now()
   WHERE id = p_solicitacao_id;

  DELETE FROM public.ordens_servico WHERE id = v_os;
END; $$;

REVOKE ALL ON FUNCTION public.excluir_os_definitivo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_os_definitivo(UUID) TO authenticated;