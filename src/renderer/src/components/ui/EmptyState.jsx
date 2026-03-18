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
        <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
            <div className="rounded-full bg-muted p-3 mb-3">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
            {actionLabel && onAction && (
                <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
