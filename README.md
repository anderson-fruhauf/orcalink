# Orçalink 🔗

> **Plataforma SaaS para centralização, automação e análise comparativa de cotações comerciais B2B/B2C.**

O **Orçalink** resolve a dor crônica do processo de compras manual (e-mails dispersos, planilhas desorganizadas e mensagens soltas no WhatsApp) permitindo que o comprador envie uma lista de necessidades para múltiplos fornecedores de forma automatizada e analise os preços em uma matriz comparativa inteligente em tempo real.

---

## 🌟 O Grande Diferencial: Estratégia de Fricção Zero

A maioria dos sistemas de cotação falha porque os fornecedores se recusam a passar por cadastros complexos, downloads de aplicativos ou fluxos burocráticos. Para garantir a adesão máxima dos fornecedores, o Orçalink adota a abordagem **Frictionless/Poka-yoke**:

1. **Magic Link:** O fornecedor acessa a lista de cotação diretamente com um clique via e-mail ou link compartilhado, sem precisar de cadastro, login ou senha.
2. **Interface Mobile-First Ultra-Simplificada:** Uma "planilha inteligente" de rolagem vertical adaptada para celulares, com teclado numérico nativo (`inputmode="numeric"`) e máscara automática em centavos para evitar erros de digitação.
3. **Auto-Save Local:** O progresso do preenchimento é salvo no `localStorage` do navegador a cada tecla, evitando perda de dados caso a conexão caia.
4. **Validação Inteligente:** O botão de envio só é liberado quando todos os itens possuem preço válido ou estão explicitamente marcados como *"Não tenho este item"*.

---

## 🛠️ Tecnologias & Arquitetura

O Orçalink foi desenhado para ser eficiente e escalável a custo zero no MVP (Scale-to-Zero), rodando de forma isolada e performática.

### 💻 Stack de Tecnologia

| Camada | Tecnologia Principal | Propósito / Benefício |
| :--- | :--- | :--- |
| **Backend** | **NestJS** (v11+) | Arquitetura modular robusta com TypeScript e injeção de dependência nativa. |
| **Frontend** | **React** (v19+) + **Vite** | SPA ultra-rápida estruturada com roteamento dinâmico e carregamento preguiçoso (*lazy routes*). |
| **Estilos** | **Vanilla CSS** | Tokens de design puros em `tokens.css` e variáveis CSS globais para performance e controle absoluto. |
| **Banco de Dados** | **PostgreSQL** | Banco relacional robusto para consistência relacional e transações. |
| **ORM** | **Prisma ORM** (v7+) | Mapeamento seguro, migrações versionadas e geração de cliente estritamente tipado. |
| **Autenticação** | **Firebase Auth** | Gestão segura de identidades (Firebase Client SDK no web / Admin SDK no API). |
| **Background Jobs** | **BullMQ** + **Redis** | Fila de processamento assíncrono dedicada para envio de e-mails sem gargalos de API. |
| **Disparo de E-mails**| **Resend** | Provedor transacional moderno para envio de e-mails rápidos com fallback para AWS SES. |
| **Containerização** | **Docker** / **Docker Compose** | Ambiente local idêntico ao ambiente produtivo em um comando. |

### 🏢 Arquitetura Multi-Tenant

* **Isolamento Lógico:** O sistema é multi-tenant baseado em uma única base de dados relacional. Cada entidade é associada a um `tenantId` (UUID).
* **Segurança Estrita:** Um interceptor global no NestJS valida o token JWT do Firebase, resolve a organização e injeta/filtra o `tenantId` em todas as consultas SQL do Prisma, mitigando completamente o vazamento de dados entre empresas.
* **Plano Pro vs Free:** Limites operacionais controlados via guardas de recursos em tempo real (ex: cotações simultâneas limitadas a 5 no plano Free e ilimitadas no Pro).

---

## 📂 Estrutura do Projeto

O projeto é estruturado de forma desacoplada sem ferramentas complexas de monorepo, facilitando a gestão por pasta:

```
orcalink/
├── apps/
│   ├── api/                   # Backend NestJS (usa yarn)
│   └── web/                   # Frontend React (usa npm)
├── tasks/                     # Roteiro das 24 tasks ordenadas por dependência do MVP
├── docker-compose.dev.yml     # Serviços de BD (Postgres) e Cache (Redis) locais
├── docker-compose.yml         # Configurações gerais
├── orcalink-prd.md            # Documento de Requisitos de Produto completo
├── DEVELOPMENT_GUIDE.md       # Regras e padrões de código obrigatórios (TDD, SOLID)
└── styles.md                  # Especificações do Design System (Cores, Fontes, Componentes)
```

---

## ⚡ Como Começar (Setup Local)

### Pré-requisitos
Certifique-se de possuir instalado em sua máquina:
* **Node.js** (v20 ou superior)
* **Yarn** (para o backend API)
* **NPM** (para o frontend Web)
* **Docker** & **Docker Compose**

---

### Passo 1: Infraestrutura Local (Banco e Redis)

Inicie o PostgreSQL e o Redis usando o Docker Compose na raiz do projeto:

```bash
docker compose -f docker-compose.dev.yml up -d
```

---

### Passo 2: Configurando o Backend (`apps/api`)

1. Navegue até a pasta do backend:
   ```bash
   cd apps/api
   ```
2. Instale as dependências com o **Yarn**:
   ```bash
   yarn install
   ```
3. Crie e configure o arquivo `.env` com base no `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(Insira suas chaves do Firebase e sua chave do Resend se necessário para envio real de e-mails)*.
4. Execute as migrations do Prisma para estruturar o banco:
   ```bash
   npx prisma migrate dev
   ```
5. Valide e gere o Prisma Client:
   ```bash
   npx prisma validate
   npx prisma generate
   ```
6. Inicie o servidor em modo de desenvolvimento (hot-reload na porta `3333`):
   ```bash
   yarn dev
   ```

---

### Passo 3: Configurando o Frontend (`apps/web`)

1. Em um novo terminal, navegue até a pasta do frontend:
   ```bash
   cd apps/web
   ```
2. Instale as dependências com o **NPM**:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento do Vite (porta `5173`):
   ```bash
   npm run dev
   ```

---

## 🧪 Suíte de Testes

Os testes são cruciais no Orçalink e são guiados pelo **TDD (Test-Driven Development)**.

### Executando Testes (no diretório `apps/api`)

* **Testes Unitários (Jest):**
  ```bash
  yarn test
  ```
* **Testes de Integração e E2E:**
  ```bash
  yarn test:e2e
  ```
* **Verificação de Cobertura de Código:**
  ```bash
  yarn test:cov
  ```

---

## 📐 Padrões & Práticas de Desenvolvimento

Todas as alterações no projeto devem respeitar rigorosamente as diretrizes contidas no [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md):

* **TDD Obrigatório:** Escreva os testes antes da implementação física de novos controllers ou services.
* **SOLID:**
  * **S**ingle Responsibility: Services pequenos focados em tarefas únicas.
  * **O**pen/Closed: Extensibilidade sem quebrar o core.
  * **L**iskov Substitution: Interfaces e providers substituíveis (ex: `MailProvider`).
  * **D**ependency Inversion: Injeção de dependência nativa do NestJS.
* **Padrões de Nomenclatura:**
  * Arquivos: `kebab-case` (`create-category.dto.ts`)
  * Classes: `PascalCase` (`QuotationService`)
  * Variáveis e Funções: `camelCase` (`findByTenantId`)
* **Commits Convencionais:** Commits estruturados por escopo (ex: `feat(auth): ...`, `fix(quotation): ...`).

---

## 🗺️ MVP Roadmap (Tasks)

O desenvolvimento do MVP é fatiado em **24 tarefas sequenciais**. Veja o índice completo e critérios de aceitação de cada issue em [tasks/README.md](tasks/README.md).

---

## 📜 Licença

Este projeto é privado e de uso exclusivo de sua organização.
