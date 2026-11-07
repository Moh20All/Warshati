# Money

How amounts look: `14 500 DZD` / `14 500 د.ج` — thin-space grouping, tabular digits, isolated so it never flips inside Arabic.

**Provide** `value`, `lang`, `strong`.

- The app formats with `toLocaleString()`, which follows the PC's settings (14,500 / 14 500 / ١٤٬٥٠٠). For a consistent look, format with Western digits and a thin space; this is a display change only.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
