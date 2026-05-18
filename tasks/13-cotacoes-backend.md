# Task 13 — Cotações Backend (CRUD + Estados)

## Objetivo
API completa de cotações com máquina de estados (Rascunho → Aberta → Encerrada).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/quotations` | Criar cotação (status: DRAFT) |
| GET | `/quotations` | Listar (filtro por status, busca, paginação) |
| GET | `/quotations/:id` | Detalhe com itens e fornecedores |
| PATCH | `/quotations/:id` | Atualizar título/deadline (só DRAFT) |
| DELETE | `/quotations/:id` | Excluir (só DRAFT) |
| POST | `/quotations/:id/items` | Adicionar item (productId + quantity + notes) |
| DELETE | `/quotations/:id/items/:itemId` | Remover item |
| POST | `/quotations/:id/suppliers` | Associar fornecedores (array de supplierIds) |
| POST | `/quotations/:id/publish` | Transição DRAFT → OPEN (gera magic links) |
| POST | `/quotations/:id/close` | Transição OPEN → CLOSED |
| POST | `/quotations/:id/duplicate` | Duplicar cotação como novo DRAFT |

## Regras
- Só editar/excluir cotações em DRAFT
- Ao publicar: gerar magic link (token) para cada fornecedor
- Ao encerrar: invalidar todos magic links pendentes
- Guard de limite do plano na criação

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Máquina de estados respeita transições válidas
- [ ] Publicar gera tokens únicos por fornecedor
- [ ] Duplicar cria nova cotação com mesmos itens/quantidades
- [ ] Encerrar invalida links pendentes

## Refs
- PRD: RF08-RF13, RF16, RF17, RF29
