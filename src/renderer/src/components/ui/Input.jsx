import { forwardRef } from 'react'

const Input = forwardRef(({
    label,
    error,
    helperText,
    icon: Icon,
    iconRight: IconRight,
    className = '',
    id,
    ...props
}, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-foreground"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
            flex h-9 w-full rounded-md border border-input
            bg-background px-3 py-1 text-sm text-foreground
            placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1
            disabled:cursor-not-allowed disabled:opacity-50
            transition-colors duration-150
            ${Icon ? 'pl-9' : ''}
            ${IconRight ? 'pr-9' : ''}
            ${error ? 'border-destructive focus:ring-destructive' : ''}
            ${className}
          `}
                    {...props}
                />
                {IconRight && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <IconRight className="h-4 w-4" />
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-muted-foreground">{helperText}</p>
            )}
        </div>
    )
})

Input.displayName = 'Input'

export default Input
