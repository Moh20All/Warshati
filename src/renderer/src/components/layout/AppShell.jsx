import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import Sidebar from './Sidebar'
import Header from './Header'
import i18n from '../../i18n'
import { useCurrency } from '../../lib/currency'
import { useHotkeys, focusPageSearch } from '../../lib/hotkeys'
import CatalogImagesPrompt from '../CatalogImagesPrompt'
import AccessoryPhotosPrompt from '../AccessoryPhotos'
import ShortcutsHelp from '../ShortcutsHelp'

export default function AppShell({ children }) {
    // Keep {{currency}} in translations in sync with the store's currency (before pages render)
    i18n.options.interpolation.defaultVariables.currency = useCurrency()
    const navigate = useNavigate()
    const [help, setHelp] = useState(false)
    const { data: store } = useQuery({ queryKey: ['store'], queryFn: () => api.get('/store').then(r => r.data.store) })

    // App-wide shortcuts (see lib/hotkeys.js SHORTCUTS for the list shown with F1)
    useHotkeys({
        F2: () => navigate('/sales/pos'),
        F3: () => navigate('/repairs/tickets/new'),
        F4: () => { if (store?.featCheckIn !== false) navigate('/repairs/checkins?new=1') }, // off: Check-in is hidden
        F6: () => navigate('/repairs/tickets'),
        F7: () => navigate('/inventory'),
        F8: () => navigate('/finance/debts'),
        F9: () => navigate('/finance/daily-close'),
        'Ctrl+K': focusPageSearch
    })
    // F1 also works over a dialog, so it can close the help window it opened
    useHotkeys({ F1: () => setHelp((h) => !h) }, { whenModal: true })

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar onShowShortcuts={() => setHelp(true)} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
                <CatalogImagesPrompt />
                <AccessoryPhotosPrompt />
            </div>
            <ShortcutsHelp open={help} onClose={() => setHelp(false)} />
        </div>
    )
}
