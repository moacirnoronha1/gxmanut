UPDATE public.ordens_servico o
SET status_id = s.id
FROM LATERAL (
  SELECT id FROM public.status_os
  WHERE ativo = true AND is_final = true AND lower(nome) IN ('concluída', 'concluida')
  ORDER BY ordem LIMIT 1
) s
WHERE o.concluida_em IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.status_os atual
    WHERE atual.id = o.status_id AND atual.is_final = true
  );