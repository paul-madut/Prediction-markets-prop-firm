---
version: alpha
name: Blueberry Funded
description: Dark-first prediction-markets prop firm. Deep violet canvas, electric purple primary, jade-mint accent for affirmative state, with explicit motion principles for fluid micro-interactions.
colors:
  # Surface canvas
  bg: "#0C0319"
  surface: "#180630"
  surface-2: "#1f0a3d"
  surface-3: "#2a1f44"
  # Brand
  primary: "#7F24FF"
  primary-hover: "#A769FF"
  primary-deep: "#6c14ee"
  primary-soft: "rgba(127, 36, 255, 0.18)"
  primary-ring: "rgba(127, 36, 255, 0.45)"
  # Text
  text: "#FFFFFF"
  text-muted: "#ADADAD"
  text-faint: "#5A6476"
  # Lines
  line: "rgba(255, 255, 255, 0.10)"
  line-strong: "rgba(255, 255, 255, 0.18)"
  # Semantic
  success: "#12DFBA"
  danger: "#FF1C1C"
  warning: "#FFB539"
  info: "#A769FF"
  # Chart palette (in priority order)
  chart-1: "#7F24FF"
  chart-2: "#A769FF"
  chart-3: "#12DFBA"
  chart-4: "#FFB539"
  chart-5: "#FF1C1C"
typography:
  display-xl:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 64px
    fontWeight: "700"
    lineHeight: 67px
    letterSpacing: -0.025em
  display-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 52px
    letterSpacing: -0.022em
  headline-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 32px
    fontWeight: "700"
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 30px
    letterSpacing: -0.015em
  title-lg:
    fontFamily: "Inter Tight"
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 26px
    letterSpacing: -0.01em
  title-md:
    fontFamily: "Inter Tight"
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 22px
  body-lg:
    fontFamily: "Inter Tight"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: "Inter Tight"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  body-sm:
    fontFamily: "Inter Tight"
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 18px
  label:
    fontFamily: "Inter Tight"
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.02em
  overline:
    fontFamily: "Geist Mono"
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 14px
    letterSpacing: 0.08em
  mono-stat:
    fontFamily: "Geist Mono"
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 18px
    letterSpacing: -0.005em
rounded:
  sm: 0.375rem
  DEFAULT: 0.625rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.75rem
  2xl: 1rem
  pill: 9999px
spacing:
  unit: 4px
  hairline: 1px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  card-padding: 24px
  card-gap: 16px
  section-margin: 48px
  page-padding: 32px
components:
  surface-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  surface-card-elevated:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  surface-card-hover:
    backgroundColor: "{colors.surface-2}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    height: 44px
    padding: 0 20px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.text}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    height: 44px
    padding: 0 20px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text-muted}"
    typography: "{typography.title-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 12px
  button-ghost-hover:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.text}"
  button-icon:
    backgroundColor: transparent
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    size: 36px
  input-field:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 12px 14px
    height: 44px
  input-field-focus:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
  badge-default:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
    height: 22px
  badge-success:
    backgroundColor: "rgba(18, 223, 186, 0.14)"
    textColor: "{colors.success}"
  badge-danger:
    backgroundColor: "rgba(255, 28, 28, 0.14)"
    textColor: "{colors.danger}"
  badge-warning:
    backgroundColor: "rgba(255, 181, 57, 0.14)"
    textColor: "{colors.warning}"
  badge-brand:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
  sidebar:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    width: 280px
  sidebar-collapsed:
    width: 80px
  sidebar-link:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 40px
  sidebar-link-active:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.text}"
  data-row:
    backgroundColor: transparent
    textColor: "{colors.text}"
    height: 56px
  data-row-hover:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
  toast:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: 14px 16px
  modal:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.2xl}"
    padding: 28px
  metric-value:
    textColor: "{colors.text}"
    typography: "{typography.headline-lg}"
  metric-label:
    textColor: "{colors.text-muted}"
    typography: "{typography.overline}"
  stat-mono:
    textColor: "{colors.text}"
    typography: "{typography.mono-stat}"
---

## Overview

Blueberry Funded is a prediction-markets prop firm. The product is high-stakes by nature (real capital, drawdown rules, evaluation phases), so the surface needs to feel **disciplined, fast, and confident** — not playful. The system speaks in deep violets and electric purple over near-black, with a single mint accent reserved for affirmative outcomes (passed phase, profit, success state).

Two principles run through every screen:

1. **Information density over decoration.** The user is reading prices, P&L, drawdown, time-in-trade. Decoration that competes with numbers is a bug.
2. **Motion is information.** Hover, focus, press, success, and route changes all use coordinated motion to confirm what just happened. Animation is not flair — it's feedback latency.

The brand wordmark is the `Blueberry` logo (`/blueberry-logo.png`), which stacks "Blueberry" in violet over "Funded" in white. It sits in the top-left of every shell.

## Colors

Color is split into four roles: **canvas**, **brand**, **text**, and **semantic**.

**Canvas** is a three-step dark stack: `bg` (`#0C0319`) is the page; `surface` (`#180630`) is a card; `surface-2` (`#1f0a3d`) is an elevated card or active row. Going lighter signals interactivity — hover targets ascend the canvas by exactly one step.

**Brand** is anchored at `primary` (`#7F24FF`) for resting state and `primary-hover` (`#A769FF`) for hover or active. `primary-soft` and `primary-ring` are the only acceptable alpha derivations — never improvise a new purple opacity.

**Text** has three tiers: full white for primary, `#ADADAD` for secondary, `#5A6476` for tertiary/disabled. Never use Tailwind `gray-400`/`gray-500` directly — they're tuned for light surfaces and look chalky on `#0C0319`.

**Semantic** colors are scarce and reserved: `#12DFBA` mint for affirmative (pass, profit, completed), `#FF1C1C` for breach/loss, `#FFB539` for caution. Each gets a 14% alpha tinted background companion for badges. **Do not** use semantic color as decoration — only to convey state.

**Lines** are white at 10% (`line`) and 18% (`line-strong`). 1px hairlines define separation; thicker borders are a smell.

## Typography

Two custom families plus one mono:

- **Plus Jakarta Sans** — display + headlines. Tight tracking (negative letter-spacing), heavy weight (700). Used above 24px.
- **Inter Tight** — UI and body. Default weight 400; 600 for titles and emphasis. Used at 13–18px.
- **Geist Mono** — numeric stats, overlines, identifiers (tickers, order IDs, durations). Slight negative tracking on stats to align glyphs.

Hierarchy collapses to **five concrete sizes** in practice: 64/48 (display, hero only), 32/24 (page headings), 18/16 (titles), 14 (body), 12/11 (label/overline). Don't invent intermediate sizes.

**Numeric rule:** any price, P&L, percentage, timer, or order count uses `mono-stat`. Mixed proportional+mono in the same row reads as noise.

## Layout

The app uses a **fixed sidebar + scrollable main** shell (`Sidebar.tsx` + `TopBar.tsx`). Sidebar is 280px expanded, 80px collapsed, with state per-user. Main content has 32px page padding on desktop, 16px on mobile.

- **Grid:** 12-column on desktop, 16px gutter. Most dashboard rows are 2/3 + 1/3 (data + meta) or 1/2 + 1/2.
- **Card rhythm:** 24px internal padding, 16px gap between cards in the same group, 48px between distinct sections.
- **Vertical rhythm:** baseline grid is 4px. Spacing tokens (`xs`/`sm`/`md`/`lg`/`xl`/`2xl`/`3xl`) are 4/8/12/16/24/32/48 — no other values.
- **Max content width:** 1440px, centered. Tables and analytics may go edge-to-edge inside that frame.
- **Header heights:** TopBar 64px; sticky sub-headers 48px.

## Elevation & Depth

Depth in Blueberry is **canvas ascent + purple glow**, not drop shadows on a light background. There are exactly four levels:

- **Level 0 — Page:** `bg` (`#0C0319`). No shadow. Optional aurora-radial glows on auth/marketing surfaces only (never in-app).
- **Level 1 — Card:** `surface` (`#180630`), 1px `line` border. No shadow.
- **Level 2 — Card hover / elevated card:** `surface-2` (`#1f0a3d`), 1px `line-strong` border. Optional translateY(-1px). No shadow.
- **Level 3 — Modal / popover / dropdown:** `surface-2` over a 60%-alpha black scrim. Drop shadow `0 24px 48px -12px rgba(0,0,0,0.6)`.

**Brand glow** is a separate axis used sparingly for the primary call-to-action and the "Get Funded" CTA: `0 8px 24px -6px rgba(127, 36, 255, 0.55)`. Don't paint glow on more than one element per viewport — it stops meaning "this is the action" once it competes.

Inset shadows (`inset 0 0 0 1px ...`) are reserved for special-emphasis cards (active challenge phase, selected market). They simulate a refracting edge and must use `rgba(167, 105, 255, 0.25)` or `rgba(127, 36, 255, 0.18)` — no other inset color.

## Shapes

Border-radius is tuned to the element class — not chosen by feel.

- **Buttons / inputs / links / sidebar items:** 10px (`rounded.lg`). Soft enough to read as interactive, sharp enough to look engineered.
- **Cards / panels / toasts:** 12px (`rounded.xl`). One step softer than buttons so cards visually "contain" their controls.
- **Modals / heroes:** 16px (`rounded.2xl`).
- **Avatars / pills / badges:** full pill (`9999px`).
- **Icons:** 1.5px stroke (Heroicons outline default), rounded caps and joins. No filled icons except in active sidebar states and badges.

Avoid 14/15/18px one-offs — they're already in the codebase from earlier work and should be normalized to the scale above when touched.

## Components

Every component pulls from the token sheet in the frontmatter. The rules below cover behavior + states.

### Buttons

Three flavors only: `primary`, `secondary`, `ghost`. Plus `icon` for icon-only utility.

- **Primary** carries the brand glow. Exactly one per viewport at a time.
- **Secondary** is the workhorse — `rgba(255,255,255,0.06)` fill on `surface`. Used for "Cancel", "View details", filter chips.
- **Ghost** has no fill at rest, picks up the secondary fill on hover. Used in toolbars, sidebar, and inline.
- **Press behavior:** scale to 0.97 on `tap`. Spring back. (See Motion.)
- **Disabled:** 40% opacity, no hover, `cursor-not-allowed`.
- **Loading:** swap label for a spinner; preserve width so layout doesn't jump.

### Inputs

`bg-white/4` at rest, `bg-white/6` on focus. Focus ring is a 2px `primary-ring` outset, not a thicker border. Labels above (12px, `text-muted`); helper text below (12px, `text-faint`); error text in `danger` and replaces helper. Required marker is a `*` in `danger`, not a word.

### Cards

`surface` background, `line` border, `rounded.xl`, `card-padding`. Hover-interactive cards (e.g. `ExpandableMarketCard`) get the Level-2 treatment + a `-1px` translateY. Static cards do not move.

### Sidebar

280/80 dual-state. Active link gets `sidebar-link-active` fill + a 3px `primary` left-edge accent. Icons are 20px, label is 14px `title-md`. Collapse animation is width-only (300ms ease-out); icons stay anchored.

### TopBar

64px tall, `bg` background, `line` bottom border, contains breadcrumbs (left) + search/notifications/avatar (right). Search opens a command-palette modal on `⌘K`.

### Tables / Data rows

56px row height, 14px body, mono for numbers. Hover paints `rgba(255,255,255,0.03)` — barely-there. Sort header arrows are 12px outline icons that flip on click.

### Badges

Pill, 22px tall, 12px label. Five fixed variants: `default`, `success`, `danger`, `warning`, `brand`. Use the alpha-tinted backgrounds — don't put the full saturated color behind a label.

### Toasts

Slide in from bottom-right, 14px corner radius, `surface-2` background. Auto-dismiss at 5s with a hairline progress bar in the semantic color along the bottom edge.

### Modals

`surface-2` panel centered over a 60%-alpha black scrim. Scrim fades; panel scales from 0.97→1 + fades + translates Y from +12px (see Motion). `Esc` closes; clicking scrim closes unless `requireInput`.

## Motion

Motion is a first-class subsystem — every interaction described above has a motion contract. Implementation is **Framer Motion** for stateful animation and CSS transitions for hover/focus only.

### Duration & easing tokens

| Token | Value | Use |
|---|---|---|
| `fast` | 150ms | Hover paint, focus ring, color shift |
| `normal` | 200ms | Press, small layout swap |
| `slow` | 300ms | Sidebar collapse, sheet/drawer slide |
| `slower` | 500ms | Page transition, hero entrance |
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | All CSS transitions |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Entrances |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |

### Spring presets (Framer Motion)

| Preset | Config | Use |
|---|---|---|
| `gentle` | `{ type: "spring", stiffness: 150, damping: 20 }` | Layout shifts, sidebar/panel openings |
| `responsive` | `{ type: "spring", stiffness: 300, damping: 30 }` | Hover lifts, drag interactions |
| `snappy` | `{ type: "spring", stiffness: 500, damping: 35 }` | Press, toggle, micro-interaction |
| `crisp` | `{ type: "spring", stiffness: 600, damping: 40 }` | Toggle switches, segmented controls |

### Micro-interaction recipes

- **Hover lift (cards):** `whileHover={{ y: -1 }}` with `responsive` spring. No scale — translate only.
- **Press (buttons):** `whileTap={{ scale: 0.97 }}` with `snappy` spring. Always pair with a hover state so press has somewhere to bounce back from.
- **Focus ring:** 2px `primary-ring` outset, 150ms transition. No animated radius; ring is constant.
- **Toggle / switch:** thumb translates X with `crisp`. Background color cross-fades 150ms.
- **Number counters:** count up over 600ms with `easeOut`. Use for first paint only — don't re-animate on every re-render.
- **Skeleton → content:** skeleton fades out 200ms; real content fades in 250ms with `y: 4 → 0`. Total ≤ 450ms.
- **Page transition:** fade + 8px Y on enter, 4px Y + fade out. 200ms in, 150ms out, `ease-default`.
- **Modal:** scrim 200ms fade; panel `opacity: 0, scale: 0.97, y: 12 → 1, 0` with `gentle` spring. Exit reverses with 150ms.
- **Toast:** slide in from bottom-right with `snappy` spring; exit slides + fades 200ms.
- **List stagger:** `delay: i * 0.03`, cap at 8 items (after that, use `0.024 * i`). Never stagger above 250ms total.

### What motion is NOT allowed to do

- **No rotation animations** on non-icon UI. Icons may rotate ≤ 90° for state changes (chevron, refresh).
- **No animated width/height** when a transform works. `scale` and `translate` are GPU-cheap; layout properties stall.
- **No infinite loops** except for explicit loading states (spinner, aurora glow).
- **No bouncy springs on layout** — `stiffness < 200, damping < 25` overshoots and looks toy-like in a finance UI.
- **No animation longer than 500ms** outside of page transitions and the auth hero. Anything longer is a distraction.
- **No animation on text content during typing** — input characters don't slide in.

### Reduced motion

`prefers-reduced-motion: reduce` collapses all springs/transitions to a 50ms cross-fade. Implement at the `MotionConfig` boundary in `MainLayout.tsx` so it covers the tree.

## Do's and Don'ts

### Do
- Use the canvas ascent (`bg → surface → surface-2`) to communicate hover and elevation. Going lighter = more important.
- Use mono for every number that changes (prices, P&L, durations).
- Use exactly one primary CTA per viewport.
- Use spring physics for anything stateful; CSS transitions for hover/focus paint.
- Use `MotionConfig` to honor `prefers-reduced-motion`.
- Use the wordmark logo (`/blueberry-logo.png`) in the top-left shell slot — never recreate it as text + gradient circle.
- Use the 4px baseline grid; round to it.

### Don't
- Don't introduce a fourth purple. The palette is `#7F24FF` / `#A769FF` / `#6c14ee` — extend through alpha, not new hex.
- Don't put semantic color on anything that isn't conveying state (no red dividers, no green section headers).
- Don't use `gray-400`/`gray-500` for text — use `text-muted` (`#ADADAD`) and `text-faint` (`#5A6476`).
- Don't drop shadows on cards. Use canvas ascent + border instead. Shadows are for modals only.
- Don't animate `width` / `height` / `top` / `left` when a transform works.
- Don't use bouncy springs (`damping < 25`) on layout. Looks toy-like.
- Don't stack glow effects. Only one element per viewport may emit `shadow-primary`.
- Don't use rounded `14px` / `15px` / `18px`. Normalize to the radius scale.
- Don't stagger more than 8 items, and never more than 250ms total stagger time.
- Don't animate text content character-by-character.
