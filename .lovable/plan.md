# Sincronizar OS abertas e conclusão técnica

## Objetivo
Garantir que o painel conte exatamente as ordens abertas que o usuário consegue ver na listagem e que o botão **Concluir OS** finalize a ordem imediatamente.

## Alterações
1. Centralizar a regra de “OS aberta” usando o indicador final do status e a data de conclusão.
2. Aplicar essa mesma regra ao contador do painel e à listagem padrão de OS abertas.
3. Atualizar a conclusão por uma operação autenticada única que:
   - valida o perfil de Técnico de Manutenção;
   - localiza o status final **Concluída**;
   - salva os dados da execução;
   - define o status e a data/hora de conclusão;
   - registra o usuário responsável no histórico.
4. Após concluir, atualizar imediatamente os dados da OS, a listagem, o painel, o histórico e as notificações em cache.
5. Manter o encerramento de alertas e notificações da OS já existente.

## Validação
- Comparar o contador do painel com a quantidade de OS abertas exibidas pela mesma regra.
- Concluir uma OS como Técnico de Manutenção e confirmar status, retirada das abertas, atualização dos contadores e registro no histórico.
