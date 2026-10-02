---
colors:
  # Surfaces — deep navy/charcoal, layered from back to front
  bg: "#0a0e14"
  surface: "#121821"
  surface2: "#1a2230"
  border: "#263141"

  # Text
  fg: "#e6edf3"
  muted: "#9aa7b8"
  faint: "#64748b"

  # Primary accent — teal (interactive: active tabs, primary buttons, selection)
  primary: "#14b8a6"
  primaryBright: "#2dd4bf"

  # Success accent — amber (correctness: right answers, streak, best score)
  success: "#f59e0b"
  successBright: "#fbbf24"

  # Danger accent — red (wrong answers only)
  danger: "#ef4444"
  dangerBright: "#f87171"

typography:
  display:
    family: "Geist"
    weight: 700
    letterSpacing: "-0.02em"
  body:
    family: "Geist"
    weight: 400
    lineHeight: "1.6"
  # Musical symbols (roman numerals, chord names, scale notes) are set in mono
  notation:
    family: "Geist Mono"
    weight: 600

radius:
  card: "16px"
  control: "12px"
  pill: "9999px"

components:
  card:
    bg: "{colors.surface}"
    border: "{colors.border}"
    radius: "{radius.card}"
  buttonPrimary:
    bg: "{colors.primary}"
    bgHover: "{colors.primaryBright}"
    text: "{colors.bg}"
    radius: "{radius.control}"
  buttonNeutral:
    bg: "{colors.surface2}"
    text: "{colors.muted}"
    radius: "{radius.control}"
  tabActive:
    bg: "{colors.primary}"
    text: "{colors.bg}"
  input:
    bg: "{colors.surface2}"
    text: "{colors.fg}"
    focusRing: "{colors.primary}"
    radius: "{radius.control}"
---

# KeyMaster — Design System

KeyMaster is a harmony trainer for guitarists: it drills key signatures,
diatonic chords, scale degrees, and secondary dominants through fast repetition.
The design is a **modern dark** system — the player spends long focused sessions
here, so the surface recedes and the answer moment is what carries color and light.

## Colors

Backgrounds are a layered deep navy/charcoal (`bg` → `surface` → `surface2`),
so cards lift off the page without hard borders. `border` is used sparingly for
definition, not decoration.

Two accents carry meaning, and the split is the point:

- **Teal (`primary`)** is *interaction* — the active tab, the primary button,
  the selected key. It never signals correctness. Hover brightens to
  `primaryBright`.
- **Amber (`success`)** is *achievement* — a correct answer, an active streak,
  the best score. Warm reward against the cool interface.
- **Red (`danger`)** is *only* a wrong answer. Nothing else uses it, so it always
  means the same thing.

Accent buttons use dark text (`bg`) on the bright fill for legibility and a
crisp, modern look, rather than white-on-teal which reads muddy.

## Typography

Geist Sans throughout, with a tight display tracking for headings. The one
deliberate move: **musical symbols are set in Geist Mono** — chord names, scale
notes, roman numerals, and key labels. Notation is data, and monospacing makes
it scannable and gives the app a theory-tool character rather than a generic
quiz look.

## Depth & light

The signature is the **answer reveal**. A correct answer lifts the result panel
with an amber glow; a wrong answer with a red glow — feedback is color *and*
light, felt before it's read. Active interactive elements (selected tab, primary
button) carry a soft teal glow so the current action is always obvious. A faint
teal radial gradient sits behind the whole app as ambient atmosphere; everything
else stays quiet so these moments land.

## Motion

Restrained. Hover color transitions, a subtle press-scale on buttons, and a
short fade/slide as results appear. All motion is disabled under
`prefers-reduced-motion`.

## Implementation

These tokens are the source of truth. `app/globals.css` mirrors them into
Tailwind v4 `@theme` custom properties, exposing utilities like `bg-surface`,
`text-primary`, `text-success`, and `border-border`. Run `npx design.md lint`
to validate structure and WCAG contrast before changing palette values.
