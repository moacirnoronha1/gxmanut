
-- 1. Categorias de custo configuráveis
CREATE TABLE IF NOT EXISTS public.custo_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL DEFAULT 'outro'
    CHECK (grupo IN ('peca','material','mao_obra_interna','mao_obra_externa','servico_terceiro','transporte','locacao','ferramenta','taxa','outro')),
  natureza_padrao TEXT NOT NULL DEFAULT 'desembolso' CHECK (natureza_padrao IN ('desembolso','interno')),
  ordem INTEGER NOT NULL DEFAULT 100,
  sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS custo_categorias_nome_uniq ON public.custo_categorias (lower(nome));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custo_categorias TO authenticated;
GRANT ALL ON public.custo_categorias TO service_role;
ALTER TABLE public.custo_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios com papel leem categorias de custo" ON public.custo_categorias;
CREATE POLICY "Usuarios com papel leem categorias de custo" ON public.custo_categorias
  FOR SELECT TO authenticated USING (
    private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(),'tecnico'::app_role) OR private.has_role(auth.uid(),'responsavel'::app_role)
  );
DROP POLICY IF EXISTS "Admin gerencia categorias de custo" ON public.custo_categorias;
CREATE POLICY "Admin gerencia categorias de custo" ON public.custo_categorias
  FOR ALL TO authenticated USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_custo_categorias_updated ON public.custo_categorias;
CREATE TRIGGER trg_custo_categorias_updated BEFORE UPDATE ON public.custo_categorias
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.custo_categorias (nome, grupo, natureza_padrao, ordem, sistema) VALUES
  ('Peças','peca','desembolso',10,true),
  ('Componentes','peca','desembolso',11,true),
  ('Materiais','material','desembolso',20,true),
  ('Insumos','material','desembolso',21,true),
  ('Produtos de limpeza/manutenção','material','desembolso',22,true),
  ('Material elétrico','material','desembolso',23,true),
  ('Material hidráulico','material','desembolso',24,true),
  ('Ferragens','material','desembolso',25,true),
  ('Ferramentas compradas','ferramenta','desembolso',30,true),
  ('Mão de obra interna','mao_obra_interna','interno',40,true),
  ('Mão de obra externa','mao_obra_externa','desembolso',41,true),
  ('Técnico terceirizado','servico_terceiro','desembolso',50,true),
  ('Empresa especializada','servico_terceiro','desembolso',51,true),
  ('Serviço de solda','servico_terceiro','desembolso',52,true),
  ('Serviço elétrico','servico_terceiro','desembolso',53,true),
  ('Serviço hidráulico','servico_terceiro','desembolso',54,true),
  ('Refrigeração','servico_terceiro','desembolso',55,true),
  ('Pintura','servico_terceiro','desembolso',56,true),
  ('Marcenaria','servico_terceiro','desembolso',57,true),
  ('Obras','servico_terceiro','desembolso',58,true),
  ('Frete','transporte','desembolso',60,true),
  ('Transporte','transporte','desembolso',61,true),
  ('Deslocamento','transporte','desembolso',62,true),
  ('Locação de equipamento','locacao','desembolso',70,true),
  ('Taxas','taxa','desembolso',80,true),
  ('Outros gastos','outro','desembolso',90,true)
ON CONFLICT DO NOTHING;

-- 2. Campos detalhados no lançamento de custo
ALTER TABLE public.os_custos DROP CONSTRAINT IF EXISTS os_custos_tipo_check;
ALTER TABLE public.os_custos
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.custo_categorias(id),
  ADD COLUMN IF NOT EXISTS equipamento_id UUID REFERENCES public.equipamentos(id),
  ADD COLUMN IF NOT EXISTS natureza TEXT NOT NULL DEFAULT 'desembolso',
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'compra',
  ADD COLUMN IF NOT EXISTS comprovacao TEXT NOT NULL DEFAULT 'sem_comprovante',
  ADD COLUMN IF NOT EXISTS previsto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prestador TEXT,
  ADD COLUMN IF NOT EXISTS tecnico_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS comprador_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS hora_inicio TIME,
  ADD COLUMN IF NOT EXISTS hora_fim TIME;

ALTER TABLE public.os_custos DROP CONSTRAINT IF EXISTS os_custos_natureza_check;
ALTER TABLE public.os_custos ADD CONSTRAINT os_custos_natureza_check CHECK (natureza IN ('desembolso','interno'));
ALTER TABLE public.os_custos DROP CONSTRAINT IF EXISTS os_custos_origem_check;
ALTER TABLE public.os_custos ADD CONSTRAINT os_custos_origem_check CHECK (origem IN ('compra','estoque','mao_obra_interna','servico_externo','outro'));
ALTER TABLE public.os_custos DROP CONSTRAINT IF EXISTS os_custos_comprovacao_check;
ALTER TABLE public.os_custos ADD CONSTRAINT os_custos_comprovacao_check CHECK (comprovacao IN ('com_comprovante','sem_comprovante','pendente','em_conferencia','conferido','divergente'));

CREATE INDEX IF NOT EXISTS os_custos_equipamento_idx ON public.os_custos(equipamento_id);
CREATE INDEX IF NOT EXISTS os_custos_categoria_idx ON public.os_custos(categoria_id);

-- 3. Evidências do custo
CREATE TABLE IF NOT EXISTS public.os_custo_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_id UUID NOT NULL REFERENCES public.os_custos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'outro',
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  observacao TEXT,
  autor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_custo_evidencias TO authenticated;
GRANT ALL ON public.os_custo_evidencias TO service_role;
ALTER TABLE public.os_custo_evidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver evidencias conforme OS" ON public.os_custo_evidencias;
CREATE POLICY "Ver evidencias conforme OS" ON public.os_custo_evidencias FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.os_custos c WHERE c.id = custo_id AND private.pode_ver_os(auth.uid(), c.os_id)));
DROP POLICY IF EXISTS "Criar evidencias conforme OS" ON public.os_custo_evidencias;
CREATE POLICY "Criar evidencias conforme OS" ON public.os_custo_evidencias FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.os_custos c WHERE c.id = custo_id AND private.pode_ver_os(auth.uid(), c.os_id)));
DROP POLICY IF EXISTS "Apagar evidencias" ON public.os_custo_evidencias;
CREATE POLICY "Apagar evidencias" ON public.os_custo_evidencias FOR DELETE TO authenticated
  USING (private.is_admin(auth.uid()) OR autor_id = auth.uid());

-- 4. Valor de aquisição do equipamento
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS valor_aquisicao NUMERIC;
