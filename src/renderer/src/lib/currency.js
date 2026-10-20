import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from './api'

// How a currency code is shown to the user (Arabic shows the dinar as د.ج)
export function currencyLabel(code, lang) {
  const c = code || 'DZD'
  if (c === 'DZD' && lang?.startsWith('ar')) return 'د.ج'
  return c
}

// The store's currency label for the current language, e.g. "DZD", "د.ج", "EUR"
export function useCurrency() {
  const { i18n } = useTranslation()
  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })
  return currencyLabel(store?.currency, i18n.language)
}
