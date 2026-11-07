# Warshati design system — how to use this folder in Claude Code

Put this folder at the root of the Warshati repo as `warshati-design/`, then paste this to Claude Code:

> Read `warshati-design/README.md` first, then `admin.md`, `status.md`, `print.md`, `wording.md`.
> Restyle the app to this design system. Rule 1 is absolute: change only how things look — colours, fonts, spacing, radii, icons, logo.
> Do NOT add, remove, rename or reorder any page, field, column, button, dialog, step, message, calculation or permission.
> Do NOT fix the items in `app-fixes.md` unless I ask for each one.
> Work in this order and stop after each step so I can check:
> 1. Copy `tokens.css` values into the `@theme` block of `src/renderer/src/index.css` (same variable names; add the new ones). Bundle the fonts from `fonts/`.
> 2. Replace hard-coded colours (sidebar header, Activation, crash screen, update toast, dashboard quick buttons, Monthly Summary cards) with tokens.
> 3. Restyle ui/Button, ui/Input, ui/Badge, ui/Modal, ui/Table, ui/Combobox, layout/Sidebar, Header, DevicePicker to match `components/<Name>/preview.html` and `components/bundle.css`.
> 4. Show translated status labels with the status colours from `status.md` instead of raw codes.
> 5. Replace the old logos ("و" on navy, the "R" square/circle) with `assets/mark-trace-*.svg`, and set `assets/app-icon/warshati.ico` as the app icon.
> 6. Restyle the print templates as described in `print.md` (same lines, same order).
> For the admin portal (warshatydz.com/dashboard), follow `admin.md` the same way.

## What is inside

- `README.md`, `admin.md`, `status.md`, `print.md`, `wording.md`, `app-fixes.md` — the rules.
- `tokens.css` / `tokens.json` — all colours, sizes, fonts (light default, dark optional).
- `fonts/` — IBM Plex Sans, Plex Sans Arabic, Plex Mono (woff2, free to ship).
- `components/` — `bundle.css` (the styles), `bundle.js` (reference React components), and one `preview.html` per component and per screen (S01–S22 app, A01–A10 admin, Print*, Landing).
- `assets/` — logos and marks (SVG), app icon (PNG + .ico), installer images.

To view any card, open its `components/<Name>/preview.html` in a browser (double-click works). Change `data-theme="light"` to `"dark"` at the top of a file to see the dark version.
