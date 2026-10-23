import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, useFarmer } from '@/src/context/AppContext'

export function ProtectedRoute({
  allowNewUser = false,
}: {
  allowNewUser?: boolean
}) {
  const auth = useAuth()
  const farmer = useFarmer()
  if (!auth.isAuthenticated) return <Navigate to='/' replace />
  if (allowNewUser && farmer) return <Navigate to='/home' replace />
  if (!allowNewUser && !farmer) return <Navigate to='/registration' replace />
  return <Outlet />
}
