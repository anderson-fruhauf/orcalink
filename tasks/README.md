# Tasks do MVP — Orçalink

Este diretório contém todas as tarefas necessárias para implementar o MVP (P0) do Orçalink.

## Como usar

- Cada arquivo `XX-nome-da-task.md` é uma tarefa independente
- As tasks estão **numeradas por ordem de dependência** — execute na sequência
- Cada task contém: objetivo, contexto, critérios de aceite e referências ao PRD

## Visão geral

| # | Task | Camada | Depende de |
|---|---|---|---|
| 00 | Scaffold dos projetos | Infra | — |
| 01 | Schema Prisma + Migrations | Backend | 00 |
| 02 | Autenticação (Register/Login/JWT) | Backend | 01 |
| 03 | Multi-Tenancy Middleware | Backend | 02 |
| 04 | Guard de Limites do Plano | Backend | 03 |
| 05 | CRUD Categorias | Backend | 03 |
| 06 | CRUD Produtos | Backend | 05 |
| 07 | CRUD Fornecedores | Backend | 05 |
| 08 | Auth Pages (Login/Register) | Frontend | 02 |
| 09 | Dashboard Layout (Sidebar/Header) | Frontend | 08 |
| 10 | Categorias Pages | Frontend | 05, 09 |
| 11 | Produtos Pages | Frontend | 06, 09 |
| 12 | Fornecedores Pages | Frontend | 07, 09 |
| 13 | Cotações Backend (CRUD + Estados) | Backend | 06, 07 |
| 14 | Magic Links (Geração + Validação) | Backend | 13 |
| 15 | Disparo de E-mail (Cloud Tasks + Resend) | Backend | 14 |
| 16 | Cotações Pages (Criar/Listar/Detalhe) | Frontend | 13, 09 |
| 17 | Portal do Fornecedor — Backend | Backend | 14 |
| 18 | Portal do Fornecedor — Frontend | Frontend | 17 |
| 19 | Matriz Comparativa | Frontend | 17, 16 |
| 20 | Encerramento + Expiração Automática | Backend | 13 |
| 21 | Segurança (Rate Limit, CORS, Helmet) | Backend | 03 |
| 22 | Observabilidade (Logs, Health Checks) | Backend | 00 |
| 24 | Fila Assíncrona (Google Cloud Tasks) | Infra + Backend | 15, 20, 22 |

> A task **24** revisa o RNF05 e substitui **BullMQ + Redis** por **Cloud Tasks + Cloud Scheduler**.
> Ela é numerada por último por ter sido decidida depois, mas afeta as tasks 15, 20, 22 e 23.

## P1 — Automação (v1.1)

Tasks fora do MVP, executadas após o P0.

| # | Task | Camada | Depende de |
|---|---|---|---|
| 23 | Integração WhatsApp (QR Code, não-oficial) | Backend + Frontend | 14, 15, 16, 22, 24 |
