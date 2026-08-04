
-- 1. PERIODICIDADES
CREATE TABLE public.periodicidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'dias',
  intervalo INTEGER,
  unidade TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodicidades TO authenticated;
GRANT ALL ON public.periodicidades TO service_role;
ALTER TABLE public.periodicidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com perfil leem periodicidades" ON public.periodicidades FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Gestao gerencia periodicidades" ON public.periodicidades FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_admin(auth.uid()));
CREATE TRIGGER trg_periodicidades_updated BEFORE UPDATE ON public.periodicidades FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.periodicidades (nome, tipo, intervalo, unidade, ordem, sistema) VALUES
  ('Diária','dias',1,'dias',1,true),
  ('Semanal','dias',7,'dias',2,true),
  ('A cada duas semanas','dias',14,'dias',3,true),
  ('Mensal','meses',1,'meses',4,true),
  ('Bimestral','meses',2,'meses',5,true),
  ('Trimestral','meses',3,'meses',6,true),
  ('Semestral','meses',6,'meses',7,true),
  ('Anual','meses',12,'meses',8,true),
  ('A cada X dias','dias',NULL,'dias',9,true),
  ('A cada X semanas','semanas',NULL,'semanas',10,true),
  ('A cada X meses','meses',NULL,'meses',11,true),
  ('Por data personalizada','data_personalizada',NULL,NULL,12,true),
  ('Por horas de funcionamento','horas_funcionamento',NULL,'horas',13,true),
  ('Por quantidade de utilizações','utilizacoes',NULL,'usos',14,true);

-- 2. MANUTENCOES PERIODICAS
CREATE TABLE public.manutencoes_periodicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  localizacao TEXT,
  categoria_id UUID REFERENCES public.categorias_problema(id) ON DELETE SET NULL,
  descricao TEXT,
  procedimento TEXT,
  periodicidade_id UUID REFERENCES public.periodicidades(id),
  intervalo_custom INTEGER,
  dias_semana INTEGER[],
  regra_mensal TEXT,
  dia_mes INTEGER,
  mes_ano INTEGER,
  data_inicio DATE,
  primeira_execucao DATE,
  proxima_execucao DATE,
  ultima_execucao DATE,
  horario_preferencial TIME,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tecnico_substituto_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tempo_estimado_min INTEGER,
  prioridade TEXT NOT NULL DEFAULT 'normal',
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  materiais TEXT,
  ferramentas TEXT,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  observacoes TEXT,
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  situacao TEXT NOT NULL DEFAULT 'ativa',
  geracao_os TEXT NOT NULL DEFAULT 'lembrete',
  escalacao JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes_periodicas TO authenticated;
GRANT ALL ON public.manutencoes_periodicas TO service_role;
ALTER TABLE public.manutencoes_periodicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com perfil leem manutencoes" ON public.manutencoes_periodicas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Gestao gerencia manutencoes" ON public.manutencoes_periodicas FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE TRIGGER trg_mp_updated BEFORE UPDATE ON public.manutencoes_periodicas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_mp_proxima ON public.manutencoes_periodicas(proxima_execucao);
CREATE INDEX idx_mp_equip ON public.manutencoes_periodicas(equipamento_id);

-- 3. LEMBRETES
CREATE TABLE public.mp_lembretes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES public.manutencoes_periodicas(id) ON DELETE CASCADE,
  dias_antes INTEGER NOT NULL DEFAULT 0,
  canais TEXT[] NOT NULL DEFAULT ARRAY['painel'],
  destinatarios TEXT[] NOT NULL DEFAULT ARRAY['tecnico'],
  usuarios_extra UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_lembretes TO authenticated;
GRANT ALL ON public.mp_lembretes TO service_role;
ALTER TABLE public.mp_lembretes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com perfil leem lembretes" ON public.mp_lembretes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Gestao gerencia lembretes" ON public.mp_lembretes FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

-- 4. EVENTOS DE LEMBRETE (recebido / visualizado / confirmado)
CREATE TABLE public.mp_lembrete_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES public.manutencoes_periodicas(id) ON DELETE CASCADE,
  lembrete_id UUID REFERENCES public.mp_lembretes(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  data_referencia DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mp_lembrete_eventos TO authenticated;
GRANT ALL ON public.mp_lembrete_eventos TO service_role;
ALTER TABLE public.mp_lembrete_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com perfil leem eventos" ON public.mp_lembrete_eventos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Usuario registra proprio evento" ON public.mp_lembrete_eventos FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- 5. EXECUCOES
CREATE TABLE public.mp_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES public.manutencoes_periodicas(id) ON DELETE CASCADE,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  data_programada DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando',
  iniciada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checklist_respostas JSONB NOT NULL DEFAULT '[]'::jsonb,
  fotos_antes JSONB NOT NULL DEFAULT '[]'::jsonb,
  fotos_depois JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnostico TEXT,
  irregularidades TEXT,
  materiais_utilizados TEXT,
  correcao TEXT,
  recomendacoes TEXT,
  servico_realizado TEXT,
  executada_completa BOOLEAN,
  encontrou_irregularidade BOOLEAN,
  gerou_corretiva BOOLEAN NOT NULL DEFAULT false,
  os_corretiva_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  proxima_data DATE,
  custo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mp_execucoes TO authenticated;
GRANT ALL ON public.mp_execucoes TO service_role;
ALTER TABLE public.mp_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com perfil leem execucoes" ON public.mp_execucoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Tecnicos e gestao criam execucoes" ON public.mp_execucoes FOR INSERT TO authenticated
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()) OR private.has_role(auth.uid(),'tecnico'::app_role));
CREATE POLICY "Tecnicos e gestao atualizam execucoes" ON public.mp_execucoes FOR UPDATE TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()) OR tecnico_id = auth.uid())
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()) OR tecnico_id = auth.uid());
CREATE TRIGGER trg_mpexec_updated BEFORE UPDATE ON public.mp_execucoes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_mpexec_man ON public.mp_execucoes(manutencao_id);
CREATE INDEX idx_mpexec_data ON public.mp_execucoes(data_programada);

-- 6. REAGENDAMENTOS
CREATE TABLE public.mp_reagendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES public.manutencoes_periodicas(id) ON DELETE CASCADE,
  execucao_id UUID REFERENCES public.mp_execucoes(id) ON DELETE SET NULL,
  data_original DATE,
  nova_data DATE NOT NULL,
  motivo TEXT NOT NULL,
  observacao TEXT,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mp_reagendamentos TO authenticated;
GRANT ALL ON public.mp_reagendamentos TO service_role;
ALTER TABLE public.mp_reagendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios com perfil leem reagendamentos" ON public.mp_reagendamentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()) OR private.is_mestre(auth.uid()));
CREATE POLICY "Usuario registra reagendamento" ON public.mp_reagendamentos FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- 7. VINCULO NA OS
ALTER TABLE public.ordens_servico
  ADD COLUMN manutencao_periodica_id UUID REFERENCES public.manutencoes_periodicas(id) ON DELETE SET NULL,
  ADD COLUMN mp_execucao_id UUID REFERENCES public.mp_execucoes(id) ON DELETE SET NULL;
