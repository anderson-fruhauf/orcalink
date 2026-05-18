# Task 04 — Guard de Limites do Plano

## Objetivo
Impedir que tenants no plano Free excedam os limites antes de criar recursos.

## O que fazer

1. **PlanLimitGuard** (`src/common/guards/plan-limit.guard.ts`):
   - Verifica o plano do tenant antes de operações de criação
   - Busca contagem atual do recurso no banco
   - Compara com o limite definido para o plano

2. **Limites (configuráveis via constantes)**:

   | Recurso | Free | Pro |
   |---|---|---|
   | Cotações ativas | 5 | Ilimitado |
   | Fornecedores | 10 | Ilimitado |
   | Produtos | 50 | Ilimitado |
   | E-mails/mês | 20 | Ilimitado |

3. **Decorator `@CheckPlanLimit(resource)`**:
   - Aplicado em endpoints de criação
   - Ex: `@CheckPlanLimit('suppliers')` no POST `/suppliers`

4. **Resposta ao exceder**:
   - HTTP 403 com mensagem: `"Limite do plano Free atingido. Faça upgrade para o plano Pro."`
   - Body inclui: `{ limit, current, resource, plan }`

## Critérios de Aceite
- [ ] Tenant Free não consegue criar mais de 10 fornecedores (retorna 403)
- [ ] Tenant Pro não tem limitação
- [ ] Resposta de erro inclui dados úteis para o frontend exibir

## Refs
- PRD: RN05, Seção 10 (Monetização)
