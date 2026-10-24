import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from './Button'

const sizeClasses = {
    sm: 'max-w-[400px]',
    md: 'max-w-[520px]',
    lg: 'max-w-[720px]',
    xl: 'max-w-[960px]'
}

// Open modals, newest last: Escape closes only the top one, and the page scroll comes back
// only when the last one closes (a modal can open another, e.g. device details from a form).
const openStack = []

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
    const token = useRef({})
    const closeRef = useRef(onClose)
    closeRef.current = onClose

    useEffect(() => {
        if (!open) return
        const me = token.current
        openStack.push(me)
        document.body.style.overflow = 'hidden'
        const handleEscape = (e) => {
            if (e.key === 'Escape' && openStack[openStack.length - 1] === me) closeRef.current()
        }
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('keydown', handleEscape)
            openStack.splice(openStack.indexOf(me), 1)
            if (openStack.length === 0) document.body.style.overflow = ''
        }
    }, [open])

    if (!open) return null

    // Rendered on <body> so a modal opened from inside another one is never clipped by it
    return createPortal(
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-overlay animate-fade-in"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose()
            }}
        >
            <div className={`
        w-full ${sizeClasses[size] || sizeClasses.md}
        bg-card text-card-foreground rounded-lg
        shadow-dialog animate-slide-up
        ${className}
      `}>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                    <h2 className="flex-1 text-base leading-6 font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
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
