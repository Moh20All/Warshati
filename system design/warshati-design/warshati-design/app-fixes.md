# App fixes

Things noticed while matching the design to the app reference (v1.6.0). They are **not** part of the restyle — fix them on purpose, one by one, if you want them. Nothing in the design system depends on them.

## Shown wrongly (display only)

- **Raw codes instead of labels:** Dashboard (status, priority, sale status), Customer profile (status, priority, sale status, payment, debt type, condition, trade-in status), Debt Ledger (OPEN/PARTIAL/SETTLED), Invoices (CASH/CREDIT/SPLIT, COMPLETED/CREDIT/REFUNDED), Supplier (PAID/PARTIAL/UNPAID, OPEN/…), Inventory type ("PHONE NEW"). The translation keys are missing for debt, sale, PO statuses and payment methods. `StatusBadge` shows the intended look.
- **Sale receipt Discount line never prints:** the template reads `discount`, the sale saves `discountAmount`.
- **Repair ticket prints "Customer Name \*"** with the form's asterisk.
- **Dashboard date** is always in English (`en-US`); "Print Overview" is an English fallback (`common.print` missing).
- **Store settings** still show the old "R" logo and "Phone Repair & Store Management" (EN).

## Missing translations (show in English in FR/AR)

- Breadcrumb names (hard-coded), `navigation.about`, `navigation.repairs` (Monthly Summary "Repairs" box may show the key), `about.title`, `about.subtitle`, `about.changelog`.
- Warranty (Days) label in the inventory form; "Print Report" on Daily Close; "Sale Completed / Would you like to print the receipt?".
- Dashboard sub-lines ("N ready for pickup", "X sales, Y delivered repairs", "N entries", "Nd ago", "Walk-in · N items"), POS "N in stock", "Total:", "Loading inventory...", Monthly chart axis ("1st", "15th").
- Crash screen, update indicator, feedback dialog, backup dialogs, license lock messages, server messages.

## Typos in translation files

- FR status filter: "Touts les statuts" → "Tous les statuts".
- AR suppliers search placeholder: "خث..." → "بحث...".
- AR value rating: «هارب في الأداء» → probably «وحش في الأداء».

## Behaviour (only if you decide to)

- POS "Print Receipt (Enter)" — Enter is not wired; only Esc works.
- Card and Bank transfer exist in the database but not in the POS.
- Trade-ins are saved as Accepted immediately although the button says "Appraise"; Accept/Reject have no buttons.
- Check-in and trade-in always create a new customer instead of reusing one with the same phone.
- Customers cannot be edited or deleted from any screen.
- Daily Close has no drawer-counting field and does not show real profit (only the owner's Dashboard card does).
- Ticket warranty days default to 30 instead of the store's default warranty setting.
- The bell icon in the header does nothing.
- Table headers look sortable but no page passes a sort handler.
