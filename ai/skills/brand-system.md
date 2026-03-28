# AgentTrace Visual System

## IDENTITY:
This is not a SaaS interface.
This is a deterministic execution monitoring system.

## FEEL:
- Calm
- Precise
- Silent
- Inevitable

## METAPHOR:
User is observing causality, not interacting casually.

---

## COLOR SYSTEM (STRICT):

- **bg-primary**: #0A0A0A
- **bg-secondary**: #111111
- **border**: #1F1F1F

- **text-primary**: #EAEAEA
- **text-secondary**: #9CA3AF

- **accent**: #6366F1
- **success**: #22C55E
- **error**: #EF4444

**RULES:**
- No gradients
- No glow
- No random colors
- No arbitrary hex values in className (`[#...]` forbidden)
- Accent only for action or focus

---

## INTERACTION SYSTEM (COMPLETE):

- **Hover**: `bg-secondary` OR border emphasis. Never use accent for hover.
- **Focus**: `outline-accent` only. No other focus styles.
- **Active**: Slight opacity or contrast shift. No color change.
- **Disabled**: `opacity-50`, no pointer events, no interaction.

---

## SURFACE SYSTEM:

**Card:**
- background: bg-card
- border: 1px solid border
- radius: 12px (rounded-xl)
- padding: 16px (p-4, fixed)

No shadows. No variants. ONE visual style per primitive.

---

## TYPOGRAPHY:

- **Hero**: 40–56px / 600
- **Section**: 20–24px / 500
- **Body**: 14–16px / 400 (MINIMUM 14px)
- **Meta**: 12px / 400

**RULES:**
- Font must feel geometric, clean.
- No 13px text anywhere.
- No 11px text anywhere.

---

## SPACING & RHYTHM:

Use strict 8px grid.

- **Major Section Gap**: 32px
- **Card-to-Card Gap**: 16px
- **Inside Card Padding**: 16px

Never mix arbitrary spacing stacks.

---

## DATA DENSITY:

- Max **3 levels of hierarchy** per screen
- Each section must have **clear visual boundary**
- Tables must not exceed **6 columns** visible by default
- Use **truncation** instead of wrapping for long text

---

## COMPONENT CONTRACTS:

### Variant Explosion Control
System components must NOT support visual variants.
- Only ONE visual style per primitive
- Variants allowed ONLY for semantic behavior (e.g., status type)

### Layout vs Content Separation
`className` on system primitives is restricted to:

**Allowed:** `margin`, `width`, `height`, `flex/grid positioning`, `visibility`
**Forbidden:** `background`, `border`, `padding`, `radius`, `color`, `font-size`

---

## FUTURE FEATURE SAFETY:

All new UI must pass:
1. `system-enforcer` audit
2. Regression grep checks
3. Component primitive usage validation

No direct UI is allowed without passing the pipeline.

---

## OUTPUT RULE:
Always enforce system.
Never invent new styles.
