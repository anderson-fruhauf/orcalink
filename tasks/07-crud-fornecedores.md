# Task 07 — CRUD Fornecedores (Backend)

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/suppliers` | Criar fornecedor |
| GET | `/suppliers` | Listar (busca + filtro por categoria + paginação) |
| GET | `/suppliers/:id` | Detalhe |
| PATCH | `/suppliers/:id` | Atualizar |
| DELETE | `/suppliers/:id` | Excluir |

## DTOs
- **CreateSupplierDto**: `{ name, document?, contactName, email, phone?, categoryIds[] }`
- `email` deve ser válido
- `categoryIds` — array de IDs de categorias atendidas (relação N:N)

## Regras
- Filtrar por `tenantId` em tudo
- Filtro por categoria via tabela pivot `SupplierCategory`
- Ao criar/atualizar, sincronizar `categoryIds` (delete existing + create new)
- Não excluir fornecedor com proposta pendente (status PENDING em cotação OPEN)
- Guard de limite do plano (`@CheckPlanLimit('suppliers')`)

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Vinculação com múltiplas categorias funciona
- [ ] Filtro por categoria funciona
- [ ] Limite do plano Free respeitado (max 10)

## Refs
- PRD: RF06, RF07
