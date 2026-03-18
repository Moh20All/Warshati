import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

export default function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    className = ''
}) {
    const overlayRef = useRef(null)

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose()
        }
        if (open) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    if (!open) return null

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl'
    }

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose()
            }}
        >
            <div className={`
        w-full ${sizeClasses[size] || sizeClasses.md}
        bg-card text-card-foreground rounded-lg
        border border-border shadow-lg animate-slide-up
        ${className}
      `}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}

// Confirmation modal shorthand
export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={loading}>
                        {confirmText}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-muted-foreground">{message}</p>
        </Modal>
    )
}
