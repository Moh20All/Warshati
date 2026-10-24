import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquarePlus, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './ui/Modal'
import Button from './ui/Button'

const FEEDBACK_TYPES = ['Bug', 'Suggestion', 'Other']

export default function FeedbackModal({ open, onClose }) {
  const { t } = useTranslation()
  const [type, setType] = useState('Bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSending(true)
    setError('')

    try {
      const { error: insertErr } = await supabase.from('feedback').insert({
        type,
        message: message.trim(),
        app_version: __APP_VERSION__,
        os_info: navigator.userAgent,
        created_at: new Date().toISOString()
      })

      if (insertErr) throw insertErr

      setSent(true)
      setTimeout(() => {
        setSent(false)
        setMessage('')
        setType('Bug')
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to send feedback. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      setSent(false)
      setMessage('')
      setType('Bug')
      setError('')
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={sent ? '' : 'Send Feedback'} size="md"
      footer={!sent && (
        <>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={sending} disabled={!message.trim()}>
            <Send className="h-4 w-4" /> Send Feedback
          </Button>
        </>
      )}
    >
      {sent ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Thank you!</h2>
          <p className="text-muted-foreground">Your feedback was sent.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive-soft rounded-sm text-destructive-soft-foreground text-sm">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Feedback Type</label>
            <div className="flex gap-2">
              {FEEDBACK_TYPES.map(ft => (
                <button
                  key={ft}
                  onClick={() => setType(ft)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    type === ft
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback..."
              rows={5}
              className="w-full rounded-sm border border-input bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              required
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
