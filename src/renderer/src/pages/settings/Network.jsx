import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Network as NetworkIcon, Lock, Monitor, RefreshCw, Copy } from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import JoinNetwork from '../../components/JoinNetwork'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../lib/auth'
import { hasNetworkPlan } from '../../lib/plan'

/** Settings → Shop network (Pro and VIP): share this PC's data, or see the main PC this PC uses */
export default function NetworkPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const toast = useToast()
  const [st, setSt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'stop' | 'renew' | 'leave'
  const [joining, setJoining] = useState(false)

  const load = () => window.api.networkStatus(token).then(setSt).catch(() => {})
  useEffect(() => {
    load()
    const timer = setInterval(load, 10000) // connected PCs come and go
    return () => clearInterval(timer)
  }, [token])

  const share = async (on) => {
    setBusy(true)
    const r = await window.api.networkShare(token, on)
    setBusy(false)
    setConfirm(null)
    if (!r.ok) return toast.error(t('network.err_share', 'Could not change sharing.'))
    toast.success(on ? t('network.sharing_on', 'This PC now shares its data.') : t('network.sharing_off', 'Sharing stopped.'))
    load()
  }

  const renew = async () => {
    await window.api.networkRenewCode(token)
    setConfirm(null)
    load()
  }

  const copy = (text) => navigator.clipboard.writeText(text).then(() => toast.success(t('network.copied', 'Copied')))

  const header = (
    <div className="mb-6">
      <h1 className="text-[22px] leading-[30px] font-semibold text-foreground flex items-center gap-2">
        {t('network.title', 'Shop network')} <Badge variant="primary">Pro</Badge>
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{t('network.subtitle', 'Several PCs in the shop work on the same data: one main PC keeps it, the others connect to it.')}</p>
    </div>
  )

  if (!st) return <div className="animate-fade-in">{header}</div>

  // This PC uses the main PC's data
  if (st.mode === 'client') {
    return (
      <div className="animate-fade-in max-w-2xl">
        {header}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{t('network.connected_to', 'Connected to the main PC')}</p>
              <p className="text-sm text-muted-foreground">{st.hostName} · <span className="font-mono" dir="ltr">{st.host}</span></p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('network.client_note', 'Sales, repairs, stock and customers are saved on the main PC. Backups are made there too.')}</p>
          <Button variant="outline" onClick={() => setConfirm('leave')}>{t('network.leave', 'Stop using the main PC (this PC alone)')}</Button>
        </div>
        <ConfirmModal open={confirm === 'leave'} onClose={() => setConfirm(null)} onConfirm={() => window.api.networkLeave()}
          title={t('network.leave_title', 'Stop using the main PC?')} message={t('network.leave_msg', 'Warshati restarts and this PC goes back to its own data (and its own license, if it has one).')}
          confirmText={t('network.leave_confirm', 'Stop and restart')} />
      </div>
    )
  }

  // Any PC that is not the main PC can join one (the main PC's Pro or VIP license is what counts)
  const joinCard = (
    <div className="bg-card border border-border rounded-lg p-6 flex items-start gap-4">
      <Monitor className="w-6 h-6 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-foreground">{t('network.join_title', 'Connect this PC to a main PC')}</p>
        <p className="text-sm text-muted-foreground mt-1">{t('network.join_card_desc', 'This PC will use the main PC\'s data. Its own data and license stay here, unused, until you stop.')}</p>
      </div>
      <Button variant="outline" onClick={() => setJoining(true)}>{t('network.connect', 'Connect')}</Button>
    </div>
  )
  const joinModal = (
    <Modal open={joining} onClose={() => setJoining(false)} title={t('network.join_title', 'Connect this PC to a main PC')}>
      {joining && <JoinNetwork onCancel={() => setJoining(false)} />}
    </Modal>
  )

  if (!hasNetworkPlan()) {
    return (
      <div className="animate-fade-in max-w-2xl">
        {header}
        <div className="bg-card border border-border rounded-lg p-6 flex gap-4">
          <Lock className="w-6 h-6 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">{t('network.vip_only', 'Part of the Pro and VIP plans')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('network.vip_only_desc', 'Contact Warshati to move to the Pro plan, then restart the app.')}</p>
          </div>
        </div>
        <div className="mt-4">{joinCard}</div>
        {joinModal}
      </div>
    )
  }

  const sharing = st.mode === 'host'
  return (
    <div className="animate-fade-in max-w-2xl space-y-4">
      {header}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-4">
          <NetworkIcon className={`w-6 h-6 flex-shrink-0 ${sharing ? 'text-success' : 'text-muted-foreground'}`} />
          <div className="flex-1">
            <p className="font-medium text-foreground">{sharing ? t('network.is_main', 'This PC is the main PC') : t('network.share_title', 'Make this PC the main PC')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {sharing ? t('network.is_main_desc', 'Keep it on and Warshati open while the other PCs work.') : t('network.share_desc', 'Choose the PC that stays on all day. Its data is shared with the other PCs.')}
            </p>
          </div>
          {sharing
            ? <Button variant="outline" onClick={() => setConfirm('stop')}>{t('network.stop', 'Stop sharing')}</Button>
            : <Button variant="flux" loading={busy} onClick={() => share(true)}>{t('network.share', 'Share')}</Button>}
        </div>
        {sharing && <p className="text-xs text-muted-foreground border-t border-border pt-3">{t('network.firewall', 'If Windows asks whether Warshati may use the network, choose Allow (private networks).')}</p>}
      </div>

      {sharing && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-5">
          <p className="text-sm text-foreground">{t('network.how', 'On each other PC: install Warshati, then on the activation screen choose "Connect this PC to the main PC" and type:')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('network.code', 'Pairing code')}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-semibold tracking-widest text-foreground" dir="ltr">{st.code}</span>
                <button onClick={() => copy(st.code)} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent cursor-pointer"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('network.address', 'Main PC address')}</p>
              {(st.addresses || []).map((a) => <p key={a} className="text-lg font-mono text-foreground" dir="ltr">{a}</p>)}
              {!st.addresses?.length && <p className="text-sm text-warning">{t('network.no_network', 'This PC is not on a network.')}</p>}
            </div>
          </div>
          <button onClick={() => setConfirm('renew')} className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
            <RefreshCw className="w-3 h-3" /> {t('network.renew', 'New code (disconnects all other PCs)')}
          </button>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-2">{t('network.pcs', 'Connected PCs (last 5 minutes)')}</p>
            {st.connected?.length ? st.connected.map((c) => (
              <div key={c.address} className="flex items-center gap-3 py-1.5 text-sm">
                <Monitor className="w-4 h-4 text-success" />
                <span className="font-mono" dir="ltr">{c.address}</span>
                <span className="text-muted-foreground text-xs">{new Date(c.lastSeen).toLocaleTimeString()}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">{t('network.no_pcs', 'None yet.')}</p>}
          </div>
        </div>
      )}

      {!sharing && joinCard}
      {joinModal}

      <ConfirmModal open={confirm === 'stop'} onClose={() => setConfirm(null)} onConfirm={() => share(false)} loading={busy}
        title={t('network.stop_title', 'Stop sharing?')} message={t('network.stop_msg', 'The other PCs will stop working until sharing is on again.')}
        confirmText={t('network.stop', 'Stop sharing')} />
      <ConfirmModal open={confirm === 'renew'} onClose={() => setConfirm(null)} onConfirm={renew}
        title={t('network.renew_title', 'New pairing code?')} message={t('network.renew_msg', 'Every other PC must be connected again with the new code.')}
        confirmText={t('network.renew_confirm', 'New code')} />
    </div>
  )
}
