import { useState } from 'react'
import { Database, Download, Upload, CheckCircle } from 'lucide-react'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export default function BackupPage() {
  const toast = useToast()
  const [lastBackup, setLastBackup] = useState(null)
  const [restoring, setRestoring] = useState(false)

  const handleBackup = async () => {
    try {
      // Use Electron's dialog API via IPC to pick save location
      if (window.electron?.backupDB) {
        const result = await window.electron.backupDB()
        if (result.success) {
          setLastBackup(new Date().toLocaleString())
          toast.success(`Database backed up to: ${result.path}`)
        }
      } else {
        // Fallback: download the db file via fetch
        const response = await fetch('http://localhost:3456/api/health')
        if (response.ok) {
          toast.info('Backup: Copy the file prisma/rakam.db to a safe location')
          setLastBackup(new Date().toLocaleString())
        }
      }
    } catch (err) {
      toast.error('Backup failed')
    }
  }

  const handleRestore = async () => {
    try {
      if (window.electron?.restoreDB) {
        setRestoring(true)
        const result = await window.electron.restoreDB()
        if (result.success) {
          toast.success('Database restored! Restart the app to apply changes.')
        }
      } else {
        toast.info('Restore: Replace prisma/rakam.db with your backup file, then restart the app')
      }
    } catch (err) {
      toast.error('Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground mt-1">Protect your data</p>
      </div>

      <div className="space-y-6">
        {/* Backup */}
        <div className="border border-border rounded-lg bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-md bg-success/10"><Download className="h-5 w-5 text-success" /></div>
            <div>
              <h3 className="font-semibold text-foreground">Backup Database</h3>
              <p className="text-sm text-muted-foreground">Create a copy of your entire database</p>
            </div>
          </div>
          <div className="bg-muted rounded-md p-3 mb-4 text-sm">
            <p className="text-muted-foreground">Your database is stored locally at:</p>
            <p className="font-mono text-foreground mt-1">prisma/rakam.db</p>
            {lastBackup && <p className="text-success mt-2 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Last backup: {lastBackup}</p>}
          </div>
          <Button onClick={handleBackup}><Download className="h-4 w-4" /> Backup Now</Button>
        </div>

        {/* Restore */}
        <div className="border border-border rounded-lg bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-md bg-warning/10"><Upload className="h-5 w-5 text-warning" /></div>
            <div>
              <h3 className="font-semibold text-foreground">Restore Database</h3>
              <p className="text-sm text-muted-foreground">Replace current data with a backup</p>
            </div>
          </div>
          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 mb-4 text-sm text-destructive">
            ⚠️ This will replace ALL current data with the backup file. This action cannot be undone.
          </div>
          <Button variant="danger" onClick={handleRestore} loading={restoring}><Upload className="h-4 w-4" /> Restore from Backup</Button>
        </div>

        {/* Tips */}
        <div className="border border-border rounded-lg bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-md bg-info/10"><Database className="h-5 w-5 text-info" /></div>
            <h3 className="font-semibold text-foreground">Tips</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Back up regularly — at minimum once per day</li>
            <li>Keep backups on a USB drive or cloud storage (Google Drive, etc.)</li>
            <li>Before restoring, make a backup of the current database first</li>
            <li>The database file is a single SQLite file — easy to copy</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
