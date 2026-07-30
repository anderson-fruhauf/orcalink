# Task 24 — Disparo Assíncrono com Google Cloud Tasks (substitui BullMQ/Redis)

> **Fase:** P0 — ajuste de arquitetura (revisa RNF05).
> **Camada:** Infra + Backend (+ pequeno ajuste no Frontend).
> **Depende de:** 15 (Disparo de E-mail), 20 (Expiração), 22 (Observabilidade), 23 (WhatsApp).
> **Substitui:** toda referência a **BullMQ + Redis** no PRD e nas tasks.

## Objetivo

Tirar o envio de e-mail e de WhatsApp do caminho síncrono do request e delegá-lo a uma fila
gerenciada do **Google Cloud Tasks**, com retry/backoff e throttling configurados na infraestrutura,
**sem Redis** e **sem nenhum processo rodando full-time** (`min-instances: 0` preservado).

## Contexto: por que trocar BullMQ por Cloud Tasks

O PRD (RNF05) previa BullMQ + Redis, mas isso não sobrevive ao modelo de custo escolhido:

- BullMQ é um **worker que faz polling** no Redis. Em Cloud Run com `min-instances: 0` e CPU
  alocada sob demanda, não existe processo vivo para consumir a fila — o job só seria processado
  por acaso, enquanto alguma instância estivesse atendendo outro request.
- Manter um worker acordado exige `min-instances: 1` + CPU always-on, o que **elimina o custo zero**.
- Redis serverless (Upstash) seria mais uma dependência externa, mais uma credencial e mais um
  ponto de falha no `/ready`.

Hoje, sem fila alguma, `QuotationService.dispatchQuotationInvites` envia **dentro do request** de
publish/resend. Com WhatsApp (throttle de 2s por mensagem + conexão Baileys de ~3–10s), publicar
uma cotação com 10 fornecedores segura o request por dezenas de segundos e qualquer falha
intermitente perde o disparo sem retry.

**Cloud Tasks** resolve os três problemas de uma vez, porque é uma fila **push**: ela mesma faz o
POST HTTP no destino, acordando o Cloud Run sob demanda.

| Necessidade | Como o Cloud Tasks entrega |
|---|---|
| Não bloquear a API | O publish só enfileira e responde |
| Retry com backoff exponencial | `retry_config` da fila (sem código de retry) |
| Throttling do WhatsApp | `max_dispatches_per_second` / `max_concurrent_dispatches` |
| Sessão WhatsApp única por número | Fila com `max_concurrent_dispatches = 1` (lock distribuído de graça) |
| Scale-to-zero | Push HTTP acorda a instância; nada roda ocioso |
| Cron de expiração | **Cloud Scheduler** → HTTP OIDC |
| Custo | 1 milhão de operações/mês grátis + 3 jobs de Scheduler grátis |

## Arquitetura

```
[Cloud Run: orcalink-api]  (público, ingress ALL, timeout 60s)
        │ publish/resend → valida, gera magic links, ENFILEIRA
        ▼
[Cloud Tasks: email-dispatch]         [Cloud Tasks: whatsapp-dispatch]
   rate alto, retry 5x                   concorrência 1, retry 3x
        │ POST + OIDC                          │ POST + OIDC
        └───────────────┬──────────────────────┘
                        ▼
        [Cloud Run: orcalink-worker]  (privado, ingress INTERNAL, timeout 900s)
                 POST /api/tasks/*  → MailService / WhatsappService
                        ▲
        [Cloud Scheduler: expire-quotations]  (0 * * * *, OIDC)
```

- **Mesma imagem Docker** nos dois serviços. O que muda é a env `SERVICE_ROLE`.
- `orcalink-worker` é **privado**: só a service account `orcalink-tasks-invoker` tem
  `roles/run.invoker`. Autenticação acontece na borda do GCP, antes do código rodar.
- Ambos mantêm `min_instance_count = 0` e `cpu_idle = true`. Como todo o trabalho acontece
  **dentro** do request HTTP da task, a CPU está alocada durante o processamento — não é preciso
  pagar CPU always-on.

## Backend

### 1. Dependências (`apps/api`, yarn)

```bash
yarn add @google-cloud/tasks google-auth-library
```

Remover `@nestjs/bullmq` e `bullmq` (se ainda presentes no `package.json`).

### 2. Abstração da fila (SOLID — DIP, mesmo padrão de `MailProvider`/`WhatsappProvider`)

`apps/api/src/modules/tasks/task-queue.interface.ts`:

```ts
export const TASK_QUEUE = Symbol('TASK_QUEUE');

export type TaskQueueName = 'email-dispatch' | 'whatsapp-dispatch';

export interface EnqueueOptions {
  /** Atraso antes da primeira tentativa (ex.: agendar lembrete). */
  delaySeconds?: number;
  /** Nome determinístico da task — o Cloud Tasks deduplica por nome. */
  dedupeKey?: string;
}

export interface TaskQueue {
  enqueue<T>(queue: TaskQueueName, payload: T, options?: EnqueueOptions): Promise<void>;
}
```

Implementação `CloudTasksQueue` (`cloud-tasks.queue.ts`) usando `CloudTasksClient.createTask` com
`httpRequest.oidcToken` apontando para a SA invoker e `url` = `${WORKER_URL}/api/tasks/<rota>`.
Trocar por Pub/Sub ou outra fila no futuro não toca em `QuotationService`.

### 3. Handlers (`TasksController`, prefixo `/api/tasks`)

Registrar o `TasksModule` **apenas quando `SERVICE_ROLE=worker`** (import condicional no
`AppModule`), para que o serviço público nunca exponha as rotas de processamento.

| Método | Rota | Origem | Payload |
|---|---|---|---|
| `POST` | `/tasks/email-dispatch` | fila `email-dispatch` | `{ tenantId, quotationSupplierId }` |
| `POST` | `/tasks/whatsapp-dispatch` | fila `whatsapp-dispatch` | `{ tenantId, quotationId, quotationSupplierIds }` |
| `POST` | `/tasks/expire-quotations` | Cloud Scheduler | `{}` |

**Semântica de resposta (crítica):** o Cloud Tasks reenfileira em **qualquer** resposta não-2xx,
inclusive 4xx. Portanto:

- **Falha permanente** (fornecedor sem e-mail, magic link inexistente, payload inválido, cotação já
  encerrada): marcar `FAILED` no banco, logar e responder **200**. Retentar não resolveria.
- **Falha transitória** (Resend/WhatsApp fora do ar, timeout, erro de banco): responder **5xx** para
  que a fila faça o backoff.
- **Já processado** (`sentAt`/`whatsappSentAt` preenchido): responder **200** imediatamente.

### 4. Autenticação das rotas de task (`CloudTasksGuard`)

Defesa em profundidade — o IAM já bloqueia na borda, o guard bloqueia no código:

- **Produção:** valida o header `Authorization: Bearer <id_token>` com
  `OAuth2Client.verifyIdToken({ audience: WORKER_URL })` e confere se o `email` do payload é a SA
  `CLOUD_TASKS_INVOKER_SA`.
- **Dev (emulador):** quando `CLOUD_TASKS_EMULATOR_HOST` está definido, aceita o header
  `X-Tasks-Secret` igual a `CLOUD_TASKS_DEV_SECRET`. Esse caminho é **fail-closed**: se
  `NODE_ENV=production`, o guard ignora o emulador e exige OIDC.
- Nunca vazar detalhe interno na resposta — seguir `common/constants/error-messages.ts`.

### 5. Mudança em `QuotationService.dispatchQuotationInvites`

De envio direto para enfileiramento:

```ts
// antes: await this.mailService.sendEmail(supplier.id)
await this.taskQueue.enqueue('email-dispatch', { tenantId, quotationSupplierId: supplier.id }, {
  dedupeKey: `email:${supplier.id}:${dispatchRound}`,
});

// WhatsApp: UMA task por cotação (amortiza a conexão Baileys em um único socket)
await this.taskQueue.enqueue('whatsapp-dispatch', {
  tenantId,
  quotationId,
  quotationSupplierIds: whatsappSuppliers.map((s) => s.id),
});
```

- A validação de limite de plano (`checkEmailLimit`) **continua síncrona** no publish/resend: o
  usuário precisa ver o erro de limite na hora, não depois.
- O **fallback WhatsApp → e-mail** deixa de chamar `MailService` direto e passa a **enfileirar** uma
  task de e-mail, para que o fallback também tenha retry próprio.
- Retry inline do `WhatsappService.sendMessageWithRetry` e o lock in-memory por tenant podem ser
  simplificados: a fila com concorrência 1 já serializa e o backoff é da infra. Manter apenas o
  throttle entre mensagens da mesma conexão.

### 6. Schema Prisma (migration `async_dispatch`)

Como o disparo passa a ser assíncrono, o painel precisa mostrar o estado real do envio:

```prisma
enum DispatchStatus {
  QUEUED
  SENT
  FAILED
}

model QuotationSupplier {
  // ...campos existentes...
  dispatchStatus DispatchStatus @default(QUEUED)
  emailError     String?        // motivo interno; NUNCA exposto ao cliente
}
```

`sentAt`, `whatsappSentAt` e `whatsappError` já existem e continuam sendo a fonte de idempotência.

### 7. Expiração automática (substitui o cron do BullMQ — task 20)

`POST /api/tasks/expire-quotations` executa a mesma lógica do encerramento manual para cotações
`OPEN` com `deadline < now()`. Acionado pelo **Cloud Scheduler** de hora em hora com OIDC. Sem
`@nestjs/schedule`, sem repeatable job, sem processo vivo.

### 8. Observabilidade (ajusta task 22)

- `/ready` deixa de checar Redis. Passa a checar **PostgreSQL** e, opcionalmente, a acessibilidade
  da fila (`getQueue`) quando `SERVICE_ROLE=worker`.
- Logar em todo handler: `queueName`, `taskName`, `X-CloudTasks-TaskRetryCount`, `tenantId` e o
  `correlationId` propagado no payload — permite rastrear a cadeia publish → task → envio.
- Alerta sugerido (Cloud Monitoring): profundidade da fila e taxa de tasks descartadas.

## Infraestrutura

### Terraform (`infra/terraform`)

- `google_cloud_tasks_queue.email_dispatch`: 5 disp/s, 10 concorrentes, 5 tentativas, backoff 10s→300s.
- `google_cloud_tasks_queue.whatsapp_dispatch`: 1 disp/s, **1 concorrente**, 3 tentativas, backoff 30s→600s.
- `google_cloud_run_v2_service.worker`: mesma imagem, `ingress = INGRESS_TRAFFIC_INTERNAL_ONLY`,
  `timeout = 900s`, `SERVICE_ROLE=worker`, `min_instance_count = 0`.
- `google_service_account.tasks_invoker` + `google_cloud_run_v2_service_iam_member` dando
  `roles/run.invoker` **apenas** para essa SA no worker.
- A SA da API precisa de `roles/cloudtasks.enqueuer` nas filas e `roles/iam.serviceAccountUser`
  sobre a SA invoker (para emitir o token OIDC da task).
- `google_cloud_scheduler_job.expire_quotations`: cron `0 * * * *`, `America/Sao_Paulo`, OIDC.
- Remover a variável `redis_url` e a env `REDIS_URL`.

### Desenvolvimento local

`docker-compose.dev.yml` sobe o **emulador de Cloud Tasks** no lugar do Redis:

```yaml
cloud-tasks-emulator:
  image: ghcr.io/aertje/cloud-tasks-emulator:latest
  command: >
    -host 0.0.0.0 -port 8123
    -queue "projects/orcalink-dev/locations/us-central1/queues/email-dispatch"
    -queue "projects/orcalink-dev/locations/us-central1/queues/whatsapp-dispatch"
  ports: ["8123:8123"]
```

O client detecta o emulador por `CLOUD_TASKS_EMULATOR_HOST` e instancia o `CloudTasksClient` com
`apiEndpoint` + credenciais inseguras (gRPC), sem tocar em produção:

```ts
const emulator = process.env['CLOUD_TASKS_EMULATOR_HOST'];
const client = emulator
  ? new CloudTasksClient({ port: Number(emulator.split(':')[1]), servicePath: emulator.split(':')[0], sslCreds: grpc.credentials.createInsecure() })
  : new CloudTasksClient();
```

Rodando local, o `WORKER_URL` aponta para a própria API (`http://api:3333`), que sobe com
`SERVICE_ROLE=worker` em dev para expor as rotas de task no mesmo processo.

### Variáveis de ambiente

```
SERVICE_ROLE=worker                     # api | worker (em dev, worker)
GCP_PROJECT_ID=orcalink-534b8
GCP_LOCATION=us-central1
WORKER_URL=http://localhost:3333        # URL do Cloud Run worker em produção
CLOUD_TASKS_INVOKER_SA=orcalink-tasks-invoker@orcalink-534b8.iam.gserviceaccount.com
CLOUD_TASKS_EMULATOR_HOST=localhost:8123  # só em dev
CLOUD_TASKS_DEV_SECRET=dev-tasks-secret   # só em dev
```

`REDIS_URL` deixa de existir.

## Frontend

O disparo deixou de ser síncrono, então a UI não pode mais assumir "publicou = enviou":

- Após publicar, exibir status **"Enviando…"** por fornecedor (badge `warning`, conforme
  `styles.md` 6.4) enquanto `dispatchStatus = QUEUED`.
- Revalidar o painel da cotação (React Query `refetchInterval` curto enquanto houver `QUEUED`, ou
  refetch ao focar a janela) até todos resolverem para `SENT`/`FAILED`.
- `FAILED` mostra badge `danger` com CTA de reenvio, usando `getApiErrorMessage()`. Nunca exibir o
  conteúdo bruto de `emailError`/`whatsappError`.

## Testes (TDD — escrever antes)

- `cloud-tasks.queue.spec.ts`: monta o `createTask` correto (URL, OIDC, payload base64, dedupeKey);
  usa emulador ou mock do `CloudTasksClient`.
- `tasks.controller.spec.ts`: 200 em task já processada (idempotência); 200 + `FAILED` em erro
  permanente; 5xx em erro transitório; 401/403 sem OIDC válido.
- `quotation.service.spec.ts`: publish/resend **enfileiram** em vez de enviar; limite de plano
  continua barrando antes de enfileirar; fallback do WhatsApp enfileira e-mail.
- E2E opcional no CI com o emulador subindo via compose.
- Cobertura mínima: services 80%, controllers 70% (guia — seção 1).

## Critérios de Aceite

- [ ] Nenhuma referência a BullMQ ou Redis resta no código, nas configs ou na documentação.
- [ ] `POST /quotations/:id/publish` responde sem esperar o envio (sem chamada a Resend/Baileys no request).
- [ ] E-mails são entregues via task da fila `email-dispatch`, com retry automático em falha transitória.
- [ ] WhatsApp é enviado via fila `whatsapp-dispatch` com concorrência 1 — nunca duas sessões
      simultâneas para o mesmo número.
- [ ] Retry de uma task já concluída **não** duplica envio (idempotência por `sentAt`/`whatsappSentAt`).
- [ ] Falha permanente não fica em loop de retry (marca `FAILED` e responde 200).
- [ ] Fallback WhatsApp → e-mail acontece via nova task, com retry próprio.
- [ ] Rotas `/api/tasks/*` inacessíveis publicamente (worker privado + guard OIDC) e ausentes no
      serviço `orcalink-api`.
- [ ] Cotações expiradas são encerradas de hora em hora pelo Cloud Scheduler.
- [ ] `min-instances: 0` mantido nos dois serviços; nenhum processo full-time; custo dentro do free tier.
- [ ] `/ready` valida PostgreSQL (sem Redis) e retorna 503 quando o banco está fora.
- [ ] Painel da cotação reflete `QUEUED → SENT/FAILED` sem recarregar a página manualmente.
- [ ] Ambiente local sobe com o emulador de Cloud Tasks via `docker compose -f docker-compose.dev.yml up -d`.
- [ ] Testes (unit + integração) passam na cobertura mínima; toda query respeita `tenantId`.
- [ ] Commits em Conventional Commits (`feat(tasks): ...`, `refactor(quotation): ...`).

## Trade-offs e evolução

- **Concorrência 1 no WhatsApp é global**, não por tenant: com muitos tenants Pro, os disparos
  serializam. Evolução natural é **shardar** em N filas (`whatsapp-dispatch-0..3`) roteando por
  `hash(tenantId) % N` — cada tenant sempre na mesma fila, preservando a sessão única e ganhando
  paralelismo. Desnecessário no MVP.
- **Pareamento por QR continua síncrono** (SSE) no serviço público: é interativo e iniciado pelo
  usuário. Como as credenciais ficam no Postgres, o worker reconecta depois sem novo QR.
- **Latência de cold start** por task (~1–3s) é irrelevante para envio em background.
- **Pub/Sub** não foi escolhido porque não oferece rate limiting nem agendamento por mensagem, que
  são exatamente os recursos que o WhatsApp exige. Fica como opção para eventos de domínio (fan-out)
  no futuro.

## Refs

- **PRD:** RNF05 (reescrito), RF14/RF17 (disparo e reenvio), RF29/RN03 (expiração), RNF09 (observabilidade).
- **Tasks afetadas:** 00 (dependências), 15 (disparo de e-mail), 20 (expiração), 22 (`/ready`), 23 (WhatsApp).
- **Guia de Desenvolvimento:** TDD (1), SOLID/DIP (2), Mensagens de Erro (4), Segurança (6).
- **Código de referência:** `modules/mail/mail.service.ts`, `modules/whatsapp/whatsapp.service.ts`,
  `QuotationService.dispatchQuotationInvites`.
