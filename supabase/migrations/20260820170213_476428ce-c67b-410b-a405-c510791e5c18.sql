-- 1. Status configuráveis de equipamento
CREATE TABLE public.equipamento_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#64748b',
  categoria TEXT NOT NULL DEFAULT 'operando',
  ordem INTEGER NOT NULL DEFAULT 0,
  sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_status TO authenticated;
GRANT ALL ON public.equipamento_status TO service_role;
ALTER TABLE public.equipamento_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com papel leem status equipamento" ON public.equipamento_status FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Gestao gerencia status equipamento" ON public.equipamento_status FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE TRIGGER trg_eqstatus_updated BEFORE UPDATE ON public.equipamento_status FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.equipamento_status (nome, cor, categoria, ordem, sistema) VALUES
 ('Operando normalmente', '#16a34a', 'operando', 1, true),
 ('Em observação', '#0ea5e9', 'atencao', 2, true),
 ('Necessita manutenção', '#f59e0b', 'atencao', 3, true),
 ('Em manutenção', '#f97316', 'manutencao', 4, true),
 ('Parado', '#dc2626', 'parado', 5, true),
 ('Aguardando peça', '#a855f7', 'parado', 6, true),
 ('Aguardando fornecedor', '#7c3aed', 'parado', 7, true),
 ('Fora de uso', '#64748b', 'inativo', 8, true),
 ('Desativado', '#475569', 'inativo', 9, true),
 ('Descartado', '#1f2937', 'inativo', 10, true);

-- 2. Novos campos do equipamento
ALTER TABLE public.equipamentos
  ADD COLUMN codigo TEXT,
  ADD COLUMN tipo TEXT,
  ADD COLUMN status_id UUID REFERENCES public.equipamento_status(id),
  ADD COLUMN vida_util_meses INTEGER,
  ADD COLUMN estado_conservacao TEXT,
  ADD COLUMN garantia_descricao TEXT,
  ADD COLUMN limite_custo_percentual INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN baixa_em TIMESTAMPTZ,
  ADD COLUMN baixa_tipo TEXT,
  ADD COLUMN baixa_motivo TEXT,
  ADD COLUMN baixa_destino TEXT,
  ADD COLUMN baixa_valor NUMERIC(14,2),
  ADD COLUMN baixa_usuario_id UUID REFERENCES public.profiles(id);
CREATE UNIQUE INDEX equipamentos_codigo_unico ON public.equipamentos (lower(codigo)) WHERE codigo IS NOT NULL;

UPDATE public.equipamentos e SET status_id = s.id
FROM public.equipamento_status s WHERE s.nome = 'Operando normalmente' AND e.status_id IS NULL;

-- mestre também gerencia equipamentos
DROP POLICY IF EXISTS "Admin gerencia equipamentos" ON public.equipamentos;
CREATE POLICY "Gestao gerencia equipamentos" ON public.equipamentos FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()) OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()) OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

-- 3. Histórico permanente
CREATE TABLE public.equipamento_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id),
  tipo TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  descricao TEXT,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eq_hist_eq_idx ON public.equipamento_historico (equipamento_id, created_at DESC);
GRANT SELECT, INSERT ON public.equipamento_historico TO authenticated;
GRANT ALL ON public.equipamento_historico TO service_role;
ALTER TABLE public.equipamento_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com papel leem historico equipamento" ON public.equipamento_historico FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Usuarios registram historico equipamento" ON public.equipamento_historico FOR INSERT TO authenticated
  WITH CHECK (usuario_id IS NULL OR usuario_id = auth.uid());

-- 4. Documentos e fotos
CREATE TABLE public.equipamento_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'outro',
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  observacao TEXT,
  autor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eq_doc_eq_idx ON public.equipamento_documentos (equipamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_documentos TO authenticated;
GRANT ALL ON public.equipamento_documentos TO service_role;
ALTER TABLE public.equipamento_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com papel leem documentos equipamento" ON public.equipamento_documentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Gestao gerencia documentos equipamento" ON public.equipamento_documentos FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

-- 5. Paradas (tempo indisponível)
CREATE TABLE public.equipamento_paradas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  motivo TEXT,
  observacao TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eq_parada_eq_idx ON public.equipamento_paradas (equipamento_id, inicio DESC);
GRANT SELECT, INSERT, UPDATE ON public.equipamento_paradas TO authenticated;
GRANT ALL ON public.equipamento_paradas TO service_role;
ALTER TABLE public.equipamento_paradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com papel leem paradas" ON public.equipamento_paradas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Usuarios com papel registram paradas" ON public.equipamento_paradas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Usuarios com papel atualizam paradas" ON public.equipamento_paradas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE TRIGGER trg_eqparada_updated BEFORE UPDATE ON public.equipamento_paradas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. Auditoria automática do equipamento
CREATE OR REPLACE FUNCTION public.tg_auditar_equipamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_old TEXT;
  v_new TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, descricao)
    VALUES (NEW.id, v_user, 'cadastro', 'Equipamento cadastrado');
    RETURN NEW;
  END IF;

  IF NEW.setor_id IS DISTINCT FROM OLD.setor_id THEN
    SELECT nome INTO v_old FROM public.setores WHERE id = OLD.setor_id;
    SELECT nome INTO v_new FROM public.setores WHERE id = NEW.setor_id;
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, v_user, 'setor', 'Setor', v_old, v_new);
  END IF;
  IF NEW.localizacao IS DISTINCT FROM OLD.localizacao THEN
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, v_user, 'localizacao', 'Localização', OLD.localizacao, NEW.localizacao);
  END IF;
  IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
    SELECT nome INTO v_old FROM public.profiles WHERE id = OLD.responsavel_id;
    SELECT nome INTO v_new FROM public.profiles WHERE id = NEW.responsavel_id;
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, v_user, 'responsavel', 'Responsável', v_old, v_new);
  END IF;
  IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id THEN
    SELECT nome INTO v_old FROM public.profiles WHERE id = OLD.tecnico_id;
    SELECT nome INTO v_new FROM public.profiles WHERE id = NEW.tecnico_id;
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, v_user, 'tecnico', 'Técnico responsável', v_old, v_new);
  END IF;
  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    SELECT nome INTO v_old FROM public.equipamento_status WHERE id = OLD.status_id;
    SELECT nome INTO v_new FROM public.equipamento_status WHERE id = NEW.status_id;
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, v_user, 'status', 'Status', v_old, v_new);
  END IF;
  IF NEW.situacao IS DISTINCT FROM OLD.situacao THEN
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, campo, valor_anterior, valor_novo)
    VALUES (NEW.id, v_user, 'situacao', 'Situação', OLD.situacao, NEW.situacao);
  END IF;
  IF NEW.baixa_em IS DISTINCT FROM OLD.baixa_em AND NEW.baixa_em IS NOT NULL THEN
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, campo, valor_novo, descricao)
    VALUES (NEW.id, v_user, COALESCE(NEW.baixa_tipo, 'baixa'), 'Baixa', NEW.baixa_destino, NEW.baixa_motivo);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.tg_auditar_equipamento() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_equipamento_auditar AFTER INSERT OR UPDATE ON public.equipamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_auditar_equipamento();

-- 7. OS alimenta o histórico do equipamento
CREATE OR REPLACE FUNCTION public.tg_os_historico_equipamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.equipamento_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, descricao, os_id)
    VALUES (NEW.equipamento_id, auth.uid(), 'os_aberta', 'OS #' || NEW.numero || ' — ' || NEW.titulo, NEW.id);
  ELSIF TG_OP = 'UPDATE' AND NEW.concluida_em IS DISTINCT FROM OLD.concluida_em AND NEW.concluida_em IS NOT NULL THEN
    INSERT INTO public.equipamento_historico(equipamento_id, usuario_id, tipo, descricao, os_id)
    VALUES (NEW.equipamento_id, auth.uid(), 'os_concluida', 'OS #' || NEW.numero || ' concluída', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.tg_os_historico_equipamento() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_os_hist_equipamento AFTER INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.tg_os_historico_equipamento();