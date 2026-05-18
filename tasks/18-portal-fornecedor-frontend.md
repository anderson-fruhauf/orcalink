# Task 18 — Portal do Fornecedor (Frontend)

## Objetivo
Interface mobile-first pública onde o fornecedor preenche preços e envia proposta.

## Rota
- `/v/:token` — rota pública, sem auth, sem sidebar

## Layout
- Max-width: 480px, centralizado
- Header: logo da empresa + título da cotação + countdown do prazo
- Progress bar no topo (% itens preenchidos)

## Para cada item
- Nome do produto + unidade + quantidade
- Campo monetário: `inputmode="numeric"`, `type="text"`, prefixo "R$", alinhado à direita
- Máscara de centavos (digitar "15000" → "R$ 150,00")
- Fonte: JetBrains Mono, semi-bold
- Toggle "Não tenho este item" — desabilita campo de preço

## Rodapé do formulário
- Prazo de entrega (input numérico + "dias úteis")
- Condição de pagamento (dropdown: "Pix à vista", "Faturado 30 dias", etc)
- Observações (textarea opcional)

## Botão de envio
- "Enviar Proposta" — sticky no bottom, btn-primary btn-lg, full-width
- Validação Poka-yoke: scroll até item pendente + shake animation
- Após envio: tela de sucesso com check animado + confetti

## Auto-save
- Salvar no localStorage a cada mudança de campo
- Restaurar ao reabrir o mesmo token

## Critérios de Aceite
- [ ] Máscara monetária funciona (modo centavos)
- [ ] Teclado numérico abre no mobile
- [ ] Toggle "Não tenho" desabilita campo
- [ ] Validação impede envio com itens em branco
- [ ] Auto-save funciona
- [ ] Tela de sucesso exibe após envio
- [ ] Layout funciona em 320px de largura

## Refs
- PRD: RF18-RF26
- Design: styles.md seção 6.2, 6.7, 7, 9.2, 9.3
