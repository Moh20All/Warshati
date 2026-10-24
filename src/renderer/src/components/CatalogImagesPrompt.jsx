import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Image } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useToast } from './ui/Toast'

/** Asks the owner once whether to download the device images (nothing is downloaded without a yes). */
export default function CatalogImagesPrompt() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const { data: status } = useQuery({
    queryKey: ['catalog-status'],
    queryFn: () => api.get('/catalog/status').then(r => r.data),
    enabled: isOwner
  })

  const open = isOwner && !dismissed && status && status.imagesConsent === null && status.images.available > 0
  const answer = async (accept) => {
    setBusy(true)
    try {
      await api.post(accept ? '/catalog/images/download' : '/catalog/images/decline')
      if (accept) toast.success(t('catalog.download_started'))
    } catch (e) { /* the Settings page offers it again */ }
    setBusy(false)
    setDismissed(true)
    queryClient.invalidateQueries({ queryKey: ['catalog-status'] })
  }

  return (
    <Modal open={!!open} onClose={() => answer(false)} title={t('catalog.prompt_title')}
      footer={<><Button variant="outline" onClick={() => answer(false)} disabled={busy}>{t('catalog.prompt_later')}</Button><Button onClick={() => answer(true)} loading={busy}>{t('catalog.prompt_download')}</Button></>}>
      <div className="flex gap-3">
        <div className="p-2 h-fit rounded-sm bg-info-soft"><Image className="h-5 w-5 text-info" /></div>
        <p className="text-sm text-muted-foreground">{t('catalog.prompt_desc', { count: status?.images.available || 0 })}</p>
      </div>
    </Modal>
  )
}
