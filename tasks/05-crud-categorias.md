# Task 05 — CRUD Categorias (Backend)

## Objetivo
API REST completa para gestão de categorias de produtos.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/categories` | Criar categoria |
| GET | `/categories` | Listar (com busca + paginação) |
| GET | `/categories/:id` | Detalhe |
| PATCH | `/categories/:id` | Atualizar |
| DELETE | `/categories/:id` | Excluir (soft ou validar dependentes) |

## DTOs
- **CreateCategoryDto**: `{ name: string }` — name obrigatório, min 2 chars
- **UpdateCategoryDto**: `{ name?: string }`
- **QueryCategoryDto**: `{ search?: string, page?: number, limit?: number }`

## Regras
- Nome único por tenant (`@@unique([name, tenantId])`)
- Não excluir categoria com produtos vinculados (retornar 409)
- Todas as queries filtradas por `tenantId`

## Critérios de Aceite
- [ ] CRUD completo funciona via API
- [ ] Busca textual por nome funciona
- [ ] Paginação retorna `{ data, total, page, totalPages }`
- [ ] Categoria de tenant A não aparece para tenant B
- [ ] Não é possível criar duas categorias com mesmo nome no mesmo tenant

## Refs
- PRD: RF04, RF07
