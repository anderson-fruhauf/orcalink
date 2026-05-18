# Task 06 — CRUD Produtos (Backend)

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/products` | Criar produto |
| GET | `/products` | Listar (busca + filtro por categoria + paginação) |
| GET | `/products/:id` | Detalhe |
| PATCH | `/products/:id` | Atualizar |
| DELETE | `/products/:id` | Excluir |

## DTOs
- **CreateProductDto**: `{ name, description?, unit, internalCode?, categoryId }`
- `unit` deve ser enum: `UN`, `KG`, `LITRO`, `CX`, `M`, `M2`, `M3`
- `categoryId` deve existir e pertencer ao mesmo tenant

## Regras
- Filtrar por `tenantId` em tudo
- Filtro opcional por `categoryId`
- Não excluir produto vinculado a cotação ativa (status OPEN)
- Guard de limite do plano (`@CheckPlanLimit('products')`)

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Filtro por categoria funciona
- [ ] Busca textual por nome funciona
- [ ] Validação de unidade de medida
- [ ] Limite do plano Free respeitado (max 50)

## Refs
- PRD: RF05, RF07
