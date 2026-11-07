# Input

Restyles `ui/Input.jsx`: h-9, optional left/right icon, error text in red, help text in grey. `Field` wraps any control with the same label/error/help line.

**Provide** `label`, `required`, `value`, `placeholder`, `leftIcon`, `rightIcon`, `error`, `help`, `mono` (IMEI, SKU, license key), `center` (license key), `multiline`, `dir`.

- Borders use `color-input`, now dark enough to see (3:1) — the old #e2e8f0 was nearly invisible.
- Phone, IMEI and amounts stay left-to-right in Arabic (`dir="ltr"`).

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
