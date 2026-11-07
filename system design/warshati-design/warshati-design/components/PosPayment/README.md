# PosPayment

The right column of `pages/sales/POS.jsx`: Totals box (Subtotal, Discount, Trade-in Credit, Total) and Payment box (Cash · Credit (Full) · Split, Amount Paid), with the app's own messages:

- Cash above the total → green "Change: X".
- Cash below the total → amber box "X is missing." with *Record the rest as a debt* (switches to Split).
- Money owed with a customer → blue "X will be added to name's debt"; without → red "X will be owed — choose the customer above first".
- *Complete Sale* is the page's one `flux` button.

**Provide** `total`, `subtotal`, `discount`, `tradeIn`, `method` (`cash` · `credit` · `split`), `paid`, `customer`, `lang`.

- Card and Bank transfer exist in the database but not in the POS; they are not added here.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
