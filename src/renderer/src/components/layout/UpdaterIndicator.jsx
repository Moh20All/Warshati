import { useState, useEffect, useRef } from 'react'
import { HardDriveDownload, AlertCircle, RefreshCw, X } from 'lucide-react'

export default function UpdaterIndicator() {
    const [status, setStatus] = useState('idle') // 'idle', 'available', 'downloading', 'downloaded', 'error'
    const [progress, setProgress] = useState({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 })
    const [version, setVersion] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    useEffect(() => {
        // Only run if the API exists (Desktop App)
        if (!window.api) return

        const handleUpdateAvailable = (event, info) => {
            setVersion(info?.version || 'Update')
            setStatus('available')
            // Don't auto-open list unless we are actively downloading, but show the icon
        }

        const handleDownloadProgress = (event, progressObj) => {
            setStatus('downloading')
            setProgress(progressObj)
        }

        const handleUpdateDownloaded = (event, info) => {
            setStatus('downloaded')
            if (info?.version) setVersion(info.version)
            setIsOpen(true) // Auto-open to show ready to restart
        }

        const handleUpdateError = (event, message) => {
            setStatus('error')
            setErrorMsg(message || 'Failed to download update.')
        }

        window.api.onUpdateAvailable(handleUpdateAvailable)
        window.api.onDownloadProgress(handleDownloadProgress)
        window.api.onUpdateDownloaded(handleUpdateDownloaded)
        window.api.onUpdateError(handleUpdateError)
    }, [])

    const handleRestart = () => {
        if (window.api) {
            window.api.restartToUpdate()
        }
    }

    if (status === 'idle') return null

    // Format bytes
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    status === 'downloaded'
                        ? 'bg-flux-soft text-flux-soft-foreground hover:bg-flux'
                        : 'bg-flux-soft text-flux-soft-foreground hover:bg-flux'
                }`}
            >
                {status === 'downloading' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                    <HardDriveDownload className={`h-4 w-4 ${status === 'downloaded' ? 'animate-bounce' : ''}`} />
                )}
                <span className="text-sm font-medium">
                    {status === 'downloading' ? `${Math.round(progress.percent)}%` : 'Update'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-md shadow-pop p-4 animate-slide-down z-[100]">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-foreground">
                            {status === 'available' && 'Update Available'}
                            {status === 'downloading' && 'Downloading Update...'}
                            {status === 'downloaded' && 'Ready to Install'}
                            {status === 'error' && 'Update Failed'}
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                        Version {version}
                    </p>

                    {status === 'downloading' && (
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${progress.percent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
                                <span>{formatBytes(progress.bytesPerSecond)}/s</span>
                            </div>
                        </div>
                    )}

                    {status === 'downloaded' && (
                        <div className="space-y-3">
                            <p className="text-sm text-foreground">
                                The new version has been downloaded. Restart the application to apply the update now.
                            </p>
                            <button
                                onClick={handleRestart}
                                className="w-full bg-primary text-primary-foreground font-medium py-2 rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Restart & Install
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-3 bg-destructive-soft rounded-sm text-destructive-soft-foreground text-sm">
                            {errorMsg}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
