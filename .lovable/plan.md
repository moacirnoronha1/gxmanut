
# Manutenção Xica da Silva — Plano de Implementação

Sistema completo de controle de manutenção (CMMS) com OS, equipamentos, preventivas, custos, relatórios e notificações. Escopo grande — vou entregar em fases funcionais, cada uma integrada ao banco desde o início (sem protótipos visuais soltos).

## Stack

- TanStack Start + React + Tailwind v4 + shadcn
- **Lovable Cloud** (Supabase gerenciado): auth, Postgres, storage, realtime
- RLS + tabela `user_roles` (admin, gestor, responsavel, tecnico)
- PWA para notificações push no celular (fase posterior)

## Fase 1 — Fundação (esta entrega)

**Backend**
1. Ativar Lovable Cloud
2. Migração inicial:
   - Enum `app_role` (admin, gestor, responsavel, tecnico)
   - `profiles`, `user_roles` + função `has_role`
   - `setores`, `equipamentos`, `categorias_problema`
   - `urgencias` (configurável: nome, cor, prazo, regras de escalação)
   - `status_os` (configurável, ordenável)
   - `fornecedores`
   - `ordens_servico` (com todos os campos: solicitante, equipamento, urgência, descrição, datas, etc.)
   - `os_custos`, `os_comentarios`, `os_anexos`, `os_historico` (auditoria), `os_checklist_respostas`
   - `planos_preventivos`, `checklists`, `checklist_itens`
   - RLS por role em todas as tabelas + GRANTs
   - Trigger auto-criação de profile no signup
   - Trigger auditoria em OS
3. Bucket storage `os-anexos` (privado)
4. Seed com dados de demonstração (setores da Xica, equipamentos exemplo, urgências padrão, status padrão, usuários demo)

**Frontend**
5. Auth: login/signup em `/auth`, layout `_authenticated` (gerenciado)
6. Layout principal com menu lateral (Dashboard, OS, Equipamentos, Preventivas, Setores, Fornecedores, Usuários, Relatórios, Configurações), modo claro/escuro, responsivo mobile
7. Design system: cores semânticas por urgência (neutro/laranja/vermelho/verde)
8. Dashboard com contadores principais e gráficos

**Fluxo de OS completo**
9. Listagem de OS com filtros (status, urgência, setor, técnico, período, busca)
10. Abertura de OS (formulário em etapas, upload de fotos/vídeos, opção "equipamento não cadastrado")
11. Página de detalhes da OS: linha do tempo, comentários (chat), anexos, mudança de status, atribuição de técnico
12. Aba **Custos**: lançamentos múltiplos com totalizadores automáticos
13. Fluxo do técnico: confirmar recebimento, diagnóstico, materiais, solução
14. **Finalização obrigatória**: validação de todos os campos exigidos (diagnóstico, causa, correção, solução, testes, tempos, custo, fotos depois)
15. Confirmação do solicitante (resolvido/parcial/não) + reabertura preservando histórico

**Equipamentos & Setores**
16. CRUD de setores (com responsáveis)
17. CRUD de equipamentos com todos os campos + página individual com histórico completo de OS

## Fase 2 — Preventivas, Checklists, Relatórios (próxima iteração)

- Planos preventivos com todas as frequências, geração automática de OS
- Checklists personalizáveis por equipamento/categoria
- Relatórios com exportação PDF/Excel/CSV
- Cadastro completo de fornecedores + histórico de gastos

## Fase 3 — Notificações & PWA

- Push notifications (web push + service worker de mensagens)
- Escalação automática de urgentes/extremamente urgentes
- Cronômetro e alertas sonoros
- Instalável como PWA

## Fase 4 — Refinamentos

- Administração completa: personalizar status, urgências, categorias, prazos
- Painel de auditoria
- Filtros avançados e busca global
- Dashboards com gráficos avançados

## Detalhes técnicos

- Server functions (`createServerFn` + `requireSupabaseAuth`) para operações sensíveis
- Queries com TanStack Query + `useSuspenseQuery` no padrão do template
- RLS: admin vê tudo; responsável vê OS do seu setor; técnico vê OS atribuídas a ele; gestor lê tudo mas não modifica OS
- Auditoria via trigger Postgres em `ordens_servico` e `os_custos`
- Todos os textos em português (pt-BR)

## Perguntas antes de começar

1. **Login demo**: crio usuários de teste (admin@xica, tecnico@xica, etc. com senha padrão) para você testar imediatamente? Sim/Não
2. **Escopo desta entrega**: confirma que a Fase 1 acima é o que devo entregar agora (fundação + OS ponta-a-ponta + equipamentos/setores), e depois seguimos com Fase 2 em nova mensagem? Ou prefere que eu tente comprimir mais fases numa entrega só (fica mais superficial)?

Se aprovar sem responder, sigo com Fase 1 completa + usuários demo.
