# Agrails Farmer Insurance Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, from an empty repo, a mobile-first mock-data prototype of the Agrails Farmer Insurance app for usability testing with Kenyan smallholder farmers on low-end Android phones.

**Architecture:** React 19 SPA (Vite 6) packaged with Capacitor 8. Global state lives in one `useReducer` context persisted to `localStorage`; pages talk only to a mock `services/` layer that simulates latency, OTP, M-Pesa and satellite/weather data. All business rules are pure functions in `src/utils/`; all charts are hand-built SVG components; maps are Leaflet with Esri satellite tiles, loaded only on map routes.

**Tech Stack:** React 19, TypeScript (strict), Vite 6, React Router v6, Leaflet 1.9, Capacitor 8, Vitest 3 + React Testing Library + jsdom, Prettier.

**Spec:** `docs/superpowers/specs/2026-10-22-agrails-prototype-design.md` (read it before starting any task).

## Global Constraints

- Stack: React 19, TypeScript strict, Vite 6, React Router v6, Capacitor 8 with `appId: agrails.app`, Leaflet 1.9.
- Satellite tiles: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` with attribution `Tiles © Esri`.
- No chart library, no CSS framework, no icon library, no state-management library.
- Styling: CSS variables in `src/styles/tokens.css`; shared classes in `src/styles/global.css`; CSS modules for component-specific styles.
- Prettier: no semicolons, single quotes (including JSX), trailing commas. Run `npm run format` before each commit.
- Every user-facing string goes through `t('key')` from `@/src/i18n`; English only; keys live in `src/i18n/en.ts`.
- Money is shown as `KES 12,500` via `formatKES`.
- Tap targets ≥ 48 px; body text ≥ 16 px; layouts designed for 360 px width first; one primary action per screen, pinned at the bottom.
- Animate only `transform` and `opacity`; all animation disabled under `prefers-reduced-motion: reduce`.
- Pages never import `src/data/mockData.ts`; they use `src/services/*` and context hooks.
- `localStorage` keys: `agrails_auth` (auth) and `agrails_state` (farmer, farms, policies, payouts). Every access wrapped in try/catch.
- Initial JS ≤ 150 KB gzipped (checked by `npm run check:bundle`).
- Import alias: `@` = project root, so imports look like `@/src/utils/format`.
- Mock behaviour: OTP code `123456`; seeded returning farmer `+254712345678`; M-Pesa numbers ending in `0` fail, ending in `9` time out (after 60 s), all others succeed after ~4 s.
- Tests live next to the code as `*.test.ts` / `*.test.tsx`; run with `npm test`.

## Review Focus

1. **Blocked or corrupt `localStorage`** (private mode, quota, hand-edited JSON) — the app must start with seed/empty data instead of a white screen. Pinned by tests in Task 8.
2. **Phone typed with a leading `0`, spaces, dashes, or `+254`** — must normalise to the same `+254…` number so a returning farmer is recognised. Pinned in Task 3 and Task 14.
3. **Deep link or stale id** (`/farm/nope`, `/payout/old`, `/insure/deleted`) — must show the friendly Not Found screen, not crash. Pinned in Task 13, 16, 21, 25.
4. **Reload or back-button in the middle of add-farm** (form has no crop or no boundary) — confirm screen must send the farmer back to the right step instead of saving a broken farm. Pinned in Task 19.
5. **Double-tapping "Pay"** on a slow phone — only one payment request and one policy may be created. Pinned in Task 22.

---

## File Structure

```
index.html                        # App shell, viewport, theme colour
package.json, tsconfig.json, vite.config.ts, .prettierrc.json, .gitignore
capacitor.config.ts               # Task 27
scripts/check-bundle.mjs          # Task 27: initial-JS budget check
src/
  index.tsx                       # Entry: styles + <App/>
  App.tsx                         # Providers, router, lazy route table
  vite-env.d.ts
  test/setup.ts                   # jest-dom, localStorage reset, matchMedia stub
  test/renderWithApp.tsx          # Test helper: providers + MemoryRouter
  styles/tokens.css               # Colour, type, spacing tokens
  styles/global.css               # Base + shared layout/button/form classes
  i18n/en.ts                      # All English strings
  i18n/index.ts                   # t() helper
  types/index.ts                  # Domain types
  data/cropConfig.ts              # Crops, plans, rates, counties, limits
  data/mockData.ts                # Seed farmer, farms, policies, payouts, yield histories
  data/generators.ts              # Deterministic PRNG + series generators
  utils/format.ts                 # KES, ha/acres, dates, phone
  utils/validation.ts             # Phone, national ID, name, OTP
  utils/geo.ts                    # Area, intersection, simplify, square, centroid, distance
  utils/insurance.ts              # Sum insured, premium, payout
  utils/monitor.ts                # SPI/NDVI classification, health score
  utils/yield.ts                  # Yield analysis + risk level
  context/reducer.ts              # Actions + reducer (pure)
  context/persistence.ts          # load/save auth + state
  context/AppContext.tsx          # Provider + hooks
  services/config.ts              # Latency settings + delay()
  services/authService.ts
  services/farmService.ts
  services/policyService.ts
  services/paymentService.ts
  services/monitorService.ts
  components/charts/scale.ts      # linear scale + nice ticks
  components/charts/{Sparkline,Ring,Donut,Gauge,LineChart,BarChart,RangeStrip,ChartTooltip}.tsx
  components/charts/charts.module.css
  components/common/{Icons,Illustrations,Button,Header,BottomNav,Chip,ErrorStates,ProgressTimeline,Screen,BottomSheet}.tsx
  components/common/common.module.css
  components/cards/FarmCard.tsx (+ .module.css)
  components/forms/OtpInput.tsx (+ .module.css)
  components/forms/Field.tsx
  components/map/FarmMap.tsx      # Only module that imports leaflet
  components/map/FarmShape.tsx    # Lightweight SVG polygon thumbnail (no leaflet)
  routes/{ProtectedRoute,PublicRoute}.tsx
  pages/NotFound.tsx
  pages/onboarding/{Welcome,PhoneEntry,OtpVerification,Registration}.tsx
  pages/farm/{Home,FarmDetail,AddFarm,BoundaryIntro,BoundaryMap,BoundaryQuickMap,BoundaryWalk,BoundaryDraw,ConfirmFarm,ViewBoundary,YieldAnalysis,YieldReport}.tsx
  pages/insurance/{PlanOptions,PremiumQuote,Payment,Confirmation}.tsx
  pages/monitor/{MonitorList,MonitorDetail}.tsx
  pages/map/AllFarmsMap.tsx
  pages/payout/{PayoutNotification,PayoutDetails,PayoutHistory}.tsx
  pages/profile/{Profile,Policies,PolicyDetail}.tsx
  pages/pages.module.css          # Page-specific styles shared across pages
```

Routes (in addition to the README list) `/yield-analysis/:farmId` and `/yield-report/:farmId` implement the spec's yield analysis and historical report screens.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.prettierrc.json`, `.gitignore`, `index.html`, `src/index.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/styles/tokens.css`, `src/styles/global.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `npm run dev|build|test|format`; global CSS classes used by every later task: `.screen`, `.screen-body`, `.screen-footer`, `.stack`, `.stack-sm`, `.stack-lg`, `.row`, `.row-between`, `.card`, `.card-tap`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-block`, `.h1`, `.h2`, `.h3`, `.muted`, `.figure`, `.figure-sm`, `.takeaway`, `.sr-only`, `.fade-in`, `.grid-2`, `.grid-3`, `.divider`; CSS variables listed in `tokens.css`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "agrails-farmer-insurance",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "format": "prettier --write src",
    "check:bundle": "node scripts/check-bundle.mjs"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/leaflet": "^1.9.14",
    "@types/node": "^22.10.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^26.0.0",
    "prettier": "^3.4.2",
    "typescript": "~5.7.2",
    "vite": "^6.0.7",
    "vitest": "^3.0.5"
  }
}
```

Run: `npm install`
Expected: completes with no `ERR!` lines.

- [ ] **Step 2: Create config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom", "node"],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    server: { port: 3000, host: '0.0.0.0' },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
```

`.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": true,
  "trailingComma": "all"
}
```

`.gitignore`:

```
node_modules
dist
coverage
.env.local
.DS_Store
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <meta name="theme-color" content="#1f6b3a" />
    <title>Agrails</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create design tokens `src/styles/tokens.css`**

```css
:root {
  /* Brand */
  --green-900: #0f3d21;
  --green-700: #1f6b3a;
  --green-500: #2f9e5a;
  --green-300: #8fd3a5;
  --green-100: #e3f5e8;
  --soil-700: #6b4423;
  --soil-500: #96643a;
  --soil-100: #f4ece3;
  --gold-500: #e0a526;
  --gold-100: #fdf3dc;
  --rain-600: #1f6fb5;
  --rain-400: #4a9be0;
  --rain-100: #e2effb;

  /* Status */
  --good: #2f9e5a;
  --good-bg: #e3f5e8;
  --warning: #c77700;
  --warning-bg: #fff1d6;
  --danger: #c62828;
  --danger-bg: #fde4e4;

  /* Neutrals */
  --ink: #17201a;
  --ink-2: #44514a;
  --ink-3: #6b7770;
  --line: #dfe5e1;
  --surface: #ffffff;
  --bg: #f5f7f4;

  /* Type */
  --font: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;
  --fs-xs: 13px;
  --fs-sm: 14px;
  --fs-md: 16px;
  --fs-lg: 19px;
  --fs-xl: 24px;
  --fs-2xl: 30px;
  --fs-3xl: 38px;

  /* Space & shape */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;
  --radius: 14px;
  --radius-lg: 22px;
  --radius-pill: 999px;
  --shadow: 0 1px 2px rgba(15, 61, 33, 0.06), 0 4px 14px rgba(15, 61, 33, 0.08);
  --tap: 48px;
  --nav-h: 64px;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

- [ ] **Step 5: Create shared styles `src/styles/global.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-md);
  line-height: 1.45;
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

button,
input,
select {
  font: inherit;
  color: inherit;
}

img,
svg {
  display: block;
  max-width: 100%;
}

a {
  color: var(--green-700);
}

:focus-visible {
  outline: 3px solid var(--gold-500);
  outline-offset: 2px;
}

/* Screen layout */
.screen {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  max-width: 560px;
  margin: 0 auto;
  background: var(--bg);
}

.screen-body {
  flex: 1;
  padding: var(--sp-4);
  padding-bottom: calc(var(--sp-6) + var(--nav-h));
}

.screen-footer {
  position: sticky;
  bottom: 0;
  padding: var(--sp-3) var(--sp-4) calc(var(--sp-3) + env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--bg) 75%, rgba(245, 247, 244, 0));
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.stack > * + * {
  margin-top: var(--sp-4);
}
.stack-sm > * + * {
  margin-top: var(--sp-2);
}
.stack-lg > * + * {
  margin-top: var(--sp-5);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3);
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-2);
}

.card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--sp-4);
}
.card-tap {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: transform 120ms var(--ease);
}
.card-tap:active {
  transform: scale(0.98);
}

.divider {
  height: 1px;
  background: var(--line);
  border: 0;
  margin: var(--sp-4) 0;
}

/* Buttons */
.btn {
  min-height: var(--tap);
  padding: 0 var(--sp-5);
  border-radius: var(--radius-pill);
  border: 2px solid transparent;
  font-weight: 700;
  font-size: var(--fs-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  cursor: pointer;
  text-decoration: none;
  transition: transform 120ms var(--ease), opacity 120ms;
}
.btn:active {
  transform: scale(0.97);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--green-700);
  color: #fff;
}
.btn-secondary {
  background: var(--surface);
  color: var(--green-700);
  border-color: var(--green-700);
}
.btn-ghost {
  background: transparent;
  color: var(--green-700);
}
.btn-block {
  width: 100%;
}

/* Type */
.h1 {
  font-size: var(--fs-2xl);
  line-height: 1.15;
  font-weight: 800;
  margin: 0;
}
.h2 {
  font-size: var(--fs-xl);
  line-height: 1.2;
  font-weight: 800;
  margin: 0;
}
.h3 {
  font-size: var(--fs-lg);
  font-weight: 700;
  margin: 0;
}
.muted {
  color: var(--ink-3);
  font-size: var(--fs-sm);
}
.figure {
  font-size: var(--fs-3xl);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}
.figure-sm {
  font-size: var(--fs-xl);
  font-weight: 800;
  line-height: 1.1;
}
.takeaway {
  background: var(--green-100);
  color: var(--green-900);
  border-radius: var(--radius);
  padding: var(--sp-3) var(--sp-4);
  font-weight: 600;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Motion */
.fade-in {
  animation: fade-in 280ms var(--ease) both;
}
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 6: Create test setup `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

afterEach(() => {
  localStorage.clear()
})

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
```

- [ ] **Step 7: Write the failing smoke test `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import App from '@/src/App'

test('renders the app shell', () => {
  render(<App />)
  expect(screen.getByText('Agrails')).toBeInTheDocument()
})
```

Run: `npm test`
Expected: FAIL — cannot resolve `@/src/App`.

- [ ] **Step 8: Create `src/App.tsx` and `src/index.tsx`**

`src/App.tsx` (temporary shell; replaced in Task 13):

```tsx
export default function App() {
  return (
    <main className='screen'>
      <div className='screen-body'>
        <h1 className='h1'>Agrails</h1>
      </div>
    </main>
  )
}
```

`src/index.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/src/styles/tokens.css'
import '@/src/styles/global.css'
import App from '@/src/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Verify tests and build**

Run: `npm test`
Expected: PASS (1 test).

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
npm run format
git add package.json package-lock.json tsconfig.json vite.config.ts .prettierrc.json .gitignore index.html src README.md
git commit -m "chore: scaffold Vite React TypeScript app with design tokens"
```

---

### Task 2: Domain types, crop config and i18n

**Files:**
- Create: `src/types/index.ts`, `src/data/cropConfig.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`
- Test: `src/i18n/index.test.ts`, `src/data/cropConfig.test.ts`

**Interfaces:**
- Produces (types): `Crop`, `Season`, `RiskLevel`, `PlanId`, `LatLng`, `Status`, `BoundaryMethod`, `Farmer`, `Farm`, `Plan`, `Policy`, `PolicyStatus`, `PayoutStage`, `Payout`, `YieldData`, `YieldAnalysisResult`, `MonitorSeries`, `FarmFormData`, `AuthState`, `AppState`, `Quote`, `Weather`.
- Produces (config): `CROPS`, `CROP_LIST`, `PLANS`, `PLAN_LIST`, `RECOMMENDED_PLAN`, `RISK_RATES`, `SUBSIDY_PCT`, `HEAT_STRESS_C`, `BOUNDARY_LIMITS`, `SEASON_WINDOWS`, `KENYA_CENTER`, `COUNTIES`, `COUNTY_CENTERS`, `countyCenter(county)`.
- Produces (i18n): `t(key: StringKey, vars?: Record<string, string | number>): string`, type `StringKey`.

- [ ] **Step 1: Create `src/types/index.ts`**

```ts
export type Crop = 'maize' | 'beans' | 'tea'
export type Season = 'long_rains' | 'short_rains'
export type RiskLevel = 'low' | 'medium' | 'high'
export type PlanId = 'basic' | 'standard' | 'premium'
export type Status = 'good' | 'warning' | 'danger'
export type BoundaryMethod = 'map' | 'quick' | 'walk' | 'draw'
/** [latitude, longitude] in degrees */
export type LatLng = [number, number]

export interface Farmer {
  id: string
  name: string
  phone: string
  county: string
  nationalId: string
  primaryCrop: Crop
}

export interface Farm {
  id: string
  name: string
  crop: Crop
  season: Season
  plantingDate: string
  boundary: LatLng[]
  areaHa: number
  county: string
  riskLevel: RiskLevel
  healthScore: number
}

export interface Plan {
  id: PlanId
  triggerYieldPct: number
  coveragePct: number
}

export type PolicyStatus = 'active' | 'expired' | 'claimed'

export interface Policy {
  id: string
  policyNumber: string
  farmId: string
  planId: PlanId
  sumInsuredKES: number
  premiumKES: number
  subsidyKES: number
  farmerPremiumKES: number
  triggerYieldPct: number
  coverageStart: string
  coverageEnd: string
  status: PolicyStatus
  mpesaReceipt: string
}

export type PayoutStage = 'triggered' | 'assessed' | 'approved' | 'sent'

export interface Payout {
  id: string
  policyId: string
  farmId: string
  /** tonnes per hectare */
  expectedYield: number
  /** tonnes per hectare */
  actualYield: number
  /** 0–100 */
  shortfallPct: number
  amountKES: number
  stage: PayoutStage
  stageDates: Partial<Record<PayoutStage, string>>
  read: boolean
}

export interface YieldData {
  year: number
  yieldTPerHa: number
  rainfallMm: number
}

export interface YieldAnalysisResult {
  history: YieldData[]
  averageYield: number
  /** years whose yield fell below the trigger share of the average */
  belowTriggerYears: number[]
  riskLevel: RiskLevel
}

export interface MonitorSeries {
  /** ISO date of the Monday of each week, oldest first */
  weeks: string[]
  ndvi: number[]
  rainfallMm: number[]
  rainfallNormalMm: number[]
  spi: number[]
  tempMinC: number[]
  tempMaxC: number[]
}

export interface FarmFormData {
  editingFarmId: string | null
  name: string
  crop: Crop | null
  season: Season | null
  plantingDate: string
  method: BoundaryMethod | null
  boundary: LatLng[]
}

export interface AuthState {
  isAuthenticated: boolean
  phone: string | null
  isNewUser: boolean
}

export interface AppState {
  auth: AuthState
  farmer: Farmer | null
  farms: Farm[]
  policies: Policy[]
  payouts: Payout[]
  farmForm: FarmFormData
}

export interface Quote {
  farmId: string
  planId: PlanId
  sumInsuredKES: number
  premiumKES: number
  subsidyKES: number
  farmerPremiumKES: number
  triggerYieldPct: number
  coverageStart: string
  coverageEnd: string
  /** payout the farmer would get if area yield fell to 50% of normal */
  exampleAt50PctKES: number
}

export interface Weather {
  tempC: number
  rainChancePct: number
  condition: 'sunny' | 'cloudy' | 'rain'
}
```

- [ ] **Step 2: Write the failing config + i18n tests**

`src/data/cropConfig.test.ts`:

```ts
import {
  COUNTIES,
  CROPS,
  KENYA_CENTER,
  PLANS,
  RECOMMENDED_PLAN,
  countyCenter,
} from '@/src/data/cropConfig'

test('lists all 47 Kenyan counties without duplicates', () => {
  expect(COUNTIES).toHaveLength(47)
  expect(new Set(COUNTIES).size).toBe(47)
})

test('plans trigger at 60/70/80 percent and standard is recommended', () => {
  expect(PLANS.basic.triggerYieldPct).toBe(60)
  expect(PLANS.standard.triggerYieldPct).toBe(70)
  expect(PLANS.premium.triggerYieldPct).toBe(80)
  expect(RECOMMENDED_PLAN).toBe('standard')
})

test('every crop has a healthy NDVI range inside 0..1', () => {
  for (const info of Object.values(CROPS)) {
    expect(info.ndviHealthy[0]).toBeGreaterThan(0)
    expect(info.ndviHealthy[1]).toBeLessThan(1)
    expect(info.ndviHealthy[0]).toBeLessThan(info.ndviHealthy[1])
  }
})

test('countyCenter falls back to the centre of Kenya', () => {
  expect(countyCenter('Nakuru')).not.toEqual(KENYA_CENTER)
  expect(countyCenter('Unknown')).toEqual(KENYA_CENTER)
})
```

`src/i18n/index.test.ts`:

```ts
import { t } from '@/src/i18n'

test('returns the English string for a key', () => {
  expect(t('crop.maize')).toBe('Maize')
})

test('fills {placeholders} from vars', () => {
  expect(t('common.hello', { name: 'Wanjiru' })).toBe('Hello, Wanjiru')
})

test('leaves unknown placeholders untouched', () => {
  expect(t('common.hello')).toBe('Hello, {name}')
})
```

Run: `npm test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/data/cropConfig.ts`**

```ts
import type { Crop, LatLng, Plan, PlanId, RiskLevel, Season } from '@/src/types'

export interface CropInfo {
  /** Expected harvest value per hectare in KES */
  valuePerHaKES: number
  /** Normal yield in tonnes per hectare */
  expectedYieldTPerHa: number
  /** NDVI range considered healthy mid-season */
  ndviHealthy: [number, number]
}

export const CROPS: Record<Crop, CropInfo> = {
  maize: { valuePerHaKES: 120000, expectedYieldTPerHa: 2.5, ndviHealthy: [0.45, 0.85] },
  beans: { valuePerHaKES: 90000, expectedYieldTPerHa: 1.2, ndviHealthy: [0.4, 0.8] },
  tea: { valuePerHaKES: 300000, expectedYieldTPerHa: 2.2, ndviHealthy: [0.55, 0.9] },
}

export const CROP_LIST: Crop[] = ['maize', 'beans', 'tea']

export const PLANS: Record<PlanId, Plan> = {
  basic: { id: 'basic', triggerYieldPct: 60, coveragePct: 0.6 },
  standard: { id: 'standard', triggerYieldPct: 70, coveragePct: 0.7 },
  premium: { id: 'premium', triggerYieldPct: 80, coveragePct: 0.8 },
}

export const PLAN_LIST: PlanId[] = ['basic', 'standard', 'premium']
export const RECOMMENDED_PLAN: PlanId = 'standard'

export const RISK_RATES: Record<RiskLevel, number> = {
  low: 0.05,
  medium: 0.07,
  high: 0.1,
}

export const SUBSIDY_PCT = 0.5
export const HEAT_STRESS_C = 32
export const BOUNDARY_LIMITS = { minHa: 0.05, maxHa: 50 }

/** Month indexes (0 = January) when each season's cover runs */
export const SEASON_WINDOWS: Record<Season, { startMonth: number; endMonth: number }> = {
  long_rains: { startMonth: 2, endMonth: 6 },
  short_rains: { startMonth: 9, endMonth: 11 },
}

export const KENYA_CENTER: LatLng = [0.0236, 37.9062]

export const COUNTIES: string[] = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
  'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
  "Murang'a", 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

export const COUNTY_CENTERS: Record<string, LatLng> = {
  Nakuru: [-0.3031, 36.08],
  Machakos: [-1.5177, 37.2634],
  Kericho: [-0.3689, 35.2863],
  Nairobi: [-1.2921, 36.8219],
  Kiambu: [-1.1714, 36.8356],
  'Uasin Gishu': [0.5143, 35.2698],
  'Trans Nzoia': [1.0567, 34.9507],
  Meru: [0.0463, 37.6559],
  Kisumu: [-0.0917, 34.768],
}

export function countyCenter(county: string): LatLng {
  return COUNTY_CENTERS[county] ?? KENYA_CENTER
}
```

- [ ] **Step 4: Create `src/i18n/en.ts` and `src/i18n/index.ts`**

`src/i18n/en.ts` (later tasks append keys inside this object):

```ts
export const en = {
  'app.name': 'Agrails',
  'common.hello': 'Hello, {name}',
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.retry': 'Try again',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.loading': 'Loading…',
  'common.seeAll': 'See all',
  'common.goHome': 'Go to home',
  'crop.maize': 'Maize',
  'crop.beans': 'Beans',
  'crop.tea': 'Tea',
  'season.long_rains': 'Long rains (Mar–Jul)',
  'season.short_rains': 'Short rains (Oct–Dec)',
  'risk.low': 'Low risk',
  'risk.medium': 'Medium risk',
  'risk.high': 'High risk',
  'plan.basic': 'Basic',
  'plan.standard': 'Standard',
  'plan.premium': 'Premium',
  'status.good': 'Good',
  'status.warning': 'Watch',
  'status.danger': 'Alert',
}

export type StringKey = keyof typeof en
```

`src/i18n/index.ts`:

```ts
import { en, type StringKey } from './en'

export type { StringKey }

export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const template: string = en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/types src/data src/i18n
git commit -m "feat: add domain types, crop config and i18n helper"
```

---

### Task 3: Formatting and validation helpers

**Files:**
- Create: `src/utils/format.ts`, `src/utils/validation.ts`
- Test: `src/utils/format.test.ts`, `src/utils/validation.test.ts`

**Interfaces:**
- Produces: `formatKES(n: number): string`, `HA_TO_ACRES`, `haToAcres(ha)`, `acresToHa(acres)`, `formatHa(ha): string`, `formatAcres(ha): string`, `formatDate(iso: string): string`, `formatShortDate(iso: string): string`, `formatPhone(e164: string): string`, `normalizeKenyanPhone(input: string): string | null`, `isValidNationalId(id: string): boolean`, `isValidName(name: string): boolean`, `isValidOtp(code: string): boolean`.

- [ ] **Step 1: Write the failing tests**

`src/utils/format.test.ts`:

```ts
import {
  acresToHa,
  formatAcres,
  formatDate,
  formatHa,
  formatKES,
  formatPhone,
  formatShortDate,
  haToAcres,
} from '@/src/utils/format'

test('formats KES with thousands separators and no decimals', () => {
  expect(formatKES(12500)).toBe('KES 12,500')
  expect(formatKES(1234.6)).toBe('KES 1,235')
  expect(formatKES(0)).toBe('KES 0')
})

test('converts between hectares and acres', () => {
  expect(haToAcres(1)).toBeCloseTo(2.47105, 4)
  expect(acresToHa(2.47105)).toBeCloseTo(1, 4)
})

test('formats areas compactly', () => {
  expect(formatHa(1.2)).toBe('1.2 ha')
  expect(formatHa(0.8123)).toBe('0.81 ha')
  expect(formatAcres(1)).toBe('2.5 acres')
})

test('formats ISO dates for farmers', () => {
  expect(formatDate('2026-03-15T00:00:00.000Z')).toBe('15 Mar 2026')
  expect(formatShortDate('2026-03-15T00:00:00.000Z')).toBe('15 Mar')
})

test('formats Kenyan phone numbers in groups', () => {
  expect(formatPhone('+254712345678')).toBe('+254 712 345 678')
})
```

`src/utils/validation.test.ts`:

```ts
import {
  isValidName,
  isValidNationalId,
  isValidOtp,
  normalizeKenyanPhone,
} from '@/src/utils/validation'

test.each([
  ['712345678', '+254712345678'],
  ['0712345678', '+254712345678'],
  ['0712 345 678', '+254712345678'],
  ['0712-345-678', '+254712345678'],
  ['+254712345678', '+254712345678'],
  ['254712345678', '+254712345678'],
  ['110345678', '+254110345678'],
])('normalises %s', (input, expected) => {
  expect(normalizeKenyanPhone(input)).toBe(expected)
})

test.each(['', '12345', '812345678', '71234567', '7123456789', 'abc'])(
  'rejects %s',
  (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull()
  },
)

test('national ID is 7 or 8 digits', () => {
  expect(isValidNationalId('1234567')).toBe(true)
  expect(isValidNationalId(' 12345678 ')).toBe(true)
  expect(isValidNationalId('123456')).toBe(false)
  expect(isValidNationalId('12345a78')).toBe(false)
})

test('name needs at least 3 non-space characters', () => {
  expect(isValidName('Ann')).toBe(true)
  expect(isValidName('  A ')).toBe(false)
})

test('OTP is exactly 6 digits', () => {
  expect(isValidOtp('123456')).toBe(true)
  expect(isValidOtp('12345')).toBe(false)
  expect(isValidOtp('12345a')).toBe(false)
})
```

Run: `npm test -- src/utils`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement `src/utils/format.ts`**

```ts
export const HA_TO_ACRES = 2.47105

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-US')}`
}

export function haToAcres(ha: number): number {
  return ha * HA_TO_ACRES
}

export function acresToHa(acres: number): number {
  return acres / HA_TO_ACRES
}

export function formatHa(ha: number): string {
  return `${Number(ha.toFixed(2))} ha`
}

export function formatAcres(ha: number): string {
  return `${Number(haToAcres(ha).toFixed(1))} acres`
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export function formatDate(iso: string): string {
  return `${formatShortDate(iso)} ${new Date(iso).getUTCFullYear()}`
}

export function formatPhone(e164: string): string {
  const local = e164.replace(/^\+254/, '')
  return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}
```

- [ ] **Step 3: Implement `src/utils/validation.ts`**

```ts
/** Returns +2547XXXXXXXX / +2541XXXXXXXX or null if not a Kenyan mobile number. */
export function normalizeKenyanPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('254')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^[17]\d{8}$/.test(digits) ? `+254${digits}` : null
}

export function isValidNationalId(id: string): boolean {
  return /^\d{7,8}$/.test(id.trim())
}

export function isValidName(name: string): boolean {
  return name.replace(/\s/g, '').length >= 3
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code)
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/utils`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/utils
git commit -m "feat: add formatting and validation helpers"
```

---
### Task 4: Geometry helpers

**Files:**
- Create: `src/utils/geo.ts`
- Test: `src/utils/geo.test.ts`

**Interfaces:**
- Consumes: `LatLng` (Task 2), `BOUNDARY_LIMITS` (Task 2).
- Produces: `M_PER_DEG`, `polygonAreaHa(b: LatLng[]): number`, `squareAround(center: LatLng, areaHa: number): LatLng[]`, `distanceMeters(a: LatLng, b: LatLng): number`, `pathLengthMeters(points: LatLng[]): number`, `centroid(points: LatLng[]): LatLng`, `isSelfIntersecting(b: LatLng[]): boolean`, `validateBoundary(b: LatLng[]): BoundaryCheck`, type `BoundaryError = 'too_few_points' | 'self_intersecting' | 'too_small' | 'too_large'`, type `BoundaryCheck = { ok: true; areaHa: number } | { ok: false; reason: BoundaryError }`, `simplifyPath(points: LatLng[], toleranceM: number): LatLng[]`, `boundsOf(points: LatLng[]): [LatLng, LatLng]` (south-west, north-east).

- [ ] **Step 1: Write the failing tests `src/utils/geo.test.ts`**

```ts
import type { LatLng } from '@/src/types'
import {
  boundsOf,
  centroid,
  distanceMeters,
  isSelfIntersecting,
  pathLengthMeters,
  polygonAreaHa,
  simplifyPath,
  squareAround,
  validateBoundary,
} from '@/src/utils/geo'

const NAKURU: LatLng = [-0.3031, 36.08]

test('squareAround produces a polygon of the requested area', () => {
  expect(polygonAreaHa(squareAround(NAKURU, 1))).toBeCloseTo(1, 2)
  expect(polygonAreaHa(squareAround(NAKURU, 0.5))).toBeCloseTo(0.5, 2)
})

test('area ignores vertex order and needs 3+ points', () => {
  const sq = squareAround(NAKURU, 2)
  expect(polygonAreaHa([...sq].reverse())).toBeCloseTo(2, 2)
  expect(polygonAreaHa(sq.slice(0, 2))).toBe(0)
})

test('distance of one degree of latitude is about 111 km', () => {
  expect(Math.abs(distanceMeters([0, 36], [1, 36]) - 111319)).toBeLessThan(50)
})

test('path length sums segment distances', () => {
  const p: LatLng[] = [
    [0, 36],
    [0.001, 36],
    [0.002, 36],
  ]
  expect(pathLengthMeters(p)).toBeCloseTo(distanceMeters(p[0], p[2]), 0)
})

test('centroid of a square is its centre', () => {
  const c = centroid(squareAround(NAKURU, 1))
  expect(c[0]).toBeCloseTo(NAKURU[0], 6)
  expect(c[1]).toBeCloseTo(NAKURU[1], 6)
})

test('detects a bow-tie as self-intersecting', () => {
  const [a, b, c, d] = squareAround(NAKURU, 1)
  expect(isSelfIntersecting([a, b, c, d])).toBe(false)
  expect(isSelfIntersecting([a, c, b, d])).toBe(true)
})

test('validateBoundary reports the first problem', () => {
  const sq = squareAround(NAKURU, 1)
  expect(validateBoundary(sq.slice(0, 2))).toEqual({ ok: false, reason: 'too_few_points' })
  const [a, b, c, d] = sq
  expect(validateBoundary([a, c, b, d])).toEqual({ ok: false, reason: 'self_intersecting' })
  expect(validateBoundary(squareAround(NAKURU, 0.01))).toEqual({ ok: false, reason: 'too_small' })
  expect(validateBoundary(squareAround(NAKURU, 60))).toEqual({ ok: false, reason: 'too_large' })
  const ok = validateBoundary(sq)
  expect(ok.ok).toBe(true)
  if (ok.ok) expect(ok.areaHa).toBeCloseTo(1, 2)
})

test('simplifyPath drops near-collinear points but keeps corners', () => {
  const wobbly: LatLng[] = [
    [0, 36],
    [0.0001, 36.000001],
    [0.0002, 35.999999],
    [0.0003, 36],
  ]
  expect(simplifyPath(wobbly, 2)).toEqual([wobbly[0], wobbly[3]])
  const corner: LatLng[] = [
    [0, 36],
    [0.0005, 36],
    [0.001, 36],
    [0.001, 36.0005],
    [0.001, 36.001],
  ]
  expect(simplifyPath(corner, 2)).toEqual([corner[0], corner[2], corner[4]])
})

test('boundsOf returns south-west and north-east corners', () => {
  expect(
    boundsOf([
      [1, 36],
      [-1, 37],
      [0, 35],
    ]),
  ).toEqual([
    [-1, 35],
    [1, 37],
  ])
})
```

Run: `npm test -- src/utils/geo`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `src/utils/geo.ts`**

```ts
import { BOUNDARY_LIMITS } from '@/src/data/cropConfig'
import type { LatLng } from '@/src/types'

const R = 6378137
/** Metres per degree of latitude on the sphere used for area/distance */
export const M_PER_DEG = (R * Math.PI) / 180

const rad = (deg: number) => (deg * Math.PI) / 180

/** Spherical polygon area (same formula as Leaflet.draw / turf), in hectares. */
export function polygonAreaHa(boundary: LatLng[]): number {
  if (boundary.length < 3) return 0
  let total = 0
  for (let i = 0; i < boundary.length; i++) {
    const [lat1, lng1] = boundary[i]
    const [lat2, lng2] = boundary[(i + 1) % boundary.length]
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)))
  }
  return Math.abs((total * R * R) / 2) / 10000
}

export function squareAround(center: LatLng, areaHa: number): LatLng[] {
  const half = Math.sqrt(areaHa * 10000) / 2
  const dLat = half / M_PER_DEG
  const dLng = half / (M_PER_DEG * Math.cos(rad(center[0])))
  const [lat, lng] = center
  return [
    [lat + dLat, lng - dLng],
    [lat + dLat, lng + dLng],
    [lat - dLat, lng + dLng],
    [lat - dLat, lng - dLng],
  ]
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function pathLengthMeters(points: LatLng[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distanceMeters(points[i - 1], points[i])
  return total
}

export function centroid(points: LatLng[]): LatLng {
  const n = points.length || 1
  const lat = points.reduce((s, p) => s + p[0], 0) / n
  const lng = points.reduce((s, p) => s + p[1], 0) / n
  return [lat, lng]
}

export function boundsOf(points: LatLng[]): [LatLng, LatLng] {
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]
}

/** Projects to local metres (x east, y north) around the first point. */
function toXY(points: LatLng[]): [number, number][] {
  const origin = points[0]
  const kx = M_PER_DEG * Math.cos(rad(origin[0]))
  return points.map(([lat, lng]) => [(lng - origin[1]) * kx, (lat - origin[0]) * M_PER_DEG])
}

function orient(a: number[], b: number[], c: number[]): number {
  return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
}

function segmentsCross(p1: number[], p2: number[], p3: number[], p4: number[]): boolean {
  const o1 = orient(p1, p2, p3)
  const o2 = orient(p1, p2, p4)
  const o3 = orient(p3, p4, p1)
  const o4 = orient(p3, p4, p2)
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0
}

export function isSelfIntersecting(boundary: LatLng[]): boolean {
  const n = boundary.length
  if (n < 4) return false
  const xy = toXY(boundary)
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue // adjacent through the closing edge
      if (segmentsCross(xy[i], xy[(i + 1) % n], xy[j], xy[(j + 1) % n])) return true
    }
  }
  return false
}

export type BoundaryError = 'too_few_points' | 'self_intersecting' | 'too_small' | 'too_large'
export type BoundaryCheck = { ok: true; areaHa: number } | { ok: false; reason: BoundaryError }

export function validateBoundary(boundary: LatLng[]): BoundaryCheck {
  if (boundary.length < 3) return { ok: false, reason: 'too_few_points' }
  if (isSelfIntersecting(boundary)) return { ok: false, reason: 'self_intersecting' }
  const areaHa = polygonAreaHa(boundary)
  if (areaHa < BOUNDARY_LIMITS.minHa) return { ok: false, reason: 'too_small' }
  if (areaHa > BOUNDARY_LIMITS.maxHa) return { ok: false, reason: 'too_large' }
  return { ok: true, areaHa }
}

function perpendicularDistance(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len
}

/** Douglas–Peucker simplification with a tolerance in metres. */
export function simplifyPath(points: LatLng[], toleranceM: number): LatLng[] {
  if (points.length <= 2) return points
  const xy = toXY(points)
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [start, end] = stack.pop()!
    let maxDist = 0
    let index = -1
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(xy[i], xy[start], xy[end])
      if (d > maxDist) {
        maxDist = d
        index = i
      }
    }
    if (index !== -1 && maxDist > toleranceM) {
      keep[index] = true
      stack.push([start, index], [index, end])
    }
  }
  return points.filter((_, i) => keep[i])
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/utils/geo`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
npm run format
git add src/utils/geo.ts src/utils/geo.test.ts
git commit -m "feat: add geometry helpers for farm boundaries"
```

---

### Task 5: Insurance pricing rules

**Files:**
- Create: `src/utils/insurance.ts`
- Test: `src/utils/insurance.test.ts`

**Interfaces:**
- Consumes: `CROPS`, `PLANS`, `RISK_RATES`, `SUBSIDY_PCT`, `SEASON_WINDOWS` (Task 2); `Farm`, `PlanId`, `Quote`, `RiskLevel`, `Season`, `Crop` (Task 2).
- Produces: `roundTo10(n: number): number`, `sumInsured(crop: Crop, areaHa: number, planId: PlanId): number`, `premiumBreakdown(sumInsuredKES: number, risk: RiskLevel): { premiumKES: number; subsidyKES: number; farmerPremiumKES: number }`, `payoutAmount(sumInsuredKES: number, triggerYieldPct: number, actualYieldPct: number): number`, `coverageWindow(season: Season, today?: Date): { start: string; end: string }`, `buildQuote(farm: Farm, planId: PlanId, today?: Date): Quote`.

- [ ] **Step 1: Write the failing tests `src/utils/insurance.test.ts`**

```ts
import type { Farm } from '@/src/types'
import {
  buildQuote,
  coverageWindow,
  payoutAmount,
  premiumBreakdown,
  roundTo10,
  sumInsured,
} from '@/src/utils/insurance'

const maizeFarm: Farm = {
  id: 'f1',
  name: 'Shamba',
  crop: 'maize',
  season: 'long_rains',
  plantingDate: '2027-03-10T00:00:00.000Z',
  boundary: [],
  areaHa: 1.2,
  county: 'Nakuru',
  riskLevel: 'low',
  healthScore: 90,
}

test('roundTo10 rounds to the nearest 10 KES', () => {
  expect(roundTo10(1234)).toBe(1230)
  expect(roundTo10(1235)).toBe(1240)
})

test('sum insured = crop value per ha x area x plan coverage', () => {
  expect(sumInsured('maize', 1.2, 'standard')).toBe(100800)
  expect(sumInsured('beans', 0.8, 'basic')).toBe(43200)
})

test('premium uses the risk rate with a 50% subsidy', () => {
  expect(premiumBreakdown(100800, 'low')).toEqual({
    premiumKES: 5040,
    subsidyKES: 2520,
    farmerPremiumKES: 2520,
  })
  expect(premiumBreakdown(43200, 'high')).toEqual({
    premiumKES: 4320,
    subsidyKES: 2160,
    farmerPremiumKES: 2160,
  })
})

test('payout is zero at or above the trigger and proportional below it', () => {
  expect(payoutAmount(43200, 60, 60)).toBe(0)
  expect(payoutAmount(43200, 60, 75)).toBe(0)
  expect(payoutAmount(43200, 60, 45)).toBe(10800)
  expect(payoutAmount(43200, 60, 0)).toBe(43200)
})

test('coverage window is the current season if not yet over, else next year', () => {
  const today = new Date('2026-10-22T00:00:00.000Z')
  expect(coverageWindow('short_rains', today)).toEqual({
    start: '2026-10-01T00:00:00.000Z',
    end: '2026-12-31T00:00:00.000Z',
  })
  expect(coverageWindow('long_rains', today)).toEqual({
    start: '2027-03-01T00:00:00.000Z',
    end: '2027-07-31T00:00:00.000Z',
  })
})

test('buildQuote combines all pricing rules', () => {
  const q = buildQuote(maizeFarm, 'standard', new Date('2026-10-22T00:00:00.000Z'))
  expect(q).toEqual({
    farmId: 'f1',
    planId: 'standard',
    sumInsuredKES: 100800,
    premiumKES: 5040,
    subsidyKES: 2520,
    farmerPremiumKES: 2520,
    triggerYieldPct: 70,
    coverageStart: '2027-03-01T00:00:00.000Z',
    coverageEnd: '2027-07-31T00:00:00.000Z',
    exampleAt50PctKES: 28800,
  })
})
```

Run: `npm test -- src/utils/insurance`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `src/utils/insurance.ts`**

```ts
import { CROPS, PLANS, RISK_RATES, SEASON_WINDOWS, SUBSIDY_PCT } from '@/src/data/cropConfig'
import type { Crop, Farm, PlanId, Quote, RiskLevel, Season } from '@/src/types'

export function roundTo10(n: number): number {
  return Math.round(n / 10) * 10
}

export function sumInsured(crop: Crop, areaHa: number, planId: PlanId): number {
  return roundTo10(CROPS[crop].valuePerHaKES * areaHa * PLANS[planId].coveragePct)
}

export function premiumBreakdown(sumInsuredKES: number, risk: RiskLevel) {
  const premiumKES = roundTo10(sumInsuredKES * RISK_RATES[risk])
  const subsidyKES = roundTo10(premiumKES * SUBSIDY_PCT)
  return { premiumKES, subsidyKES, farmerPremiumKES: premiumKES - subsidyKES }
}

export function payoutAmount(
  sumInsuredKES: number,
  triggerYieldPct: number,
  actualYieldPct: number,
): number {
  if (actualYieldPct >= triggerYieldPct) return 0
  const share = (triggerYieldPct - Math.max(0, actualYieldPct)) / triggerYieldPct
  return roundTo10(sumInsuredKES * share)
}

export function coverageWindow(season: Season, today: Date = new Date()) {
  const { startMonth, endMonth } = SEASON_WINDOWS[season]
  const year =
    today.getUTCMonth() > endMonth ? today.getUTCFullYear() + 1 : today.getUTCFullYear()
  return {
    start: new Date(Date.UTC(year, startMonth, 1)).toISOString(),
    end: new Date(Date.UTC(year, endMonth + 1, 0)).toISOString(),
  }
}

export function buildQuote(farm: Farm, planId: PlanId, today: Date = new Date()): Quote {
  const plan = PLANS[planId]
  const si = sumInsured(farm.crop, farm.areaHa, planId)
  const window = coverageWindow(farm.season, today)
  return {
    farmId: farm.id,
    planId,
    sumInsuredKES: si,
    ...premiumBreakdown(si, farm.riskLevel),
    triggerYieldPct: plan.triggerYieldPct,
    coverageStart: window.start,
    coverageEnd: window.end,
    exampleAt50PctKES: payoutAmount(si, plan.triggerYieldPct, 50),
  }
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/utils/insurance`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
npm run format
git add src/utils/insurance.ts src/utils/insurance.test.ts
git commit -m "feat: add AYII pricing and payout rules"
```

---

### Task 6: Monitoring classification and yield analysis

**Files:**
- Create: `src/utils/monitor.ts`, `src/utils/yield.ts`
- Modify: `src/i18n/en.ts` (append keys)
- Test: `src/utils/monitor.test.ts`, `src/utils/yield.test.ts`

**Interfaces:**
- Consumes: `CROPS`, `HEAT_STRESS_C` (Task 2); `MonitorSeries`, `Crop`, `Status`, `YieldData`, `YieldAnalysisResult`, `RiskLevel` (Task 2); `StringKey` (Task 2).
- Produces: type `Classification = { label: StringKey; status: Status }`, `classifySpi(spi: number): Classification`, `classifyNdvi(ndvi: number, crop: Crop): Classification`, `last(values: number[]): number`, `healthScore(series: MonitorSeries, crop: Crop): number` (0–100 integer), `healthStatus(score: number): Status`, `heatStressWeeks(series: MonitorSeries): number[]` (indexes), `rainfallDeficitPct(series: MonitorSeries, lastN?: number): number` (positive = drier than normal), `analyzeYield(history: YieldData[], triggerPct?: number): YieldAnalysisResult`, `riskFromBadYears(count: number): RiskLevel`.

- [ ] **Step 1: Append i18n keys** inside the `en` object in `src/i18n/en.ts`:

```ts
  'spi.extremeDrought': 'Extreme drought',
  'spi.severeDrought': 'Severe drought',
  'spi.moderateDrought': 'Moderate drought',
  'spi.normal': 'Near normal',
  'spi.moderatelyWet': 'Moderately wet',
  'spi.veryWet': 'Very wet',
  'spi.extremelyWet': 'Extremely wet',
  'ndvi.healthy': 'Healthy',
  'ndvi.stressed': 'Stressed',
  'ndvi.poor': 'Poor',
```

- [ ] **Step 2: Write the failing tests**

`src/utils/monitor.test.ts`:

```ts
import type { MonitorSeries } from '@/src/types'
import {
  classifyNdvi,
  classifySpi,
  healthScore,
  healthStatus,
  heatStressWeeks,
  last,
  rainfallDeficitPct,
} from '@/src/utils/monitor'

function series(over: Partial<MonitorSeries> = {}): MonitorSeries {
  const n = 4
  return {
    weeks: Array.from({ length: n }, (_, i) => `2026-0${i + 1}-01`),
    ndvi: Array(n).fill(0.7),
    rainfallMm: Array(n).fill(20),
    rainfallNormalMm: Array(n).fill(20),
    spi: Array(n).fill(0.2),
    tempMinC: Array(n).fill(14),
    tempMaxC: Array(n).fill(28),
    ...over,
  }
}

test.each([
  [-2.4, 'spi.extremeDrought', 'danger'],
  [-1.6, 'spi.severeDrought', 'danger'],
  [-1.2, 'spi.moderateDrought', 'warning'],
  [0, 'spi.normal', 'good'],
  [1.2, 'spi.moderatelyWet', 'good'],
  [1.7, 'spi.veryWet', 'good'],
  [2.3, 'spi.extremelyWet', 'warning'],
])('SPI %s is %s', (spi, label, status) => {
  expect(classifySpi(spi)).toEqual({ label, status })
})

test('NDVI classification uses the crop healthy range', () => {
  expect(classifyNdvi(0.5, 'maize')).toEqual({ label: 'ndvi.healthy', status: 'good' })
  expect(classifyNdvi(0.35, 'maize')).toEqual({ label: 'ndvi.stressed', status: 'warning' })
  expect(classifyNdvi(0.2, 'maize')).toEqual({ label: 'ndvi.poor', status: 'danger' })
})

test('last returns the final value or 0', () => {
  expect(last([1, 2, 3])).toBe(3)
  expect(last([])).toBe(0)
})

test('health score is 100 for a healthy farm and 0 for a failing one', () => {
  expect(healthScore(series(), 'maize')).toBe(100)
  expect(
    healthScore(
      series({ ndvi: Array(4).fill(0.15), spi: Array(4).fill(-2.5), tempMaxC: Array(4).fill(35) }),
      'maize',
    ),
  ).toBe(0)
})

test('health score drops with drought', () => {
  const s = healthScore(series({ spi: [0, 0, -1, -1] }), 'maize')
  expect(s).toBe(85)
})

test('health status bands', () => {
  expect(healthStatus(70)).toBe('good')
  expect(healthStatus(69)).toBe('warning')
  expect(healthStatus(45)).toBe('warning')
  expect(healthStatus(44)).toBe('danger')
})

test('heat stress weeks are those above 32 C', () => {
  expect(heatStressWeeks(series({ tempMaxC: [30, 33, 32, 34] }))).toEqual([1, 3])
})

test('rainfall deficit compares the last weeks with normal', () => {
  expect(rainfallDeficitPct(series({ rainfallMm: [20, 20, 10, 10] }), 2)).toBe(50)
  expect(rainfallDeficitPct(series({ rainfallMm: [20, 20, 30, 30] }), 2)).toBe(-50)
})
```

`src/utils/yield.test.ts`:

```ts
import { analyzeYield, riskFromBadYears } from '@/src/utils/yield'

const history = [2.5, 2.4, 1.2, 2.6, 2.5, 1.5, 2.7, 2.4, 2.6, 2.5].map((y, i) => ({
  year: 2016 + i,
  yieldTPerHa: y,
  rainfallMm: 600,
}))

test('finds years below 70% of the average', () => {
  const r = analyzeYield(history)
  expect(r.averageYield).toBeCloseTo(2.29, 2)
  expect(r.belowTriggerYears).toEqual([2018, 2021])
  expect(r.riskLevel).toBe('medium')
})

test('risk bands by number of bad years', () => {
  expect(riskFromBadYears(0)).toBe('low')
  expect(riskFromBadYears(1)).toBe('low')
  expect(riskFromBadYears(3)).toBe('medium')
  expect(riskFromBadYears(4)).toBe('high')
})

test('empty history is low risk', () => {
  expect(analyzeYield([])).toEqual({
    history: [],
    averageYield: 0,
    belowTriggerYears: [],
    riskLevel: 'low',
  })
})
```

Run: `npm test -- src/utils/monitor src/utils/yield`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/utils/monitor.ts`**

```ts
import { CROPS, HEAT_STRESS_C } from '@/src/data/cropConfig'
import type { StringKey } from '@/src/i18n'
import type { Crop, MonitorSeries, Status } from '@/src/types'

export interface Classification {
  label: StringKey
  status: Status
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function last(values: number[]): number {
  return values.length ? values[values.length - 1] : 0
}

export function classifySpi(spi: number): Classification {
  if (spi <= -2) return { label: 'spi.extremeDrought', status: 'danger' }
  if (spi <= -1.5) return { label: 'spi.severeDrought', status: 'danger' }
  if (spi <= -1) return { label: 'spi.moderateDrought', status: 'warning' }
  if (spi < 1) return { label: 'spi.normal', status: 'good' }
  if (spi < 1.5) return { label: 'spi.moderatelyWet', status: 'good' }
  if (spi < 2) return { label: 'spi.veryWet', status: 'good' }
  return { label: 'spi.extremelyWet', status: 'warning' }
}

export function classifyNdvi(ndvi: number, crop: Crop): Classification {
  const low = CROPS[crop].ndviHealthy[0]
  if (ndvi >= low) return { label: 'ndvi.healthy', status: 'good' }
  if (ndvi >= low - 0.15) return { label: 'ndvi.stressed', status: 'warning' }
  return { label: 'ndvi.poor', status: 'danger' }
}

export function heatStressWeeks(series: MonitorSeries): number[] {
  return series.tempMaxC.flatMap((t, i) => (t > HEAT_STRESS_C ? [i] : []))
}

/**
 * 50% crop greenness, 30% drought index, 20% heat stress in the last 4 weeks.
 */
export function healthScore(series: MonitorSeries, crop: Crop): number {
  const low = CROPS[crop].ndviHealthy[0]
  const ndviScore = clamp01((last(series.ndvi) - (low - 0.25)) / 0.25)
  const spiScore = clamp01((last(series.spi) + 2) / 2)
  const recentMax = series.tempMaxC.slice(-4)
  const hotWeeks = recentMax.filter((t) => t > HEAT_STRESS_C).length
  const heatScore = recentMax.length ? 1 - hotWeeks / recentMax.length : 1
  return Math.round(100 * (0.5 * ndviScore + 0.3 * spiScore + 0.2 * heatScore))
}

export function healthStatus(score: number): Status {
  if (score >= 70) return 'good'
  if (score >= 45) return 'warning'
  return 'danger'
}

export function rainfallDeficitPct(series: MonitorSeries, lastN = 4): number {
  const actual = series.rainfallMm.slice(-lastN).reduce((s, n) => s + n, 0)
  const normal = series.rainfallNormalMm.slice(-lastN).reduce((s, n) => s + n, 0)
  if (normal === 0) return 0
  return Math.round(((normal - actual) / normal) * 100)
}
```

Check of the drought test: last SPI −1 → spiScore 0.5 → 100 × (0.5 + 0.15 + 0.2) = 85. ✓

- [ ] **Step 4: Implement `src/utils/yield.ts`**

```ts
import type { RiskLevel, YieldAnalysisResult, YieldData } from '@/src/types'

export function riskFromBadYears(count: number): RiskLevel {
  if (count <= 1) return 'low'
  if (count <= 3) return 'medium'
  return 'high'
}

export function analyzeYield(history: YieldData[], triggerPct = 70): YieldAnalysisResult {
  if (history.length === 0) {
    return { history, averageYield: 0, belowTriggerYears: [], riskLevel: 'low' }
  }
  const average = history.reduce((s, y) => s + y.yieldTPerHa, 0) / history.length
  const threshold = (average * triggerPct) / 100
  const belowTriggerYears = history.filter((y) => y.yieldTPerHa < threshold).map((y) => y.year)
  return {
    history,
    averageYield: Math.round(average * 100) / 100,
    belowTriggerYears,
    riskLevel: riskFromBadYears(belowTriggerYears.length),
  }
}
```

Check: average = 22.9 / 10 = 2.29; threshold 1.603 → 2018 (1.2) and 2021 (1.5). ✓

- [ ] **Step 5: Run tests**

Run: `npm test -- src/utils`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/utils src/i18n/en.ts
git commit -m "feat: add crop health classification and yield analysis"
```

---
### Task 7: Deterministic generators and seed data

**Files:**
- Create: `src/data/generators.ts`, `src/data/mockData.ts`
- Test: `src/data/generators.test.ts`, `src/data/mockData.test.ts`

**Interfaces:**
- Consumes: `CROPS` (Task 2), `squareAround`, `polygonAreaHa` (Task 4), `sumInsured`, `premiumBreakdown`, `payoutAmount` (Task 5), `healthScore`, `analyzeYield` (Task 6).
- Produces:
  - `mulberry32(seed: number): () => number`, `hashString(s: string): number`
  - type `Scenario = 'healthy' | 'drought' | 'normal'`
  - `generateSeries(opts: { seed: number; crop: Crop; scenario: Scenario; weeks?: number; endDate?: Date }): MonitorSeries` (16 weeks by default)
  - `generateYieldHistory(seed: number, crop: Crop, badYearIndexes: number[], startYear?: number, years?: number): YieldData[]`
  - `SEED_PHONE = '+254712345678'`, `MOCK_OTP = '123456'`, `SEED_SCENARIOS: Record<string, Scenario>`, `YIELD_HISTORIES: Record<string, YieldData[]>` keyed `"County:crop"`, type `SeedData = { farmer: Farmer; farms: Farm[]; policies: Policy[]; payouts: Payout[] }`, `buildSeedData(): SeedData`.
  - Seed ids: farms `farm-maize`, `farm-beans`, `farm-tea`; policies `policy-maize`, `policy-beans`; payout `payout-beans`.

- [ ] **Step 1: Write the failing tests**

`src/data/generators.test.ts`:

```ts
import { generateSeries, generateYieldHistory, hashString, mulberry32 } from '@/src/data/generators'
import { healthScore, last } from '@/src/utils/monitor'
import { analyzeYield } from '@/src/utils/yield'

const END = new Date('2026-10-22T00:00:00.000Z')

test('PRNG and hash are deterministic', () => {
  expect(mulberry32(7)()).toBe(mulberry32(7)())
  expect(hashString('farm-1')).toBe(hashString('farm-1'))
  expect(hashString('farm-1')).not.toBe(hashString('farm-2'))
})

test('series has 16 aligned weekly points ending on or before endDate', () => {
  const s = generateSeries({ seed: 1, crop: 'maize', scenario: 'healthy', endDate: END })
  for (const key of ['weeks', 'ndvi', 'rainfallMm', 'rainfallNormalMm', 'spi', 'tempMinC', 'tempMaxC'] as const) {
    expect(s[key]).toHaveLength(16)
  }
  expect(new Date(s.weeks[15]).getTime()).toBeLessThanOrEqual(END.getTime())
  expect(new Date(s.weeks[15]).getUTCDay()).toBe(1)
})

test('same seed gives the same series', () => {
  const a = generateSeries({ seed: 5, crop: 'beans', scenario: 'normal', endDate: END })
  const b = generateSeries({ seed: 5, crop: 'beans', scenario: 'normal', endDate: END })
  expect(a).toEqual(b)
})

test('scenarios tell different stories', () => {
  const healthy = generateSeries({ seed: 3, crop: 'maize', scenario: 'healthy', endDate: END })
  const drought = generateSeries({ seed: 3, crop: 'beans', scenario: 'drought', endDate: END })
  expect(healthScore(healthy, 'maize')).toBeGreaterThanOrEqual(80)
  expect(healthScore(drought, 'beans')).toBeLessThan(45)
  expect(last(drought.spi)).toBeLessThanOrEqual(-1.5)
})

test('yield history marks the requested bad years', () => {
  const h = generateYieldHistory(9, 'beans', [1, 4, 6, 8])
  expect(h.map((y) => y.year)).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025])
  expect(analyzeYield(h).belowTriggerYears).toEqual([2017, 2020, 2022, 2024])
})
```

`src/data/mockData.test.ts`:

```ts
import { buildSeedData, SEED_PHONE } from '@/src/data/mockData'

test('seed farmer has three farms telling different stories', () => {
  const d = buildSeedData()
  expect(d.farmer.phone).toBe(SEED_PHONE)
  const byId = Object.fromEntries(d.farms.map((f) => [f.id, f]))
  expect(byId['farm-maize'].areaHa).toBe(1.2)
  expect(byId['farm-maize'].riskLevel).toBe('low')
  expect(byId['farm-maize'].healthScore).toBeGreaterThanOrEqual(80)
  expect(byId['farm-beans'].riskLevel).toBe('high')
  expect(byId['farm-beans'].healthScore).toBeLessThan(45)
  expect(byId['farm-tea'].riskLevel).toBe('medium')
})

test('maize and beans are insured, tea is not', () => {
  const d = buildSeedData()
  expect(d.policies.map((p) => p.farmId).sort()).toEqual(['farm-beans', 'farm-maize'])
  const maize = d.policies.find((p) => p.id === 'policy-maize')!
  expect(maize.sumInsuredKES).toBe(100800)
  expect(maize.premiumKES).toBe(5040)
  expect(maize.status).toBe('active')
})

test('beans payout is approved and unread', () => {
  const [p] = buildSeedData().payouts
  expect(p).toMatchObject({ id: 'payout-beans', amountKES: 10800, stage: 'approved', read: false })
})
```

Run: `npm test -- src/data`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement `src/data/generators.ts`**

```ts
import { CROPS } from '@/src/data/cropConfig'
import type { Crop, MonitorSeries, YieldData } from '@/src/types'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type Scenario = 'healthy' | 'drought' | 'normal'

const r2 = (n: number) => Math.round(n * 100) / 100
const r1 = (n: number) => Math.round(n * 10) / 10

function mondayOnOrBefore(d: Date): Date {
  const day = d.getUTCDay()
  const diff = (day + 6) % 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff))
}

export function generateSeries(opts: {
  seed: number
  crop: Crop
  scenario: Scenario
  weeks?: number
  endDate?: Date
}): MonitorSeries {
  const { seed, crop, scenario, weeks: n = 16, endDate = new Date() } = opts
  const rand = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + (hi - lo) * rand()
  const lastMonday = mondayOnOrBefore(endDate)
  const out: MonitorSeries = {
    weeks: [],
    ndvi: [],
    rainfallMm: [],
    rainfallNormalMm: [],
    spi: [],
    tempMinC: [],
    tempMaxC: [],
  }
  const peak = scenario === 'healthy' ? 0.75 : scenario === 'normal' ? 0.66 : 0.6
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1)
    const week = new Date(lastMonday.getTime() - (n - 1 - i) * 7 * 86400000)
    out.weeks.push(week.toISOString())

    // Greenness: annual crops grow then plateau; tea stays green all year.
    let ndvi =
      crop === 'tea' ? 0.68 : 0.25 + (peak - 0.25) * Math.sin((Math.min(1, t * 1.3) * Math.PI) / 2)
    if (scenario === 'drought' && i >= n - 6) ndvi -= (i - (n - 7)) * 0.05
    out.ndvi.push(r2(ndvi + between(-0.02, 0.02)))

    const normal = 10 + 30 * Math.sin(Math.PI * t)
    out.rainfallNormalMm.push(r1(normal))
    const rainFactor =
      scenario === 'healthy'
        ? between(0.9, 1.2)
        : scenario === 'normal'
          ? between(0.8, 1.15)
          : i < n - 8
            ? between(0.8, 1)
            : between(0.1, 0.4)
    out.rainfallMm.push(r1(normal * rainFactor))

    const spi =
      scenario === 'healthy'
        ? between(0.2, 0.8)
        : scenario === 'normal'
          ? between(-0.4, 0.4)
          : i < n - 8
            ? between(-0.3, 0.3)
            : -(i - (n - 9)) * 0.21
    out.spi.push(r2(spi))

    out.tempMinC.push(r1(between(12, 15)))
    const max =
      scenario === 'healthy'
        ? between(25, 29)
        : scenario === 'normal'
          ? between(26, 30)
          : i >= n - 6
            ? 30 + (i - (n - 7)) * 0.8
            : between(27, 30)
    out.tempMaxC.push(r1(max))
  }
  return out
}

export function generateYieldHistory(
  seed: number,
  crop: Crop,
  badYearIndexes: number[],
  startYear = 2016,
  years = 10,
): YieldData[] {
  const rand = mulberry32(seed)
  const between = (lo: number, hi: number) => lo + (hi - lo) * rand()
  const expected = CROPS[crop].expectedYieldTPerHa
  return Array.from({ length: years }, (_, i) => {
    const bad = badYearIndexes.includes(i)
    return {
      year: startYear + i,
      yieldTPerHa: r2(expected * (bad ? between(0.35, 0.45) : between(0.9, 1.1))),
      rainfallMm: Math.round(bad ? between(300, 420) : between(650, 850)),
    }
  })
}
```

- [ ] **Step 3: Implement `src/data/mockData.ts`**

```ts
import { generateSeries, generateYieldHistory, hashString, type Scenario } from '@/src/data/generators'
import type { Crop, Farm, Farmer, LatLng, Payout, Policy, Season } from '@/src/types'
import { polygonAreaHa, squareAround } from '@/src/utils/geo'
import { payoutAmount, premiumBreakdown, sumInsured } from '@/src/utils/insurance'
import { healthScore } from '@/src/utils/monitor'
import { analyzeYield } from '@/src/utils/yield'

export const SEED_PHONE = '+254712345678'
export const MOCK_OTP = '123456'

export const SEED_SCENARIOS: Record<string, Scenario> = {
  'farm-maize': 'healthy',
  'farm-beans': 'drought',
  'farm-tea': 'normal',
}

export const YIELD_HISTORIES: Record<string, ReturnType<typeof generateYieldHistory>> = {
  'Nakuru:maize': generateYieldHistory(11, 'maize', [3]),
  'Machakos:beans': generateYieldHistory(22, 'beans', [1, 4, 6, 8]),
  'Kericho:tea': generateYieldHistory(33, 'tea', [2, 7]),
}

export interface SeedData {
  farmer: Farmer
  farms: Farm[]
  policies: Policy[]
  payouts: Payout[]
}

function seedFarm(
  id: string,
  name: string,
  crop: Crop,
  season: Season,
  county: string,
  center: LatLng,
  areaHa: number,
  plantingDate: string,
): Farm {
  const boundary = squareAround(center, areaHa)
  const series = generateSeries({ seed: hashString(id), crop, scenario: SEED_SCENARIOS[id] })
  return {
    id,
    name,
    crop,
    season,
    plantingDate,
    boundary,
    areaHa: Number(polygonAreaHa(boundary).toFixed(2)),
    county,
    riskLevel: analyzeYield(YIELD_HISTORIES[`${county}:${crop}`]).riskLevel,
    healthScore: healthScore(series, crop),
  }
}

export function buildSeedData(): SeedData {
  const farmer: Farmer = {
    id: 'farmer-1',
    name: 'Wanjiru Kamau',
    phone: SEED_PHONE,
    county: 'Nakuru',
    nationalId: '28765431',
    primaryCrop: 'maize',
  }

  const maize = seedFarm('farm-maize', 'Lower Shamba', 'maize', 'short_rains', 'Nakuru', [-0.2755, 36.0638], 1.2, '2026-10-06T00:00:00.000Z')
  const beans = seedFarm('farm-beans', 'Machakos Plot', 'beans', 'long_rains', 'Machakos', [-1.5091, 37.2712], 0.8, '2026-03-16T00:00:00.000Z')
  const tea = seedFarm('farm-tea', 'Tea Garden', 'tea', 'long_rains', 'Kericho', [-0.3598, 35.2981], 2, '2019-04-01T00:00:00.000Z')

  const maizeSI = sumInsured('maize', maize.areaHa, 'standard')
  const beansSI = sumInsured('beans', beans.areaHa, 'basic')

  const policies: Policy[] = [
    {
      id: 'policy-maize',
      policyNumber: 'AGR-2026-004417',
      farmId: maize.id,
      planId: 'standard',
      sumInsuredKES: maizeSI,
      ...premiumBreakdown(maizeSI, maize.riskLevel),
      triggerYieldPct: 70,
      coverageStart: '2026-10-01T00:00:00.000Z',
      coverageEnd: '2026-12-31T00:00:00.000Z',
      status: 'active',
      mpesaReceipt: 'SJK4H7Q2TZ',
    },
    {
      id: 'policy-beans',
      policyNumber: 'AGR-2026-001982',
      farmId: beans.id,
      planId: 'basic',
      sumInsuredKES: beansSI,
      ...premiumBreakdown(beansSI, beans.riskLevel),
      triggerYieldPct: 60,
      coverageStart: '2026-03-01T00:00:00.000Z',
      coverageEnd: '2026-07-31T00:00:00.000Z',
      status: 'claimed',
      mpesaReceipt: 'SC81LM3XQA',
    },
  ]

  const payouts: Payout[] = [
    {
      id: 'payout-beans',
      policyId: 'policy-beans',
      farmId: beans.id,
      expectedYield: 1.2,
      actualYield: 0.54,
      shortfallPct: 55,
      amountKES: payoutAmount(beansSI, 60, 45),
      stage: 'approved',
      stageDates: {
        triggered: '2026-09-02T00:00:00.000Z',
        assessed: '2026-09-16T00:00:00.000Z',
        approved: '2026-10-14T00:00:00.000Z',
      },
      read: false,
    },
  ]

  return { farmer, farms: [maize, beans, tea], policies, payouts }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/data`
Expected: PASS. If `healthScore(beans) < 45` or the bad-year assertion fails, do not change thresholds in `src/utils`; adjust only the generator constants in `generateSeries` / `generateYieldHistory` (the drought NDVI drop of `0.05`/week and bad-year factor `0.35–0.45`) and re-run.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/data
git commit -m "feat: add deterministic mock data for seeded farmer"
```

---

### Task 8: App state — reducer, persistence, provider and hooks

**Files:**
- Create: `src/context/reducer.ts`, `src/context/persistence.ts`, `src/context/AppContext.tsx`, `src/test/renderWithApp.tsx`
- Test: `src/context/reducer.test.ts`, `src/context/persistence.test.ts`, `src/context/AppContext.test.tsx`

**Interfaces:**
- Consumes: types (Task 2), `buildSeedData` (Task 7, test helper only).
- Produces:
  - `emptyFarmForm: FarmFormData`, `initialState: AppState`
  - type `Action` = `{ type: 'LOGIN'; phone: string; isNewUser: boolean; data?: SeedData }` | `{ type: 'COMPLETE_REGISTRATION'; farmer: Farmer }` | `{ type: 'LOGOUT' }` | `{ type: 'ADD_FARM'; farm: Farm }` | `{ type: 'UPDATE_FARM'; farm: Farm }` | `{ type: 'ADD_POLICY'; policy: Policy }` | `{ type: 'MARK_PAYOUT_READ'; payoutId: string }` | `{ type: 'START_FARM_FORM'; farm?: Farm }` | `{ type: 'UPDATE_FARM_FORM'; patch: Partial<FarmFormData> }` | `{ type: 'RESET_FARM_FORM' }`
  - `appReducer(state: AppState, action: Action): AppState`
  - `AUTH_KEY = 'agrails_auth'`, `STATE_KEY = 'agrails_state'`, `loadState(): AppState`, `saveState(state: AppState): void`
  - `AppProvider({ children, initialState? })`, hooks `useApp()`, `useAuth()`, `useFarmer()`, `useFarms()`, `useFarm(id?: string): Farm | undefined`, `usePolicies()`, `usePolicyForFarm(farmId?: string): Policy | undefined` (active first, else most recent), `usePayouts()`, `useFarmForm(): { form: FarmFormData; update(patch: Partial<FarmFormData>): void; start(farm?: Farm): void; reset(): void }`
  - Test helpers: `renderWithApp(ui, { route?, path?, state? })` returning RTL result + `user` (userEvent); `seededState(): AppState`; element `data-testid="location"` renders the current `pathname + search` for any route not matching `path`.

- [ ] **Step 1: Write the failing reducer tests `src/context/reducer.test.ts`**

```ts
import { appReducer, emptyFarmForm, initialState } from '@/src/context/reducer'
import { buildSeedData } from '@/src/data/mockData'

const seed = buildSeedData()

test('LOGIN as a new user clears data and flags registration', () => {
  const s = appReducer(initialState, { type: 'LOGIN', phone: '+254700000001', isNewUser: true })
  expect(s.auth).toEqual({ isAuthenticated: true, phone: '+254700000001', isNewUser: true })
  expect(s.farmer).toBeNull()
  expect(s.farms).toEqual([])
})

test('LOGIN as a returning user loads their data', () => {
  const s = appReducer(initialState, { type: 'LOGIN', phone: seed.farmer.phone, isNewUser: false, data: seed })
  expect(s.farmer?.name).toBe('Wanjiru Kamau')
  expect(s.farms).toHaveLength(3)
  expect(s.payouts).toHaveLength(1)
})

test('COMPLETE_REGISTRATION stores the farmer and clears the new-user flag', () => {
  const s1 = appReducer(initialState, { type: 'LOGIN', phone: '+254700000001', isNewUser: true })
  const s2 = appReducer(s1, { type: 'COMPLETE_REGISTRATION', farmer: { ...seed.farmer, id: 'x' } })
  expect(s2.farmer?.id).toBe('x')
  expect(s2.auth.isNewUser).toBe(false)
})

test('ADD_FARM, UPDATE_FARM', () => {
  const s1 = appReducer(initialState, { type: 'ADD_FARM', farm: seed.farms[0] })
  expect(s1.farms).toHaveLength(1)
  const s2 = appReducer(s1, { type: 'UPDATE_FARM', farm: { ...seed.farms[0], name: 'Renamed' } })
  expect(s2.farms[0].name).toBe('Renamed')
})

test('ADD_POLICY ignores a duplicate id (double tap)', () => {
  const p = seed.policies[0]
  const s = appReducer(appReducer(initialState, { type: 'ADD_POLICY', policy: p }), { type: 'ADD_POLICY', policy: p })
  expect(s.policies).toHaveLength(1)
})

test('MARK_PAYOUT_READ', () => {
  const s = appReducer({ ...initialState, payouts: seed.payouts }, { type: 'MARK_PAYOUT_READ', payoutId: 'payout-beans' })
  expect(s.payouts[0].read).toBe(true)
})

test('farm form start, update, reset', () => {
  const editing = appReducer(initialState, { type: 'START_FARM_FORM', farm: seed.farms[0] })
  expect(editing.farmForm).toMatchObject({ editingFarmId: 'farm-maize', name: 'Lower Shamba', crop: 'maize' })
  const fresh = appReducer(editing, { type: 'START_FARM_FORM' })
  expect(fresh.farmForm).toEqual(emptyFarmForm)
  const updated = appReducer(fresh, { type: 'UPDATE_FARM_FORM', patch: { name: 'New' } })
  expect(updated.farmForm.name).toBe('New')
  expect(appReducer(updated, { type: 'RESET_FARM_FORM' }).farmForm).toEqual(emptyFarmForm)
})

test('LOGOUT returns to the initial state', () => {
  const s = appReducer(initialState, { type: 'LOGIN', phone: seed.farmer.phone, isNewUser: false, data: seed })
  expect(appReducer(s, { type: 'LOGOUT' })).toEqual(initialState)
})
```

Run: `npm test -- src/context`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `src/context/reducer.ts`**

```ts
import type { SeedData } from '@/src/data/mockData'
import type { AppState, AuthState, Farm, Farmer, FarmFormData, Policy } from '@/src/types'

export const emptyFarmForm: FarmFormData = {
  editingFarmId: null,
  name: '',
  crop: null,
  season: null,
  plantingDate: '',
  method: null,
  boundary: [],
}

const loggedOut: AuthState = { isAuthenticated: false, phone: null, isNewUser: false }

export const initialState: AppState = {
  auth: loggedOut,
  farmer: null,
  farms: [],
  policies: [],
  payouts: [],
  farmForm: emptyFarmForm,
}

export type Action =
  | { type: 'LOGIN'; phone: string; isNewUser: boolean; data?: SeedData }
  | { type: 'COMPLETE_REGISTRATION'; farmer: Farmer }
  | { type: 'LOGOUT' }
  | { type: 'ADD_FARM'; farm: Farm }
  | { type: 'UPDATE_FARM'; farm: Farm }
  | { type: 'ADD_POLICY'; policy: Policy }
  | { type: 'MARK_PAYOUT_READ'; payoutId: string }
  | { type: 'START_FARM_FORM'; farm?: Farm }
  | { type: 'UPDATE_FARM_FORM'; patch: Partial<FarmFormData> }
  | { type: 'RESET_FARM_FORM' }

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...initialState,
        auth: { isAuthenticated: true, phone: action.phone, isNewUser: action.isNewUser },
        ...(action.data ?? {}),
      }
    case 'COMPLETE_REGISTRATION':
      return { ...state, farmer: action.farmer, auth: { ...state.auth, isNewUser: false } }
    case 'LOGOUT':
      return initialState
    case 'ADD_FARM':
      return { ...state, farms: [...state.farms, action.farm] }
    case 'UPDATE_FARM':
      return {
        ...state,
        farms: state.farms.map((f) => (f.id === action.farm.id ? action.farm : f)),
      }
    case 'ADD_POLICY':
      if (state.policies.some((p) => p.id === action.policy.id)) return state
      return { ...state, policies: [...state.policies, action.policy] }
    case 'MARK_PAYOUT_READ':
      return {
        ...state,
        payouts: state.payouts.map((p) => (p.id === action.payoutId ? { ...p, read: true } : p)),
      }
    case 'START_FARM_FORM': {
      const f = action.farm
      return {
        ...state,
        farmForm: f
          ? {
              editingFarmId: f.id,
              name: f.name,
              crop: f.crop,
              season: f.season,
              plantingDate: f.plantingDate.slice(0, 10),
              method: null,
              boundary: f.boundary,
            }
          : emptyFarmForm,
      }
    }
    case 'UPDATE_FARM_FORM':
      return { ...state, farmForm: { ...state.farmForm, ...action.patch } }
    case 'RESET_FARM_FORM':
      return { ...state, farmForm: emptyFarmForm }
  }
}
```

- [ ] **Step 3: Run reducer tests**

Run: `npm test -- src/context/reducer`
Expected: PASS.

- [ ] **Step 4: Write the failing persistence tests `src/context/persistence.test.ts`**

```ts
import { initialState } from '@/src/context/reducer'
import { AUTH_KEY, loadState, saveState, STATE_KEY } from '@/src/context/persistence'
import { buildSeedData } from '@/src/data/mockData'

afterEach(() => vi.restoreAllMocks())

test('round-trips state through localStorage', () => {
  const seed = buildSeedData()
  const state = {
    ...initialState,
    auth: { isAuthenticated: true, phone: seed.farmer.phone, isNewUser: false },
    ...seed,
  }
  saveState(state)
  expect(localStorage.getItem(AUTH_KEY)).toContain(seed.farmer.phone)
  expect(loadState()).toEqual(state)
})

test('empty storage gives the initial state', () => {
  expect(loadState()).toEqual(initialState)
})

test('corrupt JSON gives the initial state', () => {
  localStorage.setItem(AUTH_KEY, '{not json')
  localStorage.setItem(STATE_KEY, '[]')
  expect(loadState()).toEqual(initialState)
})

test('wrong shapes are ignored', () => {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ isAuthenticated: true, phone: '+254712345678', isNewUser: false }))
  localStorage.setItem(STATE_KEY, JSON.stringify({ farmer: null, farms: 'oops' }))
  expect(loadState()).toEqual(initialState)
})

test('blocked storage does not throw', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  expect(loadState()).toEqual(initialState)
  expect(() => saveState(initialState)).not.toThrow()
})
```

Run: `npm test -- src/context/persistence`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `src/context/persistence.ts`**

```ts
import { emptyFarmForm, initialState } from '@/src/context/reducer'
import type { AppState, AuthState } from '@/src/types'

export const AUTH_KEY = 'agrails_auth'
export const STATE_KEY = 'agrails_state'

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function isAuth(v: unknown): v is AuthState {
  const a = v as AuthState
  return !!a && typeof a.isAuthenticated === 'boolean' && typeof a.isNewUser === 'boolean'
}

type Stored = Omit<AppState, 'auth'>

function isStored(v: unknown): v is Stored {
  const s = v as Stored
  return (
    !!s &&
    typeof s === 'object' &&
    !Array.isArray(s) &&
    Array.isArray(s.farms) &&
    Array.isArray(s.policies) &&
    Array.isArray(s.payouts)
  )
}

export function loadState(): AppState {
  const auth = read(AUTH_KEY)
  const stored = read(STATE_KEY)
  if (!isAuth(auth) || !auth.isAuthenticated || !isStored(stored)) return initialState
  // A returning user must have a farmer record; otherwise treat as logged out.
  if (!auth.isNewUser && !stored.farmer) return initialState
  return {
    auth,
    farmer: stored.farmer ?? null,
    farms: stored.farms,
    policies: stored.policies,
    payouts: stored.payouts,
    farmForm: { ...emptyFarmForm, ...(stored.farmForm ?? {}) },
  }
}

export function saveState(state: AppState): void {
  try {
    const { auth, ...rest } = state
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
    localStorage.setItem(STATE_KEY, JSON.stringify(rest))
  } catch {
    // Storage blocked or full: the app keeps working in memory.
  }
}
```

- [ ] **Step 6: Write the failing provider tests `src/context/AppContext.test.tsx`**

```tsx
import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppProvider, useApp, useFarm, useFarmForm, usePolicyForFarm } from '@/src/context/AppContext'
import { STATE_KEY } from '@/src/context/persistence'
import { seededState } from '@/src/test/renderWithApp'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider initialState={seededState()}>{children}</AppProvider>
)

test('hooks read slices of state', () => {
  const { result } = renderHook(
    () => ({ farm: useFarm('farm-maize'), policy: usePolicyForFarm('farm-tea') }),
    { wrapper },
  )
  expect(result.current.farm?.name).toBe('Lower Shamba')
  expect(result.current.policy).toBeUndefined()
})

test('usePolicyForFarm prefers the active policy', () => {
  const { result } = renderHook(() => usePolicyForFarm('farm-maize'), { wrapper })
  expect(result.current?.status).toBe('active')
})

test('state changes are persisted', () => {
  const { result } = renderHook(() => ({ app: useApp(), form: useFarmForm() }), { wrapper })
  act(() => result.current.form.update({ name: 'Kitchen garden' }))
  expect(localStorage.getItem(STATE_KEY)).toContain('Kitchen garden')
})

test('useApp outside the provider throws a helpful error', () => {
  const Broken = () => {
    useApp()
    return null
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Broken />)).toThrow(/AppProvider/)
  vi.restoreAllMocks()
})

test('provider renders children', () => {
  render(<AppProvider>hello</AppProvider>)
  expect(screen.getByText('hello')).toBeInTheDocument()
})
```

Run: `npm test -- src/context/AppContext`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `src/context/AppContext.tsx`**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import { loadState, saveState } from '@/src/context/persistence'
import { appReducer, type Action } from '@/src/context/reducer'
import type { AppState, Farm, FarmFormData } from '@/src/types'

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: AppState
}) {
  const [state, dispatch] = useReducer(appReducer, initialState, (s) => s ?? loadState())
  useEffect(() => saveState(state), [state])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

export const useAuth = () => useApp().state.auth
export const useFarmer = () => useApp().state.farmer
export const useFarms = () => useApp().state.farms
export const usePolicies = () => useApp().state.policies
export const usePayouts = () => useApp().state.payouts

export function useFarm(id?: string): Farm | undefined {
  const farms = useFarms()
  return farms.find((f) => f.id === id)
}

export function usePolicyForFarm(farmId?: string) {
  const policies = usePolicies().filter((p) => p.farmId === farmId)
  return policies.find((p) => p.status === 'active') ?? policies[policies.length - 1]
}

export function useFarmForm() {
  const { state, dispatch } = useApp()
  const update = useCallback(
    (patch: Partial<FarmFormData>) => dispatch({ type: 'UPDATE_FARM_FORM', patch }),
    [dispatch],
  )
  const start = useCallback((farm?: Farm) => dispatch({ type: 'START_FARM_FORM', farm }), [dispatch])
  const reset = useCallback(() => dispatch({ type: 'RESET_FARM_FORM' }), [dispatch])
  return { form: state.farmForm, update, start, reset }
}
```

- [ ] **Step 8: Create test helper `src/test/renderWithApp.tsx`**

```tsx
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider } from '@/src/context/AppContext'
import { initialState } from '@/src/context/reducer'
import { buildSeedData } from '@/src/data/mockData'
import type { AppState } from '@/src/types'

export function seededState(): AppState {
  const data = buildSeedData()
  return {
    ...initialState,
    auth: { isAuthenticated: true, phone: data.farmer.phone, isNewUser: false },
    ...data,
  }
}

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid='location'>{loc.pathname + loc.search}</div>
}

export function renderWithApp(
  ui: ReactElement,
  {
    route = '/',
    path = '/',
    state,
  }: { route?: string; path?: string; state?: Partial<AppState> } = {},
) {
  const user = userEvent.setup()
  const result = render(
    <AppProvider initialState={{ ...initialState, ...state }}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path='*' element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
  return { user, ...result }
}
```

- [ ] **Step 9: Run tests**

Run: `npm test -- src/context`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
npm run format
git add src/context src/test
git commit -m "feat: add app state reducer, persistence and hooks"
```

---

### Task 9: Mock service layer

**Files:**
- Create: `src/services/config.ts`, `src/services/authService.ts`, `src/services/farmService.ts`, `src/services/policyService.ts`, `src/services/paymentService.ts`, `src/services/monitorService.ts`
- Modify: `src/test/setup.ts` (zero latency in tests)
- Test: `src/services/services.test.ts`

**Interfaces:**
- Consumes: Tasks 2–7.
- Produces:
  - `serviceConfig: { latencyMs: number; paymentMs: number; paymentTimeoutMs: number }` (defaults 600 / 4000 / 60000), `delay(ms: number): Promise<void>`, `newId(prefix: string): string`
  - authService: `sendOtp(phone: string): Promise<{ hint: string }>`, type `VerifyResult = { ok: false } | { ok: true; isNewUser: true } | { ok: true; isNewUser: false; data: SeedData }`, `verifyOtp(phone: string, code: string): Promise<VerifyResult>`, `register(input: { phone: string; name: string; county: string; nationalId: string; primaryCrop: Crop }): Promise<Farmer>`
  - farmService: `getYieldHistory(county: string, crop: Crop): YieldData[]`, `analyzeFarmYield(farm: Pick<Farm, 'county' | 'crop'>): Promise<YieldAnalysisResult>`, `createFarm(form: FarmFormData, county: string): Promise<Farm>` (rejects with `Error('incomplete_form')` if name/crop/season missing or boundary invalid), `updateFarm(farm: Farm, form: FarmFormData): Promise<Farm>`
  - monitorService: `seriesFor(farm: Pick<Farm, 'id' | 'crop'>): MonitorSeries` (sync), `getSeries(farm: Pick<Farm, 'id' | 'crop'>): Promise<MonitorSeries>`, `getWeather(county: string): Weather` (sync)
  - policyService: `getQuote(farm: Farm, planId: PlanId): Promise<Quote>`, `createPolicy(quote: Quote, mpesaReceipt: string): Promise<Policy>`
  - paymentService: type `PaymentResult = { status: 'success'; receipt: string } | { status: 'failed' } | { status: 'timeout' }`, `requestMpesaPayment(phone: string, amountKES: number): Promise<PaymentResult>`

- [ ] **Step 1: Zero latency in tests** — add to `src/test/setup.ts` after the existing imports:

```ts
import { serviceConfig } from '@/src/services/config'

serviceConfig.latencyMs = 0
serviceConfig.paymentMs = 0
serviceConfig.paymentTimeoutMs = 0
```

- [ ] **Step 2: Write the failing tests `src/services/services.test.ts`**

```ts
import { emptyFarmForm } from '@/src/context/reducer'
import { buildSeedData, MOCK_OTP, SEED_PHONE } from '@/src/data/mockData'
import { register, sendOtp, verifyOtp } from '@/src/services/authService'
import { analyzeFarmYield, createFarm, getYieldHistory, updateFarm } from '@/src/services/farmService'
import { getWeather, seriesFor } from '@/src/services/monitorService'
import { requestMpesaPayment } from '@/src/services/paymentService'
import { createPolicy, getQuote } from '@/src/services/policyService'
import { countyCenter } from '@/src/data/cropConfig'
import { squareAround } from '@/src/utils/geo'

test('OTP: hint is the mock code; wrong code fails', async () => {
  expect((await sendOtp(SEED_PHONE)).hint).toBe(MOCK_OTP)
  expect(await verifyOtp(SEED_PHONE, '000000')).toEqual({ ok: false })
})

test('OTP: seeded phone is a returning user with data', async () => {
  const r = await verifyOtp(SEED_PHONE, MOCK_OTP)
  expect(r.ok && !r.isNewUser && r.data.farms.length).toBe(3)
})

test('OTP: any other phone is a new user', async () => {
  expect(await verifyOtp('+254700000001', MOCK_OTP)).toEqual({ ok: true, isNewUser: true })
})

test('register trims input and returns a farmer', async () => {
  const f = await register({
    phone: '+254700000001',
    name: '  Otieno Ouma ',
    county: 'Kisumu',
    nationalId: ' 1234567 ',
    primaryCrop: 'maize',
  })
  expect(f).toMatchObject({ name: 'Otieno Ouma', nationalId: '1234567', county: 'Kisumu' })
  expect(f.id).toMatch(/^farmer-/)
})

test('yield history exists for unknown county/crop and is stable', async () => {
  expect(getYieldHistory('Bomet', 'beans')).toEqual(getYieldHistory('Bomet', 'beans'))
  expect(getYieldHistory('Bomet', 'beans')).toHaveLength(10)
  expect((await analyzeFarmYield({ county: 'Machakos', crop: 'beans' })).riskLevel).toBe('high')
})

test('createFarm builds a complete farm from the form', async () => {
  const farm = await createFarm(
    {
      ...emptyFarmForm,
      name: 'River plot',
      crop: 'beans',
      season: 'short_rains',
      plantingDate: '2026-10-10',
      method: 'map',
      boundary: squareAround(countyCenter('Kisumu'), 0.5),
    },
    'Kisumu',
  )
  expect(farm.id).toMatch(/^farm-/)
  expect(farm.areaHa).toBeCloseTo(0.5, 2)
  expect(farm.healthScore).toBeGreaterThan(0)
  expect(farm.plantingDate).toBe('2026-10-10T00:00:00.000Z')
})

test('createFarm rejects an incomplete form', async () => {
  await expect(createFarm({ ...emptyFarmForm, name: 'x' }, 'Kisumu')).rejects.toThrow('incomplete_form')
})

test('updateFarm applies edited fields but keeps id and boundary', async () => {
  const farm = await createFarm(
    { ...emptyFarmForm, name: 'A', crop: 'maize', season: 'long_rains', plantingDate: '2027-03-01', boundary: squareAround(countyCenter('Meru'), 1) },
    'Meru',
  )
  const updated = await updateFarm(farm, { ...emptyFarmForm, name: 'B', crop: 'beans', season: 'short_rains', plantingDate: '2026-10-05' })
  expect(updated).toMatchObject({ id: farm.id, name: 'B', crop: 'beans', boundary: farm.boundary })
})

test('monitor series and weather are deterministic', () => {
  expect(seriesFor({ id: 'farm-tea', crop: 'tea' })).toEqual(seriesFor({ id: 'farm-tea', crop: 'tea' }))
  const w = getWeather('Nakuru')
  expect(w).toEqual(getWeather('Nakuru'))
  expect(['sunny', 'cloudy', 'rain']).toContain(w.condition)
})

test('quote + policy', async () => {
  const tea = buildSeedData().farms.find((f) => f.id === 'farm-tea')!
  const q = await getQuote(tea, 'standard')
  expect(q.farmerPremiumKES).toBeGreaterThan(0)
  const p = await createPolicy(q, 'SAB12CD34E')
  expect(p).toMatchObject({ farmId: 'farm-tea', planId: 'standard', status: 'active', mpesaReceipt: 'SAB12CD34E' })
  expect(p.policyNumber).toMatch(/^AGR-\d{4}-\d{6}$/)
})

test('M-Pesa outcomes depend on the last digit', async () => {
  const ok = await requestMpesaPayment('+254712345678', 2520)
  expect(ok.status).toBe('success')
  if (ok.status === 'success') expect(ok.receipt).toMatch(/^[A-Z0-9]{10}$/)
  expect(await requestMpesaPayment('+254712345670', 2520)).toEqual({ status: 'failed' })
  expect(await requestMpesaPayment('+254712345679', 2520)).toEqual({ status: 'timeout' })
})
```

Run: `npm test -- src/services`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/services/config.ts`**

```ts
export const serviceConfig = {
  latencyMs: 600,
  paymentMs: 4000,
  paymentTimeoutMs: 60000,
}

export function delay(ms: number): Promise<void> {
  return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms))
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
```

- [ ] **Step 4: Implement `src/services/authService.ts`**

```ts
import { buildSeedData, MOCK_OTP, SEED_PHONE, type SeedData } from '@/src/data/mockData'
import { delay, newId, serviceConfig } from '@/src/services/config'
import type { Crop, Farmer } from '@/src/types'

export async function sendOtp(_phone: string): Promise<{ hint: string }> {
  await delay(serviceConfig.latencyMs)
  return { hint: MOCK_OTP }
}

export type VerifyResult =
  | { ok: false }
  | { ok: true; isNewUser: true }
  | { ok: true; isNewUser: false; data: SeedData }

export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  await delay(serviceConfig.latencyMs)
  if (code !== MOCK_OTP) return { ok: false }
  if (phone === SEED_PHONE) return { ok: true, isNewUser: false, data: buildSeedData() }
  return { ok: true, isNewUser: true }
}

export async function register(input: {
  phone: string
  name: string
  county: string
  nationalId: string
  primaryCrop: Crop
}): Promise<Farmer> {
  await delay(serviceConfig.latencyMs)
  return {
    id: newId('farmer'),
    ...input,
    name: input.name.trim(),
    nationalId: input.nationalId.trim(),
  }
}
```

Note: `_phone` is unused by design; `noUnusedParameters` allows underscore-prefixed names.

- [ ] **Step 5: Implement `src/services/monitorService.ts`**

```ts
import { generateSeries, hashString } from '@/src/data/generators'
import { SEED_SCENARIOS } from '@/src/data/mockData'
import { delay, serviceConfig } from '@/src/services/config'
import type { Farm, MonitorSeries, Weather } from '@/src/types'

export function seriesFor(farm: Pick<Farm, 'id' | 'crop'>): MonitorSeries {
  return generateSeries({
    seed: hashString(farm.id),
    crop: farm.crop,
    scenario: SEED_SCENARIOS[farm.id] ?? 'normal',
  })
}

export async function getSeries(farm: Pick<Farm, 'id' | 'crop'>): Promise<MonitorSeries> {
  await delay(serviceConfig.latencyMs)
  return seriesFor(farm)
}

export function getWeather(county: string): Weather {
  const day = new Date().toISOString().slice(0, 10)
  const h = hashString(`${county}:${day}`)
  const rainChancePct = h % 91
  return {
    tempC: 18 + (h % 13),
    rainChancePct,
    condition: rainChancePct > 60 ? 'rain' : rainChancePct > 30 ? 'cloudy' : 'sunny',
  }
}
```

- [ ] **Step 6: Implement `src/services/farmService.ts`**

```ts
import { generateYieldHistory, hashString } from '@/src/data/generators'
import { YIELD_HISTORIES } from '@/src/data/mockData'
import { delay, newId, serviceConfig } from '@/src/services/config'
import { seriesFor } from '@/src/services/monitorService'
import type { Crop, Farm, FarmFormData, YieldAnalysisResult, YieldData } from '@/src/types'
import { validateBoundary } from '@/src/utils/geo'
import { healthScore } from '@/src/utils/monitor'
import { analyzeYield } from '@/src/utils/yield'

export function getYieldHistory(county: string, crop: Crop): YieldData[] {
  const key = `${county}:${crop}`
  if (YIELD_HISTORIES[key]) return YIELD_HISTORIES[key]
  const h = hashString(key)
  const badYears = [(h >>> 3) % 10, (h >>> 7) % 10].slice(0, h % 3)
  return generateYieldHistory(h, crop, badYears)
}

export async function analyzeFarmYield(
  farm: Pick<Farm, 'county' | 'crop'>,
): Promise<YieldAnalysisResult> {
  await delay(serviceConfig.latencyMs)
  return analyzeYield(getYieldHistory(farm.county, farm.crop))
}

const toIso = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00.000Z`).toISOString()

export async function createFarm(form: FarmFormData, county: string): Promise<Farm> {
  await delay(serviceConfig.latencyMs)
  const check = validateBoundary(form.boundary)
  if (!form.name.trim() || !form.crop || !form.season || !form.plantingDate || !check.ok) {
    throw new Error('incomplete_form')
  }
  const id = newId('farm')
  const crop = form.crop
  return {
    id,
    name: form.name.trim(),
    crop,
    season: form.season,
    plantingDate: toIso(form.plantingDate),
    boundary: form.boundary,
    areaHa: Number(check.areaHa.toFixed(2)),
    county,
    riskLevel: analyzeYield(getYieldHistory(county, crop)).riskLevel,
    healthScore: healthScore(seriesFor({ id, crop }), crop),
  }
}

export async function updateFarm(farm: Farm, form: FarmFormData): Promise<Farm> {
  await delay(serviceConfig.latencyMs)
  const crop = form.crop ?? farm.crop
  return {
    ...farm,
    name: form.name.trim() || farm.name,
    crop,
    season: form.season ?? farm.season,
    plantingDate: form.plantingDate ? toIso(form.plantingDate) : farm.plantingDate,
    riskLevel: analyzeYield(getYieldHistory(farm.county, crop)).riskLevel,
  }
}
```

- [ ] **Step 7: Implement `src/services/policyService.ts`**

```ts
import { delay, newId, serviceConfig } from '@/src/services/config'
import type { Farm, PlanId, Policy, Quote } from '@/src/types'
import { buildQuote } from '@/src/utils/insurance'

export async function getQuote(farm: Farm, planId: PlanId): Promise<Quote> {
  await delay(serviceConfig.latencyMs)
  return buildQuote(farm, planId)
}

export async function createPolicy(quote: Quote, mpesaReceipt: string): Promise<Policy> {
  await delay(serviceConfig.latencyMs)
  const serial = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  return {
    id: newId('policy'),
    policyNumber: `AGR-${new Date().getUTCFullYear()}-${serial}`,
    farmId: quote.farmId,
    planId: quote.planId,
    sumInsuredKES: quote.sumInsuredKES,
    premiumKES: quote.premiumKES,
    subsidyKES: quote.subsidyKES,
    farmerPremiumKES: quote.farmerPremiumKES,
    triggerYieldPct: quote.triggerYieldPct,
    coverageStart: quote.coverageStart,
    coverageEnd: quote.coverageEnd,
    status: 'active',
    mpesaReceipt,
  }
}
```

- [ ] **Step 8: Implement `src/services/paymentService.ts`**

```ts
import { delay, serviceConfig } from '@/src/services/config'

export type PaymentResult =
  | { status: 'success'; receipt: string }
  | { status: 'failed' }
  | { status: 'timeout' }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'

function receiptCode(): string {
  let code = 'S'
  for (let i = 0; i < 9; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return code
}

/**
 * Simulated M-Pesa STK push. Numbers ending in 0 are declined,
 * numbers ending in 9 never answer (timeout), all others succeed.
 */
export async function requestMpesaPayment(
  phone: string,
  _amountKES: number,
): Promise<PaymentResult> {
  const lastDigit = phone.slice(-1)
  if (lastDigit === '9') {
    await delay(serviceConfig.paymentTimeoutMs)
    return { status: 'timeout' }
  }
  await delay(serviceConfig.paymentMs)
  if (lastDigit === '0') return { status: 'failed' }
  return { status: 'success', receipt: receiptCode() }
}
```

- [ ] **Step 9: Run tests**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 10: Commit**

```bash
npm run format
git add src/services src/test/setup.ts
git commit -m "feat: add mock auth, farm, policy, payment and monitor services"
```

---
### Task 10: Chart primitives — scale, Sparkline, Ring, Donut, Gauge

**Files:**
- Create: `src/components/charts/scale.ts`, `src/components/charts/charts.module.css`, `src/components/charts/Sparkline.tsx`, `src/components/charts/Ring.tsx`, `src/components/charts/Donut.tsx`, `src/components/charts/Gauge.tsx`
- Test: `src/components/charts/scale.test.ts`, `src/components/charts/primitives.test.tsx`

**Interfaces:**
- Consumes: `Status` (Task 2).
- Produces:
  - `linearScale(domain: [number, number], range: [number, number]): (v: number) => number`, `niceStep(rough: number): number`, `niceTicks(min: number, max: number, count?: number): number[]`, `extent(values: number[], padPct?: number): [number, number]`, `clamp(v: number, lo: number, hi: number): number`, `polar(cx, cy, r, angleRad): [number, number]` (angle 0 = 12 o'clock, clockwise), `arcPath(cx, cy, r, a0, a1): string`, `svgId(raw: string): string`
  - `<Sparkline values: number[] label: string status?: Status width?: number height?: number />`
  - `<Ring value: number max?: number size?: number stroke?: number status?: Status label: ReactNode sublabel?: ReactNode ariaLabel: string />`
  - type `DonutSegment = { label: string; value: number; color: string }`; `<Donut segments: DonutSegment[] size?: number thickness?: number centerLabel?: ReactNode centerSub?: ReactNode formatValue: (v: number) => string ariaLabel: string />` (renders a legend)
  - type `GaugeBand = { to: number; color: string }`; `<Gauge value min max bands: GaugeBand[] valueLabel: ReactNode caption?: ReactNode minLabel?: string maxLabel?: string ariaLabel: string />`; needle element has `data-testid="gauge-needle"` and `data-angle` (degrees, −90 … 90).
  - Every chart root SVG has `role="img"` and the given `aria-label`; status is exposed as `data-status`.

- [ ] **Step 1: Write the failing tests**

`src/components/charts/scale.test.ts`:

```ts
import { arcPath, clamp, extent, linearScale, niceTicks, polar, svgId } from '@/src/components/charts/scale'

test('linearScale maps domain to range', () => {
  const s = linearScale([0, 10], [100, 0])
  expect(s(0)).toBe(100)
  expect(s(5)).toBe(50)
  expect(linearScale([3, 3], [0, 10])(3)).toBe(0)
})

test('niceTicks uses 1/2/5 steps', () => {
  expect(niceTicks(0, 40)).toEqual([0, 10, 20, 30, 40])
  expect(niceTicks(0.23, 0.78)).toEqual([0.2, 0.4, 0.6, 0.8])
  expect(niceTicks(5, 5)).toEqual([5])
})

test('extent pads and handles flat data', () => {
  expect(extent([0, 10], 0.1)).toEqual([-1, 11])
  expect(extent([4, 4])).toEqual([3, 5])
})

test('clamp', () => {
  expect(clamp(5, 0, 1)).toBe(1)
  expect(clamp(-5, 0, 1)).toBe(0)
})

test('polar measures clockwise from 12 o clock', () => {
  const [x, y] = polar(50, 50, 40, Math.PI / 2)
  expect(x).toBeCloseTo(90)
  expect(y).toBeCloseTo(50)
})

test('arcPath draws a clockwise SVG arc', () => {
  expect(arcPath(50, 50, 40, 0, Math.PI / 2)).toBe('M 50.00 10.00 A 40 40 0 0 1 90.00 50.00')
})

test('svgId strips characters that break url(#id)', () => {
  expect(svgId(':r1:')).toBe('r1')
})
```

`src/components/charts/primitives.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Donut } from '@/src/components/charts/Donut'
import { Gauge } from '@/src/components/charts/Gauge'
import { Ring } from '@/src/components/charts/Ring'
import { Sparkline } from '@/src/components/charts/Sparkline'

test('Sparkline draws one point per value', () => {
  render(<Sparkline values={[0.3, 0.5, 0.6]} status='warning' label='Crop health trend' />)
  const svg = screen.getByRole('img', { name: 'Crop health trend' })
  expect(svg).toHaveAttribute('data-status', 'warning')
  expect(svg.querySelector('polyline')!.getAttribute('points')!.split(' ')).toHaveLength(3)
})

test('Sparkline renders nothing for fewer than 2 values', () => {
  const { container } = render(<Sparkline values={[1]} label='x' />)
  expect(container).toBeEmptyDOMElement()
})

test('Ring shows its label and fills proportionally', () => {
  render(<Ring value={25} label='25' sublabel='score' ariaLabel='Health 25 of 100' />)
  expect(screen.getByRole('img', { name: 'Health 25 of 100' })).toBeInTheDocument()
  expect(screen.getByText('25')).toBeInTheDocument()
  const arc = screen.getByTestId('ring-value')
  const [filled, total] = arc.getAttribute('stroke-dasharray')!.split(' ').map(Number)
  expect(filled / total).toBeCloseTo(0.25, 2)
})

test('Donut draws a segment and legend row per value', () => {
  render(
    <Donut
      ariaLabel='Premium split'
      formatValue={(v) => `KES ${v}`}
      segments={[
        { label: 'Government pays', value: 2520, color: 'var(--rain-400)' },
        { label: 'You pay', value: 2520, color: 'var(--green-700)' },
      ]}
    />,
  )
  expect(screen.getByRole('img', { name: 'Premium split' }).querySelectorAll('[data-segment]')).toHaveLength(2)
  expect(screen.getByText('You pay')).toBeInTheDocument()
  expect(screen.getAllByText('KES 2520')).toHaveLength(2)
})

test('Gauge needle angle follows the value', () => {
  const bands = [
    { to: -1, color: 'red' },
    { to: 1, color: 'green' },
    { to: 3, color: 'blue' },
  ]
  const { rerender } = render(<Gauge value={-3} min={-3} max={3} bands={bands} valueLabel='-3' ariaLabel='SPI' />)
  expect(screen.getByTestId('gauge-needle')).toHaveAttribute('data-angle', '-90')
  rerender(<Gauge value={0} min={-3} max={3} bands={bands} valueLabel='0' ariaLabel='SPI' />)
  expect(screen.getByTestId('gauge-needle')).toHaveAttribute('data-angle', '0')
  rerender(<Gauge value={9} min={-3} max={3} bands={bands} valueLabel='9' ariaLabel='SPI' />)
  expect(screen.getByTestId('gauge-needle')).toHaveAttribute('data-angle', '90')
})
```

Run: `npm test -- src/components/charts`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement `src/components/charts/scale.ts`**

```ts
export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  return (v: number) => r0 + (v - d0) * k
}

export function niceStep(rough: number): number {
  if (rough <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(rough))
  const f = rough / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const step = niceStep((max - min) / count)
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 1000; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks
}

export function extent(values: number[], padPct = 0): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [min - 1, max + 1]
  const pad = (max - min) * padPct
  return [min - pad, max + pad]
}

/** Angle 0 points up (12 o'clock) and grows clockwise. */
export function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)]
}

export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0)
  const [x1, y1] = polar(cx, cy, r, a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

export function svgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '')
}
```

- [ ] **Step 3: Create `src/components/charts/charts.module.css`**

```css
.chart {
  position: relative;
  width: 100%;
}

.svg {
  width: 100%;
  height: auto;
  overflow: visible;
  touch-action: pan-y;
}

.good {
  color: var(--good);
}
.warning {
  color: var(--warning);
}
.danger {
  color: var(--danger);
}

.gridLine {
  stroke: var(--line);
  stroke-width: 1;
}

.axisText {
  fill: var(--ink-3);
  font-size: 12px;
}

.refText {
  fill: var(--ink-2);
  font-size: 12px;
  font-weight: 700;
}

.ring {
  position: relative;
  flex: none;
}
.ringCenter {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.1;
}
.ringLabel {
  font-weight: 800;
  font-size: var(--fs-xl);
}
.ringSub {
  font-size: var(--fs-xs);
  color: var(--ink-3);
}

.donut {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--sp-2);
  flex: 1;
}
.legendRow {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
}
.legendRow strong {
  margin-left: auto;
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  flex: none;
}

.gauge {
  text-align: center;
}
.needle {
  transition: transform 600ms var(--ease);
}
.gaugeValue {
  font-size: var(--fs-2xl);
  font-weight: 800;
  margin-top: calc(-1 * var(--sp-5));
}
.gaugeEnds {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-xs);
  color: var(--ink-3);
  padding: 0 var(--sp-2);
}

.tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  background: var(--ink);
  color: #fff;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: var(--fs-sm);
  white-space: nowrap;
  pointer-events: none;
  display: flex;
  gap: var(--sp-2);
}

.hit {
  fill: transparent;
  cursor: pointer;
}
```

- [ ] **Step 4: Implement `src/components/charts/Sparkline.tsx`**

```tsx
import styles from '@/src/components/charts/charts.module.css'
import { extent, linearScale } from '@/src/components/charts/scale'
import type { Status } from '@/src/types'

interface Props {
  values: number[]
  label: string
  status?: Status
  width?: number
  height?: number
}

export function Sparkline({ values, label, status = 'good', width = 96, height = 32 }: Props) {
  if (values.length < 2) return null
  const [lo, hi] = extent(values, 0.1)
  const x = linearScale([0, values.length - 1], [3, width - 5])
  const y = linearScale([lo, hi], [height - 4, 4])
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const lastX = x(values.length - 1)
  const lastY = y(values[values.length - 1])
  return (
    <svg
      className={styles[status]}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role='img'
      aria-label={label}
      data-status={status}
    >
      <polyline
        points={points}
        fill='none'
        stroke='currentColor'
        strokeWidth={2.5}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <circle cx={lastX} cy={lastY} r={3.5} fill='currentColor' />
    </svg>
  )
}
```

- [ ] **Step 5: Implement `src/components/charts/Ring.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from '@/src/components/charts/charts.module.css'
import { clamp } from '@/src/components/charts/scale'
import type { Status } from '@/src/types'

interface Props {
  value: number
  max?: number
  size?: number
  stroke?: number
  status?: Status
  label: ReactNode
  sublabel?: ReactNode
  ariaLabel: string
}

export function Ring({
  value,
  max = 100,
  size = 96,
  stroke = 10,
  status = 'good',
  label,
  sublabel,
  ariaLabel,
}: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? clamp(value / max, 0, 1) : 0
  const mid = size / 2
  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role='img'
        aria-label={ariaLabel}
        data-status={status}
        className={styles[status]}
      >
        <circle cx={mid} cy={mid} r={r} fill='none' stroke='var(--line)' strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            data-testid='ring-value'
            cx={mid}
            cy={mid}
            r={r}
            fill='none'
            stroke='currentColor'
            strokeWidth={stroke}
            strokeLinecap='round'
            strokeDasharray={`${(c * pct).toFixed(2)} ${c.toFixed(2)}`}
            transform={`rotate(-90 ${mid} ${mid})`}
          />
        )}
      </svg>
      <div className={styles.ringCenter} aria-hidden='true'>
        <span className={styles.ringLabel}>{label}</span>
        {sublabel && <span className={styles.ringSub}>{sublabel}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Implement `src/components/charts/Donut.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from '@/src/components/charts/charts.module.css'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerLabel?: ReactNode
  centerSub?: ReactNode
  formatValue: (v: number) => string
  ariaLabel: string
}

export function Donut({
  segments,
  size = 128,
  thickness = 18,
  centerLabel,
  centerSub,
  formatValue,
  ariaLabel,
}: Props) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let offset = 0
  return (
    <div className={styles.donut}>
      <div className={styles.ring} style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role='img' aria-label={ariaLabel}>
          <circle cx={mid} cy={mid} r={r} fill='none' stroke='var(--line)' strokeWidth={thickness} />
          {segments.map((s) => {
            const len = (s.value / total) * c
            const el = (
              <circle
                key={s.label}
                data-segment={s.label}
                cx={mid}
                cy={mid}
                r={r}
                fill='none'
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`}
                strokeDashoffset={(-offset).toFixed(2)}
                transform={`rotate(-90 ${mid} ${mid})`}
              />
            )
            offset += len
            return el
          })}
        </svg>
        <div className={styles.ringCenter} aria-hidden='true'>
          {centerLabel && <span className={styles.ringLabel}>{centerLabel}</span>}
          {centerSub && <span className={styles.ringSub}>{centerSub}</span>}
        </div>
      </div>
      <ul className={styles.legend}>
        {segments.map((s) => (
          <li key={s.label} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{formatValue(s.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 7: Implement `src/components/charts/Gauge.tsx`**

```tsx
import type { ReactNode } from 'react'
import styles from '@/src/components/charts/charts.module.css'
import { arcPath, clamp } from '@/src/components/charts/scale'

export interface GaugeBand {
  /** upper bound of this band in value units */
  to: number
  color: string
}

interface Props {
  value: number
  min: number
  max: number
  bands: GaugeBand[]
  valueLabel: ReactNode
  caption?: ReactNode
  minLabel?: string
  maxLabel?: string
  ariaLabel: string
}

const CX = 100
const CY = 100
const R = 80

export function Gauge({ value, min, max, bands, valueLabel, caption, minLabel, maxLabel, ariaLabel }: Props) {
  const angle = (v: number) => -Math.PI / 2 + Math.PI * clamp((v - min) / (max - min), 0, 1)
  const needleDeg = Math.round((angle(value) * 180) / Math.PI)
  let from = min
  return (
    <div className={styles.gauge}>
      <svg viewBox='0 0 200 112' className={styles.svg} role='img' aria-label={ariaLabel}>
        {bands.map((b) => {
          const d = arcPath(CX, CY, R, angle(from), angle(b.to))
          from = b.to
          return <path key={b.to} d={d} fill='none' stroke={b.color} strokeWidth={18} />
        })}
        <g
          data-testid='gauge-needle'
          data-angle={String(needleDeg)}
          className={styles.needle}
          style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: `${CX}px ${CY}px` }}
        >
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 4} stroke='var(--ink)' strokeWidth={4} strokeLinecap='round' />
        </g>
        <circle cx={CX} cy={CY} r={8} fill='var(--ink)' />
      </svg>
      {(minLabel || maxLabel) && (
        <div className={styles.gaugeEnds}>
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      <div className={styles.gaugeValue}>{valueLabel}</div>
      {caption && <div className='muted'>{caption}</div>}
    </div>
  )
}
```

- [ ] **Step 8: Run tests**

Run: `npm test -- src/components/charts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
npm run format
git add src/components/charts
git commit -m "feat: add SVG chart primitives (sparkline, ring, donut, gauge)"
```

---

### Task 11: Data charts — LineChart, BarChart, RangeStrip with tap-to-inspect

**Files:**
- Create: `src/components/charts/ChartTooltip.tsx`, `src/components/charts/LineChart.tsx`, `src/components/charts/BarChart.tsx`, `src/components/charts/RangeStrip.tsx`
- Test: `src/components/charts/dataCharts.test.tsx`

**Interfaces:**
- Consumes: `scale.ts`, `charts.module.css` (Task 10).
- Produces:
  - `<ChartTooltip leftPct: number title: string value: string />` (`role="status"`)
  - `<LineChart values: number[] labels: string[] formatValue: (v: number) => string ariaLabel: string yDomain?: [number, number] band?: { from: number; to: number; label: string } markerIndex?: number markerLabel?: string color?: string height?: number />`
  - type `Bar = { label: string; value: number; color?: string; highlight?: boolean }`; `<BarChart bars: Bar[] formatValue ariaLabel reference?: { value: number; label: string } height?: number />`
  - type `RangeRow = { label: string; min: number; max: number; flagged?: boolean }`; `<RangeStrip rows: RangeRow[] unit: string ariaLabel threshold?: { value: number; label: string } />`
  - Tapping a data point/bar/row (element with `data-testid="hit-<index>"`) shows a `ChartTooltip` with the label and formatted value; tapping again hides it.

- [ ] **Step 1: Write the failing tests `src/components/charts/dataCharts.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarChart } from '@/src/components/charts/BarChart'
import { LineChart } from '@/src/components/charts/LineChart'
import { RangeStrip } from '@/src/components/charts/RangeStrip'

test('LineChart draws band and marker and shows a tooltip on tap', async () => {
  const user = userEvent.setup()
  render(
    <LineChart
      values={[0.3, 0.5, 0.7]}
      labels={['1 Sep', '8 Sep', '15 Sep']}
      band={{ from: 0.45, to: 0.85, label: 'Healthy range' }}
      markerIndex={2}
      markerLabel='Today'
      formatValue={(v) => v.toFixed(2)}
      ariaLabel='Crop health'
    />,
  )
  expect(screen.getByRole('img', { name: 'Crop health' })).toBeInTheDocument()
  expect(screen.getByText('Healthy range')).toBeInTheDocument()
  expect(screen.getByText('Today')).toBeInTheDocument()
  await user.click(screen.getByTestId('hit-1'))
  expect(screen.getByRole('status')).toHaveTextContent('8 Sep')
  expect(screen.getByRole('status')).toHaveTextContent('0.50')
  await user.click(screen.getByTestId('hit-1'))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('BarChart marks highlighted bars and draws a labelled reference line', async () => {
  const user = userEvent.setup()
  render(
    <BarChart
      bars={[
        { label: '2018', value: 2.5 },
        { label: '2019', value: 1.1, highlight: true, color: 'var(--danger)' },
      ]}
      reference={{ value: 2.3, label: 'Average' }}
      formatValue={(v) => `${v} t/ha`}
      ariaLabel='Yield history'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Yield history' })
  expect(svg.querySelectorAll('[data-bar]')).toHaveLength(2)
  expect(svg.querySelectorAll('[data-highlight="true"]')).toHaveLength(1)
  expect(screen.getByText('Average')).toBeInTheDocument()
  await user.click(screen.getByTestId('hit-1'))
  expect(screen.getByRole('status')).toHaveTextContent('2019')
  expect(screen.getByRole('status')).toHaveTextContent('1.1 t/ha')
})

test('RangeStrip flags rows and shows the threshold', () => {
  render(
    <RangeStrip
      rows={[
        { label: '1 Sep', min: 13, max: 28 },
        { label: '8 Sep', min: 14, max: 34, flagged: true },
      ]}
      unit='°C'
      threshold={{ value: 32, label: '32°C' }}
      ariaLabel='Temperature'
    />,
  )
  const svg = screen.getByRole('img', { name: 'Temperature' })
  expect(svg.querySelectorAll('[data-flagged="true"]')).toHaveLength(1)
  expect(screen.getByText('32°C')).toBeInTheDocument()
})
```

Run: `npm test -- src/components/charts/dataCharts`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement `src/components/charts/ChartTooltip.tsx`**

```tsx
import styles from '@/src/components/charts/charts.module.css'
import { clamp } from '@/src/components/charts/scale'

export function ChartTooltip({ leftPct, title, value }: { leftPct: number; title: string; value: string }) {
  return (
    <div className={styles.tooltip} style={{ left: `${clamp(leftPct, 14, 86)}%` }} role='status'>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/components/charts/LineChart.tsx`**

```tsx
import { useId, useState } from 'react'
import { ChartTooltip } from '@/src/components/charts/ChartTooltip'
import styles from '@/src/components/charts/charts.module.css'
import { extent, linearScale, niceTicks, svgId } from '@/src/components/charts/scale'

interface Props {
  values: number[]
  labels: string[]
  formatValue: (v: number) => string
  ariaLabel: string
  yDomain?: [number, number]
  band?: { from: number; to: number; label: string }
  markerIndex?: number
  markerLabel?: string
  color?: string
  height?: number
}

const W = 320
const PAD = { l: 36, r: 12, t: 28, b: 26 }

export function LineChart({
  values,
  labels,
  formatValue,
  ariaLabel,
  yDomain,
  band,
  markerIndex,
  markerLabel,
  color = 'var(--green-700)',
  height = 190,
}: Props) {
  const [active, setActive] = useState<number | null>(null)
  const gradientId = svgId(`area${useId()}`)
  const n = values.length
  const [lo0, hi0] = yDomain ?? extent([...values, ...(band ? [band.from, band.to] : [])], 0.1)
  const ticks = niceTicks(lo0, hi0, 4)
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const x = linearScale([0, Math.max(1, n - 1)], [PAD.l, W - PAD.r])
  const y = linearScale([lo, hi], [height - PAD.b, PAD.t])
  const line = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(n - 1).toFixed(1)} ${y(lo)} L ${x(0).toFixed(1)} ${y(lo)} Z`
  const step = n > 1 ? x(1) - x(0) : W
  const labelIdx = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [...Array(n).keys()]

  return (
    <div className={styles.chart}>
      {active !== null && (
        <ChartTooltip
          leftPct={(x(active) / W) * 100}
          title={labels[active]}
          value={formatValue(values[active])}
        />
      )}
      <svg viewBox={`0 0 ${W} ${height}`} className={styles.svg} role='img' aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gradientId} x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor={color} stopOpacity={0.28} />
            <stop offset='100%' stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className={styles.gridLine} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className={styles.axisText} x={PAD.l - 6} y={y(t) + 4} textAnchor='end'>
              {formatValue(t)}
            </text>
          </g>
        ))}
        {band && (
          <g>
            <rect
              x={PAD.l}
              width={W - PAD.l - PAD.r}
              y={y(Math.min(hi, band.to))}
              height={Math.max(0, y(Math.max(lo, band.from)) - y(Math.min(hi, band.to)))}
              fill='var(--green-100)'
              opacity={0.8}
            />
            <text className={styles.refText} x={W - PAD.r - 4} y={y(Math.min(hi, band.to)) + 14} textAnchor='end'>
              {band.label}
            </text>
          </g>
        )}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill='none' stroke={color} strokeWidth={3} strokeLinejoin='round' strokeLinecap='round' />
        {markerIndex !== undefined && markerIndex < n && (
          <g>
            <line
              x1={x(markerIndex)}
              x2={x(markerIndex)}
              y1={PAD.t - 8}
              y2={height - PAD.b}
              stroke='var(--gold-500)'
              strokeWidth={2}
              strokeDasharray='4 4'
            />
            <circle cx={x(markerIndex)} cy={y(values[markerIndex])} r={6} fill='var(--gold-500)' stroke='#fff' strokeWidth={2} />
            {markerLabel && (
              <text className={styles.refText} x={x(markerIndex)} y={PAD.t - 12} textAnchor='end'>
                {markerLabel}
              </text>
            )}
          </g>
        )}
        {active !== null && (
          <circle cx={x(active)} cy={y(values[active])} r={6} fill={color} stroke='#fff' strokeWidth={2} />
        )}
        {labelIdx.map((i) => (
          <text
            key={i}
            className={styles.axisText}
            x={x(i)}
            y={height - 6}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          >
            {labels[i]}
          </text>
        ))}
        {values.map((_, i) => (
          <rect
            key={i}
            data-testid={`hit-${i}`}
            className={styles.hit}
            x={x(i) - step / 2}
            width={step}
            y={PAD.t}
            height={height - PAD.t - PAD.b}
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/components/charts/BarChart.tsx`**

```tsx
import { useState } from 'react'
import { ChartTooltip } from '@/src/components/charts/ChartTooltip'
import styles from '@/src/components/charts/charts.module.css'
import { linearScale, niceTicks } from '@/src/components/charts/scale'

export interface Bar {
  label: string
  value: number
  color?: string
  highlight?: boolean
}

interface Props {
  bars: Bar[]
  formatValue: (v: number) => string
  ariaLabel: string
  reference?: { value: number; label: string }
  height?: number
}

const W = 320
const PAD = { l: 36, r: 12, t: 22, b: 26 }

export function BarChart({ bars, formatValue, ariaLabel, reference, height = 190 }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const n = bars.length
  const maxVal = Math.max(...bars.map((b) => b.value), reference?.value ?? 0)
  const ticks = niceTicks(0, maxVal || 1, 4)
  const hi = ticks[ticks.length - 1]
  const y = linearScale([0, hi], [height - PAD.b, PAD.t])
  const slot = (W - PAD.l - PAD.r) / Math.max(1, n)
  const barW = slot * 0.62
  const cx = (i: number) => PAD.l + slot * i + slot / 2
  const every = Math.ceil(n / 8)

  return (
    <div className={styles.chart}>
      {active !== null && (
        <ChartTooltip
          leftPct={(cx(active) / W) * 100}
          title={bars[active].label}
          value={formatValue(bars[active].value)}
        />
      )}
      <svg viewBox={`0 0 ${W} ${height}`} className={styles.svg} role='img' aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={styles.gridLine} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className={styles.axisText} x={PAD.l - 6} y={y(t) + 4} textAnchor='end'>
              {formatValue(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const top = y(Math.max(0, b.value))
          return (
            <rect
              key={b.label}
              data-bar={b.label}
              data-highlight={b.highlight ? 'true' : undefined}
              x={cx(i) - barW / 2}
              width={barW}
              y={top}
              height={Math.max(0, height - PAD.b - top)}
              rx={4}
              fill={b.color ?? 'var(--green-500)'}
              opacity={active === null || active === i ? 1 : 0.45}
              stroke={b.highlight ? 'var(--ink)' : undefined}
              strokeWidth={b.highlight ? 1.5 : undefined}
            />
          )
        })}
        {reference && (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke='var(--ink-2)'
              strokeWidth={2}
              strokeDasharray='6 4'
            />
            <text className={styles.refText} x={W - PAD.r} y={y(reference.value) - 6} textAnchor='end'>
              {reference.label}
            </text>
          </g>
        )}
        {bars.map((b, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={b.label} className={styles.axisText} x={cx(i)} y={height - 6} textAnchor='middle'>
              {b.label}
            </text>
          ) : null,
        )}
        {bars.map((b, i) => (
          <rect
            key={b.label}
            data-testid={`hit-${i}`}
            className={styles.hit}
            x={cx(i) - slot / 2}
            width={slot}
            y={PAD.t}
            height={height - PAD.t - PAD.b}
            onClick={() => setActive(active === i ? null : i)}
          />
        ))}
      </svg>
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/components/charts/RangeStrip.tsx`**

```tsx
import { useState } from 'react'
import { ChartTooltip } from '@/src/components/charts/ChartTooltip'
import styles from '@/src/components/charts/charts.module.css'
import { linearScale, niceTicks } from '@/src/components/charts/scale'

export interface RangeRow {
  label: string
  min: number
  max: number
  flagged?: boolean
}

interface Props {
  rows: RangeRow[]
  unit: string
  ariaLabel: string
  threshold?: { value: number; label: string }
}

const W = 320
const LABEL_W = 52
const ROW_H = 22
const TOP = 22

export function RangeStrip({ rows, unit, ariaLabel, threshold }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const lo = Math.min(...rows.map((r) => r.min))
  const hi = Math.max(...rows.map((r) => r.max), threshold?.value ?? -Infinity)
  const ticks = niceTicks(lo, hi, 4)
  const x = linearScale([ticks[0], ticks[ticks.length - 1]], [LABEL_W, W - 12])
  const height = TOP + rows.length * ROW_H + 6

  return (
    <div className={styles.chart}>
      {active !== null && (
        <ChartTooltip
          leftPct={(x(rows[active].max) / W) * 100}
          title={rows[active].label}
          value={`${rows[active].min}–${rows[active].max}${unit}`}
        />
      )}
      <svg viewBox={`0 0 ${W} ${height}`} className={styles.svg} role='img' aria-label={ariaLabel}>
        {ticks.map((t) => (
          <text key={t} className={styles.axisText} x={x(t)} y={12} textAnchor='middle'>
            {t}
            {unit}
          </text>
        ))}
        {rows.map((r, i) => {
          const cy = TOP + i * ROW_H + ROW_H / 2
          return (
            <g key={r.label} data-flagged={r.flagged ? 'true' : undefined}>
              <text className={styles.axisText} x={0} y={cy + 4}>
                {r.label}
              </text>
              <rect
                x={x(r.min)}
                width={Math.max(4, x(r.max) - x(r.min))}
                y={cy - 5}
                height={10}
                rx={5}
                fill={r.flagged ? 'var(--danger)' : 'var(--gold-500)'}
                opacity={active === null || active === i ? 1 : 0.45}
              />
              <rect
                data-testid={`hit-${i}`}
                className={styles.hit}
                x={0}
                width={W}
                y={cy - ROW_H / 2}
                height={ROW_H}
                onClick={() => setActive(active === i ? null : i)}
              />
            </g>
          )
        })}
        {threshold && (
          <g>
            <line
              x1={x(threshold.value)}
              x2={x(threshold.value)}
              y1={TOP - 4}
              y2={height}
              stroke='var(--danger)'
              strokeWidth={1.5}
              strokeDasharray='4 3'
            />
            <text className={styles.refText} x={x(threshold.value) + 4} y={TOP + 8}>
              {threshold.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- src/components/charts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
npm run format
git add src/components/charts
git commit -m "feat: add line, bar and range charts with tap-to-inspect"
```

---
### Task 12: Common UI components

**Files:**
- Create: `src/components/common/Icons.tsx`, `src/components/common/Illustrations.tsx`, `src/components/common/Button.tsx`, `src/components/common/Header.tsx`, `src/components/common/BottomNav.tsx`, `src/components/common/Chip.tsx`, `src/components/common/ErrorStates.tsx`, `src/components/common/ProgressTimeline.tsx`, `src/components/common/Screen.tsx`, `src/components/common/BottomSheet.tsx`, `src/components/common/common.module.css`
- Modify: `src/i18n/en.ts` (append keys)
- Test: `src/components/common/common.test.tsx`

**Interfaces:**
- Consumes: `t` (Task 2), `usePayouts` (Task 8), `renderWithApp` (Task 8), `Status`, `Crop` (Task 2).
- Produces:
  - type `IconName` (see `PATHS` keys), `<Icon name: IconName size?: number title?: string className?: string strokeWidth?: number />`, `CROP_ICON: Record<Crop, IconName>`
  - Illustrations (decorative, `aria-hidden`): `<HeroFarm />`, `<SatelliteScene />`, `<PhonePay />`, `<EmptyField />`, `<Celebrate />` — each accepts `className?: string`
  - `<Button variant?: 'primary' | 'secondary' | 'ghost' block?: boolean loading?: boolean icon?: IconName ...ButtonHTMLAttributes />` (loading ⇒ disabled + `aria-busy="true"`)
  - `<Header title?: string back?: boolean | string right?: ReactNode transparent?: boolean />` (`back` true ⇒ `navigate(-1)`, string ⇒ navigate to path; back button `aria-label` = `t('common.back')`)
  - `<BottomNav />` (Home `/home`, Monitor `/monitor`, Map `/map`, Payouts `/payouts`, Profile `/profile`; shows a dot with `aria-label` `t('nav.newPayout')` when any payout is unread)
  - `<Chip status?: Status | 'neutral' icon?: IconName>children</Chip>` (`data-status`)
  - `<ErrorState kind: 'offline' | 'gps' | 'payment' | 'notFound' | 'generic' title?: string message?: string onRetry?: () => void action?: ReactNode />`, `<EmptyState title: string message?: string action?: ReactNode />`, `<LoadingState label?: string />` (`role="status"`)
  - type `TimelineStep = { key: string; label: string; date?: string }`; `<ProgressTimeline steps: TimelineStep[] currentIndex: number />` — each `<li>` has `data-state` `done | current | pending`
  - `<Screen header?: ReactNode footer?: ReactNode nav?: boolean className?: string>children</Screen>` (body is `<main>`)
  - `<BottomSheet open: boolean onClose: () => void title: string>children</BottomSheet>` (`role="dialog"`)

- [ ] **Step 1: Append i18n keys** inside the `en` object in `src/i18n/en.ts`:

```ts
  'common.close': 'Close',
  'nav.home': 'Home',
  'nav.monitor': 'Monitor',
  'nav.map': 'Map',
  'nav.payouts': 'Payouts',
  'nav.profile': 'Profile',
  'nav.newPayout': 'New payout',
  'error.offline.title': "You're offline",
  'error.offline.body': 'Maps need mobile data. Check your connection and try again.',
  'error.gps.title': "We can't find your location",
  'error.gps.body': 'Turn on location (GPS), or mark your farm by tapping its corners on the map instead.',
  'error.payment.title': 'Payment did not go through',
  'error.payment.body': 'No money was taken. Check your M-Pesa balance and try again.',
  'error.notFound.title': "We couldn't find that page",
  'error.notFound.body': 'It may have been removed, or the link is wrong.',
  'error.generic.title': 'Something went wrong',
  'error.generic.body': 'Please try again.',
```

- [ ] **Step 2: Write the failing tests `src/components/common/common.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav } from '@/src/components/common/BottomNav'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { ErrorState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { ProgressTimeline } from '@/src/components/common/ProgressTimeline'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('Icon is decorative unless titled', () => {
  const { container, rerender } = render(<Icon name='home' />)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  rerender(<Icon name='home' title='Home' />)
  expect(screen.getByRole('img', { name: 'Home' })).toBeInTheDocument()
})

test('Button loading is disabled and busy', () => {
  render(<Button loading>Pay</Button>)
  const btn = screen.getByRole('button', { name: /pay/i })
  expect(btn).toBeDisabled()
  expect(btn).toHaveAttribute('aria-busy', 'true')
})

test('Header back button navigates to the given path', async () => {
  const { user } = renderWithApp(<Header title='Farm' back='/home' />, { route: '/farm/1', path: '/farm/:id' })
  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/home')
})

test('BottomNav shows five tabs and an unread payout dot', () => {
  renderWithApp(<BottomNav />, { state: seededState() })
  for (const name of ['Home', 'Monitor', 'Map', 'Payouts', 'Profile']) {
    expect(screen.getByRole('link', { name: new RegExp(name) })).toBeInTheDocument()
  }
  expect(screen.getByLabelText('New payout')).toBeInTheDocument()
})

test('Chip exposes its status', () => {
  render(<Chip status='danger'>Alert</Chip>)
  expect(screen.getByText('Alert').closest('[data-status]')).toHaveAttribute('data-status', 'danger')
})

test('ErrorState shows default copy and retries', async () => {
  const onRetry = vi.fn()
  render(<ErrorState kind='offline' onRetry={onRetry} />)
  expect(screen.getByText("You're offline")).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(onRetry).toHaveBeenCalledOnce()
})

test('ProgressTimeline marks done, current and pending steps', () => {
  render(
    <ProgressTimeline
      currentIndex={1}
      steps={[
        { key: 'a', label: 'Triggered', date: '2 Sep' },
        { key: 'b', label: 'Assessed' },
        { key: 'c', label: 'Paid' },
      ]}
    />,
  )
  const items = screen.getAllByRole('listitem')
  expect(items.map((li) => li.getAttribute('data-state'))).toEqual(['done', 'current', 'pending'])
})

test('BottomSheet renders only when open and closes', async () => {
  const onClose = vi.fn()
  const { rerender } = render(
    <BottomSheet open={false} onClose={onClose} title='Farm'>
      body
    </BottomSheet>,
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  rerender(
    <BottomSheet open onClose={onClose} title='Farm'>
      body
    </BottomSheet>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onClose).toHaveBeenCalledOnce()
})
```

Run: `npm test -- src/components/common`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/common/Icons.tsx`**

```tsx
import type { Crop } from '@/src/types'

const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  monitor: 'M3 12h4l3-7 4 14 3-7h4',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  payout: 'M3 7h15a3 3 0 013 3v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0l2-3h11M16 14h2',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
  satellite: 'M4 10l6-6 4 4-6 6-4-4zM14 14l6-6M10 18a4 4 0 004-4M7 21a7 7 0 007-7',
  cash: 'M3 7h18v10H3zM12 15a3 3 0 100-6 3 3 0 000 6z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  cloud: 'M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 18z',
  rain: 'M7 15h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 15zM8 21l1-3M12 21l1-3M16 21l1-3',
  drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  thermo: 'M10 14V5a2 2 0 014 0v9a4 4 0 11-4 0z',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7',
  maize: 'M12 3c3 2 4 5 4 9s-1 7-4 9c-3-2-4-5-4-9s1-7 4-9zM12 7v12M9.5 9h5M9 12h6M9.5 15h5',
  beans: 'M10 4a5 5 0 014 8c-1.5 2-1 4-3 6a4.5 4.5 0 01-7-5c1.5-3 1-9 6-9zM16 15a3 3 0 106 0 3 3 0 00-6 0',
  tea: 'M12 21V11M12 11C8 11 5 8 5 4c4 0 7 3 7 7zM12 14c3 0 6-2 7-6-4 0-7 2-7 6z',
  phone: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
  check: 'M5 12l5 5 9-10',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.5',
  wifiOff: 'M2 8a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19v.5M3 3l18 18',
  gps: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  pin: 'M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12zM12 11a2 2 0 100-4 2 2 0 000 4z',
  walk: 'M13 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM10 22l2-7 3 3v4M9 12l2-5 4 2 2 3M11 7l-3 3',
  draw: 'M3 21l3-1 12-12-2-2L4 18l-1 3zM14 6l2 2M15 21c2 0 6-1 6-4',
  tap: 'M9 11V5a2 2 0 014 0v6l4 1a2 2 0 011.5 2.3L17 21H9l-3-5a1.7 1.7 0 012.6-2L9 15',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  close: 'M6 6l12 12M18 6L6 18',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17v.5',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
} as const

export type IconName = keyof typeof PATHS

export const CROP_ICON: Record<Crop, IconName> = { maize: 'maize', beans: 'beans', tea: 'tea' }

interface Props {
  name: IconName
  size?: number
  title?: string
  className?: string
  strokeWidth?: number
}

export function Icon({ name, size = 24, title, className, strokeWidth = 2 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
```

- [ ] **Step 4: Create `src/components/common/Illustrations.tsx`**

```tsx
interface Props {
  className?: string
}

const base = { 'aria-hidden': true, className: undefined as string | undefined }

export function HeroFarm({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 360 240'>
      <rect width='360' height='240' fill='#e2effb' />
      <circle cx='290' cy='60' r='30' fill='#e0a526' />
      <path d='M0 150 Q90 100 180 140 T360 120 V240 H0Z' fill='#8fd3a5' />
      <path d='M0 180 Q120 140 240 175 T360 165 V240 H0Z' fill='#2f9e5a' />
      <path d='M0 210 Q140 185 360 205 V240 H0Z' fill='#96643a' />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} transform={`translate(${30 + i * 38} ${196 - (i % 2) * 4})`}>
          <path d='M0 0 V-34' stroke='#1f6b3a' strokeWidth='3' />
          <path d='M0 -12 Q-12 -20 -14 -30 M0 -20 Q12 -26 14 -36 M0 -28 Q-8 -34 -8 -42' stroke='#1f6b3a' strokeWidth='3' fill='none' strokeLinecap='round' />
          <ellipse cx='4' cy='-24' rx='3' ry='7' fill='#e0a526' />
        </g>
      ))}
    </svg>
  )
}

export function SatelliteScene({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 200 140'>
      <rect width='200' height='140' rx='18' fill='#0f3d21' />
      {Array.from({ length: 18 }, (_, i) => (
        <circle key={i} cx={(i * 47) % 200} cy={(i * 29) % 70} r='1.2' fill='#fff' opacity='0.7' />
      ))}
      <g transform='translate(120 34) rotate(-25)'>
        <rect x='-26' y='-7' width='18' height='14' fill='#4a9be0' />
        <rect x='8' y='-7' width='18' height='14' fill='#4a9be0' />
        <rect x='-8' y='-9' width='16' height='18' rx='3' fill='#dfe5e1' />
      </g>
      <path d='M112 48 L70 112 M120 50 L130 112' stroke='#e0a526' strokeWidth='2' strokeDasharray='4 4' />
      <path d='M30 112 h140 v20 h-140z' fill='#2f9e5a' />
      <path d='M60 112 l20 -6 l40 4 l14 8z' fill='#8fd3a5' stroke='#e0a526' strokeWidth='2' />
    </svg>
  )
}

export function PhonePay({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 160 160'>
      <circle cx='80' cy='80' r='72' fill='#e3f5e8' />
      <rect x='52' y='28' width='56' height='104' rx='10' fill='#17201a' />
      <rect x='57' y='38' width='46' height='80' rx='4' fill='#fff' />
      <rect x='63' y='52' width='34' height='8' rx='4' fill='#2f9e5a' />
      <rect x='63' y='66' width='26' height='6' rx='3' fill='#dfe5e1' />
      <rect x='63' y='78' width='34' height='22' rx='4' fill='#e3f5e8' />
      <circle cx='118' cy='46' r='14' fill='#e0a526' />
      <text x='118' y='51' textAnchor='middle' fontSize='14' fontWeight='800' fill='#fff'>
        K
      </text>
    </svg>
  )
}

export function EmptyField({ className }: Props) {
  return (
    <svg {...base} className={className} viewBox='0 0 160 120'>
      <ellipse cx='80' cy='100' rx='70' ry='12' fill='#f4ece3' />
      <path d='M30 98 l50 -18 l50 18 l-50 14z' fill='#96643a' opacity='0.5' />
      <path d='M80 82 V40' stroke='#2f9e5a' strokeWidth='4' strokeLinecap='round' />
      <path d='M80 60 Q60 50 58 36 Q76 40 80 58 M80 52 Q98 40 104 28 Q84 32 80 50' fill='#8fd3a5' stroke='#2f9e5a' strokeWidth='2' />
    </svg>
  )
}

export function Celebrate({ className }: Props) {
  const colors = ['#e0a526', '#2f9e5a', '#4a9be0', '#c62828']
  return (
    <svg {...base} className={className} viewBox='0 0 200 160'>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        const r = 60 + (i % 3) * 12
        return (
          <rect
            key={i}
            x={100 + Math.cos(a) * r}
            y={80 + Math.sin(a) * r * 0.7}
            width='6'
            height='10'
            rx='2'
            fill={colors[i % 4]}
            transform={`rotate(${i * 37} ${100 + Math.cos(a) * r} ${80 + Math.sin(a) * r * 0.7})`}
          />
        )
      })}
      <circle cx='100' cy='80' r='38' fill='#e0a526' />
      <circle cx='100' cy='80' r='30' fill='none' stroke='#fff' strokeWidth='3' />
      <text x='100' y='88' textAnchor='middle' fontSize='24' fontWeight='800' fill='#fff'>
        KES
      </text>
    </svg>
  )
}
```

- [ ] **Step 5: Create `src/components/common/common.module.css`**

```css
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 56px;
  padding: calc(var(--sp-2) + env(safe-area-inset-top)) var(--sp-2) var(--sp-2);
  background: var(--bg);
}
.headerTransparent {
  background: transparent;
  position: absolute;
  left: 0;
  right: 0;
}
.headerTitle {
  flex: 1;
  font-size: var(--fs-lg);
  font-weight: 800;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.iconBtn {
  width: var(--tap);
  height: var(--tap);
  border-radius: 50%;
  border: 0;
  background: var(--surface);
  box-shadow: var(--shadow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
}

.nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  height: calc(var(--nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background: var(--surface);
  border-top: 1px solid var(--line);
  max-width: 560px;
  margin: 0 auto;
}
.navLink {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--ink-3);
  text-decoration: none;
}
.navActive {
  color: var(--green-700);
}
.navActive::before {
  content: '';
  position: absolute;
  top: 0;
  width: 32px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: var(--green-700);
}
.dot {
  position: absolute;
  top: 8px;
  right: calc(50% - 18px);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--danger);
  border: 2px solid var(--surface);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-xs);
  font-weight: 700;
  white-space: nowrap;
}
.chip[data-status='good'] {
  background: var(--good-bg);
  color: var(--good);
}
.chip[data-status='warning'] {
  background: var(--warning-bg);
  color: var(--warning);
}
.chip[data-status='danger'] {
  background: var(--danger-bg);
  color: var(--danger);
}
.chip[data-status='neutral'] {
  background: var(--line);
  color: var(--ink-2);
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--sp-3);
  padding: var(--sp-6) var(--sp-4);
}
.stateIcon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--warning-bg);
  color: var(--warning);
}
.stateIllo {
  width: 160px;
}

.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid currentColor;
  border-right-color: transparent;
  animation: spin 800ms linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.skeleton {
  border-radius: var(--radius);
  background: var(--line);
  height: 96px;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}
.step {
  position: relative;
  display: flex;
  gap: var(--sp-3);
  padding-bottom: var(--sp-4);
}
.step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 13px;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: var(--line);
}
.step[data-state='done']::after {
  background: var(--green-500);
}
.stepDot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--line);
  background: var(--surface);
  color: #fff;
}
.step[data-state='done'] .stepDot {
  background: var(--green-500);
  border-color: var(--green-500);
}
.step[data-state='current'] .stepDot {
  border-color: var(--gold-500);
  box-shadow: 0 0 0 4px var(--gold-100);
}
.step[data-state='pending'] {
  color: var(--ink-3);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(23, 32, 26, 0.4);
  animation: fadeIn 200ms both;
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 31;
  max-width: 560px;
  margin: 0 auto;
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--sp-4) var(--sp-4) calc(var(--sp-5) + env(safe-area-inset-bottom));
  animation: slideUp 260ms var(--ease) both;
}
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
}

.withNavFooter {
  bottom: var(--nav-h);
}
```

- [ ] **Step 6: Create the components**

`src/components/common/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  block?: boolean
  loading?: boolean
  icon?: IconName
}

export function Button({
  variant = 'primary',
  block,
  loading,
  icon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  const cls = ['btn', `btn-${variant}`, block && 'btn-block', className].filter(Boolean).join(' ')
  return (
    <button
      {...rest}
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
    >
      {loading ? <span className={styles.spinner} /> : icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  )
}
```

`src/components/common/Header.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from '@/src/components/common/common.module.css'
import { Icon } from '@/src/components/common/Icons'
import { t } from '@/src/i18n'

interface Props {
  title?: string
  back?: boolean | string
  right?: ReactNode
  transparent?: boolean
}

export function Header({ title, back, right, transparent }: Props) {
  const navigate = useNavigate()
  return (
    <header className={`${styles.header} ${transparent ? styles.headerTransparent : ''}`}>
      {back && (
        <button
          type='button'
          className={styles.iconBtn}
          aria-label={t('common.back')}
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        >
          <Icon name='back' />
        </button>
      )}
      <h1 className={styles.headerTitle}>{title}</h1>
      {right}
    </header>
  )
}
```

`src/components/common/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { usePayouts } from '@/src/context/AppContext'
import { t, type StringKey } from '@/src/i18n'

const TABS: { to: string; icon: IconName; label: StringKey }[] = [
  { to: '/home', icon: 'home', label: 'nav.home' },
  { to: '/monitor', icon: 'monitor', label: 'nav.monitor' },
  { to: '/map', icon: 'map', label: 'nav.map' },
  { to: '/payouts', icon: 'payout', label: 'nav.payouts' },
  { to: '/profile', icon: 'profile', label: 'nav.profile' },
]

export function BottomNav() {
  const hasUnread = usePayouts().some((p) => !p.read)
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
        >
          <Icon name={tab.icon} />
          <span>{t(tab.label)}</span>
          {tab.to === '/payouts' && hasUnread && (
            <span className={styles.dot} role='img' aria-label={t('nav.newPayout')} />
          )}
        </NavLink>
      ))}
    </nav>
  )
}
```

`src/components/common/Chip.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'
import type { Status } from '@/src/types'

export function Chip({
  status = 'neutral',
  icon,
  children,
}: {
  status?: Status | 'neutral'
  icon?: IconName
  children: ReactNode
}) {
  return (
    <span className={styles.chip} data-status={status}>
      {icon && <Icon name={icon} size={14} strokeWidth={2.5} />}
      {children}
    </span>
  )
}
```

`src/components/common/ErrorStates.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Button } from '@/src/components/common/Button'
import styles from '@/src/components/common/common.module.css'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { EmptyField } from '@/src/components/common/Illustrations'
import { t, type StringKey } from '@/src/i18n'

type Kind = 'offline' | 'gps' | 'payment' | 'notFound' | 'generic'

const KIND_ICON: Record<Kind, IconName> = {
  offline: 'wifiOff',
  gps: 'gps',
  payment: 'cash',
  notFound: 'map',
  generic: 'alert',
}

export function ErrorState({
  kind,
  title,
  message,
  onRetry,
  action,
}: {
  kind: Kind
  title?: string
  message?: string
  onRetry?: () => void
  action?: ReactNode
}) {
  return (
    <div className={`${styles.state} fade-in`}>
      <div className={styles.stateIcon}>
        <Icon name={KIND_ICON[kind]} size={36} />
      </div>
      <h2 className='h2'>{title ?? t(`error.${kind}.title` as StringKey)}</h2>
      <p className='muted' style={{ margin: 0, fontSize: 'var(--fs-md)' }}>
        {message ?? t(`error.${kind}.body` as StringKey)}
      </p>
      {onRetry && (
        <Button block onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className={`${styles.state} fade-in`}>
      <EmptyField className={styles.stateIllo} />
      <h2 className='h3'>{title}</h2>
      {message && <p className='muted' style={{ margin: 0 }}>{message}</p>}
      {action}
    </div>
  )
}

export function LoadingState({ label = t('common.loading') }: { label?: string }) {
  return (
    <div role='status' aria-label={label} className='stack'>
      <div className={styles.skeleton} />
      <div className={styles.skeleton} style={{ height: 160 }} />
      <div className={styles.skeleton} />
    </div>
  )
}
```

`src/components/common/ProgressTimeline.tsx`:

```tsx
import styles from '@/src/components/common/common.module.css'
import { Icon } from '@/src/components/common/Icons'

export interface TimelineStep {
  key: string
  label: string
  date?: string
}

export function ProgressTimeline({ steps, currentIndex }: { steps: TimelineStep[]; currentIndex: number }) {
  return (
    <ol className={styles.timeline}>
      {steps.map((s, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending'
        return (
          <li key={s.key} className={styles.step} data-state={state}>
            <span className={styles.stepDot}>{state === 'done' && <Icon name='check' size={16} strokeWidth={3} />}</span>
            <div>
              <div style={{ fontWeight: 700 }}>{s.label}</div>
              {s.date && <div className='muted'>{s.date}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
```

`src/components/common/Screen.tsx`:

```tsx
import type { ReactNode } from 'react'
import { BottomNav } from '@/src/components/common/BottomNav'
import styles from '@/src/components/common/common.module.css'

interface Props {
  header?: ReactNode
  footer?: ReactNode
  nav?: boolean
  className?: string
  children: ReactNode
}

export function Screen({ header, footer, nav, className, children }: Props) {
  return (
    <div className={`screen ${className ?? ''}`}>
      {header}
      <main className='screen-body fade-in'>{children}</main>
      {footer && (
        <div className={`screen-footer ${nav ? styles.withNavFooter : ''}`}>{footer}</div>
      )}
      {nav && <BottomNav />}
    </div>
  )
}
```

`src/components/common/BottomSheet.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from '@/src/components/common/common.module.css'
import { Icon } from '@/src/components/common/Icons'
import { t } from '@/src/i18n'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  if (!open) return null
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role='dialog' aria-modal='true' aria-label={title}>
        <div className='row-between'>
          <h2 className='h3'>{title}</h2>
          <button type='button' className={styles.iconBtn} aria-label={t('common.close')} onClick={onClose}>
            <Icon name='close' />
          </button>
        </div>
        <div style={{ marginTop: 'var(--sp-3)' }}>{children}</div>
      </div>
    </>
  )
}
```

- [ ] **Step 7: Run tests**

Run: `npm test -- src/components/common`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
npm run format
git add src/components/common src/i18n/en.ts
git commit -m "feat: add common UI components, icons and illustrations"
```

---

### Task 13: Routing, route guards, lazy pages and Not Found

**Files:**
- Create: `src/routes/ProtectedRoute.tsx`, `src/routes/PublicRoute.tsx`, `src/pages/NotFound.tsx`, `src/components/common/Placeholder.tsx`, one stub per page (list in Step 3), `src/pages/pages.module.css`
- Modify: `src/App.tsx` (replace), `src/App.test.tsx` (replace), `src/test/setup.ts` (stub `scrollTo`), `src/i18n/en.ts`
- Test: `src/routes/routes.test.tsx`

**Interfaces:**
- Consumes: `AppProvider`, `useAuth`, `useFarmer` (Task 8), `Screen`, `Header`, `ErrorState`, `Button`, `LoadingState` (Task 12).
- Produces:
  - `AppRoutes` (named export of `src/App.tsx`) — the full route table; default export `App` wraps it in `AppProvider` + `BrowserRouter`.
  - `<PublicRoute />`: renders `<Outlet/>` unless logged in with a farmer → `/home`; logged in without farmer → `/registration`.
  - `<ProtectedRoute allowNewUser? />`: not logged in → `/`; without farmer and not `allowNewUser` → `/registration`; `allowNewUser` and farmer exists → `/home`.
  - Every page module under `src/pages/**` has a **default export** component (later tasks replace the stub bodies, keeping file name and default export).
  - Shared page stylesheet `src/pages/pages.module.css` — later tasks append classes to it.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'notFound.cta': 'Go to home',
```

- [ ] **Step 2: Stub `scrollTo` in `src/test/setup.ts`** (append):

```ts
window.scrollTo = (() => {}) as typeof window.scrollTo
```

- [ ] **Step 3: Create the placeholder and page stubs**

`src/components/common/Placeholder.tsx`:

```tsx
import { Screen } from '@/src/components/common/Screen'

export function Placeholder({ title }: { title: string }) {
  return (
    <Screen>
      <h1 className='h1'>{title}</h1>
    </Screen>
  )
}
```

Create every page stub with this script:

```bash
for p in onboarding/Welcome onboarding/PhoneEntry onboarding/OtpVerification onboarding/Registration \
  farm/Home farm/FarmDetail farm/AddFarm farm/BoundaryIntro farm/BoundaryMap farm/BoundaryQuickMap \
  farm/BoundaryWalk farm/BoundaryDraw farm/ConfirmFarm farm/ViewBoundary farm/YieldAnalysis farm/YieldReport \
  insurance/PlanOptions insurance/PremiumQuote insurance/Payment insurance/Confirmation \
  monitor/MonitorList monitor/MonitorDetail map/AllFarmsMap \
  payout/PayoutNotification payout/PayoutDetails payout/PayoutHistory \
  profile/Profile profile/Policies profile/PolicyDetail; do
  name=$(basename "$p")
  mkdir -p "src/pages/$(dirname "$p")"
  cat > "src/pages/$p.tsx" <<EOF
import { Placeholder } from '@/src/components/common/Placeholder'

export default function $name() {
  return <Placeholder title='$name' />
}
EOF
done
```

Create `src/pages/pages.module.css` with a single starter rule (later tasks append):

```css
.center {
  text-align: center;
}
```

- [ ] **Step 4: Create `src/pages/NotFound.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { ErrorState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { t } from '@/src/i18n'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Screen header={<Header back />}>
      <ErrorState
        kind='notFound'
        action={
          <Button block onClick={() => navigate('/home')}>
            {t('notFound.cta')}
          </Button>
        }
      />
    </Screen>
  )
}
```

- [ ] **Step 5: Write the failing routing tests `src/routes/routes.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AppRoutes } from '@/src/App'
import { AppProvider } from '@/src/context/AppContext'
import { initialState } from '@/src/context/reducer'
import { seededState } from '@/src/test/renderWithApp'
import type { AppState } from '@/src/types'

function Where() {
  const loc = useLocation()
  return <div data-testid='where'>{loc.pathname}</div>
}

function renderAt(route: string, state: AppState) {
  render(
    <AppProvider initialState={state}>
      <MemoryRouter initialEntries={[route]}>
        <Where />
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  )
}

const newUser: AppState = {
  ...initialState,
  auth: { isAuthenticated: true, phone: '+254700000001', isNewUser: true },
}

test('logged-out users are sent to the welcome screen', async () => {
  renderAt('/home', initialState)
  expect(await screen.findByTestId('where')).toHaveTextContent(/^\/$/)
})

test('logged-in farmers skip onboarding', async () => {
  renderAt('/phone-entry', seededState())
  expect(await screen.findByTestId('where')).toHaveTextContent('/home')
})

test('new users must finish registration first', async () => {
  renderAt('/home', newUser)
  expect(await screen.findByTestId('where')).toHaveTextContent('/registration')
})

test('registered farmers cannot reopen registration', async () => {
  renderAt('/registration', seededState())
  expect(await screen.findByTestId('where')).toHaveTextContent('/home')
})

test('unknown paths show Not Found', async () => {
  renderAt('/no-such-page', seededState())
  expect(await screen.findByText("We couldn't find that page")).toBeInTheDocument()
})
```

Run: `npm test -- src/routes`
Expected: FAIL — `AppRoutes` not exported / route guards missing.

- [ ] **Step 6: Create the route guards**

`src/routes/PublicRoute.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, useFarmer } from '@/src/context/AppContext'

export function PublicRoute() {
  const auth = useAuth()
  const farmer = useFarmer()
  if (auth.isAuthenticated && farmer) return <Navigate to='/home' replace />
  if (auth.isAuthenticated && auth.isNewUser) return <Navigate to='/registration' replace />
  return <Outlet />
}
```

`src/routes/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, useFarmer } from '@/src/context/AppContext'

export function ProtectedRoute({ allowNewUser = false }: { allowNewUser?: boolean }) {
  const auth = useAuth()
  const farmer = useFarmer()
  if (!auth.isAuthenticated) return <Navigate to='/' replace />
  if (allowNewUser && farmer) return <Navigate to='/home' replace />
  if (!allowNewUser && !farmer) return <Navigate to='/registration' replace />
  return <Outlet />
}
```

- [ ] **Step 7: Replace `src/App.tsx`**

```tsx
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingState } from '@/src/components/common/ErrorStates'
import { AppProvider } from '@/src/context/AppContext'
import NotFound from '@/src/pages/NotFound'
import { ProtectedRoute } from '@/src/routes/ProtectedRoute'
import { PublicRoute } from '@/src/routes/PublicRoute'

const Welcome = lazy(() => import('@/src/pages/onboarding/Welcome'))
const PhoneEntry = lazy(() => import('@/src/pages/onboarding/PhoneEntry'))
const OtpVerification = lazy(() => import('@/src/pages/onboarding/OtpVerification'))
const Registration = lazy(() => import('@/src/pages/onboarding/Registration'))
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
const PayoutNotification = lazy(() => import('@/src/pages/payout/PayoutNotification'))
const PayoutDetails = lazy(() => import('@/src/pages/payout/PayoutDetails'))
const PayoutHistory = lazy(() => import('@/src/pages/payout/PayoutHistory'))
const Profile = lazy(() => import('@/src/pages/profile/Profile'))
const Policies = lazy(() => import('@/src/pages/profile/Policies'))
const PolicyDetail = lazy(() => import('@/src/pages/profile/PolicyDetail'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
```

- [ ] **Step 8: Replace `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import App from '@/src/App'

test('renders the first screen inside the app shell', async () => {
  render(<App />)
  expect(await screen.findByRole('main')).toBeInTheDocument()
})
```

- [ ] **Step 9: Run tests and build**

Run: `npm test`
Expected: PASS (all suites).

Run: `npm run build`
Expected: builds; `dist/assets` contains one chunk per page.

- [ ] **Step 10: Commit**

```bash
npm run format
git add src
git commit -m "feat: add route table with guards, lazy page stubs and Not Found"
```

---
### Task 14: Onboarding — Welcome, phone, OTP, registration

**Files:**
- Create: `src/components/forms/forms.module.css`, `src/components/forms/Field.tsx`, `src/components/forms/OtpInput.tsx`, `src/components/forms/CropPicker.tsx`
- Replace stubs: `src/pages/onboarding/Welcome.tsx`, `src/pages/onboarding/PhoneEntry.tsx`, `src/pages/onboarding/OtpVerification.tsx`, `src/pages/onboarding/Registration.tsx`
- Modify: `src/i18n/en.ts`, `src/pages/pages.module.css` (append), `src/test/renderWithApp.tsx` (route may carry `state`), `src/utils/format.ts` + `src/utils/format.test.ts` (phone grouping)
- Test: `src/components/forms/forms.test.tsx`, `src/pages/onboarding/onboarding.test.tsx`

**Interfaces:**
- Consumes: `sendOtp`, `verifyOtp`, `register` (Task 9); `normalizeKenyanPhone`, `isValidName`, `isValidNationalId` (Task 3); `formatPhone` (Task 3); adds `groupLocalPhone(input: string): string` to `src/utils/format.ts`; `COUNTIES`, `CROP_LIST` (Task 2); `useApp` (Task 8); common components (Task 12); illustrations (Task 12).
- Produces:
  - `<Field id: string label: string error?: string hint?: string>children</Field>` (error rendered with `role="alert"`)
  - `<OtpInput value: string onChange: (v: string) => void length?: number error?: boolean errorKey?: number />` (inputs labelled `Digit 1`…`Digit 6`)
  - `<CropPicker value: Crop | null onChange: (c: Crop) => void label: string />` (`role="radiogroup"`, options `role="radio"`)
  - Navigation contract: PhoneEntry → `navigate('/otp-verification', { state: { phone, hint } })`; OTP page without `state.phone` → `<Navigate to='/phone-entry' replace />`.
  - `renderWithApp` `route` option accepts `string | { pathname: string; state?: unknown }`.
  - CSS classes appended to `forms.module.css`: `input`, `label`, `error`, `hint`, `phoneRow`, `prefix`, `otpRow`, `otpBox`, `shake`, `cropGrid`, `cropTile`, `selectBtn`, `listBtn`.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'welcome.tagline': 'Crop insurance for Kenyan farmers',
  'welcome.slide1.title': 'Protect your harvest',
  'welcome.slide1.body': 'If drought or floods ruin your crop, you get money to plant again.',
  'welcome.slide2.title': 'We watch your farm from space',
  'welcome.slide2.body': 'Satellites check your crop health and rainfall every week. No farm visits needed.',
  'welcome.slide3.title': 'Get paid automatically to M-Pesa',
  'welcome.slide3.body': 'When harvests in your area fall, your payout goes straight to your phone.',
  'welcome.start': 'Get started',
  'welcome.haveAccount': 'I already have an account',
  'welcome.slideOf': 'Slide {n} of {total}',
  'phone.title': 'What is your phone number?',
  'phone.body': 'We will send you a code by SMS. Use your M-Pesa number.',
  'phone.label': 'Phone number',
  'phone.placeholder': '712 345 678',
  'phone.error': 'Enter a Safaricom or Airtel number, like 712 345 678',
  'phone.demoHint': 'Demo: use 712 345 678 to see a farmer who already has farms.',
  'otp.title': 'Enter your code',
  'otp.body': 'We sent a 6-digit code to {phone}',
  'otp.demo': 'Demo code: {code}',
  'otp.error': 'That code is not right. Check the SMS and try again.',
  'otp.resend': 'Resend code',
  'otp.resendIn': 'Resend code in {s}s',
  'otp.verifying': 'Checking…',
  'otp.digit': 'Digit {n}',
  'otp.changeNumber': 'Change number',
  'reg.title': 'Tell us about you',
  'reg.body': 'This sets up your insurance account.',
  'reg.name': 'Full name',
  'reg.namePlaceholder': 'e.g. Wanjiru Kamau',
  'reg.nameError': 'Enter your full name',
  'reg.county': 'County',
  'reg.countyChoose': 'Choose your county',
  'reg.countyError': 'Choose your county',
  'reg.countySearch': 'Search counties',
  'reg.noCounty': 'No county matches "{q}"',
  'reg.id': 'National ID number',
  'reg.idError': 'Your ID number has 7 or 8 digits',
  'reg.crop': 'Main crop',
  'reg.cropError': 'Choose your main crop',
  'reg.submit': 'Create my account',
```

- [ ] **Step 2: Let `renderWithApp` routes carry state** — in `src/test/renderWithApp.tsx` change the option type:

```tsx
    route?: string | { pathname: string; state?: unknown }
```

(the `initialEntries={[route]}` line stays the same; `MemoryRouter` accepts both forms).

- [ ] **Step 2b: Group phone digits as the farmer types**

Add to `src/utils/format.test.ts`:

```ts
import { groupLocalPhone } from '@/src/utils/format'

test.each([
  ['712345678', '712 345 678'],
  ['0712345678', '0712 345 678'],
  ['+254712345678', '712 345 678'],
  ['7123', '712 3'],
  ['71234567890', '712 345 678'],
])('groupLocalPhone(%s)', (input, expected) => {
  expect(groupLocalPhone(input)).toBe(expected)
})
```

(Merge the import into the existing import list.) Run `npm test -- src/utils/format` — expect FAIL, then append to `src/utils/format.ts`:

```ts
/** Formats the local part of a Kenyan number in groups as it is typed: 712 345 678 / 0712 345 678. */
export function groupLocalPhone(input: string): string {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('254')) d = d.slice(3)
  d = d.slice(0, d.startsWith('0') ? 10 : 9)
  const head = d.startsWith('0') ? 4 : 3
  return [d.slice(0, head), d.slice(head, head + 3), d.slice(head + 3)].filter(Boolean).join(' ')
}
```

Run `npm test -- src/utils/format` — expect PASS.

- [ ] **Step 3: Write the failing form tests `src/components/forms/forms.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CropPicker } from '@/src/components/forms/CropPicker'
import { Field } from '@/src/components/forms/Field'
import { OtpInput } from '@/src/components/forms/OtpInput'
import type { Crop } from '@/src/types'

function OtpHarness({ onDone }: { onDone: (v: string) => void }) {
  const [v, setV] = useState('')
  return (
    <OtpInput
      value={v}
      onChange={(next) => {
        setV(next)
        onDone(next)
      }}
    />
  )
}

test('OtpInput moves focus as digits are typed and ignores letters', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('12a3456')
  expect(onDone).toHaveBeenLastCalledWith('123456')
  expect(screen.getByLabelText('Digit 6')).toHaveValue('6')
})

test('OtpInput backspace clears the previous digit', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('12{Backspace}')
  expect(onDone).toHaveBeenLastCalledWith('1')
})

test('OtpInput accepts a pasted code', async () => {
  const user = userEvent.setup()
  const onDone = vi.fn()
  render(<OtpHarness onDone={onDone} />)
  await user.click(screen.getByLabelText('Digit 1'))
  await user.paste('123-456')
  expect(onDone).toHaveBeenLastCalledWith('123456')
})

test('CropPicker is a radio group', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn<(c: Crop) => void>()
  render(<CropPicker value='beans' onChange={onChange} label='Main crop' />)
  expect(screen.getByRole('radiogroup', { name: 'Main crop' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /beans/i })).toHaveAttribute('aria-checked', 'true')
  await user.click(screen.getByRole('radio', { name: /tea/i }))
  expect(onChange).toHaveBeenCalledWith('tea')
})

test('Field links its label and shows errors as alerts', () => {
  render(
    <Field id='n' label='Name' error='Required'>
      <input id='n' />
    </Field>,
  )
  expect(screen.getByLabelText('Name')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Required')
})
```

Run: `npm test -- src/components/forms`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create `src/components/forms/forms.module.css`**

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-weight: 700;
}
.input {
  min-height: 52px;
  width: 100%;
  border: 2px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 0 var(--sp-4);
  font-size: var(--fs-lg);
}
.input:focus {
  border-color: var(--green-700);
  outline: none;
}
.input[aria-invalid='true'] {
  border-color: var(--danger);
}
.error {
  color: var(--danger);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.hint {
  color: var(--ink-3);
  font-size: var(--fs-sm);
}

.phoneRow {
  display: flex;
  gap: var(--sp-2);
}
.prefix {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius);
  background: var(--green-100);
  color: var(--green-900);
  font-weight: 800;
  font-size: var(--fs-lg);
}

.otpRow {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--sp-2);
}
.otpBox {
  height: 60px;
  width: 100%;
  text-align: center;
  font-size: var(--fs-2xl);
  font-weight: 800;
  border: 2px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}
.otpBox:focus {
  border-color: var(--green-700);
  outline: none;
}
.otpError .otpBox {
  border-color: var(--danger);
}
.shake {
  animation: shake 360ms var(--ease);
}
@keyframes shake {
  20%,
  60% {
    transform: translateX(-8px);
  }
  40%,
  80% {
    transform: translateX(8px);
  }
}

.cropGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
}
.cropTile {
  min-height: 96px;
  border: 2px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 700;
  color: var(--ink-2);
  cursor: pointer;
}
.cropTile[aria-checked='true'] {
  border-color: var(--green-700);
  background: var(--green-100);
  color: var(--green-900);
}

.selectBtn {
  composes: input;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
}
.listBtn {
  width: 100%;
  min-height: var(--tap);
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  text-align: left;
  font-size: var(--fs-md);
  padding: 0 var(--sp-2);
  cursor: pointer;
}
.list {
  max-height: 50vh;
  overflow-y: auto;
  margin-top: var(--sp-3);
}
```

- [ ] **Step 5: Create the form components**

`src/components/forms/Field.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from '@/src/components/forms/forms.module.css'

interface Props {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ id, label, error, hint, children }: Props) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && (
        <span id={`${id}-error`} role='alert' className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}
```

`src/components/forms/OtpInput.tsx`:

```tsx
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import styles from '@/src/components/forms/forms.module.css'
import { t } from '@/src/i18n'

interface Props {
  value: string
  onChange: (v: string) => void
  length?: number
  error?: boolean
  /** change this number to replay the shake animation */
  errorKey?: number
}

export function OtpInput({ value, onChange, length = 6, error, errorKey = 0 }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  // Focus moves synchronously, before React re-renders with the new value,
  // so onFocus must read the value we just emitted rather than the prop.
  const latest = useRef(value)
  latest.current = value
  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus()
  const emit = (next: string) => {
    latest.current = next
    onChange(next)
  }

  const handleInput = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) return
    emit((value.slice(0, i) + digit + value.slice(i + 1)).slice(0, length))
    focusAt(i + 1)
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace') return
    e.preventDefault()
    if (value[i]) {
      emit(value.slice(0, i) + value.slice(i + 1))
    } else if (i > 0) {
      emit(value.slice(0, i - 1))
      focusAt(i - 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    emit(digits)
    focusAt(digits.length)
  }

  return (
    <div
      key={errorKey}
      className={`${styles.otpRow} ${error ? `${styles.otpError} ${styles.shake}` : ''}`}
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className={styles.otpBox}
          aria-label={t('otp.digit', { n: i + 1 })}
          inputMode='numeric'
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => {
            if (i > latest.current.length) focusAt(latest.current.length)
          }}
        />
      ))}
    </div>
  )
}
```

`src/components/forms/CropPicker.tsx`:

```tsx
import { Icon, CROP_ICON } from '@/src/components/common/Icons'
import styles from '@/src/components/forms/forms.module.css'
import { CROP_LIST } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import type { Crop } from '@/src/types'

interface Props {
  value: Crop | null
  onChange: (c: Crop) => void
  label: string
}

export function CropPicker({ value, onChange, label }: Props) {
  return (
    <div role='radiogroup' aria-label={label} className={styles.cropGrid}>
      {CROP_LIST.map((crop) => (
        <button
          key={crop}
          type='button'
          role='radio'
          aria-checked={value === crop}
          className={styles.cropTile}
          onClick={() => onChange(crop)}
        >
          <Icon name={CROP_ICON[crop]} size={36} />
          {t(`crop.${crop}`)}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Run form tests**

Run: `npm test -- src/components/forms`
Expected: PASS.

- [ ] **Step 7: Append page styles** to `src/pages/pages.module.css`:

```css
.welcome {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-2);
  color: var(--green-700);
  font-weight: 800;
  font-size: var(--fs-xl);
}
.slides {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  flex: 1;
}
.slides::-webkit-scrollbar {
  display: none;
}
.slide {
  flex: 0 0 100%;
  scroll-snap-align: center;
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.slideArt {
  border-radius: var(--radius-lg);
  overflow: hidden;
  width: 100%;
  aspect-ratio: 3 / 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--green-100);
}
.slideArt svg {
  width: 100%;
  height: 100%;
}
.dots {
  display: flex;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
}
.dotBtn {
  width: 28px;
  height: 28px;
  border: 0;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.dotBtn span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--line);
  transition: transform 200ms var(--ease);
}
.dotBtn[aria-current='true'] span {
  background: var(--green-700);
  transform: scaleX(2.2);
}
.banner {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--radius);
  background: var(--gold-100);
  color: var(--soil-700);
  font-weight: 600;
}
```

- [ ] **Step 8: Write the failing page tests `src/pages/onboarding/onboarding.test.tsx`**

```tsx
import { screen, within } from '@testing-library/react'
import { initialState } from '@/src/context/reducer'
import { STATE_KEY } from '@/src/context/persistence'
import OtpVerification from '@/src/pages/onboarding/OtpVerification'
import PhoneEntry from '@/src/pages/onboarding/PhoneEntry'
import Registration from '@/src/pages/onboarding/Registration'
import Welcome from '@/src/pages/onboarding/Welcome'
import { renderWithApp } from '@/src/test/renderWithApp'

test('Welcome shows the value story and starts sign-up', async () => {
  const { user } = renderWithApp(<Welcome />)
  expect(screen.getByText('Protect your harvest')).toBeInTheDocument()
  expect(screen.getByText('We watch your farm from space')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Get started' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/phone-entry')
})

test('PhoneEntry rejects a bad number', async () => {
  const { user } = renderWithApp(<PhoneEntry />, { route: '/phone-entry', path: '/phone-entry' })
  await user.type(screen.getByLabelText('Phone number'), '812')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Safaricom or Airtel')
})

test('PhoneEntry accepts a number with a leading 0 and spaces', async () => {
  const { user } = renderWithApp(<PhoneEntry />, { route: '/phone-entry', path: '/phone-entry' })
  await user.type(screen.getByLabelText('Phone number'), '0712 345 678')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(await screen.findByTestId('location')).toHaveTextContent('/otp-verification')
})

const otpRoute = (phone: string) => ({
  route: { pathname: '/otp-verification', state: { phone, hint: '123456' } },
  path: '/otp-verification',
})

test('OTP without a phone goes back to phone entry', () => {
  renderWithApp(<OtpVerification />, { route: '/otp-verification', path: '/otp-verification' })
  expect(screen.getByTestId('location')).toHaveTextContent('/phone-entry')
})

test('OTP shows the demo code and rejects a wrong code', async () => {
  const { user } = renderWithApp(<OtpVerification />, otpRoute('+254712345678'))
  expect(screen.getByText('Demo code: 123456')).toBeInTheDocument()
  expect(screen.getByText(/\+254 712 345 678/)).toBeInTheDocument()
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('000000')
  expect(await screen.findByRole('alert')).toHaveTextContent('not right')
  expect(screen.getByLabelText('Digit 1')).toHaveValue('')
})

test('OTP for the seeded farmer goes home', async () => {
  const { user } = renderWithApp(<OtpVerification />, otpRoute('+254712345678'))
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('123456')
  expect(await screen.findByTestId('location')).toHaveTextContent('/home')
})

test('OTP for a new number goes to registration', async () => {
  const { user } = renderWithApp(<OtpVerification />, otpRoute('+254700000001'))
  await user.click(screen.getByLabelText('Digit 1'))
  await user.keyboard('123456')
  expect(await screen.findByTestId('location')).toHaveTextContent('/registration')
})

test('OTP resend is locked during the countdown', () => {
  renderWithApp(<OtpVerification />, otpRoute('+254700000001'))
  expect(screen.getByRole('button', { name: /resend code in 30s/i })).toBeDisabled()
})

const newUser = {
  ...initialState,
  auth: { isAuthenticated: true, phone: '+254700000001', isNewUser: true },
}

test('Registration validates every field', async () => {
  const { user } = renderWithApp(<Registration />, { route: '/registration', path: '/registration', state: newUser })
  await user.click(screen.getByRole('button', { name: 'Create my account' }))
  const alerts = screen.getAllByRole('alert').map((a) => a.textContent)
  expect(alerts).toEqual([
    'Enter your full name',
    'Choose your county',
    'Your ID number has 7 or 8 digits',
    'Choose your main crop',
  ])
})

test('Registration creates the farmer and goes home', async () => {
  const { user } = renderWithApp(<Registration />, { route: '/registration', path: '/registration', state: newUser })
  await user.type(screen.getByLabelText('Full name'), 'Otieno Ouma')
  await user.click(screen.getByRole('button', { name: /county/i }))
  const sheet = screen.getByRole('dialog')
  await user.type(within(sheet).getByLabelText('Search counties'), 'kisu')
  await user.click(within(sheet).getByRole('button', { name: 'Kisumu' }))
  await user.type(screen.getByLabelText('National ID number'), '1234567')
  await user.click(screen.getByRole('radio', { name: /maize/i }))
  await user.click(screen.getByRole('button', { name: 'Create my account' }))
  expect(await screen.findByTestId('location')).toHaveTextContent('/home')
  expect(localStorage.getItem(STATE_KEY)).toContain('Otieno Ouma')
})
```

Run: `npm test -- src/pages/onboarding`
Expected: FAIL — stubs render placeholders only.

- [ ] **Step 9: Implement `src/pages/onboarding/Welcome.tsx`**

```tsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Icon } from '@/src/components/common/Icons'
import { HeroFarm, PhonePay, SatelliteScene } from '@/src/components/common/Illustrations'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'

const SLIDES = [
  { art: HeroFarm, title: t('welcome.slide1.title'), body: t('welcome.slide1.body') },
  { art: SatelliteScene, title: t('welcome.slide2.title'), body: t('welcome.slide2.body') },
  { art: PhonePay, title: t('welcome.slide3.title'), body: t('welcome.slide3.body') },
]

export default function Welcome() {
  const navigate = useNavigate()
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const onScroll = () => {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const goTo = (i: number) => {
    const el = track.current
    el?.scrollTo?.({ left: i * el.clientWidth, behavior: 'smooth' })
    setIndex(i)
  }

  return (
    <div className={`screen ${styles.welcome}`}>
      <div className={styles.brand}>
        <Icon name='shield' size={30} />
        {t('app.name')}
      </div>
      <p className='muted' style={{ margin: '0 var(--sp-4)' }}>
        {t('welcome.tagline')}
      </p>
      <main className={styles.slides} ref={track} onScroll={onScroll}>
        {SLIDES.map(({ art: Art, title, body }, i) => (
          <section
            key={title}
            className={styles.slide}
            aria-label={t('welcome.slideOf', { n: i + 1, total: SLIDES.length })}
          >
            <div className={styles.slideArt}>
              <Art />
            </div>
            <h2 className='h1'>{title}</h2>
            <p style={{ margin: 0, fontSize: 'var(--fs-lg)', color: 'var(--ink-2)' }}>{body}</p>
          </section>
        ))}
      </main>
      <div className={styles.dots}>
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type='button'
            className={styles.dotBtn}
            aria-label={t('welcome.slideOf', { n: i + 1, total: SLIDES.length })}
            aria-current={i === index}
            onClick={() => goTo(i)}
          >
            <span />
          </button>
        ))}
      </div>
      <div className='screen-footer'>
        <Button block onClick={() => navigate('/phone-entry')}>
          {t('welcome.start')}
        </Button>
        <Button block variant='ghost' onClick={() => navigate('/phone-entry')}>
          {t('welcome.haveAccount')}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Implement `src/pages/onboarding/PhoneEntry.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { t } from '@/src/i18n'
import { sendOtp } from '@/src/services/authService'
import { groupLocalPhone } from '@/src/utils/format'
import { normalizeKenyanPhone } from '@/src/utils/validation'

export default function PhoneEntry() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const phone = normalizeKenyanPhone(value)
    if (!phone) {
      setError(t('phone.error'))
      return
    }
    setLoading(true)
    const { hint } = await sendOtp(phone)
    navigate('/otp-verification', { state: { phone, hint } })
  }

  return (
    <Screen
      header={<Header back='/' />}
      footer={
        <Button block loading={loading} onClick={() => submit()}>
          {t('common.continue')}
        </Button>
      }
    >
      <form className='stack-lg' onSubmit={submit} noValidate>
        <div className='stack-sm'>
          <h1 className='h1'>{t('phone.title')}</h1>
          <p className='muted' style={{ fontSize: 'var(--fs-md)' }}>
            {t('phone.body')}
          </p>
        </div>
        <Field id='phone' label={t('phone.label')} error={error} hint={t('phone.demoHint')}>
          <div className={formStyles.phoneRow}>
            <span className={formStyles.prefix}>🇰🇪 +254</span>
            <input
              id='phone'
              className={formStyles.input}
              type='tel'
              inputMode='tel'
              autoComplete='tel-national'
              placeholder={t('phone.placeholder')}
              value={value}
              aria-invalid={!!error}
              aria-describedby={error ? 'phone-error' : undefined}
              autoFocus
              onChange={(e) => {
                setValue(groupLocalPhone(e.target.value))
                setError(undefined)
              }}
            />
          </div>
        </Field>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 11: Implement `src/pages/onboarding/OtpVerification.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import formStyles from '@/src/components/forms/forms.module.css'
import { OtpInput } from '@/src/components/forms/OtpInput'
import { useApp } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'
import { sendOtp, verifyOtp } from '@/src/services/authService'
import { formatPhone } from '@/src/utils/format'

const RESEND_SECONDS = 30

export default function OtpVerification() {
  const location = useLocation()
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const state = location.state as { phone?: string; hint?: string } | null
  const phone = state?.phone
  const [code, setCode] = useState('')
  const [hint, setHint] = useState(state?.hint ?? '')
  const [error, setError] = useState(false)
  const [errorKey, setErrorKey] = useState(0)
  const [checking, setChecking] = useState(false)
  const [seconds, setSeconds] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  useEffect(() => {
    if (!phone || code.length !== 6 || checking) return
    setChecking(true)
    verifyOtp(phone, code).then((result) => {
      setChecking(false)
      if (!result.ok) {
        setError(true)
        setErrorKey((k) => k + 1)
        setCode('')
        return
      }
      if (result.isNewUser) {
        dispatch({ type: 'LOGIN', phone, isNewUser: true })
        navigate('/registration', { replace: true })
      } else {
        dispatch({ type: 'LOGIN', phone, isNewUser: false, data: result.data })
        navigate('/home', { replace: true })
      }
    })
  }, [code, phone, checking, dispatch, navigate])

  if (!phone) return <Navigate to='/phone-entry' replace />

  const resend = async () => {
    setSeconds(RESEND_SECONDS)
    const r = await sendOtp(phone)
    setHint(r.hint)
  }

  return (
    <Screen header={<Header back='/phone-entry' />}>
      <div className='stack-lg'>
        <div className='stack-sm'>
          <h1 className='h1'>{t('otp.title')}</h1>
          <p style={{ margin: 0, fontSize: 'var(--fs-md)' }}>
            {t('otp.body', { phone: formatPhone(phone) })}
          </p>
        </div>
        {hint && (
          <div className={styles.banner}>
            <Icon name='phone' />
            {t('otp.demo', { code: hint })}
          </div>
        )}
        <OtpInput
          value={code}
          onChange={(v) => {
            setError(false)
            setCode(v)
          }}
          error={error}
          errorKey={errorKey}
        />
        {error && (
          <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
            {t('otp.error')}
          </p>
        )}
        {checking && <p className='muted'>{t('otp.verifying')}</p>}
        <div className='stack-sm'>
          <Button block variant='secondary' disabled={seconds > 0} onClick={resend}>
            {seconds > 0 ? t('otp.resendIn', { s: seconds }) : t('otp.resend')}
          </Button>
          <Button block variant='ghost' onClick={() => navigate('/phone-entry')}>
            {t('otp.changeNumber')}
          </Button>
        </div>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 12: Implement `src/pages/onboarding/Registration.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { CropPicker } from '@/src/components/forms/CropPicker'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { useApp } from '@/src/context/AppContext'
import { COUNTIES } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { register } from '@/src/services/authService'
import type { Crop } from '@/src/types'
import { isValidName, isValidNationalId } from '@/src/utils/validation'

type Errors = Partial<Record<'name' | 'county' | 'id' | 'crop', string>>

export default function Registration() {
  const navigate = useNavigate()
  const { state, dispatch } = useApp()
  const [name, setName] = useState('')
  const [county, setCounty] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [crop, setCrop] = useState<Crop | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const matches = COUNTIES.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()))

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const next: Errors = {}
    if (!isValidName(name)) next.name = t('reg.nameError')
    if (!county) next.county = t('reg.countyError')
    if (!isValidNationalId(nationalId)) next.id = t('reg.idError')
    if (!crop) next.crop = t('reg.cropError')
    setErrors(next)
    if (Object.keys(next).length || !crop || !state.auth.phone) return
    setSaving(true)
    const farmer = await register({
      phone: state.auth.phone,
      name,
      county,
      nationalId,
      primaryCrop: crop,
    })
    dispatch({ type: 'COMPLETE_REGISTRATION', farmer })
    navigate('/home', { replace: true })
  }

  return (
    <Screen
      footer={
        <Button block loading={saving} onClick={() => submit()}>
          {t('reg.submit')}
        </Button>
      }
    >
      <form className='stack-lg' onSubmit={submit} noValidate>
        <div className='stack-sm'>
          <h1 className='h1'>{t('reg.title')}</h1>
          <p className='muted' style={{ fontSize: 'var(--fs-md)' }}>
            {t('reg.body')}
          </p>
        </div>
        <Field id='name' label={t('reg.name')} error={errors.name}>
          <input
            id='name'
            className={formStyles.input}
            autoComplete='name'
            placeholder={t('reg.namePlaceholder')}
            value={name}
            aria-invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field id='county' label={t('reg.county')} error={errors.county}>
          <button
            id='county'
            type='button'
            className={formStyles.selectBtn}
            aria-invalid={!!errors.county}
            onClick={() => setSheetOpen(true)}
          >
            <span>{county || t('reg.countyChoose')}</span>
            <Icon name='chevron' />
          </button>
        </Field>
        <Field id='nid' label={t('reg.id')} error={errors.id}>
          <input
            id='nid'
            className={formStyles.input}
            inputMode='numeric'
            value={nationalId}
            aria-invalid={!!errors.id}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
        </Field>
        <div className='stack-sm'>
          <span className={formStyles.label}>{t('reg.crop')}</span>
          <CropPicker value={crop} onChange={setCrop} label={t('reg.crop')} />
          {errors.crop && (
            <span role='alert' className={formStyles.error}>
              {errors.crop}
            </span>
          )}
        </div>
      </form>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t('reg.county')}>
        <label htmlFor='county-search' className='sr-only'>
          {t('reg.countySearch')}
        </label>
        <input
          id='county-search'
          className={formStyles.input}
          placeholder={t('reg.countySearch')}
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={formStyles.list}>
          {matches.length === 0 && <p className='muted'>{t('reg.noCounty', { q: query })}</p>}
          {matches.map((c) => (
            <button
              key={c}
              type='button'
              className={formStyles.listBtn}
              onClick={() => {
                setCounty(c)
                setSheetOpen(false)
                setQuery('')
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </BottomSheet>
    </Screen>
  )
}
```

- [ ] **Step 13: Run tests**

Run: `npm test -- src/pages/onboarding src/components/forms`
Expected: PASS.

- [ ] **Step 14: Manual check in the browser**

Run: `npm run dev`, open `http://localhost:3000` with Chrome DevTools device toolbar at 360×740. Swipe the welcome slides; enter `0712 345 678`; type `123456`; confirm you land on `/home`. Clear site data, repeat with `0700 000 001` and finish registration.

- [ ] **Step 15: Commit**

```bash
npm run format
git add src
git commit -m "feat: add onboarding flow with phone, OTP and registration"
```

---
### Task 15: Home dashboard and farm cards

**Files:**
- Create: `src/components/common/statusColor.ts`, `src/components/map/FarmShape.tsx`, `src/components/cards/FarmCard.tsx`, `src/components/cards/cards.module.css`
- Replace stub: `src/pages/farm/Home.tsx`
- Modify: `src/i18n/en.ts`, `src/pages/pages.module.css` (append)
- Test: `src/pages/farm/Home.test.tsx`

**Interfaces:**
- Consumes: hooks (Task 8), `seriesFor`, `getWeather` (Task 9), `healthStatus`, `rainfallDeficitPct` (Task 6), `boundsOf` (Task 4), charts `Ring`, `Sparkline` (Task 10), common components (Task 12), `formatHa`, `formatKES` (Task 3).
- Produces:
  - `STATUS_COLOR: Record<Status, string>` (hex; Leaflet needs literal colours)
  - `<FarmShape boundary: LatLng[] status?: Status size?: number label?: string />` — SVG thumbnail, no Leaflet; decorative when `label` is omitted
  - `<FarmCard farm: Farm insured: boolean />` — a `Link` to `/farm/:id` whose accessible name starts with the farm name
  - helper `isInsured(policies: Policy[], farmId: string): boolean` exported from `FarmCard.tsx`

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'home.greeting': 'Hello, {name}',
  'home.weather': '{temp}°C · {rain}% chance of rain',
  'home.weather.sunny': 'Sunny today',
  'home.weather.cloudy': 'Cloudy today',
  'home.weather.rain': 'Rain likely today',
  'home.payoutBanner': 'You have a payout of {amount}',
  'home.payoutCta': 'See payout',
  'home.alertTitle': 'Your {crop} in {county} needs attention',
  'home.alertDry': 'Rain was {pct}% below normal in the last 4 weeks.',
  'home.alertGeneric': 'Crop health is dropping. Tap to see why.',
  'home.protection': 'Your protection',
  'home.insuredOf': '{insured} of {total} insured',
  'home.cover': 'Total cover {amount}',
  'home.insuredPct': 'insured',
  'home.insureCta': 'Insure {name}',
  'home.myFarms': 'My farms',
  'home.addFarm': 'Add farm',
  'home.emptyTitle': 'No farms yet',
  'home.emptyBody': 'Add your farm to see its health from space and get insured.',
  'home.quickInsure': 'Insure a farm',
  'home.quickPayouts': 'My payouts',
  'farm.insured': 'Insured',
  'farm.notInsured': 'Not insured',
  'farm.health': 'Health {score}',
  'farm.trend': 'Crop health trend for {name}',
  'farm.shape': 'Shape of {name}',
```

- [ ] **Step 2: Write the failing test `src/pages/farm/Home.test.tsx`**

```tsx
import { screen } from '@testing-library/react'
import Home from '@/src/pages/farm/Home'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('greets the farmer and shows weather', () => {
  renderWithApp(<Home />, { route: '/home', path: '/home', state: seededState() })
  expect(screen.getByText('Hello, Wanjiru')).toBeInTheDocument()
  expect(screen.getByText(/chance of rain/)).toBeInTheDocument()
})

test('shows the unread payout banner', async () => {
  const { user } = renderWithApp(<Home />, { route: '/home', path: '/home', state: seededState() })
  expect(screen.getByText('You have a payout of KES 10,800')).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: /see payout/i }))
  expect(screen.getByTestId('location')).toHaveTextContent('/payout/payout-beans')
})

test('alerts about the stressed beans farm', () => {
  renderWithApp(<Home />, { route: '/home', path: '/home', state: seededState() })
  expect(screen.getByText('Your Beans in Machakos needs attention')).toBeInTheDocument()
})

test('summarises protection and offers to insure the tea farm', () => {
  renderWithApp(<Home />, { route: '/home', path: '/home', state: seededState() })
  expect(screen.getByText('1.2 ha of 4 ha insured')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Insure Tea Garden' })).toHaveAttribute('href', '/insure/farm-tea')
})

test('lists farm cards that open the farm', async () => {
  const { user } = renderWithApp(<Home />, { route: '/home', path: '/home', state: seededState() })
  const cards = screen.getAllByRole('link', { name: /^(Lower Shamba|Machakos Plot|Tea Garden)/ })
  expect(cards).toHaveLength(3)
  await user.click(cards[0])
  expect(screen.getByTestId('location')).toHaveTextContent('/farm/farm-maize')
})

test('new farmer sees an empty state with Add farm', async () => {
  const s = seededState()
  const { user } = renderWithApp(<Home />, {
    route: '/home',
    path: '/home',
    state: { ...s, farms: [], policies: [], payouts: [] },
  })
  expect(screen.getByText('No farms yet')).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: 'Add farm' })[0])
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})
```

Note on the protection numbers: only the maize policy is `active` (beans is `claimed`), so 1.2 ha of 1.2 + 0.8 + 2 = 4 ha is insured.

Run: `npm test -- src/pages/farm/Home`
Expected: FAIL.

- [ ] **Step 3: Create `src/components/common/statusColor.ts`**

```ts
import type { Status } from '@/src/types'

/** Literal colours for places CSS variables cannot reach (Leaflet paths, SVG fills). */
export const STATUS_COLOR: Record<Status, string> = {
  good: '#2f9e5a',
  warning: '#c77700',
  danger: '#c62828',
}
```

- [ ] **Step 4: Create `src/components/map/FarmShape.tsx`**

```tsx
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import type { LatLng, Status } from '@/src/types'
import { boundsOf } from '@/src/utils/geo'

interface Props {
  boundary: LatLng[]
  status?: Status
  size?: number
  /** omit to make the shape decorative */
  label?: string
}

/** Lightweight farm outline for cards and lists — no map tiles needed. */
export function FarmShape({ boundary, status = 'good', size = 64, label }: Props) {
  if (boundary.length < 3) return null
  const [sw, ne] = boundsOf(boundary)
  const kx = Math.cos((sw[0] * Math.PI) / 180)
  const w = (ne[1] - sw[1]) * kx
  const h = ne[0] - sw[0]
  const span = Math.max(w, h) || 1
  const points = boundary
    .map(([lat, lng]) => {
      const x = 14 + 72 * (((lng - sw[1]) * kx + (span - w) / 2) / span)
      const y = 14 + 72 * ((ne[0] - lat + (span - h) / 2) / span)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const color = STATUS_COLOR[status]
  return (
    <svg
      viewBox='0 0 100 100'
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-status={status}
    >
      <rect width='100' height='100' rx='18' fill='#f4ece3' />
      {[20, 35, 50, 65, 80].map((y) => (
        <line key={y} x1='8' x2='92' y1={y} y2={y} stroke='#e6d8c6' strokeWidth='3' strokeLinecap='round' />
      ))}
      <polygon points={points} fill={color} fillOpacity='0.35' stroke={color} strokeWidth='4' strokeLinejoin='round' />
    </svg>
  )
}
```

- [ ] **Step 5: Create `src/components/cards/cards.module.css`**

```css
.farmCard {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: var(--sp-3);
  align-items: center;
}
.title {
  font-weight: 800;
  font-size: var(--fs-lg);
  line-height: 1.2;
}
.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-3);
  font-size: var(--fs-sm);
  margin: 2px 0 6px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.trend {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
```

- [ ] **Step 6: Create `src/components/cards/FarmCard.tsx`**

```tsx
import { Link } from 'react-router-dom'
import styles from '@/src/components/cards/cards.module.css'
import { Sparkline } from '@/src/components/charts/Sparkline'
import { Chip } from '@/src/components/common/Chip'
import { CROP_ICON, Icon } from '@/src/components/common/Icons'
import { FarmShape } from '@/src/components/map/FarmShape'
import { t } from '@/src/i18n'
import { seriesFor } from '@/src/services/monitorService'
import type { Farm, Policy } from '@/src/types'
import { formatHa } from '@/src/utils/format'
import { healthStatus } from '@/src/utils/monitor'

export function isInsured(policies: Policy[], farmId: string): boolean {
  return policies.some((p) => p.farmId === farmId && p.status === 'active')
}

export function FarmCard({ farm, insured }: { farm: Farm; insured: boolean }) {
  const status = healthStatus(farm.healthScore)
  const trend = seriesFor(farm).ndvi.slice(-8)
  return (
    <Link to={`/farm/${farm.id}`} className={`card card-tap ${styles.farmCard}`}>
      <FarmShape boundary={farm.boundary} status={status} />
      <div>
        <div className={styles.title}>{farm.name}</div>
        <div className={styles.meta}>
          <Icon name={CROP_ICON[farm.crop]} size={16} />
          {t(`crop.${farm.crop}`)} · {formatHa(farm.areaHa)} · {farm.county}
        </div>
        <div className={styles.chips}>
          <Chip status={insured ? 'good' : 'neutral'} icon={insured ? 'shield' : undefined}>
            {insured ? t('farm.insured') : t('farm.notInsured')}
          </Chip>
          <Chip status={status}>{t('farm.health', { score: farm.healthScore })}</Chip>
        </div>
      </div>
      <div className={styles.trend}>
        <Sparkline values={trend} status={status} label={t('farm.trend', { name: farm.name })} />
      </div>
    </Link>
  )
}
```

- [ ] **Step 7: Append page styles** to `src/pages/pages.module.css`:

```css
.greeting {
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) 0;
}
.weather {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  background: linear-gradient(120deg, var(--rain-100), var(--green-100));
  border-radius: var(--radius);
  padding: var(--sp-3) var(--sp-4);
}
.weatherIcon {
  color: var(--rain-600);
}
.payoutBanner {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--radius);
  background: linear-gradient(120deg, var(--gold-500), #f2c45a);
  color: var(--ink);
  text-decoration: none;
  font-weight: 800;
}
.alertCard {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--radius);
  background: var(--warning-bg);
  color: var(--ink);
  text-decoration: none;
  border-left: 6px solid var(--warning);
}
.alertCard[data-status='danger'] {
  background: var(--danger-bg);
  border-left-color: var(--danger);
}
.protect {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.sectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--sp-5);
}
.quickGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
}
.quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--sp-3) var(--sp-2);
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  text-decoration: none;
  color: var(--green-900);
  font-weight: 700;
  font-size: var(--fs-sm);
  text-align: center;
}
.quick svg {
  color: var(--green-700);
}
```

- [ ] **Step 8: Implement `src/pages/farm/Home.tsx`**

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { FarmCard, isInsured } from '@/src/components/cards/FarmCard'
import { Ring } from '@/src/components/charts/Ring'
import { Button } from '@/src/components/common/Button'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarmer, useFarms, usePayouts, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'
import { getWeather, seriesFor } from '@/src/services/monitorService'
import { formatDate, formatHa, formatKES } from '@/src/utils/format'
import { healthStatus, rainfallDeficitPct } from '@/src/utils/monitor'

const WEATHER_ICON: Record<'sunny' | 'cloudy' | 'rain', IconName> = {
  sunny: 'sun',
  cloudy: 'cloud',
  rain: 'rain',
}

export default function Home() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const farms = useFarms()
  const policies = usePolicies()
  const payouts = usePayouts()
  if (!farmer) return null

  const weather = getWeather(farmer.county)
  const unread = payouts.find((p) => !p.read)
  const worst = [...farms]
    .filter((f) => healthStatus(f.healthScore) !== 'good')
    .sort((a, b) => a.healthScore - b.healthScore)[0]
  const deficit = worst ? rainfallDeficitPct(seriesFor(worst)) : 0
  const totalHa = farms.reduce((s, f) => s + f.areaHa, 0)
  const insuredFarms = farms.filter((f) => isInsured(policies, f.id))
  const insuredHa = insuredFarms.reduce((s, f) => s + f.areaHa, 0)
  const cover = policies.filter((p) => p.status === 'active').reduce((s, p) => s + p.sumInsuredKES, 0)
  // Prefer farms that have never been insured (the clearest upsell), then lapsed ones.
  const uninsured =
    farms.find((f) => !policies.some((p) => p.farmId === f.id)) ??
    farms.find((f) => !isInsured(policies, f.id))
  const pct = totalHa ? Math.round((insuredHa / totalHa) * 100) : 0

  return (
    <Screen nav>
      <div className='stack'>
        <div>
          <h1 className='h1'>{t('home.greeting', { name: farmer.name.split(' ')[0] })}</h1>
          <p className='muted' style={{ margin: '4px 0 0' }}>
            {formatDate(new Date().toISOString())} · {farmer.county}
          </p>
        </div>

        <div className={styles.weather}>
          <Icon name={WEATHER_ICON[weather.condition]} size={36} className={styles.weatherIcon} />
          <div>
            <div style={{ fontWeight: 800 }}>{t(`home.weather.${weather.condition}`)}</div>
            <div className='muted'>{t('home.weather', { temp: weather.tempC, rain: weather.rainChancePct })}</div>
          </div>
        </div>

        {unread && (
          <Link to={`/payout/${unread.id}`} className={styles.payoutBanner}>
            <Icon name='cash' size={32} />
            <span style={{ flex: 1 }}>{t('home.payoutBanner', { amount: formatKES(unread.amountKES) })}</span>
            <span className='sr-only'>{t('home.payoutCta')}</span>
            <Icon name='chevron' />
          </Link>
        )}

        {worst && (
          <Link to={`/monitor/${worst.id}`} className={styles.alertCard} data-status={healthStatus(worst.healthScore)}>
            <Icon name='alert' size={28} />
            <div>
              <div style={{ fontWeight: 800 }}>
                {t('home.alertTitle', { crop: t(`crop.${worst.crop}`), county: worst.county })}
              </div>
              <div>{deficit > 0 ? t('home.alertDry', { pct: deficit }) : t('home.alertGeneric')}</div>
            </div>
          </Link>
        )}

        {farms.length > 0 && (
          <section className='card stack-sm'>
            <h2 className='h3'>{t('home.protection')}</h2>
            <div className={styles.protect}>
              <Ring
                value={pct}
                label={`${pct}%`}
                sublabel={t('home.insuredPct')}
                status={pct >= 70 ? 'good' : pct > 0 ? 'warning' : 'danger'}
                ariaLabel={`${pct}% ${t('home.insuredPct')}`}
              />
              <div className='stack-sm'>
                <div style={{ fontWeight: 700 }}>
                  {t('home.insuredOf', { insured: formatHa(insuredHa), total: formatHa(totalHa) })}
                </div>
                <div className='muted'>{t('home.cover', { amount: formatKES(cover) })}</div>
                {uninsured && (
                  <Link to={`/insure/${uninsured.id}`} className='btn btn-secondary'>
                    {t('home.insureCta', { name: uninsured.name })}
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        <div className={styles.sectionHead}>
          <h2 className='h2'>{t('home.myFarms')}</h2>
          {farms.length > 0 && (
            <Button variant='ghost' icon='plus' onClick={() => navigate('/add-farm')}>
              {t('home.addFarm')}
            </Button>
          )}
        </div>

        {farms.length === 0 ? (
          <EmptyState
            title={t('home.emptyTitle')}
            message={t('home.emptyBody')}
            action={
              <Button block icon='plus' onClick={() => navigate('/add-farm')}>
                {t('home.addFarm')}
              </Button>
            }
          />
        ) : (
          <div className='stack-sm'>
            {farms.map((f) => (
              <FarmCard key={f.id} farm={f} insured={isInsured(policies, f.id)} />
            ))}
          </div>
        )}

        {farms.length > 0 && (
          <div className={styles.quickGrid}>
            <Link to='/add-farm' className={styles.quick}>
              <Icon name='plus' />
              {t('home.addFarm')}
            </Link>
            <Link to={uninsured ? `/insure/${uninsured.id}` : '/policies'} className={styles.quick}>
              <Icon name='shield' />
              {t('home.quickInsure')}
            </Link>
            <Link to='/payouts' className={styles.quick}>
              <Icon name='cash' />
              {t('home.quickPayouts')}
            </Link>
          </div>
        )}
      </div>
    </Screen>
  )
}
```

- [ ] **Step 9: Run tests**

Run: `npm test -- src/pages/farm/Home`
Expected: PASS. (The farm-card regex anchors on the start of the accessible name, so the "Insure Tea Garden" and quick-action links are not counted.)

- [ ] **Step 10: Commit**

```bash
npm run format
git add src
git commit -m "feat: add home dashboard with protection ring, alerts and farm cards"
```

---

### Task 16: Farm detail and add/edit farm form

**Files:**
- Replace stubs: `src/pages/farm/FarmDetail.tsx`, `src/pages/farm/AddFarm.tsx`
- Modify: `src/i18n/en.ts`, `src/pages/pages.module.css` (append)
- Test: `src/pages/farm/FarmDetail.test.tsx`, `src/pages/farm/AddFarm.test.tsx`

**Interfaces:**
- Consumes: `useFarm`, `usePolicyForFarm`, `useFarmForm`, `useApp` (Task 8); `updateFarm` (Task 9); `buildQuote` (Task 5); `SEASON_WINDOWS`, `PLANS` (Task 2); `Ring`, `FarmShape`, `Chip`, `CropPicker`, `Field`; `NotFound` page (Task 13).
- Produces:
  - `/farm/:farmId` page; unknown id renders `NotFound`.
  - `/add-farm` stepped form (name → crop → season → planting date) that ends at `/boundary-intro` with `farmForm` filled (`editingFarmId: null`).
  - `/edit-farm/:farmId` same steps prefilled; final button `Save changes` updates the farm and returns to `/farm/:farmId`.
  - `<SeasonCard season selected onSelect />` local to `AddFarm.tsx`.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'farm.edit': 'Edit farm',
  'farm.areaLabel': 'Size',
  'farm.planted': 'Planted {date}',
  'farm.healthTitle': 'Farm health',
  'farm.seeHealth': 'See farm health',
  'farm.policyTitle': 'Insurance',
  'farm.coverage': '{start} – {end}',
  'farm.cover': 'Cover {amount}',
  'farm.protectTitle': 'Protect this farm',
  'farm.protectBody': 'Cover from {amount} per season. If harvests in your area fail, you get paid to M-Pesa.',
  'farm.protectCta': 'See insurance options',
  'farm.viewBoundary': 'View boundary on map',
  'farm.yield': 'Past harvests and risk',
  'farm.viewPolicy': 'View policy',
  'policyStatus.active': 'Active',
  'policyStatus.expired': 'Expired',
  'policyStatus.claimed': 'Paid out',
  'addFarm.title': 'Add a farm',
  'editFarm.title': 'Edit farm',
  'addFarm.step': 'Step {n} of {total}',
  'addFarm.name': 'What do you call this farm?',
  'addFarm.nameLabel': 'Farm name',
  'addFarm.nameHint': 'e.g. Lower Shamba, River plot',
  'addFarm.nameError': 'Give your farm a name',
  'addFarm.crop': 'What are you growing?',
  'addFarm.cropError': 'Choose a crop',
  'addFarm.season': 'Which season?',
  'addFarm.seasonError': 'Choose a season',
  'addFarm.planting': 'When did you plant, or when will you?',
  'addFarm.plantingLabel': 'Planting date',
  'addFarm.plantingError': 'Choose a date',
  'addFarm.next': 'Next',
  'addFarm.toBoundary': 'Next: mark your farm',
  'editFarm.save': 'Save changes',
```

- [ ] **Step 2: Append page styles** to `src/pages/pages.module.css`:

```css
.farmHero {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  background: linear-gradient(135deg, var(--green-100), var(--soil-100));
  border-radius: var(--radius-lg);
  padding: var(--sp-4);
}
.facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
}
.fact {
  background: var(--surface);
  border-radius: var(--radius);
  padding: var(--sp-3);
}
.factLabel {
  color: var(--ink-3);
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.factValue {
  font-weight: 800;
}
.linkRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 var(--sp-4);
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  text-decoration: none;
  color: var(--ink);
  font-weight: 700;
}
.linkRow + .linkRow {
  margin-top: var(--sp-2);
}
.progress {
  height: 8px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}
.progressFill {
  height: 100%;
  width: 100%;
  background: var(--green-500);
  transform-origin: left;
  transition: transform 300ms var(--ease);
}
.seasonCard {
  width: 100%;
  text-align: left;
  border: 2px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: var(--sp-4);
  cursor: pointer;
}
.seasonCard[aria-checked='true'] {
  border-color: var(--green-700);
  background: var(--green-100);
}
.months {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
  margin-top: var(--sp-3);
}
.month {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 0;
  border-radius: 6px;
  background: var(--bg);
  color: var(--ink-3);
}
.month[data-on='true'] {
  background: var(--rain-400);
  color: #fff;
}
```

- [ ] **Step 3: Write the failing tests**

`src/pages/farm/FarmDetail.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import FarmDetail from '@/src/pages/farm/FarmDetail'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

const at = (id: string) => ({ route: `/farm/${id}`, path: '/farm/:farmId', state: seededState() })

test('shows an insured farm with its policy', () => {
  renderWithApp(<FarmDetail />, at('farm-maize'))
  expect(screen.getByRole('heading', { name: 'Lower Shamba' })).toBeInTheDocument()
  expect(screen.getByText('Standard')).toBeInTheDocument()
  expect(screen.getByText('Cover KES 100,800')).toBeInTheDocument()
  expect(screen.getByText('Active')).toBeInTheDocument()
})

test('offers insurance for an uninsured farm', async () => {
  const { user } = renderWithApp(<FarmDetail />, at('farm-tea'))
  expect(screen.getByText('Protect this farm')).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'See insurance options' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/insure/farm-tea')
})

test('links to health, boundary and yield', () => {
  renderWithApp(<FarmDetail />, at('farm-beans'))
  expect(screen.getByRole('link', { name: /see farm health/i })).toHaveAttribute('href', '/monitor/farm-beans')
  expect(screen.getByRole('link', { name: /view boundary/i })).toHaveAttribute('href', '/view-boundary/farm-beans')
  expect(screen.getByRole('link', { name: /past harvests/i })).toHaveAttribute('href', '/yield-analysis/farm-beans')
})

test('unknown farm shows Not Found', () => {
  renderWithApp(<FarmDetail />, at('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
```

`src/pages/farm/AddFarm.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { STATE_KEY } from '@/src/context/persistence'
import AddFarm from '@/src/pages/farm/AddFarm'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('add flow validates each step and ends at boundary intro', async () => {
  const { user } = renderWithApp(<AddFarm />, { route: '/add-farm', path: '/add-farm', state: seededState() })
  expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Give your farm a name')
  await user.type(screen.getByLabelText('Farm name'), 'River plot')
  await user.click(screen.getByRole('button', { name: 'Next' }))

  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a crop')
  await user.click(screen.getByRole('radio', { name: /beans/i }))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  await user.click(screen.getByRole('radio', { name: /short rains/i }))
  await user.click(screen.getByRole('button', { name: 'Next' }))

  expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
  await user.clear(screen.getByLabelText('Planting date'))
  await user.type(screen.getByLabelText('Planting date'), '2026-10-12')
  await user.click(screen.getByRole('button', { name: 'Next: mark your farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/boundary-intro')
  expect(localStorage.getItem(STATE_KEY)).toContain('River plot')
})

test('edit flow is prefilled and saves the farm', async () => {
  const { user } = renderWithApp(<AddFarm />, {
    route: '/edit-farm/farm-maize',
    path: '/edit-farm/:farmId',
    state: seededState(),
  })
  const name = screen.getByLabelText('Farm name')
  expect(name).toHaveValue('Lower Shamba')
  await user.clear(name)
  await user.type(name, 'Upper Shamba')
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByTestId('location')).toHaveTextContent('/farm/farm-maize')
  expect(localStorage.getItem(STATE_KEY)).toContain('Upper Shamba')
})

test('editing an unknown farm shows Not Found', () => {
  renderWithApp(<AddFarm />, { route: '/edit-farm/nope', path: '/edit-farm/:farmId', state: seededState() })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
```

Run: `npm test -- src/pages/farm/FarmDetail src/pages/farm/AddFarm`
Expected: FAIL.

- [ ] **Step 4: Implement `src/pages/farm/FarmDetail.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom'
import { Ring } from '@/src/components/charts/Ring'
import { Chip } from '@/src/components/common/Chip'
import { Header } from '@/src/components/common/Header'
import { CROP_ICON, Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { FarmShape } from '@/src/components/map/FarmShape'
import { useFarm, usePolicyForFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/pages.module.css'
import type { PolicyStatus } from '@/src/types'
import { formatAcres, formatDate, formatHa, formatKES } from '@/src/utils/format'
import { buildQuote } from '@/src/utils/insurance'
import { healthStatus } from '@/src/utils/monitor'

const POLICY_CHIP: Record<PolicyStatus, 'good' | 'neutral' | 'warning'> = {
  active: 'good',
  expired: 'neutral',
  claimed: 'warning',
}

export default function FarmDetail() {
  const { farmId } = useParams()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  if (!farm) return <NotFound />

  const status = healthStatus(farm.healthScore)
  const insuredNow = policy?.status === 'active'
  const fromPremium = buildQuote(farm, 'basic').farmerPremiumKES

  return (
    <Screen
      header={
        <Header
          back='/home'
          right={
            <Link to={`/edit-farm/${farm.id}`} className='btn btn-ghost'>
              {t('farm.edit')}
            </Link>
          }
        />
      }
    >
      <div className='stack'>
        <div className={styles.farmHero}>
          <FarmShape boundary={farm.boundary} status={status} size={104} label={t('farm.shape', { name: farm.name })} />
          <div className='stack-sm'>
            <h1 className='h2'>{farm.name}</h1>
            <div className='row' style={{ gap: 6 }}>
              <Icon name={CROP_ICON[farm.crop]} size={20} />
              {t(`crop.${farm.crop}`)}
            </div>
            <div className='muted'>{farm.county}</div>
          </div>
        </div>

        <div className={styles.facts}>
          <div className={styles.fact}>
            <div className={styles.factLabel}>{t('farm.areaLabel')}</div>
            <div className={styles.factValue}>{formatHa(farm.areaHa)}</div>
            <div className='muted'>{formatAcres(farm.areaHa)}</div>
          </div>
          <div className={styles.fact}>
            <div className={styles.factLabel}>{t(`season.${farm.season}`)}</div>
            <div className={styles.factValue}>{t('farm.planted', { date: formatDate(farm.plantingDate) })}</div>
          </div>
        </div>

        <section className='card row'>
          <Ring
            value={farm.healthScore}
            label={farm.healthScore}
            sublabel='/100'
            status={status}
            ariaLabel={t('farm.health', { score: farm.healthScore })}
          />
          <div className='stack-sm' style={{ flex: 1 }}>
            <h2 className='h3'>{t('farm.healthTitle')}</h2>
            <Chip status={status}>{t(`status.${status}`)}</Chip>
            <Link to={`/monitor/${farm.id}`}>{t('farm.seeHealth')}</Link>
          </div>
        </section>

        {policy && insuredNow ? (
          <section className='card stack-sm'>
            <div className='row-between'>
              <h2 className='h3'>{t('farm.policyTitle')}</h2>
              <Chip status={POLICY_CHIP[policy.status]}>{t(`policyStatus.${policy.status}`)}</Chip>
            </div>
            <div className='figure-sm'>{t(`plan.${policy.planId}`)}</div>
            <div>{t('farm.cover', { amount: formatKES(policy.sumInsuredKES) })}</div>
            <div className='muted'>
              {t('farm.coverage', { start: formatDate(policy.coverageStart), end: formatDate(policy.coverageEnd) })}
            </div>
            <Link to={`/policy/${policy.id}`}>{t('farm.viewPolicy')}</Link>
          </section>
        ) : (
          <section className='card stack-sm' style={{ borderTop: '6px solid var(--gold-500)' }}>
            <div className='row'>
              <Icon name='shield' size={32} />
              <h2 className='h3'>{t('farm.protectTitle')}</h2>
            </div>
            <p style={{ margin: 0 }}>{t('farm.protectBody', { amount: formatKES(fromPremium) })}</p>
            <Link to={`/insure/${farm.id}`} className='btn btn-primary btn-block'>
              {t('farm.protectCta')}
            </Link>
          </section>
        )}

        <div>
          <Link to={`/view-boundary/${farm.id}`} className={styles.linkRow}>
            <span className='row'>
              <Icon name='map' />
              {t('farm.viewBoundary')}
            </span>
            <Icon name='chevron' />
          </Link>
          <Link to={`/yield-analysis/${farm.id}`} className={styles.linkRow}>
            <span className='row'>
              <Icon name='chart' />
              {t('farm.yield')}
            </span>
            <Icon name='chevron' />
          </Link>
        </div>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 5: Implement `src/pages/farm/AddFarm.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { CropPicker } from '@/src/components/forms/CropPicker'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { useApp, useFarm, useFarmForm } from '@/src/context/AppContext'
import { SEASON_WINDOWS } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/pages.module.css'
import { updateFarm } from '@/src/services/farmService'
import type { Season } from '@/src/types'

const STEPS = 4
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const SEASONS: Season[] = ['long_rains', 'short_rains']

function SeasonCard({ season, selected, onSelect }: { season: Season; selected: boolean; onSelect: () => void }) {
  const { startMonth, endMonth } = SEASON_WINDOWS[season]
  return (
    <button type='button' role='radio' aria-checked={selected} className={styles.seasonCard} onClick={onSelect}>
      <div className='h3'>{t(`season.${season}`)}</div>
      <div className={styles.months} aria-hidden='true'>
        {MONTHS.map((m, i) => (
          <span key={i} className={styles.month} data-on={i >= startMonth && i <= endMonth}>
            {m}
          </span>
        ))}
      </div>
    </button>
  )
}

export default function AddFarm() {
  const { farmId } = useParams()
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farm = useFarm(farmId)
  const { form, update, start, reset } = useFarmForm()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const editing = !!farmId

  useEffect(() => {
    if (editing && farm && form.editingFarmId !== farm.id) start(farm)
    if (!editing && form.editingFarmId !== null) start()
    if (!editing && form.editingFarmId === null && !form.plantingDate) {
      update({ plantingDate: new Date().toISOString().slice(0, 10) })
    }
  }, [editing, farm, form.editingFarmId, form.plantingDate, start, update])

  if (editing && !farm) return <NotFound />

  const validate = (): string | undefined => {
    if (step === 0 && form.name.trim().length < 2) return t('addFarm.nameError')
    if (step === 1 && !form.crop) return t('addFarm.cropError')
    if (step === 2 && !form.season) return t('addFarm.seasonError')
    if (step === 3 && !form.plantingDate) return t('addFarm.plantingError')
    return undefined
  }

  const next = async () => {
    const problem = validate()
    setError(problem)
    if (problem) return
    if (step < STEPS - 1) {
      setStep(step + 1)
      return
    }
    if (editing && farm) {
      setSaving(true)
      const updated = await updateFarm(farm, form)
      dispatch({ type: 'UPDATE_FARM', farm: updated })
      reset()
      navigate(`/farm/${farm.id}`, { replace: true })
    } else {
      navigate('/boundary-intro')
    }
  }

  const back = () => (step === 0 ? navigate(-1) : setStep(step - 1))
  const lastLabel = editing ? t('editFarm.save') : t('addFarm.toBoundary')

  return (
    <Screen
      header={<Header title={editing ? t('editFarm.title') : t('addFarm.title')} back />}
      footer={
        <div className='row'>
          {step > 0 && (
            <Button variant='secondary' onClick={back}>
              {t('common.back')}
            </Button>
          )}
          <Button block loading={saving} onClick={next}>
            {step === STEPS - 1 ? lastLabel : t('addFarm.next')}
          </Button>
        </div>
      }
    >
      <div className='stack-lg'>
        <div className='stack-sm'>
          <span className='muted'>{t('addFarm.step', { n: step + 1, total: STEPS })}</span>
          <div className={styles.progress}>
            <div className={styles.progressFill} style={{ transform: `scaleX(${(step + 1) / STEPS})` }} />
          </div>
        </div>

        {step === 0 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.name')}</h2>
            <Field id='farm-name' label={t('addFarm.nameLabel')} hint={t('addFarm.nameHint')} error={error}>
              <input
                id='farm-name'
                className={formStyles.input}
                value={form.name}
                aria-invalid={!!error}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.crop')}</h2>
            <CropPicker value={form.crop} onChange={(crop) => update({ crop })} label={t('addFarm.crop')} />
          </div>
        )}

        {step === 2 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.season')}</h2>
            <div role='radiogroup' aria-label={t('addFarm.season')} className='stack-sm'>
              {SEASONS.map((s) => (
                <SeasonCard key={s} season={s} selected={form.season === s} onSelect={() => update({ season: s })} />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className='stack'>
            <h2 className='h1'>{t('addFarm.planting')}</h2>
            <Field id='planting' label={t('addFarm.plantingLabel')}>
              <input
                id='planting'
                type='date'
                className={formStyles.input}
                value={form.plantingDate}
                onChange={(e) => update({ plantingDate: e.target.value })}
              />
            </Field>
          </div>
        )}

        {error && step > 0 && (
          <p role='alert' className={formStyles.error}>
            {error}
          </p>
        )}
      </div>
    </Screen>
  )
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- src/pages/farm`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
npm run format
git add src
git commit -m "feat: add farm detail page and stepped add/edit farm form"
```

---
### Task 17: Leaflet map wrapper, boundary intro, tap-corners and quick-pin capture

**Files:**
- Create: `src/components/map/FarmMap.tsx`, `src/components/map/MapScreen.tsx`, `src/components/map/map.module.css`, `src/pages/farm/formGuard.ts`, `src/test/mockFarmMap.tsx`
- Replace stubs: `src/pages/farm/BoundaryIntro.tsx`, `src/pages/farm/BoundaryMap.tsx`, `src/pages/farm/BoundaryQuickMap.tsx`
- Modify: `src/i18n/en.ts`
- Test: `src/pages/farm/formGuard.test.ts`, `src/pages/farm/boundaryCapture.test.tsx`

**Interfaces:**
- Consumes: `useFarmForm`, `useFarmer` (Task 8); `validateBoundary`, `polygonAreaHa`, `squareAround`, `BoundaryError` (Task 4); `countyCenter` (Task 2); `acresToHa`, `formatHa`, `formatAcres` (Task 3); `ErrorState`, `Button`, `Header`, `Icon` (Task 12).
- Produces:
  - `src/components/map/FarmMap.tsx` (the **only** module importing `leaflet`): type `MapPolygon = { id: string; boundary: LatLng[]; color: string; label?: string; onClick?: () => void }`; type `FarmMapProps = { center?: LatLng; zoom?: number; fitTo?: LatLng[]; polygons?: MapPolygon[]; draft?: LatLng[]; path?: LatLng[]; marker?: LatLng; onMapClick?: (p: LatLng) => void; interactive?: boolean; onReady?: (map: import('leaflet').Map) => void; onTileError?: () => void }`; `<FarmMap {...FarmMapProps} />` fills its parent.
  - `<MapScreen title: string back?: boolean | string map: ReactNode panel: ReactNode overlay?: ReactNode />` — full-height map with header and bottom panel.
  - `requiredFormStep(form: FarmFormData): string | null` — `'/add-farm'` when name/crop/season/plantingDate missing, else `null`.
  - Test double `src/test/mockFarmMap.tsx` exporting `FarmMap` and `TEST_SQUARE: LatLng[]` (a 1 ha square); its "map-tap" button calls `onMapClick` with the next corner of `TEST_SQUARE`; each polygon renders as a button named by its `label`.
  - Page tests mock the map with `vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))`.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'boundary.introTitle': 'How do you want to mark your farm?',
  'boundary.introBody': 'We use the shape of your farm to watch it from space and to price your cover.',
  'boundary.tap.title': 'Tap the corners on a map',
  'boundary.tap.body': 'See your farm from above and tap each corner.',
  'boundary.walk.title': 'Walk around your farm',
  'boundary.walk.body': 'Walk along the edge. Your phone GPS draws the shape.',
  'boundary.draw.title': 'Draw with your finger',
  'boundary.draw.body': 'Trace the outline of your farm on the map.',
  'boundary.recommended': 'Easiest',
  'boundary.quick': 'Quick: just drop a pin',
  'boundary.mapTitle': 'Mark your farm',
  'boundary.tapHint': 'Tap each corner of your farm. You need at least 3.',
  'boundary.area': '{ha} · {acres}',
  'boundary.points': '{n} corners marked',
  'boundary.undo': 'Undo',
  'boundary.done': 'Done',
  'boundary.myLocation': 'Go to my location',
  'boundary.error.too_few_points': 'Mark at least 3 corners.',
  'boundary.error.self_intersecting': 'The lines cross each other. Undo the last corner and try again.',
  'boundary.error.too_small': 'This is smaller than 0.05 ha. Check the corners.',
  'boundary.error.too_large': 'This is bigger than 50 ha. Check the corners.',
  'quick.title': 'Drop a pin on your farm',
  'quick.hint': 'Tap the middle of your farm, then choose its size.',
  'quick.size': 'About how big is it?',
  'quick.acres': '{n} acres',
  'quick.acre': '{n} acre',
```

- [ ] **Step 2: Write the failing tests**

`src/pages/farm/formGuard.test.ts`:

```ts
import { emptyFarmForm } from '@/src/context/reducer'
import { requiredFormStep } from '@/src/pages/farm/formGuard'

test('sends incomplete forms back to the add-farm steps', () => {
  expect(requiredFormStep(emptyFarmForm)).toBe('/add-farm')
  expect(requiredFormStep({ ...emptyFarmForm, name: 'A', crop: 'maize', season: 'long_rains' })).toBe('/add-farm')
})

test('complete details pass', () => {
  expect(
    requiredFormStep({ ...emptyFarmForm, name: 'A', crop: 'maize', season: 'long_rains', plantingDate: '2026-10-01' }),
  ).toBeNull()
})
```

`src/pages/farm/boundaryCapture.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { emptyFarmForm } from '@/src/context/reducer'
import { STATE_KEY } from '@/src/context/persistence'
import BoundaryIntro from '@/src/pages/farm/BoundaryIntro'
import BoundaryMap from '@/src/pages/farm/BoundaryMap'
import BoundaryQuickMap from '@/src/pages/farm/BoundaryQuickMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))

const withForm = (path: string) => ({
  route: path,
  path,
  state: {
    ...seededState(),
    farmForm: { ...emptyFarmForm, name: 'River plot', crop: 'beans' as const, season: 'short_rains' as const, plantingDate: '2026-10-12' },
  },
})

test('intro offers three methods plus a quick pin', async () => {
  const { user } = renderWithApp(<BoundaryIntro />, withForm('/boundary-intro'))
  expect(screen.getByRole('button', { name: /tap the corners/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /walk around/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /draw with your finger/i })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /walk around/i }))
  expect(screen.getByTestId('location')).toHaveTextContent('/boundary-walk')
})

test('intro without farm details goes back to add-farm', () => {
  renderWithApp(<BoundaryIntro />, { route: '/boundary-intro', path: '/boundary-intro', state: seededState() })
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})

test('tap-corners: Done unlocks at 3 corners, shows live area, saves boundary', async () => {
  const { user } = renderWithApp(<BoundaryMap />, withForm('/boundary-map'))
  const done = screen.getByRole('button', { name: 'Done' })
  expect(done).toBeDisabled()
  for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'map-tap' }))
  expect(screen.getByText('4 corners marked')).toBeInTheDocument()
  expect(screen.getByText(/^1 ha · 2.5 acres$/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  expect(screen.getByText('3 corners marked')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'map-tap' }))
  await user.click(done)
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
  expect(JSON.parse(localStorage.getItem(STATE_KEY)!).farmForm.boundary).toHaveLength(4)
})

test('tap-corners explains an invalid shape', async () => {
  const { user } = renderWithApp(<BoundaryMap />, withForm('/boundary-map'))
  // The mock cycles NW, NE, SE, SW, NW, NE, ...
  const tap = () => user.click(screen.getByRole('button', { name: 'map-tap' }))
  for (let i = 0; i < 4; i++) await tap()
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  await tap() // NW again
  await tap() // NE again -> NW, NE, NW, NE has zero area
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.getByRole('alert')).toHaveTextContent('smaller than 0.05 ha')
  expect(screen.getByTestId('farm-map')).toBeInTheDocument()
})

test('quick pin builds a square of the chosen size', async () => {
  const { user } = renderWithApp(<BoundaryQuickMap />, withForm('/boundary-quick-map'))
  await user.click(screen.getByRole('button', { name: 'map-tap' }))
  await user.click(screen.getByRole('radio', { name: '2 acres' }))
  expect(screen.getByText(/^0.81 ha · 2 acres$/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
})
```

Run: `npm test -- src/pages/farm/formGuard src/pages/farm/boundaryCapture`
Expected: FAIL.

- [ ] **Step 3: Create `src/pages/farm/formGuard.ts`**

```ts
import type { FarmFormData } from '@/src/types'

/** Where to send the farmer if the add-farm details are incomplete (e.g. after a reload). */
export function requiredFormStep(form: FarmFormData): string | null {
  if (!form.name.trim() || !form.crop || !form.season || !form.plantingDate) return '/add-farm'
  return null
}
```

- [ ] **Step 4: Create the test double `src/test/mockFarmMap.tsx`**

```tsx
import { useRef } from 'react'
import type { FarmMapProps } from '@/src/components/map/FarmMap'
import type { LatLng } from '@/src/types'
import { squareAround } from '@/src/utils/geo'

/** NW, NE, SE, SW corners of a 1 ha square in Nakuru */
export const TEST_SQUARE: LatLng[] = squareAround([-0.3031, 36.08], 1)

export function FarmMap(props: FarmMapProps) {
  const taps = useRef(0)
  return (
    <div
      data-testid='farm-map'
      data-draft={props.draft?.length ?? 0}
      data-path={props.path?.length ?? 0}
      data-polygons={props.polygons?.length ?? 0}
    >
      {props.onMapClick && (
        <button type='button' onClick={() => props.onMapClick!(TEST_SQUARE[taps.current++ % 4])}>
          map-tap
        </button>
      )}
      {props.polygons?.map((p) => (
        <button key={p.id} type='button' onClick={p.onClick}>
          {p.label ?? p.id}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/map/map.module.css`**

```css
.mapScreen {
  position: relative;
  height: 100vh;
  height: 100dvh;
  max-width: 560px;
  margin: 0 auto;
  overflow: hidden;
  background: #183d26;
}
.mapFill {
  position: absolute;
  inset: 0;
}
.mapFill :global(.leaflet-container) {
  width: 100%;
  height: 100%;
  background: #183d26;
  font: inherit;
}
.top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: calc(var(--sp-2) + env(safe-area-inset-top)) var(--sp-3) var(--sp-2);
  background: linear-gradient(to bottom, rgba(15, 61, 33, 0.75), rgba(15, 61, 33, 0));
  color: #fff;
}
.top h1 {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 800;
}
.roundBtn {
  width: var(--tap);
  height: var(--tap);
  border-radius: 50%;
  border: 0;
  background: var(--surface);
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  cursor: pointer;
  flex: none;
}
.panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 500;
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--sp-4) var(--sp-4) calc(var(--sp-4) + env(safe-area-inset-bottom));
  box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.15);
}
.overlay {
  position: absolute;
  inset: 0;
  z-index: 600;
  background: var(--bg);
  overflow-y: auto;
}
.fab {
  position: absolute;
  right: var(--sp-3);
  z-index: 500;
}
.drawLayer {
  position: absolute;
  inset: 0;
  z-index: 450;
  touch-action: none;
}
.areaReadout {
  font-size: var(--fs-xl);
  font-weight: 800;
}
.sizeRow {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-2);
}
.sizeChip {
  min-height: var(--tap);
  border-radius: var(--radius);
  border: 2px solid var(--line);
  background: var(--surface);
  font-weight: 700;
  cursor: pointer;
}
.sizeChip[aria-checked='true'] {
  border-color: var(--green-700);
  background: var(--green-100);
}
.methodCard {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: var(--sp-3);
  align-items: center;
  width: 100%;
  text-align: left;
  border: 0;
  cursor: pointer;
}
.methodIcon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  background: var(--green-100);
  color: var(--green-700);
  display: flex;
  align-items: center;
  justify-content: center;
}
:global(.farm-label) {
  background: rgba(15, 61, 33, 0.85);
  color: #fff;
  border: 0;
  border-radius: 8px;
  font-weight: 700;
  box-shadow: none;
}
:global(.farm-label)::before {
  display: none;
}
```

- [ ] **Step 6: Create `src/components/map/FarmMap.tsx`**

```tsx
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import styles from '@/src/components/map/map.module.css'
import { KENYA_CENTER } from '@/src/data/cropConfig'
import type { LatLng } from '@/src/types'

const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const GOLD = '#e0a526'
const RAIN = '#4a9be0'

export interface MapPolygon {
  id: string
  boundary: LatLng[]
  color: string
  label?: string
  onClick?: () => void
}

export interface FarmMapProps {
  center?: LatLng
  zoom?: number
  fitTo?: LatLng[]
  polygons?: MapPolygon[]
  /** vertices being edited: polyline until 3 points, then a polygon */
  draft?: LatLng[]
  /** GPS walk trace */
  path?: LatLng[]
  marker?: LatLng
  onMapClick?: (p: LatLng) => void
  interactive?: boolean
  onReady?: (map: L.Map) => void
  onTileError?: () => void
}

export function FarmMap({
  center = KENYA_CENTER,
  zoom = 16,
  fitTo,
  polygons,
  draft,
  path,
  marker,
  onMapClick,
  interactive = true,
  onReady,
  onTileError,
}: FarmMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const overlay = useRef<L.LayerGroup | null>(null)
  const clickRef = useRef(onMapClick)
  const tileErrorRef = useRef(onTileError)
  clickRef.current = onMapClick
  tileErrorRef.current = onTileError

  // Create the map once.
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, {
      center,
      zoom,
      zoomControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: interactive,
    })
    let errors = 0
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: 'Tiles © Esri' })
      .on('tileerror', () => {
        errors += 1
        if (errors === 3 || !navigator.onLine) tileErrorRef.current?.()
      })
      .addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => clickRef.current?.([e.latlng.lat, e.latlng.lng]))
    overlay.current = L.layerGroup().addTo(m)
    map.current = m
    onReady?.(m)
    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw overlays whenever they change.
  useEffect(() => {
    const group = overlay.current
    if (!group) return
    group.clearLayers()
    polygons?.forEach((p) => {
      const layer = L.polygon(p.boundary, { color: p.color, weight: 3, fillOpacity: 0.3 })
      if (p.label) layer.bindTooltip(p.label, { permanent: true, direction: 'center', className: 'farm-label' })
      if (p.onClick) layer.on('click', p.onClick)
      layer.addTo(group)
    })
    if (draft && draft.length) {
      const shape = draft.length >= 3 ? L.polygon(draft, { color: GOLD, weight: 3, fillOpacity: 0.25 }) : L.polyline(draft, { color: GOLD, weight: 3 })
      shape.addTo(group)
      draft.forEach((p) =>
        L.circleMarker(p, { radius: 9, color: GOLD, weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(group),
      )
    }
    if (path && path.length) {
      L.polyline(path, { color: RAIN, weight: 5 }).addTo(group)
      L.circleMarker(path[path.length - 1], { radius: 10, color: '#fff', weight: 3, fillColor: RAIN, fillOpacity: 1 }).addTo(group)
    }
    if (marker) {
      L.circleMarker(marker, { radius: 12, color: '#fff', weight: 3, fillColor: GOLD, fillOpacity: 1 }).addTo(group)
    }
  }, [polygons, draft, path, marker])

  // Keep the requested area in view.
  const fitKey = fitTo && fitTo.length ? JSON.stringify(fitTo) : ''
  useEffect(() => {
    if (!map.current || !fitTo || fitTo.length === 0) return
    if (fitTo.length === 1) map.current.setView(fitTo[0], Math.max(map.current.getZoom(), 17))
    else map.current.fitBounds(L.latLngBounds(fitTo), { padding: [48, 48], maxZoom: 18 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  return (
    <div className={styles.mapFill}>
      <div ref={el} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
```

(The `eslint-disable` comments are harmless without ESLint; keep them to document the intentional dependency choices.)

- [ ] **Step 7: Create `src/components/map/MapScreen.tsx`**

```tsx
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/src/components/common/Icons'
import styles from '@/src/components/map/map.module.css'
import { t } from '@/src/i18n'

interface Props {
  title: string
  back?: boolean | string
  map: ReactNode
  panel: ReactNode
  overlay?: ReactNode
}

export function MapScreen({ title, back = true, map, panel, overlay }: Props) {
  const navigate = useNavigate()
  return (
    <div className={styles.mapScreen}>
      {map}
      <header className={styles.top}>
        {back && (
          <button
            type='button'
            className={styles.roundBtn}
            aria-label={t('common.back')}
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          >
            <Icon name='back' />
          </button>
        )}
        <h1>{title}</h1>
      </header>
      <main className={styles.panel}>{panel}</main>
      {overlay && <div className={styles.overlay}>{overlay}</div>}
    </div>
  )
}
```

- [ ] **Step 8: Implement `src/pages/farm/BoundaryIntro.tsx`**

```tsx
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Chip } from '@/src/components/common/Chip'
import { Header } from '@/src/components/common/Header'
import { Icon, type IconName } from '@/src/components/common/Icons'
import { SatelliteScene } from '@/src/components/common/Illustrations'
import { Screen } from '@/src/components/common/Screen'
import styles from '@/src/components/map/map.module.css'
import { useFarmForm } from '@/src/context/AppContext'
import { t, type StringKey } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { BoundaryMethod } from '@/src/types'

const METHODS: { method: BoundaryMethod; to: string; icon: IconName; title: StringKey; body: StringKey; best?: boolean }[] = [
  { method: 'map', to: '/boundary-map', icon: 'tap', title: 'boundary.tap.title', body: 'boundary.tap.body', best: true },
  { method: 'walk', to: '/boundary-walk', icon: 'walk', title: 'boundary.walk.title', body: 'boundary.walk.body' },
  { method: 'draw', to: '/boundary-draw', icon: 'draw', title: 'boundary.draw.title', body: 'boundary.draw.body' },
]

export default function BoundaryIntro() {
  const navigate = useNavigate()
  const { form, update } = useFarmForm()
  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  const choose = (method: BoundaryMethod, to: string) => {
    update({ method })
    navigate(to)
  }

  return (
    <Screen header={<Header back='/add-farm' />}>
      <div className='stack'>
        <SatelliteScene />
        <h1 className='h1'>{t('boundary.introTitle')}</h1>
        <p className='muted' style={{ fontSize: 'var(--fs-md)', margin: 0 }}>
          {t('boundary.introBody')}
        </p>
        <div className='stack-sm'>
          {METHODS.map((m) => (
            <button
              key={m.method}
              type='button'
              className={`card card-tap ${styles.methodCard}`}
              onClick={() => choose(m.method, m.to)}
            >
              <span className={styles.methodIcon}>
                <Icon name={m.icon} size={30} />
              </span>
              <span>
                <span className='h3' style={{ display: 'block' }}>
                  {t(m.title)}
                </span>
                <span className='muted'>{t(m.body)}</span>
              </span>
              {m.best ? <Chip status='good'>{t('boundary.recommended')}</Chip> : <Icon name='chevron' />}
            </button>
          ))}
        </div>
        <Link to='/boundary-quick-map' onClick={() => update({ method: 'quick' })} className='btn btn-ghost btn-block'>
          <Icon name='pin' />
          {t('boundary.quick')}
        </Link>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 9: Implement `src/pages/farm/BoundaryMap.tsx`**

```tsx
import type { Map as LeafletMap } from 'leaflet'
import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { ErrorState } from '@/src/components/common/ErrorStates'
import { Icon } from '@/src/components/common/Icons'
import formStyles from '@/src/components/forms/forms.module.css'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import styles from '@/src/components/map/map.module.css'
import { useFarmer, useFarmForm } from '@/src/context/AppContext'
import { countyCenter } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { LatLng } from '@/src/types'
import { formatAcres, formatHa } from '@/src/utils/format'
import { polygonAreaHa, validateBoundary } from '@/src/utils/geo'

export default function BoundaryMap() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [points, setPoints] = useState<LatLng[]>(form.method === 'map' ? form.boundary : [])
  const [error, setError] = useState<string>()
  const [offline, setOffline] = useState(false)
  const [mapKey, setMapKey] = useState(0)
  const mapRef = useRef<LeafletMap | null>(null)

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  const area = polygonAreaHa(points)

  const done = () => {
    const check = validateBoundary(points)
    if (!check.ok) {
      setError(t(`boundary.error.${check.reason}`))
      return
    }
    update({ boundary: points, method: 'map' })
    navigate('/confirm-farm')
  }

  const locate = () =>
    navigator.geolocation?.getCurrentPosition((pos) =>
      mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 18),
    )

  return (
    <MapScreen
      title={t('boundary.mapTitle')}
      map={
        <FarmMap
          key={mapKey}
          center={countyCenter(farmer?.county ?? '')}
          zoom={16}
          draft={points}
          onMapClick={(p) => {
            setError(undefined)
            setPoints((prev) => [...prev, p])
          }}
          onReady={(m) => (mapRef.current = m)}
          onTileError={() => setOffline(true)}
        />
      }
      overlay={
        offline && (
          <ErrorState
            kind='offline'
            onRetry={() => {
              setOffline(false)
              setMapKey((k) => k + 1)
            }}
          />
        )
      }
      panel={
        <div className='stack-sm'>
          <div className='row-between'>
            <div>
              {points.length >= 3 ? (
                <div className={styles.areaReadout}>
                  {t('boundary.area', { ha: formatHa(area), acres: formatAcres(area) })}
                </div>
              ) : (
                <div style={{ fontWeight: 700 }}>{t('boundary.tapHint')}</div>
              )}
              <div className='muted'>{t('boundary.points', { n: points.length })}</div>
            </div>
            <button type='button' className={styles.roundBtn} aria-label={t('boundary.myLocation')} onClick={locate}>
              <Icon name='gps' />
            </button>
          </div>
          {error && (
            <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <div className='row'>
            <Button
              variant='secondary'
              icon='undo'
              disabled={points.length === 0}
              onClick={() => {
                setError(undefined)
                setPoints((prev) => prev.slice(0, -1))
              }}
            >
              {t('boundary.undo')}
            </Button>
            <Button block disabled={points.length < 3} onClick={done}>
              {t('boundary.done')}
            </Button>
          </div>
        </div>
      }
    />
  )
}
```

Note: `formatHa(1.0000x)` renders `1 ha` and `formatAcres` renders `2.5 acres`, which the test matches with `/^1 ha · 2.5 acres$/`.

- [ ] **Step 10: Implement `src/pages/farm/BoundaryQuickMap.tsx`**

```tsx
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { ErrorState } from '@/src/components/common/ErrorStates'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import styles from '@/src/components/map/map.module.css'
import { useFarmer, useFarmForm } from '@/src/context/AppContext'
import { countyCenter } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { LatLng } from '@/src/types'
import { acresToHa, formatAcres, formatHa } from '@/src/utils/format'
import { squareAround } from '@/src/utils/geo'

const SIZES = [0.5, 1, 2, 5]

export default function BoundaryQuickMap() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [pin, setPin] = useState<LatLng | null>(null)
  const [acres, setAcres] = useState(1)
  const [offline, setOffline] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  const ha = acresToHa(acres)
  const boundary = pin ? squareAround(pin, ha) : []

  return (
    <MapScreen
      title={t('quick.title')}
      map={
        <FarmMap
          key={mapKey}
          center={countyCenter(farmer?.county ?? '')}
          zoom={16}
          marker={pin ?? undefined}
          draft={boundary}
          onMapClick={setPin}
          onTileError={() => setOffline(true)}
        />
      }
      overlay={
        offline && (
          <ErrorState
            kind='offline'
            onRetry={() => {
              setOffline(false)
              setMapKey((k) => k + 1)
            }}
          />
        )
      }
      panel={
        <div className='stack-sm'>
          {!pin ? (
            <div style={{ fontWeight: 700 }}>{t('quick.hint')}</div>
          ) : (
            <div className={styles.areaReadout}>
              {t('boundary.area', { ha: formatHa(ha), acres: formatAcres(ha) })}
            </div>
          )}
          <div className='muted'>{t('quick.size')}</div>
          <div role='radiogroup' aria-label={t('quick.size')} className={styles.sizeRow}>
            {SIZES.map((n) => (
              <button
                key={n}
                type='button'
                role='radio'
                aria-checked={acres === n}
                className={styles.sizeChip}
                onClick={() => setAcres(n)}
              >
                {n <= 1 ? t('quick.acre', { n }) : t('quick.acres', { n })}
              </button>
            ))}
          </div>
          <Button
            block
            disabled={!pin}
            onClick={() => {
              update({ boundary, method: 'quick' })
              navigate('/confirm-farm')
            }}
          >
            {t('boundary.done')}
          </Button>
        </div>
      }
    />
  )
}
```

`formatAcres(acresToHa(2))` is `2 acres` and `formatHa(0.809…)` is `0.81 ha`, matching the test.

- [ ] **Step 11: Run tests**

Run: `npm test -- src/pages/farm`
Expected: PASS.

- [ ] **Step 12: Manual check of the real map**

Run: `npm run dev`. Sign in as the seeded farmer, Add farm → fill steps → "Tap the corners on a map". Confirm satellite tiles load around Nakuru, taps add gold corners, the area readout updates live, Undo works, and Done goes to `/confirm-farm` (placeholder for now). In DevTools → Network → Offline, reload the page: the "You're offline" overlay must appear with "Try again".

- [ ] **Step 13: Commit**

```bash
npm run format
git add src
git commit -m "feat: add Leaflet map wrapper and tap/quick boundary capture"
```

---
### Task 18: Walk-the-boundary (GPS) and draw-with-finger capture

**Files:**
- Modify: `src/utils/geo.ts` (add `traceToBoundary`), `src/utils/geo.test.ts`, `src/i18n/en.ts`
- Replace stubs: `src/pages/farm/BoundaryWalk.tsx`, `src/pages/farm/BoundaryDraw.tsx`
- Test: `src/pages/farm/boundaryWalkDraw.test.tsx`

**Interfaces:**
- Consumes: Task 17 (`FarmMap`, `MapScreen`, `map.module.css`, `requiredFormStep`, `mockFarmMap`), Task 4 geo helpers.
- Produces: `traceToBoundary(points: LatLng[], toleranceM?: number): LatLng[]` — simplifies a hand/GPS trace and drops a closing point that returns to the start (< 5 m away).

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'walk.title': 'Walk around your farm',
  'walk.ready': 'Go to one corner of your farm, then tap Start walking.',
  'walk.walking': 'Walk along the edge. Tap Finish when you are back where you started.',
  'walk.waiting': 'Waiting for GPS…',
  'walk.start': 'Start walking',
  'walk.finish': 'Finish',
  'walk.restart': 'Start again',
  'walk.accuracy': 'GPS accuracy {m} m',
  'walk.distance': '{m} m walked',
  'walk.useTap': 'Tap corners instead',
  'draw.title': 'Draw your farm',
  'draw.hint': 'Trace the edge of your farm with one finger.',
  'draw.mode': 'Map mode',
  'draw.drawMode': 'Draw',
  'draw.moveMode': 'Move map',
  'draw.redraw': 'Draw again',
```

- [ ] **Step 2: Add the failing `traceToBoundary` test** to `src/utils/geo.test.ts`:

```ts
import { traceToBoundary } from '@/src/utils/geo'

test('traceToBoundary turns a dense closed trace into its corners', () => {
  const corners = squareAround(NAKURU, 1)
  const loop = [...corners, corners[0]]
  const dense: LatLng[] = []
  for (let s = 0; s < 4; s++) {
    const [a, b] = [loop[s], loop[s + 1]]
    for (let k = 0; k < 10; k++) {
      dense.push([a[0] + ((b[0] - a[0]) * k) / 10, a[1] + ((b[1] - a[1]) * k) / 10])
    }
  }
  dense.push(corners[0])
  const result = traceToBoundary(dense, 3)
  expect(result).toHaveLength(4)
  expect(polygonAreaHa(result)).toBeCloseTo(1, 1)
})
```

(Merge the import into the existing import list at the top of the file.)

Run: `npm test -- src/utils/geo`
Expected: FAIL — `traceToBoundary` is not exported.

- [ ] **Step 3: Implement in `src/utils/geo.ts`** (append):

```ts
/** Simplifies a finger/GPS trace into polygon corners, dropping a closing point near the start. */
export function traceToBoundary(points: LatLng[], toleranceM = 3): LatLng[] {
  let corners = simplifyPath(points, toleranceM)
  if (corners.length > 3 && distanceMeters(corners[0], corners[corners.length - 1]) < 5) {
    corners = corners.slice(0, -1)
  }
  return corners
}
```

Run: `npm test -- src/utils/geo`
Expected: PASS.

- [ ] **Step 4: Write the failing page tests `src/pages/farm/boundaryWalkDraw.test.tsx`**

```tsx
import { act, screen } from '@testing-library/react'
import { emptyFarmForm } from '@/src/context/reducer'
import BoundaryDraw from '@/src/pages/farm/BoundaryDraw'
import BoundaryWalk from '@/src/pages/farm/BoundaryWalk'
import { TEST_SQUARE } from '@/src/test/mockFarmMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))

const withForm = (path: string) => ({
  route: path,
  path,
  state: {
    ...seededState(),
    farmForm: { ...emptyFarmForm, name: 'River plot', crop: 'beans' as const, season: 'short_rains' as const, plantingDate: '2026-10-12' },
  },
})

function mockGeolocation(value: Partial<Geolocation>) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value })
}

afterEach(() => mockGeolocation(undefined as unknown as Geolocation))

test('walk: denied GPS offers tap-corners instead', async () => {
  mockGeolocation({
    watchPosition: (_ok, err) => {
      err?.({ code: 1 } as GeolocationPositionError)
      return 1
    },
    clearWatch: vi.fn(),
  })
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  expect(screen.getByText("We can't find your location")).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tap corners instead' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/boundary-map')
})

test('walk: no geolocation at all shows the GPS error', async () => {
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  expect(screen.getByText("We can't find your location")).toBeInTheDocument()
})

test('walk: records accurate points and finishes', async () => {
  let push: PositionCallback = () => {}
  const clearWatch = vi.fn()
  mockGeolocation({
    watchPosition: (ok) => {
      push = ok
      return 7
    },
    clearWatch,
  })
  const { user } = renderWithApp(<BoundaryWalk />, withForm('/boundary-walk'))
  await user.click(screen.getByRole('button', { name: 'Start walking' }))
  const pos = (p: number[], accuracy: number) =>
    ({ coords: { latitude: p[0], longitude: p[1], accuracy } }) as GeolocationPosition
  act(() => {
    push(pos(TEST_SQUARE[0], 80)) // too inaccurate: ignored
    TEST_SQUARE.forEach((p) => push(pos(p, 5)))
  })
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-path', '4')
  expect(screen.getByText('300 m walked')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Finish' }))
  expect(clearWatch).toHaveBeenCalledWith(7)
  expect(screen.getByTestId('location')).toHaveTextContent('/confirm-farm')
})

test('draw: Done is locked until a shape is drawn', () => {
  renderWithApp(<BoundaryDraw />, withForm('/boundary-draw'))
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  expect(screen.getByRole('radio', { name: 'Draw' })).toHaveAttribute('aria-checked', 'true')
})
```

Run: `npm test -- src/pages/farm/boundaryWalkDraw`
Expected: FAIL.

- [ ] **Step 5: Implement `src/pages/farm/BoundaryWalk.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { ErrorState } from '@/src/components/common/ErrorStates'
import formStyles from '@/src/components/forms/forms.module.css'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import { useFarmer, useFarmForm } from '@/src/context/AppContext'
import { countyCenter } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { LatLng } from '@/src/types'
import { distanceMeters, pathLengthMeters, traceToBoundary, validateBoundary } from '@/src/utils/geo'

const MAX_ACCURACY_M = 30
const MIN_STEP_M = 2

type Phase = 'ready' | 'walking' | 'gpsError'

export default function BoundaryWalk() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [phase, setPhase] = useState<Phase>('ready')
  const [points, setPoints] = useState<LatLng[]>([])
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState<string>()
  const watchId = useRef<number | null>(null)

  const stop = () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current)
    watchId.current = null
  }
  useEffect(() => stop, [])

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  const start = () => {
    stop()
    setPoints([])
    setError(undefined)
    if (!navigator.geolocation) {
      setPhase('gpsError')
      return
    }
    setPhase('walking')
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setAccuracy(Math.round(pos.coords.accuracy))
        if (pos.coords.accuracy > MAX_ACCURACY_M) return
        const p: LatLng = [pos.coords.latitude, pos.coords.longitude]
        setPoints((prev) =>
          prev.length === 0 || distanceMeters(prev[prev.length - 1], p) >= MIN_STEP_M ? [...prev, p] : prev,
        )
      },
      (err) => {
        if (err.code === 1 || err.code === 2) {
          stop()
          setPhase('gpsError')
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
  }

  const finish = () => {
    stop()
    const boundary = traceToBoundary(points, 1.5)
    const check = validateBoundary(boundary)
    if (!check.ok) {
      setError(t(`boundary.error.${check.reason}`))
      return
    }
    update({ boundary, method: 'walk' })
    navigate('/confirm-farm')
  }

  const accuracyStatus = accuracy === null ? 'neutral' : accuracy <= 10 ? 'good' : accuracy <= MAX_ACCURACY_M ? 'warning' : 'danger'
  const last = points[points.length - 1]

  return (
    <MapScreen
      title={t('walk.title')}
      map={
        <FarmMap
          center={last ?? countyCenter(farmer?.county ?? '')}
          zoom={18}
          path={points}
          fitTo={last ? [last] : undefined}
        />
      }
      overlay={
        phase === 'gpsError' && (
          <ErrorState
            kind='gps'
            action={
              <Button block onClick={() => navigate('/boundary-map', { replace: true })}>
                {t('walk.useTap')}
              </Button>
            }
            onRetry={start}
          />
        )
      }
      panel={
        <div className='stack-sm'>
          {phase !== 'walking' ? (
            <>
              <p style={{ margin: 0, fontWeight: 700 }}>{t('walk.ready')}</p>
              <Button block icon='walk' onClick={start}>
                {t('walk.start')}
              </Button>
            </>
          ) : (
            <>
              <div className='row-between'>
                <div className='figure-sm'>{t('walk.distance', { m: Math.round(pathLengthMeters(points)) })}</div>
                <Chip status={accuracyStatus}>
                  {accuracy === null ? t('walk.waiting') : t('walk.accuracy', { m: accuracy })}
                </Chip>
              </div>
              <p className='muted' style={{ margin: 0 }}>
                {t('walk.walking')}
              </p>
              {error && (
                <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
                  {error}
                </p>
              )}
              <div className='row'>
                <Button variant='secondary' onClick={start}>
                  {t('walk.restart')}
                </Button>
                <Button block disabled={points.length < 3} onClick={finish}>
                  {t('walk.finish')}
                </Button>
              </div>
            </>
          )}
        </div>
      }
    />
  )
}
```

Check: three sides of the 1 ha test square are each ~100 m, so the walked distance renders `300 m walked`.

- [ ] **Step 6: Implement `src/pages/farm/BoundaryDraw.tsx`**

```tsx
import type { Map as LeafletMap } from 'leaflet'
import { useRef, useState, type PointerEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import formStyles from '@/src/components/forms/forms.module.css'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import styles from '@/src/components/map/map.module.css'
import { useFarmer, useFarmForm } from '@/src/context/AppContext'
import { countyCenter } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import type { LatLng } from '@/src/types'
import { formatAcres, formatHa } from '@/src/utils/format'
import { polygonAreaHa, traceToBoundary, validateBoundary } from '@/src/utils/geo'

type Mode = 'draw' | 'move'

export default function BoundaryDraw() {
  const navigate = useNavigate()
  const farmer = useFarmer()
  const { form, update } = useFarmForm()
  const [mode, setMode] = useState<Mode>('draw')
  const [trace, setTrace] = useState<LatLng[]>([])
  const [boundary, setBoundary] = useState<LatLng[]>([])
  const [error, setError] = useState<string>()
  const drawing = useRef(false)
  const mapRef = useRef<LeafletMap | null>(null)

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />

  const toLatLng = (e: PointerEvent<HTMLDivElement>): LatLng | null => {
    const m = mapRef.current
    if (!m) return null
    const rect = e.currentTarget.getBoundingClientRect()
    const ll = m.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top])
    return [ll.lat, ll.lng]
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const p = toLatLng(e)
    if (!p) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    setError(undefined)
    setBoundary([])
    setTrace([p])
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drawing.current) return
    const p = toLatLng(e)
    if (p) setTrace((prev) => [...prev, p])
  }
  const onUp = () => {
    if (!drawing.current) return
    drawing.current = false
    setBoundary(traceToBoundary(trace, 3))
    setTrace([])
  }

  const done = () => {
    const check = validateBoundary(boundary)
    if (!check.ok) {
      setError(t(`boundary.error.${check.reason}`))
      return
    }
    update({ boundary, method: 'draw' })
    navigate('/confirm-farm')
  }

  const area = polygonAreaHa(boundary)

  return (
    <MapScreen
      title={t('draw.title')}
      map={
        <>
          <FarmMap
            center={countyCenter(farmer?.county ?? '')}
            zoom={17}
            draft={boundary}
            path={trace}
            onReady={(m) => (mapRef.current = m)}
          />
          {mode === 'draw' && (
            <div
              className={styles.drawLayer}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
          )}
        </>
      }
      panel={
        <div className='stack-sm'>
          <div role='radiogroup' aria-label={t('draw.mode')} className={styles.sizeRow} style={{ gridTemplateColumns: '1fr 1fr' }}>
            {(['draw', 'move'] as Mode[]).map((m) => (
              <button
                key={m}
                type='button'
                role='radio'
                aria-checked={mode === m}
                className={styles.sizeChip}
                onClick={() => setMode(m)}
              >
                {m === 'draw' ? t('draw.drawMode') : t('draw.moveMode')}
              </button>
            ))}
          </div>
          {boundary.length >= 3 ? (
            <div className={styles.areaReadout}>
              {t('boundary.area', { ha: formatHa(area), acres: formatAcres(area) })}
            </div>
          ) : (
            <p style={{ margin: 0, fontWeight: 700 }}>{t('draw.hint')}</p>
          )}
          {error && (
            <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <div className='row'>
            <Button variant='secondary' disabled={boundary.length === 0} onClick={() => setBoundary([])}>
              {t('draw.redraw')}
            </Button>
            <Button block disabled={boundary.length < 3} onClick={done}>
              {t('boundary.done')}
            </Button>
          </div>
        </div>
      }
    />
  )
}
```

- [ ] **Step 7: Run tests**

Run: `npm test -- src/pages/farm src/utils/geo`
Expected: PASS.

- [ ] **Step 8: Manual check on a phone**

Run `npm run dev`, open `http://<your-computer-LAN-IP>:3000` on an Android phone on the same Wi-Fi. Note: browsers only allow GPS on `https` or `localhost`, so for the LAN test use Chrome's `chrome://flags/#unsafely-treat-insecure-origin-as-secure` with your LAN URL, or test GPS later in the Capacitor build (Task 27). Walk a small rectangle; check the blue trace follows you and Finish leads to the confirm screen. On the draw screen, trace a shape with one finger; switch to "Move map" and confirm the map pans.

- [ ] **Step 9: Commit**

```bash
npm run format
git add src
git commit -m "feat: add GPS walk and finger-draw boundary capture"
```

---

### Task 19: Confirm new farm and view an existing boundary

**Files:**
- Replace stubs: `src/pages/farm/ConfirmFarm.tsx`, `src/pages/farm/ViewBoundary.tsx`
- Modify: `src/i18n/en.ts`
- Test: `src/pages/farm/confirmView.test.tsx`

**Interfaces:**
- Consumes: `createFarm` (Task 9), `useFarmForm`, `useApp`, `useFarm`, `useFarmer` (Task 8), `requiredFormStep` (Task 17), `validateBoundary`, `pathLengthMeters` (Task 4), `FarmMap`, `MapScreen` (Task 17), `STATUS_COLOR` (Task 15), `NotFound` (Task 13).
- Produces: `/confirm-farm` saves the farm and goes to `/yield-analysis/:newFarmId` (replace); `/view-boundary/:farmId` read-only map.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'confirm.title': 'Check your farm',
  'confirm.body': 'Is this the right shape and size?',
  'confirm.save': 'Save farm',
  'confirm.changeShape': 'Change shape',
  'confirm.changeDetails': 'Change details',
  'view.title': 'Farm boundary',
  'view.perimeter': 'Edge length {m} m',
  'view.corners': '{n} corners',
```

- [ ] **Step 2: Write the failing tests `src/pages/farm/confirmView.test.tsx`**

```tsx
import { screen } from '@testing-library/react'
import { emptyFarmForm } from '@/src/context/reducer'
import { STATE_KEY } from '@/src/context/persistence'
import ConfirmFarm from '@/src/pages/farm/ConfirmFarm'
import ViewBoundary from '@/src/pages/farm/ViewBoundary'
import { TEST_SQUARE } from '@/src/test/mockFarmMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))

const details = { name: 'River plot', crop: 'beans' as const, season: 'short_rains' as const, plantingDate: '2026-10-12' }

const confirmAt = (farmForm = { ...emptyFarmForm, ...details, method: 'map' as const, boundary: TEST_SQUARE }) => ({
  route: '/confirm-farm',
  path: '/confirm-farm',
  state: { ...seededState(), farmForm },
})

test('summarises the farm and saves it', async () => {
  const { user } = renderWithApp(<ConfirmFarm />, confirmAt())
  expect(screen.getByText('River plot')).toBeInTheDocument()
  expect(screen.getByText('1 ha · 2.5 acres')).toBeInTheDocument()
  const save = screen.getByRole('button', { name: 'Save farm' })
  await user.click(save)
  expect(await screen.findByTestId('location')).toHaveTextContent(/^\/yield-analysis\/farm-/)
  const stored = JSON.parse(localStorage.getItem(STATE_KEY)!)
  expect(stored.farms).toHaveLength(4)
  expect(stored.farmForm.name).toBe('')
})

test('missing details go back to the add-farm form', () => {
  renderWithApp(<ConfirmFarm />, confirmAt({ ...emptyFarmForm, boundary: TEST_SQUARE }))
  expect(screen.getByTestId('location')).toHaveTextContent('/add-farm')
})

test('missing or invalid boundary goes back to boundary intro', () => {
  renderWithApp(<ConfirmFarm />, confirmAt({ ...emptyFarmForm, ...details, boundary: TEST_SQUARE.slice(0, 2) }))
  expect(screen.getByTestId('location')).toHaveTextContent('/boundary-intro')
})

test('view boundary shows size, corners and edge length', () => {
  renderWithApp(<ViewBoundary />, { route: '/view-boundary/farm-maize', path: '/view-boundary/:farmId', state: seededState() })
  expect(screen.getByText('4 corners')).toBeInTheDocument()
  expect(screen.getByText(/^Edge length \d+ m$/)).toBeInTheDocument()
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-polygons', '1')
})

test('view boundary for an unknown farm shows Not Found', () => {
  renderWithApp(<ViewBoundary />, { route: '/view-boundary/nope', path: '/view-boundary/:farmId', state: seededState() })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
```

Run: `npm test -- src/pages/farm/confirmView`
Expected: FAIL.

- [ ] **Step 3: Implement `src/pages/farm/ConfirmFarm.tsx`**

```tsx
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { CROP_ICON, Icon } from '@/src/components/common/Icons'
import formStyles from '@/src/components/forms/forms.module.css'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import styles from '@/src/components/map/map.module.css'
import { useApp, useFarmer, useFarmForm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import { requiredFormStep } from '@/src/pages/farm/formGuard'
import { createFarm } from '@/src/services/farmService'
import { formatAcres, formatHa } from '@/src/utils/format'
import { validateBoundary } from '@/src/utils/geo'

export default function ConfirmFarm() {
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farmer = useFarmer()
  const { form, reset } = useFarmForm()
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const redirect = requiredFormStep(form)
  if (redirect) return <Navigate to={redirect} replace />
  const check = validateBoundary(form.boundary)
  if (!check.ok) return <Navigate to='/boundary-intro' replace />

  const save = async () => {
    if (saving) return
    setSaving(true)
    setFailed(false)
    try {
      const farm = await createFarm(form, farmer?.county ?? '')
      dispatch({ type: 'ADD_FARM', farm })
      reset()
      navigate(`/yield-analysis/${farm.id}`, { replace: true })
    } catch {
      setSaving(false)
      setFailed(true)
    }
  }

  return (
    <MapScreen
      title={t('confirm.title')}
      map={
        <FarmMap
          interactive={false}
          fitTo={form.boundary}
          polygons={[{ id: 'new', boundary: form.boundary, color: '#e0a526' }]}
        />
      }
      panel={
        <div className='stack-sm'>
          <p className='muted' style={{ margin: 0 }}>
            {t('confirm.body')}
          </p>
          <div className='row-between'>
            <div className='row'>
              {form.crop && <Icon name={CROP_ICON[form.crop]} size={32} />}
              <div>
                <div className='h3'>{form.name}</div>
                <div className='muted'>
                  {form.crop && t(`crop.${form.crop}`)} · {form.season && t(`season.${form.season}`)}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.areaReadout}>
            {t('boundary.area', { ha: formatHa(check.areaHa), acres: formatAcres(check.areaHa) })}
          </div>
          {failed && (
            <p role='alert' className={formStyles.error} style={{ margin: 0 }}>
              {t('error.generic.body')}
            </p>
          )}
          <div className='row'>
            <Button variant='secondary' onClick={() => navigate('/boundary-intro')}>
              {t('confirm.changeShape')}
            </Button>
            <Button block loading={saving} onClick={save}>
              {t('confirm.save')}
            </Button>
          </div>
          <Button variant='ghost' block onClick={() => navigate('/add-farm')}>
            {t('confirm.changeDetails')}
          </Button>
        </div>
      }
    />
  )
}
```

- [ ] **Step 4: Implement `src/pages/farm/ViewBoundary.tsx`**

```tsx
import { useParams } from 'react-router-dom'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import styles from '@/src/components/map/map.module.css'
import { useFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import { formatAcres, formatHa } from '@/src/utils/format'
import { pathLengthMeters } from '@/src/utils/geo'
import { healthStatus } from '@/src/utils/monitor'

export default function ViewBoundary() {
  const { farmId } = useParams()
  const farm = useFarm(farmId)
  if (!farm) return <NotFound />
  const perimeter = Math.round(pathLengthMeters([...farm.boundary, farm.boundary[0]]))
  return (
    <MapScreen
      title={farm.name}
      back={`/farm/${farm.id}`}
      map={
        <FarmMap
          interactive
          fitTo={farm.boundary}
          polygons={[{ id: farm.id, boundary: farm.boundary, color: STATUS_COLOR[healthStatus(farm.healthScore)] }]}
        />
      }
      panel={
        <div className='stack-sm'>
          <div className='muted'>{t('view.title')}</div>
          <div className={styles.areaReadout}>
            {t('boundary.area', { ha: formatHa(farm.areaHa), acres: formatAcres(farm.areaHa) })}
          </div>
          <div className='row-between'>
            <span>{t('view.corners', { n: farm.boundary.length })}</span>
            <span>{t('view.perimeter', { m: perimeter })}</span>
          </div>
        </div>
      }
    />
  )
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/pages/farm`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src
git commit -m "feat: add farm confirmation and boundary viewer"
```

---
### Task 20: Yield analysis and historical report

**Files:**
- Replace stubs: `src/pages/farm/YieldAnalysis.tsx`, `src/pages/farm/YieldReport.tsx`
- Modify: `src/i18n/en.ts`, `src/pages/pages.module.css` (append)
- Test: `src/pages/farm/yield.test.tsx`

**Interfaces:**
- Consumes: `analyzeFarmYield` (Task 9), `useFarm`, `usePolicyForFarm` (Task 8), `BarChart`, `Gauge` (Tasks 10–11), `Chip`, `LoadingState`, `Screen`, `Header` (Task 12), `NotFound` (Task 13).
- Produces: `/yield-analysis/:farmId` and `/yield-report/:farmId`; helper `useYieldAnalysis(farm?: Farm): YieldAnalysisResult | null` exported from `YieldAnalysis.tsx` (also used by `YieldReport.tsx`).

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'yield.title': 'Past harvests',
  'yield.intro': '{crop} harvests in {county} over the last {n} years',
  'yield.chart': 'Harvest per hectare by year',
  'yield.average': 'Average {avg} t',
  'yield.badYear': 'Bad year',
  'yield.goodYear': 'Normal year',
  'yield.riskTitle': 'Risk for this farm',
  'yield.summary': 'In {bad} of the last {total} seasons, harvests fell below 70% of normal.',
  'yield.meaning.low': 'Bad seasons are rare here, so your cover costs less.',
  'yield.meaning.medium': 'Bad seasons happen every few years. Cover protects your income when they do.',
  'yield.meaning.high': 'Bad seasons are common here. Insurance protects you the most.',
  'yield.cta': 'See insurance options',
  'yield.report': 'See full report',
  'yield.backToFarm': 'Back to farm',
  'risk.gauge': 'Risk level: {level}',
  'report.title': 'Harvest report',
  'report.rainChart': 'Season rainfall by year',
  'report.year': 'Year',
  'report.rain': 'Rain (mm)',
  'report.harvest': 'Harvest (t/ha)',
```

- [ ] **Step 2: Append page styles** to `src/pages/pages.module.css`:

```css
.legendRow {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.table th,
.table td {
  padding: var(--sp-3);
  text-align: right;
  border-bottom: 1px solid var(--line);
}
.table th:first-child,
.table td:first-child {
  text-align: left;
}
.table th {
  font-size: var(--fs-xs);
  color: var(--ink-3);
  text-transform: uppercase;
}
.table tr[data-bad='true'] td {
  background: var(--danger-bg);
  color: var(--danger);
  font-weight: 700;
}
```

- [ ] **Step 3: Write the failing tests `src/pages/farm/yield.test.tsx`**

```tsx
import { screen, within } from '@testing-library/react'
import YieldAnalysis from '@/src/pages/farm/YieldAnalysis'
import YieldReport from '@/src/pages/farm/YieldReport'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

const at = (id: string) => ({ route: `/yield-analysis/${id}`, path: '/yield-analysis/:farmId', state: seededState() })

test('high-risk beans farm: bad years highlighted and gauge says high', async () => {
  renderWithApp(<YieldAnalysis />, at('farm-beans'))
  const chart = await screen.findByRole('img', { name: 'Harvest per hectare by year' })
  expect(chart.querySelectorAll('[data-bar]')).toHaveLength(10)
  expect(chart.querySelectorAll('[data-highlight="true"]')).toHaveLength(4)
  expect(screen.getByText('In 4 of the last 10 seasons, harvests fell below 70% of normal.')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Risk level: High risk' })).toBeInTheDocument()
})

test('uninsured farm is offered insurance', async () => {
  const { user } = renderWithApp(<YieldAnalysis />, at('farm-tea'))
  await user.click(await screen.findByRole('button', { name: 'See insurance options' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/insure/farm-tea')
})

test('insured farm goes back to the farm', async () => {
  renderWithApp(<YieldAnalysis />, at('farm-maize'))
  expect(await screen.findByRole('button', { name: 'Back to farm' })).toBeInTheDocument()
})

test('unknown farm shows Not Found', () => {
  renderWithApp(<YieldAnalysis />, at('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('report lists every year and flags bad ones', async () => {
  renderWithApp(<YieldReport />, { route: '/yield-report/farm-beans', path: '/yield-report/:farmId', state: seededState() })
  const table = await screen.findByRole('table')
  const rows = within(table).getAllByRole('row')
  expect(rows).toHaveLength(11)
  expect(table.querySelectorAll('tr[data-bad="true"]')).toHaveLength(4)
  expect(screen.getByRole('img', { name: 'Season rainfall by year' })).toBeInTheDocument()
})
```

Run: `npm test -- src/pages/farm/yield`
Expected: FAIL.

- [ ] **Step 4: Implement `src/pages/farm/YieldAnalysis.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Gauge } from '@/src/components/charts/Gauge'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { useFarm, usePolicyForFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/pages.module.css'
import { analyzeFarmYield } from '@/src/services/farmService'
import type { Farm, RiskLevel, YieldAnalysisResult } from '@/src/types'

const RISK_VALUE: Record<RiskLevel, number> = { low: 0.5, medium: 1.5, high: 2.5 }

export function useYieldAnalysis(farm?: Farm): YieldAnalysisResult | null {
  const [result, setResult] = useState<YieldAnalysisResult | null>(null)
  const county = farm?.county
  const crop = farm?.crop
  useEffect(() => {
    if (!county || !crop) return
    let live = true
    analyzeFarmYield({ county, crop }).then((r) => live && setResult(r))
    return () => {
      live = false
    }
  }, [county, crop])
  return result
}

export const tonnes = (v: number) => `${Number(v.toFixed(1))} t`

export default function YieldAnalysis() {
  const { farmId } = useParams()
  const navigate = useNavigate()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  const result = useYieldAnalysis(farm)
  if (!farm) return <NotFound />

  const insured = policy?.status === 'active'
  const footer = result && (
    <>
      {insured ? (
        <Button block onClick={() => navigate(`/farm/${farm.id}`)}>
          {t('yield.backToFarm')}
        </Button>
      ) : (
        <Button block icon='shield' onClick={() => navigate(`/insure/${farm.id}`)}>
          {t('yield.cta')}
        </Button>
      )}
    </>
  )

  return (
    <Screen header={<Header title={t('yield.title')} back={`/farm/${farm.id}`} />} footer={footer}>
      {!result ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {t('yield.intro', { crop: t(`crop.${farm.crop}`), county: farm.county, n: result.history.length })}
          </p>
          <section className='card stack-sm'>
            <BarChart
              ariaLabel={t('yield.chart')}
              formatValue={tonnes}
              reference={{ value: result.averageYield, label: t('yield.average', { avg: result.averageYield }) }}
              bars={result.history.map((y) => {
                const bad = result.belowTriggerYears.includes(y.year)
                return {
                  label: String(y.year).slice(2),
                  value: y.yieldTPerHa,
                  color: bad ? STATUS_COLOR.danger : STATUS_COLOR.good,
                  highlight: bad,
                }
              })}
            />
            <div className={styles.legendRow}>
              <Chip status='danger'>{t('yield.badYear')}</Chip>
              <Chip status='good'>{t('yield.goodYear')}</Chip>
            </div>
          </section>
          <section className='card stack-sm'>
            <h2 className='h3'>{t('yield.riskTitle')}</h2>
            <Gauge
              value={RISK_VALUE[result.riskLevel]}
              min={0}
              max={3}
              bands={[
                { to: 1, color: STATUS_COLOR.good },
                { to: 2, color: STATUS_COLOR.warning },
                { to: 3, color: STATUS_COLOR.danger },
              ]}
              valueLabel={t(`risk.${result.riskLevel}`)}
              caption={t('yield.summary', { bad: result.belowTriggerYears.length, total: result.history.length })}
              ariaLabel={t('risk.gauge', { level: t(`risk.${result.riskLevel}`) })}
            />
            <p className='takeaway' style={{ margin: 0 }}>
              {t(`yield.meaning.${result.riskLevel}`)}
            </p>
          </section>
          <Link to={`/yield-report/${farm.id}`} className={styles.linkRow}>
            {t('yield.report')}
          </Link>
        </div>
      )}
    </Screen>
  )
}
```

Bar labels use two-digit years (`'18`, `'19`…) via `String(y.year).slice(2)` so ten labels fit at 360 px; the tooltip shows the same short label.

- [ ] **Step 5: Implement `src/pages/farm/YieldReport.tsx`**

```tsx
import { useParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { useFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import { useYieldAnalysis } from '@/src/pages/farm/YieldAnalysis'
import styles from '@/src/pages/pages.module.css'

export default function YieldReport() {
  const { farmId } = useParams()
  const farm = useFarm(farmId)
  const result = useYieldAnalysis(farm)
  if (!farm) return <NotFound />

  return (
    <Screen header={<Header title={t('report.title')} back={`/yield-analysis/${farm.id}`} />}>
      {!result ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <section className='card'>
            <BarChart
              ariaLabel={t('report.rainChart')}
              formatValue={(v) => `${Math.round(v)}`}
              bars={result.history.map((y) => ({
                label: String(y.year).slice(2),
                value: y.rainfallMm,
                color: 'var(--rain-400)',
              }))}
            />
          </section>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('report.year')}</th>
                <th>{t('report.rain')}</th>
                <th>{t('report.harvest')}</th>
              </tr>
            </thead>
            <tbody>
              {result.history.map((y) => (
                <tr key={y.year} data-bad={result.belowTriggerYears.includes(y.year)}>
                  <td>{y.year}</td>
                  <td>{y.rainfallMm}</td>
                  <td>{y.yieldTPerHa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  )
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- src/pages/farm/yield`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
npm run format
git add src
git commit -m "feat: add yield analysis with risk gauge and harvest report"
```

---

### Task 21: Insurance plan options and premium quote

**Files:**
- Create: `src/pages/insurance/useQuote.ts`, `src/pages/insurance/insurance.module.css`
- Replace stubs: `src/pages/insurance/PlanOptions.tsx`, `src/pages/insurance/PremiumQuote.tsx`
- Modify: `src/i18n/en.ts`
- Test: `src/pages/insurance/plans.test.tsx`

**Interfaces:**
- Consumes: `getQuote` (Task 9), `PLAN_LIST`, `RECOMMENDED_PLAN` (Task 2), `useFarm`, `usePolicyForFarm` (Task 8), `Donut`, `BarChart` (Tasks 10–11), common components, `NotFound`.
- Produces:
  - `useQuotes(farm: Farm | undefined, planIds: PlanId[]): Quote[] | null`, `planFromSearch(search: URLSearchParams): PlanId` (invalid/missing → `RECOMMENDED_PLAN`) — both in `useQuote.ts`.
  - `<TriggerBar triggerPct: number />` exported from `PlanOptions.tsx` (decorative SVG).
  - `/insure/:farmId` → Continue → `/premium-quote/:farmId?plan=<id>` → Pay → `/payment/:farmId?plan=<id>`.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'plans.title': 'Choose your cover',
  'plans.intro': 'Pick how much protection you want for {name}.',
  'plans.recommended': 'Most popular',
  'plans.trigger': 'Pays out if area harvest falls below {pct}% of normal',
  'plans.perSeason': 'per season',
  'plans.cover': 'Cover up to {amount}',
  'plans.payoutZone': 'Payout zone',
  'plans.continue': 'Continue',
  'plans.alreadyTitle': 'This farm is already insured',
  'plans.alreadyBody': 'Your cover is active until {date}.',
  'plans.viewPolicy': 'View policy',
  'quote.title': 'Your price',
  'quote.youPayBig': 'You pay {amount}',
  'quote.subsidyNote': 'The government pays half of your premium.',
  'quote.split': 'Who pays the premium',
  'quote.govPays': 'Government pays',
  'quote.youPay': 'You pay',
  'quote.total': 'total',
  'quote.cover': 'Cover',
  'quote.period': 'Cover period',
  'quote.exampleTitle': 'What you could get back',
  'quote.example': 'If harvests in your area drop to half of normal, you receive about {amount}.',
  'quote.youGet': 'You get',
  'quote.compare': 'What you pay compared with what you could get',
  'quote.howTitle': 'How it works',
  'quote.how1': 'Satellites watch rain and crop health in your area all season.',
  'quote.how2': 'After harvest, we compare your area harvest with normal years.',
  'quote.how3': 'If it is below {pct}%, money is sent to your M-Pesa. No claim forms.',
  'quote.pay': 'Pay {amount} with M-Pesa',
```

- [ ] **Step 2: Create `src/pages/insurance/insurance.module.css`**

```css
.planCard {
  position: relative;
  width: 100%;
  text-align: left;
  border: 3px solid transparent;
  cursor: pointer;
}
.planCard[aria-checked='true'] {
  border-color: var(--green-700);
}
.badge {
  position: absolute;
  top: -12px;
  right: var(--sp-4);
}
.price {
  font-size: var(--fs-2xl);
  font-weight: 800;
  color: var(--green-900);
}
.trigger {
  width: 100%;
  height: auto;
}
.bigPay {
  text-align: center;
  padding: var(--sp-5) var(--sp-4);
  background: linear-gradient(135deg, var(--green-700), var(--green-500));
  color: #fff;
  border-radius: var(--radius-lg);
}
.bigPay .figure {
  color: #fff;
}
.how {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--sp-3);
}
.how li {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: var(--sp-3);
  align-items: center;
}
.howIcon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--green-100);
  color: var(--green-700);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pulse {
  animation: pulse 1.4s var(--ease) infinite;
}
@keyframes pulse {
  50% {
    transform: scale(1.06);
  }
}
.confetti {
  animation: pop 700ms var(--ease) both;
}
@keyframes pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
}
.certificate {
  border: 2px dashed var(--green-300);
  background: linear-gradient(180deg, var(--surface), var(--green-100));
}
.certRow {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
  border-bottom: 1px solid var(--line);
}
.certRow:last-child {
  border-bottom: 0;
}
.certRow span:first-child {
  color: var(--ink-3);
}
.certRow span:last-child {
  font-weight: 700;
  text-align: right;
}
```

- [ ] **Step 3: Write the failing tests `src/pages/insurance/plans.test.tsx`**

```tsx
import { screen } from '@testing-library/react'
import PlanOptions from '@/src/pages/insurance/PlanOptions'
import PremiumQuote from '@/src/pages/insurance/PremiumQuote'
import { planFromSearch } from '@/src/pages/insurance/useQuote'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('planFromSearch falls back to the recommended plan', () => {
  expect(planFromSearch(new URLSearchParams('plan=premium'))).toBe('premium')
  expect(planFromSearch(new URLSearchParams('plan=gold'))).toBe('standard')
  expect(planFromSearch(new URLSearchParams(''))).toBe('standard')
})

test('plan options list three plans with standard preselected', async () => {
  const { user } = renderWithApp(<PlanOptions />, { route: '/insure/farm-tea', path: '/insure/:farmId', state: seededState() })
  const radios = await screen.findAllByRole('radio')
  expect(radios).toHaveLength(3)
  expect(screen.getByRole('radio', { name: /standard/i })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByText('Most popular')).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: /premium/i }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/premium-quote/farm-tea?plan=premium')
})

test('an insured farm is not sold a second policy', async () => {
  renderWithApp(<PlanOptions />, { route: '/insure/farm-maize', path: '/insure/:farmId', state: seededState() })
  expect(await screen.findByText('This farm is already insured')).toBeInTheDocument()
  expect(screen.queryAllByRole('radio')).toHaveLength(0)
})

test('plan options for an unknown farm shows Not Found', () => {
  renderWithApp(<PlanOptions />, { route: '/insure/nope', path: '/insure/:farmId', state: seededState() })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('premium quote shows the split, the example payout and the pay button', async () => {
  const { user } = renderWithApp(<PremiumQuote />, {
    route: '/premium-quote/farm-tea?plan=standard',
    path: '/premium-quote/:farmId',
    state: seededState(),
  })
  // tea: 2 ha x 300,000 x 0.7 = 420,000 cover; medium risk 7% = 29,400; farmer pays 14,700
  expect(await screen.findByText('You pay KES 14,700')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Who pays the premium' })).toBeInTheDocument()
  expect(screen.getByText(/you receive about KES 120,000/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pay KES 14,700 with M-Pesa' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/payment/farm-tea?plan=standard')
})
```

Check of the example: 420,000 × (70 − 50) / 70 = 120,000.

Run: `npm test -- src/pages/insurance/plans`
Expected: FAIL.

- [ ] **Step 4: Create `src/pages/insurance/useQuote.ts`**

```ts
import { useEffect, useState } from 'react'
import { PLAN_LIST, RECOMMENDED_PLAN } from '@/src/data/cropConfig'
import { getQuote } from '@/src/services/policyService'
import type { Farm, PlanId, Quote } from '@/src/types'

export function planFromSearch(search: URLSearchParams): PlanId {
  const plan = search.get('plan')
  return PLAN_LIST.includes(plan as PlanId) ? (plan as PlanId) : RECOMMENDED_PLAN
}

export function useQuotes(farm: Farm | undefined, planIds: PlanId[]): Quote[] | null {
  const [quotes, setQuotes] = useState<Quote[] | null>(null)
  const key = farm ? `${farm.id}:${farm.areaHa}:${farm.riskLevel}:${planIds.join(',')}` : ''
  useEffect(() => {
    if (!farm) return
    let live = true
    Promise.all(planIds.map((p) => getQuote(farm, p))).then((q) => live && setQuotes(q))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return quotes
}
```

- [ ] **Step 5: Implement `src/pages/insurance/PlanOptions.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { EmptyState, LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { useFarm, usePolicyForFarm } from '@/src/context/AppContext'
import { PLAN_LIST, RECOMMENDED_PLAN } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { useQuotes } from '@/src/pages/insurance/useQuote'
import type { PlanId } from '@/src/types'
import { formatDate, formatKES } from '@/src/utils/format'

export function TriggerBar({ triggerPct }: { triggerPct: number }) {
  const x = 8 + (184 * triggerPct) / 100
  return (
    <svg viewBox='0 0 200 34' className={styles.trigger} aria-hidden='true'>
      <rect x='8' y='8' width='184' height='14' rx='7' fill='#e3f5e8' />
      <rect x='8' y='8' width={x - 8} height='14' rx='7' fill='#fde4e4' />
      <line x1={x} x2={x} y1='2' y2='28' stroke='#c62828' strokeWidth='3' />
      <text x={(x + 8) / 2} y='19' textAnchor='middle' fontSize='9' fontWeight='700' fill='#c62828'>
        {t('plans.payoutZone')}
      </text>
      <text x={x} y='33' textAnchor='middle' fontSize='8' fill='#44514a'>
        {triggerPct}%
      </text>
    </svg>
  )
}

export default function PlanOptions() {
  const { farmId } = useParams()
  const navigate = useNavigate()
  const farm = useFarm(farmId)
  const policy = usePolicyForFarm(farmId)
  const quotes = useQuotes(farm, PLAN_LIST)
  const [selected, setSelected] = useState<PlanId>(RECOMMENDED_PLAN)
  if (!farm) return <NotFound />

  if (policy?.status === 'active') {
    return (
      <Screen header={<Header title={t('plans.title')} back={`/farm/${farm.id}`} />}>
        <EmptyState
          title={t('plans.alreadyTitle')}
          message={t('plans.alreadyBody', { date: formatDate(policy.coverageEnd) })}
          action={
            <Button block onClick={() => navigate(`/policy/${policy.id}`)}>
              {t('plans.viewPolicy')}
            </Button>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={<Header title={t('plans.title')} back />}
      footer={
        quotes && (
          <Button block onClick={() => navigate(`/premium-quote/${farm.id}?plan=${selected}`)}>
            {t('plans.continue')}
          </Button>
        )
      }
    >
      <div className='stack'>
        <p style={{ margin: 0, fontSize: 'var(--fs-md)' }}>{t('plans.intro', { name: farm.name })}</p>
        {!quotes ? (
          <LoadingState />
        ) : (
          <div role='radiogroup' aria-label={t('plans.title')} className='stack'>
            {quotes.map((q) => (
              <button
                key={q.planId}
                type='button'
                role='radio'
                aria-checked={selected === q.planId}
                className={`card ${styles.planCard}`}
                onClick={() => setSelected(q.planId)}
              >
                {q.planId === RECOMMENDED_PLAN && (
                  <span className={styles.badge}>
                    <Chip status='good'>{t('plans.recommended')}</Chip>
                  </span>
                )}
                <div className='row-between'>
                  <span className='h3'>{t(`plan.${q.planId}`)}</span>
                  <span className={styles.price}>{formatKES(q.farmerPremiumKES)}</span>
                </div>
                <div className='muted' style={{ textAlign: 'right' }}>
                  {t('plans.perSeason')}
                </div>
                <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>
                  {t('plans.cover', { amount: formatKES(q.sumInsuredKES) })}
                </div>
                <div className='muted'>{t('plans.trigger', { pct: q.triggerYieldPct })}</div>
                <TriggerBar triggerPct={q.triggerYieldPct} />
              </button>
            ))}
          </div>
        )}
      </div>
    </Screen>
  )
}
```

- [ ] **Step 6: Implement `src/pages/insurance/PremiumQuote.tsx`**

```tsx
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Donut } from '@/src/components/charts/Donut'
import { Button } from '@/src/components/common/Button'
import { LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarm } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { planFromSearch, useQuotes } from '@/src/pages/insurance/useQuote'
import { formatDate, formatKES } from '@/src/utils/format'

export default function PremiumQuote() {
  const { farmId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const farm = useFarm(farmId)
  const planId = planFromSearch(search)
  const quote = useQuotes(farm, [planId])?.[0]
  if (!farm) return <NotFound />

  const payLabel = quote ? t('quote.pay', { amount: formatKES(quote.farmerPremiumKES) }) : ''

  return (
    <Screen
      header={<Header title={t('quote.title')} back />}
      footer={
        quote && (
          <Button block icon='phone' onClick={() => navigate(`/payment/${farm.id}?plan=${planId}`)}>
            {payLabel}
          </Button>
        )
      }
    >
      {!quote ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <section className={styles.bigPay}>
            <div>{t(`plan.${quote.planId}`)} · {farm.name}</div>
            <div className='figure'>{t('quote.youPayBig', { amount: formatKES(quote.farmerPremiumKES) })}</div>
            <div>{t('quote.subsidyNote')}</div>
          </section>

          <section className='card stack-sm'>
            <h2 className='h3'>{t('quote.split')}</h2>
            <Donut
              ariaLabel={t('quote.split')}
              formatValue={formatKES}
              centerLabel={formatKES(quote.premiumKES).replace('KES ', '')}
              centerSub={t('quote.total')}
              segments={[
                { label: t('quote.govPays'), value: quote.subsidyKES, color: 'var(--rain-400)' },
                { label: t('quote.youPay'), value: quote.farmerPremiumKES, color: 'var(--green-700)' },
              ]}
            />
          </section>

          <section className='card stack-sm'>
            <div className='row-between'>
              <span className='muted'>{t('quote.cover')}</span>
              <strong>{formatKES(quote.sumInsuredKES)}</strong>
            </div>
            <div className='row-between'>
              <span className='muted'>{t('quote.period')}</span>
              <strong>
                {formatDate(quote.coverageStart)} – {formatDate(quote.coverageEnd)}
              </strong>
            </div>
          </section>

          <section className='card stack-sm'>
            <h2 className='h3'>{t('quote.exampleTitle')}</h2>
            <p style={{ margin: 0 }}>{t('quote.example', { amount: formatKES(quote.exampleAt50PctKES) })}</p>
            <BarChart
              ariaLabel={t('quote.compare')}
              height={160}
              formatValue={(v) => `${Math.round(v / 1000)}k`}
              bars={[
                { label: t('quote.youPay'), value: quote.farmerPremiumKES, color: 'var(--gold-500)' },
                { label: t('quote.youGet'), value: quote.exampleAt50PctKES, color: 'var(--green-500)' },
              ]}
            />
          </section>

          <section className='card stack-sm'>
            <h2 className='h3'>{t('quote.howTitle')}</h2>
            <ol className={styles.how}>
              <li>
                <span className={styles.howIcon}>
                  <Icon name='satellite' />
                </span>
                {t('quote.how1')}
              </li>
              <li>
                <span className={styles.howIcon}>
                  <Icon name='chart' />
                </span>
                {t('quote.how2')}
              </li>
              <li>
                <span className={styles.howIcon}>
                  <Icon name='cash' />
                </span>
                {t('quote.how3', { pct: quote.triggerYieldPct })}
              </li>
            </ol>
          </section>
        </div>
      )}
    </Screen>
  )
}
```

- [ ] **Step 7: Run tests**

Run: `npm test -- src/pages/insurance`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
npm run format
git add src
git commit -m "feat: add plan options and premium quote with visual breakdown"
```

---
### Task 22: Simulated M-Pesa payment and policy confirmation

**Files:**
- Replace stubs: `src/pages/insurance/Payment.tsx`, `src/pages/insurance/Confirmation.tsx`
- Modify: `src/i18n/en.ts`
- Test: `src/pages/insurance/payment.test.tsx`

**Interfaces:**
- Consumes: `requestMpesaPayment` (Task 9), `createPolicy` (Task 9), `useQuotes`, `planFromSearch` (Task 21), `normalizeKenyanPhone`, `formatPhone` (Task 3), `useApp`, `useFarm`, `useFarmer`, `usePolicies` (Task 8), `PhonePay`, `Celebrate`, `ErrorState`, `Field`, `NotFound`, `insurance.module.css` (Task 21).
- Produces: `/payment/:farmId?plan=` with phases `confirm → waiting → (success | failed | timeout)`; on success dispatches exactly one `ADD_POLICY` and replaces the route with `/confirmation/:farmId?policy=<policyId>`; `/confirmation/:farmId` shows the certificate (falls back to the farm's active policy when `?policy` is absent).

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'pay.title': 'Pay with M-Pesa',
  'pay.number': 'M-Pesa number',
  'pay.for': '{plan} cover for {farm}',
  'pay.cta': 'Pay {amount}',
  'pay.demoHint': 'Demo: numbers ending in 0 fail, numbers ending in 9 time out.',
  'pay.waitTitle': 'Check your phone',
  'pay.waitBody': 'Enter your M-Pesa PIN to pay {amount} to Agrails.',
  'pay.countdown': 'Waiting {s}s',
  'pay.timeoutTitle': 'We did not hear back from M-Pesa',
  'pay.timeoutBody': 'No money was taken. Make sure your phone is on and try again.',
  'conf.title': 'You are covered!',
  'conf.body': '{farm} is now protected for the season.',
  'conf.certificate': 'Policy certificate',
  'conf.policyNo': 'Policy number',
  'conf.farm': 'Farm',
  'conf.plan': 'Plan',
  'conf.period': 'Cover period',
  'conf.cover': 'Cover',
  'conf.paid': 'You paid',
  'conf.receipt': 'M-Pesa receipt',
  'conf.goFarm': 'Go to my farm',
  'conf.allPolicies': 'See all my policies',
```

- [ ] **Step 2: Write the failing tests `src/pages/insurance/payment.test.tsx`**

```tsx
import { screen } from '@testing-library/react'
import { STATE_KEY } from '@/src/context/persistence'
import Confirmation from '@/src/pages/insurance/Confirmation'
import Payment from '@/src/pages/insurance/Payment'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

const payAt = (id = 'farm-tea') => ({
  route: `/payment/${id}?plan=standard`,
  path: '/payment/:farmId',
  state: seededState(),
})

const storedPolicies = () => JSON.parse(localStorage.getItem(STATE_KEY)!).policies as unknown[]

test('successful payment creates one policy, even on a double tap', async () => {
  const { user } = renderWithApp(<Payment />, payAt())
  expect(await screen.findByText('Standard cover for Tea Garden')).toBeInTheDocument()
  expect(screen.getByLabelText('M-Pesa number')).toHaveValue('712345678')
  await user.dblClick(screen.getByRole('button', { name: 'Pay KES 14,700' }))
  expect(await screen.findByTestId('location')).toHaveTextContent(/^\/confirmation\/farm-tea\?policy=policy-/)
  expect(storedPolicies()).toHaveLength(3)
})

test('a declined payment can be retried', async () => {
  const { user } = renderWithApp(<Payment />, payAt())
  const input = await screen.findByLabelText('M-Pesa number')
  await user.clear(input)
  await user.type(input, '712345670')
  await user.click(screen.getByRole('button', { name: 'Pay KES 14,700' }))
  expect(await screen.findByText('Payment did not go through')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(screen.getByRole('button', { name: 'Pay KES 14,700' })).toBeInTheDocument()
  expect(storedPolicies()).toHaveLength(2)
})

test('a timed-out payment says so', async () => {
  const { user } = renderWithApp(<Payment />, payAt())
  const input = await screen.findByLabelText('M-Pesa number')
  await user.clear(input)
  await user.type(input, '712345679')
  await user.click(screen.getByRole('button', { name: 'Pay KES 14,700' }))
  expect(await screen.findByText('We did not hear back from M-Pesa')).toBeInTheDocument()
})

test('an invalid number is caught before paying', async () => {
  const { user } = renderWithApp(<Payment />, payAt())
  const input = await screen.findByLabelText('M-Pesa number')
  await user.clear(input)
  await user.type(input, '123')
  await user.click(screen.getByRole('button', { name: 'Pay KES 14,700' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Safaricom or Airtel')
})

test('payment for an unknown farm shows Not Found', () => {
  renderWithApp(<Payment />, payAt('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('confirmation shows the certificate and links to the farm', async () => {
  const { user } = renderWithApp(<Confirmation />, {
    route: '/confirmation/farm-maize?policy=policy-maize',
    path: '/confirmation/:farmId',
    state: seededState(),
  })
  expect(screen.getByText('You are covered!')).toBeInTheDocument()
  expect(screen.getByText('AGR-2026-004417')).toBeInTheDocument()
  expect(screen.getByText('SJK4H7Q2TZ')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Go to my farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/farm/farm-maize')
})

test('confirmation without a policy shows Not Found', () => {
  renderWithApp(<Confirmation />, { route: '/confirmation/farm-tea', path: '/confirmation/:farmId', state: seededState() })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
```

Run: `npm test -- src/pages/insurance/payment`
Expected: FAIL.

- [ ] **Step 3: Implement `src/pages/insurance/Payment.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { ErrorState, LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { PhonePay } from '@/src/components/common/Illustrations'
import { Screen } from '@/src/components/common/Screen'
import { Field } from '@/src/components/forms/Field'
import formStyles from '@/src/components/forms/forms.module.css'
import { useApp, useFarm, useFarmer } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { planFromSearch, useQuotes } from '@/src/pages/insurance/useQuote'
import { requestMpesaPayment } from '@/src/services/paymentService'
import { createPolicy } from '@/src/services/policyService'
import { formatKES } from '@/src/utils/format'
import { normalizeKenyanPhone } from '@/src/utils/validation'

type Phase = 'confirm' | 'waiting' | 'failed' | 'timeout'
const WAIT_SECONDS = 60

export default function Payment() {
  const { farmId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farmer = useFarmer()
  const farm = useFarm(farmId)
  const planId = planFromSearch(search)
  const quote = useQuotes(farm, [planId])?.[0]
  const [phone, setPhone] = useState((farmer?.phone ?? '').replace(/^\+254/, ''))
  const [phoneError, setPhoneError] = useState<string>()
  const [phase, setPhase] = useState<Phase>('confirm')
  const [seconds, setSeconds] = useState(WAIT_SECONDS)
  // A ref, not state: it must block a second tap before React re-renders.
  const inFlight = useRef(false)
  const attempt = useRef(0)

  useEffect(() => {
    if (phase !== 'waiting' || seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, seconds])

  if (!farm) return <NotFound />

  const amount = quote ? formatKES(quote.farmerPremiumKES) : ''

  const pay = async () => {
    if (inFlight.current || !quote) return
    const e164 = normalizeKenyanPhone(phone)
    if (!e164) {
      setPhoneError(t('phone.error'))
      return
    }
    inFlight.current = true
    const id = ++attempt.current
    setSeconds(WAIT_SECONDS)
    setPhase('waiting')
    const result = await requestMpesaPayment(e164, quote.farmerPremiumKES)
    if (id !== attempt.current) return // farmer cancelled while waiting
    if (result.status === 'success') {
      const policy = await createPolicy(quote, result.receipt)
      dispatch({ type: 'ADD_POLICY', policy })
      navigate(`/confirmation/${farm.id}?policy=${policy.id}`, { replace: true })
      return
    }
    inFlight.current = false
    setPhase(result.status === 'failed' ? 'failed' : 'timeout')
  }

  const backToConfirm = () => {
    attempt.current += 1
    inFlight.current = false
    setPhase('confirm')
  }

  if (phase === 'waiting') {
    return (
      <Screen footer={<Button variant='ghost' block onClick={backToConfirm}>{t('common.cancel')}</Button>}>
        <div className='stack' style={{ textAlign: 'center', paddingTop: 'var(--sp-6)' }}>
          <PhonePay className={styles.pulse} />
          <h1 className='h1'>{t('pay.waitTitle')}</h1>
          <p style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{t('pay.waitBody', { amount })}</p>
          <div>
            <Chip status='warning'>{t('pay.countdown', { s: seconds })}</Chip>
          </div>
        </div>
      </Screen>
    )
  }

  if (phase === 'failed' || phase === 'timeout') {
    return (
      <Screen header={<Header back={`/farm/${farm.id}`} />}>
        <ErrorState
          kind='payment'
          title={phase === 'timeout' ? t('pay.timeoutTitle') : undefined}
          message={phase === 'timeout' ? t('pay.timeoutBody') : undefined}
          onRetry={backToConfirm}
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={<Header title={t('pay.title')} back />}
      footer={
        quote && (
          <Button block icon='phone' onClick={pay}>
            {t('pay.cta', { amount })}
          </Button>
        )
      }
    >
      {!quote ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <section className={styles.bigPay}>
            <div>{t('pay.for', { plan: t(`plan.${planId}`), farm: farm.name })}</div>
            <div className='figure'>{amount}</div>
          </section>
          <Field id='mpesa' label={t('pay.number')} error={phoneError} hint={t('pay.demoHint')}>
            <div className={formStyles.phoneRow}>
              <span className={formStyles.prefix}>+254</span>
              <input
                id='mpesa'
                className={formStyles.input}
                type='tel'
                inputMode='tel'
                value={phone}
                aria-invalid={!!phoneError}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setPhoneError(undefined)
                }}
              />
            </div>
          </Field>
        </div>
      )}
    </Screen>
  )
}
```

- [ ] **Step 4: Implement `src/pages/insurance/Confirmation.tsx`**

```tsx
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Celebrate } from '@/src/components/common/Illustrations'
import { Screen } from '@/src/components/common/Screen'
import { useFarm, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/insurance/insurance.module.css'
import { formatDate, formatKES } from '@/src/utils/format'

export default function Confirmation() {
  const { farmId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const farm = useFarm(farmId)
  const policies = usePolicies()
  const policy =
    policies.find((p) => p.id === search.get('policy') && p.farmId === farmId) ??
    policies.find((p) => p.farmId === farmId && p.status === 'active')
  if (!farm || !policy) return <NotFound />

  const rows: [string, string][] = [
    [t('conf.policyNo'), policy.policyNumber],
    [t('conf.farm'), farm.name],
    [t('conf.plan'), t(`plan.${policy.planId}`)],
    [t('conf.period'), `${formatDate(policy.coverageStart)} – ${formatDate(policy.coverageEnd)}`],
    [t('conf.cover'), formatKES(policy.sumInsuredKES)],
    [t('conf.paid'), formatKES(policy.farmerPremiumKES)],
    [t('conf.receipt'), policy.mpesaReceipt],
  ]

  return (
    <Screen
      footer={
        <>
          <Button block onClick={() => navigate(`/farm/${farm.id}`, { replace: true })}>
            {t('conf.goFarm')}
          </Button>
          <Button block variant='ghost' onClick={() => navigate('/policies')}>
            {t('conf.allPolicies')}
          </Button>
        </>
      }
    >
      <div className='stack' style={{ textAlign: 'center' }}>
        <Celebrate className={styles.confetti} />
        <h1 className='h1'>{t('conf.title')}</h1>
        <p style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{t('conf.body', { farm: farm.name })}</p>
        <section className={`card ${styles.certificate}`} style={{ textAlign: 'left' }}>
          <h2 className='h3' style={{ marginBottom: 'var(--sp-2)' }}>
            {t('conf.certificate')}
          </h2>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.certRow}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/pages/insurance`
Expected: PASS.

- [ ] **Step 6: Manual check of the purchase journey**

`npm run dev` → log in as `712 345 678` → Home → "Insure Tea Garden" → choose Standard → Continue → check the donut and payout comparison → Pay. Confirm the pulsing phone screen shows for ~4 s, then the certificate. Repeat with M-Pesa number `712345670` (declined) and `712345679` (wait 60 s; times out). Tap Pay twice fast and confirm only one new policy appears under Profile → Policies (after Task 26).

- [ ] **Step 7: Commit**

```bash
npm run format
git add src
git commit -m "feat: add simulated M-Pesa payment and policy certificate"
```

---
### Task 23: Farm monitoring — list and detail tabs (NDVI, rainfall, SPI, temperature)

**Files:**
- Create: `src/pages/monitor/signals.ts`, `src/pages/monitor/monitor.module.css`
- Replace stubs: `src/pages/monitor/MonitorList.tsx`, `src/pages/monitor/MonitorDetail.tsx`
- Modify: `src/i18n/en.ts`
- Test: `src/pages/monitor/signals.test.ts`, `src/pages/monitor/monitor.test.tsx`

**Interfaces:**
- Consumes: `seriesFor`, `getSeries` (Task 9), `classifySpi`, `classifyNdvi`, `heatStressWeeks`, `rainfallDeficitPct`, `healthStatus`, `last` (Task 6), `CROPS`, `HEAT_STRESS_C` (Task 2), `LineChart`, `BarChart`, `Gauge`, `RangeStrip`, `Ring` (Tasks 10–11), `STATUS_COLOR` (Task 15), common components, `NotFound`.
- Produces:
  - type `Signal = { key: 'ndvi' | 'rain' | 'spi' | 'heat'; status: Status; text: string }`
  - `farmSignals(series: MonitorSeries, crop: Crop): Signal[]` (always 4, in key order)
  - `worstSignal(signals: Signal[]): Signal` (danger > warning > good; ties keep key order)
  - `nearbyPercentile(score: number): number` (5–95)
  - `/monitor/:farmId?tab=ndvi|rain|spi|heat` (default `ndvi`), tabs with `role="tab"`.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'mon.title': 'Farm health',
  'mon.intro': 'Updated every week from satellite and weather data.',
  'mon.updated': 'Updated {date}',
  'mon.allGood': 'All signals look good',
  'mon.emptyTitle': 'No farms to watch yet',
  'mon.emptyBody': 'Add a farm and we will start watching it from space.',
  'mon.tab.ndvi': 'Crop health',
  'mon.tab.rain': 'Rainfall',
  'mon.tab.spi': 'Drought',
  'mon.tab.heat': 'Temperature',
  'mon.signal.ndvi': 'Crop: {label}',
  'mon.signal.rainLow': 'Rain {pct}% below normal',
  'mon.signal.rainHigh': 'Rain {pct}% above normal',
  'mon.signal.rainOk': 'Rain near normal',
  'mon.signal.spi': 'Drought index: {label}',
  'mon.signal.heat': '{n} very hot weeks',
  'mon.signal.noHeat': 'No heat stress',
  'mon.ndvi.good': 'Your {crop} is growing well. It is greener than {pct}% of farms nearby.',
  'mon.ndvi.warning': 'Your {crop} is showing stress. Check for pests, and water if you can.',
  'mon.ndvi.danger': 'Your {crop} is in poor health. Greenness has dropped sharply.',
  'mon.ndvi.chart': 'Crop greenness (NDVI) by week',
  'mon.ndvi.band': 'Healthy range',
  'mon.ndvi.today': 'Today',
  'mon.ndvi.explain': 'Greenness (NDVI) is measured by satellite. Higher means healthier plants.',
  'mon.rain.low': 'Rain was {pct}% below normal in the last 4 weeks.',
  'mon.rain.high': 'Rain was {pct}% above normal in the last 4 weeks.',
  'mon.rain.ok': 'Rainfall is close to normal for this time of year.',
  'mon.rain.chart': 'Weekly rainfall in mm',
  'mon.rain.normal': 'Normal',
  'mon.rain.season': 'This season {actual} mm · Normal {normal} mm',
  'mon.spi.good': 'No drought. Soil moisture is close to normal.',
  'mon.spi.warning': 'Conditions are drier (or wetter) than normal. Keep watching.',
  'mon.spi.danger': 'Your area is in drought. If harvests fail, your insurance can pay out.',
  'mon.spi.gauge': 'Drought index (SPI) {value}',
  'mon.spi.dry': 'Very dry',
  'mon.spi.wet': 'Very wet',
  'mon.spi.chart': 'Drought index by week',
  'mon.spi.band': 'Normal',
  'mon.heat.some': 'There were {n} very hot weeks (above 32°C). Heat can harm flowering.',
  'mon.heat.none': 'No heat stress in the last 8 weeks.',
  'mon.heat.chart': 'Weekly lowest and highest temperature',
  'mon.heat.threshold': 'Heat stress',
```

- [ ] **Step 2: Write the failing tests**

`src/pages/monitor/signals.test.ts`:

```ts
import { generateSeries } from '@/src/data/generators'
import { farmSignals, nearbyPercentile, worstSignal } from '@/src/pages/monitor/signals'

const END = new Date('2026-10-22T00:00:00.000Z')

test('a drought farm has a danger signal from the drought index', () => {
  const s = generateSeries({ seed: 3, crop: 'beans', scenario: 'drought', endDate: END })
  const signals = farmSignals(s, 'beans')
  expect(signals.map((x) => x.key)).toEqual(['ndvi', 'rain', 'spi', 'heat'])
  const worst = worstSignal(signals)
  expect(worst.status).toBe('danger')
})

test('a healthy farm is all good', () => {
  const s = generateSeries({ seed: 3, crop: 'maize', scenario: 'healthy', endDate: END })
  expect(farmSignals(s, 'maize').every((x) => x.status === 'good')).toBe(true)
})

test('nearbyPercentile stays between 5 and 95', () => {
  expect(nearbyPercentile(100)).toBe(90)
  expect(nearbyPercentile(0)).toBe(5)
})
```

`src/pages/monitor/monitor.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import MonitorDetail from '@/src/pages/monitor/MonitorDetail'
import MonitorList from '@/src/pages/monitor/MonitorList'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('list shows each farm with its health ring and worst signal', () => {
  renderWithApp(<MonitorList />, { route: '/monitor', path: '/monitor', state: seededState() })
  const links = screen.getAllByRole('link', { name: /^(Lower Shamba|Machakos Plot|Tea Garden)/ })
  expect(links).toHaveLength(3)
  expect(screen.getByText(/Drought index: Severe drought/)).toBeInTheDocument()
})

test('list shows an empty state without farms', () => {
  renderWithApp(<MonitorList />, { route: '/monitor', path: '/monitor', state: { ...seededState(), farms: [] } })
  expect(screen.getByText('No farms to watch yet')).toBeInTheDocument()
})

const detail = (id: string, tab = '') => ({
  route: `/monitor/${id}${tab ? `?tab=${tab}` : ''}`,
  path: '/monitor/:farmId',
  state: seededState(),
})

test('detail opens on crop health with a takeaway and chart', async () => {
  renderWithApp(<MonitorDetail />, detail('farm-maize'))
  expect(await screen.findByRole('img', { name: 'Crop greenness (NDVI) by week' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Crop health' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText(/Your Maize is growing well/)).toBeInTheDocument()
})

test('switching tabs shows rainfall, drought and temperature views', async () => {
  const { user } = renderWithApp(<MonitorDetail />, detail('farm-beans'))
  await user.click(await screen.findByRole('tab', { name: 'Rainfall' }))
  expect(screen.getByRole('img', { name: 'Weekly rainfall in mm' })).toBeInTheDocument()
  expect(screen.getByText(/below normal in the last 4 weeks/)).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Drought' }))
  expect(screen.getByText('Your area is in drought. If harvests fail, your insurance can pay out.')).toBeInTheDocument()
  expect(screen.getByTestId('gauge-needle')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Temperature' }))
  expect(screen.getByRole('img', { name: 'Weekly lowest and highest temperature' })).toBeInTheDocument()
  expect(screen.getByText(/very hot weeks/)).toBeInTheDocument()
})

test('tab can be deep-linked', async () => {
  renderWithApp(<MonitorDetail />, detail('farm-beans', 'spi'))
  expect(await screen.findByRole('tab', { name: 'Drought' })).toHaveAttribute('aria-selected', 'true')
})

test('unknown farm shows Not Found', () => {
  renderWithApp(<MonitorDetail />, detail('nope'))
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
```

Run: `npm test -- src/pages/monitor`
Expected: FAIL.

- [ ] **Step 3: Create `src/pages/monitor/signals.ts`**

```ts
import { t } from '@/src/i18n'
import type { Crop, MonitorSeries, Status } from '@/src/types'
import { classifyNdvi, classifySpi, heatStressWeeks, last, rainfallDeficitPct } from '@/src/utils/monitor'

export interface Signal {
  key: 'ndvi' | 'rain' | 'spi' | 'heat'
  status: Status
  text: string
}

const RANK: Record<Status, number> = { good: 0, warning: 1, danger: 2 }

export function farmSignals(series: MonitorSeries, crop: Crop): Signal[] {
  const ndvi = classifyNdvi(last(series.ndvi), crop)
  const spi = classifySpi(last(series.spi))
  const deficit = rainfallDeficitPct(series)
  const hot = heatStressWeeks(series).filter((i) => i >= series.weeks.length - 8).length
  return [
    { key: 'ndvi', status: ndvi.status, text: t('mon.signal.ndvi', { label: t(ndvi.label) }) },
    {
      key: 'rain',
      status: deficit >= 40 ? 'danger' : deficit >= 20 ? 'warning' : 'good',
      text:
        deficit >= 20
          ? t('mon.signal.rainLow', { pct: deficit })
          : deficit <= -20
            ? t('mon.signal.rainHigh', { pct: -deficit })
            : t('mon.signal.rainOk'),
    },
    { key: 'spi', status: spi.status, text: t('mon.signal.spi', { label: t(spi.label) }) },
    {
      key: 'heat',
      status: hot >= 3 ? 'danger' : hot > 0 ? 'warning' : 'good',
      text: hot > 0 ? t('mon.signal.heat', { n: hot }) : t('mon.signal.noHeat'),
    },
  ]
}

export function worstSignal(signals: Signal[]): Signal {
  return signals.reduce((worst, s) => (RANK[s.status] > RANK[worst.status] ? s : worst), signals[0])
}

/** Illustrative "greener than X% of farms nearby" figure derived from the health score. */
export function nearbyPercentile(score: number): number {
  return Math.min(95, Math.max(5, Math.round(score * 0.9)))
}
```

Beans drought check: the last SPI is −1.68 (severe drought → `danger`) and NDVI ~0.30 is `warning`. The list page shows **every** non-good signal (not only the worst), so the SPI text is always visible for the beans farm.

- [ ] **Step 4: Create `src/pages/monitor/monitor.module.css`**

```css
.row {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: var(--sp-3);
  align-items: center;
}
.signals {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--fs-sm);
}
.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  background: var(--surface);
  border-radius: var(--radius-pill);
  padding: 4px;
  box-shadow: var(--shadow);
  position: sticky;
  top: 56px;
  z-index: 5;
}
.tab {
  min-height: 44px;
  border: 0;
  border-radius: var(--radius-pill);
  background: none;
  font-weight: 700;
  font-size: var(--fs-xs);
  color: var(--ink-3);
  cursor: pointer;
}
.tab[aria-selected='true'] {
  background: var(--green-700);
  color: #fff;
}
.summary {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.statRow {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
}
```

- [ ] **Step 5: Implement `src/pages/monitor/MonitorList.tsx`**

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { Ring } from '@/src/components/charts/Ring'
import { Button } from '@/src/components/common/Button'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { useFarms } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import { farmSignals } from '@/src/pages/monitor/signals'
import styles from '@/src/pages/monitor/monitor.module.css'
import { seriesFor } from '@/src/services/monitorService'
import { healthStatus } from '@/src/utils/monitor'

export default function MonitorList() {
  const farms = useFarms()
  const navigate = useNavigate()
  return (
    <Screen nav>
      <div className='stack'>
        <div>
          <h1 className='h1'>{t('mon.title')}</h1>
          <p className='muted' style={{ margin: '4px 0 0' }}>
            {t('mon.intro')}
          </p>
        </div>
        {farms.length === 0 ? (
          <EmptyState
            title={t('mon.emptyTitle')}
            message={t('mon.emptyBody')}
            action={
              <Button block icon='plus' onClick={() => navigate('/add-farm')}>
                {t('home.addFarm')}
              </Button>
            }
          />
        ) : (
          farms.map((farm) => {
            const status = healthStatus(farm.healthScore)
            const issues = farmSignals(seriesFor(farm), farm.crop).filter((s) => s.status !== 'good')
            return (
              <Link key={farm.id} to={`/monitor/${farm.id}`} className={`card card-tap ${styles.row}`}>
                {/* hidden from screen readers so the link name starts with the farm name */}
                <div aria-hidden='true'>
                  <Ring
                    value={farm.healthScore}
                    size={72}
                    stroke={8}
                    status={status}
                    label={farm.healthScore}
                    ariaLabel={t('farm.health', { score: farm.healthScore })}
                  />
                </div>
                <div>
                  <div className='h3'>{farm.name}</div>
                  <div className={styles.signals}>
                    {issues.length === 0 ? (
                      <span style={{ color: STATUS_COLOR.good }}>{t('mon.allGood')}</span>
                    ) : (
                      issues.map((s) => (
                        <span key={s.key} style={{ color: STATUS_COLOR[s.status] }}>
                          {s.text}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <Icon name='chevron' />
              </Link>
            )
          })
        )}
      </div>
    </Screen>
  )
}
```

- [ ] **Step 6: Implement `src/pages/monitor/MonitorDetail.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Gauge } from '@/src/components/charts/Gauge'
import { LineChart } from '@/src/components/charts/LineChart'
import { RangeStrip } from '@/src/components/charts/RangeStrip'
import { Ring } from '@/src/components/charts/Ring'
import { Chip } from '@/src/components/common/Chip'
import { LoadingState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { useFarm } from '@/src/context/AppContext'
import { CROPS, HEAT_STRESS_C } from '@/src/data/cropConfig'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import { nearbyPercentile } from '@/src/pages/monitor/signals'
import styles from '@/src/pages/monitor/monitor.module.css'
import { getSeries } from '@/src/services/monitorService'
import type { Farm, MonitorSeries } from '@/src/types'
import { formatDate, formatShortDate } from '@/src/utils/format'
import {
  classifyNdvi,
  classifySpi,
  healthStatus,
  heatStressWeeks,
  last,
  rainfallDeficitPct,
} from '@/src/utils/monitor'

type Tab = 'ndvi' | 'rain' | 'spi' | 'heat'
const TABS: Tab[] = ['ndvi', 'rain', 'spi', 'heat']

function NdviTab({ farm, s }: { farm: Farm; s: MonitorSeries }) {
  const c = classifyNdvi(last(s.ndvi), farm.crop)
  const crop = t(`crop.${farm.crop}`)
  const [lo, hi] = CROPS[farm.crop].ndviHealthy
  return (
    <div className='stack'>
      <p className='takeaway' style={{ margin: 0 }}>
        {t(`mon.ndvi.${c.status}`, { crop, pct: nearbyPercentile(farm.healthScore) })}
      </p>
      <section className='card'>
        <LineChart
          ariaLabel={t('mon.ndvi.chart')}
          values={s.ndvi}
          labels={s.weeks.map(formatShortDate)}
          yDomain={[0.1, 0.9]}
          band={{ from: lo, to: hi, label: t('mon.ndvi.band') }}
          markerIndex={s.ndvi.length - 1}
          markerLabel={t('mon.ndvi.today')}
          formatValue={(v) => v.toFixed(1)}
        />
      </section>
      <p className='muted' style={{ margin: 0 }}>
        {t('mon.ndvi.explain')}
      </p>
    </div>
  )
}

function RainTab({ s }: { s: MonitorSeries }) {
  const deficit = rainfallDeficitPct(s)
  const takeaway =
    deficit >= 20 ? t('mon.rain.low', { pct: deficit }) : deficit <= -20 ? t('mon.rain.high', { pct: -deficit }) : t('mon.rain.ok')
  const normalAvg = s.rainfallNormalMm.reduce((a, b) => a + b, 0) / s.rainfallNormalMm.length
  const total = Math.round(s.rainfallMm.reduce((a, b) => a + b, 0))
  const normalTotal = Math.round(s.rainfallNormalMm.reduce((a, b) => a + b, 0))
  return (
    <div className='stack'>
      <p className='takeaway' style={{ margin: 0 }}>
        {takeaway}
      </p>
      <section className='card stack-sm'>
        <BarChart
          ariaLabel={t('mon.rain.chart')}
          formatValue={(v) => `${Math.round(v)}`}
          reference={{ value: Math.round(normalAvg), label: t('mon.rain.normal') }}
          bars={s.rainfallMm.map((mm, i) => ({
            label: formatShortDate(s.weeks[i]),
            value: mm,
            color: mm < s.rainfallNormalMm[i] * 0.7 ? STATUS_COLOR.warning : 'var(--rain-400)',
            highlight: mm < s.rainfallNormalMm[i] * 0.7,
          }))}
        />
        <div className={styles.statRow}>{t('mon.rain.season', { actual: total, normal: normalTotal })}</div>
      </section>
    </div>
  )
}

function SpiTab({ s }: { s: MonitorSeries }) {
  const value = last(s.spi)
  const c = classifySpi(value)
  return (
    <div className='stack'>
      <p className='takeaway' style={{ margin: 0 }}>
        {t(`mon.spi.${c.status}`)}
      </p>
      <section className='card'>
        <Gauge
          value={value}
          min={-3}
          max={3}
          bands={[
            { to: -2, color: '#8e1b1b' },
            { to: -1, color: STATUS_COLOR.danger },
            { to: -0.5, color: STATUS_COLOR.warning },
            { to: 0.5, color: STATUS_COLOR.good },
            { to: 1.5, color: '#4a9be0' },
            { to: 3, color: '#1f6fb5' },
          ]}
          valueLabel={t(c.label)}
          caption={t('mon.spi.gauge', { value: value.toFixed(1) })}
          minLabel={t('mon.spi.dry')}
          maxLabel={t('mon.spi.wet')}
          ariaLabel={t('mon.spi.gauge', { value: value.toFixed(1) })}
        />
      </section>
      <section className='card'>
        <LineChart
          ariaLabel={t('mon.spi.chart')}
          values={s.spi}
          labels={s.weeks.map(formatShortDate)}
          yDomain={[-3, 3]}
          band={{ from: -1, to: 1, label: t('mon.spi.band') }}
          color={STATUS_COLOR.warning}
          formatValue={(v) => v.toFixed(1)}
        />
      </section>
    </div>
  )
}

function HeatTab({ s }: { s: MonitorSeries }) {
  const from = Math.max(0, s.weeks.length - 8)
  const hot = heatStressWeeks(s).filter((i) => i >= from)
  return (
    <div className='stack'>
      <p className='takeaway' style={{ margin: 0 }}>
        {hot.length ? t('mon.heat.some', { n: hot.length }) : t('mon.heat.none')}
      </p>
      <section className='card'>
        <RangeStrip
          ariaLabel={t('mon.heat.chart')}
          unit='°C'
          threshold={{ value: HEAT_STRESS_C, label: t('mon.heat.threshold') }}
          rows={s.weeks.slice(from).map((w, k) => {
            const i = from + k
            return {
              label: formatShortDate(w),
              min: s.tempMinC[i],
              max: s.tempMaxC[i],
              flagged: s.tempMaxC[i] > HEAT_STRESS_C,
            }
          })}
        />
      </section>
    </div>
  )
}

export default function MonitorDetail() {
  const { farmId } = useParams()
  const [search, setSearch] = useSearchParams()
  const farm = useFarm(farmId)
  const [series, setSeries] = useState<MonitorSeries | null>(null)
  const tab: Tab = TABS.includes(search.get('tab') as Tab) ? (search.get('tab') as Tab) : 'ndvi'

  useEffect(() => {
    if (!farm) return
    let live = true
    getSeries(farm).then((s) => live && setSeries(s))
    return () => {
      live = false
    }
  }, [farm])

  if (!farm) return <NotFound />
  const status = healthStatus(farm.healthScore)

  return (
    <Screen header={<Header title={farm.name} back='/monitor' />}>
      {!series ? (
        <LoadingState />
      ) : (
        <div className='stack'>
          <section className={`card ${styles.summary}`}>
            <Ring value={farm.healthScore} status={status} label={farm.healthScore} sublabel='/100' ariaLabel={t('farm.health', { score: farm.healthScore })} />
            <div className='stack-sm'>
              <Chip status={status}>{t(`status.${status}`)}</Chip>
              <div className='muted'>{t('mon.updated', { date: formatDate(series.weeks[series.weeks.length - 1]) })}</div>
            </div>
          </section>
          <div role='tablist' aria-label={t('mon.title')} className={styles.tabs}>
            {TABS.map((k) => (
              <button
                key={k}
                type='button'
                role='tab'
                aria-selected={tab === k}
                className={styles.tab}
                onClick={() => setSearch({ tab: k }, { replace: true })}
              >
                {t(`mon.tab.${k}`)}
              </button>
            ))}
          </div>
          <div role='tabpanel' aria-label={t(`mon.tab.${tab}`)} className='fade-in' key={tab}>
            {tab === 'ndvi' && <NdviTab farm={farm} s={series} />}
            {tab === 'rain' && <RainTab s={series} />}
            {tab === 'spi' && <SpiTab s={series} />}
            {tab === 'heat' && <HeatTab s={series} />}
          </div>
        </div>
      )}
    </Screen>
  )
}
```

Note: `useFarm` returns a new object only when state changes, so the `[farm]` effect dependency does not loop.

- [ ] **Step 7: Run tests**

Run: `npm test -- src/pages/monitor`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
npm run format
git add src
git commit -m "feat: add farm monitoring list and detail tabs with charts"
```

---

### Task 24: All-farms map

**Files:**
- Modify: `src/components/map/MapScreen.tsx` (add `nav` prop), `src/components/map/map.module.css` (append), `src/i18n/en.ts`
- Replace stub: `src/pages/map/AllFarmsMap.tsx`
- Test: `src/pages/map/AllFarmsMap.test.tsx`

**Interfaces:**
- Consumes: `FarmMap`, `MapScreen` (Task 17), `BottomNav`, `BottomSheet`, `Chip`, `EmptyState` (Task 12), `STATUS_COLOR` (Task 15), `isInsured` (Task 15).
- Produces: `MapScreen` gains `nav?: boolean` (renders `BottomNav` and lifts the panel above it).

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'map.title': 'My farms',
  'map.legend': 'Tap a farm to see more',
  'map.openFarm': 'Open farm',
  'map.health': 'Farm health',
```

- [ ] **Step 2: Add `nav` support to `MapScreen`** — replace `src/components/map/MapScreen.tsx` with:

```tsx
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '@/src/components/common/BottomNav'
import { Icon } from '@/src/components/common/Icons'
import styles from '@/src/components/map/map.module.css'
import { t } from '@/src/i18n'

interface Props {
  title: string
  back?: boolean | string
  nav?: boolean
  map: ReactNode
  panel: ReactNode
  overlay?: ReactNode
}

export function MapScreen({ title, back = true, nav = false, map, panel, overlay }: Props) {
  const navigate = useNavigate()
  return (
    <div className={styles.mapScreen}>
      {map}
      <header className={styles.top}>
        {back && (
          <button
            type='button'
            className={styles.roundBtn}
            aria-label={t('common.back')}
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          >
            <Icon name='back' />
          </button>
        )}
        <h1>{title}</h1>
      </header>
      <main className={`${styles.panel} ${nav ? styles.panelWithNav : ''}`}>{panel}</main>
      {overlay && <div className={styles.overlay}>{overlay}</div>}
      {nav && <BottomNav />}
    </div>
  )
}
```

Append to `src/components/map/map.module.css`:

```css
.panelWithNav {
  bottom: calc(var(--nav-h) + env(safe-area-inset-bottom));
  border-radius: var(--radius-lg);
  margin: 0 var(--sp-2) var(--sp-2);
  padding-bottom: var(--sp-4);
}
```

- [ ] **Step 3: Write the failing test `src/pages/map/AllFarmsMap.test.tsx`**

```tsx
import { screen, within } from '@testing-library/react'
import AllFarmsMap from '@/src/pages/map/AllFarmsMap'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

vi.mock('@/src/components/map/FarmMap', () => import('@/src/test/mockFarmMap'))

test('draws every farm and opens a summary sheet on tap', async () => {
  const { user } = renderWithApp(<AllFarmsMap />, { route: '/map', path: '/map', state: seededState() })
  expect(screen.getByTestId('farm-map')).toHaveAttribute('data-polygons', '3')
  await user.click(screen.getByRole('button', { name: 'Tea Garden' }))
  const sheet = screen.getByRole('dialog', { name: 'Tea Garden' })
  expect(within(sheet).getByText('Not insured')).toBeInTheDocument()
  await user.click(within(sheet).getByRole('button', { name: 'Open farm' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/farm/farm-tea')
})

test('legend counts farms by health', () => {
  renderWithApp(<AllFarmsMap />, { route: '/map', path: '/map', state: seededState() })
  expect(screen.getByText('Good 2')).toBeInTheDocument()
  expect(screen.getByText('Alert 1')).toBeInTheDocument()
})

test('no farms shows an empty state', () => {
  renderWithApp(<AllFarmsMap />, { route: '/map', path: '/map', state: { ...seededState(), farms: [] } })
  expect(screen.getByText('No farms yet')).toBeInTheDocument()
})
```

Run: `npm test -- src/pages/map`
Expected: FAIL.

- [ ] **Step 4: Implement `src/pages/map/AllFarmsMap.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isInsured } from '@/src/components/cards/FarmCard'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { FarmMap } from '@/src/components/map/FarmMap'
import { MapScreen } from '@/src/components/map/MapScreen'
import { useFarms, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import type { Status } from '@/src/types'
import { formatHa } from '@/src/utils/format'
import { healthStatus } from '@/src/utils/monitor'

const STATUSES: Status[] = ['good', 'warning', 'danger']

export default function AllFarmsMap() {
  const navigate = useNavigate()
  const farms = useFarms()
  const policies = usePolicies()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = farms.find((f) => f.id === selectedId)

  const counts = STATUSES.map((s) => ({ s, n: farms.filter((f) => healthStatus(f.healthScore) === s).length }))

  return (
    <MapScreen
      title={t('map.title')}
      back={false}
      nav
      map={
        <FarmMap
          fitTo={farms.flatMap((f) => f.boundary)}
          polygons={farms.map((f) => ({
            id: f.id,
            boundary: f.boundary,
            color: STATUS_COLOR[healthStatus(f.healthScore)],
            label: f.name,
            onClick: () => setSelectedId(f.id),
          }))}
        />
      }
      overlay={
        farms.length === 0 && (
          <EmptyState
            title={t('home.emptyTitle')}
            message={t('home.emptyBody')}
            action={
              <Button block icon='plus' onClick={() => navigate('/add-farm')}>
                {t('home.addFarm')}
              </Button>
            }
          />
        )
      }
      panel={
        <>
          <div className='row' style={{ flexWrap: 'wrap', gap: 6 }}>
            {counts
              .filter((c) => c.n > 0)
              .map((c) => (
                <Chip key={c.s} status={c.s}>
                  {`${t(`status.${c.s}`)} ${c.n}`}
                </Chip>
              ))}
          </div>
          <p className='muted' style={{ margin: '8px 0 0' }}>
            {t('map.legend')}
          </p>
          <BottomSheet open={!!selected} onClose={() => setSelectedId(null)} title={selected?.name ?? ''}>
            {selected && (
              <div className='stack-sm'>
                <div className='muted'>
                  {t(`crop.${selected.crop}`)} · {formatHa(selected.areaHa)} · {selected.county}
                </div>
                <div className='row' style={{ gap: 6 }}>
                  <Chip status={healthStatus(selected.healthScore)}>
                    {t('farm.health', { score: selected.healthScore })}
                  </Chip>
                  <Chip status={isInsured(policies, selected.id) ? 'good' : 'neutral'}>
                    {isInsured(policies, selected.id) ? t('farm.insured') : t('farm.notInsured')}
                  </Chip>
                </div>
                <div className='row'>
                  <Button variant='secondary' onClick={() => navigate(`/monitor/${selected.id}`)}>
                    {t('map.health')}
                  </Button>
                  <Button block onClick={() => navigate(`/farm/${selected.id}`)}>
                    {t('map.openFarm')}
                  </Button>
                </div>
              </div>
            )}
          </BottomSheet>
        </>
      }
    />
  )
}
```

Legend check: maize (good) and tea (good) → `Good 2`; beans (score < 45 → danger) → `Alert 1`.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/pages/map src/pages/farm`
Expected: PASS (farm tests confirm `MapScreen` still works without `nav`).

- [ ] **Step 6: Commit**

```bash
npm run format
git add src
git commit -m "feat: add all-farms map with health colours and farm sheet"
```

---
### Task 25: Payouts — notification, details and history

**Files:**
- Replace stubs: `src/pages/payout/PayoutNotification.tsx`, `src/pages/payout/PayoutDetails.tsx`, `src/pages/payout/PayoutHistory.tsx`
- Create: `src/pages/payout/payout.module.css`, `src/pages/payout/stages.ts`
- Modify: `src/i18n/en.ts`
- Test: `src/pages/payout/payout.test.tsx`

**Interfaces:**
- Consumes: `usePayouts`, `usePolicies`, `useFarms`, `useFarmer`, `useApp` (Task 8), `BarChart` (Task 11), `ProgressTimeline`, `Celebrate`, `Chip`, `EmptyState`, `Button`, `Screen`, `Header` (Task 12), `NotFound`, `STATUS_COLOR`.
- Produces: `PAYOUT_STAGES: PayoutStage[]` (`triggered, assessed, approved, sent`), `stageSteps(payout: Payout): { steps: TimelineStep[]; currentIndex: number }` (stages up to and including the payout's stage are done; the next one is current) — in `stages.ts`. Opening `/payout/:id` dispatches `MARK_PAYOUT_READ`.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'payout.good': 'Good news, {name}!',
  'payout.headline': 'Your {crop} insurance is paying out',
  'payout.reason': 'Harvests in {county} were {pct}% below normal this season.',
  'payout.mpesa': 'The money will be sent to your M-Pesa {phone}.',
  'payout.details': 'See details',
  'payout.later': 'Later',
  'payout.detailsTitle': 'Payout details',
  'payout.chart': 'Normal harvest compared with this season',
  'payout.normal': 'Normal',
  'payout.thisSeason': 'This season',
  'payout.level': 'Payout level {pct}%',
  'payout.explain': 'Your cover pays when the area harvest falls below {trigger}% of normal. This season it was {actual}% of normal.',
  'payout.cover': 'Your cover',
  'payout.gap': 'Below payout level',
  'payout.gapValue': '{n} points',
  'payout.amount': 'Payout',
  'payout.progress': 'Progress',
  'payout.stage.triggered': 'Low harvest detected',
  'payout.stage.assessed': 'Checked by our team',
  'payout.stage.approved': 'Payout approved',
  'payout.stage.sent': 'Sent to M-Pesa',
  'payout.historyTitle': 'Payouts',
  'payout.total': 'Total payouts',
  'payout.emptyTitle': 'No payouts yet',
  'payout.emptyBody': 'If harvests in your area fall below your cover level, your payouts will appear here.',
```

- [ ] **Step 2: Create `src/pages/payout/stages.ts`**

```ts
import type { TimelineStep } from '@/src/components/common/ProgressTimeline'
import { t } from '@/src/i18n'
import type { Payout, PayoutStage } from '@/src/types'
import { formatDate } from '@/src/utils/format'

export const PAYOUT_STAGES: PayoutStage[] = ['triggered', 'assessed', 'approved', 'sent']

export function stageSteps(payout: Payout): { steps: TimelineStep[]; currentIndex: number } {
  return {
    steps: PAYOUT_STAGES.map((s) => ({
      key: s,
      label: t(`payout.stage.${s}`),
      date: payout.stageDates[s] ? formatDate(payout.stageDates[s]!) : undefined,
    })),
    currentIndex: PAYOUT_STAGES.indexOf(payout.stage) + 1,
  }
}
```

- [ ] **Step 3: Create `src/pages/payout/payout.module.css`**

```css
.celebrate {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--gold-100), var(--bg) 60%);
}
.amount {
  font-size: 46px;
  font-weight: 900;
  color: var(--green-900);
  letter-spacing: -0.02em;
}
.pop {
  animation: pop 700ms var(--ease) both;
}
@keyframes pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
}
.breakdown div {
  display: flex;
  justify-content: space-between;
  padding: var(--sp-2) 0;
  border-bottom: 1px solid var(--line);
}
.breakdown div:last-child {
  border-bottom: 0;
  font-weight: 800;
  font-size: var(--fs-lg);
}
.total {
  background: linear-gradient(135deg, var(--green-700), var(--green-500));
  color: #fff;
  border-radius: var(--radius-lg);
  padding: var(--sp-4);
}
.item {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: var(--sp-3);
  align-items: center;
}
.coin {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--gold-100);
  color: var(--soil-700);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 4: Write the failing tests `src/pages/payout/payout.test.tsx`**

```tsx
import { screen } from '@testing-library/react'
import { STATE_KEY } from '@/src/context/persistence'
import PayoutDetails from '@/src/pages/payout/PayoutDetails'
import PayoutHistory from '@/src/pages/payout/PayoutHistory'
import PayoutNotification from '@/src/pages/payout/PayoutNotification'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('notification celebrates, marks the payout read and links to details', async () => {
  const { user } = renderWithApp(<PayoutNotification />, {
    route: '/payout/payout-beans',
    path: '/payout/:payoutId',
    state: seededState(),
  })
  expect(screen.getByText('Good news, Wanjiru!')).toBeInTheDocument()
  expect(screen.getByText('KES 10,800')).toBeInTheDocument()
  expect(screen.getByText('Harvests in Machakos were 55% below normal this season.')).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(STATE_KEY)!).payouts[0].read).toBe(true)
  await user.click(screen.getByRole('button', { name: 'See details' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/payout-details/payout-beans')
})

test('details explain the shortfall with a chart and progress', () => {
  renderWithApp(<PayoutDetails />, {
    route: '/payout-details/payout-beans',
    path: '/payout-details/:payoutId',
    state: seededState(),
  })
  expect(screen.getByRole('img', { name: 'Normal harvest compared with this season' })).toBeInTheDocument()
  expect(screen.getByText(/This season it was 45% of normal/)).toBeInTheDocument()
  expect(screen.getByText('15 points')).toBeInTheDocument()
  const states = screen.getAllByRole('listitem').map((li) => li.getAttribute('data-state'))
  expect(states).toEqual(['done', 'done', 'done', 'current'])
})

test('unknown payouts show Not Found', () => {
  renderWithApp(<PayoutNotification />, { route: '/payout/old', path: '/payout/:payoutId', state: seededState() })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})

test('history totals payouts and links to each', () => {
  renderWithApp(<PayoutHistory />, { route: '/payouts', path: '/payouts', state: seededState() })
  expect(screen.getByText('Total payouts')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Machakos Plot/ })).toHaveAttribute('href', '/payout-details/payout-beans')
})

test('history empty state', () => {
  renderWithApp(<PayoutHistory />, { route: '/payouts', path: '/payouts', state: { ...seededState(), payouts: [] } })
  expect(screen.getByText('No payouts yet')).toBeInTheDocument()
})
```

Run: `npm test -- src/pages/payout`
Expected: FAIL.

- [ ] **Step 5: Implement `src/pages/payout/PayoutNotification.tsx`**

```tsx
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/src/components/common/Button'
import { Celebrate } from '@/src/components/common/Illustrations'
import { useApp, useFarmer, useFarms, usePayouts } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/payout/payout.module.css'
import { formatKES, formatPhone } from '@/src/utils/format'

export default function PayoutNotification() {
  const { payoutId } = useParams()
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farmer = useFarmer()
  const payout = usePayouts().find((p) => p.id === payoutId)
  const farm = useFarms().find((f) => f.id === payout?.farmId)

  useEffect(() => {
    if (payout && !payout.read) dispatch({ type: 'MARK_PAYOUT_READ', payoutId: payout.id })
  }, [payout, dispatch])

  if (!payout || !farm || !farmer) return <NotFound />

  return (
    <div className={`screen ${styles.celebrate}`}>
      <main className='screen-body stack' style={{ textAlign: 'center', paddingTop: 'var(--sp-6)' }}>
        <Celebrate className={styles.pop} />
        <h1 className='h2'>{t('payout.good', { name: farmer.name.split(' ')[0] })}</h1>
        <p style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{t('payout.headline', { crop: t(`crop.${farm.crop}`) })}</p>
        <div className={`${styles.amount} ${styles.pop}`}>{formatKES(payout.amountKES)}</div>
        <p style={{ margin: 0 }}>{t('payout.reason', { county: farm.county, pct: payout.shortfallPct })}</p>
        <p className='muted' style={{ margin: 0 }}>
          {t('payout.mpesa', { phone: formatPhone(farmer.phone) })}
        </p>
      </main>
      <div className='screen-footer'>
        <Button block onClick={() => navigate(`/payout-details/${payout.id}`, { replace: true })}>
          {t('payout.details')}
        </Button>
        <Button block variant='ghost' onClick={() => navigate('/home')}>
          {t('payout.later')}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Implement `src/pages/payout/PayoutDetails.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom'
import { BarChart } from '@/src/components/charts/BarChart'
import { Header } from '@/src/components/common/Header'
import { ProgressTimeline } from '@/src/components/common/ProgressTimeline'
import { Screen } from '@/src/components/common/Screen'
import { STATUS_COLOR } from '@/src/components/common/statusColor'
import { useFarms, usePayouts, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import styles from '@/src/pages/payout/payout.module.css'
import { stageSteps } from '@/src/pages/payout/stages'
import { formatKES } from '@/src/utils/format'

export default function PayoutDetails() {
  const { payoutId } = useParams()
  const payout = usePayouts().find((p) => p.id === payoutId)
  const policy = usePolicies().find((p) => p.id === payout?.policyId)
  const farm = useFarms().find((f) => f.id === payout?.farmId)
  if (!payout || !policy || !farm) return <NotFound />

  const actualPct = Math.round((payout.actualYield / payout.expectedYield) * 100)
  const gap = Math.max(0, policy.triggerYieldPct - actualPct)
  const { steps, currentIndex } = stageSteps(payout)

  return (
    <Screen header={<Header title={t('payout.detailsTitle')} back='/payouts' />}>
      <div className='stack'>
        <section className={styles.total}>
          <div>{farm.name}</div>
          <div className='figure' style={{ color: '#fff' }}>
            {formatKES(payout.amountKES)}
          </div>
        </section>

        <section className='card stack-sm'>
          <BarChart
            ariaLabel={t('payout.chart')}
            formatValue={(v) => `${Number(v.toFixed(1))} t`}
            reference={{
              value: (payout.expectedYield * policy.triggerYieldPct) / 100,
              label: t('payout.level', { pct: policy.triggerYieldPct }),
            }}
            bars={[
              { label: t('payout.normal'), value: payout.expectedYield, color: STATUS_COLOR.good },
              { label: t('payout.thisSeason'), value: payout.actualYield, color: STATUS_COLOR.danger, highlight: true },
            ]}
          />
          <p className='takeaway' style={{ margin: 0 }}>
            {t('payout.explain', { trigger: policy.triggerYieldPct, actual: actualPct })}
          </p>
        </section>

        <section className={`card ${styles.breakdown}`}>
          <div>
            <span>{t('payout.cover')}</span>
            <span>{formatKES(policy.sumInsuredKES)}</span>
          </div>
          <div>
            <span>{t('payout.gap')}</span>
            <span>{t('payout.gapValue', { n: gap })}</span>
          </div>
          <div>
            <span>{t('payout.amount')}</span>
            <span>{formatKES(payout.amountKES)}</span>
          </div>
        </section>

        <section className='card stack-sm'>
          <h2 className='h3'>{t('payout.progress')}</h2>
          <ProgressTimeline steps={steps} currentIndex={currentIndex} />
        </section>

        <Link to={`/policy/${policy.id}`}>{t('farm.viewPolicy')}</Link>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 7: Implement `src/pages/payout/PayoutHistory.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { Chip } from '@/src/components/common/Chip'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarms, usePayouts } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/payout/payout.module.css'
import { PAYOUT_STAGES } from '@/src/pages/payout/stages'
import { formatDate, formatKES } from '@/src/utils/format'

export default function PayoutHistory() {
  const payouts = usePayouts()
  const farms = useFarms()
  const total = payouts.reduce((s, p) => s + p.amountKES, 0)

  return (
    <Screen nav>
      <div className='stack'>
        <h1 className='h1'>{t('payout.historyTitle')}</h1>
        {payouts.length === 0 ? (
          <EmptyState title={t('payout.emptyTitle')} message={t('payout.emptyBody')} />
        ) : (
          <>
            <section className={styles.total}>
              <div>{t('payout.total')}</div>
              <div className='figure' style={{ color: '#fff' }}>
                {formatKES(total)}
              </div>
            </section>
            {payouts.map((p) => {
              const farm = farms.find((f) => f.id === p.farmId)
              const latest = [...PAYOUT_STAGES].reverse().find((s) => p.stageDates[s])
              return (
                <Link key={p.id} to={`/payout-details/${p.id}`} className={`card card-tap ${styles.item}`}>
                  <span className={styles.coin}>
                    <Icon name='cash' />
                  </span>
                  <span>
                    <span className='h3' style={{ display: 'block' }}>
                      {farm?.name}
                    </span>
                    <span className='muted'>{latest && formatDate(p.stageDates[latest]!)}</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block' }}>{formatKES(p.amountKES)}</strong>
                    <Chip status={p.stage === 'sent' ? 'good' : 'warning'}>{t(`payout.stage.${p.stage}`)}</Chip>
                  </span>
                </Link>
              )
            })}
          </>
        )}
      </div>
    </Screen>
  )
}
```

- [ ] **Step 8: Run tests**

Run: `npm test -- src/pages/payout`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
npm run format
git add src
git commit -m "feat: add payout notification, details and history"
```

---

### Task 26: Profile, policies and policy detail

**Files:**
- Create: `src/components/cards/CoverageBar.tsx`
- Replace stubs: `src/pages/profile/Profile.tsx`, `src/pages/profile/Policies.tsx`, `src/pages/profile/PolicyDetail.tsx`
- Delete: `src/components/common/Placeholder.tsx` (no stubs remain after this task)
- Modify: `src/i18n/en.ts`, `src/components/cards/cards.module.css` (append)
- Test: `src/components/cards/CoverageBar.test.tsx`, `src/pages/profile/profile.test.tsx`

**Interfaces:**
- Consumes: hooks (Task 8), `formatPhone`, `formatDate`, `formatKES` (Task 3), common components, `NotFound`, `stageSteps` not needed.
- Produces: `<CoverageBar start: string end: string today?: Date />` rendering a progress bar plus text `Starts in N days` / `N days left` / `Ended <date>`; `coverageText(start, end, today): string` exported alongside.

- [ ] **Step 1: Append i18n keys** in `src/i18n/en.ts`:

```ts
  'profile.title': 'Profile',
  'profile.policies': 'My policies',
  'profile.payouts': 'My payouts',
  'profile.language': 'Language',
  'profile.english': 'English',
  'profile.swahili': 'Kiswahili — coming soon',
  'profile.help': 'Help',
  'profile.logout': 'Log out',
  'help.q1': 'What is area yield insurance?',
  'help.a1': 'It pays you when the harvest in your whole area falls below normal, measured by satellites and field surveys. You do not need to make a claim.',
  'help.q2': 'When do I get paid?',
  'help.a2': 'After harvest, once the area results are confirmed. The money goes straight to your M-Pesa.',
  'help.q3': 'What if only my farm has a problem?',
  'help.a3': 'This cover is for problems that hit the whole area, like drought or floods. Losses on one farm only are not covered.',
  'policies.title': 'My policies',
  'policies.emptyTitle': 'No policies yet',
  'policies.emptyBody': 'Insure a farm to protect your harvest.',
  'policies.insureCta': 'Insure a farm',
  'policy.title': 'Policy',
  'policy.coverage': 'Cover period',
  'policy.startsIn': 'Starts in {n} days',
  'policy.daysLeft': '{n} days left',
  'policy.ended': 'Ended {date}',
  'policy.payouts': 'Payouts on this policy',
  'policy.openFarm': 'Open farm',
```

- [ ] **Step 2: Append to `src/components/cards/cards.module.css`**

```css
.coverTrack {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
  margin: var(--sp-2) 0 4px;
}
.coverFill {
  position: absolute;
  inset: 0;
  background: var(--green-500);
  transform-origin: left;
}
.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--green-700);
  color: #fff;
  font-size: var(--fs-xl);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
```

- [ ] **Step 3: Write the failing tests**

`src/components/cards/CoverageBar.test.tsx`:

```tsx
import { coverageText } from '@/src/components/cards/CoverageBar'

const start = '2026-10-01T00:00:00.000Z'
const end = '2026-12-31T00:00:00.000Z'

test('coverage text before, during and after the season', () => {
  expect(coverageText(start, end, new Date('2026-09-21T00:00:00.000Z'))).toBe('Starts in 10 days')
  expect(coverageText(start, end, new Date('2026-12-21T00:00:00.000Z'))).toBe('10 days left')
  expect(coverageText(start, end, new Date('2027-01-05T00:00:00.000Z'))).toBe('Ended 31 Dec 2026')
})
```

`src/pages/profile/profile.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react'
import { AUTH_KEY } from '@/src/context/persistence'
import Policies from '@/src/pages/profile/Policies'
import PolicyDetail from '@/src/pages/profile/PolicyDetail'
import Profile from '@/src/pages/profile/Profile'
import { renderWithApp, seededState } from '@/src/test/renderWithApp'

test('profile shows the farmer and a disabled Swahili option', () => {
  renderWithApp(<Profile />, { route: '/profile', path: '/profile', state: seededState() })
  expect(screen.getByText('Wanjiru Kamau')).toBeInTheDocument()
  expect(screen.getByText('+254 712 345 678')).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('radio', { name: 'Kiswahili — coming soon' })).toBeDisabled()
})

test('help opens answers in a sheet', async () => {
  const { user } = renderWithApp(<Profile />, { route: '/profile', path: '/profile', state: seededState() })
  await user.click(screen.getByRole('button', { name: 'Help' }))
  expect(within(screen.getByRole('dialog')).getByText('What is area yield insurance?')).toBeInTheDocument()
})

test('log out clears auth and returns to welcome', async () => {
  const { user } = renderWithApp(<Profile />, { route: '/profile', path: '/profile', state: seededState() })
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  expect(JSON.parse(localStorage.getItem(AUTH_KEY)!).isAuthenticated).toBe(false)
})

test('policies list links to each policy', () => {
  renderWithApp(<Policies />, { route: '/policies', path: '/policies', state: seededState() })
  expect(screen.getByRole('link', { name: /Lower Shamba/ })).toHaveAttribute('href', '/policy/policy-maize')
  expect(screen.getByRole('link', { name: /Machakos Plot/ })).toHaveAttribute('href', '/policy/policy-beans')
})

test('policies empty state', () => {
  renderWithApp(<Policies />, { route: '/policies', path: '/policies', state: { ...seededState(), policies: [] } })
  expect(screen.getByText('No policies yet')).toBeInTheDocument()
})

test('policy detail shows the certificate facts and linked payouts', () => {
  renderWithApp(<PolicyDetail />, { route: '/policy/policy-beans', path: '/policy/:policyId', state: seededState() })
  expect(screen.getByText('AGR-2026-001982')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /KES 10,800/ })).toHaveAttribute('href', '/payout-details/payout-beans')
})

test('unknown policy shows Not Found', () => {
  renderWithApp(<PolicyDetail />, { route: '/policy/nope', path: '/policy/:policyId', state: seededState() })
  expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
})
```

Run: `npm test -- src/components/cards src/pages/profile`
Expected: FAIL.

- [ ] **Step 4: Implement `src/components/cards/CoverageBar.tsx`**

```tsx
import styles from '@/src/components/cards/cards.module.css'
import { t } from '@/src/i18n'
import { formatDate } from '@/src/utils/format'

const DAY = 86400000

export function coverageText(start: string, end: string, today: Date = new Date()): string {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = today.getTime()
  if (now < s) return t('policy.startsIn', { n: Math.ceil((s - now) / DAY) })
  if (now <= e) return t('policy.daysLeft', { n: Math.ceil((e - now) / DAY) })
  return t('policy.ended', { date: formatDate(end) })
}

export function CoverageBar({ start, end, today = new Date() }: { start: string; end: string; today?: Date }) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const pct = Math.min(1, Math.max(0, (today.getTime() - s) / (e - s || 1)))
  return (
    <div>
      <div className={styles.coverTrack} aria-hidden='true'>
        <div className={styles.coverFill} style={{ transform: `scaleX(${pct})` }} />
      </div>
      <div className='row-between muted'>
        <span>{formatDate(start)}</span>
        <strong style={{ color: 'var(--ink)' }}>{coverageText(start, end, today)}</strong>
        <span>{formatDate(end)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/pages/profile/Profile.tsx`**

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import cardStyles from '@/src/components/cards/cards.module.css'
import { BottomSheet } from '@/src/components/common/BottomSheet'
import { Button } from '@/src/components/common/Button'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import formStyles from '@/src/components/forms/forms.module.css'
import { useApp, useFarmer, usePayouts, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import styles from '@/src/pages/pages.module.css'
import { formatPhone } from '@/src/utils/format'

const FAQ = [
  ['help.q1', 'help.a1'],
  ['help.q2', 'help.a2'],
  ['help.q3', 'help.a3'],
] as const

export default function Profile() {
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const farmer = useFarmer()
  const policies = usePolicies()
  const payouts = usePayouts()
  const [helpOpen, setHelpOpen] = useState(false)
  if (!farmer) return null

  const initials = farmer.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const logout = () => {
    dispatch({ type: 'LOGOUT' })
    navigate('/', { replace: true })
  }

  return (
    <Screen nav>
      <div className='stack'>
        <h1 className='h1'>{t('profile.title')}</h1>
        <section className='card row'>
          <div className={cardStyles.avatar} aria-hidden='true'>
            {initials}
          </div>
          <div>
            <div className='h3'>{farmer.name}</div>
            <div>{formatPhone(farmer.phone)}</div>
            <div className='muted'>{farmer.county}</div>
          </div>
        </section>

        <div>
          <Link to='/policies' className={styles.linkRow}>
            <span className='row'>
              <Icon name='shield' />
              {t('profile.policies')}
            </span>
            <span className='row'>
              {policies.length}
              <Icon name='chevron' />
            </span>
          </Link>
          <Link to='/payouts' className={styles.linkRow}>
            <span className='row'>
              <Icon name='cash' />
              {t('profile.payouts')}
            </span>
            <span className='row'>
              {payouts.length}
              <Icon name='chevron' />
            </span>
          </Link>
        </div>

        <section className='card stack-sm'>
          <h2 className='h3 row'>
            <Icon name='globe' />
            {t('profile.language')}
          </h2>
          <div role='radiogroup' aria-label={t('profile.language')} className='stack-sm'>
            <button type='button' role='radio' aria-checked='true' className={formStyles.listBtn}>
              {t('profile.english')}
            </button>
            <button type='button' role='radio' aria-checked='false' disabled className={formStyles.listBtn}>
              {t('profile.swahili')}
            </button>
          </div>
        </section>

        <Button variant='secondary' block icon='help' onClick={() => setHelpOpen(true)}>
          {t('profile.help')}
        </Button>
        <Button variant='ghost' block icon='logout' onClick={logout}>
          {t('profile.logout')}
        </Button>
      </div>

      <BottomSheet open={helpOpen} onClose={() => setHelpOpen(false)} title={t('profile.help')}>
        <div className='stack'>
          {FAQ.map(([q, a]) => (
            <div key={q} className='stack-sm'>
              <div className='h3'>{t(q)}</div>
              <p style={{ margin: 0 }}>{t(a)}</p>
            </div>
          ))}
        </div>
      </BottomSheet>
    </Screen>
  )
}
```

- [ ] **Step 6: Implement `src/pages/profile/Policies.tsx`**

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { CoverageBar } from '@/src/components/cards/CoverageBar'
import { Button } from '@/src/components/common/Button'
import { Chip } from '@/src/components/common/Chip'
import { EmptyState } from '@/src/components/common/ErrorStates'
import { Header } from '@/src/components/common/Header'
import { Screen } from '@/src/components/common/Screen'
import { useFarms, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import { formatKES } from '@/src/utils/format'

export default function Policies() {
  const navigate = useNavigate()
  const policies = usePolicies()
  const farms = useFarms()
  return (
    <Screen header={<Header title={t('policies.title')} back='/profile' />}>
      {policies.length === 0 ? (
        <EmptyState
          title={t('policies.emptyTitle')}
          message={t('policies.emptyBody')}
          action={
            <Button block icon='shield' onClick={() => navigate('/home')}>
              {t('policies.insureCta')}
            </Button>
          }
        />
      ) : (
        <div className='stack-sm'>
          {policies.map((p) => {
            const farm = farms.find((f) => f.id === p.farmId)
            return (
              <Link key={p.id} to={`/policy/${p.id}`} className='card card-tap stack-sm'>
                <div className='row-between'>
                  <span className='h3'>{farm?.name}</span>
                  <Chip status={p.status === 'active' ? 'good' : p.status === 'claimed' ? 'warning' : 'neutral'}>
                    {t(`policyStatus.${p.status}`)}
                  </Chip>
                </div>
                <div className='muted'>
                  {t(`plan.${p.planId}`)} · {t('farm.cover', { amount: formatKES(p.sumInsuredKES) })}
                </div>
                <CoverageBar start={p.coverageStart} end={p.coverageEnd} />
              </Link>
            )
          })}
        </div>
      )}
    </Screen>
  )
}
```

- [ ] **Step 7: Implement `src/pages/profile/PolicyDetail.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom'
import { CoverageBar } from '@/src/components/cards/CoverageBar'
import { Chip } from '@/src/components/common/Chip'
import { Header } from '@/src/components/common/Header'
import { Icon } from '@/src/components/common/Icons'
import { Screen } from '@/src/components/common/Screen'
import { useFarms, usePayouts, usePolicies } from '@/src/context/AppContext'
import { t } from '@/src/i18n'
import NotFound from '@/src/pages/NotFound'
import insuranceStyles from '@/src/pages/insurance/insurance.module.css'
import styles from '@/src/pages/pages.module.css'
import { formatKES } from '@/src/utils/format'

export default function PolicyDetail() {
  const { policyId } = useParams()
  const policy = usePolicies().find((p) => p.id === policyId)
  const farm = useFarms().find((f) => f.id === policy?.farmId)
  const payouts = usePayouts().filter((p) => p.policyId === policyId)
  if (!policy || !farm) return <NotFound />

  const rows: [string, string][] = [
    [t('conf.policyNo'), policy.policyNumber],
    [t('conf.plan'), t(`plan.${policy.planId}`)],
    [t('conf.cover'), formatKES(policy.sumInsuredKES)],
    [t('conf.paid'), formatKES(policy.farmerPremiumKES)],
    [t('conf.receipt'), policy.mpesaReceipt],
  ]

  return (
    <Screen header={<Header title={t('policy.title')} back='/policies' />}>
      <div className='stack'>
        <section className={`card ${insuranceStyles.certificate}`}>
          <div className='row-between'>
            <h1 className='h2'>{farm.name}</h1>
            <Chip status={policy.status === 'active' ? 'good' : policy.status === 'claimed' ? 'warning' : 'neutral'}>
              {t(`policyStatus.${policy.status}`)}
            </Chip>
          </div>
          {rows.map(([label, value]) => (
            <div key={label} className={insuranceStyles.certRow}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>

        <section className='card'>
          <h2 className='h3'>{t('policy.coverage')}</h2>
          <CoverageBar start={policy.coverageStart} end={policy.coverageEnd} />
        </section>

        {payouts.length > 0 && (
          <section className='stack-sm'>
            <h2 className='h3'>{t('policy.payouts')}</h2>
            {payouts.map((p) => (
              <Link key={p.id} to={`/payout-details/${p.id}`} className={styles.linkRow}>
                <span className='row'>
                  <Icon name='cash' />
                  {formatKES(p.amountKES)}
                </span>
                <Icon name='chevron' />
              </Link>
            ))}
          </section>
        )}

        <Link to={`/farm/${farm.id}`} className={styles.linkRow}>
          {t('policy.openFarm')}
          <Icon name='chevron' />
        </Link>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 8: Remove the placeholder**

Run: `grep -rn "Placeholder" src`
Expected: only `src/components/common/Placeholder.tsx` itself. Then delete it:

```bash
git rm src/components/common/Placeholder.tsx
```

- [ ] **Step 9: Run all tests and the build**

Run: `npm test`
Expected: PASS (all suites).

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
npm run format
git add src
git commit -m "feat: add profile, policies and policy detail; remove page stubs"
```

---

### Task 27: Capacitor packaging, bundle budget and final QA

**Files:**
- Create: `capacitor.config.ts`, `scripts/check-bundle.mjs`, generated `android/` and `ios/` projects
- Modify: `package.json` (Capacitor deps), `android/app/src/main/AndroidManifest.xml`, `ios/App/App/Info.plist`, `README.md` (scripts table)

**Interfaces:**
- Consumes: the built `dist/`.
- Produces: `npm run check:bundle` (exits 1 when initial JS > 150 KB gzipped); native shells with location permission.

- [ ] **Step 1: Write the bundle check `scripts/check-bundle.mjs`**

```js
// Sums the gzipped size of every JS file index.html loads up front
// (entry script + modulepreload links). Lazy route chunks are excluded.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const LIMIT_KB = 150
const dist = 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const files = [...new Set([...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1]))]

let total = 0
for (const file of files) {
  const size = gzipSync(readFileSync(join(dist, file))).length
  total += size
  console.log(`${file}  ${(size / 1024).toFixed(1)} KB gz`)
}
console.log(`Initial JS: ${(total / 1024).toFixed(1)} KB gzipped (limit ${LIMIT_KB} KB)`)
if (files.length === 0 || total > LIMIT_KB * 1024) {
  console.error(files.length === 0 ? 'No JS found in dist/index.html' : 'Over budget')
  process.exit(1)
}
```

- [ ] **Step 2: Build and check the budget**

Run: `npm run build && npm run check:bundle`
Expected: prints `Initial JS: <N> KB gzipped (limit 150 KB)` with N ≤ 150 and exit code 0. If over budget, run `npx vite build --mode production` and inspect `dist/assets`: the most likely cause is a page imported eagerly instead of through `lazy()` in `src/App.tsx`, or `leaflet` leaking into the entry chunk via an import outside `src/components/map/FarmMap.tsx` — fix the import, rebuild, re-check.

- [ ] **Step 3: Add Capacitor**

Run:

```bash
npm install @capacitor/core@^8 @capacitor/android@^8 @capacitor/ios@^8
npm install -D @capacitor/cli@^8
```

Create `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'agrails.app',
  appName: 'Agrails',
  webDir: 'dist',
  android: {
    backgroundColor: '#f5f7f4',
  },
  ios: {
    backgroundColor: '#f5f7f4',
  },
}

export default config
```

Run:

```bash
npx cap add android
npx cap add ios
npx cap sync
```

Expected: `android/` and `ios/` folders created; `sync` copies `dist/` into both.

- [ ] **Step 4: Allow GPS in the native shells**

In `android/app/src/main/AndroidManifest.xml`, inside `<manifest>` (next to the existing `INTERNET` permission), add:

```xml
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

In `ios/App/App/Info.plist`, inside the top-level `<dict>`, add:

```xml
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>Agrails uses your location to map your farm boundary as you walk around it.</string>
```

Run: `npx cap sync`

- [ ] **Step 5: Update `README.md` scripts table** — add these rows to the table under "Scripts":

```markdown
| `npm test` | Run the unit and component tests (Vitest) |
| `npm run check:bundle` | Fail if the initial JS is over 150 KB gzipped (run after `npm run build`) |
```

- [ ] **Step 6: Full verification**

Run: `npm test`
Expected: all suites PASS.

Run: `npm run build && npm run check:bundle`
Expected: build succeeds; budget check exits 0.

- [ ] **Step 7: Manual QA on a low-end Android profile**

In Android Studio → Device Manager, create an emulator: Pixel 3a-sized screen, **2 GB RAM**, Android 10 (API 29). `npx cap open android` → Run. Walk through and tick each:

- [ ] Welcome slides swipe smoothly; buttons are at least thumb-sized
- [ ] Phone `0712 345 678` → OTP `123456` → Home (seeded farmer)
- [ ] Home: weather strip, payout banner, beans alert, protection ring, three farm cards with sparklines
- [ ] Payout banner → celebration → details chart and timeline
- [ ] Monitor → Machakos Plot: all four tabs render; tapping a chart point shows the tooltip
- [ ] Map tab: three coloured farms on satellite imagery; tapping one opens the sheet
- [ ] Tea Garden → Insure → Standard → quote donut and payback bars → Pay → pulsing phone → certificate
- [ ] Add farm → all steps → Tap corners (live area) → Confirm → Yield analysis gauge
- [ ] Add farm → Walk around (grant location in the emulator's Extended Controls → Location, play a route)
- [ ] Airplane mode on a map screen → "You're offline" → Try again after reconnecting
- [ ] Profile → Help sheet → Log out → back at Welcome
- [ ] Log in with `0700 000 001` → Registration → empty Home → Add farm

Note any screen that stutters or takes over 2 s to appear, and fix before handing over for user testing.

- [ ] **Step 8: Commit**

```bash
npm run format
git add capacitor.config.ts scripts package.json package-lock.json android ios README.md
git commit -m "chore: add Capacitor shells, location permissions and bundle budget check"
```
