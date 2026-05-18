# Task 08 — Auth Pages (Frontend)

## Objetivo
Implementar as telas de autenticação no frontend React.

## Páginas

### `/login`
- Campos: email, senha
- Botão "Entrar" (btn-primary)
- Link "Esqueceu a senha?" → `/forgot-password`
- Link "Criar conta" → `/register`
- Salvar JWT no localStorage
- Redirecionar para `/dashboard` após login

### `/register`
- Campos: nome, email, nome da empresa, senha, confirmar senha
- Validação com react-hook-form + zod
- Após registro, logar automaticamente e ir para `/dashboard`

### `/forgot-password`
- Campo: email
- Mensagem de sucesso genérica (não revelar se email existe)

## Especificações Visuais
- Layout centralizado (max-width: 440px)
- Card com shadow-lg, padding 40px
- Logo Orçalink no topo
- Background: neutral-50
- Inputs seguindo styles.md seção 6.2
- Botões seguindo styles.md seção 6.1
- Toast de erro via react-hot-toast

## Critérios de Aceite
- [ ] Login funcional com JWT persistido
- [ ] Registro cria conta e loga automaticamente
- [ ] Validação de formulários no client-side
- [ ] Tela responsiva (mobile ok)
- [ ] Redireciona para login se JWT expirado

## Refs
- PRD: RF01, RF02
- Design: styles.md seção 6.1, 6.2
