
-- ========== CATEGORIAS ==========
CREATE TABLE public.estoque_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_categorias TO authenticated;
GRANT ALL ON public.estoque_categorias TO service_role;
ALTER TABLE public.estoque_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_cat_read" ON public.estoque_categorias FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_cat_write" ON public.estoque_categorias FOR INSERT TO authenticated
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE POLICY "estoque_cat_update" ON public.estoque_categorias FOR UPDATE TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE POLICY "estoque_cat_delete" ON public.estoque_categorias FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()));
CREATE TRIGGER trg_estoque_cat_updated BEFORE UPDATE ON public.estoque_categorias
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.estoque_categorias (nome, ordem, sistema) VALUES
  ('Peças de reposição',1,true),('Material elétrico',2,true),('Material hidráulico',3,true),
  ('Filtros',4,true),('Correias',5,true),('Rolamentos',6,true),('Ferragens',7,true),
  ('Fusíveis',8,true),('Lâmpadas',9,true),('Consumíveis',10,true),('Outros',11,true);

-- ========== CONFIG ==========
CREATE TABLE public.estoque_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  metodo_valoracao TEXT NOT NULL DEFAULT 'ultimo' CHECK (metodo_valoracao IN ('ultimo','medio','manual')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.estoque_config TO authenticated;
GRANT ALL ON public.estoque_config TO service_role;
ALTER TABLE public.estoque_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_config_read" ON public.estoque_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_config_update" ON public.estoque_config FOR UPDATE TO authenticated
  USING (private.is_mestre(auth.uid()));
INSERT INTO public.estoque_config (id) VALUES (true);

-- ========== ITENS ==========
CREATE TABLE public.estoque_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  categoria_id UUID REFERENCES public.estoque_categorias(id),
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  quantidade_reservada NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 0,
  localizacao TEXT,
  custo_unitario NUMERIC NOT NULL DEFAULT 0,
  custo_medio NUMERIC NOT NULL DEFAULT 0,
  ultimo_custo NUMERIC,
  ultima_compra DATE,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  foto_url TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_itens TO authenticated;
GRANT ALL ON public.estoque_itens TO service_role;
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_itens_read" ON public.estoque_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_itens_insert" ON public.estoque_itens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_itens_update" ON public.estoque_itens FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_itens_delete" ON public.estoque_itens FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()));
CREATE TRIGGER trg_estoque_itens_updated BEFORE UPDATE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_estoque_item_criado_por()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.criado_por IS NULL THEN NEW.criado_por := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_estoque_item_criado_por BEFORE INSERT ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.tg_estoque_item_criado_por();

-- ========== EQUIPAMENTOS COMPATÍVEIS ==========
CREATE TABLE public.estoque_item_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, equipamento_id)
);
GRANT SELECT, INSERT, DELETE ON public.estoque_item_equipamentos TO authenticated;
GRANT ALL ON public.estoque_item_equipamentos TO service_role;
ALTER TABLE public.estoque_item_equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_item_eq_read" ON public.estoque_item_equipamentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_item_eq_insert" ON public.estoque_item_equipamentos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_item_eq_delete" ON public.estoque_item_equipamentos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));

-- ========== RESERVAS ==========
CREATE TABLE public.estoque_reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  manutencao_id UUID REFERENCES public.manutencoes_periodicas(id) ON DELETE SET NULL,
  quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','consumida','cancelada')),
  motivo TEXT,
  usuario_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_reservas TO authenticated;
GRANT ALL ON public.estoque_reservas TO service_role;
ALTER TABLE public.estoque_reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_reservas_read" ON public.estoque_reservas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_reservas_insert" ON public.estoque_reservas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_reservas_update" ON public.estoque_reservas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_reservas_delete" ON public.estoque_reservas FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()));
CREATE TRIGGER trg_estoque_reservas_updated BEFORE UPDATE ON public.estoque_reservas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== MOVIMENTAÇÕES ==========
CREATE TABLE public.estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','devolucao','reserva','cancelamento_reserva')),
  quantidade NUMERIC NOT NULL,
  saldo_anterior NUMERIC,
  saldo_novo NUMERIC,
  valor_unitario NUMERIC,
  valor_total NUMERIC,
  motivo TEXT,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  manutencao_id UUID REFERENCES public.manutencoes_periodicas(id) ON DELETE SET NULL,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  reserva_id UUID REFERENCES public.estoque_reservas(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  nota_numero TEXT,
  comprovante_url TEXT,
  observacao TEXT,
  usuario_id UUID REFERENCES public.profiles(id),
  os_custo_id UUID REFERENCES public.os_custos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.estoque_movimentacoes TO authenticated;
GRANT ALL ON public.estoque_movimentacoes TO service_role;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_mov_read" ON public.estoque_movimentacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_mov_insert" ON public.estoque_movimentacoes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));

-- ========== AUDITORIA ==========
CREATE TABLE public.estoque_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  ferramenta_id UUID,
  usuario_id UUID REFERENCES public.profiles(id),
  acao TEXT NOT NULL,
  quantidade_anterior NUMERIC,
  quantidade_nova NUMERIC,
  valor_anterior NUMERIC,
  valor_novo NUMERIC,
  motivo TEXT,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.estoque_auditoria TO authenticated;
GRANT ALL ON public.estoque_auditoria TO service_role;
ALTER TABLE public.estoque_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_aud_read" ON public.estoque_auditoria FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "estoque_aud_insert" ON public.estoque_auditoria FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- ========== FERRAMENTAS ==========
CREATE TABLE public.ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  categoria TEXT,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  localizacao TEXT,
  setor_id UUID REFERENCES public.setores(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  valor_aquisicao NUMERIC,
  data_aquisicao DATE,
  status TEXT NOT NULL DEFAULT 'disponivel'
    CHECK (status IN ('disponivel','em_uso','emprestada','em_manutencao','danificada','perdida')),
  foto_url TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ferramentas TO authenticated;
GRANT ALL ON public.ferramentas TO service_role;
ALTER TABLE public.ferramentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ferramentas_read" ON public.ferramentas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "ferramentas_insert" ON public.ferramentas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "ferramentas_update" ON public.ferramentas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "ferramentas_delete" ON public.ferramentas FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()));
CREATE TRIGGER trg_ferramentas_updated BEFORE UPDATE ON public.ferramentas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ferramenta_emprestimos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ferramenta_id UUID NOT NULL REFERENCES public.ferramentas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id),
  registrado_por UUID REFERENCES public.profiles(id),
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  retirada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  previsao_devolucao DATE,
  devolvido_em TIMESTAMPTZ,
  estado_devolucao TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ferramenta_emprestimos TO authenticated;
GRANT ALL ON public.ferramenta_emprestimos TO service_role;
ALTER TABLE public.ferramenta_emprestimos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ferr_emp_read" ON public.ferramenta_emprestimos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "ferr_emp_insert" ON public.ferramenta_emprestimos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "ferr_emp_update" ON public.ferramenta_emprestimos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE TRIGGER trg_ferr_emp_updated BEFORE UPDATE ON public.ferramenta_emprestimos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== MOTOR DE MOVIMENTAÇÃO ==========
CREATE OR REPLACE FUNCTION public.tg_estoque_aplicar_movimento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.estoque_itens%ROWTYPE;
  v_saldo NUMERIC;
  v_valor NUMERIC;
  v_metodo TEXT;
  v_custo_id UUID;
  v_cat UUID;
BEGIN
  SELECT * INTO v_item FROM public.estoque_itens WHERE id = NEW.item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item de estoque não encontrado.'; END IF;

  IF NEW.usuario_id IS NULL THEN NEW.usuario_id := auth.uid(); END IF;
  NEW.saldo_anterior := v_item.quantidade;
  v_saldo := v_item.quantidade;

  SELECT metodo_valoracao INTO v_metodo FROM public.estoque_config WHERE id;

  IF NEW.tipo IN ('entrada','devolucao') THEN
    IF NEW.quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade deve ser maior que zero.'; END IF;
    v_saldo := v_item.quantidade + NEW.quantidade;
    IF NEW.tipo = 'entrada' AND NEW.valor_unitario IS NOT NULL AND NEW.valor_unitario > 0 THEN
      UPDATE public.estoque_itens SET
        quantidade = v_saldo,
        ultimo_custo = NEW.valor_unitario,
        ultima_compra = NEW.data,
        custo_medio = CASE WHEN (v_item.quantidade + NEW.quantidade) > 0
          THEN ((v_item.quantidade * COALESCE(NULLIF(v_item.custo_medio,0), v_item.custo_unitario)) + (NEW.quantidade * NEW.valor_unitario)) / (v_item.quantidade + NEW.quantidade)
          ELSE NEW.valor_unitario END,
        custo_unitario = CASE WHEN v_metodo = 'manual' THEN v_item.custo_unitario ELSE NEW.valor_unitario END,
        fornecedor_id = COALESCE(NEW.fornecedor_id, v_item.fornecedor_id)
      WHERE id = v_item.id;
    ELSE
      UPDATE public.estoque_itens SET quantidade = v_saldo WHERE id = v_item.id;
    END IF;

  ELSIF NEW.tipo = 'saida' THEN
    IF NEW.quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade deve ser maior que zero.'; END IF;
    IF NEW.quantidade > v_item.quantidade THEN
      RAISE EXCEPTION 'Saldo insuficiente: disponível %, solicitado %', v_item.quantidade, NEW.quantidade;
    END IF;
    v_saldo := v_item.quantidade - NEW.quantidade;
    UPDATE public.estoque_itens SET quantidade = v_saldo WHERE id = v_item.id;

  ELSIF NEW.tipo = 'ajuste' THEN
    v_saldo := NEW.quantidade;
    IF v_saldo < 0 THEN RAISE EXCEPTION 'Saldo ajustado não pode ser negativo.'; END IF;
    UPDATE public.estoque_itens SET quantidade = v_saldo WHERE id = v_item.id;

  ELSIF NEW.tipo = 'reserva' THEN
    IF NEW.quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade deve ser maior que zero.'; END IF;
    IF NEW.quantidade > (v_item.quantidade - v_item.quantidade_reservada) THEN
      RAISE EXCEPTION 'Saldo disponível insuficiente para reserva.';
    END IF;
    UPDATE public.estoque_itens SET quantidade_reservada = v_item.quantidade_reservada + NEW.quantidade WHERE id = v_item.id;

  ELSIF NEW.tipo = 'cancelamento_reserva' THEN
    UPDATE public.estoque_itens
      SET quantidade_reservada = GREATEST(0, v_item.quantidade_reservada - NEW.quantidade)
      WHERE id = v_item.id;
  END IF;

  NEW.saldo_novo := v_saldo;

  -- valoração da saída
  IF NEW.tipo = 'saida' AND (NEW.valor_unitario IS NULL OR NEW.valor_unitario = 0) THEN
    NEW.valor_unitario := CASE
      WHEN v_metodo = 'medio' THEN COALESCE(NULLIF(v_item.custo_medio,0), v_item.custo_unitario, 0)
      WHEN v_metodo = 'ultimo' THEN COALESCE(v_item.ultimo_custo, v_item.custo_unitario, 0)
      ELSE COALESCE(v_item.custo_unitario, 0) END;
  END IF;
  NEW.valor_total := COALESCE(NEW.valor_unitario,0) * ABS(NEW.quantidade);

  -- lança o custo na OS automaticamente
  IF NEW.tipo = 'saida' AND NEW.os_id IS NOT NULL THEN
    SELECT id INTO v_cat FROM public.custo_categorias WHERE grupo = 'peca' AND ativo ORDER BY ordem LIMIT 1;
    INSERT INTO public.os_custos (
      os_id, tipo, descricao, quantidade, unidade, valor_unitario, categoria_id,
      equipamento_id, natureza, origem, comprovacao, previsto, registrado_por, tecnico_id, observacao
    ) VALUES (
      NEW.os_id, 'material', v_item.nome || COALESCE(' (' || v_item.codigo || ')',''),
      NEW.quantidade, v_item.unidade, COALESCE(NEW.valor_unitario,0), v_cat,
      COALESCE(NEW.equipamento_id, (SELECT equipamento_id FROM public.ordens_servico WHERE id = NEW.os_id)),
      'interno', 'estoque', 'sem_comprovante', false, NEW.usuario_id, NEW.usuario_id,
      'Baixa automática do estoque'
    ) RETURNING id INTO v_custo_id;
    NEW.os_custo_id := v_custo_id;
  END IF;

  -- auditoria
  INSERT INTO public.estoque_auditoria (item_id, usuario_id, acao, quantidade_anterior, quantidade_nova, valor_anterior, valor_novo, motivo, detalhes)
  VALUES (NEW.item_id, NEW.usuario_id, 'movimentacao_' || NEW.tipo, NEW.saldo_anterior, NEW.saldo_novo,
          v_item.custo_unitario, NEW.valor_unitario, NEW.motivo,
          jsonb_build_object('quantidade', NEW.quantidade, 'os_id', NEW.os_id));

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_estoque_movimento BEFORE INSERT ON public.estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_estoque_aplicar_movimento();

CREATE INDEX idx_estoque_mov_item ON public.estoque_movimentacoes(item_id, created_at DESC);
CREATE INDEX idx_estoque_mov_os ON public.estoque_movimentacoes(os_id);
CREATE INDEX idx_estoque_reservas_item ON public.estoque_reservas(item_id, status);
