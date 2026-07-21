# Guia de Desenvolvimento — Orçalink

Este documento define as práticas obrigatórias de desenvolvimento do projeto. Todo código enviado ao repositório deve seguir estas diretrizes.

---

## 1. TDD — Test-Driven Development

### Ciclo obrigatório

```
🔴 RED    → Escreva o teste que falha
🟢 GREEN  → Escreva o código mínimo que faz o teste passar
🔵 REFACTOR → Refatore mantendo os testes verdes
```

### Regras

- **Nenhum service ou controller** deve ser commitado sem teste correspondente
- Escreva o teste **antes** da implementação
- Cada teste deve testar **uma única coisa** (single assertion por test case quando possível)
- Nomes de teste devem ser descritivos em português:
  ```ts
  it('deve retornar 401 quando token JWT é inválido')
  it('deve criar categoria com sucesso quando dados são válidos')
  it('não deve permitir criação acima do limite do plano Free')
  ```

### Estrutura de Testes

```
apps/api/
├── src/
│   └── modules/
│       └── category/
│           ├── category.service.ts
│           ├── category.service.spec.ts    ← Teste unitário
│           ├── category.controller.ts
│           └── category.controller.spec.ts ← Teste de integração
└── test/
    └── category.e2e-spec.ts                ← Teste E2E
```

### Tipos de Teste

| Tipo | Ferramenta | O que testa | Quando usar |
|---|---|---|---|
| **Unitário** | Jest | Services isolados (mock deps) | Todo service |
| **Integração** | Jest + Supertest | Controller + Service + DB real | Toda rota |
| **E2E** | Jest + Supertest | Fluxo completo (auth → ação → resultado) | Fluxos críticos |

### Mocking

- Use `jest.mock()` para dependências externas (Resend, BullMQ)
- Use banco de dados de teste real (PostgreSQL via Docker) para testes de integração
- **Nunca** mocke o Prisma em testes de integração — use um banco separado com `DATABASE_URL_TEST`

### Cobertura Mínima

- **Services**: 80% de cobertura
- **Controllers**: 70% de cobertura
- **Portal do fornecedor**: 90% (fluxo crítico)

---

## 2. SOLID

### S — Single Responsibility (Responsabilidade Única)

Cada classe/módulo faz **uma coisa só**.

```ts
// ❌ ERRADO — Service faz lógica + envia e-mail + gera token
class QuotationService {
  async publish(id: string) {
    // valida cotação
    // gera magic links
    // envia e-mails
    // atualiza status
  }
}

// ✅ CERTO — Cada responsabilidade isolada
class QuotationService {
  async publish(id: string) {
    await this.validateForPublishing(id);
    const links = await this.magicLinkService.generateForQuotation(id);
    await this.mailService.sendQuotationEmails(id, links);
    await this.updateStatus(id, 'OPEN');
  }
}
```

### O — Open/Closed (Aberto/Fechado)

Extensível sem modificar código existente.

```ts
// ✅ Novos planos adicionados sem mudar o guard
const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { suppliers: 10, products: 50, quotations: 5, emailsPerMonth: 20 },
  PRO: { suppliers: Infinity, products: Infinity, quotations: Infinity, emailsPerMonth: Infinity },
  // Futuro: ENTERPRISE: { ... }
};
```

### L — Liskov Substitution (Substituição de Liskov)

Subtipos devem ser substituíveis por seus tipos base.

```ts
// ✅ Qualquer MailProvider pode ser trocado sem quebrar o sistema
interface MailProvider {
  send(to: string, subject: string, html: string): Promise<void>;
}

class ResendProvider implements MailProvider { ... }
class SESProvider implements MailProvider { ... } // Futuro
```

### I — Interface Segregation (Segregação de Interfaces)

Interfaces pequenas e específicas.

```ts
// ❌ Interface gigante
interface QuotationRepository {
  create(); findAll(); findById(); update(); delete();
  publish(); close(); duplicate();
  generateLinks(); sendEmails();
}

// ✅ Interfaces segregadas
interface CrudRepository<T> { create(); findAll(); findById(); update(); delete(); }
interface Publishable { publish(); close(); }
```

### D — Dependency Inversion (Inversão de Dependência)

Dependa de abstrações, não de implementações.

```ts
// ✅ NestJS já faz isso com Dependency Injection
@Injectable()
class QuotationService {
  constructor(
    private readonly prisma: PrismaService,        // Abstração
    private readonly mailService: MailService,      // Abstração
    private readonly magicLinkService: MagicLinkService, // Abstração
  ) {}
}
```

---

## 3. Convenções de Código

### Nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Arquivos | kebab-case | `quotation-supplier.service.ts` |
| Classes | PascalCase | `QuotationService` |
| Variáveis/funções | camelCase | `findByTenantId()` |
| Constantes | UPPER_SNAKE | `MAX_FREE_SUPPLIERS` |
| DTOs | PascalCase + sufixo `Dto` | `CreateCategoryDto` |
| Enums | PascalCase (valores UPPER) | `QuotationStatus.DRAFT` |
| Tabelas DB | PascalCase (Prisma) | `QuotationSupplier` |
| Rotas API | kebab-case, plural | `/api/quotation-suppliers` |

### Estrutura de Módulos (NestJS)

```
modules/
└── category/
    ├── category.module.ts          ← Declaração do módulo
    ├── category.controller.ts      ← Endpoints REST
    ├── category.service.ts         ← Lógica de negócio
    ├── category.service.spec.ts    ← Testes unitários
    ├── category.controller.spec.ts ← Testes de integração
    └── dto/
        ├── create-category.dto.ts
        ├── update-category.dto.ts
        └── query-category.dto.ts
```

### Estrutura de Componentes (React)

```
components/
└── Button/
    ├── Button.tsx       ← Componente
    ├── Button.css       ← Estilos (CSS Modules ou vanilla)
    └── index.ts         ← Re-export
```

---

## 4. Padrões de API

### Respostas Padronizadas

```ts
// Sucesso
{ "data": { ... } }

// Lista com paginação
{ "data": [...], "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }

// Erro
{ "statusCode": 400, "message": "Dados inválidos. Verifique os campos informados.", "error": "RequisicaoInvalida", "correlationId": "abc-123" }
```

### Mensagens de Erro

Todas as mensagens expostas ao usuário (API e frontend) devem estar em **português** e **não revelar detalhes internos** da aplicação.

#### Regras obrigatórias

- **Sempre** escrever mensagens de erro em português claro e amigável
- **Nunca** expor nomes de tabelas, recursos internos, enums de banco ou stack traces na resposta da API
- **Nunca** mencionar tecnologias internas (Firebase, Prisma, Tenant, UUID, token JWT, etc.) em mensagens ao usuário
- **Nunca** incluir IDs internos, SQL ou detalhes de infraestrutura em mensagens de erro
- **Nunca** repassar `error.response.data.message` diretamente no frontend sem sanitização
- **Sempre** usar constantes centralizadas no backend (`apps/api/src/common/constants/error-messages.ts`)
- **Sempre** usar `getApiErrorMessage()` no frontend (`apps/web/src/lib/errors.ts`)
- **Sempre** registrar detalhes técnicos apenas nos logs do servidor

#### O que pode ser exposto

| Permitido | Proibido |
|---|---|
| Nomes de entidades de negócio (categoria, produto, cotação) | Nomes de tabelas (`QuotationSupplier`, `MagicLink`) |
| Regras de negócio compreensíveis | Enums internos (`DRAFT`, `OPEN`, `PENDING`) |
| Mensagens de validação de formulário (DTOs) | Termos técnicos (`Unauthorized`, `Forbidden`, `Tenant`) |
| Limite de plano com CTA de upgrade | Metadados internos (`limit`, `current`, `resource`, `plan`) |

#### Backend (NestJS)

```ts
// ❌ ERRADO — expõe tecnologia interna
throw new UnauthorizedException('Invalid Firebase token');
throw new NotFoundException('User not registered in local database');
throw new BadRequestException(`Item inválido na proposta: ${item.id}`);
throw new ForbiddenException({
  message: 'Limite atingido',
  resource: 'suppliers',  // vaza recurso interno
  plan: 'FREE',
});

// ✅ CERTO — genérico, em português, sem vazamento
import { AUTH_UNAUTHORIZED_MESSAGE } from '../../common/constants/error-messages.js';

throw new UnauthorizedException(AUTH_UNAUTHORIZED_MESSAGE);
throw new NotFoundException('Recurso não encontrado.');
throw new BadRequestException('Item inválido na proposta.');
throw new ForbiddenException(PLAN_LIMIT_MESSAGE);
```

Constantes disponíveis em `error-messages.ts`:

| Constante | Mensagem |
|---|---|
| `AUTH_UNAUTHORIZED_MESSAGE` | Não autorizado. |
| `AUTH_CONFLICT_MESSAGE` | Não foi possível concluir o cadastro. |
| `PLAN_LIMIT_MESSAGE` | Limite do plano Free atingido. Faça upgrade para o plano Pro. |
| `NOT_FOUND_MESSAGE` | Recurso não encontrado. |
| `SERVICE_UNAVAILABLE_MESSAGE` | Serviço temporariamente indisponível. |
| `INTERNAL_ERROR_MESSAGE` | Erro interno do servidor. |

Erros 500 são sempre sanitizados pelo `GlobalExceptionFilter` — o cliente recebe apenas `INTERNAL_ERROR_MESSAGE`.

#### Frontend (React)

```tsx
// ❌ ERRADO — repassa mensagem crua da API
toast.error(error.response?.data?.message || 'Erro ao salvar.');

// ✅ CERTO — usa utilitário que sanitiza e traduz
import { getApiErrorMessage } from '../lib/errors.js';

toast.error(getApiErrorMessage(error, 'Erro ao salvar produto.'));
```

O `getApiErrorMessage()` mapeia status HTTP para mensagens seguras:

| Status | Mensagem padrão |
|---|---|
| `401` | Sessão expirada ou credenciais inválidas. |
| `403` | Limite do plano Free atingido. Faça upgrade para o plano Pro. |
| `404` | Usa o fallback contextual da página |
| `409` | Não foi possível concluir a operação. Verifique os dados informados. |
| `400` | Repassa mensagem de validação apenas se for segura (sem termos técnicos) |

#### DTOs (class-validator)

Mensagens de validação também devem estar em português:

```ts
// ❌ ERRADO
@MinLength(2, { message: 'Name must be at least 2 characters long' })

// ✅ CERTO
@MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
```

### Status HTTP

| Código | Quando usar |
|---|---|
| `200` | GET/PATCH com sucesso |
| `201` | POST com criação |
| `204` | DELETE com sucesso |
| `400` | Validação de input |
| `401` | Sem autenticação |
| `403` | Sem permissão ou limite do plano |
| `404` | Recurso não encontrado |
| `409` | Conflito (duplicado, estado inválido) |
| `429` | Rate limit excedido |
| `500` | Erro interno |

### Versionamento

- Prefixo `/api` em todas as rotas (configurado no `main.ts`)
- Sem versionamento no MVP (`/api/categories`)
- Futuro: `/api/v2/categories`

---

## 5. Git

### Branches

```
main        ← Produção (protegida)
develop     ← Desenvolvimento
feature/*   ← Features (feature/02-autenticacao)
fix/*       ← Correções (fix/login-redirect)
```

### Commits (Conventional Commits)

```
feat(auth): implementar registro de usuário
fix(quotation): corrigir cálculo do total
test(supplier): adicionar testes do CRUD
refactor(prisma): extrair tenant filter para middleware
docs(readme): atualizar instruções de setup
chore(docker): atualizar versão do PostgreSQL
```

### Pull Requests

- Título segue Conventional Commits
- Descrição inclui: o que foi feito, como testar, screenshots (se UI)
- Testes devem passar antes de merge
- Mínimo 1 aprovação (quando houver equipe)

---

## 6. Segurança

- **Nunca** commitar `.env`, secrets ou API keys
- **Nunca** logar dados sensíveis (senhas, tokens, CPFs)
- **Nunca** retornar senhas ou tokens internos na resposta da API
- **Nunca** expor detalhes internos em mensagens de erro (ver seção 4 — Mensagens de Erro)
- **Sempre** usar `ValidationPipe` com `whitelist: true`
- **Sempre** filtrar por `tenantId` em toda query
- **Sempre** usar parâmetros preparados (Prisma já faz isso)
- **Sempre** validar e sanitizar inputs

---

## 7. Performance

- **Prisma**: usar `select` para buscar apenas campos necessários
- **Prisma**: usar `include` com cuidado — evitar N+1
- **Paginação**: obrigatória em todo `findMany` (default: 20 itens)
- **Índices**: criar índices para campos usados em `where` e `orderBy`
- **Frontend**: lazy loading de rotas com `React.lazy()`
- **Frontend**: usar `react-query` para cache e deduplicação

---

## 8. Checklist por Task

Antes de considerar uma task como concluída:

- [ ] Testes escritos **antes** da implementação (TDD)
- [ ] Todos os testes passam (`yarn test`)
- [ ] Código segue SOLID
- [ ] Sem `any` no TypeScript (strict mode)
- [ ] DTOs com validação completa
- [ ] Queries filtradas por `tenantId`
- [ ] Tratamento de erros adequado
- [ ] Mensagens de erro em português, sem vazamento de detalhes internos
- [ ] Frontend usa `getApiErrorMessage()` para exibir erros da API
- [ ] Logs em pontos relevantes
- [ ] Commit segue Conventional Commits
- [ ] Sem secrets no código
