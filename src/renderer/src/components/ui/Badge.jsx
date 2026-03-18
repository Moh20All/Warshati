const colorMap = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/15 text-destructive',
    info: 'bg-info/15 text-info',
    // Ticket statuses
    DIAGNOSING: 'bg-info/15 text-info',
    WAITING_PARTS: 'bg-warning/15 text-warning',
    IN_REPAIR: 'bg-info/15 text-info',
    DONE: 'bg-success/15 text-success',
    DELIVERED: 'bg-secondary text-secondary-foreground',
    CANCELLED: 'bg-destructive/15 text-destructive',
    // Priorities
    LOW: 'bg-secondary text-secondary-foreground',
    NORMAL: 'bg-info/15 text-info',
    URGENT: 'bg-destructive/15 text-destructive',
    // Debt
    OPEN: 'bg-destructive/15 text-destructive',
    PARTIAL: 'bg-warning/15 text-warning',
    SETTLED: 'bg-success/15 text-success'
}

export default function Badge({
    children,
    color = 'default',
    dot = false,
    className = ''
}) {
    return (
        <span className={`
      inline-flex items-center gap-1.5 px-2 py-0.5
      text-xs font-medium rounded-sm
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
