import { Inbox } from 'lucide-react'
import Button from './Button'

export default function EmptyState({
    icon: Icon = Inbox,
    title = 'No data',
    description = 'No records found.',
    actionLabel,
    onAction,
    className = ''
}) {
    return (
        <div className={`flex flex-col items-center justify-center gap-1 px-4 py-8 text-center ${className}`}>
            <div className="grid place-items-center h-11 w-11 rounded-full bg-muted mb-1.5">
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-[13px] text-muted-foreground max-w-sm">{description}</p>
            {actionLabel && onAction && (
                <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
