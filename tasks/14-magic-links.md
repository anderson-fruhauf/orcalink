# Task 14 — Magic Links (Geração + Validação)

## Objetivo
Gerar tokens seguros para magic links e validar acesso no portal do fornecedor.

## O que fazer

### Geração (ao publicar cotação)
- Para cada `QuotationSupplier`, gerar token: `HMAC-SHA256(uuid, MAGIC_LINK_SECRET)`
- Salvar token na coluna `token` de `QuotationSupplier`
- URL final: `{APP_URL}/v/{token}`

### Validação (GET `/portal/:token`)
- Buscar `QuotationSupplier` pelo token
- Verificar: cotação não está CLOSED, deadline não expirou
- Resposta genérica para token inválido (sem distinção "não existe" vs "expirado")
- Se válido: retornar dados da cotação (itens, quantidades, nome empresa)
- Se já respondido: retornar dados preenchidos em modo read-only

### Endpoint de copiar/compartilhar
- GET `/quotations/:id/links` — retorna lista de magic links com status de cada fornecedor
- POST `/quotations/:id/resend/:supplierId` — reenvia e-mail

## Critérios de Aceite
- [ ] Token gerado é único e não reversível
- [ ] Token inválido retorna 404 genérico
- [ ] Token de cotação encerrada retorna mensagem de expiração
- [ ] Token já respondido retorna dados em read-only
- [ ] Endpoint de links retorna URLs prontas

## Refs
- PRD: RF13, RF15, RF16, RF17, RNF06, RNF08
