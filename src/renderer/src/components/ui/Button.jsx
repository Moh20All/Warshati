import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

// Design system: Board green primary; `flux` (lime) is for the ONE main action of a page
const variants = {
    primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
    danger: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
    ghost: 'border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
    outline: 'border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
    flux: 'border-flux-soft-foreground bg-flux text-flux-foreground hover:bg-flux-hover',
    whatsapp: 'border-transparent bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90'
}

const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-[13px] leading-[18px]',
    lg: 'h-10 px-5 text-sm'
}

// Disabled = grey; loading keeps its colour (with a spinner) so it does not look like an error
const DISABLED = 'bg-muted text-disabled-foreground border-border cursor-not-allowed'

const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    ...props
}, ref) => {
    const look = disabled && !loading ? DISABLED : `${variants[variant] || variants.primary} cursor-pointer`
    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={`
        inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap
        rounded-sm border transition-colors duration-150
        ${loading ? 'pointer-events-none opacity-80' : ''}
        ${look}
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
