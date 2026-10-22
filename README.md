# Agrails Farmer Insurance

A mobile-first app that lets smallholder farmers register their farms, map field boundaries, buy Area Yield Index Insurance (AYII), monitor farm conditions (NDVI, rainfall, SPI, temperature), and track payouts.

Built as a React web app and packaged for iOS and Android with Capacitor.

## Tech Stack

- **React 19** + **TypeScript** - UI
- **Vite 6** - dev server and bundler
- **React Router v6** - client-side routing with protected/public route wrappers
- **Capacitor 8** - native iOS and Android shells (`appId: agrails.app`)
- **React Context + useReducer** - app state (no external state library)

There is currently **no backend**: all data comes from `src/data/mockData.ts`, and the OTP login flow is simulated. Auth state persists to `localStorage` under the key `agrails_auth`.

## Getting Started

Prerequisites: Node.js 18+ and npm. For mobile builds: Xcode (iOS) and/or Android Studio.

```bash
npm install
npm run dev        # http://localhost:3000 (bound to 0.0.0.0 for device testing)
```

### Environment

Create `.env.local` in the project root:

```
GEMINI_API_KEY=your_key_here
```

Vite injects this as `process.env.GEMINI_API_KEY` / `process.env.API_KEY` (see `vite.config.ts`). The key is reserved for upcoming Gemini AI features; the app runs fine without it today.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run format` | Format `src/` with Prettier |

## Mobile (Capacitor)

The native projects live in `ios/` and `android/`. After any web change:

```bash
npm run build         # Capacitor serves the dist/ folder
npx cap sync          # Copy web assets into the native projects
npx cap open ios      # Open in Xcode
npx cap open android  # Open in Android Studio
```

Run from Xcode / Android Studio on a simulator or device as usual.

## Project Structure

```
src/
  App.tsx            # Route table with ProtectedRoute / PublicRoute wrappers
  index.tsx          # Entry point
  context/
    AppContext.tsx   # Global state: reducer, provider, and hooks
  data/
    mockData.ts      # Mock farmer, farms, policies, payouts, yield data
  types/
    index.ts         # Domain types (Farm, Policy, Payout, ...)
  components/
    cards/           # FarmCard, etc.
    common/          # Header, BottomNav, Icons, ErrorStates, ProgressTimeline
    forms/           # OtpInput
  pages/
    onboarding/      # Welcome, phone entry, OTP verification, registration
    farm/            # Home, add/edit farm, boundary capture (map/walk/draw),
                     # confirm, yield analysis and historical report
    insurance/       # Plan options, premium quote, payment, confirmation
    monitor/         # Farm monitoring list and detail (NDVI, rainfall, SPI, temp)
    map/             # All-farms map view
    payout/          # Payout notification, details, history
    profile/         # Profile, policies, policy details
docs/                # UX plan and farm boundary design notes
```

The `@` import alias resolves to the project root (`vite.config.ts`).

## Architecture Notes

### State management

`src/context/AppContext.tsx` holds all app state via `useReducer`. Access it through the exported hooks:

- `useApp()` - full state + `dispatch`
- `useFarms()`, `useFarmer()`, `usePayouts()` - read slices of state
- `useFarmForm()` - multi-step add-farm form state (`FarmFormData`)

Add new state by extending the reducer and, if it is a common access pattern, adding a convenience hook.

### Routing

Routes are declared in `src/App.tsx`. Onboarding routes (`/`, `/phone-entry`, `/otp-verification`, `/registration`) are public; everything else is wrapped in `ProtectedRoute` and redirects to onboarding when unauthenticated. Main areas:

- `/home` - dashboard
- `/farm/:farmId`, `/add-farm`, `/edit-farm/:farmId` - farm CRUD
- `/boundary-intro`, `/boundary-map`, `/boundary-quick-map`, `/boundary-walk`, `/boundary-draw`, `/view-boundary/:farmId`, `/confirm-farm` - boundary capture flows
- `/insure/:farmId`, `/premium-quote/:farmId`, `/payment/:farmId`, `/confirmation/:farmId` - insurance purchase
- `/monitor`, `/monitor/:farmId`, `/map` - monitoring
- `/payouts`, `/payout/:payoutId`, `/payout-details/:payoutId` - payouts
- `/profile`, `/policies`, `/policy/:policyId` - profile and policies

### Domain model

Key types in `src/types/index.ts`:

- `Farm` - farm entity with AYII fields (crop, season, area, boundary, risk level)
- `Policy` - insurance policy with yield-based triggers
- `Payout` - payout records with yield shortfall data
- `YieldAnalysisResult` / `YieldData` - historical yield analysis used for risk assessment and premium quoting

## Code Style

Prettier is the source of truth (`.prettierrc.json`): no semicolons, single quotes (including JSX), trailing commas. Run `npm run format` before committing.
