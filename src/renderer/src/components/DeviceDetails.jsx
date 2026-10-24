import { useTranslation } from 'react-i18next'
import { Smartphone, Laptop, Gamepad2 } from 'lucide-react'
import Modal from './ui/Modal'
import Badge from './ui/Badge'
import StatusBadge from './ui/StatusBadge'
import { catalogImageSrc, specRows, VFM_RATINGS } from '../lib/catalog'

const ICONS = { PHONE: Smartphone, LAPTOP: Laptop, CONSOLE: Gamepad2 }

/** Value-for-money badge + score bar for a phone (phones.csv vfm_label / vfm_percentage). */
export function ValueRating({ specs, compact = false }) {
  const { t } = useTranslation()
  const rating = specs?.vfmLabel && VFM_RATINGS[specs.vfmLabel]
  if (!rating && specs?.vfmPercentage == null) return null
  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-1.5'}>
      {rating && <StatusBadge kind="vfm" value={specs.vfmLabel} />}
      {specs.vfmPercentage != null && (
        <div className={`flex items-center gap-2 ${compact ? '' : 'w-full'}`}>
          <div className={`h-1.5 rounded bg-muted overflow-hidden ${compact ? 'w-16' : 'flex-1'}`}>
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, specs.vfmPercentage)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{compact ? `${Math.round(specs.vfmPercentage)}%` : t('catalog.vfm_score', { score: specs.vfmPercentage })}</span>
        </div>
      )}
    </div>
  )
}

/** Full information sheet of one catalog device. */
export default function DeviceDetails({ device, onClose }) {
  const { t } = useTranslation()
  if (!device) return null
  const Icon = ICONS[device.category] || Smartphone
  const image = catalogImageSrc(device.imageFile)
  const rows = specRows(device, t)
  const configs = device.category === 'LAPTOP' ? device.specs?.configs || [] : []

  return (
    <Modal open={!!device} onClose={onClose} title={`${device.brand} ${device.model}`} size="xl">
      <div className="space-y-5 max-h-[70vh] overflow-auto">
        <div className="flex gap-4 items-start">
          <div className="h-32 w-32 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <Icon className="h-10 w-10 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{t(`catalog.categories.${device.category}`)}</Badge>
              {device.isCustom && <Badge color="warning">{t('catalog.added_by_hand')}</Badge>}
            </div>
            <p className="text-lg font-semibold text-foreground">{device.brand} {device.model}</p>
            {device.category === 'PHONE' && (
              <div className="pt-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('catalog.vfm_title')}</p>
                <ValueRating specs={device.specs} />
              </div>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border border-border rounded-lg divide-y sm:divide-y-0">
            {rows.map(r => (
              <div key={r.label} className="flex justify-between gap-3 px-3 py-2 text-sm border-border sm:border-b">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium text-foreground text-end">{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {configs.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">{t('catalog.configs_title', { count: configs.length })}</p>
            <div className="overflow-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    {['cpu', 'ram', 'storage', 'gpu', 'screen', 'resolution', 'os', 'weight'].map(k => <th key={k} className="px-2 py-1.5 text-start font-medium">{t(`catalog.spec.${k}`)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">{c.cpu}</td>
                      <td className="px-2 py-1.5">{c.ram}</td>
                      <td className="px-2 py-1.5">{c.storage}</td>
                      <td className="px-2 py-1.5">{c.gpu}</td>
                      <td className="px-2 py-1.5">{c.screen ? `${c.screen}"` : ''}</td>
                      <td className="px-2 py-1.5">{c.resolution}</td>
                      <td className="px-2 py-1.5">{c.os}</td>
                      <td className="px-2 py-1.5">{c.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {rows.length === 0 && configs.length === 0 && <p className="text-sm text-muted-foreground">{t('catalog.no_specs')}</p>}
      </div>
    </Modal>
  )
}
