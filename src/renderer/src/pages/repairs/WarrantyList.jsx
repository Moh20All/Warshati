import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Shield, Plus, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

export default function WarrantyList() {
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
      else { toast.warning('No delivered ticket found with that search'); setFoundTicket(null) }
    } catch { toast.error('Search failed') }
  }

  const fileMutation = useMutation({
    mutationFn: (d) => api.post('/warranty', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      const claim = res.data.claim
      toast.success(claim.isWithinWarranty ? '✅ Claim filed — WITHIN warranty' : '⚠️ Claim filed — OUTSIDE warranty')
      setShowFile(false); setFoundTicket(null); setIssueDesc(''); setResponsibleNote('')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const createTicketMutation = useMutation({
    mutationFn: (claimId) => api.post(`/warranty/${claimId}/new-ticket`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      toast.success(`Follow-up ticket ${res.data.ticket.ticketNumber} created`)
      navigate(`/repairs/tickets/${res.data.ticket.id}`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const columns = [
    { key: 'originalTicket', label: 'Original Ticket', render: (v) => <span className="font-medium text-primary">{v?.ticketNumber}</span> },
    { key: 'originalTicket', label: 'Customer', render: (v) => <div><p className="font-medium">{v?.customer?.name}</p></div> },
    { key: 'issueDesc', label: 'Issue', render: (v) => <span className="truncate max-w-[200px] inline-block">{v}</span> },
    { key: 'isWithinWarranty', label: 'Warranty', render: (v) => v ? <Badge color="success">Within Warranty</Badge> : <Badge color="danger">Expired</Badge> },
    { key: 'newTicketId', label: 'Follow-Up', render: (v) => v ? <Badge color="info">Ticket Created</Badge> : <Badge color="default">Pending</Badge> },
    { key: 'resolution', label: 'Resolution', render: (v) => v || '—' },
    { key: 'createdAt', label: 'Filed', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', className: 'text-right',
      render: (_, r) => !r.newTicketId && (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); createTicketMutation.mutate(r.id) }} loading={createTicketMutation.isPending}>
          <ArrowRight className="h-3.5 w-3.5" /> Create Ticket
        </Button>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-foreground">Warranty Claims</h1><p className="text-sm text-muted-foreground mt-1">File and track warranty issues</p></div>
        <Button onClick={() => { setShowFile(true); setFoundTicket(null); setTicketSearch(''); setIssueDesc('') }}><Plus className="h-4 w-4" /> File Claim</Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle="No warranty claims" emptyDescription="No claims filed yet." />}

      {/* File Claim Modal */}
      <Modal open={showFile} onClose={() => setShowFile(false)} title="File Warranty Claim" size="lg"
        footer={<><Button variant="outline" onClick={() => setShowFile(false)}>Cancel</Button><Button onClick={() => fileMutation.mutate({ originalTicketId: foundTicket?.id, issueDesc, responsibleNote })} loading={fileMutation.isPending} disabled={!foundTicket || !issueDesc}>File Claim</Button></>}
      >
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md space-y-2">
            <p className="text-sm font-medium">Find Original Ticket</p>
            <div className="flex gap-2">
              <Input placeholder="Ticket #, IMEI, or customer name..." value={ticketSearch} onChange={e => setTicketSearch(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={searchTicket}>Search</Button>
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
                <p className="mt-1 text-muted-foreground">Warranty: {foundTicket.warrantyDays} days from delivery</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">New Issue Description</label>
            <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="What's the issue now?" required />
          </div>
          <Input label="Responsibility Note (optional)" value={responsibleNote} onChange={e => setResponsibleNote(e.target.value)} placeholder="e.g. Manufacturing defect, user damage..." />
        </div>
      </Modal>
    </div>
  )
}
