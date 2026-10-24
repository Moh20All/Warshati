import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const ToastContext = createContext(null)

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
}

// Design system: a card with a coloured icon, so the message text stays readable
const colors = {
    success: 'text-success',
    error: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info'
}

let toastId = 0

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++toastId
        setToasts((prev) => [...prev, { id, message, type }])

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id))
            }, duration)
        }

        return id
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info')
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Toast container */}
            <div className="fixed bottom-6 end-6 z-[100] flex flex-col gap-2">
                {toasts.map((t) => {
                    const Icon = icons[t.type] || icons.info
                    return (
                        <div
                            key={t.id}
                            className="flex items-start gap-2.5 min-w-[280px] max-w-[380px] px-3 py-2.5 rounded-md bg-popover text-popover-foreground border border-border shadow-pop animate-slide-up"
                        >
                            <Icon className={`h-5 w-5 shrink-0 ${colors[t.type] || colors.info}`} />
                            <p className="text-[13px] leading-[18px] font-medium flex-1 pt-px">{t.message}</p>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
