# Button

Restyles `ui/Button.jsx`: the same five variants and three sizes, plus one addition.

**Variants** `primary` (Board green) · `secondary` · `danger` · `ghost` · `outline` — as in the app. **Sizes** `sm` h-8 · `md` h-9 · `lg` h-10. `loading` shows the spinner.

**Addition: `flux`** (lime). Use it on at most one button per page — the main action of that page: *Complete Sale*, *Create Check-In*, *Activate Device*, *Sign In*. Everywhere else, keep the variant the app already uses.

- Hover on `ghost` and `outline` uses `color-accent`, exactly where the app already does (its accent is the hover colour; it is now a quiet green tint, not gold).
- Icon-only buttons keep a `label` for the tooltip.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
