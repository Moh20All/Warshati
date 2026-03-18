import { Loader2 } from 'lucide-react'

const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
}

export default function Spinner({ size = 'md', className = '' }) {
    return (
        <Loader2 className={`animate-spin text-muted-foreground ${sizes[size] || sizes.md} ${className}`} />
    )
}

export function FullPageSpinner() {
    return (
        <div className="flex items-center justify-center h-screen">
            <Spinner size="lg" />
        </div>
    )
}
