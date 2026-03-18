import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Printer } from 'lucide-react'
import api from '../../lib/api'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'

export default function InvoiceList() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sales', search],
    queryFn: () => api.get('/sales', { params: { search: search || undefined } }).then(r => r.data.sales)
  })

  const printReceipt = (s) => {
    const w = window.open('', '_blank', 'width=400,height=600')
    w.document.write(`<html><head><title>Invoice ${s.saleNumber}</title>
    <style>body{font-family:monospace;padding:20px;font-size:12px}h2{text-align:center;margin:0}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:3px 0}table{width:100%;border-collapse:collapse}td{padding:2px 0;font-size:11px}</style></head>
    <body><h2>Rakam - رقم</h2><p style="text-align:center">Invoice</p><div class="line"></div>
    <div class="row"><span>INV#:</span><strong>${s.saleNumber}</strong></div>
    <div class="row"><span>Date:</span><span>${new Date(s.createdAt).toLocaleString()}</span></div>
    ${s.customer ? `<div class="row"><span>Customer:</span><span>${s.customer.name}</span></div>` : ''}
    <div class="line"></div>
    <table>${s.items.map(i => `<tr><td>${i.description}</td><td style="text-align:right">${i.quantity}×${Number(i.unitPrice).toLocaleString()}</td><td style="text-align:right">${Number(i.subtotal).toLocaleString()}</td></tr>`).join('')}</table>
    <div class="line"></div>
    <div class="row"><strong>Total:</strong><strong>${Number(s.total).toLocaleString()} DZD</strong></div>
    <div class="row"><span>Paid:</span><span>${Number(s.amountPaid).toLocaleString()} DZD</span></div>
    <div class="row"><span>Method:</span><span>${s.paymentMethod}</span></div>
    <div class="line"></div><p style="text-align:center;font-size:10px">Thank you!</p></body></html>`)
    w.document.close(); w.print()
  }

  const columns = [
    { key: 'saleNumber', label: 'Invoice #', render: (v) => <span className="font-medium text-primary">{v}</span> },
    { key: 'customer', label: 'Customer', render: (v) => v ? <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.phone}</p></div> : <span className="text-muted-foreground">Walk-in</span> },
    { key: 'total', label: 'Total', render: (v) => <span className="font-medium">{Number(v).toLocaleString()} DZD</span> },
    { key: 'paymentMethod', label: 'Payment', render: (v) => <Badge>{v}</Badge> },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v === 'COMPLETED' ? 'success' : v === 'CREDIT' ? 'warning' : 'info'}>{v}</Badge> },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', className: 'text-right', render: (_, r) => (
      <button onClick={(e) => { e.stopPropagation(); printReceipt(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><Printer className="h-3.5 w-3.5" /></button>
    )}
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6"><h1 className="text-2xl font-bold text-foreground">Invoices</h1><p className="text-sm text-muted-foreground mt-1">All sales history</p></div>
      <div className="mb-4 max-w-sm"><Input placeholder="Search invoice #, customer..." icon={Search} value={search} onChange={e => setSearch(e.target.value)} /></div>
      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle="No invoices" emptyDescription="Sales invoices will appear here." />}
    </div>
  )
}
