# Task 23 — Integração WhatsApp (Não-Oficial via QR Code)

> **Fase:** P1 — Automação (v1.1). Não faz parte do MVP (P0).
> **Camada:** Backend + Frontend.
> **Depende de:** 14 (Magic Links), 15 (Disparo de E-mail), 16 (Cotações Pages), 22 (Observabilidade).

## Objetivo

Permitir que o comprador conecte **o próprio número de WhatsApp** ao Orçalink escaneando um
**QR Code** (fluxo WhatsApp Web, **sem API Oficial da Meta**) e, a partir daí, disparar os Magic
Links das cotações via WhatsApp — com **fallback automático para e-mail** em caso de falha (PRD
seção 11 / P1).

## Contexto e Decisão de Arquitetura

### Requisito de custo: preservar Scale-to-Zero (min-instances 0)

O backend já roda com `min-instances: 0` (Cloud Run) para custo zero. Portanto **não teremos
serviço/gateway rodando full-time** (nada de Evolution API always-on). A integração precisa
conviver com instâncias que dormem e acordam sob demanda.

A solução é uma **conexão efêmera (on-demand)** usando o **Baileys**
(`@whiskeysockets/baileys`) — biblioteca em WebSocket puro (sem browser/Chromium), embutida no
próprio processo NestJS. O ciclo é:

```
[acordar instância] → restaura credenciais do banco → conecta (~poucos segundos)
   → envia as mensagens da cotação → fecha a conexão → instância volta a dormir
```

### Os 3 pontos levantados (e por que funcionam)

1. **Reconectar sem re-escanear o QR** ✅
   O QR serve apenas para o **pareamento inicial**. Ao escanear, o Baileys recebe as
   **credenciais da sessão** (`creds` + signal keys). Persistimos essas credenciais no Postgres
   (via Prisma). Em toda reconexão futura, restauramos as credenciais e a sessão sobe
   **silenciosamente, sem QR**. Re-escanear só é necessário se o WhatsApp **invalidar** a sessão
   (logout no celular, dispositivo removido, ou desconexão `loggedOut`/401) — que é caminho de
   exceção, tratado como fallback para e-mail + pedido de reconexão na UI.

2. **Sem webhook / sem serviço full-time** ✅
   No modelo "conecta → envia → desconecta", o resultado do envio volta **síncrono** do próprio
   `sock.sendMessage(...)`. Não precisamos ficar ouvindo eventos de entrega, logo **não há
   webhook** e **nada roda em background**. Webhook só seria necessário para receber respostas do
   fornecedor ou recibos de leitura — fora do escopo desta task.

3. **Sem BullMQ (envio direto)** ✅
   Seguindo o padrão atual do projeto, o envio é **direto e síncrono**, exatamente como o
   `MailService.sendEmail` faz hoje (sem fila). Retry/backoff, quando necessário, é um laço
   simples inline; se esgotar, cai no **fallback de e-mail**.

### Trade-offs a registrar (honestidade técnica)

- **Latência de conexão:** abrir a sessão WhatsApp custa alguns segundos (~3–10s) por disparo.
  Como conectamos **uma vez por cotação** e enviamos todas as mensagens naquela mesma conexão, o
  custo é amortizado. Fica dentro do timeout de request do Cloud Run.
- **Pareamento precisa de socket vivo:** durante o onboarding (scan do QR), a conexão fica aberta
  por alguns segundos/até ~1 min enquanto o usuário escaneia. Isso é **pontual e iniciado pelo
  usuário** — depois a instância volta a dormir. Não é serviço full-time.
- **Concorrência:** o WhatsApp limita sessões simultâneas do mesmo número. Garantir que não
  abrimos duas conexões concorrentes para o mesmo tenant (lock simples — ver backend).
- **Risco de bloqueio:** por ser não-oficial, envios em massa/rápidos podem levar a bloqueio da
  conta pelo WhatsApp. Aplicar um pequeno intervalo entre mensagens (throttle inline).

### Abstração (SOLID — DIP + Liskov)

Mesmo padrão do `MailService`/`MailProvider`: interface `WhatsappProvider` + implementação
concreta `BaileysWhatsappProvider`. Trocar por API Oficial no futuro não altera o
`WhatsappService`.

```ts
// Espelha o padrão de MailProvider do guia (Liskov)
export interface WhatsappProvider {
  /** Abre conexão efêmera para pareamento e emite QR via callback (onboarding). */
  pair(tenantId: string, onQr: (qrBase64: string) => void): Promise<{ connectedNumber: string }>;
  /** Restaura credenciais salvas, conecta, executa `fn`, e fecha a conexão. */
  withConnection<T>(tenantId: string, fn: (sock: WhatsappSocket) => Promise<T>): Promise<T>;
  disconnect(tenantId: string): Promise<void>;
}
```

## Pré-requisitos / Dependências

- `apps/api` (yarn): `@whiskeysockets/baileys` + `qrcode` (para converter a string do QR em
  imagem base64 exibível). **Sem** BullMQ, **sem** Redis novo, **sem** container extra.
- **Nenhum serviço adicional no `docker-compose`** — a lib roda dentro do NestJS.
- **Nenhum custo** — 100% self-contido.

## Schema Prisma (novas entidades)

Persistir o estado de autenticação do Baileys no Postgres para viabilizar reconexão sem QR.
Gerar migration (`npx prisma migrate dev --name whatsapp_integration`).

```prisma
enum DispatchChannel {
  EMAIL
  WHATSAPP
}

enum WhatsappConnectionState {
  DISCONNECTED
  QR_PENDING
  CONNECTED
  ERROR
}

model WhatsappSession {
  id              String                  @id @default(uuid())
  tenantId        String                  @unique
  state           WhatsappConnectionState @default(DISCONNECTED)
  connectedNumber String?                 // número conectado (E.164), apenas exibição
  creds           Json?                   // AuthenticationCreds serializado (BufferJSON) — CRIPTOGRAFADO em repouso
  lastConnectedAt DateTime?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  tenant   Tenant            @relation(fields: [tenantId], references: [id])
  authKeys WhatsappAuthKey[]
}

// Signal keys do Baileys (pre-keys, sessions, sender-keys, app-state-sync...) — get/set/clear por chave
model WhatsappAuthKey {
  id        String @id @default(uuid())
  tenantId  String
  category  String // ex.: 'pre-key', 'session', 'sender-key', 'app-state-sync-key'
  keyId     String
  value     Json
  updatedAt DateTime @updatedAt

  session WhatsappSession @relation(fields: [tenantId], references: [tenantId])

  @@unique([tenantId, category, keyId])
  @@index([tenantId])
}
```

**Preferência de canal no fornecedor** (default do fornecedor, definido no cadastro — RF06):

```prisma
model Supplier {
  // ...campos existentes...
  preferredChannel DispatchChannel @default(EMAIL)
}
```

Rastreamento de canal/entrega em `QuotationSupplier` (campos opcionais, sem quebrar dados):

```prisma
model QuotationSupplier {
  // ...campos existentes...
  channel        DispatchChannel @default(EMAIL) // inicializado a partir de Supplier.preferredChannel; editável antes do envio
  whatsappSentAt DateTime?
  whatsappError  String?         // motivo interno; NUNCA exposto ao cliente
}
```

- Adicionar back-relation `whatsappSession WhatsappSession?` em `Tenant`.
- Credenciais são **dados sensíveis**: criptografar `creds`/`value` em repouso com chave da app
  (`WHATSAPP_CREDENTIALS_ENCRYPTION_KEY`) e nunca logar.

### Fluxo da preferência de canal

1. **Cadastro do fornecedor:** `Supplier.preferredChannel` é escolhido pelo comprador (default
   `EMAIL`). É a preferência padrão daquele fornecedor.
2. **Ao associar fornecedores à cotação:** cada `QuotationSupplier.channel` é **inicializado com o
   `preferredChannel` do fornecedor** — ou seja, o canal já vem **identificado antes de iniciar o
   orçamento**, sem o comprador precisar reescolher.
3. **Antes do envio (publicar):** o comprador pode **sobrescrever o canal por fornecedor**
   naquela cotação específica, sem alterar a preferência global do fornecedor.
4. **Fallback:** WhatsApp indisponível (sessão desconectada, sem telefone, plano sem acesso, ou
   falha no envio) → cai para e-mail automaticamente, independentemente da preferência.

## Backend

Criar módulo `apps/api/src/modules/whatsapp/` seguindo a estrutura padrão (module, controller,
service, `dto/`, specs). Referência direta: módulo `mail` (envio direto + `TenantContext`).

### 1. Auth store persistente (Prisma) — reconexão sem QR

Implementar um `AuthenticationState` customizado do Baileys apoiado no Prisma
(`makePrismaAuthState(tenantId)` → `{ state, saveCreds }`), no lugar do `useMultiFileAuthState`
(que grava em disco e não serve para serverless):

- `state.creds` ← carrega/salva `WhatsappSession.creds` (serializado com `BufferJSON`).
- `state.keys` ← `get/set/clear` mapeados em `WhatsappAuthKey` por `(category, keyId)`.
- Escutar `creds.update` e persistir imediatamente (as chaves rotacionam a cada conexão).

### 2. `WhatsappService` (orquestração + regras)

- `connect()` (onboarding): chama `provider.pair(...)`, recebe o QR (string) → converte para
  base64 com `qrcode` → seta `state = QR_PENDING` → **stream via SSE** para o frontend. Ao
  conectar, salva `creds`, `connectedNumber`, `state = CONNECTED` e fecha a conexão.
- `getStatus()`: retorna estado atual (`WhatsappSession`) do tenant.
- `disconnect()`: faz logout no dispositivo (se possível), limpa `creds`/`WhatsappAuthKey`, seta
  `DISCONNECTED`.
- `sendQuotationMessages(quotationId)`: dentro de **uma única** `provider.withConnection(...)`,
  itera os `QuotationSupplier` com canal WHATSAPP e envia cada mensagem (com throttle inline).
  Roda dentro de `TenantContext.run(tenantId, ...)` como o `MailService`.

### 3. Conexão efêmera e reconexão silenciosa

`provider.withConnection`:
1. Carrega auth do banco. Sem `creds` → lança `WHATSAPP_NOT_CONNECTED` (fallback e-mail).
2. Cria socket Baileys; aguarda `connection.update` = `open` (timeout curto).
3. Se `close` com `DisconnectReason.loggedOut` → marca `DISCONNECTED`, limpa credenciais e sinaliza
   necessidade de **novo pareamento** (fallback e-mail neste disparo).
4. Executa `fn` (envios), persiste `creds` atualizadas, **fecha o socket**.
- **Lock por tenant** (in-memory por instância; suficiente pois envio é sob demanda) para evitar
  duas conexões simultâneas do mesmo número.

### 4. Endpoints (`WhatsappController`, prefixo `/api`, protegido por `FirebaseAuthGuard`)

| Método | Rota | Descrição |
|---|---|---|
| `GET`  | `/whatsapp/connect` | **SSE** — inicia pareamento e faz streaming do QR (base64) + evento de conexão |
| `GET`  | `/whatsapp/status` | Estado atual da conexão do tenant |
| `POST` | `/whatsapp/disconnect` | Desconecta/limpa a sessão |

- **Sem endpoint de webhook** (não há serviço externo nem eventos assíncronos).
- SSE mantém a resposta aberta apenas durante o pareamento; encerra ao conectar ou expirar o QR.

### 5. Preferência de canal (cadastro + associação)

- `SupplierService` (create/update) passa a aceitar `preferredChannel` (adicionar aos DTOs
  `CreateSupplierDto`/`UpdateSupplierDto` com `@IsEnum(DispatchChannel)`; default `EMAIL`).
- `QuotationService.associateSuppliers`: ao criar cada `QuotationSupplier`, definir
  `channel = supplier.preferredChannel` (canal já identificado antes de iniciar o orçamento).
- Endpoint para **alterar o canal por fornecedor na cotação** antes do envio, ex.:
  `PATCH /quotations/:id/suppliers/:supplierId/channel` (só permitido enquanto `DRAFT`/antes de
  publicar). Valida enum e retorna o `QuotationSupplier` atualizado.

### 6. Integração no disparo (envio direto — sem fila)

- Em `QuotationService.publish` e `QuotationService.resend`, selecionar canal por
  `QuotationSupplier.channel`:
  - `WHATSAPP` **e** sessão `CONNECTED` **e** fornecedor com `phone` válido → enviar via
    `WhatsappService` (direto, como o e-mail é hoje).
  - Falha no WhatsApp (conexão caiu, `loggedOut`, telefone inválido, erro de envio após pequeno
    retry inline) → **fallback automático para e-mail** via `MailService`, registrando o motivo
    em log estruturado (correlationId — task 22) e em `QuotationSupplier.whatsappError`.
- **Throttle inline:** pequeno intervalo entre mensagens na mesma conexão (ex.: 1–3s) para
  reduzir risco de bloqueio.
- Atualizar `whatsappSentAt` após envio bem-sucedido (espelha o `sentAt` do e-mail).

### 7. Mensagem (texto simples — canal não-oficial)

Mensagem curta, em português, com o Magic Link. Sem HTML (WhatsApp é texto/markdown leve):

```
Olá, {contato}! 👋
A empresa *{empresa}* solicita uma cotação de preços.

*{titulo}*
Prazo: {prazo}

Preencha sua proposta pelo link:
{APP_URL}/v/{token}
```

- Normalizar `Supplier.phone` (DDI/DDD — RF06) para o formato aceito pelo Baileys
  (`55DDDNUMERO@s.whatsapp.net`). Fornecedor sem telefone válido → usar e-mail.
- Opcional: `sock.onWhatsApp(jid)` para validar se o número tem WhatsApp antes de enviar.

### 8. Gating por plano (RN05 / roadmap)

- WhatsApp é recurso **P1** — bloquear no plano Free (liberar para Pro conforme flag de roadmap).
  Reusar `PlanLimitGuard` / decorator `@CheckPlanLimit(...)`.
- Erros de limite retornam `PLAN_LIMIT_MESSAGE` (nunca vazar `resource`/`plan`).

### 9. Variáveis de ambiente (`.env` da API)

```
WHATSAPP_ENABLED=false                  # feature flag P1
WHATSAPP_CREDENTIALS_ENCRYPTION_KEY=    # criptografia das credenciais em repouso
WHATSAPP_SEND_THROTTLE_MS=2000          # intervalo entre mensagens na mesma conexão
WHATSAPP_CONNECT_TIMEOUT_MS=15000       # timeout para estabelecer a sessão
```

### 10. Mensagens de erro (guia — seção 4)

- Nunca vazar termos internos (Baileys, socket, tenant, credenciais) ao usuário.
- Adicionar constantes em `common/constants/error-messages.ts`, ex.:
  `WHATSAPP_NOT_CONNECTED_MESSAGE = 'WhatsApp não conectado. Conecte um número para enviar por este canal.'`
- Detalhes técnicos apenas em log estruturado (task 22).

## Frontend

Seguir design system (`styles.md`) e o padrão de páginas existentes (`apps/web/src/pages/`),
usando `getApiErrorMessage()` para todos os erros (`apps/web/src/lib/errors.ts`).

### 1. Configurações → Integrações → WhatsApp

- Card com status usando os **Badges de Status** (`styles.md` 6.4):
  Desconectado (`neutral`), Aguardando leitura (`warning`, dot pulsante),
  Conectado (`success`, exibe número), Erro (`danger`).
- Ação **"Conectar WhatsApp"** → abre modal (`fadeIn`) e **abre o SSE** `GET /whatsapp/connect`;
  renderiza o **QR Code** (base64) recebido. Quando o SSE emitir `CONNECTED`, fecha o modal e
  mostra toast (`scaleIn`). QR pode atualizar durante a validade — apenas re-renderizar.
- Ação **"Desconectar"** (botão `Danger`) com confirmação.
- Se a sessão cair (`ERROR`/`DISCONNECTED` detectado em `getStatus`), CTA "Reconectar" (reabre o
  fluxo de QR).
- Ícone: `MessageCircle`/`Smartphone` (Lucide, stroke 1.5px).

### 2. Cadastro do fornecedor (preferência padrão)

- No `SupplierForm` (task 12), adicionar seletor de **canal de envio preferido**
  (E-mail / WhatsApp) — um toggle/segmented control seguindo `styles.md`. Default `EMAIL`.
- Na listagem de fornecedores, exibir o canal preferido como ícone/badge discreto
  (`Mail` vs `MessageCircle`).

### 3. Publicação/Detalhe da cotação

- Ao associar fornecedores (task 16), o canal de cada um já vem **identificado** a partir da
  preferência do fornecedor (`preferredChannel`) — sem exigir escolha manual.
- **Antes do envio**, permitir **alterar o canal por fornecedor** naquela cotação (toggle
  E-mail/WhatsApp na lista de fornecedores da cotação), chamando o endpoint de alteração de canal.
  WhatsApp desabilitado quando: sessão não conectada, plano sem acesso, ou fornecedor sem telefone
  (tooltip explicando o motivo). Alterar aqui **não** muda a preferência global do fornecedor.
- **Configurar sessão a partir da cotação:** quando o WhatsApp estiver desabilitado por **falta de
  sessão conectada**, exibir uma CTA contextual **"Conectar WhatsApp"** (inline no aviso/tooltip)
  que abre o **mesmo fluxo de pareamento por QR** (modal/SSE de `GET /whatsapp/connect`) sem sair
  da tela da cotação. Ao concluir a conexão (`CONNECTED`), reavaliar o estado e **habilitar
  automaticamente** a opção de WhatsApp para os fornecedores elegíveis. Reusar o componente de
  conexão de Configurações → Integrações (mesmo modal), evitando duplicação.
  - Se o bloqueio for por **plano**, mostrar CTA de upgrade (`PLAN_LIMIT_MESSAGE`) em vez da CTA
    de conexão. Se for por **telefone ausente**, apontar para editar o fornecedor.
- No painel de status por fornecedor (RF16), indicar o canal usado (`Mail` vs `MessageCircle`) e,
  quando houve fallback, sinalizar "enviado por e-mail".

### 4. Acessibilidade / Mobile

- Modal do QR respeita foco/teclado e `prefers-reduced-motion`.
- Touch targets ≥ 44×44px; QR com contraste adequado e `alt`/aria-label.

## Segurança e LGPD

- Credenciais da sessão são **altamente sensíveis** (dão acesso à conta WhatsApp): criptografar em
  repouso, restringir por `tenantId`, nunca logar/retornar na API.
- **Nunca** logar conteúdo de mensagens ou número completo (mascarar).
- Consentimento: disparo por WhatsApp usa dados do fornecedor sob legítimo interesse do comprador
  (PRD 9.1); manter o aviso de privacidade no Magic Link.

## Testes (TDD — escrever antes)

- **Unitário `whatsapp.service.spec.ts`** (mock do `WhatsappProvider` e do Prisma):
  - `deve emitir QR Code ao iniciar pareamento`
  - `deve marcar sessão como CONNECTED e salvar credenciais ao parear`
  - `deve reconectar usando credenciais salvas sem exigir novo QR`
  - `deve enviar mensagens da cotação em uma única conexão`
  - `deve acionar fallback de e-mail quando a sessão está invalidada (loggedOut)`
  - `deve acionar fallback de e-mail quando o fornecedor não tem telefone válido`
  - `não deve permitir envio via WhatsApp no plano Free`
- **Auth store `prisma-auth-state.spec.ts`**: get/set/clear de creds e keys mapeados no Prisma.
- **Integração `whatsapp.controller.spec.ts`**: `status`/`disconnect` autenticados; SSE de
  `connect` emite QR.
- Cobertura mínima: services 80%, controllers 70% (guia — seção 1).

## Critérios de Aceite

- [ ] Fornecedor tem **canal preferido** (`preferredChannel`) salvo no cadastro.
- [ ] Ao associar fornecedores, o canal da cotação vem **pré-identificado** pela preferência.
- [ ] Comprador pode **alterar o canal por fornecedor antes do envio** sem mudar a preferência
      global do fornecedor.
- [ ] Quando o WhatsApp está desabilitado por falta de sessão, há CTA **"Conectar WhatsApp"** na
      própria tela da cotação que abre o pareamento por QR; ao conectar, a opção é habilitada
      automaticamente.
- [ ] Comprador conecta o WhatsApp escaneando QR Code **uma vez** (sem API Oficial).
- [ ] Disparos seguintes **reconectam sem novo QR**, usando credenciais persistidas.
- [ ] **Nenhum serviço/processo roda full-time**; conexão é efêmera (conecta → envia → fecha) e o
      backend mantém `min-instances: 0`.
- [ ] **Sem webhook e sem fila (BullMQ)** — envio direto e síncrono, como o e-mail atual.
- [ ] Envio dos Magic Links por WhatsApp funciona para fornecedores com telefone válido.
- [ ] **Fallback automático para e-mail** quando WhatsApp falha ou a sessão foi invalidada.
- [ ] Recurso bloqueado no plano Free (P1) com mensagem de upgrade.
- [ ] Credenciais criptografadas em repouso; sem vazamento de dados internos nas mensagens de erro.
- [ ] Frontend usa `getApiErrorMessage()`; UI segue `styles.md` (badges, modal, animações).
- [ ] Testes (unit + integração) passam com a cobertura mínima; multi-tenant respeitado em toda
      query (`tenantId`).
- [ ] Commits em Conventional Commits (`feat(whatsapp): ...`).

## Fora de Escopo (P1 desta task)

- API Oficial da Meta (Cloud API).
- Envio de mídia/anexos e **recebimento** de respostas/recibos do fornecedor via WhatsApp (isso
  exigiria conexão persistente/webhook).
- Lembretes automáticos (task própria do P1) e templates de mensagem customizáveis.

## Refs

- **PRD:** seção 11 (Integrações — WhatsApp não-oficial, fallback, throttling), RF06
  (telefone/WhatsApp do fornecedor), RF13/RF14/RF15 (Magic Link/disparo), RF16/RF17 (status/
  reenvio), RN05 (limites por plano), seção 9 (LGPD).
- **Roadmap:** P1 — "Disparo WhatsApp".
- **Guia de Desenvolvimento:** TDD (1), SOLID/DIP+Liskov (2), Mensagens de Erro (4),
  Segurança (6).
- **Código de referência:** `modules/mail/` (envio direto + `TenantContext`),
  `QuotationService.publish/resend`, `common/guards/plan-limit.guard.ts`.
