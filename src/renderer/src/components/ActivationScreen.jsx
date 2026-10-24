import { useState } from 'react'
import { ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import markTile from '../assets/brand/mark-trace-tile.svg'

export default function ActivationScreen({ onActivated, deactivationMessage }) {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleActivate = async (e) => {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError('')

    try {
      // Verification, machine binding and local caching all happen in the main process
      const result = await window.api.activateLicense(key)
      if (!result.ok) {
        const messages = {
          invalid: t('activation.err_invalid'),
          revoked: t('activation.err_revoked'),
          in_use: t('activation.err_in_use'),
          offline: t('activation.err_offline'),
          cache: t('activation.err_cache')
        }
        throw new Error(messages[result.code] || t('activation.err_unexpected'))
      }

      setSuccess(true)
      setTimeout(() => {
        onActivated()
      }, 1500)

    } catch (err) {
      setError(err.message || t('activation.err_unexpected'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="absolute top-6 start-6 flex items-center gap-2.5">
        <img src={markTile} alt="" className="w-8 h-8" />
        <span className="text-foreground font-bold text-base">Warshati</span>
      </div>

      <div className="max-w-md w-full bg-card rounded-lg overflow-hidden border border-border">
        <div className="bg-inverse text-inverse-foreground p-8 text-center">
          <div className="w-16 h-16 bg-inverse-raised rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-flux/20">
            <KeyRound className="w-8 h-8 text-flux" />
          </div>
          <h1 className="text-2xl font-bold text-inverse-foreground mb-2">{t('activation.title')}</h1>
          <p className="text-inverse-foreground/80 text-sm">{t('activation.subtitle')}</p>
        </div>

        <div className="p-8">
          {/* Deactivation Banner — shown when license was revoked or machine reset */}
          {deactivationMessage && !success && (
            <div className="mb-6 p-4 bg-warning-soft rounded-sm text-warning-soft-foreground text-sm flex gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-warning mt-0.5" />
              <div>
                <p className="font-semibold mb-1">{t('activation.deactivated')}</p>
                <p>{deactivationMessage}</p>
              </div>
            </div>
          )}

          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">{t('activation.success_title')}</h2>
              <p className="text-muted-foreground">{t('activation.success_desc')}</p>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive-soft rounded-sm flex gap-3 text-destructive-soft-foreground text-sm">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('activation.lbl_key')}
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={t('activation.ph_key')}
                  className="w-full border border-input bg-card rounded-sm px-4 py-3 text-center font-mono tracking-widest text-foreground uppercase focus:border-ring focus:ring-2 focus:ring-ring outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-disabled-foreground"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-flux text-flux-foreground border border-flux-soft-foreground font-semibold py-3 px-4 rounded-sm hover:bg-flux-hover transition-all disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loading ? t('activation.btn_validating') : t('activation.btn_activate')}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <p className="mt-8 text-muted-foreground text-sm">
        {t('activation.footer')}
      </p>
    </div>
  )
}
