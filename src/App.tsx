import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingState } from '@/src/components/common/ErrorStates'
import { AppProvider } from '@/src/context/AppContext'
import NotFound from '@/src/pages/NotFound'
import { ProtectedRoute } from '@/src/routes/ProtectedRoute'
import { PublicRoute } from '@/src/routes/PublicRoute'

const Welcome = lazy(() => import('@/src/pages/onboarding/Welcome'))
const PhoneEntry = lazy(() => import('@/src/pages/onboarding/PhoneEntry'))
const OtpVerification = lazy(
  () => import('@/src/pages/onboarding/OtpVerification'),
)
const Registration = lazy(() => import('@/src/pages/onboarding/Registration'))
const PolicyLookup = lazy(() => import('@/src/pages/onboarding/PolicyLookup'))
const Home = lazy(() => import('@/src/pages/farm/Home'))
const FarmDetail = lazy(() => import('@/src/pages/farm/FarmDetail'))
const AddFarm = lazy(() => import('@/src/pages/farm/AddFarm'))
const BoundaryIntro = lazy(() => import('@/src/pages/farm/BoundaryIntro'))
const BoundaryMap = lazy(() => import('@/src/pages/farm/BoundaryMap'))
const BoundaryQuickMap = lazy(() => import('@/src/pages/farm/BoundaryQuickMap'))
const BoundaryWalk = lazy(() => import('@/src/pages/farm/BoundaryWalk'))
const BoundaryDraw = lazy(() => import('@/src/pages/farm/BoundaryDraw'))
const ConfirmFarm = lazy(() => import('@/src/pages/farm/ConfirmFarm'))
const ViewBoundary = lazy(() => import('@/src/pages/farm/ViewBoundary'))
const YieldAnalysis = lazy(() => import('@/src/pages/farm/YieldAnalysis'))
const YieldReport = lazy(() => import('@/src/pages/farm/YieldReport'))
const PlanOptions = lazy(() => import('@/src/pages/insurance/PlanOptions'))
const PremiumQuote = lazy(() => import('@/src/pages/insurance/PremiumQuote'))
const Payment = lazy(() => import('@/src/pages/insurance/Payment'))
const Confirmation = lazy(() => import('@/src/pages/insurance/Confirmation'))
const MonitorList = lazy(() => import('@/src/pages/monitor/MonitorList'))
const MonitorDetail = lazy(() => import('@/src/pages/monitor/MonitorDetail'))
const AllFarmsMap = lazy(() => import('@/src/pages/map/AllFarmsMap'))
const PayoutNotification = lazy(
  () => import('@/src/pages/payout/PayoutNotification'),
)
const PayoutDetails = lazy(() => import('@/src/pages/payout/PayoutDetails'))
const PayoutHistory = lazy(() => import('@/src/pages/payout/PayoutHistory'))
const Profile = lazy(() => import('@/src/pages/profile/Profile'))
const Policies = lazy(() => import('@/src/pages/profile/Policies'))
const PolicyDetail = lazy(() => import('@/src/pages/profile/PolicyDetail'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className='screen'>
          <div className='screen-body'>
            <LoadingState />
          </div>
        </div>
      }
    >
      <ScrollToTop />
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path='/' element={<Welcome />} />
          <Route path='/phone-entry' element={<PhoneEntry />} />
          <Route path='/otp-verification' element={<OtpVerification />} />
          <Route path='/policy-lookup' element={<PolicyLookup />} />
        </Route>
        <Route element={<ProtectedRoute allowNewUser />}>
          <Route path='/registration' element={<Registration />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path='/home' element={<Home />} />
          <Route path='/farm/:farmId' element={<FarmDetail />} />
          <Route path='/add-farm' element={<AddFarm />} />
          <Route path='/edit-farm/:farmId' element={<AddFarm />} />
          <Route path='/boundary-intro' element={<BoundaryIntro />} />
          <Route path='/boundary-map' element={<BoundaryMap />} />
          <Route path='/boundary-quick-map' element={<BoundaryQuickMap />} />
          <Route path='/boundary-walk' element={<BoundaryWalk />} />
          <Route path='/boundary-draw' element={<BoundaryDraw />} />
          <Route path='/view-boundary/:farmId' element={<ViewBoundary />} />
          <Route path='/confirm-farm' element={<ConfirmFarm />} />
          <Route path='/yield-analysis/:farmId' element={<YieldAnalysis />} />
          <Route path='/yield-report/:farmId' element={<YieldReport />} />
          <Route path='/insure/:farmId' element={<PlanOptions />} />
          <Route path='/premium-quote/:farmId' element={<PremiumQuote />} />
          <Route path='/payment/:farmId' element={<Payment />} />
          <Route path='/confirmation/:farmId' element={<Confirmation />} />
          <Route path='/monitor' element={<MonitorList />} />
          <Route path='/monitor/:farmId' element={<MonitorDetail />} />
          <Route path='/map' element={<AllFarmsMap />} />
          <Route path='/payouts' element={<PayoutHistory />} />
          <Route path='/payout/:payoutId' element={<PayoutNotification />} />
          <Route path='/payout-details/:payoutId' element={<PayoutDetails />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/policies' element={<Policies />} />
          <Route path='/policy/:policyId' element={<PolicyDetail />} />
        </Route>
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
