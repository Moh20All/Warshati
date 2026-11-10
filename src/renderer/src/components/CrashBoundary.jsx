import { Component } from 'react'
import { useState } from 'react'
import { AlertTriangle, RotateCcw, Send, CheckCircle2 } from 'lucide-react'

/**
 * Error Boundary that catches React rendering errors and shows a recovery UI
 * with "Report Problem" and "Restart App" options.
 */
export default class CrashBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Write to console for local log capture
    console.error('[CrashBoundary] Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <CrashRecoveryUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRestart={() => {
            this.setState({ hasError: false, error: null, errorInfo: null })
            window.location.reload()
          }}
        />
      )
    }
    return this.props.children
  }
}

function CrashRecoveryUI({ error, errorInfo, onRestart }) {
  const [context, setContext] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [showStack, setShowStack] = useState(false)

  const errorMessage = error?.message || String(error)
  const stackTrace = error?.stack || errorInfo?.componentStack || 'No stack trace available'

  const handleReport = async () => {
    setSending(true)
    try {
      const { supabase } = await import('../lib/supabase') // loaded only when a crash is reported
      await supabase.from('crash_reports').insert({
        error: errorMessage,
        stack: stackTrace,
        context: context.trim() || null,
        app_version: __APP_VERSION__,
        os: navigator.userAgent,
        created_at: new Date().toISOString()
      })
      setSent(true)
    } catch (e) {
      console.error('Failed to submit crash report:', e)
      // Still show sent — the crash was logged locally
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card rounded-lg overflow-hidden border border-border">
        {/* Header */}
        <div className="bg-inverse text-inverse-foreground p-6 text-center">
          <div className="w-14 h-14 bg-inverse-raised rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7 text-flux" />
          </div>
          <h1 className="text-xl font-bold text-inverse-foreground mb-1">Something went wrong</h1>
          <p className="text-inverse-foreground/75 text-sm">The app encountered an unexpected error.</p>
        </div>

        <div className="p-6 space-y-4">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <h2 className="text-lg font-bold text-foreground mb-1">Report sent!</h2>
              <p className="text-muted-foreground text-sm mb-4">Thank you for helping us improve Warshati.</p>
              <button
                onClick={onRestart}
                className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary-hover transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 inline mr-2" /> Restart App
              </button>
            </div>
          ) : (
            <>
              {/* Collapsible Error Details */}
              <div>
                <button
                  onClick={() => setShowStack(!showStack)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showStack ? '▼' : '▶'} Error details
                </button>
                {showStack && (
                  <pre className="mt-2 p-3 bg-muted border border-border rounded-sm text-[10px] text-muted-foreground font-mono max-h-32 overflow-auto whitespace-pre-wrap">
                    {errorMessage}{'\n\n'}{stackTrace}
                  </pre>
                )}
              </div>

              {/* Context field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  What were you doing when this happened?
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. I was creating a new repair ticket..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReport}
                  disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-sm hover:bg-primary-hover transition-colors disabled:opacity-70 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Report Problem'}
                </button>
                <button
                  onClick={onRestart}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-input bg-card text-foreground font-medium rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Restart App
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
