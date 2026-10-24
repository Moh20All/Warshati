import { useState, useEffect } from 'react'
import { Database, Download, Upload, CheckCircle, Clock, FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../lib/auth'

export default function BackupPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const toast = useToast()
  const [lastBackup, setLastBackup] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    window.api.getBackupInfo(token).then(r => r.success && setInfo(r)).catch(() => {})
  }, [token, lastBackup])

  const handleBackup = async () => {
    try {
      // Main process shows the save dialog and writes a consistent snapshot
      const result = await window.api.backupDB(token)
      if (result.success) {
        setLastBackup(new Date().toLocaleString())
        toast.success(t('backup.success_backup', { path: result.path }))
      } else if (!result.canceled) {
        toast.error(result.error || t('backup.err_backup'))
      }
    } catch (err) {
      toast.error(t('backup.err_backup'))
    }
  }

  const handleRestore = async () => {
    try {
      setRestoring(true)
      // Main process picks the file, validates it, confirms, then relaunches the app
      const result = await window.api.restoreDB(token)
      if (!result.success && !result.canceled) {
        toast.error(result.error || t('backup.err_restore'))
      }
    } catch (err) {
      toast.error(t('backup.err_restore'))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('backup.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('backup.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* Backup */}
        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-sm bg-success-soft"><Download className="h-5 w-5 text-success" /></div>
            <div>
              <h3 className="font-semibold text-foreground">{t('backup.backup_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('backup.backup_desc')}</p>
            </div>
          </div>
          <div className="bg-muted rounded-md p-3 mb-4 text-sm">
            <p className="text-muted-foreground">{t('backup.backup_loc')}</p>
            <p className="font-mono text-foreground mt-1 break-all">{info?.dbPath || '—'}</p>
            {lastBackup && <p className="text-success mt-2 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> {t('backup.last_backup', { date: lastBackup })}</p>}
          </div>
          <Button onClick={handleBackup}><Download className="h-4 w-4" /> {t('backup.btn_backup')}</Button>
        </div>

        {/* Automatic backups */}
        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-sm bg-info-soft"><Clock className="h-5 w-5 text-info" /></div>
            <div>
              <h3 className="font-semibold text-foreground">{t('backup.auto_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('backup.auto_desc')}</p>
            </div>
          </div>
          <div className="bg-muted rounded-md p-3 mb-4 text-sm space-y-1">
            <p className="font-mono text-foreground break-all">{info?.dir || '—'}</p>
            <p className={info?.latest ? 'text-success flex items-center gap-1' : 'text-muted-foreground'}>
              {info?.latest && <CheckCircle className="h-3.5 w-3.5" />}
              {info?.latest
                ? t('backup.auto_latest', { date: new Date(info.latest.at).toLocaleString(), count: info.count })
                : t('backup.auto_none')}
            </p>
          </div>
          <Button variant="outline" onClick={() => window.api.openBackupFolder(token)}><FolderOpen className="h-4 w-4" /> {t('backup.auto_open')}</Button>
        </div>

        {/* Restore */}
        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-sm bg-warning-soft"><Upload className="h-5 w-5 text-warning" /></div>
            <div>
              <h3 className="font-semibold text-foreground">{t('backup.restore_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('backup.restore_desc')}</p>
            </div>
          </div>
          <div className="bg-warning-soft rounded-sm p-3 mb-4 text-sm text-warning-soft-foreground">
            {t('backup.restore_warning')}
          </div>
          <Button variant="danger" onClick={handleRestore} loading={restoring}><Upload className="h-4 w-4" /> {t('backup.btn_restore')}</Button>
        </div>

        {/* Tips */}
        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-sm bg-info-soft"><Database className="h-5 w-5 text-info" /></div>
            <h3 className="font-semibold text-foreground">{t('backup.tips_title')}</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>{t('backup.tip_1')}</li>
            <li>{t('backup.tip_2')}</li>
            <li>{t('backup.tip_3')}</li>
            <li>{t('backup.tip_4')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
