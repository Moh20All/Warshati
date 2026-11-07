Warshati (ورشتي) is a Windows app for Algerian repair shops (phones, laptops, consoles), built with Electron, React and Tailwind 4. It has two roles, **Owner** (`OWNER`) and **Seller** (`STAFF`), works in English, French and Arabic (full right-to-left), and prints on 80 mm, 58 mm and A4. This design system **restyles that existing app**. It was matched page by page to the app as it is in v1.6.0. It also covers **Warshati Admin**, the owner's private portal at warshatydz.com/dashboard (see **Admin portal**), with the same rules.

## Rule 1: restyle, never restructure

This system decides how Warshati **looks**, not how it **works**. When applying it:

- Keep every page, route, field, column, button, dialog, step, message, calculation, permission and keyboard behaviour exactly as the app has them. Restyle them; do not remove, merge, rename, reorder or add any.
- The cards under **Screens** reproduce the real pages with sample data. If a card and the code disagree on anything other than colour, type, spacing, radius or icon, **the code wins**.
- Labels come from the app's translation files. A French or Arabic word in a preview that is not in those files is a placeholder, not new copy.
- Do not change business logic, the database, saved settings or print content while restyling. Bugs noticed while reading the app are listed under **App fixes** — fix them separately, on purpose, not as part of the restyle.

## Rule 2: light by default

The app is light-only today; keep light as the default. The dark values in `tokens.json` are an **optional** theme for later (a setting the owner turns on). Never follow the Windows theme automatically.

## Rule 3: green is a signal, not a wall

The palette comes from inside the devices the shop opens: circuit-board green (`color-primary`, "Board") and solder-flux lime (`color-flux`), on warm paper (`color-background`). No navy, no gold.

- Green fills only small things: primary buttons, links, the active sidebar icon, the logo, key figures.
- Large areas are neutral: `color-background`, `color-card`, `color-muted`. The active sidebar item is `color-primary-soft`, not solid green.
- `color-flux` (lime) goes on **one** element per page at most — that page's main action (Complete Sale, Create Check-In, Activate Device, Sign In, Appraise). Text on it is always `color-flux-foreground`.
- Big brand panels (sidebar header band, activation card header, crash screen header, website hero, installer) use `color-inverse` graphite, not green.
- About 85% neutral, 10% green, 5% lime on any page.

## Tokens use the app's own names

`tokens.css` declares the same variables the app's `src/renderer/src/index.css` `@theme` block already has, so the restyle is mostly **replacing values**:

| App variable | Was | Now (light) | Note |
|---|---|---|---|
| `--color-background` | #fafbfc | #F3F1EA | warm paper |
| `--color-foreground` | #0f172a | #14201B | |
| `--color-card` / `--color-popover` | #ffffff | #FFFFFF | |
| `--color-primary` | #0c0f1a navy | #0F4F3C | Board green |
| `--color-primary-foreground` | #ffffff | #FFFFFF | |
| `--color-secondary` / `--color-muted` | #f1f5f9 | #EAE6DB | |
| `--color-secondary-foreground` | #334155 | #3A433E | |
| `--color-muted-foreground` | #64748b | #535C56 | |
| `--color-accent` | #c9972b gold | #E4EDE6 | **the app uses accent as the hover background** of sidebar items, menus, ghost and outline buttons — so it is now a quiet tint. The lime is a new variable, `--color-flux`. |
| `--color-accent-foreground` | #ffffff | #0A3D2E | |
| `--color-destructive` | #ef4444 | #B3261E | passes 4.5:1 as text |
| `--color-border` | #e2e8f0 | #DDD7C9 | |
| `--color-input` | #e2e8f0 | #857D6B | input borders now visible (3:1) |
| `--color-ring` | #2563eb | #1B6FD8 | |
| `--color-success` / `warning` / `info` | #16a34a / #f59e0b / #0ea5e9 | #17633B / #8A5300 / #1D5B8F | dark enough to be text on their 15% tints |
| `--radius-sm/md/lg` | .375 / .5 / .75rem | unchanged | |
| `--font-sans` | Inter (not bundled) | IBM Plex Sans + Plex Sans Arabic | bundled in `fonts/` |

New variables (nothing uses them yet): `--color-flux*`, `--color-primary-hover`, `--color-primary-soft*`, `--color-*-soft*` (box grounds), `--color-inverse*`, `--color-whatsapp*`, `--color-overlay`, `--color-print-*`, `--color-tone-*`, and the status tokens (see **Status colors**).

**Hard-coded colours to replace with tokens:** sidebar header (#0c0f1a, #161b2e, #c9972b → `color-inverse`, `color-inverse-raised`, `color-flux`); Activation, crash screen and update toast (#1a2744, #23345a, #c9a84c, #d6bc70 → `color-inverse`, `color-flux`, `color-*-soft`); Dashboard quick buttons and Monthly Summary cards (Tailwind blue/emerald/violet/orange/pink/rose/amber/sky → `secondary` buttons and `StatCard`); A4 reports (#10b981, #f43f5e, #333, #666, #ddd → `color-print-ink`).

## Content

- Keep the app's words. Tone stays short and practical: *Fast checkout*, *Track all repairs*.
- Numbers: Western digits (0–9) in all languages. Amounts: thin-space grouping and the store currency after the number — `14 500 DZD`, `14 500 د.ج`. The app uses `toLocaleString()`, which follows the PC's settings; prefer one fixed format (display only).
- Document numbers (`TKT-2026-0187`, `INV-…`, `CI-…`, `PO-…`, `OB-…`), IMEI, SKU and license keys use the `code` style (Plex Mono) and stay left-to-right in Arabic.
- Show status **labels**, never raw codes (IN REPAIR, OPEN, COMPLETED, CASH…) — use `StatusBadge`.
- No emoji on printed receipts (📍📞 are dropped by most thermal printers). ⚠ and ✓ in on-screen badges may stay.

## Type

- IBM Plex Sans (Latin) + IBM Plex Sans Arabic, bundled as woff2 (SIL Open Font License — they can ship inside the installer). IBM Plex Mono for codes. `--font-sans` falls back per glyph to Arabic; `--font-arabic` reverses the order for `dir="rtl"`.
- Sizes: `page-title` 22, `heading` 16, `body` 14/22, `table` 13, `label` 13, `caption` 12 (smallest on screen), `stat-value` 24.
- Print: Plex Sans 500 for lines, 700 for titles and totals, Plex Mono for document numbers — replacing Courier New. Smallest printed size 10px.

## Layout

- Keep the app's layout: sidebar 224 px (64 px collapsed), header with breadcrumbs, page padding 24 px, modals sm/md/lg/xl, toasts bottom-right for 4 s.
- Check every page at 1366×768 (shops' screens) and at the app's minimum window, 1024×700.
- Controls: buttons h-8 / h-9 / h-10, inputs h-9 — as today.
- Cards: border, no shadow. Shadows only for floating things (`shadow-pop` dropdowns and toasts, `shadow-dialog` modals).
- Focus: 2px `color-ring`, 2px offset.
- Arabic: the whole page mirrors (`dir="rtl"` on `<html>`, as today). Use logical properties (`ms-`, `me-`, `start`, `end`) so sidebar, breadcrumbs and chevrons flip; number fields do not.

## Logo

- **Trace (المسار)** — a W drawn as a circuit-board trace with solder pads — is the logo. Waw-nut and Pentalobe stay under **Brand → Logo directions** for reference only.
- Sidebar band and app header: `mark-trace-tile.svg`. Light grounds: `mark-trace.svg`. 16–32 px: `mark-trace-16.svg`. Print: `mark-trace-black.svg` (replaces the black "R" circle on every receipt) and `lockup-trace-black.svg`. Colour lockup: `lockup-trace.svg`.
- Replace the old marks everywhere: gold "و" on navy (sidebar, Login, Activation) and the "R" square (Store settings, receipts).
- Windows icon frames are in `AppIcon`, installer images in `Installer`.
- Clear space: half the mark's height. Do not recolour, outline or add effects.

## Iconography

A 24px line set drawn for Warshati (`Icon`, 1.75 stroke, `currentColor`), covering the sidebar, buttons and table actions. Direction icons mirror in Arabic.

## Using the components

Load `tokens.css`, `components/bundle.css`, React 18 and `components/bundle.js`; components are on `window.Warshati`. They are **visual references** for the app's own components (`ui/Button.jsx`, `ui/Input.jsx`, `ui/Badge.jsx`, `ui/Modal.jsx`, `ui/Table.jsx`, `ui/Combobox.jsx`, `layout/Sidebar.jsx`, `Header.jsx`, `DevicePicker.jsx`…): copy their classes and token use into those files rather than replacing them.
