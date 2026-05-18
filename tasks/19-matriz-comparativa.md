# Task 19 — Matriz Comparativa (Frontend)

## Objetivo
Tabela cross-tab que compara preços de todos os fornecedores lado a lado.

## Layout
- Linhas = produtos, Colunas = fornecedores que responderam
- Última linha = total acumulado por fornecedor
- Valores em JetBrains Mono, alinhados à direita

## Destaques automáticos
- **Menor preço unitário** por item: fundo `success-50`, texto `success-700`, bold
- **Menor total**: coluna inteira destacada com borda `success-500`
- **Indisponível**: fundo `neutral-50`, texto "—" em itálico

## Funcionalidades
- Header sticky (scroll vertical)
- Primeira coluna (nome do produto) sticky (scroll horizontal)
- Hover na linha destaca toda a row
- Tooltip no hover da célula: "Fornecedor X — R$ Y,YY"

## Critérios de Aceite
- [ ] Matriz renderiza corretamente com N fornecedores
- [ ] Menor preço destacado automaticamente por item
- [ ] Menor total destacado
- [ ] Itens indisponíveis exibidos corretamente
- [ ] Scroll horizontal funciona com coluna fixa
- [ ] Funciona com 0 respostas (empty state)

## Refs
- PRD: RF27, RF28
- Design: styles.md seção 6.5
