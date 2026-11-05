import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { queryClient } from '@/lib/queryClient'
import { useThemeStore } from '@/store/themeStore'
import { AuthProvider } from '@/features/auth/components/AuthProvider'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { AdminGuard, SuperAdminGuard, TeamGuard } from '@/features/teams/components/TeamGuard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { NewPasswordPage } from '@/pages/NewPasswordPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { HomePage } from '@/pages/HomePage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { CampaignDetailPage } from '@/pages/CampaignDetailPage'
import { ChildPage } from '@/pages/ChildPage'
import { AdminPage } from '@/pages/AdminPage'
import { SuperAdminPage } from '@/pages/SuperAdminPage'
import { ProfilePage } from '@/pages/ProfilePage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/registrera', element: <SignupPage /> },
  { path: '/glomt-losenord', element: <ForgotPasswordPage /> },
  { path: '/nytt-losenord', element: <NewPasswordPage /> },
  {
    path: '/lag',
    element: (
      <AuthGuard>
        <TeamsPage />
      </AuthGuard>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <TeamGuard>
          <AppShell />
        </TeamGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/hem" replace /> },
      { path: 'hem', element: <HomePage /> },
      { path: 'transaktioner', element: <TransactionsPage /> },
      { path: 'handelser', element: <CampaignsPage /> },
      { path: 'handelser/:id', element: <CampaignDetailPage /> },
      { path: 'barn/:id', element: <ChildPage /> },
      { path: 'admin', element: <AdminGuard><AdminPage /></AdminGuard> },
      { path: 'huvudadmin', element: <SuperAdminGuard><SuperAdminPage /></SuperAdminGuard> },
      { path: 'profil', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/hem" replace /> },
])

// Notiserna ligger utanför sidornas css-klasser, så ljust tema väljs här
function ThemedToaster() {
  const light = useThemeStore((s) => s.theme) === 'light'
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: light ? '#FFFFFF' : '#222222',
          color: light ? '#111111' : '#FFFFFF',
          border: `1px solid ${light ? '#D8D8D8' : '#333333'}`,
          borderRadius: '12px',
          fontSize: '14px',
          boxShadow: light ? '0 4px 12px rgba(0, 0, 0, 0.12)' : undefined,
        },
        success: {
          iconTheme: { primary: light ? '#E6C200' : '#FFD700', secondary: light ? '#111111' : '#0A0A0A' },
        },
        error: {
          iconTheme: { primary: light ? '#B91C1C' : '#EF4444', secondary: '#FFFFFF' },
        },
      }}
    />
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ThemedToaster />
      </AuthProvider>
      <ConfirmDialog />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
