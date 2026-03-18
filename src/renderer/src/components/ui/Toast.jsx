import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const ToastContext = createContext(null)

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
}

const colors = {
    success: 'border-success/30 bg-success/10 text-success',
    error: 'border-destructive/30 bg-destructive/10 text-destructive',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    info: 'border-info/30 bg-info/10 text-info'
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
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
                {toasts.map((t) => {
                    const Icon = icons[t.type] || icons.info
                    return (
                        <div
                            key={t.id}
                            className={`
                flex items-start gap-3 px-4 py-3 rounded-md
                border shadow-sm animate-slide-up
                ${colors[t.type] || colors.info}
              `}
                        >
                            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                            <p className="text-sm flex-1">{t.message}</p>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="shrink-0 hover:opacity-70 transition-opacity cursor-pointer"
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
