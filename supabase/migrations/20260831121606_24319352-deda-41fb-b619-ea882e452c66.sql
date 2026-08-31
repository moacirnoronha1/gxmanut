-- ============ 1. TIPOS DE PROPRIEDADE ============
CREATE TABLE public.propriedade_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  chave text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#64748b',
  ordem integer NOT NULL DEFAULT 0,
  sistema boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.propriedade_tipos TO authenticated;
GRANT ALL ON public.propriedade_tipos TO service_role;
ALTER TABLE public.propriedade_tipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "propriedade_tipos_read" ON public.propriedade_tipos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "propriedade_tipos_manage" ON public.propriedade_tipos FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE TRIGGER trg_propriedade_tipos_updated BEFORE UPDATE ON public.propriedade_tipos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.propriedade_tipos (nome, chave, cor, ordem, sistema) VALUES
  ('Próprio', 'proprio', '#059669', 1, true),
  ('Alugado', 'alugado', '#2563eb', 2, true),
  ('Consignado', 'consignado', '#d97706', 3, true);

-- ============ 2. CAMPOS DE PROPRIEDADE NO EQUIPAMENTO ============
ALTER TABLE public.equipamentos
  ADD COLUMN propriedade_tipo_id uuid REFERENCES public.propriedade_tipos(id),
  ADD COLUMN nota_fiscal text,
  ADD COLUMN prop_empresa text,
  ADD COLUMN prop_contrato_numero text,
  ADD COLUMN prop_contrato_inicio date,
  ADD COLUMN prop_contrato_fim date,
  ADD COLUMN prop_valor_mensal numeric,
  ADD COLUMN prop_responsavel_id uuid REFERENCES public.profiles(id),
  ADD COLUMN prop_manutencao_por text,
  ADD COLUMN prop_telefone text,
  ADD COLUMN prop_condicoes text,
  ADD COLUMN prop_observacoes text;

UPDATE public.equipamentos SET propriedade_tipo_id = (SELECT id FROM public.propriedade_tipos WHERE chave = 'proprio')
  WHERE propriedade_tipo_id IS NULL;

-- ============ 3. COMPONENTES / PERIFÉRICOS ============
CREATE TABLE public.equipamento_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_equip_comp_equip ON public.equipamento_componentes(equipamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_componentes TO authenticated;
GRANT ALL ON public.equipamento_componentes TO service_role;
ALTER TABLE public.equipamento_componentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equip_comp_read" ON public.equipamento_componentes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "equip_comp_insert" ON public.equipamento_componentes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "equip_comp_update" ON public.equipamento_componentes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "equip_comp_delete" ON public.equipamento_componentes FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()) OR criado_por = auth.uid());
CREATE TRIGGER trg_equip_comp_updated BEFORE UPDATE ON public.equipamento_componentes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ 4. TIPOS DE RESPOSTA ============
CREATE TABLE public.checklist_tipos_resposta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  formato text NOT NULL DEFAULT 'opcoes',
  opcoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  sistema boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_tipos_resposta TO authenticated;
GRANT ALL ON public.checklist_tipos_resposta TO service_role;
ALTER TABLE public.checklist_tipos_resposta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_tipos_read" ON public.checklist_tipos_resposta FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "cl_tipos_manage" ON public.checklist_tipos_resposta FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE TRIGGER trg_cl_tipos_updated BEFORE UPDATE ON public.checklist_tipos_resposta
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.checklist_tipos_resposta (chave, nome, formato, opcoes, ordem, sistema) VALUES
  ('conformidade', 'Conforme / Não conforme / Não se aplica', 'opcoes',
     '[{"valor":"conforme","label":"Conforme","conforme":true},{"valor":"nao_conforme","label":"Não conforme","conforme":false},{"valor":"na","label":"Não se aplica","conforme":null}]'::jsonb, 1, true),
  ('sim_nao', 'Sim / Não', 'opcoes',
     '[{"valor":"sim","label":"Sim","conforme":true},{"valor":"nao","label":"Não","conforme":false}]'::jsonb, 2, true),
  ('estado', 'Bom / Regular / Ruim', 'opcoes',
     '[{"valor":"bom","label":"Bom","conforme":true},{"valor":"regular","label":"Regular","conforme":null},{"valor":"ruim","label":"Ruim","conforme":false}]'::jsonb, 3, true),
  ('texto', 'Campo de texto', 'texto', '[]'::jsonb, 4, true),
  ('numero', 'Campo numérico', 'numero', '[]'::jsonb, 5, true),
  ('temperatura', 'Temperatura (°C)', 'temperatura', '[]'::jsonb, 6, true),
  ('foto', 'Foto', 'foto', '[]'::jsonb, 7, true),
  ('observacao', 'Observação', 'texto', '[]'::jsonb, 8, true);

-- ============ 5. MODELOS DE CHECKLIST ============
CREATE TABLE public.checklist_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text,
  periodicidade text NOT NULL DEFAULT 'sob_demanda',
  intervalo_dias integer,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_modelos TO authenticated;
GRANT ALL ON public.checklist_modelos TO service_role;
ALTER TABLE public.checklist_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_modelos_read" ON public.checklist_modelos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "cl_modelos_manage" ON public.checklist_modelos FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE TRIGGER trg_cl_modelos_updated BEFORE UPDATE ON public.checklist_modelos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.checklist_modelo_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.checklist_modelos(id) ON DELETE CASCADE,
  componente text NOT NULL,
  pergunta text NOT NULL,
  tipo_resposta text NOT NULL DEFAULT 'conformidade',
  obrigatorio boolean NOT NULL DEFAULT true,
  exige_foto boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cl_modelo_itens ON public.checklist_modelo_itens(modelo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_modelo_itens TO authenticated;
GRANT ALL ON public.checklist_modelo_itens TO service_role;
ALTER TABLE public.checklist_modelo_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_modelo_itens_read" ON public.checklist_modelo_itens FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "cl_modelo_itens_manage" ON public.checklist_modelo_itens FOR ALL TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

-- ============ 6. CHECKLISTS DO EQUIPAMENTO ============
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  modelo_id uuid REFERENCES public.checklist_modelos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  periodicidade text NOT NULL DEFAULT 'sob_demanda',
  intervalo_dias integer,
  proxima_execucao date,
  ultima_execucao date,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklists_equip ON public.checklists(equipamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklists_read" ON public.checklists FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "checklists_insert" ON public.checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "checklists_update" ON public.checklists FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "checklists_delete" ON public.checklists FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()) OR criado_por = auth.uid());
CREATE TRIGGER trg_checklists_updated BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.checklist_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  componente_id uuid REFERENCES public.equipamento_componentes(id) ON DELETE SET NULL,
  componente text NOT NULL,
  pergunta text NOT NULL,
  tipo_resposta text NOT NULL DEFAULT 'conformidade',
  obrigatorio boolean NOT NULL DEFAULT true,
  exige_foto boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cl_itens_checklist ON public.checklist_itens(checklist_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_itens TO authenticated;
GRANT ALL ON public.checklist_itens TO service_role;
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_itens_read" ON public.checklist_itens FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "cl_itens_insert" ON public.checklist_itens FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cl_itens_update" ON public.checklist_itens FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cl_itens_delete" ON public.checklist_itens FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============ 7. EXECUÇÕES ============
CREATE TABLE public.checklist_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'em_andamento',
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz,
  total_itens integer NOT NULL DEFAULT 0,
  conformes integer NOT NULL DEFAULT 0,
  nao_conformes integer NOT NULL DEFAULT 0,
  nao_aplicaveis integer NOT NULL DEFAULT 0,
  percentual_conformidade numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cl_exec_equip ON public.checklist_execucoes(equipamento_id);
CREATE INDEX idx_cl_exec_checklist ON public.checklist_execucoes(checklist_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_execucoes TO authenticated;
GRANT ALL ON public.checklist_execucoes TO service_role;
ALTER TABLE public.checklist_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_exec_read" ON public.checklist_execucoes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "cl_exec_insert" ON public.checklist_execucoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cl_exec_update" ON public.checklist_execucoes FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
  WITH CHECK (usuario_id = auth.uid() OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE POLICY "cl_exec_delete" ON public.checklist_execucoes FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));
CREATE TRIGGER trg_cl_exec_updated BEFORE UPDATE ON public.checklist_execucoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.checklist_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id uuid NOT NULL REFERENCES public.checklist_execucoes(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.checklist_itens(id) ON DELETE SET NULL,
  componente_id uuid REFERENCES public.equipamento_componentes(id) ON DELETE SET NULL,
  componente text NOT NULL,
  pergunta text NOT NULL,
  tipo_resposta text NOT NULL DEFAULT 'conformidade',
  valor text,
  conforme boolean,
  gravidade text,
  descricao_problema text,
  foto_url text,
  necessita_manutencao boolean NOT NULL DEFAULT false,
  observacao text,
  os_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cl_resp_exec ON public.checklist_respostas(execucao_id);
CREATE INDEX idx_cl_resp_comp ON public.checklist_respostas(componente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_respostas TO authenticated;
GRANT ALL ON public.checklist_respostas TO service_role;
ALTER TABLE public.checklist_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_resp_read" ON public.checklist_respostas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "cl_resp_insert" ON public.checklist_respostas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cl_resp_update" ON public.checklist_respostas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cl_resp_delete" ON public.checklist_respostas FOR DELETE TO authenticated
  USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));