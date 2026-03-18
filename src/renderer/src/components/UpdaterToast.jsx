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
    <div className="fixed bottom-6 right-6 z-[9999] bg-[#1a2744] border border-[#23345a] text-white p-4 rounded-lg shadow-2xl flex items-start gap-4 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="bg-[#c9a84c]/20 p-2 rounded-full">
        <DownloadCloud className="w-6 h-6 text-[#c9a84c]" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-white">Update Ready</h4>
        <p className="text-sm text-gray-300 mt-1 mb-3 leading-snug">
          A new version has been downloaded automatically. It will install on next restart.
        </p>
        <button 
          onClick={() => window.api.restartToUpdate()}
          className="text-xs font-semibold bg-[#c9a84c] text-[#1a2744] px-3 py-1.5 rounded hover:bg-[#d6bc70] transition-colors"
        >
          Restart Now
        </button>
      </div>
    </div>
  )
}
