import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, useFarmer } from '@/src/context/AppContext'

export function PublicRoute() {
  const auth = useAuth()
  const farmer = useFarmer()
  if (auth.isAuthenticated && farmer) return <Navigate to='/home' replace />
  if (auth.isAuthenticated && auth.isNewUser)
    return <Navigate to='/registration' replace />
  return <Outlet />
}
