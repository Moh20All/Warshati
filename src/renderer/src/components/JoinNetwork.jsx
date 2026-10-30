import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Monitor, RefreshCw, WifiOff, ShieldAlert } from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'
import markTile from '../assets/brand/mark-trace-tile.svg'

function useErrors() {
  const { t } = useTranslation()
  return {
    unreachable: t('network.err_unreachable', 'The main PC did not answer. Check that it is on, Warshati is open on it, and both PCs are on the same Wi-Fi or cable.'),
    wrong_code: t('network.err_wrong_code', 'Wrong pairing code. Read it again on the main PC: Settings → Shop network.'),
    not_vip: t('network.err_not_vip', 'The main PC has no VIP plan. The shop network is part of the VIP plan.'),
    is_host: t('network.err_is_host', 'This PC is the main PC. Stop sharing first.')
  }
}

/** Connect this PC to the shop's main PC: find it on the network (or type its address) + pairing code */
export default function JoinNetwork({ onCancel }) {
  const { t } = useTranslation()
  const errors = useErrors()
  const [found, setFound] = useState(null)
  const [host, setHost] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const search = () => {
    setFound(null)
    window.api.networkDiscover().then((list) => {
      setFound(list)
      if (list.length === 1) setHost(list[0].address)
    }).catch(() => setFound([]))
  }
  useEffect(search, [])

  const join = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    // On success the app restarts on the main PC's data, so this only returns on failure
    const r = await window.api.networkJoin(host, code).catch(() => ({ ok: false, code: 'unreachable' }))
    if (!r.ok) {
      setError(errors[r.code] || errors.unreachable)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={join} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('network.join_desc', 'Use the data of the shop\'s main PC on this PC. On the main PC: Settings → Shop network → Share.')}</p>
      {error && (
        <div className="p-3 bg-destructive-soft rounded-sm flex gap-3 text-destructive-soft-foreground text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" /><p>{error}</p>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{t('network.found', 'Main PCs found')}</span>
          <button type="button" onClick={search} className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
            <RefreshCw className="w-3 h-3" /> {t('network.search_again', 'Search again')}
          </button>
        </div>
        {found === null ? (
          <p className="text-sm text-muted-foreground">{t('network.searching', 'Searching…')}</p>
        ) : found.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('network.none_found', 'None found. Type the main PC\'s address below.')}</p>
        ) : (
          <div className="space-y-1.5">
            {found.map((f) => (
              <button type="button" key={f.address} onClick={() => setHost(f.address)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-sm border text-start cursor-pointer ${host === f.address ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}>
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium text-foreground">{f.name}</span>
                <span className="text-xs text-muted-foreground font-mono" dir="ltr">{f.address}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Input label={t('network.address', 'Main PC address')} value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.10" dir="ltr" required />
      <Input label={t('network.code', 'Pairing code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" className="font-mono tracking-widest" dir="ltr" required />
      <div className="flex gap-2 justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{t('inventory.modal.cancel')}</Button>}
        <Button type="submit" variant="flux" loading={busy}>{t('network.connect', 'Connect')}</Button>
      </div>
    </form>
  )
}

/** Startup screen of a connected PC when the main PC can't be reached */
export function MainPcUnreachable({ code, hostName }) {
  const { t } = useTranslation()
  const errors = useErrors()
  const [changing, setChanging] = useState(false)

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-6 start-6 flex items-center gap-2.5">
        <img src={markTile} alt="" className="w-8 h-8" />
        <span className="text-foreground font-bold text-base">Warshati</span>
      </div>
      <div className="max-w-md w-full bg-card rounded-lg border border-border p-8">
        {changing ? <JoinNetwork onCancel={() => setChanging(false)} /> : (
          <div className="text-center space-y-4">
            <WifiOff className="w-12 h-12 text-warning mx-auto" />
            <h1 className="text-xl font-bold text-foreground">{t('network.unreachable_title', 'Can\'t reach the main PC')}</h1>
            <p className="text-sm font-medium text-foreground">{hostName}</p>
            <p className="text-sm text-muted-foreground">{errors[code] || errors.unreachable}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="flux" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4" /> {t('network.retry', 'Try again')}</Button>
              <Button variant="outline" onClick={() => setChanging(true)}>{t('network.change', 'Connect to another main PC')}</Button>
              <Button variant="ghost" onClick={() => window.api.networkLeave()}>{t('network.leave', 'Stop using the main PC (this PC alone)')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
