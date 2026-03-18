import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground'
}

const sizes = {
    sm: 'h-8 px-3 text-xs rounded-sm',
    md: 'h-9 px-4 text-sm rounded-md',
    lg: 'h-10 px-6 text-sm rounded-md'
}

const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-colors duration-150 cursor-pointer
        disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
            {...props}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    )
})

Button.displayName = 'Button'

export default Button
