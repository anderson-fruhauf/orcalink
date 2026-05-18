# Task 16 — Cotações Pages (Frontend)

## Objetivo
Telas de gestão de cotações no painel do comprador.

## Páginas

### `/quotations` — Listagem
- Tabs: Todas | Rascunho | Abertas | Encerradas
- Cards ou tabela com: título, status (badge), prazo, nº de itens, nº de respostas
- Botão "Nova Cotação"

### `/quotations/new` — Criar Cotação
- Step 1: Título + Data limite
- Step 2: Adicionar produtos (busca + select com quantidade e observação)
- Step 3: Selecionar fornecedores (checkboxes)
- Botão "Salvar como Rascunho" e "Publicar Agora"

### `/quotations/:id` — Detalhe
- Header: título, status, deadline, ações (publicar/encerrar/duplicar)
- Aba "Itens": lista de produtos com quantidades
- Aba "Fornecedores": status de cada (Pendente/Respondido/Expirado) + ações (copiar link, reenviar email)
- Aba "Comparativo": matriz comparativa (task 19)
- Botão compartilhar: Web Share API + fallback copiar link

## Critérios de Aceite
- [ ] Criar cotação com itens e fornecedores funciona
- [ ] Publicar gera links e envia e-mails
- [ ] Status de cada fornecedor visível
- [ ] Copiar/compartilhar link funciona
- [ ] Duplicar cotação funciona

## Refs
- PRD: RF08-RF17
