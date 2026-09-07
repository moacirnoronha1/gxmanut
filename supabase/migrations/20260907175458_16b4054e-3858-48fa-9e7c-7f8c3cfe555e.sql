ALTER TABLE public.notificacao_config
  ADD COLUMN IF NOT EXISTS notificar_conclusao BOOLEAN NOT NULL DEFAULT false;