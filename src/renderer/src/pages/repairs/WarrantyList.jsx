import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Shield, Plus, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'

export default function WarrantyList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showFile, setShowFile] = useState(false)
  const [ticketSearch, setTicketSearch] = useState('')
  const [foundTicket, setFoundTicket] = useState(null)
  const [issueDesc, setIssueDesc] = useState('')
  const [responsibleNote, setResponsibleNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['warranty-claims'],
    queryFn: () => api.get('/warranty').then(r => r.data.claims)
  })

  const searchTicket = async () => {
    if (!ticketSearch) return
    try {
      const res = await api.get('/tickets', { params: { search: ticketSearch } })
      const delivered = res.data.tickets?.filter(t => t.status === 'DELIVERED')
      if (delivered?.length > 0) { setFoundTicket(delivered[0]) }
      else { toast.warning(t('repairs.warranty.err_notfound')); setFoundTicket(null) }
    } catch { toast.error(t('repairs.warranty.err_search')) }
  }

  const fileMutation = useMutation({
    mutationFn: (d) => api.post('/warranty', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      const claim = res.data.claim
      toast.success(claim.isWithinWarranty ? `✅ ${t('repairs.warranty.success_within')}` : `⚠️ ${t('repairs.warranty.success_outside')}`)
      setShowFile(false); setFoundTicket(null); setIssueDesc(''); setResponsibleNote('')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const createTicketMutation = useMutation({
    mutationFn: (claimId) => api.post(`/warranty/${claimId}/new-ticket`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      toast.success(t('repairs.details.created', { num: res.data.ticket.ticketNumber }))
      navigate(`/repairs/tickets/${res.data.ticket.id}`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const columns = [
    { key: 'originalTicket', label: t('repairs.warranty.orig_ticket'), render: (v) => <span className="font-medium text-primary">{v?.ticketNumber}</span> },
    { key: 'originalTicket', label: t('repairs.warranty.customer'), render: (v) => <div><p className="font-medium">{v?.customer?.name}</p></div> },
    { key: 'issueDesc', label: t('repairs.warranty.issue'), render: (v) => <span className="truncate max-w-[200px] inline-block">{v}</span> },
    { key: 'isWithinWarranty', label: t('repairs.warranty.warranty'), render: (v) => <StatusBadge kind="warranty" value={v ? 'WITHIN' : 'EXPIRED'} /> },
    { key: 'newTicketId', label: t('repairs.warranty.followup'), render: (v) => <StatusBadge kind="followup" value={v ? 'TICKET_CREATED' : 'PENDING'} /> },
    { key: 'resolution', label: t('repairs.warranty.resolution'), render: (v) => v || '—' },
    { key: 'createdAt', label: t('repairs.warranty.filed'), render: (v) => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', className: 'text-right',
      render: (_, r) => !r.newTicketId && (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); createTicketMutation.mutate(r.id) }} loading={createTicketMutation.isPending}>
          <ArrowRight className="h-3.5 w-3.5" /> {t('repairs.warranty.create_ticket')}
        </Button>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('repairs.warranty.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('repairs.warranty.subtitle')}</p></div>
        <Button onClick={() => { setShowFile(true); setFoundTicket(null); setTicketSearch(''); setIssueDesc('') }}><Plus className="h-4 w-4" /> {t('repairs.warranty.file_claim')}</Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle={t('repairs.warranty.empty_title')} emptyDescription={t('repairs.warranty.empty_desc')} />}

      {/* File Claim Modal */}
      <Modal open={showFile} onClose={() => setShowFile(false)} title={t('repairs.warranty.modal_title')} size="lg"
        footer={<><Button variant="outline" onClick={() => setShowFile(false)}>{t('repairs.warranty.cancel')}</Button><Button onClick={() => fileMutation.mutate({ originalTicketId: foundTicket?.id, issueDesc, responsibleNote })} loading={fileMutation.isPending} disabled={!foundTicket || !issueDesc}>{t('repairs.warranty.btn_file')}</Button></>}
      >
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md space-y-2">
            <p className="text-sm font-medium">{t('repairs.warranty.find_orig')}</p>
            <div className="flex gap-2">
              <Input placeholder={t('repairs.warranty.search_ph')} value={ticketSearch} onChange={e => setTicketSearch(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={searchTicket}>{t('repairs.warranty.search')}</Button>
            </div>
            {foundTicket && (
              <div className="mt-2 p-2 border border-border rounded-md text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="font-medium text-primary">{foundTicket.ticketNumber}</span>
                  <span>·</span>
                  <span>{foundTicket.customer?.name}</span>
                  <span>·</span>
                  <span>{foundTicket.deviceBrand} {foundTicket.deviceModel}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{t('repairs.warranty.warranty_days', { days: foundTicket.warrantyDays })}</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('repairs.warranty.lbl_new_issue')}</label>
            <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} className="flex min-h-[60px] w-full rounded-sm border border-input bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('repairs.warranty.ph_new_issue')} required />
          </div>
          <Input label={t('repairs.warranty.lbl_note')} value={responsibleNote} onChange={e => setResponsibleNote(e.target.value)} placeholder={t('repairs.warranty.ph_note')} />
        </div>
      </Modal>
    </div>
  )
}
