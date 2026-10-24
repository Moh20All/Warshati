import { useTranslation } from 'react-i18next'

// Every status the app has, with its translated label and its colour tokens (design system status.md).
// Class names are written out in full so Tailwind generates them.
const KINDS = {
  ticket: {
    label: (v) => `repairs.statuses.${v}`,
    tone: {
      DIAGNOSING: 'bg-ticket-diagnosing-bg text-ticket-diagnosing-fg',
      WAITING_PARTS: 'bg-ticket-waiting-parts-bg text-ticket-waiting-parts-fg',
      IN_REPAIR: 'bg-ticket-in-repair-bg text-ticket-in-repair-fg',
      DONE: 'bg-ticket-done-bg text-ticket-done-fg',
      DELIVERED: 'bg-ticket-delivered-bg text-ticket-delivered-fg',
      CANCELLED: 'bg-ticket-cancelled-bg text-ticket-cancelled-fg'
    }
  },
  priority: {
    label: (v) => `repairs.priorities.${v}`,
    tone: {
      LOW: 'bg-priority-low-bg text-priority-low-fg',
      NORMAL: 'bg-priority-normal-bg text-priority-normal-fg',
      URGENT: 'bg-priority-urgent-bg text-priority-urgent-fg'
    }
  },
  debt: {
    label: (v) => `repairs.statuses.${v}`,
    tone: {
      OPEN: 'bg-debt-open-bg text-debt-open-fg',
      PARTIAL: 'bg-debt-partial-bg text-debt-partial-fg',
      SETTLED: 'bg-debt-settled-bg text-debt-settled-fg'
    }
  },
  payment: {
    label: (v) => (v === 'CANCELLING_ENTRY' ? 'finance.debts.cancelling_entry' : 'finance.debts.cancelled'),
    tone: {
      CANCELLING_ENTRY: 'bg-payment-cancelling-entry-bg text-payment-cancelling-entry-fg',
      CANCELLED: 'bg-payment-cancelled-bg text-payment-cancelled-fg'
    }
  },
  po: {
    label: (v) => (v === 'OPENING_BALANCE' ? 'finance.suppliers.opening_label' : `repairs.statuses.${v}`),
    tone: {
      UNPAID: 'bg-po-unpaid-bg text-po-unpaid-fg',
      PARTIAL: 'bg-po-partial-bg text-po-partial-fg',
      PAID: 'bg-po-paid-bg text-po-paid-fg',
      OPENING_BALANCE: 'bg-po-opening-balance-bg text-po-opening-balance-fg'
    }
  },
  sale: {
    label: (v) => `repairs.statuses.${v}`,
    tone: {
      COMPLETED: 'bg-sale-completed-bg text-sale-completed-fg',
      CREDIT: 'bg-sale-credit-bg text-sale-credit-fg',
      REFUNDED: 'bg-sale-refunded-bg text-sale-refunded-fg'
    }
  },
  condition: {
    label: (v) => `repairs.conditions.${v}`,
    tone: {
      EXCELLENT: 'bg-condition-excellent-bg text-condition-excellent-fg',
      GOOD: 'bg-condition-good-bg text-condition-good-fg',
      FAIR: 'bg-condition-fair-bg text-condition-fair-fg',
      POOR: 'bg-condition-poor-bg text-condition-poor-fg',
      BROKEN: 'bg-condition-broken-bg text-condition-broken-fg'
    }
  },
  tradein: {
    label: (v) => `repairs.statuses.${v}`,
    tone: {
      APPRAISED: 'bg-tradein-appraised-bg text-tradein-appraised-fg',
      ACCEPTED: 'bg-tradein-accepted-bg text-tradein-accepted-fg',
      REJECTED: 'bg-tradein-rejected-bg text-tradein-rejected-fg'
    }
  },
  checkin: {
    label: (v) => (v === 'CONVERTED' ? 'repairs.checkin.converted' : 'repairs.checkin.pending'),
    tone: {
      PENDING: 'bg-checkin-pending-bg text-checkin-pending-fg',
      CONVERTED: 'bg-checkin-converted-bg text-checkin-converted-fg'
    }
  },
  warranty: {
    label: (v) => (v === 'WITHIN' ? 'repairs.warranty.within' : 'repairs.warranty.expired'),
    tone: {
      WITHIN: 'bg-warranty-within-bg text-warranty-within-fg',
      EXPIRED: 'bg-warranty-expired-bg text-warranty-expired-fg'
    }
  },
  followup: {
    label: (v) => (v === 'TICKET_CREATED' ? 'repairs.warranty.ticket_created' : 'repairs.warranty.pending'),
    tone: {
      TICKET_CREATED: 'bg-followup-ticket-created-bg text-followup-ticket-created-fg',
      PENDING: 'bg-followup-pending-bg text-followup-pending-fg'
    }
  },
  stock: {
    label: () => 'inventory.labels.low_stock',
    tone: { LOW: 'bg-stock-low-bg text-stock-low-fg' }
  },
  user: {
    label: (v) => (v === 'ACTIVE' ? 'users.active' : 'users.inactive'),
    tone: {
      ACTIVE: 'bg-user-active-bg text-user-active-fg',
      INACTIVE: 'bg-user-inactive-bg text-user-inactive-fg'
    }
  },
  vfm: {
    label: (v) => `catalog.vfm.${v}`,
    tone: {
      PERFORMANCE_BEAST: 'bg-vfm-performance-beast-bg text-vfm-performance-beast-fg',
      VALUE_KING: 'bg-vfm-value-king-bg text-vfm-value-king-fg',
      AVERAGE: 'bg-vfm-average-bg text-vfm-average-fg',
      OVERPRICED: 'bg-vfm-overpriced-bg text-vfm-overpriced-fg'
    }
  },
  // Neutral labels: what kind of thing, not a state
  method: { label: (v) => `sales.payment_methods.${v}`, tone: {} },
  debtType: { label: (v) => `finance.debts.types.${v}`, tone: {} },
  inventoryType: {
    label: (v) => ({ PHONE_NEW: 'inventory.types.phone_new', PHONE_USED: 'inventory.types.phone_used', PART: 'inventory.types.part', ACCESSORY: 'inventory.types.accessory' }[v] || v),
    tone: {}
  }
}

const NEUTRAL = 'bg-secondary text-secondary-foreground'

/** A translated status pill: always a word (and a dot for states), never colour alone. */
export default function StatusBadge({ kind, value, className = '', children }) {
  const { t } = useTranslation()
  const def = KINDS[kind]
  if (!def || !value) return null
  const tone = def.tone[value]
  const label = t(def.label(value), { defaultValue: String(value).replace(/_/g, ' ') })
  return (
    <span className={`inline-flex items-center gap-[5px] h-[22px] px-[9px] text-xs leading-4 font-semibold rounded-full whitespace-nowrap ${tone || NEUTRAL} ${className}`}>
      {tone && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children ?? label}
    </span>
  )
}
