# Agrails Farmer Insurance — Prototype Design

Date: 2026-10-22
Status: Approved (conversational), pending written-spec review

## Goal

Build, from scratch, the mobile-first app described in `README.md` as a **mock-data prototype** for **usability testing with Kenyan smallholder farmers on low-end Android phones**. It must be high quality from the landing screen through sign-up, farm setup, payment and everything after, and highly visual: data is shown through creative charts, gauges and maps so farmers immediately see value and the information they need.

### Decisions

| Topic | Decision |
| --- | --- |
| Purpose | Usability testing with real farmers |
| Data | Mock data only; simulated OTP and payment; no backend |
| Region | Kenya — KES currency, M-Pesa, maize / beans / tea, long & short rains |
| Language | English only; all strings centralised so Swahili can be added later |
| Maps | Real satellite maps (Leaflet + Esri World Imagery); real GPS for boundary walk |
| Charts | Hand-built SVG chart components; no chart library |
| Styling | Custom design system via CSS variables + CSS modules; no CSS framework |

### Out of scope

Real backend, real OTP or M-Pesa integration, Gemini AI features, Swahili copy, iOS polish beyond a working build, push notifications, dark theme.

## 1. Architecture

- **Stack:** React 19, TypeScript, Vite 6, React Router v6, Capacitor 8 (`appId: agrails.app`), Leaflet.
- **Structure:** as listed in `README.md` (`src/context`, `src/data`, `src/types`, `src/components/{cards,common,forms}`, `src/pages/{onboarding,farm,insurance,monitor,map,payout,profile}`), plus:
  - `src/components/charts/` — SVG chart components
  - `src/components/map/` — Leaflet wrappers
  - `src/services/` — mock service layer
  - `src/i18n/` — string tables and `t()` helper
  - `src/utils/` — pure helpers (premium, geo, classification, formatting)
- **State:** `src/context/AppContext.tsx` with `useReducer`; hooks `useApp()`, `useFarms()`, `useFarmer()`, `usePayouts()`, `useFarmForm()`.
- **Service layer:** `authService`, `farmService`, `policyService`, `paymentService`, `monitorService`. Each returns a Promise with a short simulated latency (300–800 ms) and reads/writes mock data. Pages call services, never `mockData.ts` directly, so a real backend can replace them later.
- **Persistence:** auth in `localStorage` key `agrails_auth`; app state (farms, policies, payouts created during testing) in `localStorage` key `agrails_state`. Both reads/writes wrapped in try/catch; on failure the app falls back to seed data.
- **Routing:** route table in `src/App.tsx` exactly as listed in `README.md`, with `ProtectedRoute` / `PublicRoute` wrappers. All page routes lazy-loaded.
- **Alias:** `@` → project root.
- **Code style:** Prettier — no semicolons, single quotes (incl. JSX), trailing commas.

## 2. Screen flow

### 2.1 Onboarding (public)
- **Welcome (`/`)** — landing screen. Full-bleed illustrated hero; three swipeable value cards: *Protect your harvest* → *We watch your farm from space* → *Get paid automatically to M-Pesa*; page dots; primary "Get started" button and secondary "I already have an account".
- **Phone entry (`/phone-entry`)** — fixed `+254` prefix; validates Kenyan mobile numbers (`7XXXXXXXX` or `1XXXXXXXX`, 9 digits after prefix); formats as user types.
- **OTP (`/otp-verification`)** — 6-box `OtpInput` with auto-advance and paste support; mock code `123456` shown in a hint banner; 30 s resend countdown; wrong code shows inline error and shakes boxes.
- **Registration (`/registration`)** — full name, county (searchable picker of 47 counties), national ID number (7–8 digits), primary crop (icon tiles). New users go here after OTP; returning (seeded) number skips to Home.

### 2.2 Home (`/home`)
- Greeting with farmer name and a today weather strip (icon, temp, rain chance).
- "Your protection" `Ring`: insured vs uninsured hectares, total sum insured in KES.
- Alert banner when any farm has an active warning (e.g. *Low rainfall in Machakos — your beans are under stress*), linking to that farm's monitor detail.
- Farm cards (`FarmCard`): crop icon, name, area, insurance status chip, health chip, NDVI `Sparkline`.
- Quick actions: Add farm, Insure a farm, See payouts.
- `BottomNav`: Home · Monitor · Map · Payouts · Profile.

### 2.3 Farms
- **Farm detail (`/farm/:farmId`)** — static satellite thumbnail with boundary, key facts, policy summary or "Insure this farm" CTA, links to monitoring and yield analysis.
- **Add farm (`/add-farm`)** / **Edit farm (`/edit-farm/:farmId`)** — stepped form with progress bar: name → crop (maize / beans / tea tiles) → season (long rains Mar–Jul / short rains Oct–Dec) → planting date. State held in `useFarmForm()`.
- **Boundary intro (`/boundary-intro`)** — three illustrated method cards: *Tap corners on map*, *Walk around your farm*, *Draw with your finger*; plus a "Quick: just drop a pin" link.
- **Boundary map (`/boundary-map`)** — tap to add vertices on satellite map; undo; live area readout; needs ≥3 points.
- **Quick map (`/boundary-quick-map`)** — one tap drops a pin; user chooses approximate size (0.5 / 1 / 2 / 5 acres) and a square boundary is generated around it.
- **Boundary walk (`/boundary-walk`)** — uses `navigator.geolocation.watchPosition`; records points as the user walks; shows path, GPS accuracy indicator, distance walked; "Finish" closes polygon. If permission denied or unavailable → error state offering *Tap corners* instead.
- **Boundary draw (`/boundary-draw`)** — freehand finger drawing on map overlay (map panning locked while drawing), simplified to a polygon (Douglas–Peucker).
- **Confirm farm (`/confirm-farm`)** — polygon on map, area in hectares and acres, county, crop, season; "Save farm" → yield analysis.
- **View boundary (`/view-boundary/:farmId`)** — read-only map view.
- **Yield analysis** (reached after confirm and from farm detail) — 10-year area yield `BarChart` with average reference line and below-trigger years highlighted; risk `Gauge` (Low / Medium / High); plain-language summary (*In 3 of the last 10 seasons, yields fell below 70% of normal*); CTA "See insurance options".
- **Historical report** — full yearly table with rainfall total and yield, plus the same chart.

### 2.4 Insurance purchase
- **Plan options (`/insure/:farmId`)** — three cards: Basic (trigger 60%), Standard (trigger 70%, highlighted as recommended), Premium (trigger 80%). Each shows sum insured, farmer premium, and a mini trigger visual (yield bar with the trigger line).
- **Premium quote (`/premium-quote/:farmId`)** — `Donut` breakdown of total premium (government subsidy / farmer share), sum insured, coverage period, worked example (*If your area yield drops to 50%, you receive about KES X*).
- **Payment (`/payment/:farmId`)** — simulated M-Pesa: confirm M-Pesa number (prefilled), "Pay KES X"; then *Check your phone and enter your M-Pesa PIN* screen with pulsing phone animation and 60 s countdown. Mock outcome: success after ~4 s by default; numbers ending in `0` simulate failure, ending in `9` simulate timeout (documented for testers). Failure/timeout show retry.
- **Confirmation (`/confirmation/:farmId`)** — policy certificate card (policy number, farm, crop, plan, coverage dates, sum insured, M-Pesa receipt code) with a light confetti animation; "Go to my farm".

### 2.5 Monitoring
- **Monitor list (`/monitor`)** — every farm with a health score (0–100) `Ring` and the worst current signal.
- **Monitor detail (`/monitor/:farmId`)** — tabs, each opening with a one-line takeaway:
  - **Crop health (NDVI):** `LineChart` of weekly NDVI with a green "healthy range" band and a "today" marker.
  - **Rainfall:** weekly `BarChart` of rainfall vs normal (reference line); bars coloured surplus / deficit.
  - **Drought (SPI):** semicircle `Gauge` from −3 (extreme drought) to +3 (extremely wet) with category label.
  - **Temperature:** `RangeStrip` of weekly min/max; heat-stress weeks (max > 32 °C) flagged.
- **All-farms map (`/map`)** — all farm polygons on satellite imagery, filled by health colour; tap opens a bottom sheet with summary and links.

### 2.6 Payouts
- **Payout notification (`/payout/:payoutId`)** — full-screen celebratory state with amount in KES, short reason, "See details".
- **Payout details (`/payout-details/:payoutId`)** — expected vs actual yield chart showing the shortfall that crossed the trigger; amount calculation breakdown; `ProgressTimeline`: Triggered → Assessed → Approved → Sent to M-Pesa.
- **Payout history (`/payouts`)** — timeline list with totals.

### 2.7 Profile
- **Profile (`/profile`)** — farmer details, language row (*English* / *Kiswahili — coming soon*, disabled), help, log out (clears auth, keeps nothing else secret).
- **Policies (`/policies`)** and **Policy detail (`/policy/:policyId`)** — status chips, coverage period timeline showing today's position, link to farm and any payouts.

## 3. Visual system

- **Colour tokens (CSS variables in `src/styles/tokens.css`):** primary crop green, soil brown and harvest gold accents, rain blue, status green / amber / red, neutral greys. Light theme only, high contrast for outdoor sunlight (text ≥ 4.5:1).
- **Type:** system font stack; body ≥ 16 px; key figures large and bold; KES formatted `KES 12,500`.
- **Touch & layout:** tap targets ≥ 48 px; one primary action per screen, pinned at the bottom; designed for 360 px width first.
- **Icons & illustrations:** inline SVG set in `src/components/common/Icons.tsx` (crops, weather, money, navigation) and a few SVG illustrations for onboarding and empty states; no icon library.
- **Charts (`src/components/charts/`):** `LineChart` (bands, markers), `BarChart` (reference line, diverging colours, highlighted bars), `Gauge`, `Ring`, `Donut`, `Sparkline`, `RangeStrip`. All responsive SVG, tap-to-inspect tooltip, plain-language axis labels, values in KES / mm / °C.
- **Motion:** CSS transitions and `transform`/`opacity` animations only; disabled under `prefers-reduced-motion`.

## 4. Domain model (`src/types/index.ts`)

- `Farmer` — id, name, phone, county, nationalId, primaryCrop.
- `Farm` — id, name, crop (`'maize' | 'beans' | 'tea'`), season (`'long_rains' | 'short_rains'`), plantingDate, boundary (`[lat, lng][]`), areaHa, county, riskLevel (`'low' | 'medium' | 'high'`), healthScore.
- `Plan` — id (`'basic' | 'standard' | 'premium'`), triggerYieldPct, coveragePct.
- `Policy` — id, policyNumber, farmId, planId, sumInsuredKES, premiumKES, subsidyKES, farmerPremiumKES, triggerYieldPct, coverageStart, coverageEnd, status (`'active' | 'expired' | 'claimed'`), mpesaReceipt.
- `Payout` — id, policyId, farmId, expectedYield, actualYield, shortfallPct, amountKES, stage (`'triggered' | 'assessed' | 'approved' | 'sent'`), stageDates, read.
- `YieldData` — year, yieldTPerHa, rainfallMm. `YieldAnalysisResult` — history, averageYield, belowTriggerYears, riskLevel.
- `MonitorSeries` — weekly arrays: ndvi, rainfallMm, rainfallNormalMm, spi, tempMinC, tempMaxC.

## 5. Business rules (pure functions in `src/utils/`)

- `polygonAreaHa(boundary)` — geodesic polygon area in hectares.
- `sumInsured(crop, areaHa, plan)` = expected value per ha for crop × areaHa × plan.coveragePct.
- `premium(sumInsured, riskLevel)` = sumInsured × base rate by risk (low 5%, medium 7%, high 10%); subsidy 50%; farmer share = premium − subsidy. Rounded to nearest KES 10.
- `payoutAmount(policy, actualYieldPct)` = 0 if actual ≥ trigger, else sumInsured × (trigger − actual) / trigger.
- `classifySpi(spi)`, `classifyNdvi(ndvi, crop)`, `healthScore(series)` — return label + status colour.
- Crop value per ha and risk thresholds live in a single config file `src/data/cropConfig.ts`.

## 6. Mock data

Seeded farmer *Wanjiru Kamau*, phone `+254712345678`, county Nakuru, with three farms telling different stories:
1. **Maize, Nakuru** — insured (Standard), healthy, NDVI in range.
2. **Beans, Machakos** — insured (Basic), drought stress (SPI ≈ −1.6), one payout in stage *approved*.
3. **Tea, Kericho** — uninsured; the upsell path.

Plus 10-year yield histories per county/crop and weekly monitoring series for the current season. Any other phone number is treated as a new user and goes through registration with an empty farm list.

## 7. Errors and edge cases

- Shared `ErrorStates` components: offline / map tiles failed (retry; note that mapping needs data), GPS denied / unavailable / low accuracy (offer *Tap corners*), payment failed / timed out (retry), generic empty states with illustrations.
- Inline, plain-language validation on every form field.
- Boundary validation: ≥ 3 points, non-self-intersecting, area 0.05–50 ha; otherwise a clear message.
- Unknown route ids (farm / policy / payout) → friendly "not found" with a link home.

## 8. Performance (low-end Android)

- All routes lazy-loaded; Leaflet and its CSS imported only in map pages.
- Budget: initial JS ≤ 150 KB gzipped, checked after `npm run build`.
- Images: SVG illustrations; at most one raster hero, compressed WebP.
- Avoid heavy re-renders: memoised chart data; map instances created once per screen.

## 9. Testing

- **Vitest unit tests:** area calculation, premium / sum insured / payout rules, SPI / NDVI classification, health score, reducer actions, phone and ID validation.
- **React Testing Library:** onboarding (phone → OTP → registration → home), add-farm form steps, insurance purchase including payment success, failure and timeout.
- **Manual:** Android emulator with a low-end profile (2 GB RAM) via Capacitor, walking every route; one real low-end device if available.
