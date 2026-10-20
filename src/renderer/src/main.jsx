import React, { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ui/Toast'
import CrashBoundary from './components/CrashBoundary'
import i18n from './i18n'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false
        }
    }
})

function RootLayout() {
  useEffect(() => {
    const updateDirection = () => {
      document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    };
    updateDirection();
    i18n.on('languageChanged', updateDirection);
    return () => {
      i18n.off('languageChanged', updateDirection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <HashRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </HashRouter>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CrashBoundary>
      <RootLayout />
    </CrashBoundary>
  </StrictMode>
)
