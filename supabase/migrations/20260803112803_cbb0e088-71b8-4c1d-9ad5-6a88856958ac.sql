DELETE FROM public.os_custos WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo IN ('Teste vazamento pia','Teste ciclo completo'));
DELETE FROM public.os_comentarios WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo IN ('Teste vazamento pia','Teste ciclo completo'));
DELETE FROM public.os_anexos WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo IN ('Teste vazamento pia','Teste ciclo completo'));
DELETE FROM public.os_historico WHERE os_id IN (SELECT id FROM public.ordens_servico WHERE titulo IN ('Teste vazamento pia','Teste ciclo completo'));
DELETE FROM public.ordens_servico WHERE titulo IN ('Teste vazamento pia','Teste ciclo completo');
DELETE FROM public.equipamentos WHERE nome = 'Fogao Industrial';
DELETE FROM public.fornecedores WHERE nome = 'Fornecedor Teste';
DELETE FROM public.setores WHERE nome = 'Cozinha Teste';