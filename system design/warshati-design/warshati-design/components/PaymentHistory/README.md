# PaymentHistory

The table inside `PaymentHistoryModal.jsx`, newest first: Date · Amount · Note · actions. A cancelling entry is red with "−" and the *Cancelling entry* badge; the cancelled payment is struck through with the *Cancelled* badge; normal payments show *Receipt* (customer debts) and *Cancel payment* (owner).

**Provide** `payments` (`{date, amount, note, cancelled?, cancelling?}`), `owner`, `receipts` (false for suppliers), `lang`.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
