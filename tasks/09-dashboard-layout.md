# Task 09 — Dashboard Layout (Frontend)

## Objetivo
Criar o layout principal do painel do comprador com sidebar, header e área de conteúdo.

## Componentes
- **DashboardLayout.tsx**: Sidebar (260px) + Header + `<Outlet />`
- **Sidebar**: Logo, menu com ícones Lucide, badge do plano, item ativo destacado, drawer em mobile
- **Header**: Breadcrumb + nome do user + logout
- **Dashboard Home** (`/dashboard`): Cards KPI (cotações ativas, fornecedores, produtos, pendentes)

## Critérios de Aceite
- [ ] Layout renderiza com sidebar + header + conteúdo
- [ ] Navegação entre páginas funciona via react-router
- [ ] Sidebar collapsa em mobile
- [ ] Cards KPI buscam dados reais da API

## Refs
- Design: styles.md seção 9.1, 6.6
