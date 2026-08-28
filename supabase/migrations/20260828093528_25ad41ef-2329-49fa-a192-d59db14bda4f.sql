GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ordens_servico TO authenticated;
GRANT ALL ON TABLE public.ordens_servico TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.os_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.os_numero_seq TO service_role;

DROP POLICY IF EXISTS "Autenticados criam OS" ON public.ordens_servico;
CREATE POLICY "Autenticados criam OS"
ON public.ordens_servico
FOR INSERT
TO authenticated
WITH CHECK (
  solicitante_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.ativo = true
      AND p.bloqueado = false
  )
);