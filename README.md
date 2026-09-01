# Maintain Hub

Crie um sistema completo de controle de manutenção chamado Manutenção Xica da Silva, com interface simples, profissional, responsiva e fácil de usar pelo celular e computador.

1. Objetivo do sistema

O sistema deverá controlar:

Equipamentos e instalações;

Ordens de Serviço — OS;

Manutenções corretivas e preventivas;

Responsáveis pelos setores;

Técnicos de manutenção;

Prioridades e níveis de urgência;

Custos de cada manutenção;

Peças, materiais e serviços utilizados;

Histórico completo dos equipamentos;

Prazos, atrasos e notificações;

Soluções aplicadas em cada manutenção;

Relatórios gerenciais.

Todas as configurações deverão ser personalizáveis pelo administrador.

2. Perfis de usuário

Criar os seguintes níveis de acesso:

Administrador

Pode:

Cadastrar, editar, ativar e desativar usuários;

Adicionar ou retirar equipamentos;

Cadastrar setores e locais;

Alterar responsáveis;

Personalizar status;

Personalizar níveis de urgência;

Configurar notificações;

Consultar todas as OS;

Consultar custos e relatórios;

Reabrir ou cancelar uma OS;

Editar configurações gerais.

Responsável pelo setor

Pode:

Abrir uma nova OS;

Selecionar o equipamento;

Informar o problema;

Definir o nível de urgência;

Adicionar fotos, vídeos ou documentos;

Acompanhar o andamento;

Responder perguntas do técnico;

Confirmar se o problema foi resolvido;

Avaliar a manutenção realizada.

Técnico de manutenção

Pode:

Visualizar as OS direcionadas para ele;

Receber notificações conforme a urgência;

Confirmar o recebimento da OS;

Alterar o status;

Adicionar comentários e fotos;

Registrar diagnóstico;

Registrar materiais e peças utilizados;

Adicionar custos;

Informar a solução aplicada;

Finalizar a OS.

Gestor ou financeiro

Pode:

Consultar todas as OS;

Visualizar custos;

Consultar relatórios;

Filtrar gastos por período, setor, equipamento, técnico ou fornecedor;

Exportar relatórios.

3. Cadastro de equipamentos

Criar uma área de cadastro de equipamentos contendo:

Nome do equipamento;

Código ou número de patrimônio;

Categoria;

Marca;

Modelo;

Número de série;

Setor;

Localização;

Data de aquisição;

Data de instalação;

Fornecedor;

Garantia;

Manual do equipamento;

Fotos;

Responsável pelo equipamento;

Técnico responsável;

Frequência de manutenção preventiva;

Data da próxima manutenção;

Situação: ativo, inativo, em manutenção ou descartado;

Observações.

O administrador deve poder adicionar, editar, desativar, excluir ou transferir um equipamento para outro setor.

Cada equipamento deverá possuir uma página própria com seu histórico completo de manutenção.

4. Setores e locais

Permitir o cadastro personalizado de setores e unidades, por exemplo:

Restaurante;

Cozinha;

Pousada;

Escritório Xica;

Casa;

Almoxarifado;

Área externa;

Outros locais adicionados pelo administrador.

Cada setor poderá ter um responsável principal e responsáveis substitutos.

5. Abertura de Ordem de Serviço

Ao abrir uma OS, solicitar obrigatoriamente:

Número automático da OS;

Data e hora da abertura;

Usuário solicitante;

Setor;

Local;

Equipamento relacionado;

Categoria do problema;

Título resumido;

Descrição detalhada do problema;

Fotos ou vídeos;

Nível de urgência;

Data desejada para atendimento;

Informação se o equipamento está parado;

Informação sobre risco para pessoas, alimentos, operação ou patrimônio.

Permitir abrir uma OS mesmo quando o equipamento ainda não estiver cadastrado. Nesse caso, mostrar a opção “Equipamento não cadastrado” e solicitar nome e localização.

6. Níveis de urgência

Criar inicialmente três níveis de urgência, permitindo que o administrador altere os nomes, cores, prazos e regras.

Não urgente

A OS entra normalmente na fila de atendimento;

Aparece no painel do técnico;

Não precisa tocar o celular imediatamente;

Pode gerar um lembrete dentro do sistema;

Deve ter prazo configurável.

Urgente

Enviar notificação imediata para o técnico responsável;

Exibir alerta visual destacado;

Emitir alerta sonoro quando permitido pelo dispositivo;

Solicitar confirmação de recebimento;

Caso o técnico não confirme dentro do prazo configurado, avisar o administrador ou técnico substituto.

Extremamente urgente

Enviar notificação imediata e prioritária;

Emitir alerta sonoro no celular quando houver permissão;

Repetir o alerta até que alguém confirme o recebimento;

Notificar técnico principal, técnico substituto e administrador;

Exibir a OS no topo da tela;

Mostrar um cronômetro com o tempo desde a abertura;

Registrar quem recebeu e em qual horário.

As notificações deverão funcionar no sistema, por push notification e, quando possível, como aplicativo PWA instalado no celular. Solicitar ao usuário autorização para receber notificações e sons.

7. Fluxo da Ordem de Serviço

Criar os seguintes status iniciais:

Aberta;

Aguardando confirmação;

Recebida;

Em análise;

Em andamento;

Aguardando material;

Aguardando fornecedor;

Aguardando aprovação;

Pausada;

Concluída;

Cancelada;

Reaberta.

O administrador deverá conseguir criar, editar, ordenar, ativar ou desativar status.

Registrar automaticamente a data, a hora e o usuário responsável por cada alteração.

Manter uma linha do tempo completa dentro da OS.

8. Atendimento da OS

Quando o técnico abrir a OS, ele deverá poder:

Confirmar o recebimento;

Informar uma previsão de atendimento;

Registrar o diagnóstico;

Informar a possível causa;

Inserir comentários;

Fazer perguntas ao solicitante;

Adicionar fotos antes da manutenção;

Registrar início e pausa do serviço;

Informar o tempo trabalhado;

Solicitar materiais;

Encaminhar para outro técnico;

Solicitar apoio de fornecedor externo;

Alterar o nível de urgência, desde que informe o motivo.

9. Controle de custos da OS

Cada OS deverá possuir uma aba chamada Custos da manutenção.

Permitir adicionar quantos lançamentos forem necessários.

Cada lançamento deverá conter:

Tipo do custo: peça, material, mão de obra, serviço externo, transporte ou outro;

Descrição do que foi comprado ou utilizado;

Quantidade;

Unidade de medida;

Valor unitário;

Valor total calculado automaticamente;

Fornecedor;

Data da compra;

Forma de pagamento;

Número da nota ou comprovante;

Foto ou arquivo do comprovante;

Usuário que registrou o custo;

Observação.

Mostrar automaticamente:

Total de peças;

Total de materiais;

Total de serviços externos;

Total de mão de obra;

Custo total da OS.

Permitir registrar itens retirados do estoque com custo zero ou com o valor médio do estoque.

Caso exista integração futura com estoque ou financeiro, deixar a estrutura preparada para essa integração.

10. Finalização obrigatória da OS

A OS não poderá ser finalizada sem o preenchimento dos seguintes campos:

Diagnóstico final;

Causa identificada;

Correção realizada;

Solução aplicada;

Peças e materiais utilizados;

Testes realizados;

Resultado dos testes;

Situação final do equipamento;

Data e hora da conclusão;

Tempo total de atendimento;

Tempo total do equipamento parado;

Custo total;

Nome do técnico responsável;

Fotos depois da manutenção;

Recomendações futuras.

Ao clicar em “Finalizar OS”, mostrar uma confirmação com a pergunta:

“Qual foi a correção realizada e qual solução foi aplicada?”

Depois da finalização, enviar uma solicitação para o responsável pelo setor confirmar:

Problema resolvido;

Problema parcialmente resolvido;

Problema não resolvido.

Caso o problema não tenha sido resolvido, permitir reabrir a mesma OS, mantendo todo o histórico anterior.

11. Manutenção preventiva

Criar uma área separada para manutenção preventiva.

A frequência deve ser totalmente personalizável:

Diária;

Semanal;

Quinzenal;

Mensal;

Trimestral;

Semestral;

Anual;

Por quantidade de horas;

Por quantidade de utilização;

Data personalizada.

Não obrigar check-ups diários.

Permitir configurar, por exemplo:

Coifa: inspeção semanal ou conforme configuração;

Câmara fria: inspeção semanal ou conforme configuração;

Ar-condicionado: frequência mensal ou trimestral;

Equipamentos específicos: frequência definida individualmente.

Cada plano preventivo deverá conter:

Equipamento;

Atividade que deverá ser realizada;

Lista de verificação;

Frequência;

Responsável;

Data da última manutenção;

Próxima manutenção;

Prazo;

Materiais necessários;

Tempo estimado;

Observações.

Ao chegar a data programada, gerar automaticamente uma OS preventiva.

12. Checklist personalizável

Permitir criar modelos de checklist por equipamento ou categoria.

O administrador poderá:

Criar perguntas;

Definir respostas como sim, não ou não se aplica;

Solicitar foto;

Tornar uma pergunta obrigatória;

Adicionar campos de texto ou números;

Alterar a frequência;

Copiar um checklist para outro equipamento.

O checklist não deverá ser obrigatório para todos os equipamentos. Cada equipamento poderá ter sua própria configuração.

13. Painel principal

Criar um dashboard com:

Total de OS abertas;

OS urgentes;

OS extremamente urgentes;

OS em andamento;

OS atrasadas;

OS aguardando material;

OS concluídas no mês;

Manutenções preventivas próximas;

Custo total no mês;

Equipamentos com mais problemas;

Setores com mais chamados;

Tempo médio de atendimento;

Tempo médio de conclusão.

Mostrar gráficos e indicadores visuais.

14. Filtros e pesquisas

Permitir pesquisar e filtrar por:

Número da OS;

Equipamento;

Setor;

Local;

Solicitante;

Técnico;

Status;

Urgência;

Tipo de manutenção;

Categoria do problema;

Período;

Custo;

OS atrasadas;

OS concluídas;

Fornecedor.

15. Relatórios

Criar relatórios de:

Custos por mês;

Custos por equipamento;

Custos por setor;

Custos por categoria;

Custos por fornecedor;

Custos por técnico;

Equipamentos com falhas recorrentes;

Problemas mais frequentes;

Tempo médio de resposta;

Tempo médio de solução;

OS abertas, concluídas e atrasadas;

Manutenções preventivas realizadas;

Manutenções preventivas vencidas;

Equipamentos parados;

Histórico completo por equipamento.

Permitir exportar os relatórios em PDF, Excel ou CSV.

16. Fornecedores e técnicos externos

Criar cadastro de fornecedores contendo:

Nome ou razão social;

CPF ou CNPJ;

Telefone;

E-mail;

Especialidade;

Equipamentos atendidos;

Pessoa de contato;

Prazo médio de atendimento;

Documentos;

Observações;

Histórico de serviços;

Total gasto com o fornecedor.

17. Comentários e comunicação

Cada OS deverá possuir uma área de comunicação em formato de conversa.

Permitir:

Comentários;

Menções a usuários;

Fotos;

Vídeos;

Documentos;

Mensagens internas;

Mensagens visíveis para o solicitante.

Registrar data, hora e autor de cada mensagem.

18. Auditoria e segurança

Registrar em um histórico de auditoria:

Quem criou a OS;

Quem alterou informações;

Quem mudou o status;

Quem alterou a urgência;

Quem adicionou ou excluiu custos;

Quem finalizou;

Quem reabriu;

Data e hora de cada ação.

Não excluir definitivamente informações importantes. Utilizar desativação ou exclusão lógica sempre que possível.

19. Interface

A interface deverá ser:

Responsiva para computador, tablet e celular;

Simples e intuitiva;

Com botões grandes para uso no celular;

Com cores diferentes para cada urgência;

Com pesquisa rápida;

Com menu lateral;

Com modo claro e escuro;

Com confirmação antes de ações importantes;

Com formulários divididos em etapas para não ficarem cansativos.

Usar os seguintes destaques:

Não urgente: neutro;

Urgente: laranja;

Extremamente urgente: vermelho;

Concluída: verde;

Atrasada: vermelho ou destaque de atenção.

20. Tecnologia e banco de dados

Utilizar banco de dados estruturado e autenticação segura.

Preparar o sistema para usar Supabase ou banco equivalente, contendo:

Autenticação de usuários;

Controle de permissões por perfil;

Banco de dados relacional;

Armazenamento de fotos e documentos;

Atualizações em tempo real;

Notificações;

Registro de auditoria;

Backup das informações.

Criar dados de demonstração para que todas as telas possam ser testadas.

21. Regras importantes

Todo equipamento, setor, responsável, técnico, status, urgência, categoria e frequência deverá ser personalizável;

Nenhuma OS concluída poderá perder seu histórico;

Custos deverão ser vinculados à OS correspondente;

O valor total deverá ser calculado automaticamente;

A solução aplicada deverá ser obrigatória na conclusão;

OS urgentes deverão solicitar confirmação do técnico;

OS extremamente urgentes deverão ter escalação automática;

Manutenções preventivas deverão gerar alertas antes do vencimento;

O administrador poderá alterar prazos e regras de notificação;

O sistema deverá informar claramente quando uma OS estiver atrasada;

Todos os anexos deverão ficar associados à OS ou ao equipamento correspondente.

Comece criando o banco de dados, os perfis de acesso e as principais telas. Depois implemente o fluxo completo de abertura, atendimento, custos e finalização da Ordem de Serviço. Não crie apenas um protótipo visual: todas as telas, botões, formulários, filtros e ações deverão estar funcionais e integrados ao banco de dados.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gxmanut.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/51278692-a19c-4686-9c50-fcc040b7dbed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
