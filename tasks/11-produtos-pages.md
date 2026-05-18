# Task 11 — Produtos Pages (Frontend)

## Objetivo
Telas CRUD de produtos no painel do comprador.

## Páginas
- **`/products`**: Listagem com busca, filtro por categoria, paginação
- **`/products/new`** e **`/products/:id/edit`**: Formulário com campos: nome, descrição, unidade (select), código interno, categoria (select)

## Componentes
- Reutilizar `DataTable` da task 10
- Select de categorias com busca
- Alerta de limite do plano se atingido (403 da API)

## Critérios de Aceite
- [ ] CRUD completo funciona
- [ ] Filtro por categoria funciona
- [ ] Select de unidade de medida com opções corretas
- [ ] Mensagem de limite do plano quando 403

## Refs
- PRD: RF05, RF07
