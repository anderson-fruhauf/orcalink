# Task 17 — Portal do Fornecedor (Backend)

## Objetivo
API pública (sem autenticação) para o fornecedor preencher e enviar proposta.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/portal/:token` | Dados da cotação (itens, empresa, prazo) |
| POST | `/portal/:token` | Enviar proposta |

### GET `/portal/:token` — Response
```json
{
  "companyName": "Empresa ABC",
  "quotationTitle": "Suprimentos Q2",
  "deadline": "2026-06-01",
  "daysRemaining": 14,
  "status": "open",
  "items": [
    { "id": "...", "name": "Produto X", "unit": "Un", "quantity": 50, "notes": "Cor preta" }
  ],
  "alreadyResponded": false
}
```

### POST `/portal/:token` — Body
```json
{
  "deliveryDays": 5,
  "paymentCondition": "Faturado 30 dias",
  "notes": "Entrega parcial possível",
  "items": [
    { "quotationItemId": "...", "priceInCents": 15000, "unavailable": false },
    { "quotationItemId": "...", "priceInCents": null, "unavailable": true }
  ]
}
```

## Regras (Poka-yoke)
- Todos os itens devem ter `priceInCents > 0` OU `unavailable: true`
- Não permitir envio duplo (token já respondido)
- Após envio: atualizar status para RESPONDED + registrar respondedAt

## Critérios de Aceite
- [ ] GET retorna dados corretos
- [ ] POST valida todos os itens (nenhum em branco)
- [ ] POST duplicado retorna 409
- [ ] Token inválido/expirado retorna erro genérico
- [ ] Preços armazenados em centavos

## Refs
- PRD: RF18-RF26, RN01, RN02
