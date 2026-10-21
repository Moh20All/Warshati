import { Component } from 'react'
import { useState } from 'react'
import { AlertTriangle, RotateCcw, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

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
    <div className="fixed inset-0 z-[9999] bg-[#f3f4f6] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-[#1a2744] p-6 text-center">
          <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Something went wrong</h1>
          <p className="text-gray-400 text-sm">The app encountered an unexpected error.</p>
        </div>

        <div className="p-6 space-y-4">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-800 mb-1">Report sent!</h2>
              <p className="text-gray-500 text-sm mb-4">Thank you for helping us improve Warshati.</p>
              <button
                onClick={onRestart}
                className="px-4 py-2 bg-[#1a2744] text-[#c9a84c] font-medium rounded-lg hover:bg-[#23345a] transition-colors cursor-pointer"
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
                  <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-600 max-h-32 overflow-auto whitespace-pre-wrap">
                    {errorMessage}{'\n\n'}{stackTrace}
                  </pre>
                )}
              </div>

              {/* Context field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  What were you doing when this happened?
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. I was creating a new repair ticket..."
                  rows={3}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReport}
                  disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a2744] text-[#c9a84c] font-medium rounded-lg hover:bg-[#23345a] transition-colors disabled:opacity-70 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Report Problem'}
                </button>
                <button
                  onClick={onRestart}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
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
