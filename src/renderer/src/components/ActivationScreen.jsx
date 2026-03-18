import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react'

export default function ActivationScreen({ onActivated, deactivationMessage }) {
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
      // 1. Fetch license from Supabase
      const { data: license, error: fetchErr } = await supabase
        .from('licenses')
        .select('*')
        .eq('key', key.trim().toUpperCase())
        .single()

      if (fetchErr || !license) {
        throw new Error('Invalid license key. Please check for typos.')
      }

      if (!license.is_active) {
        throw new Error('This license has been revoked by the administrator.')
      }

      // 2. Cross-verify the stable Machine ID
      const machineId = await window.api.getMachineId()

      if (license.machine_id && license.machine_id !== machineId) {
        throw new Error('Key already in use on another computing device.')
      }

      // 3. Update Supabase if unactivated (binding the hardware)
      if (!license.machine_id) {
        const { error: updateErr } = await supabase
          .from('licenses')
          .update({
            machine_id: machineId,
            activated_at: new Date().toISOString()
          })
          .eq('id', license.id)
          
        if (updateErr) throw new Error('Failed to bind license to this device.')
      }

      // 4. Save to local native SQLite via IPC so it works offline forever
      const cached = await window.api.setupLicense(license.key, machineId)
      if (!cached) throw new Error('Failed to write activation cache to local disk.')

      setSuccess(true)
      setTimeout(() => {
        onActivated()
      }, 1500)

    } catch (err) {
      setError(err.message || 'An unexpected activation error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f3f4f6] flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1a2744] rounded-lg flex items-center justify-center shadow">
          <span className="text-[#c9a84c] font-bold text-xl">R</span>
        </div>
        <span className="text-[#1a2744] font-bold text-xl tracking-wide">Rakam</span>
      </div>

      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-[#1a2744] p-8 text-center">
          <div className="w-16 h-16 bg-[#23345a] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#c9a84c]/20">
            <KeyRound className="w-8 h-8 text-[#c9a84c]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Software Activation</h1>
          <p className="text-[#c9a84c]/80 text-sm">Enter your 16-character license key</p>
        </div>

        <div className="p-8">
          {/* Deactivation Banner — shown when license was revoked or machine reset */}
          {deactivationMessage && !success && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">License Deactivated</p>
                <p>{deactivationMessage}</p>
              </div>
            </div>
          )}

          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Activation Successful</h2>
              <p className="text-gray-500">Launching application environment...</p>
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
                  License Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="RAKAM-XXXX-XXXX-XXXX-XXXX"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-center font-mono tracking-widest text-[#1a2744] uppercase focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-300"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a2744] text-[#c9a84c] font-bold py-3 px-4 rounded-lg shadow hover:bg-[#23345a] transition-all disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loading ? 'Validating Telemetry...' : 'Activate Device'}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <p className="mt-8 text-gray-400 text-sm">
        Need a license? Contact Rakam administrative support.
      </p>
    </div>
  )
}
