# MoneyInput

Style for the app's currency number fields (Final Cost, Parts Cost, Deposit, Buy/Sell Price, Amount Paid, Payment Amount…): right-aligned tabular digits with the store currency as a suffix.

**Provide** `label` (the app's existing label), `value`, `placeholder`, `lang`.

- The currency suffix comes from the store setting (DZD / د.ج, or USD, EUR, SAR, MAD, TND).
- Display only; it does not change how the number is parsed or saved.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
