# Wording

The app's own messages, copied from the translation files (reference v1.6.0, section 6). The restyle does not change any of them. Placeholders are `{{name}}`, `{{device}}`, `{{store}}`, `{{ticket}}`, `{{amount}}`; if there is no store name, "Warshati" is used.

## WhatsApp messages

### Device ready, amount due — `repairs.details.wa_ready`

- **EN** — Hello {{name}}, your {{device}} is repaired and ready for pickup at {{store}} (ticket {{ticket}}). Amount to pay: {{amount}}. Thank you!
- **FR** — Bonjour {{name}}, votre {{device}} est réparé et prêt à être récupéré chez {{store}} (ticket {{ticket}}). Montant à payer : {{amount}}. Merci !
- **AR** — مرحباً {{name}}، جهازك {{device}} تم إصلاحه وهو جاهز للاستلام في {{store}} (تذكرة {{ticket}}). المبلغ المطلوب: {{amount}}. شكراً!

### Device ready, nothing due — `wa_ready_paid`

- **EN** — Hello {{name}}, your {{device}} is repaired and ready for pickup at {{store}} (ticket {{ticket}}). Thank you!
- **FR** — Bonjour {{name}}, votre {{device}} est réparé et prêt à être récupéré chez {{store}} (ticket {{ticket}}). Merci !
- **AR** — مرحباً {{name}}، جهازك {{device}} تم إصلاحه وهو جاهز للاستلام في {{store}} (تذكرة {{ticket}}). شكراً!

### Debt reminder — `finance.debts.wa_reminder`

- **EN** — Hello {{name}}, this is a friendly reminder from {{store}}: your remaining balance is {{amount}}. Thank you!
- **FR** — Bonjour {{name}}, petit rappel de la part de {{store}} : il vous reste {{amount}} à payer. Merci !
- **AR** — مرحباً {{name}}، تذكير ودي من {{store}}: المبلغ المتبقي عليك هو {{amount}}. شكراً!

### WhatsApp errors

| EN | FR | AR |
|---|---|---|
| This customer has no phone number | Ce client n'a pas de numéro de téléphone | هذا الزبون ليس لديه رقم هاتف |
| This phone number cannot be used for WhatsApp (add the country code, e.g. +213…) | Ce numéro ne peut pas être utilisé pour WhatsApp (ajoutez l'indicatif, ex. +213…) | لا يمكن استخدام هذا الرقم في واتساب (أضف رمز الدولة، مثلاً +213…) |

## How messages look

| Where | Component | Tone |
|---|---|---|
| Field-level error (missing customer, device, issue) | `Input error` — red text under the field, red border | error |
| Form / screen error box (Login, Activation, Setup) | `Alert tone="error"` | error |
| License deactivated, "X is missing.", restore warning, over 30 days | `Alert tone="warning"` or warning `Badge` | warning |
| "X will be added to name's debt" | info line | info |
| "X will be owed — choose the customer above first" | danger line | error |
| "Change: X" | success line | success |
| Result of an action ("Ticket TKT-… created", "Payment cancelled", server errors) | `Toast`, bottom-right, 4 s | success / error / warning / info |
| Confirmations ("Close Today?", "Deactivate Item", "Cancel this payment?") | `ConfirmModal` | danger button for destructive ones |

## Messages that exist in one language only

These show in English whatever the language. Translating them is a wording fix, not part of the restyle; the full list is in **App fixes**.

- Server messages ("Not enough stock for X (available: N)", "Cannot transition from X to Y", "Amount exceeds the remaining balance (N)"…).
- License lock messages, crash screen, update indicator, feedback dialog, backup dialogs.
- Breadcrumb names, "Nd ago", "N in stock", "Walk-in · N items", dashboard sub-lines.
