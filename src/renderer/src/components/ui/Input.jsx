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
        <div className="flex flex-col gap-1.5 min-w-0">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-[13px] leading-[18px] font-medium text-foreground"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`
            flex h-9 w-full rounded-sm border
            bg-popover px-3 py-1 text-sm text-popover-foreground
            placeholder:text-muted-foreground
            focus:outline-2 focus:outline-ring focus:outline-offset-1
            disabled:cursor-not-allowed disabled:bg-muted disabled:text-disabled-foreground
            read-only:bg-muted
            transition-colors duration-150
            ${Icon ? 'ps-[34px]' : ''}
            ${IconRight ? 'pe-[34px]' : ''}
            ${error ? 'border-2 border-destructive' : 'border-input'}
            ${className}
          `}
                    {...props}
                />
                {IconRight && (
                    <div className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <IconRight className="h-4 w-4" />
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-muted-foreground">{helperText}</p>
            )}
        </div>
    )
})

Input.displayName = 'Input'

export default Input
