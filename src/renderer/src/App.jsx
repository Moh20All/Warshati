import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import api from './lib/api'
import { FullPageSpinner } from './components/ui/Spinner'
import AppShell from './components/layout/AppShell'

// Licensing & Auto-Update Overlays
import ActivationScreen from './components/ActivationScreen'

// Auth pages
import Login from './pages/Login'
import FirstRunWizard from './pages/FirstRunWizard'

// Main pages
import Dashboard from './pages/Dashboard'
import CustomerList from './pages/customers/CustomerList'
import CustomerProfile from './pages/customers/CustomerProfile'
import InventoryList from './pages/inventory/InventoryList'
import CheckInList from './pages/repairs/CheckInList'
import TicketList from './pages/repairs/TicketList'
import TicketDetail from './pages/repairs/TicketDetail'
import WarrantyList from './pages/repairs/WarrantyList'
import TradeInList from './pages/repairs/TradeInList'
import POS from './pages/sales/POS'
import InvoiceList from './pages/sales/InvoiceList'
import DebtLedger from './pages/finance/DebtLedger'
import SupplierList from './pages/finance/SupplierList'
import SupplierDetail from './pages/finance/SupplierDetail'
import ExpenseList from './pages/finance/ExpenseList'
import DailyClose from './pages/finance/DailyClose'
import MonthlySummary from './pages/finance/MonthlySummary'
import UsersPage from './pages/settings/Users'
import StoreSettings from './pages/settings/StoreSettings'
import BackupPage from './pages/settings/Backup'
import AboutApp from './pages/settings/AboutApp'
import DeviceCatalogPage from './pages/settings/DeviceCatalog'
import DevicesPage from './pages/catalog/Devices'
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
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Hardware Licensing Check (First Layer) — now includes online validation
    window.api.getLocalLicense()
      .then((result) => {
        if (result && result.valid) {
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
  }, [])

  if (checking) return <FullPageSpinner />

  // Security Gate: Hardware License Required
  if (!isActivated) {
    return <ActivationScreen onActivated={() => { setIsActivated(true); setDeactivationMessage(null); }} deactivationMessage={deactivationMessage} />
  }

  return (
    <>
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
        <Route path="/settings/about" element={<P><AboutApp /></P>} />

        <Route path="*" element={<Navigate to={needsSetup ? '/setup' : '/dashboard'} replace />} />
      </Routes>
    </>
  )
}
