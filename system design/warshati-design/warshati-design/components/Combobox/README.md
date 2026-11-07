# Combobox

Restyles `ui/Combobox.jsx`: a searchable list that ignores case and accents; ↓/↑ to move, Enter to pick, Escape to close.

**Provide** `value`, `placeholder`, `open`, `query`, `items` (`{label, sub, count, badge, photo, manual}`), `highlight`.

- The highlighted row uses `color-accent` (the hover tint).
- The list floats with `shadow-pop`.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
