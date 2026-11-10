import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useAuth } from './lib/auth'
import api from './lib/api'
import { FullPageSpinner } from './components/ui/Spinner'
import AppShell from './components/layout/AppShell'

// Licensing & Auto-Update Overlays
import ActivationScreen from './components/ActivationScreen'
import { MainPcUnreachable } from './components/JoinNetwork'
import { setPlan } from './lib/plan'
import NetworkPage from './pages/settings/Network'

// Auth pages
import Login from './pages/Login'
import FirstRunWizard from './pages/FirstRunWizard'

// Main pages
import Dashboard from './pages/Dashboard'
// Every other page is loaded the first time it is opened, so the app shows up fast on a small PC
const CustomerList = lazy(() => import('./pages/customers/CustomerList'))
const CustomerProfile = lazy(() => import('./pages/customers/CustomerProfile'))
const InventoryList = lazy(() => import('./pages/inventory/InventoryList'))
const AccessoriesPage = lazy(() => import('./pages/inventory/Accessories'))
const CheckInList = lazy(() => import('./pages/repairs/CheckInList'))
const TicketList = lazy(() => import('./pages/repairs/TicketList'))
const TicketDetail = lazy(() => import('./pages/repairs/TicketDetail'))
const WarrantyList = lazy(() => import('./pages/repairs/WarrantyList'))
const TradeInList = lazy(() => import('./pages/repairs/TradeInList'))
const POS = lazy(() => import('./pages/sales/POS'))
const InvoiceList = lazy(() => import('./pages/sales/InvoiceList'))
const DebtLedger = lazy(() => import('./pages/finance/DebtLedger'))
const SupplierList = lazy(() => import('./pages/finance/SupplierList'))
const SupplierDetail = lazy(() => import('./pages/finance/SupplierDetail'))
const ExpenseList = lazy(() => import('./pages/finance/ExpenseList'))
const DailyClose = lazy(() => import('./pages/finance/DailyClose'))
const MonthlySummary = lazy(() => import('./pages/finance/MonthlySummary'))
const UsersPage = lazy(() => import('./pages/settings/Users'))
const StoreSettings = lazy(() => import('./pages/settings/StoreSettings'))
const BackupPage = lazy(() => import('./pages/settings/Backup'))
const AboutApp = lazy(() => import('./pages/settings/AboutApp'))
const DeviceCatalogPage = lazy(() => import('./pages/settings/DeviceCatalog'))
const DevicesPage = lazy(() => import('./pages/catalog/Devices'))
const RepairmenPage = lazy(() => import('./pages/settings/Repairmen'))
const ActivityPage = lazy(() => import('./pages/settings/Activity'))
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

function P({ children }) { return <ProtectedRoute>{children}</ProtectedRoute> }

// Owner-only pages: staff are sent back to the dashboard
function O({ children }) {
  const { isOwner, loading } = useAuth()
  if (!loading && !isOwner) return <Navigate to="/dashboard" replace />
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [isActivated, setIsActivated] = useState(false)
  const [deactivationMessage, setDeactivationMessage] = useState(null)
  const [networkError, setNetworkError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Hardware Licensing Check (First Layer) — now includes online validation
    window.api.getLocalLicense()
      .then((result) => {
        if (result?.networkError) {
          // Connected PC that cannot reach the shop's main PC: nothing else can load
          setNetworkError({ code: result.networkError, hostName: result.hostName })
          return null
        }
        if (result && result.valid) {
          setPlan(result.plan)
          setIsActivated(true)
        } else if (result && result.deactivationMessage) {
          // License was revoked or machine mismatch — show message
          setDeactivationMessage(result.deactivationMessage)
        }
        
        // 2. First-Run DB Wizard Check (Second Layer)
        return api.get('/store/status')
      })
      .then((res) => { 
        if (res && res.data) {
          setNeedsSetup(res.data.needsSetup)
          if (res.data.needsSetup) navigate('/setup', { replace: true })
        }
      })
      .catch((err) => {
        console.error("Boot sequence check failed:", err)
        setNeedsSetup(true)
      })
      .finally(() => setChecking(false))
    // The app opened on the saved license; the online check may still find it revoked
    window.api.onLicenseStatus?.((_e, result) => {
      if (result?.valid) return
      setIsActivated(false)
      setDeactivationMessage(result?.deactivationMessage || null)
    })
  }, [])

  if (checking) return <FullPageSpinner />

  if (networkError) return <MainPcUnreachable {...networkError} />

  // Security Gate: Hardware License Required
  if (!isActivated) {
    return <ActivationScreen onActivated={() => { setIsActivated(true); setDeactivationMessage(null); }} deactivationMessage={deactivationMessage} />
  }

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<FirstRunWizard />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<P><Dashboard /></P>} />

        {/* Customers */}
        <Route path="/customers" element={<P><CustomerList /></P>} />
        <Route path="/customers/:id" element={<P><CustomerProfile /></P>} />

        {/* Inventory */}
        <Route path="/inventory" element={<P><InventoryList /></P>} />
        <Route path="/inventory/accessories" element={<P><AccessoriesPage /></P>} />
        <Route path="/devices" element={<P><DevicesPage /></P>} />

        {/* Repairs */}
        <Route path="/repairs/checkins" element={<P><CheckInList /></P>} />
        <Route path="/repairs/tickets" element={<P><TicketList /></P>} />
        <Route path="/repairs/tickets/:id" element={<P><TicketDetail /></P>} />
        <Route path="/repairs/warranty" element={<P><WarrantyList /></P>} />
        <Route path="/repairs/trade-ins" element={<P><TradeInList /></P>} />

        {/* Sales */}
        <Route path="/sales/pos" element={<P><POS /></P>} />
        <Route path="/sales/invoices" element={<P><InvoiceList /></P>} />

        {/* Finance */}
        <Route path="/finance/expenses" element={<P><ExpenseList /></P>} />
        <Route path="/finance/suppliers" element={<O><SupplierList /></O>} />
        <Route path="/finance/suppliers/:id" element={<O><SupplierDetail /></O>} />
        <Route path="/finance/debts" element={<P><DebtLedger /></P>} />
        <Route path="/finance/daily-close" element={<P><DailyClose /></P>} />
        <Route path="/finance/monthly-summary" element={<O><MonthlySummary /></O>} />

        {/* Settings */}
        <Route path="/settings/users" element={<O><UsersPage /></O>} />
        <Route path="/settings/store" element={<O><StoreSettings /></O>} />
        <Route path="/settings/backup" element={<O><BackupPage /></O>} />
        <Route path="/settings/catalog" element={<O><DeviceCatalogPage /></O>} />
        <Route path="/settings/repairmen" element={<O><RepairmenPage /></O>} />
        <Route path="/settings/activity" element={<O><ActivityPage /></O>} />
        <Route path="/settings/network" element={<O><NetworkPage /></O>} />
        <Route path="/settings/about" element={<P><AboutApp /></P>} />

        <Route path="*" element={<Navigate to={needsSetup ? '/setup' : '/dashboard'} replace />} />
      </Routes>
    </Suspense>
  )
}
