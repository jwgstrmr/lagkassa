import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/components/AuthProvider'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { AdminGuard, SuperAdminGuard, TeamGuard } from '@/features/teams/components/TeamGuard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#222222',
              color: '#FFFFFF',
              border: '1px solid #333333',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#FFD700', secondary: '#0A0A0A' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
            },
          }}
        />
      </AuthProvider>
      <ConfirmDialog />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
