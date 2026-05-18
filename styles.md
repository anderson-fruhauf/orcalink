# Orcalink — Design System & Especificação Visual

> **Orca** = Orçamento | **Link** = Conexão.
> Visual premium, moderno, data-driven. Inspiração: Linear, Stripe, Vercel.

---

## 1. Identidade Visual

### Filosofia
- **Clean & Functional:** Interfaces limpas com foco em dados e ações
- **Premium B2B:** Sensação de produto maduro e confiável
- **Mobile-First (Fornecedor):** Ultra-simplificado, carregamento instantâneo
- **Data-Dense (Comprador):** Dashboards densos mas legíveis

### Logotipo
- Wordmark moderna com peso semi-bold
- Ícone: abstração geométrica de "links conectados" representando a ponte comprador↔fornecedor
- Versões: Full (wordmark + ícone), Compacta (ícone only), Monocromática

---

## 2. Paleta de Cores

### Modo Claro (Padrão)

```css
:root {
  /* --- Primary (Indigo profundo — confiança, profissionalismo) --- */
  --primary-50:  #EEF2FF;
  --primary-100: #E0E7FF;
  --primary-200: #C7D2FE;
  --primary-300: #A5B4FC;
  --primary-400: #818CF8;
  --primary-500: #6366F1;  /* COR PRINCIPAL */
  --primary-600: #4F46E5;
  --primary-700: #4338CA;
  --primary-800: #3730A3;
  --primary-900: #312E81;

  /* --- Accent (Violet vibrante — CTAs, destaques) --- */
  --accent-400: #A78BFA;
  --accent-500: #8B5CF6;
  --accent-600: #7C3AED;

  /* --- Success (Verde — menor preço, aprovações) --- */
  --success-50:  #F0FDF4;
  --success-100: #DCFCE7;
  --success-500: #22C55E;
  --success-600: #16A34A;
  --success-700: #15803D;

  /* --- Warning (Amber — pendências, prazos) --- */
  --warning-50:  #FFFBEB;
  --warning-100: #FEF3C7;
  --warning-500: #F59E0B;
  --warning-600: #D97706;

  /* --- Danger (Rose — erros, expirados) --- */
  --danger-50:  #FFF1F2;
  --danger-100: #FFE4E6;
  --danger-500: #F43F5E;
  --danger-600: #E11D48;

  /* --- Neutrals (Slate — textos, bordas, backgrounds) --- */
  --neutral-0:   #FFFFFF;
  --neutral-25:  #FCFCFD;
  --neutral-50:  #F8FAFC;
  --neutral-100: #F1F5F9;
  --neutral-200: #E2E8F0;
  --neutral-300: #CBD5E1;
  --neutral-400: #94A3B8;
  --neutral-500: #64748B;
  --neutral-600: #475569;
  --neutral-700: #334155;
  --neutral-800: #1E293B;
  --neutral-900: #0F172A;
  --neutral-950: #020617;
}
```

### Modo Escuro

```css
[data-theme="dark"] {
  --bg-primary:    #0B0F1A;
  --bg-secondary:  #111827;
  --bg-tertiary:   #1F2937;
  --bg-elevated:   #1A1F2E;

  --surface-card:  rgba(255, 255, 255, 0.04);
  --surface-hover: rgba(255, 255, 255, 0.06);

  --border-default: rgba(255, 255, 255, 0.08);
  --border-hover:   rgba(255, 255, 255, 0.12);

  --text-primary:   #F1F5F9;
  --text-secondary: #94A3B8;
  --text-tertiary:  #64748B;
  --text-disabled:  #475569;
}
```

### Uso Semântico

| Token | Uso | Light | Dark |
|---|---|---|---|
| `--bg-page` | Fundo da página | `--neutral-50` | `--bg-primary` |
| `--bg-card` | Cards e painéis | `--neutral-0` | `--surface-card` |
| `--bg-input` | Campos de formulário | `--neutral-0` | `--bg-tertiary` |
| `--text-heading` | Títulos | `--neutral-900` | `--text-primary` |
| `--text-body` | Texto corrido | `--neutral-600` | `--text-secondary` |
| `--text-muted` | Labels, placeholders | `--neutral-400` | `--text-tertiary` |
| `--border` | Bordas padrão | `--neutral-200` | `--border-default` |
| `--ring-focus` | Anel de foco a11y | `--primary-500/40%` | `--primary-400/40%` |

---

## 3. Tipografia

### Fonte
- **Primária:** `Inter` (Google Fonts) — clean, alta legibilidade em UI
- **Mono:** `JetBrains Mono` — códigos, valores monetários na matriz
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Escala Tipográfica

| Token | Tamanho | Peso | Line-height | Uso |
|---|---|---|---|---|
| `--text-xs` | 12px | 400 | 16px | Badges, labels pequenos |
| `--text-sm` | 14px | 400 | 20px | Texto auxiliar, tabelas |
| `--text-base` | 16px | 400 | 24px | Corpo padrão |
| `--text-lg` | 18px | 500 | 28px | Subtítulos |
| `--text-xl` | 20px | 600 | 28px | Títulos de seção |
| `--text-2xl` | 24px | 700 | 32px | Títulos de página |
| `--text-3xl` | 30px | 700 | 36px | Hero, números grandes |
| `--text-4xl` | 36px | 800 | 40px | Landing page only |

### Valores Monetários
- Fonte: `JetBrains Mono` (monospace para alinhamento tabular)
- Peso: `600` (semi-bold)
- Cor do menor preço: `--success-600`
- Destaque: célula com `background: --success-50`

---

## 4. Espaçamento & Layout

### Escala de Espaçamento (Base 4px)

| Token | Valor | Uso comum |
|---|---|---|
| `--space-1` | 4px | Micro-gaps |
| `--space-2` | 8px | Gap entre ícone e texto |
| `--space-3` | 12px | Padding interno de badges |
| `--space-4` | 16px | Padding de inputs, gap de grid |
| `--space-5` | 20px | Padding de cards mobile |
| `--space-6` | 24px | Padding de cards desktop |
| `--space-8` | 32px | Gap entre seções |
| `--space-10` | 40px | Margem entre blocos |
| `--space-12` | 48px | Padding de página |
| `--space-16` | 64px | Separação de módulos |

### Grid & Breakpoints

| Breakpoint | Valor | Layout |
|---|---|---|
| `--bp-mobile` | 320px | 1 coluna, padding 16px |
| `--bp-mobile-lg` | 480px | 1 coluna, padding 20px |
| `--bp-tablet` | 768px | 2 colunas, sidebar colapsável |
| `--bp-desktop` | 1024px | Sidebar fixa + conteúdo |
| `--bp-wide` | 1280px | Sidebar + conteúdo + painel lateral |
| `--bp-ultra` | 1536px | Layout wide com mais respiro |

### Container
- Largura máxima do conteúdo: `1280px`
- Portal do Fornecedor: `480px` max-width (mobile-first)

---

## 5. Bordas, Sombras & Elevação

### Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 6px | Badges, chips |
| `--radius-md` | 8px | Inputs, botões |
| `--radius-lg` | 12px | Cards, modais |
| `--radius-xl` | 16px | Cards destacados, painéis |
| `--radius-full` | 9999px | Avatares, toggles |

### Sombras (Elevação)

```css
--shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
--shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

/* Sombra colorida para CTAs */
--shadow-primary: 0 4px 14px rgba(99, 102, 241, 0.35);
--shadow-success: 0 4px 14px rgba(34, 197, 94, 0.25);
```

### Glassmorphism (Sidebar, Modais)
```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .glass {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

---

## 6. Componentes

### 6.1. Botões

| Variante | Background | Texto | Borda | Sombra | Uso |
|---|---|---|---|---|---|
| **Primary** | `--primary-500` | `#FFF` | none | `--shadow-primary` | CTA principal |
| **Secondary** | `--neutral-100` | `--neutral-700` | `--neutral-200` | `--shadow-xs` | Ações secundárias |
| **Ghost** | `transparent` | `--neutral-600` | none | none | Ações terciárias |
| **Danger** | `--danger-500` | `#FFF` | none | none | Excluir, cancelar |
| **Success** | `--success-500` | `#FFF` | none | `--shadow-success` | Enviar proposta |

**Especificações:**
- Altura: `40px` (md), `36px` (sm), `48px` (lg — mobile CTA)
- Padding horizontal: `16px` (md), `12px` (sm), `24px` (lg)
- Border-radius: `--radius-md` (8px)
- Font-weight: `600`
- Transição: `all 150ms ease`
- Hover: `brightness(1.1)` + `translateY(-1px)`
- Active: `scale(0.98)` + `translateY(0)`
- Disabled: `opacity: 0.5` + `cursor: not-allowed`
- Focus: `box-shadow: 0 0 0 3px var(--ring-focus)`

### 6.2. Inputs

- Altura: `44px` (mobile), `40px` (desktop)
- Padding: `12px 16px`
- Border: `1.5px solid var(--border)`
- Border-radius: `--radius-md`
- Focus: borda `--primary-500` + ring `--ring-focus`
- Erro: borda `--danger-500` + texto de erro em `--danger-600`
- Label: `--text-sm`, `font-weight: 500`, `color: --text-body`
- Placeholder: `color: --text-muted`

**Campo monetário (Portal do Fornecedor):**
- Prefixo "R$" fixo à esquerda, dentro do input
- Fonte: `JetBrains Mono`, `font-weight: 600`
- Texto alinhado à direita
- `inputmode="numeric"`, `type="text"`
- Tamanho: `48px` de altura (touch-friendly)

### 6.3. Cards

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-xs);
  transition: box-shadow 200ms ease, border-color 200ms ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--primary-200);
}
```

### 6.4. Badges de Status

| Status | Background | Texto | Dot |
|---|---|---|---|
| Rascunho | `--neutral-100` | `--neutral-600` | `--neutral-400` |
| Aberta | `--primary-50` | `--primary-700` | `--primary-500` |
| Pendente | `--warning-50` | `--warning-700` | `--warning-500` (pulsante) |
| Respondido | `--success-50` | `--success-700` | `--success-500` |
| Expirado | `--danger-50` | `--danger-700` | `--danger-500` |
| Encerrada | `--neutral-100` | `--neutral-500` | `--neutral-400` |

**Spec:** `padding: 4px 10px`, `border-radius: 9999px`, `font-size: 12px`, `font-weight: 500`, dot animado com `pulse` para "Pendente"

### 6.5. Tabela / Matriz Comparativa

```css
.matrix-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--text-sm);
  width: 100%;
}

.matrix-table th {
  background: var(--neutral-50);
  font-weight: 600;
  text-align: left;
  padding: 12px 16px;
  border-bottom: 2px solid var(--neutral-200);
  position: sticky;
  top: 0;
  z-index: 10;
}

.matrix-table td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--neutral-100);
  font-family: 'JetBrains Mono', monospace;
  text-align: right;
}

/* Menor preço */
.matrix-table td.best-price {
  background: var(--success-50);
  color: var(--success-700);
  font-weight: 700;
  position: relative;
}

/* Item indisponível */
.matrix-table td.unavailable {
  background: var(--neutral-50);
  color: var(--neutral-400);
  font-style: italic;
  font-family: 'Inter', sans-serif;
}
```

### 6.6. Sidebar (Painel do Comprador)

- Largura: `260px` (desktop), colapsada `64px` (ícones only)
- Background: Glass effect em light, `--bg-secondary` em dark
- Itens: `padding: 10px 16px`, `border-radius: 8px`
- Item ativo: `background: --primary-50`, `color: --primary-700`, barra lateral `3px` em `--primary-500`
- Hover: `background: --neutral-100`
- Ícones: `20px`, stroke `1.5px` (Lucide Icons ou Phosphor Icons)
- Logo no topo com `padding: 24px 16px`
- Divider sutil entre grupos de menu

### 6.7. Toggle "Não tenho este item"

```css
.toggle-unavailable {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1.5px solid var(--neutral-200);
  cursor: pointer;
  transition: all 150ms ease;
}

.toggle-unavailable.active {
  background: var(--danger-50);
  border-color: var(--danger-200);
  color: var(--danger-600);
}
```

---

## 7. Animações & Micro-interações

### Transições Base
```css
--transition-fast:   100ms ease;
--transition-base:   150ms ease;
--transition-smooth:  200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-spring:  300ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Animações Definidas

| Nome | Uso | Spec |
|---|---|---|
| `fadeIn` | Entrada de páginas, modais | `opacity 0→1` + `translateY(8px→0)`, 200ms |
| `slideInRight` | Sidebar, painéis laterais | `translateX(100%→0)`, 250ms spring |
| `pulse` | Dot de badge "Pendente" | `scale(1→1.5→1)` + `opacity(1→0.5→1)`, 2s loop |
| `shake` | Validação de campo obrigatório | `translateX(0→-4→4→-4→0)`, 300ms |
| `scaleIn` | Aparição de toasts/notificações | `scale(0.95→1)` + `opacity(0→1)`, 150ms |
| `confetti` | Tela de sucesso do fornecedor | Partículas coloridas caindo, 2s |
| `skeleton` | Loading placeholder | Gradiente animado esquerda→direita, 1.5s loop |

### Regras de Uso
- **Nunca** animar acima de 300ms para interações de UI
- **Respeitar** `prefers-reduced-motion` — desabilitar animações decorativas
- **Skeleton loading** em toda carga de dados (nunca tela em branco)

---

## 8. Iconografia

- **Biblioteca:** Lucide Icons (consistente, leve, MIT)
- **Tamanhos:** 16px (inline), 20px (menus), 24px (destaque)
- **Stroke:** 1.5px (padrão), 2px (ênfase)
- **Cor:** herda `currentColor`

| Contexto | Ícone sugerido |
|---|---|
| Cotações | `FileText` |
| Fornecedores | `Users` |
| Produtos | `Package` |
| Categorias | `FolderOpen` |
| Magic Link | `Link2` |
| Enviar e-mail | `Mail` |
| Compartilhar | `Share2` |
| Copiar link | `Copy` |
| Menor preço | `TrendingDown` |
| Status pendente | `Clock` |
| Status respondido | `CheckCircle` |
| Status expirado | `XCircle` |
| Encerrar cotação | `Lock` |
| Configurações | `Settings` |

---

## 9. Layouts por Interface

### 9.1. Painel do Comprador (Desktop-First)

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (260px)  │  Header (breadcrumb + avatar)     │
│                  ├───────────────────────────────────-│
│  [Logo]          │                                    │
│                  │  Page Title + Actions              │
│  Dashboard       │  ┌──────────┐ ┌──────────┐        │
│  Cotações ●      │  │ Card KPI │ │ Card KPI │  ...   │
│  Produtos        │  └──────────┘ └──────────┘        │
│  Fornecedores    │                                    │
│  Categorias      │  ┌────────────────────────┐       │
│                  │  │    Tabela / Conteúdo    │       │
│  ─────────────   │  │                        │       │
│  Configurações   │  │                        │       │
│  Plano: Free ▲   │  └────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

**KPI Cards:** Números grandes (`--text-3xl`, `font-weight: 700`), label em `--text-sm`, ícone sutil no canto, micro sparkline opcional.

### 9.2. Portal do Fornecedor (Mobile-First)

```
┌─────────────────────┐
│  [Logo Comprador]   │
│  Cotação: "Título"  │
│  Prazo: 3 dias ⏱    │
├─────────────────────┤
│                     │
│  Item 1             │
│  Qtd: 50 Un         │
│  R$ [___________]   │
│  □ Não tenho        │
│                     │
│  ─────────────────  │
│                     │
│  Item 2             │
│  Qtd: 100 Kg        │
│  R$ [___________]   │
│  □ Não tenho        │
│                     │
│  ─────────────────  │
│                     │
│  Prazo entrega:     │
│  [__ dias úteis]    │
│                     │
│  Pagamento:         │
│  [Dropdown ▾]       │
│                     │
│  Observações:       │
│  [_______________]  │
│                     │
│  ┌─────────────────┐│
│  │ ENVIAR PROPOSTA ││
│  └─────────────────┘│
│                     │
│  🔒 Dados protegidos│
└─────────────────────┘
```

**Specs Mobile:**
- Max-width: `480px`, centralizado
- Padding lateral: `20px`
- Cada item é um card com separador sutil
- Botão "Enviar" fixo no bottom em telas pequenas (`position: sticky; bottom: 0`)
- Progress bar sutil no topo mostrando % de itens preenchidos

### 9.3. Tela de Sucesso (Fornecedor)

- Ícone de check animado (círculo que desenha + check que aparece)
- Animação de confetti sutil (2s)
- Mensagem: `--text-2xl`, `font-weight: 700`
- Sub-mensagem com nome da empresa
- Fundo com gradiente sutil `--primary-50` → `--success-50`

---

## 10. E-mail Template

### Estilo do E-mail Transacional
- Largura: `600px` max, responsivo
- Header: gradiente `--primary-600` → `--primary-500` com logo branco
- Corpo: fundo branco, texto em `--neutral-700`
- CTA Button: `--primary-500`, `border-radius: 8px`, `padding: 14px 32px`
- Footer: `--neutral-400` texto pequeno com dados legais
- Lista de itens resumida (máx 5, depois "e mais X itens...")

---

## 11. Acessibilidade

- **Contraste mínimo:** WCAG AA (4.5:1 texto, 3:1 elementos UI)
- **Focus visible:** Ring de 3px em `--ring-focus` em todos elementos interativos
- **Touch targets:** Mínimo `44x44px` em mobile
- **`prefers-reduced-motion`:** Desabilitar animações decorativas
- **`prefers-color-scheme`:** Respeitar preferência do sistema para dark/light
- **Aria labels:** Em todos os ícones-botão sem texto visível
- **Skip to content:** Link oculto no topo para navegação por teclado
