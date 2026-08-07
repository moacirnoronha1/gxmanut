DELETE FROM public.os_historico WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo LIKE 'ZZTESTE%');
DELETE FROM public.os_custos WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo LIKE 'ZZTESTE%');
DELETE FROM public.os_comentarios WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo LIKE 'ZZTESTE%');
DELETE FROM public.os_anexos WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo LIKE 'ZZTESTE%');
DELETE FROM public.ordens_servico WHERE titulo LIKE 'ZZTESTE%';
DELETE FROM public.equipamentos WHERE nome LIKE 'ZZTESTE%';
DELETE FROM public.setores WHERE nome LIKE 'ZZTESTE%';
DELETE FROM public.fornecedores WHERE nome LIKE 'ZZTESTE%';