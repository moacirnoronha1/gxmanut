CREATE TABLE public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Dispositivo',
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_envio_em TIMESTAMPTZ,
  ultimo_teste_em TIMESTAMPTZ,
  ultima_confirmacao_em TIMESTAMPTZ,
  ultimo_erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices proprios" ON public.push_devices FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.is_mestre(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_mestre(auth.uid()));

CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'normal',
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  url TEXT,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  manutencao_id UUID REFERENCES public.manutencoes_periodicas(id) ON DELETE CASCADE,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  lida_em TIMESTAMPTZ,
  confirmada_em TIMESTAMPTZ,
  resolvida_em TIMESTAMPTZ,
  tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_envio_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notificacoes_user ON public.notificacoes(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes proprias" ON public.notificacoes FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.is_mestre(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_mestre(auth.uid()));

CREATE TABLE public.notificacao_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id UUID REFERENCES public.notificacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL,
  tentativa INTEGER NOT NULL DEFAULT 1,
  http_status INTEGER,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_envios_user ON public.notificacao_envios(user_id, created_at DESC);
GRANT SELECT ON public.notificacao_envios TO authenticated;
GRANT ALL ON public.notificacao_envios TO service_role;
ALTER TABLE public.notificacao_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "envios visiveis" ON public.notificacao_envios FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_mestre(auth.uid()));

CREATE TABLE public.notificacao_preferencias (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipos JSONB NOT NULL DEFAULT '{}'::jsonb,
  silencio_ativo BOOLEAN NOT NULL DEFAULT false,
  silencio_inicio TIME NOT NULL DEFAULT '22:00',
  silencio_fim TIME NOT NULL DEFAULT '07:00',
  som_urgente BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notificacao_preferencias TO authenticated;
GRANT ALL ON public.notificacao_preferencias TO service_role;
ALTER TABLE public.notificacao_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs proprias" ON public.notificacao_preferencias FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.is_mestre(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_mestre(auth.uid()));

CREATE TABLE public.notificacao_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  urgente_reforco_min INTEGER NOT NULL DEFAULT 10,
  urgente_mestre_min INTEGER NOT NULL DEFAULT 20,
  extrema_repeticao_min INTEGER NOT NULL DEFAULT 5,
  mp_atraso_repetir_dias INTEGER NOT NULL DEFAULT 1,
  os_nao_urgente_lembrete_diario BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.notificacao_config (id) VALUES (true);
GRANT SELECT ON public.notificacao_config TO authenticated;
GRANT ALL ON public.notificacao_config TO service_role;
ALTER TABLE public.notificacao_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config leitura" ON public.notificacao_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config mestre" ON public.notificacao_config FOR UPDATE TO authenticated
  USING (private.is_mestre(auth.uid())) WITH CHECK (private.is_mestre(auth.uid()));

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS notificada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assumida_por UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assumida_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalonamento_nivel INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_alerta_em TIMESTAMPTZ;