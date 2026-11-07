# StatusBadge

Every status the app has (reference section 3), translated, with an icon, from the `color-<kind>-<value>-bg/-fg` tokens.

**Provide** `kind` (`ticket` · `priority` · `debt` · `payment` · `po` · `sale` · `condition` · `tradein` · `checkin` · `warranty` · `followup` · `stock` · `user` · `vfm`), `value` (the code in kebab case: `IN_REPAIR` → `in-repair`), `lang`.

- Fixes a bug while restyling: Dashboard, Customer profile, Debt Ledger, Invoices and Supplier tables show **raw codes** (IN REPAIR, OPEN, COMPLETED, PAID…). Render them with this badge so they show the translated label. Nothing else in those tables changes.
- Colours keep the app's meaning (Done is lime because it is the "ready for pickup" state; Delivered is grey; Cancelled red). In Repair is teal so it is not confused with Diagnosing (both were info-blue).
- `payment/cancelled` is struck through; `payment/cancelling-entry` is red — as in the payment history.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
