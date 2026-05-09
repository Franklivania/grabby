# GUIDE_TO_DESIGN_MD

> This document is the complete reference guide for any AI agent generating a `DESIGN.md` file
> from extracted DOM, stylesheet, and JavaScript data. Read this entire document before writing
> a single line of output. Every rule here is a contract, not a suggestion.

---

## What You Are Building

A `DESIGN.md` is a design system manifest — the machine-readable and human-readable source of
truth for a brand's visual language. Your input is raw extracted data from a live rendered page:
computed styles, CSS custom properties, SCSS variables, Tailwind config tokens, font link tags,
and JavaScript animation patterns from GSAP and Framer Motion usage.

Your output is a structured document where every token has a name, a value, and a reason —
and those three things always live together. The document must be specific enough for another
AI agent to use as its sole design reference when building UI — without ever seeing the original
website.

---

## What a DESIGN.md Is Not

- **Not a token dump.** A list of hex codes with no roles or rationale is useless.
- **Not a brand PDF.** "Feels approachable yet premium" is too loose. Every statement must
  produce a decision.
- **Not a Figma export.** Token exports say "what" but skip "why." You must carry rationale.
- **Not fabricated.** You describe what the site actually uses, extracted from real sources.
  Never invent a value to fill a gap. Declare the gap instead.
- **Not a full design system.** You document what a button looks like, not when to use it.

---

## Source Priority Order

When the same token appears in multiple sources, resolve conflicts using this priority order:

```
1. CSS custom properties / variables  (--color-primary, --font-size-lg)
2. SCSS variables                      ($primary, $font-stack)
3. Tailwind config                     (theme.colors, theme.fontFamily)
4. Computed styles from DOM            (getComputedStyle on sampled elements)
5. Inline styles                       (style attributes on elements)
6. JavaScript / animation files        (motion tokens only)
```

If a value from source 1 conflicts with source 4, trust source 1 — it is the authoring intent.

---

## Font Handling — Special Rules

Fonts are declared **once**, in a dedicated `fonts:` block at the top of the YAML — before
`colors:`, before `typography:`, before everything else. After that declaration, the full font
family name never appears again anywhere in the document. Every subsequent reference uses
`{fonts.[alias]}`.

### How to find fonts — check in this order

**1. `<link>` tags in `<head>`** — highest confidence
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.bunny.net/css?family=geist:400,500,700" rel="stylesheet">
```
Extract: family name, weights, full URL.

**2. `@import` in CSS or SCSS**
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;600&display=swap');
```

**3. `@font-face` declarations**
```css
@font-face {
  font-family: 'Geist';
  src: url('/fonts/Geist-Regular.woff2') format('woff2');
  font-weight: 400;
}
```
Extract: family name, src path, weights declared.

**4. CSS custom properties**
```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

**5. Tailwind config `fontFamily`**
```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

**6. Computed `font-family` on sampled elements** — lowest confidence, fallback only.

### The `fonts:` YAML block

```yaml
fonts:
  [alias]:
    family: "[Exact font name]"
    source: "[Full URL or local path]"
    weights: [[list of loaded weights as integers]]
    fallback: "[fallback stack — without the primary family]"
    license: "[Google Fonts | Bunny Fonts | self-hosted | system | proprietary | unknown]"
    freeAlternative: "[only include if license is proprietary or paid]"
```

**Alias naming rules:** The alias describes the font's role, not its name.
Use: `sans`, `mono`, `display`, `heading`, `body`, `ui`.
Never: `inter`, `geist`, `sohne` — names change, roles don't.

**Example:**
```yaml
fonts:
  sans:
    family: "Inter"
    source: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    weights: [400, 500, 600, 700]
    fallback: "system-ui, -apple-system, sans-serif"
    license: "Google Fonts"
  mono:
    family: "JetBrains Mono"
    source: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
    weights: [400, 500]
    fallback: "monospace"
    license: "Google Fonts"
  display:
    family: "Söhne"
    source: "/fonts/sohne.woff2"
    weights: [400, 500, 700]
    fallback: "Inter, system-ui, sans-serif"
    license: "proprietary"
    freeAlternative: "Inter or DM Sans"
```

In the `typography:` block, every style references fonts using `{fonts.[alias]}`:
```yaml
typography:
  display-lg:
    font: "{fonts.display}"   ← never "Söhne, Inter, system-ui, sans-serif"
    fontSize: 56px
    fontWeight: 500
```

---

## Styling Mechanism Detection

Before extracting tokens, identify which styling systems the site uses.

### Plain CSS

Key extraction targets:
```css
:root {
  --color-brand: #0070f3;
  --radius-md: 8px;
  --space-4: 16px;
}
.btn-primary {
  background-color: var(--color-brand);
  border-radius: var(--radius-md);
}
```
Extract all `:root` custom properties. Resolve `var(--x)` references back to declared values.

### SCSS / SASS

Key extraction targets:
```scss
$primary: #0070f3;
$font-sans: 'Inter', sans-serif;
$radius-md: 8px;

$colors: (
  'primary': #0070f3,
  'surface': #f8f9fa,
);

.card {
  background: map-get($colors, 'surface');
  border-radius: $radius-md;
}
```
Extract all `$variable` declarations. Resolve SCSS maps. Map usages back to source variables.

If only compiled CSS is available (SCSS source inaccessible), fall back to computed styles
and declare in Known Gaps: *"SCSS source files were not accessible — tokens inferred from
compiled CSS and computed styles."*

### Tailwind CSS

**From `tailwind.config.js` / `tailwind.config.ts`** — highest confidence:
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#0070f3',
        'surface-card': '#ffffff',
        canvas: '#f8f9fa',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
      },
      spacing: {
        section: '80px',
      },
    },
  },
}
```
Token names in the config often map directly to DESIGN.md role names. Prefer these.

**From class usage in HTML/JSX** — when config is unavailable:
```html
<button class="bg-primary text-white rounded-md px-4 py-2 font-medium">
```
Reconstruct tokens from frequent class patterns:
- `bg-[color]` → color token
- `text-[color]` → text color token
- `rounded-[size]` → border radius token
- `font-[weight]` → font weight
- `text-[size]` → font size
- `p/px/py-[n]` → spacing

**Tailwind arbitrary values:**
```html
<div class="bg-[#0070f3] text-[14px] rounded-[6px]">
```
Extract as candidate tokens. Note in prose that these may be one-offs.

---

## Animation Detection — GSAP and Framer Motion

Animation data comes exclusively from JavaScript source files. Scan all `.js`, `.ts`, `.jsx`,
`.tsx` files for the following patterns.

### GSAP

**Import signatures to detect:**
```js
import gsap from 'gsap'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
```

**Patterns to extract:**
```js
// Basic tweens — extract: duration, ease, properties animated
gsap.to('.hero', { duration: 0.6, opacity: 1, y: 0, ease: 'power2.out' })
gsap.from('.card', { duration: 0.4, opacity: 0, y: 24, ease: 'power3.out' })
gsap.fromTo('.nav', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' })

// Timelines — extract: defaults, sequence, stagger
const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 0.5 } })
tl.from('.title', { opacity: 0, y: -20 })
  .from('.subtitle', { opacity: 0, y: -10 }, '-=0.3')

// Stagger — extract: stagger value
gsap.from('.item', { opacity: 0, y: 20, stagger: 0.08, duration: 0.5 })

// ScrollTrigger — note scroll-driven animation
gsap.to('.section', {
  scrollTrigger: { trigger: '.section', start: 'top 80%' },
  opacity: 1, y: 0, duration: 0.7
})

// useGSAP (React) — same patterns, note React-integrated
useGSAP(() => {
  gsap.from(containerRef.current, { opacity: 0, duration: 0.5 })
}, [])
```

**Record:**
- Duration range (shortest and longest)
- All unique ease strings found
- Properties most commonly animated (opacity, y, x, scale, rotation)
- Whether ScrollTrigger is used
- Whether timelines with stagger are used
- Whether `gsap.defaults` sets global values

### Framer Motion

**Import signatures to detect:**
```js
import { motion } from 'framer-motion'
import { AnimatePresence, motion } from 'framer-motion'
import { useAnimation, useInView } from 'framer-motion'
```

**Patterns to extract:**
```jsx
// Named variant system
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}
<motion.div variants={variants} initial="hidden" animate="visible" />

// Inline animate
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
/>

// Exit via AnimatePresence
<AnimatePresence>
  <motion.div exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} />
</AnimatePresence>

// Gesture responses
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
/>

// Spring config
transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 1 }}

// Scroll-triggered via viewport
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
/>

// Stagger via staggerChildren
const container = {
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}
```

**Record:**
- Duration range across all transition objects
- All easing values — named (`'easeOut'`) and cubic bezier arrays (`[0.4,0,0.2,1]`)
- Spring configs: stiffness, damping, mass
- Whether AnimatePresence is used (exit animations)
- Gesture animations: what property and by how much
- Whether viewport/scroll-triggered animation is in use
- Whether a named variant system (hidden/visible pattern) is used

### Motion Token Output — `motion:` YAML block

```yaml
motion:
  library: "[gsap | framer-motion | both | none]"
  durationFast: [n]ms
  durationBase: [n]ms
  durationSlow: [n]ms
  easingDefault: "[value]"
  easingEntrance: "[value]"
  easingExit: "[value]"
  easingSpring:             # only if spring transitions found
    stiffness: [n]
    damping: [n]
    mass: [n]
  scrollDriven: [true | false]
  stagger: [n]ms            # omit if not used
  gestureHoverScale: [n]    # e.g. 1.02 — omit if not used
  gestureTapScale: [n]      # e.g. 0.98 — omit if not used
```

---

## Part One: Full YAML Structure

All blocks in canonical order:

```yaml
---
version: alpha
name: [Brand Name]
description: [3–5 sentence atmosphere summary]

fonts:
  [alias]:
    family: "[Family]"
    source: "[URL or path]"
    weights: [list]
    fallback: "[stack]"
    license: "[type]"

colors:
  [role]: "[hex]"

typography:
  [style-name]:
    font: "{fonts.[alias]}"
    fontSize: [n]px
    fontWeight: [n]
    lineHeight: [n]
    letterSpacing: [n]px

rounded:
  none: 0px
  sm: [n]px
  md: [n]px
  lg: [n]px
  full: 9999px

spacing:
  xs: [n]px
  sm: [n]px
  base: [n]px
  lg: [n]px
  xl: [n]px
  section: [n]px

motion:
  library: "[value]"
  durationFast: [n]ms
  durationBase: [n]ms
  durationSlow: [n]ms
  easingDefault: "[value]"
  scrollDriven: [true | false]

components:
  [component-name]:
    backgroundColor: "{colors.[role]}"
    textColor: "{colors.[role]}"
    typography: "{typography.[style]}"
    rounded: "{rounded.[size]}"
    padding: [n]px [n]px
---
```

---

## Part Two: The Prose Body — 10 Sections

### Section 1: `## Overview`

Answers: *Why does this site look the way it does?*

3–5 paragraphs on visual philosophy and atmosphere. Reference tokens throughout as
`{colors.primary}`, `{fonts.sans}`, etc. Close with `**Key Characteristics:**` — 5–8 bullets.

Cover: canvas + surface palette and emotional register, accent deployment, typography weight
philosophy, depth approach, any hard visual rules (no gradients, hairline-only, etc).

---

### Section 2: `## Fonts`

Appears immediately after Overview, before Colors.
Expands every `fonts:` YAML entry with human-readable context.

```markdown
## Fonts

### [alias] — [family name]
- **Source:** [full URL or local path]
- **Weights loaded:** [list]
- **Used for:** [which typography: styles use this font — e.g. display-lg, heading-lg, body-md]
- **Fallback stack:** [fallback]
- **License:** [type]
- **Free alternative:** [only if proprietary]

### Font Loading Note
[Preconnect tags present? display=swap? Self-hosted for performance?
Any loading observations worth noting for an implementing agent.]
```

Rules:
- Every `fonts:` key gets a prose entry. 1:1.
- "Used for" explicitly lists which `typography:` styles reference this font.
- This is the only section where font source URLs appear in prose.
- After this section, `{fonts.[alias]}` is the only way to refer to any font.

---

### Section 3: `## Colors`

Answers: *Where does each color apply, and why?*

Group under `###` sub-headings. Every `colors:` key appears exactly once.

```markdown
## Colors

### Brand & Accent
- **[Name]** (`{colors.[key]}` — #hex): [What it does. Where it appears. How scarcely or liberally.]

### Surface & Canvas
- **[Name]** (`{colors.[key]}` — #hex): [Role description]

### Text
- **[Name]** (`{colors.[key]}` — #hex): [Role description]

### Borders & Dividers
- **[Name]** (`{colors.[key]}` — #hex): [Role description]

### Semantic
- **[Name]** (`{colors.[key]}` — #hex): [Role description]
```

Rules:
- Names express role, never appearance. `primary` not `orange`. `canvas` not `cream`.
- Descriptions say what the color *does*, not what it *looks like*.
- If frequency data is available: *"appears on every CTA — used sparingly elsewhere."*

---

### Section 4: `## Typography`

Answers: *What text style goes where, and why?*

```markdown
## Typography

### Font Families
See [## Fonts](#fonts) for full declarations and loading details.
This system uses {fonts.sans} for all UI text[, and {fonts.mono} for code elements].

### Type Scale

| Style | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| display-lg | {fonts.sans} | [n]px | [n] | [n] | [n]px |
| body-md | {fonts.sans} | [n]px | [n] | [n] | 0 |
| button | {fonts.sans} | [n]px | [n] | 1 | 0 |

### Hierarchy Principles
[2–3 paragraphs: how the scale establishes hierarchy, tracking philosophy,
where size vs weight carries importance]

### Usage by Context
- Page-level hero titles → `display-lg`
- Section headings → `heading-lg`
- Body copy → `body-md`
- Button labels → `button`
- Metadata, timestamps → `caption`
- Code samples → `code` (uses {fonts.mono})
```

Rules:
- Font column uses `{fonts.[alias]}` — never the raw family name.
- Letter spacing 0 is explicitly declared.
- Negative tracking must be explained: *"tightened to -1.8px at display sizes — prevents
  headline words drifting apart at large scales."*

---

### Section 5: `## Layout`

Answers: *What is the spatial system?*

```markdown
## Layout

### Spacing Scale

Base unit: [4px / 8px]

| Token | Value | Common usage |
|---|---|---|
| `{spacing.xs}` | [n]px | Icon gaps, tight inline spacing |
| `{spacing.sm}` | [n]px | Component internal padding |
| `{spacing.base}` | [n]px | Default element padding |
| `{spacing.lg}` | [n]px | Card padding |
| `{spacing.section}` | [n]px | Major section vertical rhythm |

### Grid & Containers
[Max content width, column count, gutter size if extractable]

### Whitespace Philosophy
[How space creates hierarchy — generous or tight, breathing room approach]
```

---

### Section 6: `## Elevation`

Answers: *How is depth and separation created?*

```markdown
## Elevation

### Surface Tiers
[Canvas → Card → Modal, with background color and separation method per tier]

### Shadow Definitions
[Full CSS box-shadow values with usage context]
[Or: "No drop shadows are used at any layer. Depth is created through
{colors.hairline} 1px borders and background color contrast only."]

### Depth Philosophy
[1 paragraph — shadows, borders, flat surfaces, or layered elevation]
```

---

### Section 7: `## Components`

Answers: *What does each UI element look like?*

One prose entry per `components:` YAML key, in this format:

```markdown
**`button-primary`** — The primary CTA. Background `{colors.primary}`,
text `{colors.on-primary}`, type `{typography.button}` ({fonts.sans} [n]px / weight [n]),
padding [n]px × [n]px, rounded `{rounded.md}` ([n]px).
Hover: [extracted value or "not documented"].
Active: [extracted value or "not documented"].
Disabled: [extracted value or "not documented"].
```

Rules:
- Every `components:` key has a prose entry. 1:1.
- All values use `{block.key}` references. Actual values in parentheses for human readability.
- Typography reference includes font alias inline for clarity.
- States (hover, active, disabled, focus) — include if extractable, note if not.
- Never use inline hex or px values as primary references.

---

### Section 8: `## Motion & Animation`

Answers: *How does the interface move?*

```markdown
## Motion & Animation

### Library
[GSAP / Framer Motion / both / none — with detected import pattern]

### Duration Scale

| Token | Value | Used for |
|---|---|---|
| `{motion.durationFast}` | [n]ms | Micro-interactions, hover feedback |
| `{motion.durationBase}` | [n]ms | Standard element transitions |
| `{motion.durationSlow}` | [n]ms | Hero entrances, section reveals |

### Easing

| Name | Value | Used for |
|---|---|---|
| Default | [value] | Most transitions |
| Entrance | [value] | Elements entering viewport |
| Exit | [value] | Elements leaving / unmounting |
| Spring | stiffness:[n] damping:[n] mass:[n] | Gesture responses |

### Animation Patterns

**Entrance animations**
[e.g. "Elements enter from y:20, opacity 0→1, duration {motion.durationBase},
ease {motion.easingEntrance}. Applied to cards, headings, and section content.
Triggered on scroll via [ScrollTrigger / Framer viewport]."]

**Scroll-driven**
[e.g. "ScrollTrigger used on section reveals. Trigger: top 80% of viewport.
No pin animations detected."]
[Or: "Framer Motion `whileInView` with `viewport={{ once: true }}` used on
section-level elements. Not GSAP-driven."]

**Gesture responses**
[e.g. "Interactive elements scale to {motion.gestureHoverScale} on hover and
{motion.gestureTapScale} on tap. Spring config: stiffness {n}, damping {n}.
Applied to buttons and card-level CTAs."]

**Stagger**
[e.g. "List items and card grids stagger at {motion.stagger}ms intervals on
entrance. Implemented via Framer Motion `staggerChildren` in variant containers."]

**Exit animations**
[e.g. "AnimatePresence used on modal and drawer unmount. Exit: opacity 0, y:-10,
duration {motion.durationFast}."]
[Or: "No exit animations detected — AnimatePresence not in use."]

### Motion Philosophy
[1–2 paragraphs: conservative or expressive? Purpose-driven or decorative?
Does motion reinforce hierarchy (entrance order follows reading flow)?
Does it provide interaction feedback (gesture scales confirm taps)?]
```

**If no animation library detected:**
```markdown
## Motion & Animation

No GSAP or Framer Motion imports were detected in the scanned JavaScript files.
CSS `transition:` properties may be in use on interactive elements — check computed
transition values manually if motion documentation is required.
See [## Known Gaps](#known-gaps).
```

---

### Section 9: `## Responsive Behavior`

Answers: *What changes at smaller screens?*

```markdown
## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | [Changes] |
| Tablet | 768–1024px | [Changes] |
| Desktop | 1024–1440px | [Changes] |
| Wide | > 1440px | [Changes] |

### Touch Targets
[Minimum tap target sizes. WCAG-AA requires 24×24px. WCAG-AAA recommends 44×44px.
Note compliance level of primary CTAs if determinable.]

### Collapsing Strategy
[How navigation, grid columns, and key components adapt per breakpoint]
```

Note if breakpoint values came from extracted CSS media queries (confident) or are
standard defaults used because no query data was available (note it).

---

### Section 10: `## Known Gaps`

**Mandatory. Never omit. Never leave empty.**

```markdown
## Known Gaps

The following are not covered in this file, either because they were not
extractable from the available sources, or because they fall outside the
scope of a DESIGN.md:

- [Gap 1]
- [Gap 2]
```

**Always check for and declare these:**
- Dark mode / alternate color scheme (if not captured)
- Animation timings (if no JS files were scanned)
- SCSS source files (if only compiled CSS was available)
- Tailwind config (if classes were inferred from HTML only)
- Hover / active / focus / disabled states (if not extractable)
- Form validation states (error, success visual treatments)
- Empty states
- Loading and skeleton states
- Icon system and illustration style
- Sub-brand palettes or alternate product surfaces
- Responsive breakpoints (if no media query data was available)
- Print stylesheet

---

## Coverage Check — Run Before Finalising

```
□ Every key in fonts:        has a prose entry in ## Fonts
□ Every key in colors:       has a prose entry in ## Colors
□ Every key in typography:   appears in the ## Typography table
□ Every key in components:   has a prose entry in ## Components
□ Every key in motion:       is documented in ## Motion & Animation
□ Every {block.key} in prose points to a declared YAML key
□ No inline hex or px values inside components: YAML block
□ ## Known Gaps is present and non-empty
□ fonts: block is the first token block in YAML (before colors:)
□ ## Fonts section appears before ## Colors in prose
□ Font family names do not appear outside the fonts: block and ## Fonts section
```

---

## Agent Behavior Rules

**On font references:** After the `fonts:` YAML block and `## Fonts` section are written,
the full font family name never appears again. Always `{fonts.sans}`, never `"Inter, system-ui"`.

**On naming:** Semantic over descriptive. `primary` not `blue`. `canvas` not `off-white`.
`on-primary` not `white-text`. The name tells you the token's job.

**On rationale:** Every prose description answers "why is this value here." If not inferrable:
*"Rationale not inferrable from extracted data."*

**On missing data:** Omit the token, or include with `# insufficient signal — verify manually`.
Never fabricate. A missing token is honest. A wrong token is harmful.

**On inline values in components:** Raw hex and px only inside `colors:`, `typography:`,
`rounded:`, `spacing:`, `motion:` blocks. Everywhere else — `{block.key}`.

**On animation:** Only document values directly extracted from GSAP or Framer Motion usage
in scanned JS files. Do not invent animation values from assumption.

**On tone:** Write like a designer explaining a brand to a developer seeing it for the first
time. Specific, direct, reasoned. *"Cards float on {colors.canvas} separated by 1px
{colors.hairline} borders — no shadows at any layer"* beats *"Cards have a subtle border."*

---

## Section Order — Quick Reference

| # | Section | Answers |
|---|---|---|
| 1 | `## Overview` | Why does it look like this? |
| 2 | `## Fonts` | What fonts, where loaded, where applied? |
| 3 | `## Colors` | Where does each color apply, and why? |
| 4 | `## Typography` | What text style goes where, and why? |
| 5 | `## Layout` | What is the spatial system? |
| 6 | `## Elevation` | How is depth created? |
| 7 | `## Components` | What does each UI element look like? |
| 8 | `## Motion & Animation` | How does the interface move? |
| 9 | `## Responsive Behavior` | What changes on small screens? |
| 10 | `## Known Gaps` | What is this file not covering? |

---

## Full Skeleton

````markdown
---
version: alpha
name: [Brand Name]
description: [3–5 sentence atmosphere summary. Canvas. Accent usage.
  Type weight philosophy. Depth approach.]

fonts:
  sans:
    family: "[Family]"
    source: "[URL or path]"
    weights: [400, 500, 700]
    fallback: "system-ui, sans-serif"
    license: "[type]"
  mono:
    family: "[Family]"
    source: "[URL or path]"
    weights: [400, 500]
    fallback: "monospace"
    license: "[type]"

colors:
  primary: "[hex]"
  canvas: "[hex]"
  surface-card: "[hex]"
  ink: "[hex]"
  text-muted: "[hex]"
  hairline: "[hex]"
  on-primary: "[hex]"

typography:
  display-lg:
    font: "{fonts.sans}"
    fontSize: [n]px
    fontWeight: [n]
    lineHeight: [n]
    letterSpacing: [n]px
  body-md:
    font: "{fonts.sans}"
    fontSize: [n]px
    fontWeight: [n]
    lineHeight: [n]
    letterSpacing: 0
  button:
    font: "{fonts.sans}"
    fontSize: [n]px
    fontWeight: [n]
    lineHeight: 1
    letterSpacing: 0
  code:
    font: "{fonts.mono}"
    fontSize: [n]px
    fontWeight: [n]
    lineHeight: [n]
    letterSpacing: 0

rounded:
  none: 0px
  sm: [n]px
  md: [n]px
  lg: [n]px
  full: 9999px

spacing:
  xs: [n]px
  sm: [n]px
  base: [n]px
  lg: [n]px
  xl: [n]px
  section: [n]px

motion:
  library: "[gsap | framer-motion | both | none]"
  durationFast: [n]ms
  durationBase: [n]ms
  durationSlow: [n]ms
  easingDefault: "[value]"
  easingEntrance: "[value]"
  easingExit: "[value]"
  scrollDriven: [true | false]

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: [n]px [n]px
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: [n]px
    border: 1px solid {colors.hairline}
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: [n]px [n]px
    border: 1px solid {colors.hairline}
---

## Overview

[3–5 paragraphs. Visual philosophy and atmosphere. Token refs throughout.]

**Key Characteristics:**
- [Rule 1]
- [Rule 2]
- [Rule 3]
- [Rule 4]
- [Rule 5]

## Fonts

### sans — [family name]
- **Source:** [URL]
- **Weights loaded:** [list]
- **Used for:** display-lg, display-md, heading-lg, body-md, button, caption
- **Fallback stack:** [fallback]
- **License:** [type]

### mono — [family name]
- **Source:** [URL]
- **Weights loaded:** [list]
- **Used for:** code
- **Fallback stack:** monospace
- **License:** [type]

### Font Loading Note
[Preconnect, display=swap, self-hosted observations]

## Colors

### Brand & Accent
- **Primary** (`{colors.primary}` — #hex): [Description]

### Surface & Canvas
- **Canvas** (`{colors.canvas}` — #hex): [Description]
- **Surface Card** (`{colors.surface-card}` — #hex): [Description]

### Text
- **Ink** (`{colors.ink}` — #hex): [Description]
- **Text Muted** (`{colors.text-muted}` — #hex): [Description]

### Borders & Dividers
- **Hairline** (`{colors.hairline}` — #hex): [Description]

### Semantic
- **On Primary** (`{colors.on-primary}` — #hex): [Description]

## Typography

### Font Families
See [## Fonts](#fonts). This system uses {fonts.sans} for all UI text
and {fonts.mono} for code.

### Type Scale

| Style | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| display-lg | {fonts.sans} | [n]px | [n] | [n] | [n]px |
| body-md | {fonts.sans} | [n]px | [n] | [n] | 0 |
| button | {fonts.sans} | [n]px | [n] | 1 | 0 |
| code | {fonts.mono} | [n]px | [n] | [n] | 0 |

### Hierarchy Principles
[2–3 paragraphs]

### Usage by Context
- Hero titles → `display-lg`
- Section headings → `heading-lg`
- Body copy → `body-md`
- Buttons → `button`
- Metadata → `caption`
- Code → `code`

## Layout

### Spacing Scale

Base unit: [n]px

| Token | Value | Common usage |
|---|---|---|
| `{spacing.xs}` | [n]px | [usage] |
| `{spacing.base}` | [n]px | [usage] |
| `{spacing.section}` | [n]px | [usage] |

### Grid & Containers
[Max width, columns, gutters]

### Whitespace Philosophy
[1–2 paragraphs]

## Elevation

### Surface Tiers
[Canvas → Card → Modal]

### Shadow Definitions
[CSS values or "No shadows used"]

### Depth Philosophy
[1 paragraph]

## Components

**`button-primary`** — [Description with {token.refs} and (actual values)]

**`card`** — [Description]

**`input`** — [Description]

## Motion & Animation

### Library
[GSAP / Framer Motion / both / none]

### Duration Scale

| Token | Value | Used for |
|---|---|---|
| `{motion.durationFast}` | [n]ms | [usage] |
| `{motion.durationBase}` | [n]ms | [usage] |
| `{motion.durationSlow}` | [n]ms | [usage] |

### Easing
[Table: name, value, usage]

### Animation Patterns
[Entrance / Scroll-driven / Gesture / Stagger / Exit]

### Motion Philosophy
[1–2 paragraphs]

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | [changes] |
| Tablet | 768–1024px | [changes] |
| Desktop | 1024–1440px | [changes] |
| Wide | > 1440px | [changes] |

### Touch Targets
[Min sizes, WCAG note]

### Collapsing Strategy
[Per-breakpoint adaptation]

## Known Gaps

- [Gap 1]
- [Gap 2]
- [Gap 3]
````