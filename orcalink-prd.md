# Documento de Requisitos de Produto (PRD) - Orcalink

## 1. Visão Geral do Produto
O **Orcalink** é uma plataforma SaaS (Software as a Service) focada na centralização, automação e análise de cotações e orçamentos comerciais. O sistema resolve a ineficiência do processo de compras manual (e-mails dispersos, planilhas desencontradas e mensagens soltas no WhatsApp), permitindo que o comprador dispare uma lista de necessidades para múltiplos fornecedores simultaneamente.

### 1.1. O Grande Desafio: A Adesão do Fornecedor
Pesquisas de mercado e feedbacks de usuários apontam que sistemas de cotação frequentemente falham porque os vendedores/fornecedores resistem ao preenchimento de plataformas complexas. Muitas vezes contornam o sistema enviando PDFs, imagens ou áudios diretamente no WhatsApp do comprador.
Para mitigar essa dor crônica, o Orcalink adota uma estratégia de **Fricção Zero** para o fornecedor:
1. **Magic Link:** Sem necessidade de cadastro, login ou download de aplicativo.
2. **Interface Ultra-Simplificada (Poka-yoke):** Desenhada especificamente para dispositivos móveis, operando como uma planilha inteligente que impede erros de digitação e exige carga cognitiva mínima.

---

## 2. Atores do Sistema

### 2.1. Comprador (Usuário Autenticado)
O administrador ou operador do sistema. É responsável por gerenciar os cadastros base (produtos, categorias, fornecedores), abrir cotações, analisar as propostas e tomar a decisão de compra.

### 2.2. Fornecedor (Usuário Convidado)
O vendedor externo. Não possui conta no sistema. Ele interage exclusivamente através do *Magic Link* recebido por e-mail ou link compartilhado para preencher os preços e condições comerciais dos itens solicitados.

### 2.3. Modelo Organizacional (Multi-Tenant)
O sistema opera em modelo multi-tenant, onde cada empresa é um tenant isolado:
* **Tenant (Organização):** Entidade raiz que agrupa todos os dados (produtos, fornecedores, cotações). Cada tenant possui um `tenantId` (UUID) presente em todas as tabelas do sistema, garantindo isolamento lógico em um **único banco de dados compartilhado** — evitando custos com múltiplas instâncias de banco.
* **Usuário ↔ Tenant:** No MVP, cada tenant possui **1 (um) único usuário** com papel de Administrador (acesso total). Em versões futuras, o modelo será expandido para suportar múltiplos usuários por tenant com controle de permissões (RBAC).

---

## 3. Escopo do Produto

### O que o Orcalink É:
* Um centralizador de mapas de cotação B2B/B2C.
* Um automatizador de envio de solicitações via canais digitais (E-mail e link compartilhável).
* Uma ferramenta de comparação visual de orçamentos em tempo real.

### O que o Orcalink NÃO É:
* Um sistema de ERP completo (não faz controle de estoque físico ou faturamento).
* Um gateway de pagamento (não processa a transação financeira entre comprador e fornecedor).
* Um e-commerce público (as cotações são privadas e restritas aos fornecedores convidados).

---

## 4. Roadmap e Faseamento

### P0 — MVP (Lançamento)
| Módulo | Funcionalidades |
|---|---|
| Autenticação | Cadastro/Login via Firebase Auth (E-mail/Senha), Recuperação de senha via Firebase |
| Cadastros | Categorias, Produtos, Fornecedores (CRUDs completos) |
| Cotações | Criação, inclusão de itens, associação de fornecedores, geração de Magic Links |
| Disparo | E-mail transacional + Copiar Link / Compartilhar (sem WhatsApp) |
| Portal do Fornecedor | Interface Mobile-First completa (RF12-RF19) |
| Painel Comparativo | Matriz comparativa com destaque de menor preço, encerramento de cotação |
| Monetização | Plano Free (limitado) + Plano Pro (pago, sem limites operacionais) |

### P1 — Automação (v1.1)
| Módulo | Funcionalidades |
|---|---|
| Disparo WhatsApp | Integração com API de mensageria para disparo automático |
| Perfil da Empresa | Logotipo e dados corporativos no cabeçalho das solicitações |
| Lembretes Automáticos | Reenvio automático configurável para fornecedores que não responderam |
| Importação/Exportação | Importação de produtos via CSV, exportação da matriz para PDF/Excel |
| Notificações | Notificações internas no painel + e-mail ao receber respostas |

### P2 — Escala (v2.0)
| Módulo | Funcionalidades |
|---|---|
| Multi-Usuários | Múltiplos usuários por organização com RBAC (Admin, Operador, Visualizador) |
| Templates de Cotação | Salvar listas de itens frequentes como modelos reutilizáveis |
| Analytics | Histórico de fornecedores, taxa de resposta, competitividade de preços |
| Anexos | Suporte a upload de documentos pelo fornecedor (fichas técnicas, certificados) |
| Internacionalização | Suporte multi-moeda e multi-idioma |

### P3 — Projetos e Obras (v3.0)
| Módulo | Funcionalidades |
|---|---|
| Projetos (Obras) | Criação de projetos para agrupar múltiplas cotações sob um contexto único (ex: "Obra Residencial Centro", "Reforma Galpão Industrial") |
| Visão Consolidada | Dashboard do projeto com resumo financeiro agregado de todas as cotações vinculadas (total orçado, total por categoria, status geral) |
| Painel Comparativo por Projeto | Matriz comparativa consolidada cruzando todos os fornecedores e itens de todas as cotações do projeto |
| Relatório de Projeto | Exportação de relatório unificado do projeto com breakdown por cotação/categoria (PDF/Excel) |

---

## 5. Jornada Principal do Usuário (Core Flow)

```
[Comprador] Cria Cotação (Itens + Qtds)
       │
       ▼
[Comprador] Seleciona Fornecedores ──> Sistema gera Magic Links Únicos
                                                 │
                                                 ▼
[Sistema] Envia E-mail + Comprador copia/compartilha link manualmente
       │
       ▼
[Fornecedor] Abre Magic Link Mobile ──> Preenche Preços/Prazos (Sem Login)
                                                 │
                                                 ▼
[Comprador] Visualiza Painel Comparativo ──> Escolhe Melhor Proposta
```

---

## 6. Requisitos Funcionais (RF)

### 6.1. Módulo de Autenticação e Configurações (Comprador)
* **RF01 - Cadastro e Login:** O comprador deve conseguir criar uma conta na plataforma utilizando **Firebase Authentication** com E-mail/Senha. O cadastro no Firebase dispara a criação automática de uma Organização (tenant) vinculada ao usuário no backend. A verificação de identidade em todas as rotas protegidas é feita via Firebase ID Token verificado pelo Firebase Admin SDK no servidor.
* **RF02 - Recuperação de Senha:** O fluxo de recuperação de senha é gerenciado integralmente pelo **Firebase Authentication** via `sendPasswordResetEmail()` no frontend, sem necessidade de endpoints customizados no backend.
* **RF03 - Perfil da Empresa (P1):** O comprador deve poder configurar os dados da sua empresa (Nome/Razão Social, CNPJ, Telefone, Logotipo) para serem exibidos no cabeçalho das solicitações enviadas aos fornecedores.

### 6.2. Módulo de Gestão de Cadastros (CRUDs)
* **RF04 - Gestão de Categorias:** O sistema deve permitir criar, ler, atualizar e excluir categorias para organização dos produtos (ex: "Construção", "Escritório", "Informática").
* **RF05 - Gestão de Produtos:** O sistema deve permitir o cadastro de produtos contendo: Nome, Descrição, Unidade de Medida (Un, Kg, Litro, Cx), Código Interno (opcional) e vínculo com uma Categoria.
* **RF06 - Gestão de Fornecedores:** O sistema deve permitir o cadastro de fornecedores contendo: Nome Fantasia/Razão Social, CNPJ/CPF, Nome do Contato, E-mail principal, Telefone/WhatsApp (com DDI/DDD) e Categorias atendidas.
* **RF07 - Busca e Filtros:** Todas as listagens (produtos, fornecedores, cotações) devem oferecer busca textual, filtros por categoria/status e paginação.

### 6.3. Módulo de Cotações (Criação e Disparo)
* **RF08 - Criação de Nova Cotação:** O comprador deve poder abrir uma cotação informando um Título (ex: "Suprimentos TI - Q2") e uma Data Limite para resposta. A cotação é criada no estado **Rascunho**.
* **RF09 - Máquina de Estados da Cotação:** Toda cotação possui um ciclo de vida definido:
  * **Rascunho:** Cotação em edição, não visível para fornecedores.
  * **Aberta:** Cotação publicada, Magic Links gerados e ativos, aguardando respostas.
  * **Encerrada:** Cotação finalizada (manual ou por expiração). Magic Links invalidados.
* **RF10 - Inclusão de Itens:** O comprador deve adicionar produtos à cotação, definindo a quantidade desejada para cada um. O sistema deve permitir adicionar observações específicas por item (ex: "Cor preta", "Marca X ou similar").
* **RF11 - Duplicação de Cotação:** O comprador deve poder duplicar uma cotação existente como base para uma nova, preservando a lista de itens e quantidades (comum em compras recorrentes).
* **RF12 - Associação de Fornecedores:** O comprador seleciona quais fornecedores cadastrados receberão aquela cotação específica.
* **RF13 - Geração de Magic Links:** Ao publicar a cotação (transição Rascunho → Aberta), o sistema deve gerar uma URL única, encriptada e temporária para cada fornecedor associado (ex: `https://app.orcalink.com.br/v/{token_unico}`).
* **RF14 - Disparo por E-mail (MVP):** O sistema deve enviar automaticamente um e-mail para cada fornecedor associado, utilizando um template profissional com a identidade do Orcalink, dados do comprador, lista resumida de itens e o botão de acesso ao Magic Link.
* **RF15 - Copiar / Compartilhar Link (MVP):** O comprador deve poder copiar o Magic Link de cada fornecedor para a área de transferência ou utilizar a API nativa de compartilhamento do navegador/dispositivo para enviar manualmente via WhatsApp, Telegram ou qualquer outro canal.
* **RF16 - Status de Resposta por Fornecedor:** No painel da cotação, cada fornecedor deve exibir seu status atual: **Pendente** (link gerado, sem resposta), **Respondido** (proposta enviada) ou **Expirado** (prazo vencido sem resposta).
* **RF17 - Reenvio Manual de Convite:** O comprador pode reenviar o e-mail com o Magic Link para fornecedores com status "Pendente".

### 6.4. Portal do Fornecedor (Interface Magic Link)
* **RF18 - Acesso Direto:** O fornecedor acessa a página de preenchimento clicando no link, sem passar por telas de login ou captcha.
* **RF19 - Interface Mobile-First Unificada:** Todos os itens da cotação devem ser listados em uma única página de rolagem vertical simples. Sem paginações ou passos estruturados (Step-by-step). O cabeçalho exibe os dados da empresa do comprador e o prazo restante.
* **RF20 - Máscara Monetária Automática (Centavos):** Os campos de entrada de preço operam em modo centavos: o valor é inserido como inteiro e formatado automaticamente com separador decimal. Exemplo: digitar `150` exibe `R$ 1,50`; digitar `15000` exibe `R$ 150,00`. A vírgula decimal nunca é digitada manualmente pelo fornecedor, eliminando erros de formatação.
* **RF21 - Teclado Numérico Nativo:** Ao focar no campo de preço, o sistema deve forçar a abertura do teclado numérico do smartphone utilizando `inputmode="numeric"` com `type="text"` (nota: `type="number"` conflita com a máscara monetária e não deve ser utilizado).
* **RF22 - Indicação de Indisponibilidade:** Para cada item, deve haver um botão de alternância (Toggle/Checkbox) claro com o texto **"Não tenho este item"**. Ao ser acionado, o campo de preço desse item é desabilitado e marcado como indisponível.
* **RF23 - Condições Gerais da Proposta:** Ao final da listagem de produtos, o fornecedor deve preencher campos simplificados de fechamento:
  * Prazo de Entrega (em dias úteis).
  * Forma/Condição de Pagamento (Dropdown pré-definido ou texto curto, ex: "Faturado 30 dias", "Pix à vista").
  * Observações Gerais (opcional).
* **RF24 - Auto-Save Local:** O progresso do preenchimento deve ser salvo automaticamente no `localStorage` do navegador a cada alteração de campo. Caso o fornecedor feche o navegador ou perca conexão, ao reabrir o mesmo Magic Link, os dados preenchidos anteriormente são restaurados automaticamente.
* **RF25 - Validação Pré-Envio (Poka-yoke):** O sistema não deve permitir o envio se houver algum item sem preço preenchido E sem a marcação "Não tenho este item". O alerta deve indicar visualmente e de forma amigável qual item ficou pendente (scroll automático até o item problemático).
* **RF26 - Protocolo de Sucesso:** Após clicar em "Enviar Proposta", a tela é bloqueada para edição e exibe uma mensagem clara: *"Proposta enviada com sucesso para [Nome da Empresa do Comprador]!"*.

### 6.5. Painel Comparativo e Decisão (Comprador)
* **RF27 - Matriz Comparativa (Dashboard):** O comprador deve visualizar uma tabela comparativa cross-tab (Matriz), onde as linhas são os produtos e as colunas são os fornecedores que responderam.
* **RF28 - Inteligência de Destaques:** O sistema deve destacar automaticamente:
  * O menor preço unitário de cada item (ex: célula com fundo verde claro).
  * O menor valor total acumulado da cotação (caso o comprador queira fechar tudo com um único fornecedor).
  * Itens marcados como indisponíveis (ex: célula com fundo cinza e ícone "—").
* **RF29 - Encerramento de Cotação:** O comprador pode encerrar manualmente a cotação a qualquer momento. Isso invalida imediatamente todos os Magic Links associados que ainda não foram respondidos e altera o status da cotação para "Encerrada".

### 6.6. Módulo de Projetos / Obras (P3)
* **RF30 - Criação de Projeto:** O comprador deve poder criar um Projeto (Obra) informando: Nome do Projeto (ex: "Obra Residencial Centro"), Descrição (opcional), Cliente/Referência (opcional) e Status (Planejamento, Em Andamento, Concluído, Cancelado). O projeto funciona como um agrupador lógico de cotações relacionadas.
* **RF31 - Vinculação de Cotações a Projeto:** Ao criar ou editar uma cotação, o comprador pode opcionalmente vinculá-la a um Projeto existente. Uma cotação pertence a no máximo um Projeto. Cotações sem projeto continuam funcionando normalmente de forma independente.
* **RF32 - Dashboard do Projeto (Visão Consolidada):** O comprador deve visualizar um painel do projeto contendo:
  * Lista de todas as cotações vinculadas com seus respectivos status (Rascunho, Aberta, Encerrada).
  * Resumo financeiro agregado: valor total orçado (soma dos menores preços de cada cotação), total por categoria e quantidade de fornecedores envolvidos.
  * Barra de progresso indicando quantas cotações já foram respondidas vs. total.
* **RF33 - Painel Comparativo Consolidado por Projeto:** Além da matriz comparativa individual por cotação (RF27), o comprador deve poder visualizar uma matriz consolidada que agrupa todas as cotações do projeto. A visão permite identificar o custo total da obra por fornecedor (quando o mesmo fornecedor participa de múltiplas cotações do projeto) e o custo total geral.
* **RF34 - Listagem e Filtros de Projetos:** O comprador deve ter acesso a uma listagem de todos os seus projetos com filtros por status e busca textual. Cada card/linha exibe: nome, quantidade de cotações vinculadas, valor total estimado e status.
* **RF35 - Relatório Unificado do Projeto:** O comprador deve poder exportar um relatório consolidado do projeto contendo o breakdown por cotação/categoria, fornecedores selecionados, valores individuais e totais. Formatos suportados: PDF e Excel.

---

## 7. Requisitos Não Funcionais (RNF)

* **RNF01 - Arquitetura do Backend:** A API RESTful deve ser desenvolvida em **Node.js** com **TypeScript** utilizando o framework **NestJS**, garantindo modularidade, tipagem estática e escalabilidade.
* **RNF02 - Arquitetura do Frontend:** As interfaces (Painel do Comprador e Portal do Fornecedor) devem ser desenvolvidas como uma Single Page Application (SPA) utilizando **React** com **TypeScript**, compiladas via **Vite** para máxima velocidade de carregamento.
* **RNF03 - Responsividade Extrema:** O Portal do Fornecedor deve ter carregamento ultra-rápido (Time to First Byte < 500ms) e design adaptado para telas pequenas (320px de largura mínima), evitando qualquer rolagem horizontal.
* **RNF04 - Banco de Dados:** Uso de **um único banco de dados PostgreSQL** compartilhado entre todos os tenants, gerenciado via **Prisma ORM** para consistência relacional, migrações versionadas e controle estrito das entidades. O isolamento multi-tenant é implementado no nível da aplicação via coluna `tenantId` (UUID) presente em todas as tabelas de domínio. Toda query deve incluir filtro por `tenantId` obrigatoriamente — implementado via middleware/interceptor global no NestJS para eliminar risco de vazamento de dados entre tenants.
* **RNF05 - Processamento em Fila (Background Jobs):** O envio de e-mails deve ser delegado para um sistema de mensageria/filas (**BullMQ** com **Redis**), garantindo que a API não sofra gargalos ou timeouts.
* **RNF06 - Segurança dos Magic Links:** Os tokens contidos nos links devem ser hashes criptográficos únicos baseados em UUIDv4 combinados com assinatura HMAC utilizando chave secreta da aplicação, com tempo de expiração atrelado à validade da cotação.
* **RNF07 - Segurança de API:** A API deve implementar:
  * **Rate Limiting:** Limites de requisições por IP/token para endpoints públicos (portal do fornecedor) e autenticados (painel do comprador).
  * **CORS:** Configuração restritiva permitindo apenas origens autorizadas.
  * **Headers de Segurança:** Implementação via Helmet (X-Frame-Options, CSP, HSTS, etc.).
  * **Proteção contra enumeração:** Respostas genéricas para Magic Links inválidos (sem distinção entre "não existe" e "expirado").
* **RNF08 - Observabilidade:**
  * **Logging Estruturado:** Logs em formato JSON com níveis (info, warn, error) e correlation IDs por requisição.
  * **Monitoramento de Erros:** Integração com serviço de monitoramento (ex: Sentry) para captura automática de exceções.
  * **Health Checks:** Endpoints `/health` e `/ready` para monitoramento de infraestrutura.
* **RNF09 - Estratégia de Testes:**
  * **Testes Unitários:** Cobertura mínima dos serviços de domínio (cotações, magic links, cálculos).
  * **Testes de Integração:** Validação dos endpoints da API com banco de dados de teste.
  * **Testes E2E (Portal do Fornecedor):** Validação do fluxo completo de preenchimento em viewport mobile.

---

## 8. Regras de Negócio (RN)

* **RN01 - Unicidade de Resposta:** Cada Magic Link permite apenas um envio com sucesso. Uma vez enviado, o link torna-se de "Apenas Leitura", mostrando os dados que o fornecedor preencheu, impossibilitando alterações posteriores (a menos que o comprador reabra a cotação para ele).
* **RN02 - Itens Obrigatórios:** O fornecedor não pode enviar a proposta contendo itens "em branco". Para cada item da lista, ele é obrigado a declarar um valor comercial maior que zero ou marcar a opção "Não tenho este item".
* **RN03 - Expiração por Tempo:** Caso a cotação ultrapasse a data limite configurada pelo comprador, o Magic Link exibirá uma tela informando que o prazo de captação de orçamentos foi encerrado. O sistema deve executar um job periódico para encerrar cotações expiradas automaticamente.
* **RN04 - Isolamento de Dados (Multi-Tenant):** Todas as operações de leitura e escrita no banco de dados devem ser filtradas pelo `tenantId` extraído do token JWT do usuário autenticado. Um interceptor global no NestJS deve injetar o `tenantId` automaticamente em todas as queries. Nenhum dado de um tenant pode ser acessível por outro tenant, sob nenhuma circunstância.
* **RN05 - Limites por Plano:** Os limites são aplicados de acordo com o plano contratado pelo tenant (valores configuráveis):

  | Recurso | Free | Pro |
  |---|---|---|
  | Cotações ativas simultâneas | 5 | Ilimitado |
  | Fornecedores cadastrados | 10 | Ilimitado |
  | Produtos cadastrados | 50 | Ilimitado |
  | Envios de e-mail / mês | 20 | Ilimitado |
  | Funcionalidades P1/P2 | ❌ | ❌ (liberadas conforme roadmap) |

---

## 9. Conformidade e Privacidade (LGPD)

### 9.1. Base Legal para Tratamento de Dados
* **Dados do Comprador (Usuário Autenticado):** Tratados com base no **consentimento** dado ao aceitar os Termos de Uso durante o cadastro na plataforma.
* **Dados do Fornecedor (Usuário Convidado):** Tratados com base no **legítimo interesse** do comprador para fins de realização de cotação comercial. O fornecedor é informado sobre o tratamento de dados na página do Magic Link, antes do preenchimento, com link para a Política de Privacidade do Orcalink.

### 9.2. Política de Retenção
* Dados de cotações encerradas são mantidos por **12 meses** para fins de histórico e auditoria, após os quais são anonimizados automaticamente.
* O comprador pode excluir dados de fornecedores manualmente a qualquer momento via painel de gestão.

### 9.3. Direitos do Titular
* O fornecedor pode solicitar a exclusão ou exportação dos seus dados pessoais através de canal de atendimento informado na Política de Privacidade.
* O comprador (controlador dos dados dentro do seu tenant) é responsável pela legalidade do uso dos dados de fornecedores que cadastra.

### 9.4. Termos de Uso
* O comprador deve aceitar os Termos de Uso e a Política de Privacidade no momento do cadastro.
* A página do Magic Link deve exibir um aviso de privacidade resumido com link para a política completa.

---

## 10. Modelo de Monetização

### MVP — Planos disponíveis no lançamento

| Recurso | Free | Pro |
|---|---|---|
| Cotações ativas simultâneas | 2 | Ilimitado |
| Fornecedores cadastrados | 5 | Ilimitado |
| Produtos cadastrados | 20 | Ilimitado |
| Envios de e-mail / mês | 20 | Ilimitado |
| Disparo WhatsApp | ❌ (P1) | ❌ (P1) |
| Importação CSV | ❌ (P1) | ❌ (P1) |
| Exportação PDF/Excel | ❌ (P1) | ❌ (P1) |
| Templates de Cotação | ❌ (P2) | ❌ (P2) |
| Múltiplos Usuários | ❌ (P2) | ❌ (P2) |
| Projetos / Obras | ❌ (P3) | ❌ (P3) |
| Suporte | Comunidade / Docs | E-mail prioritário |
| **Preço** | **Grátis** | **A definir** |

> **Nota:** O preço do plano Pro será definido com base em validação de mercado. A arquitetura deve prever desde o MVP a entidade `Plan` vinculada ao `Tenant`, com middleware de verificação de limites antes de operações de criação (cotações, fornecedores, produtos). Plano Enterprise será avaliado no P2.

---

## 11. Planejamento de Integrações de Terceiros

### MVP
1. **Disparo de E-mails:** Integração via API transacional utilizando **Resend** como provedor primário (DX moderna, boa integração com Node.js). Fallback configurável para **Amazon SES** em cenários de alta escala.
2. **Compartilhamento de Link:** Utilização da [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) nativa do navegador com fallback para cópia para a área de transferência (`navigator.clipboard`).

### P1
3. **Disparo de WhatsApp:** Conexão com gateway de mensageria. A decisão entre **API Oficial da Meta (Cloud API)** e soluções baseadas em instâncias headless (ex: **Evolution API**) será feita com base na validação de mercado do MVP. Independente da escolha, o sistema deve implementar:
   * Fallback automático para e-mail caso o disparo WhatsApp falhe.
   * Throttling de envio para respeitar limites do provedor.
   * Retry com backoff exponencial.
