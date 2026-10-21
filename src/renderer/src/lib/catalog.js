import { useQuery } from '@tanstack/react-query'
import api from './api'

export const DEVICE_CATEGORIES = ['PHONE', 'LAPTOP', 'CONSOLE']

/** All catalog devices of a category (cached for the session; refreshed after a hand-typed device is saved). */
export function useCatalog(category) {
  return useQuery({
    queryKey: ['catalog', category],
    queryFn: () => api.get('/catalog', { params: { category } }).then(r => r.data.devices),
    enabled: !!category,
    staleTime: 10 * 60 * 1000
  })
}

/** URL of a downloaded catalog image (served by the main process from the images folder). */
export const catalogImageSrc = (file) => (file ? `warshati-media://catalog/${file.split('/').map(encodeURIComponent).join('/')}` : null)

const gb = (v) => (v >= 1024 ? `${v / 1024} TB` : `${v} GB`)

/** One short line of key specs for the picker, e.g. "8 GB / 256 GB · 5000 mAh · 5G". */
export function specsSummary(device) {
  const s = device?.specs || {}
  if (device?.category === 'PHONE') {
    return [
      s.ram && s.storage ? `${s.ram} GB / ${gb(s.storage)}` : s.storage ? gb(s.storage) : null,
      s.battery ? `${s.battery} mAh` : null,
      s.screen ? `${s.screen}"` : null,
      s.has5G ? '5G' : null
    ].filter(Boolean).join(' · ')
  }
  if (device?.category === 'LAPTOP') {
    const c = s.configs?.[0] || {}
    return [s.type, c.cpu, c.ram, s.configs?.length > 1 ? `+${s.configs.length - 1}` : null].filter(Boolean).join(' · ')
  }
  if (device?.category === 'CONSOLE') return [s.type, s.generation && `${s.generation} gen`, s.releaseYear].filter(Boolean).join(' · ')
  return ''
}

/** Value-for-money ratings (phones.csv vfm_label), best first for sorting, with badge colours. */
export const VFM_RATINGS = {
  PERFORMANCE_BEAST: { color: 'info', rank: 1 },
  VALUE_KING: { color: 'success', rank: 2 },
  AVERAGE: { color: 'default', rank: 3 },
  OVERPRICED: { color: 'danger', rank: 4 }
}

/**
 * Every known spec of a device as [{ label, value }] (empty values left out).
 * Labels are translated; laptops add their configurations separately (specs.configs).
 */
export function specRows(device, t) {
  const s = device?.specs || {}
  const yes = (v) => (v ? t('catalog.spec.yes') : t('catalog.spec.no'))
  const rows = {
    PHONE: [
      ['ram', s.ram && `${s.ram} GB`],
      ['storage', s.storage && gb(s.storage)],
      ['screen', s.screen && `${s.screen}"`],
      ['battery', s.battery && `${s.battery} mAh`],
      ['rear_camera', s.rearCamera && `${s.rearCamera} MP`],
      ['front_camera', s.frontCamera && `${s.frontCamera} MP`],
      ['processor', s.processor],
      ['processor_brand', s.processorBrand],
      ['processor_speed', s.processorSpeed && `${s.processorSpeed} GHz`],
      ['os', s.os],
      ['has_5g', s.has5G !== undefined && yes(s.has5G)]
    ],
    LAPTOP: [['type', s.type]],
    CONSOLE: [
      ['type', s.type],
      ['generation', s.generation],
      ['release_year', s.releaseYear],
      ['cpu', s.cpu],
      ['gpu', s.gpu],
      ['ram', s.ram],
      ['storage', s.storage],
      ['max_resolution', s.maxResolution],
      ['launch_price', s.priceUsd && `$${s.priceUsd}`]
    ]
  }[device?.category] || []
  return rows.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false).map(([key, value]) => ({ label: t(`catalog.spec.${key}`), value: String(value) }))
}

/** Storage text to pre-fill forms ("256GB", "1TB") from a catalog phone. */
export const storageText = (device) => {
  const v = device?.specs?.storage
  return v ? (v >= 1024 ? `${v / 1024}TB` : `${v}GB`) : ''
}
