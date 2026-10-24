import { useState, useEffect } from 'react'
import { DownloadCloud } from 'lucide-react'

export default function UpdaterToast() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (window.api && window.api.onUpdateDownloaded) {
      window.api.onUpdateDownloaded(() => {
        setUpdateReady(true)
      })
    }
  }, [])

  if (!updateReady) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] bg-inverse border border-inverse-raised text-inverse-foreground p-4 rounded-md shadow-pop flex items-start gap-4 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="bg-inverse-raised p-2 rounded-full">
        <DownloadCloud className="w-6 h-6 text-flux" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-inverse-foreground">Update Ready</h4>
        <p className="text-sm text-inverse-foreground/75 mt-1 mb-3 leading-snug">
          A new version has been downloaded automatically. It will install on next restart.
        </p>
        <button 
          onClick={() => window.api.restartToUpdate()}
          className="text-xs font-semibold bg-flux text-flux-foreground px-3 py-1.5 rounded-sm hover:bg-flux-hover transition-colors"
        >
          Restart Now
        </button>
      </div>
    </div>
  )
}
