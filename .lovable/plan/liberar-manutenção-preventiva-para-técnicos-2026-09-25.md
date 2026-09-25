# Liberar manutenção preventiva para Técnicos

## Objetivo
Permitir que usuários com perfil **Técnico de Manutenção** criem e gerenciem manutenções preventivas sem aprovação prévia, mantendo o Usuário Mestre MOACIR com controle total.

## Alterações
1. Atualizar as regras de acesso do banco para que Técnicos ativos e não bloqueados possam:
   - criar e editar planos preventivos;
   - configurar lembretes;
   - reagendar;
   - iniciar, salvar e concluir execuções;
   - criar ou vincular checklists.
2. Manter ações administrativas exclusivas do Usuário Mestre, incluindo exclusão definitiva e correções sem restrição.
3. Registrar automaticamente o usuário, a data e a hora em cada criação ou alteração relevante, incluindo plano, reagendamento e execução.
4. Completar a tela de detalhes com edição do plano preventivo e vínculo/criação de checklist, preservando os campos existentes.
5. Garantir que a interface mostre as ações ao Técnico e que os dados sejam atualizados imediatamente após salvar, reagendar ou concluir.

## Regras de segurança
- O usuário gravado na auditoria será sempre obtido da sessão autenticada, nunca de um identificador enviado pela tela.
- Técnicos poderão gerenciar manutenção preventiva, mas não receberão poderes gerais de Usuário Mestre.
- Exclusão definitiva e controle administrativo continuarão reservados a MOACIR.

## Validação
- Entrar como Técnico e testar cadastro, edição, reagendamento, início, salvamento e conclusão.
- Confirmar no histórico o usuário, a data e a hora de cada ação.
- Confirmar que MOACIR continua podendo editar, suspender, excluir e corrigir qualquer manutenção.
