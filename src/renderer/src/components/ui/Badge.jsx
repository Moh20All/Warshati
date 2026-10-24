const colorMap = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary-soft text-primary-soft-foreground',
    success: 'bg-success-soft text-success-soft-foreground',
    warning: 'bg-warning-soft text-warning-soft-foreground',
    danger: 'bg-destructive-soft text-destructive-soft-foreground',
    info: 'bg-info-soft text-info-soft-foreground',
    // Ticket statuses
    DIAGNOSING: 'bg-ticket-diagnosing-bg text-ticket-diagnosing-fg',
    WAITING_PARTS: 'bg-ticket-waiting-parts-bg text-ticket-waiting-parts-fg',
    IN_REPAIR: 'bg-ticket-in-repair-bg text-ticket-in-repair-fg',
    DONE: 'bg-ticket-done-bg text-ticket-done-fg',
    DELIVERED: 'bg-ticket-delivered-bg text-ticket-delivered-fg',
    CANCELLED: 'bg-ticket-cancelled-bg text-ticket-cancelled-fg',
    // Priorities
    LOW: 'bg-priority-low-bg text-priority-low-fg',
    NORMAL: 'bg-priority-normal-bg text-priority-normal-fg',
    URGENT: 'bg-priority-urgent-bg text-priority-urgent-fg',
    // Debt
    OPEN: 'bg-debt-open-bg text-debt-open-fg',
    PARTIAL: 'bg-debt-partial-bg text-debt-partial-fg',
    SETTLED: 'bg-debt-settled-bg text-debt-settled-fg'
}

export default function Badge({
    children,
    color = 'default',
    dot = false,
    className = ''
}) {
    return (
        <span className={`
      inline-flex items-center gap-[5px] h-[22px] px-[9px]
      text-xs leading-4 font-semibold rounded-full whitespace-nowrap
      ${colorMap[color] || colorMap.default}
      ${className}
    `}>
            {dot && (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
            {children}
        </span>
    )
}
