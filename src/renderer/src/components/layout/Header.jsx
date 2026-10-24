import { Bell, LogOut, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import Breadcrumbs from './Breadcrumbs'
import UpdaterIndicator from './UpdaterIndicator'

export default function Header() {
    const { user, logout } = useAuth()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowUserMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-card shrink-0">
            <Breadcrumbs />

            <div className="flex items-center gap-2">
                {/* Auto Updater Indicator */}
                <UpdaterIndicator />

                {/* Notification bell */}
                <button className="relative p-2 rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                    <Bell className="h-4 w-4" />
                </button>

                {/* User menu */}
                <div ref={menuRef} className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 h-9 ps-1 pe-2 rounded-full hover:bg-accent transition-colors cursor-pointer"
                    >
                        <div className="grid place-items-center h-7 w-7 rounded-full bg-primary-soft text-primary-soft-foreground text-xs font-bold">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-[13px] font-medium text-foreground">{user?.name || 'User'}</span>
                    </button>

                    {showUserMenu && (
                        <div className="absolute end-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-pop p-1 animate-slide-down z-50">
                            <div className="px-3 py-2 border-b border-border">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowUserMenu(false)
                                    logout()
                                }}
                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-[13px] text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
