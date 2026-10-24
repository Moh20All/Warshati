import { useLocation, Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const pathNames = {
    'repairs': 'Repairs',
    'checkin': 'Check-In',
    'tickets': 'Tickets',
    'warranty': 'Warranty',
    'trade-ins': 'Trade-Ins',
    'sales': 'Sales',
    'pos': 'POS',
    'invoices': 'Invoices',
    'finance': 'Finance',
    'expenses': 'Expenses',
    'suppliers': 'Suppliers',
    'debts': 'Debt Ledger',
    'daily-close': 'Daily Close',
    'settings': 'Settings',
    'store': 'Store',
    'users': 'Users',
    'backup': 'Backup',
    'dashboard': 'Dashboard'
}

export default function Breadcrumbs() {
    const location = useLocation()
    const segments = location.pathname.split('/').filter(Boolean)

    if (segments.length === 0) return null

    return (
        <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
            >
                <Home className="h-3.5 w-3.5" />
            </Link>
            {segments.map((segment, index) => {
                const path = '/' + segments.slice(0, index + 1).join('/')
                const isLast = index === segments.length - 1
                const name = pathNames[segment] || segment

                return (
                    <span key={path} className="flex items-center gap-1">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rtl:-scale-x-100" />
                        {isLast ? (
                            <span className="text-foreground font-semibold">{name}</span>
                        ) : (
                            <Link
                                to={path}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {name}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
