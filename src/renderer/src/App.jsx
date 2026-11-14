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

// Pages an account may open: an owner all of them, anyone else those ticked for it (any one of `perm`)
function A({ perm, children }) {
  const { can, loading } = useAuth()
  if (!loading && !can(...perm)) return <Navigate to="/dashboard" replace />
  return <ProtectedRoute>{children}</ProtectedRoute>
}

// Owner-only pages: everyone else is sent back to the dashboard
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
        <Route path="/customers" element={<A perm={['customers']}><CustomerList /></A>} />
        <Route path="/customers/:id" element={<A perm={['customers']}><CustomerProfile /></A>} />

        {/* Inventory */}
        <Route path="/inventory" element={<A perm={['inventory', 'inventory_edit']}><InventoryList /></A>} />
        <Route path="/inventory/accessories" element={<A perm={['inventory', 'inventory_edit']}><AccessoriesPage /></A>} />
        <Route path="/devices" element={<P><DevicesPage /></P>} />

        {/* Repairs */}
        <Route path="/repairs/checkins" element={<A perm={['repairs']}><CheckInList /></A>} />
        <Route path="/repairs/tickets" element={<A perm={['repairs', 'my_repairs']}><TicketList /></A>} />
        <Route path="/repairs/tickets/:id" element={<A perm={['repairs', 'my_repairs']}><TicketDetail /></A>} />
        <Route path="/repairs/warranty" element={<A perm={['repairs']}><WarrantyList /></A>} />
        <Route path="/repairs/trade-ins" element={<A perm={['tradeins']}><TradeInList /></A>} />

        {/* Sales */}
        <Route path="/sales/pos" element={<A perm={['sales']}><POS /></A>} />
        <Route path="/sales/invoices" element={<A perm={['sales']}><InvoiceList /></A>} />

        {/* Finance */}
        <Route path="/finance/expenses" element={<A perm={['expenses']}><ExpenseList /></A>} />
        <Route path="/finance/suppliers" element={<A perm={['suppliers']}><SupplierList /></A>} />
        <Route path="/finance/suppliers/:id" element={<A perm={['suppliers']}><SupplierDetail /></A>} />
        <Route path="/finance/debts" element={<A perm={['debts']}><DebtLedger /></A>} />
        <Route path="/finance/daily-close" element={<A perm={['daily_close']}><DailyClose /></A>} />
        <Route path="/finance/monthly-summary" element={<A perm={['reports']}><MonthlySummary /></A>} />

        {/* Settings */}
        <Route path="/settings/users" element={<O><UsersPage /></O>} />
        <Route path="/settings/store" element={<O><StoreSettings /></O>} />
        <Route path="/settings/backup" element={<O><BackupPage /></O>} />
        <Route path="/settings/catalog" element={<O><DeviceCatalogPage /></O>} />
        <Route path="/settings/repairmen" element={<A perm={['repairmen']}><RepairmenPage /></A>} />
        <Route path="/settings/activity" element={<A perm={['activity']}><ActivityPage /></A>} />
        <Route path="/settings/network" element={<O><NetworkPage /></O>} />
        <Route path="/settings/about" element={<P><AboutApp /></P>} />

        <Route path="*" element={<Navigate to={needsSetup ? '/setup' : '/dashboard'} replace />} />
      </Routes>
    </Suspense>
  )
}
