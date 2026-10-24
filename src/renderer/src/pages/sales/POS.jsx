import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, Trash2, Printer, ShoppingCart } from 'lucide-react'
import api from '../../lib/api'
import { PRINT_LOGO } from '../../lib/printKit'
import { useCurrency } from '../../lib/currency'
import { usePrint } from '../../lib/usePrint'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

export default function POS() {
  const cur = useCurrency()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const print = usePrint()
  const barcodeRef = useRef(null)

  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(0)
  const [tradeInCredit, setTradeInCredit] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerId, setCustomerId] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [newCustomer, setNewCustomer] = useState(null) // { name, phone } when the phone was not found
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [showPrintPrompt, setShowPrintPrompt] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  // Fetch all active inventory for instant POS search
  const { data: inventory = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', 'pos'],
    queryFn: () => api.get('/inventory').then(r => r.data.items)
  })

  useEffect(() => { barcodeRef.current?.focus() }, [])

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const total = Math.max(0, subtotal - discount - tradeInCredit)
  const paid = amountPaid ? parseFloat(amountPaid) : total
  const change = Math.max(0, paid - total)
  // What will become a debt, and a cash payment that does not cover the total
  const owed = paymentMethod === 'CREDIT' ? total : paymentMethod === 'SPLIT' ? Math.max(0, total - paid) : 0
  const cashShort = paymentMethod === 'CASH' && amountPaid !== '' && paid < total ? total - paid : 0

  // Real-time filtering
  const filteredInventory = inventory.filter(item => {
    if (!searchTerm) return true
    const lower = searchTerm.toLowerCase()
    return item.name?.toLowerCase().includes(lower) || 
           item.barcode?.toLowerCase().includes(lower) || 
           item.sku?.toLowerCase().includes(lower) || 
           item.brand?.toLowerCase().includes(lower) || 
           item.model?.toLowerCase().includes(lower)
  })

  const lookupCustomer = async () => {
    if (!phoneSearch) return
    try {
      const res = await api.get(`/customers/lookup/${phoneSearch}`)
      if (res.data.customer) { setCustomerId(res.data.customer.id); setCustomerName(res.data.customer.name); setNewCustomer(null) }
      else setNewCustomer({ name: '', phone: phoneSearch }) // offer to create them here, keeping the cart
    } catch { toast.error(t('sales.pos.err_lookup')) }
  }

  const createCustomer = async () => {
    if (!newCustomer?.name.trim()) return
    setCreatingCustomer(true)
    try {
      const res = await api.post('/customers', { name: newCustomer.name.trim(), phone: newCustomer.phone || undefined })
      setCustomerId(res.data.customer.id); setCustomerName(res.data.customer.name); setNewCustomer(null)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success(t('sales.pos.customer_created'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('sales.pos.err_lookup'))
    } finally {
      setCreatingCustomer(false)
    }
  }

  const clearCustomer = () => { setCustomerId(null); setCustomerName(''); setPhoneSearch(''); setNewCustomer(null) }

  // Barcode / Enter key logic
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return
    const code = searchTerm.trim()
    if (!code) return

    // 1. Look for exact barcode match first
    const exactMatch = inventory.find(i => i.barcode === code || i.sku === code)
    if (exactMatch) {
      addToCart(exactMatch)
      setSearchTerm('')
    } 
    // 2. If no exact barcode, check if the text search yielded exactly 1 item
    else if (filteredInventory.length === 1) {
      addToCart(filteredInventory[0])
      setSearchTerm('')
    } 
    // 3. Otherwise error out
    else {
      toast.warning(t('sales.pos.err_item_not_found'))
    }
  }

  const addToCart = (item) => {
    const existing = cart.find(c => c.inventoryItemId === item.id)
    if (existing) {
      setCart(cart.map(c => c.inventoryItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([...cart, { inventoryItemId: item.id, name: item.name, unitCost: parseFloat(item.buyPrice) || 0, unitPrice: parseFloat(item.sellPrice), quantity: 1, maxQty: item.quantity, warrantyDays: item.warrantyDays || 0 }])
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
      toast.success(t('sales.pos.success_sale', { num: res.data.sale.saleNumber }))
      setCart([]); setDiscount(0); setTradeInCredit(0); setAmountPaid(''); setPaymentMethod('CASH')
      clearCustomer()
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      setShowPrintPrompt(true)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Sale failed')
  })

  const completeSale = () => {
    if (cart.length === 0) return toast.warning(t('sales.pos.err_empty_cart'))
    if (cashShort) return toast.warning(t('sales.pos.err_cash_short', { rest: `${cashShort.toLocaleString()} ${cur}` }))
    if (owed > 0 && !customerId) return toast.warning(t('sales.pos.err_credit_customer'))
    saleMutation.mutate({
      customerId, items: cart.map(c => ({ inventoryItemId: c.inventoryItemId, name: c.name, description: c.name, unitCost: c.unitCost, unitPrice: c.unitPrice, quantity: c.quantity, warrantyDays: c.warrantyDays })),
      discount, tradeInCredit, paymentMethod, amountPaid: paid
    })
  }

  const printReceipt = () => {
    if (!lastSale) return
    const s = lastSale
    const dir = i18n.dir()
    
    const storeName = store?.name || 'Warshati — ورشتي'
    const storeAddress = store?.address || ''
    const storePhone = store?.phone || ''

    const html = `<div dir="${dir}" style="box-sizing: border-box; width: 100%;">
      <div style="text-align:center; margin-bottom:10px;">
        ${PRINT_LOGO}
        <h2 style="margin:0; font-size:16px; text-transform: uppercase;">${storeName}</h2>
        ${storeAddress ? `<p style="margin:2px 0; font-size:10px;">${storeAddress}</p>` : ''}
        ${storePhone ? `<p style="margin:2px 0; font-size:10px;">${storePhone}</p>` : ''}
        <div style="border-top:2px solid #000; margin:10px 0;"></div>
        <p style="margin:0; font-size:13px; font-weight:bold;">${t('sales.receipt.title')} / فاتورة</p>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 10px;">
        <div style="display:flex; justify-content:space-between;"><span>${t('sales.receipt.inv')}:</span><strong class="p-mono">${s.saleNumber}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>${t('sales.receipt.date')}:</span><span>${new Date(s.createdAt).toLocaleString()}</span></div>
        ${s.customer ? `<div style="display:flex; justify-content:space-between;"><span>${t('sales.receipt.customer')}:</span><span>${s.customer.name}</span></div>` : ''}
      </div>
      
      <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px;">
        <thead>
          <tr style="border-bottom:1px dashed #000;">
            <th style="text-align:${dir === 'rtl' ? 'right' : 'left'}; width:45%; padding-bottom:5px;">ITEM</th>
            <th style="text-align:center; width:15%; padding-bottom:5px;">QTY</th>
            <th style="text-align:right; width:20%; padding-bottom:5px;">PRICE</th>
            <th style="text-align:right; width:20%; padding-bottom:5px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${s.items.map(i => `
            <tr>
              <td style="padding:4px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${i.description}</td>
              <td style="text-align:center; padding:4px 0;">${i.quantity}</td>
              <td style="text-align:right; padding:4px 0;">${Number(i.unitPrice).toLocaleString()}</td>
              <td style="text-align:right; padding:4px 0;">${Number(i.subtotal).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      
      <div style="font-size: 11px;">
        <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>${t('sales.receipt.subtotal')}:</span><span>${Number(s.subtotal).toLocaleString()} ${cur}</span></div>
        ${parseFloat(s.discount) > 0 ? `<div style="display:flex; justify-content:space-between; margin:2px 0;"><span>${t('sales.receipt.discount')}:</span><span>-${Number(s.discount).toLocaleString()} ${cur}</span></div>` : ''}
        <div style="display:flex; justify-content:space-between; margin:4px 0; font-weight:bold; font-size:14px;"><strong>${t('sales.receipt.total')}:</strong><strong>${Number(s.total).toLocaleString()} ${cur}</strong></div>
        <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>${t('sales.receipt.paid')}:</span><span>${Number(s.amountPaid).toLocaleString()} ${cur}</span></div>
        <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>${t('sales.receipt.method')}:</span><span>${s.paymentMethod}</span></div>
        ${parseFloat(s.change) > 0 ? `<div style="display:flex; justify-content:space-between; margin:2px 0; font-weight:bold;"><span>${t('sales.receipt.change')}:</span><span>${Number(s.change).toLocaleString()} ${cur}</span></div>` : ''}
      </div>

      ${s.items.some(i => i.warrantyDays > 0) ? `
        <div style="border-top:2px solid #000; margin:10px 0;"></div>
        <div style="font-size: 11px;">
          <p style="margin:0 0 5px 0; font-weight:bold; text-decoration:underline;">✓ Warranty / الضمان:</p>
          ${s.items.filter(i => i.warrantyDays > 0).map(i => {
            const until = new Date(s.createdAt);
            until.setDate(until.getDate() + i.warrantyDays);
            return `<p style="margin:2px 0;">• ${i.description}: ${i.warrantyDays} days (Until ${until.toLocaleDateString()})</p>`;
          }).join('')}
        </div>
      ` : ''}
      
      <div style="border-top:1px dashed #000; margin:10px 0;"></div>
      <p style="text-align:center; font-size:11px; margin-top:10px;">${t('sales.receipt.footer')}</p>
    </div>`

    // All printing via Electron IPC — no window.open()
    print.print(html)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('sales.pos.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('sales.pos.subtitle')}</p></div>
      </div>

      <div className="grid grid-cols-12 gap-6 relative">
        {/* Left: Inventory List */}
        <div className="col-span-4 flex flex-col h-[calc(100vh-140px)] sticky top-6">
          <div className="mb-3">
            <Input 
              ref={barcodeRef}
              placeholder={t('sales.pos.search_ph')}
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              onKeyDown={handleKeyDown}
              icon={Search} 
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 border border-border rounded-lg p-2 bg-muted/20">
            {isLoadingInventory ? (
              <p className="text-center text-muted-foreground py-10">Loading inventory...</p>
            ) : filteredInventory.map(item => (
              <div key={item.id} onClick={() => addToCart(item)} className="p-3 border border-border rounded-md bg-background hover:border-primary hover:shadow-sm cursor-pointer transition-all flex justify-between items-center group">
                 <div className="flex-1 truncate pr-2">
                   <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{item.name}</p>
                   {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand} {item.model}</p>}
                 </div>
                 <div className="text-right shrink-0">
                   <p className="font-bold text-sm text-foreground">{Number(item.sellPrice).toLocaleString()} {cur}</p>
                   <p className={`text-[10px] ${item.quantity <= item.lowStockAt ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{item.quantity} in stock</p>
                 </div>
              </div>
            ))}
            {!isLoadingInventory && filteredInventory.length === 0 && (
              <p className="text-center text-muted-foreground py-10">{t('sales.pos.err_item_not_found', 'No items found')}</p>
            )}
          </div>
        </div>

        {/* Middle: Cart */}
        <div className="col-span-5 space-y-4">
          {/* Cart table */}
          {cart.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t('sales.pos.empty_cart')}</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead><tr className="bg-muted/50 border-b border-border">
                  <th className="text-start px-4 py-2 font-medium text-muted-foreground w-[40%]">{t('sales.pos.col_item')}</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground w-[20%]">{t('sales.pos.col_qty')}</th>
                  <th className="text-end px-4 py-2 font-medium text-muted-foreground w-[25%]">{t('sales.pos.col_price')}</th>
                  <th className="text-end px-4 py-2 font-medium text-muted-foreground w-[10%]"></th>
                </tr></thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium truncate" title={item.name}>{item.name}</td>
                      <td className="px-4 py-2"><input type="number" value={item.quantity} onChange={e => updateQty(i, parseInt(e.target.value) || 1)} className="w-14 h-7 text-center text-sm rounded border border-input mx-auto block" min={1} max={item.maxQty} /></td>
                      <td className="px-4 py-2"><input type="number" value={item.unitPrice} onChange={e => updatePrice(i, e.target.value)} className={`w-20 h-7 text-sm rounded border border-input block ${i18n.dir() === 'rtl' ? 'mr-auto text-left' : 'ml-auto text-right'}`} /></td>
                      <td className="px-2 text-center"><button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 className="h-4 w-4 mx-auto" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-muted/30 p-3 pt-4 border-t border-border flex justify-end">
                 <p className="font-medium text-sm text-muted-foreground mr-4">Total:</p>
                 <p className="font-bold text-sm text-foreground tracking-tight">{subtotal.toLocaleString()} {cur}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Payment panel */}
        <div className="col-span-3 space-y-4">
          {/* Customer */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">{t('sales.pos.customer_opt')}</p>
            {customerId ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-success">✓ {customerName}</p>
                <button type="button" onClick={clearCustomer} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">{t('sales.pos.btn_change_customer')}</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input placeholder={t('sales.pos.ph_phone')} value={phoneSearch} onChange={e => { setPhoneSearch(e.target.value); setNewCustomer(null) }} onKeyDown={e => e.key === 'Enter' && lookupCustomer()} className="flex-1" />
                  <Button variant="outline" size="sm" onClick={lookupCustomer}>{t('sales.pos.btn_find')}</Button>
                </div>
                {newCustomer && (
                  <div className="rounded-md bg-muted p-2 space-y-2">
                    <p className="text-xs text-muted-foreground">{t('sales.pos.new_customer_hint', { phone: newCustomer.phone })}</p>
                    <Input placeholder={t('sales.pos.ph_new_name')} value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && createCustomer()} autoFocus />
                    <Button size="sm" className="w-full" onClick={createCustomer} loading={creatingCustomer} disabled={!newCustomer.name.trim()}>{t('sales.pos.btn_create_customer')}</Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Totals */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('sales.pos.lbl_subtotal')}</span><span>{subtotal.toLocaleString()} {cur}</span></div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t('sales.pos.lbl_discount')}</span>
              <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className={`w-24 h-7 text-sm rounded border border-input px-2 ${i18n.dir() === 'rtl' ? 'text-left' : 'text-right'}`} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{t('sales.pos.lbl_tradein')}</span>
              <input type="number" value={tradeInCredit} onChange={e => setTradeInCredit(parseFloat(e.target.value) || 0)} className={`w-24 h-7 text-sm rounded border border-input px-2 ${i18n.dir() === 'rtl' ? 'text-left' : 'text-right'}`} />
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-lg"><span>{t('sales.pos.lbl_total')}</span><span>{total.toLocaleString()} {cur}</span></div>
          </div>

          {/* Payment */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('sales.pos.lbl_payment_method')}</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="CASH">{t('sales.pos.method_cash')}</option><option value="CREDIT">{t('sales.pos.method_credit')}</option><option value="SPLIT">{t('sales.pos.method_split')}</option>
              </select>
            </div>
            {(paymentMethod === 'CASH' || paymentMethod === 'SPLIT') && (
              <Input label={t('sales.pos.lbl_amount_paid')} type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={total.toString()} />
            )}
            {change > 0 && paymentMethod === 'CASH' && (
              <div className="bg-success-soft text-success-soft-foreground p-2 rounded-sm text-center font-bold">{t('sales.pos.change')}: {change.toLocaleString()} {cur}</div>
            )}
            {cashShort > 0 && (
              <div className="bg-warning-soft text-warning-soft-foreground p-2 rounded-sm text-sm space-y-2">
                <p className="font-medium">{t('sales.pos.cash_short', { rest: `${cashShort.toLocaleString()} ${cur}` })}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setPaymentMethod('SPLIT')}>{t('sales.pos.btn_rest_as_debt')}</Button>
              </div>
            )}
            {owed > 0 && cart.length > 0 && (
              <div className={`p-2 rounded-sm text-sm font-medium ${customerId ? 'bg-info-soft text-info-soft-foreground' : 'bg-destructive-soft text-destructive-soft-foreground'}`}>
                {customerId
                  ? t('sales.pos.will_owe', { amount: `${owed.toLocaleString()} ${cur}`, name: customerName })
                  : t('sales.pos.need_customer', { amount: `${owed.toLocaleString()} ${cur}` })}
              </div>
            )}
          </div>

          <Button variant="flux" onClick={completeSale} loading={saleMutation.isPending} className="w-full h-12 text-base">
            {t('sales.pos.btn_complete')}
          </Button>

          {lastSale && (
            <Button variant="outline" onClick={printReceipt} className="w-full"><Printer className="h-4 w-4" /> {t('sales.pos.btn_print')}</Button>
          )}
        </div>
      </div>

      {/* Print Prompt Modal */}
      <Modal open={showPrintPrompt} onClose={() => setShowPrintPrompt(false)} title={t('sales.pos.prompt_title', 'Sale Completed')} size="sm">
        <div className="py-4 text-center space-y-4">
          <div className="p-3 bg-success-soft text-success rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
            <Printer className="w-8 h-8" />
          </div>
          <p className="text-sm text-foreground">{t('sales.pos.prompt_msg', 'Would you like to print the receipt?')}</p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => { printReceipt(); setShowPrintPrompt(false) }} className="w-full h-11 text-base">
              <Printer className="w-4 h-4" /> {t('sales.pos.prompt_print', 'Print Receipt (Enter)')}
            </Button>
            <Button variant="outline" onClick={() => setShowPrintPrompt(false)} className="w-full">
              {t('sales.pos.prompt_skip', 'Skip (Esc)')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
