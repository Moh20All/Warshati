import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Trash2, Printer, ShoppingCart } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function POS() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const barcodeRef = useRef(null)

  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(0)
  const [tradeInCredit, setTradeInCredit] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerId, setCustomerId] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [lastSale, setLastSale] = useState(null)

  useEffect(() => { barcodeRef.current?.focus() }, [])

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const total = Math.max(0, subtotal - discount - tradeInCredit)
  const paid = amountPaid ? parseFloat(amountPaid) : total
  const change = Math.max(0, paid - total)

  const lookupCustomer = async () => {
    if (!phoneSearch) return
    try {
      const res = await api.get(`/customers/lookup/${phoneSearch}`)
      if (res.data.customer) { setCustomerId(res.data.customer.id); setCustomerName(res.data.customer.name) }
      else toast.warning('Customer not found')
    } catch { toast.error('Lookup failed') }
  }

  const scanBarcode = async (e) => {
    if (e.key !== 'Enter') return
    const code = e.target.value.trim()
    if (!code) return
    try {
      const res = await api.get(`/inventory/barcode/${code}`)
      if (res.data.item) {
        addToCart(res.data.item)
        e.target.value = ''
      } else {
        toast.warning('Item not found')
      }
    } catch { toast.error('Scan failed') }
  }

  const searchItem = async () => {
    const code = barcodeRef.current?.value?.trim()
    if (!code) return
    try {
      const res = await api.get('/inventory', { params: { search: code } })
      if (res.data.items?.length > 0) {
        addToCart(res.data.items[0])
        barcodeRef.current.value = ''
      } else toast.warning('Item not found')
    } catch { toast.error('Search failed') }
  }

  const addToCart = (item) => {
    const existing = cart.find(c => c.inventoryItemId === item.id)
    if (existing) {
      setCart(cart.map(c => c.inventoryItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([...cart, { inventoryItemId: item.id, name: item.name, unitCost: parseFloat(item.buyPrice) || 0, unitPrice: parseFloat(item.sellPrice), quantity: 1, maxQty: item.quantity }])
    }
  }

  const updateQty = (idx, qty) => {
    setCart(cart.map((c, i) => i === idx ? { ...c, quantity: Math.max(1, Math.min(qty, c.maxQty)) } : c))
  }

  const updatePrice = (idx, price) => {
    setCart(cart.map((c, i) => i === idx ? { ...c, unitPrice: parseFloat(price) || 0 } : c))
  }

  const removeItem = (idx) => setCart(cart.filter((_, i) => i !== idx))

  const saleMutation = useMutation({
    mutationFn: (d) => api.post('/sales', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setLastSale(res.data.sale)
      toast.success(`Sale ${res.data.sale.saleNumber} completed!`)
      setCart([]); setDiscount(0); setTradeInCredit(0); setAmountPaid(''); setPaymentMethod('CASH')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Sale failed')
  })

  const completeSale = () => {
    if (cart.length === 0) return toast.warning('Cart is empty')
    if ((paymentMethod === 'CREDIT' || paymentMethod === 'SPLIT') && !customerId) return toast.warning('Customer is required for credit sales')
    saleMutation.mutate({
      customerId, items: cart.map(c => ({ inventoryItemId: c.inventoryItemId, name: c.name, description: c.name, unitCost: c.unitCost, unitPrice: c.unitPrice, quantity: c.quantity })),
      discount, tradeInCredit, paymentMethod, amountPaid: paid
    })
  }

  const printReceipt = () => {
    if (!lastSale) return
    const s = lastSale
    const w = window.open('', '_blank', 'width=400,height=600')
    w.document.write(`<html><head><title>Receipt</title>
    <style>body{font-family:monospace;padding:20px;font-size:12px}h2{text-align:center;margin:0}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:3px 0}table{width:100%;border-collapse:collapse}td{padding:2px 0;font-size:11px}</style></head>
    <body><h2>Rakam - رقم</h2><p style="text-align:center">Sales Receipt</p><div class="line"></div>
    <div class="row"><span>INV#:</span><strong>${s.saleNumber}</strong></div>
    <div class="row"><span>Date:</span><span>${new Date(s.createdAt).toLocaleString()}</span></div>
    ${s.customer ? `<div class="row"><span>Customer:</span><span>${s.customer.name}</span></div>` : ''}
    <div class="line"></div>
    <table>${s.items.map(i => `<tr><td>${i.description}</td><td style="text-align:right">${i.quantity}×${Number(i.unitPrice).toLocaleString()}</td><td style="text-align:right">${Number(i.subtotal).toLocaleString()}</td></tr>`).join('')}</table>
    <div class="line"></div>
    <div class="row"><span>Subtotal:</span><span>${Number(s.subtotal).toLocaleString()} DZD</span></div>
    ${parseFloat(s.discount) > 0 ? `<div class="row"><span>Discount:</span><span>-${Number(s.discount).toLocaleString()} DZD</span></div>` : ''}
    <div class="row"><strong>Total:</strong><strong>${Number(s.total).toLocaleString()} DZD</strong></div>
    <div class="row"><span>Paid:</span><span>${Number(s.amountPaid).toLocaleString()} DZD</span></div>
    ${parseFloat(s.change) > 0 ? `<div class="row"><span>Change:</span><span>${Number(s.change).toLocaleString()} DZD</span></div>` : ''}
    <div class="line"></div><p style="text-align:center;font-size:10px">Thank you for choosing Rakam!</p></body></html>`)
    w.document.close(); w.print()
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-foreground">Point of Sale</h1><p className="text-sm text-muted-foreground mt-1">Fast checkout</p></div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Cart */}
        <div className="col-span-2 space-y-4">
          {/* Barcode scanner input */}
          <div className="flex gap-2">
            <input ref={barcodeRef} onKeyDown={scanBarcode} className="flex-1 h-10 rounded-md border-2 border-primary bg-background px-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Scan barcode or type to search..." autoFocus />
            <Button onClick={searchItem} variant="outline">Search</Button>
          </div>

          {/* Cart table */}
          {cart.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Scan or search items to add to cart</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Item</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground w-24">Qty</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground w-32">Price</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground w-32">Subtotal</th>
                  <th className="w-10"></th>
                </tr></thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium">{item.name}</td>
                      <td className="px-4 py-2"><input type="number" value={item.quantity} onChange={e => updateQty(i, parseInt(e.target.value) || 1)} className="w-16 h-7 text-center text-sm rounded border border-input mx-auto block" min={1} max={item.maxQty} /></td>
                      <td className="px-4 py-2"><input type="number" value={item.unitPrice} onChange={e => updatePrice(i, e.target.value)} className="w-24 h-7 text-right text-sm rounded border border-input ml-auto block" /></td>
                      <td className="px-4 py-2 text-right font-medium">{(item.unitPrice * item.quantity).toLocaleString()} DZD</td>
                      <td className="px-2"><button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Payment panel */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Customer (optional)</p>
            <div className="flex gap-2">
              <Input placeholder="Phone #" value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} className="flex-1" />
              <Button variant="outline" size="sm" onClick={lookupCustomer}>Find</Button>
            </div>
            {customerName && <p className="text-sm text-success">✓ {customerName}</p>}
          </div>

          {/* Totals */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toLocaleString()} DZD</span></div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Discount</span>
              <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-24 h-7 text-right text-sm rounded border border-input" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Trade-in Credit</span>
              <input type="number" value={tradeInCredit} onChange={e => setTradeInCredit(parseFloat(e.target.value) || 0)} className="w-24 h-7 text-right text-sm rounded border border-input" />
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-lg"><span>Total</span><span>{total.toLocaleString()} DZD</span></div>
          </div>

          {/* Payment */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="CASH">Cash</option><option value="CREDIT">Credit (Full)</option><option value="SPLIT">Split (Cash + Credit)</option>
              </select>
            </div>
            {(paymentMethod === 'CASH' || paymentMethod === 'SPLIT') && (
              <Input label="Amount Paid (DZD)" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={total.toString()} />
            )}
            {change > 0 && paymentMethod === 'CASH' && (
              <div className="bg-success/10 text-success p-2 rounded-md text-center font-bold">Change: {change.toLocaleString()} DZD</div>
            )}
          </div>

          <Button onClick={completeSale} loading={saleMutation.isPending} className="w-full h-12 text-base">
            Complete Sale
          </Button>

          {lastSale && (
            <Button variant="outline" onClick={printReceipt} className="w-full"><Printer className="h-4 w-4" /> Print Receipt</Button>
          )}
        </div>
      </div>
    </div>
  )
}
