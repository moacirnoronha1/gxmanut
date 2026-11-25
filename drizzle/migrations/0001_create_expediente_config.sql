CREATE TABLE public.expediente_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ativo BOOLEAN NOT NULL DEFAULT true,
  hora_inicio TIME NOT NULL DEFAULT '06:00:00',
  hora_fim TIME NOT NULL DEFAULT '22:00:00',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  mensagem TEXT NOT NULL DEFAULT 'O sistema está bloqueado fora do horário de expediente. Retorne durante o horário de funcionamento ou acione o Usuário Mestre em caso de emergência.',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.expediente_config (id, ativo, hora_inicio, hora_fim, timezone)
VALUES (1, true, '06:00:00', '22:00:00', 'America/Sao_Paulo')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, UPDATE ON public.expediente_config TO authenticated;
GRANT ALL ON public.expediente_config TO service_role;

ALTER TABLE public.expediente_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ativos leem configuracao de expediente"
ON public.expediente_config
FOR SELECT
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.ativo = true
  )
);

CREATE POLICY "Mestre atualiza configuracao de expediente"
ON public.expediente_config
FOR UPDATE
TO authenticated
USING (private.is_mestre(auth.uid()))
WITH CHECK (private.is_mestre(auth.uid()));