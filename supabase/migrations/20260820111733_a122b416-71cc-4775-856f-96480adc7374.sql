DELETE FROM public.os_custo_evidencias;
DELETE FROM public.os_custos;
DELETE FROM public.os_comentarios;
DELETE FROM public.os_anexos;
DELETE FROM public.os_historico;
UPDATE public.mp_execucoes SET os_id = NULL, os_corretiva_id = NULL;
DELETE FROM public.ordens_servico;
SELECT setval(pg_get_serial_sequence('public.ordens_servico','numero'), 1, false);