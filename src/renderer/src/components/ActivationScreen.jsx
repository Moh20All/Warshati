import { useState } from 'react'
import { ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
    <div className="fixed inset-0 z-[9999] bg-[#f3f4f6] flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1a2744] rounded-lg flex items-center justify-center shadow">
          <span className="text-[#c9a84c] font-bold text-xl leading-none pb-1">و</span>
        </div>
        <span className="text-[#1a2744] font-bold text-xl tracking-wide">Warshati</span>
      </div>

      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-[#1a2744] p-8 text-center">
          <div className="w-16 h-16 bg-[#23345a] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#c9a84c]/20">
            <KeyRound className="w-8 h-8 text-[#c9a84c]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('activation.title')}</h1>
          <p className="text-[#c9a84c]/80 text-sm">{t('activation.subtitle')}</p>
        </div>

        <div className="p-8">
          {/* Deactivation Banner — shown when license was revoked or machine reset */}
          {deactivationMessage && !success && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">{t('activation.deactivated')}</p>
                <p>{deactivationMessage}</p>
              </div>
            </div>
          )}

          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">{t('activation.success_title')}</h2>
              <p className="text-gray-500">{t('activation.success_desc')}</p>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded flex gap-3 text-red-700 text-sm">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activation.lbl_key')}
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={t('activation.ph_key')}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-center font-mono tracking-widest text-[#1a2744] uppercase focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-300"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a2744] text-[#c9a84c] font-bold py-3 px-4 rounded-lg shadow hover:bg-[#23345a] transition-all disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loading ? t('activation.btn_validating') : t('activation.btn_activate')}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <p className="mt-8 text-gray-400 text-sm">
        {t('activation.footer')}
      </p>
    </div>
  )
}
