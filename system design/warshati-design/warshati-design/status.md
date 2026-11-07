# Status colors

Every status that exists in the app (reference v1.6.0, section 3), with its labels copied from the translation files. Each status has `color-<kind>-<value>-bg` / `-fg` tokens that alias one of nine tone families (`color-tone-<tone>-bg/-fg`), so retuning a tone moves every status that uses it. All pairs pass 4.5:1 in light and dark.

Rules: a badge always has an icon and a word; color alone never carries the meaning. Do not invent statuses that the app does not have.

## Repair ticket status

`TicketStatus`, `repairs.statuses.*`

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `diagnosing` | blue | Diagnosing | En diagnostic | جاري التشخيص |
| `waiting-parts` | amber | Waiting Parts | En attente de pièces | بانتظار القطع |
| `in-repair` | teal | In Repair | En réparation | في الإصلاح |
| `done` | lime | Done | Terminé | مكتمل |
| `delivered` | gray | Delivered | Livré | تم التسليم |
| `cancelled` | red | Cancelled | Annulé | ملغى |

## Priority

`repairs.priorities.*`

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `low` | gray | Low | Basse | منخفضة |
| `normal` | blue | Normal | Normale | عادية |
| `urgent` | red | Urgent | Urgente | عاجلة |

## Debt status

`DebtStatus` — today shown as raw codes

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `open` | red | Open | Ouvert | مفتوح |
| `partial` | amber | Partial | Partiel | جزئي |
| `settled` | green | Settled | Réglé | مسدد |

## Payment history markers

`PaymentHistoryModal.jsx`

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `cancelling-entry` | red | Cancelling entry | Écriture d'annulation | قيد إلغاء |
| `cancelled` | amber | Cancelled | Annulé | ملغى |

## Purchase order payment

`PaymentStatus` — today raw codes; plus the opening-balance badge

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `unpaid` | red | Unpaid | Impayé | غير مدفوع |
| `partial` | amber | Partial | Partiel | جزئي |
| `paid` | green | Paid | Payé | مدفوع |
| `opening-balance` | violet | Opening balance | Solde d'ouverture | رصيد سابق |

## Sale status

`SaleStatus` — today raw codes

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `completed` | green | Completed | Terminée | مكتملة |
| `credit` | amber | Credit | Crédit | كريدي |
| `refunded` | red | Refunded | Remboursée | مُستردّة |

## Trade-in condition

`repairs.conditions.*`

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `excellent` | teal | Excellent | Excellent | ممتاز |
| `good` | green | Good | Bon | جيد |
| `fair` | amber | Fair | Moyen | متوسط |
| `poor` | orange | Poor | Médiocre | ضعيف |
| `broken` | red | Broken | Cassé | مكسور |

## Trade-in status

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `appraised` | blue | Appraised | Évalué | تم التقييم |
| `accepted` | green | Accepted | Accepté | مقبول |
| `rejected` | red | Rejected | Rejeté | مرفوض |

## Check-in status

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `pending` | amber | Pending | En attente | قيد الانتظار |
| `converted` | green | Converted | Converti | مُحوّل |

## Warranty claim

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `within` | green | Within Warranty | Sous garantie | ضمن الضمان |
| `expired` | red | Expired | Expiré | منتهي الصلاحية |

## Warranty follow-up

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `ticket-created` | blue | Ticket Created | Ticket créé | تم إنشاء تذكرة |
| `pending` | gray | Pending | En attente | قيد الانتظار |

## Stock

only "Low Stock" exists

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `low` | red | Low Stock | Stock bas | مخزون منخفض |

## User status

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `active` | green | Active | Actif | نشط |
| `inactive` | gray | Inactive | Inactif | غير نشط |

## Value-for-money rating (phones)

`catalog.vfm.*`

| Code | Tone | EN | FR | AR |
|---|---|---|---|---|
| `performance-beast` | blue | Performance Beast | Bête de performance | هارب في الأداء |
| `value-king` | green | Value King | Excellent rapport qualité-prix | قيمة جيدة مقارنة بالسعر |
| `average` | gray | Average Value | Rapport moyen | متوسط |
| `overpriced` | red | Overpriced | Trop cher pour sa valeur | غالي على قيمته |

Labels for debt, purchase-order and sale statuses that are not in the translation files (`مسدد`, `Payé`, `مكتملة`…) are proposals for the missing keys; the debt filter labels (Open / Ouvert / مفتوح · Partial / Partiel / جزئي · Settled / Réglé / مسدد) are the app's own.

> «هارب في الأداء» for Performance Beast is copied as it is in the translation file; it reads as "fugitive in performance". «وحش في الأداء» is probably what was meant.

# Admin portal statuses

Used only in Warshati Admin (warshatydz.com/dashboard). Same rules: icon + word, never colour alone.

## License

| Code | Tone | EN |
|---|---|---|
| `activated` | green | Activated |
| `waiting` | amber | Waiting |
| `quiet` | orange | Quiet |
| `revoked` | gray | Revoked |

## Feedback status

| Code | Tone | EN |
|---|---|---|
| `new` | blue | New |
| `seen` | gray | Seen |
| `done` | green | Done |

## Feedback type

| Code | Tone | EN |
|---|---|---|
| `bug` | orange | Bug |
| `suggestion` | amber | Suggestion |
| `other` | blue | Other |

## Crash

| Code | Tone | EN |
|---|---|---|
| `open` | red | Open |
| `fixed` | green | Fixed |

A revoked key is also struck through in the key field.
