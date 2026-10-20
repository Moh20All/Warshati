import Sidebar from './Sidebar'
import Header from './Header'
import i18n from '../../i18n'
import { useCurrency } from '../../lib/currency'
import CatalogImagesPrompt from '../CatalogImagesPrompt'

export default function AppShell({ children }) {
    // Keep {{currency}} in translations in sync with the store's currency (before pages render)
    i18n.options.interpolation.defaultVariables.currency = useCurrency()

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
                <CatalogImagesPrompt />
            </div>
        </div>
    )
}
