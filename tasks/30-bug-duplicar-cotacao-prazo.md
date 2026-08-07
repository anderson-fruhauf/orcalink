# Task 30 — Bug: Prazo ao duplicar cotação (cotação retroativa)

> **Tipo:** Bug  
> **Severidade:** Média  
> **Camada:** Backend (+ Frontend)  
> **Depende de:** 13 (Cotações Backend), 16 (Cotações Pages)

## Objetivo

Ao duplicar uma cotação, o prazo de resposta (`deadline`) não deve ser copiado cegamente da original — isso cria rascunhos com prazo no passado (cotação “retroativa”), que falham na validação de publicação / confunde o usuário.

## Contexto / Evidência

`QuotationService.duplicate()` copia o deadline literalmente:

```typescript
// quotation.service.ts
const newQuotation = await tx.quotation.create({
  data: {
    title: `${quotation.title} (Cópia)`,
    deadline: quotation.deadline, // ← prazo antigo (pode estar no passado)
    status: 'DRAFT',
  },
});
```

No formulário de criação (`QuotationForm`), o prazo já exige futuro (`O prazo de resposta deve ser no futuro.`). A cópia ignora essa regra e deixa o usuário com um DRAFT inválido para publicar.

## O que fazer

1. **Definir comportamento ao duplicar** (escolher e documentar):
   - **A (recomendado):** não copiar o prazo — exigir que o usuário defina um novo `deadline` na cópia (campo vazio / `null` se o schema permitir, ou redirecionar ao form com prazo em branco)
   - **B:** copiar só se ainda for futuro; se passado, limpar / forçar revisão
   - **C:** copiar e somar um offset (ex. +7 dias a partir de hoje) — menos preferível (prazo silencioso)

2. **Backend**
   - Ajustar `duplicate()` conforme a opção escolhida
   - Se o schema exige `deadline` not-null, usar placeholder futuro mínimo **somente se** o fluxo frontend forçar revisão imediata; preferir fluxo que obrigue o usuário a escolher

3. **Frontend**
   - Após `POST /quotations/:id/duplicate`, abrir o form/edição da cópia destacando o prazo para revisão
   - Validar prazo futuro antes de salvar/publicar (já existe no form — garantir que a cópia passe por ele)

4. **Testes**
   - Duplicar cotação com `deadline` no passado → cópia **não** fica publicável com prazo vencido
   - Duplicar cotação com prazo futuro → comportamento alinhado à opção escolhida

## Critérios de Aceite

- [ ] Duplicar cotação com prazo vencido **não** resulta em DRAFT publicável com deadline no passado
- [ ] Usuário é obrigado a revisar/definir o prazo na cópia
- [ ] Título `(Cópia)` e itens continuam sendo copiados
- [ ] Teste unitário cobre o cenário de deadline passado

## Refs

- `apps/api/src/modules/quotation/quotation.service.ts` — `duplicate()`
- `apps/web/src/pages/QuotationDetail.tsx` — chamada `POST /quotations/:id/duplicate`
- `apps/web/src/pages/QuotationForm.tsx` — validação de prazo futuro
