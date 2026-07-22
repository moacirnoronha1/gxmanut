
-- =========================================================
-- ENUM de perfis
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'responsavel', 'tecnico');

-- =========================================================
-- Função de atualização de updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gestor'));
$$;

-- Trigger auto-criação de profile + role padrão (responsável)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'responsavel') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas profiles
CREATE POLICY "Usuários veem próprio perfil" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_gestor_or_admin(auth.uid()));
CREATE POLICY "Usuários editam próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admin gerencia perfis" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Políticas user_roles
CREATE POLICY "Usuário vê próprios papéis" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_gestor_or_admin(auth.uid()));
CREATE POLICY "Admin gerencia papéis" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- SETORES
-- =========================================================
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES public.profiles(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_setores_updated BEFORE UPDATE ON public.setores FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Autenticados leem setores" ON public.setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia setores" ON public.setores FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- CATEGORIAS DE PROBLEMA
-- =========================================================
CREATE TABLE public.categorias_problema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_problema TO authenticated;
GRANT ALL ON public.categorias_problema TO service_role;
ALTER TABLE public.categorias_problema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem categorias" ON public.categorias_problema FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia categorias" ON public.categorias_problema FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- URGÊNCIAS (configuráveis)
-- =========================================================
CREATE TABLE public.urgencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#64748b',
  ordem INTEGER NOT NULL DEFAULT 0,
  prazo_horas INTEGER,
  requer_confirmacao BOOLEAN NOT NULL DEFAULT false,
  alerta_sonoro BOOLEAN NOT NULL DEFAULT false,
  escalar BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.urgencias TO authenticated;
GRANT ALL ON public.urgencias TO service_role;
ALTER TABLE public.urgencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem urgências" ON public.urgencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia urgências" ON public.urgencias FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- STATUS OS (configuráveis)
-- =========================================================
CREATE TABLE public.status_os (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#64748b',
  ordem INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_os TO authenticated;
GRANT ALL ON public.status_os TO service_role;
ALTER TABLE public.status_os ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem status" ON public.status_os FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia status" ON public.status_os FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- FORNECEDORES
-- =========================================================
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  email TEXT,
  especialidade TEXT,
  contato TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Autenticados leem fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/gestor gerenciam fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (public.is_gestor_or_admin(auth.uid())) WITH CHECK (public.is_gestor_or_admin(auth.uid()));

-- =========================================================
-- EQUIPAMENTOS
-- =========================================================
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  patrimonio TEXT,
  categoria TEXT,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  setor_id UUID REFERENCES public.setores(id),
  localizacao TEXT,
  data_aquisicao DATE,
  data_instalacao DATE,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  garantia_ate DATE,
  responsavel_id UUID REFERENCES public.profiles(id),
  tecnico_id UUID REFERENCES public.profiles(id),
  frequencia_preventiva TEXT,
  proxima_manutencao DATE,
  situacao TEXT NOT NULL DEFAULT 'ativo', -- ativo, inativo, em_manutencao, descartado
  foto_url TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO authenticated;
GRANT ALL ON public.equipamentos TO service_role;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_equipamentos_updated BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Autenticados leem equipamentos" ON public.equipamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia equipamentos" ON public.equipamentos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- ORDENS DE SERVIÇO
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.os_numero_seq START 1000;

CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE DEFAULT nextval('public.os_numero_seq'),
  tipo TEXT NOT NULL DEFAULT 'corretiva', -- corretiva, preventiva
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias_problema(id),
  setor_id UUID REFERENCES public.setores(id),
  local TEXT,
  equipamento_id UUID REFERENCES public.equipamentos(id),
  equipamento_nao_cadastrado TEXT,
  solicitante_id UUID NOT NULL REFERENCES public.profiles(id),
  tecnico_id UUID REFERENCES public.profiles(id),
  urgencia_id UUID REFERENCES public.urgencias(id),
  status_id UUID REFERENCES public.status_os(id),
  data_desejada DATE,
  equipamento_parado BOOLEAN NOT NULL DEFAULT false,
  risco TEXT, -- pessoas, alimentos, operacao, patrimonio, nenhum
  -- confirmação técnico
  confirmada_em TIMESTAMPTZ,
  previsao_atendimento TIMESTAMPTZ,
  iniciada_em TIMESTAMPTZ,
  -- finalização
  diagnostico TEXT,
  causa TEXT,
  correcao TEXT,
  solucao TEXT,
  materiais_utilizados TEXT,
  testes_realizados TEXT,
  resultado_testes TEXT,
  situacao_final TEXT,
  recomendacoes TEXT,
  tempo_atendimento_min INTEGER,
  tempo_parado_min INTEGER,
  concluida_em TIMESTAMPTZ,
  -- confirmação solicitante
  confirmacao_solicitante TEXT, -- resolvido, parcial, nao_resolvido
  avaliacao INTEGER, -- 1..5
  avaliacao_comentario TEXT,
  -- reabertura
  reaberta_de UUID REFERENCES public.ordens_servico(id),
  cancelada_motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_setor ON public.ordens_servico(setor_id);
CREATE INDEX idx_os_tecnico ON public.ordens_servico(tecnico_id);
CREATE INDEX idx_os_solicitante ON public.ordens_servico(solicitante_id);
CREATE INDEX idx_os_status ON public.ordens_servico(status_id);
CREATE INDEX idx_os_urgencia ON public.ordens_servico(urgencia_id);
CREATE INDEX idx_os_equipamento ON public.ordens_servico(equipamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_os_updated BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Função: usuário pode ver OS?
CREATE OR REPLACE FUNCTION public.pode_ver_os(_user_id UUID, _os_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_gestor_or_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.ordens_servico o
      WHERE o.id = _os_id
        AND (o.solicitante_id = _user_id OR o.tecnico_id = _user_id)
    );
$$;

CREATE POLICY "Ver OS conforme papel" ON public.ordens_servico FOR SELECT TO authenticated
USING (
  public.is_gestor_or_admin(auth.uid())
  OR solicitante_id = auth.uid()
  OR tecnico_id = auth.uid()
);
CREATE POLICY "Autenticados criam OS" ON public.ordens_servico FOR INSERT TO authenticated
WITH CHECK (solicitante_id = auth.uid());
CREATE POLICY "Envolvidos atualizam OS" ON public.ordens_servico FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR tecnico_id = auth.uid()
  OR solicitante_id = auth.uid()
);
CREATE POLICY "Admin apaga OS" ON public.ordens_servico FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- OS_CUSTOS
-- =========================================================
CREATE TABLE public.os_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- peca, material, mao_obra, servico_externo, transporte, outro
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
  unidade TEXT,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  data_compra DATE,
  forma_pagamento TEXT,
  nota_numero TEXT,
  comprovante_url TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_custos_os ON public.os_custos(os_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_custos TO authenticated;
GRANT ALL ON public.os_custos TO service_role;
ALTER TABLE public.os_custos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver custos conforme OS" ON public.os_custos FOR SELECT TO authenticated
USING (public.pode_ver_os(auth.uid(), os_id));
CREATE POLICY "Criar custos conforme OS" ON public.os_custos FOR INSERT TO authenticated
WITH CHECK (public.pode_ver_os(auth.uid(), os_id));
CREATE POLICY "Editar custos conforme OS" ON public.os_custos FOR UPDATE TO authenticated
USING (public.pode_ver_os(auth.uid(), os_id));
CREATE POLICY "Admin apaga custos" ON public.os_custos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- =========================================================
-- OS_COMENTARIOS
-- =========================================================
CREATE TABLE public.os_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.profiles(id),
  mensagem TEXT NOT NULL,
  interno BOOLEAN NOT NULL DEFAULT false,
  anexo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coment_os ON public.os_comentarios(os_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_comentarios TO authenticated;
GRANT ALL ON public.os_comentarios TO service_role;
ALTER TABLE public.os_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver comentarios conforme OS" ON public.os_comentarios FOR SELECT TO authenticated
USING (public.pode_ver_os(auth.uid(), os_id));
CREATE POLICY "Criar comentarios conforme OS" ON public.os_comentarios FOR INSERT TO authenticated
WITH CHECK (public.pode_ver_os(auth.uid(), os_id) AND autor_id = auth.uid());
CREATE POLICY "Autor edita comentario" ON public.os_comentarios FOR UPDATE TO authenticated
USING (autor_id = auth.uid() OR public.is_admin(auth.uid()));

-- =========================================================
-- OS_ANEXOS
-- =========================================================
CREATE TABLE public.os_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES public.profiles(id),
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT, -- foto_antes, foto_depois, video, documento
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_anexos_os ON public.os_anexos(os_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_anexos TO authenticated;
GRANT ALL ON public.os_anexos TO service_role;
ALTER TABLE public.os_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver anexos conforme OS" ON public.os_anexos FOR SELECT TO authenticated
USING (public.pode_ver_os(auth.uid(), os_id));
CREATE POLICY "Criar anexos conforme OS" ON public.os_anexos FOR INSERT TO authenticated
WITH CHECK (public.pode_ver_os(auth.uid(), os_id));
CREATE POLICY "Admin apaga anexos" ON public.os_anexos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR autor_id = auth.uid());

-- =========================================================
-- OS_HISTORICO (auditoria)
-- =========================================================
CREATE TABLE public.os_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id),
  acao TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hist_os ON public.os_historico(os_id);
GRANT SELECT, INSERT ON public.os_historico TO authenticated;
GRANT ALL ON public.os_historico TO service_role;
ALTER TABLE public.os_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver histórico conforme OS" ON public.os_historico FOR SELECT TO authenticated
USING (public.pode_ver_os(auth.uid(), os_id));
CREATE POLICY "Criar histórico conforme OS" ON public.os_historico FOR INSERT TO authenticated
WITH CHECK (public.pode_ver_os(auth.uid(), os_id));

-- Trigger de auditoria em ordens_servico
CREATE OR REPLACE FUNCTION public.tg_auditar_os()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_changes JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.os_historico(os_id, usuario_id, acao, detalhes)
    VALUES (NEW.id, v_user, 'criada', jsonb_build_object('numero', NEW.numero));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
      v_changes := v_changes || jsonb_build_object('status_id', jsonb_build_array(OLD.status_id, NEW.status_id));
    END IF;
    IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id THEN
      v_changes := v_changes || jsonb_build_object('tecnico_id', jsonb_build_array(OLD.tecnico_id, NEW.tecnico_id));
    END IF;
    IF NEW.urgencia_id IS DISTINCT FROM OLD.urgencia_id THEN
      v_changes := v_changes || jsonb_build_object('urgencia_id', jsonb_build_array(OLD.urgencia_id, NEW.urgencia_id));
    END IF;
    IF NEW.concluida_em IS DISTINCT FROM OLD.concluida_em AND NEW.concluida_em IS NOT NULL THEN
      v_changes := v_changes || jsonb_build_object('concluida', true);
    END IF;
    IF v_changes <> '{}'::jsonb THEN
      INSERT INTO public.os_historico(os_id, usuario_id, acao, detalhes)
      VALUES (NEW.id, v_user, 'atualizada', v_changes);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_os_auditar AFTER INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.tg_auditar_os();

-- =========================================================
-- PLANOS PREVENTIVOS (estrutura pronta p/ Fase 2)
-- =========================================================
CREATE TABLE public.planos_preventivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  atividade TEXT NOT NULL,
  frequencia TEXT NOT NULL, -- diaria, semanal, quinzenal, mensal, trimestral, semestral, anual, personalizada
  intervalo_dias INTEGER,
  responsavel_id UUID REFERENCES public.profiles(id),
  ultima_execucao DATE,
  proxima_execucao DATE,
  tempo_estimado_min INTEGER,
  materiais TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_preventivos TO authenticated;
GRANT ALL ON public.planos_preventivos TO service_role;
ALTER TABLE public.planos_preventivos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_prev_updated BEFORE UPDATE ON public.planos_preventivos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Autenticados leem preventivos" ON public.planos_preventivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia preventivos" ON public.planos_preventivos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- SEED de configurações padrão
-- =========================================================
INSERT INTO public.urgencias (nome, cor, ordem, prazo_horas, requer_confirmacao, alerta_sonoro, escalar) VALUES
  ('Não urgente', '#64748b', 1, 72, false, false, false),
  ('Urgente', '#f97316', 2, 4, true, true, false),
  ('Extremamente urgente', '#dc2626', 3, 1, true, true, true);

INSERT INTO public.status_os (nome, cor, ordem, is_final) VALUES
  ('Aberta', '#3b82f6', 1, false),
  ('Aguardando confirmação', '#8b5cf6', 2, false),
  ('Recebida', '#0ea5e9', 3, false),
  ('Em análise', '#06b6d4', 4, false),
  ('Em andamento', '#f59e0b', 5, false),
  ('Aguardando material', '#eab308', 6, false),
  ('Aguardando fornecedor', '#eab308', 7, false),
  ('Aguardando aprovação', '#a855f7', 8, false),
  ('Pausada', '#94a3b8', 9, false),
  ('Concluída', '#16a34a', 10, true),
  ('Cancelada', '#64748b', 11, true),
  ('Reaberta', '#ef4444', 12, false);

INSERT INTO public.categorias_problema (nome) VALUES
  ('Elétrica'),('Hidráulica'),('Refrigeração'),('Mecânica'),
  ('Estrutural'),('Informática/Rede'),('Mobiliário'),('Segurança'),('Outros');

INSERT INTO public.setores (nome, descricao) VALUES
  ('Restaurante', 'Salão e atendimento'),
  ('Cozinha', 'Cozinha e preparo'),
  ('Pousada', 'Quartos e recepção'),
  ('Escritório Xica', 'Administração'),
  ('Casa', 'Residência'),
  ('Almoxarifado', 'Estoque geral'),
  ('Área externa', 'Jardins e fachada');
