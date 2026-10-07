# Gutter — Smart banking. Better future.

Cross-platform (Android + iOS) mobile banking app built with [Expo](https://expo.dev) (SDK 57),
[expo-router](https://docs.expo.dev/router/introduction/), and **Tailwind CSS via
[NativeWind](https://www.nativewind.dev/)** — implementing the 22-screen Gutter fintech design
(`Gutter App.dc.html`) and wired for a **Laravel API backend with Sanctum token authentication**.

Naira banking, crypto trading, a dollar virtual card, and cardless ATM withdrawal in one account.

## Screens (from the design)

| # | Design screen | Route |
| --- | --- | --- |
| 01 | Splash | Native splash (`app.json`) + session restore |
| 02 | Log in | `app/(auth)/login.tsx` |
| 03 | Sign up (1 of 3) | `app/(auth)/register.tsx` |
| 04 | Verify email (OTP) | `app/(onboarding)/verify-email.tsx` |
| 05 | Verify identity (KYC) | `app/(onboarding)/verify-identity.tsx` |
| 06 | Face verification | `app/(onboarding)/face-verification.tsx` |
| 07 | Home dashboard | `app/(tabs)/index.tsx` |
| 08/09 | Buy / Sell crypto | `app/crypto/trade.tsx` |
| 10 | Bank transfer | `app/transfer/index.tsx` |
| 11 | Create dollar card | `app/card/create.tsx` |
| 12 | Virtual card | `app/(tabs)/cards.tsx` |
| 13 | Fund card | `app/card/fund.tsx` |
| 14 | Card details | `app/card/details.tsx` (auto-hides after 60s) |
| 15 | Freeze card (modal) | bottom sheet in `app/(tabs)/cards.tsx` |
| 16 | Create transaction PIN | `app/(onboarding)/create-pin.tsx` |
| 17 | Confirm with PIN | `app/security/confirm-pin.tsx` |
| 18 | Transaction receipt | `app/receipt.tsx` |
| 19 | Cardless ATM withdrawal | `app/atm-withdrawal.tsx` |
| 20 | Transaction history | `app/(tabs)/transactions.tsx` |
| 21 | Crypto market | `app/(tabs)/crypto.tsx` |
| 22 | Settings | `app/(tabs)/profile.tsx` |

Design tokens (colors in `tailwind.config.js`, mirrored in `src/theme`): navy `#12306E` /
`#0E2050`, mint `#23D3A5`, Manrope for text, Space Grotesk for figures. The oversized "G"
watermark, gradient headers, and the balance-hide behavior from `support.js` are all implemented.

## Architecture

```
app/                     # expo-router routes (see table above)
src/
  api/                   # axios client + endpoint modules
    client.ts            # base URL, bearer token, Laravel error normalization
    auth.ts              # login/register/OTP/KYC/PIN
    wallet.ts            # dashboard, transactions
    transfers.ts         # banks, account lookup, transfers
    crypto.ts            # market, quotes, orders
    cards.ts             # virtual card lifecycle
    atm.ts               # cardless withdrawals
  components/            # Button, TextField, CardFace, Numpad, OtpInput, Toggle, ...
  context/AuthContext.tsx
  lib/pendingAction.ts   # bridges review screens -> PIN confirmation -> receipt
  theme/                 # brand colors + gradients for JS props
  types/                 # User, Wallet, Transaction, Coin, VirtualCard, ...
  utils/format.ts        # ₦/$/crypto formatting, countdowns, day grouping
```

**PIN confirmation flow** — any money-moving screen registers a `PendingAction`
(title, amount, and a `run(pin)` callback that hits the API), then pushes
`/security/confirm-pin`. The PIN screen executes the action and forwards the returned
transaction to `/receipt`. Wrong PIN (`422`) surfaces inline and clears the dots.

## Getting started

```bash
npm install
cp .env.example .env     # set EXPO_PUBLIC_API_URL
npx expo start
```

Press `a` for Android, `i` for iOS.

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Physical device | `http://<your-LAN-IP>:8000` |
| Production | `https://api.yourdomain.com` |

The client appends `/api/v1`. Plain HTTP only works in development; production builds
should use HTTPS.

## Laravel API contract

Sanctum **personal access tokens** (`Authorization: Bearer`) — no cookies/CSRF needed.
All authenticated routes below are under `auth:sanctum`; single resources are wrapped in
`{ data: ... }` (API Resources) and lists use Laravel's paginated resource collections
(`{ data: [...], meta: {...} }`). Validation errors use Laravel's standard `422` shape and
are mapped to form fields in the app.

### Auth & onboarding

| Method | Route | Body / returns |
| --- | --- | --- |
| POST | `/auth/register` | `first_name, last_name, phone, email, password, device_name` → `{ token, user }` |
| POST | `/auth/login` | `login` (phone or email), `password`, `device_name` → `{ token, user }` |
| POST | `/auth/logout` | revokes current token |
| POST | `/auth/forgot-password` | `email` → `{ message }` |
| GET | `/user` | → `{ data: User }` (`kyc_status`, `tier`, `has_pin`, ...) |
| POST | `/auth/email/otp` | resend the 6-digit email code |
| POST | `/auth/email/verify` | `code` |
| POST | `/kyc/submit` | `document_type` (`nin·bvn·pvc·passport`), `document_number` |
| POST | `/kyc/face-check` | liveness capture (multipart) |
| POST | `/pin` | `pin, pin_confirmation` — 4 digits |

### Wallet & transactions

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/dashboard` | → `{ wallet: { balance, bank_name, account_number }, balances: [{asset, amount}], recent_transactions }` |
| GET | `/transactions?direction=in|out&search=&page=` | paginated `Transaction[]` |
| GET | `/transactions/{id}` | single transaction |

### Transfers

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/banks` | `[{ code, name }]` |
| POST | `/transfers/verify-account` | `bank_code, account_number` → `{ account_name }` (NUBAN lookup) |
| POST | `/transfers` | `bank_code, account_number, amount, description?, pin` → `Transaction` |

### Crypto

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/crypto/market` | `{ coins: [{symbol, name, price, change_24h, sparkline[7]}], portfolio_value, portfolio_change }` |
| POST | `/crypto/quote` | `side, symbol, amount` → `{ fiat_amount, crypto_amount, rate, fee, expires_at }` |
| POST | `/crypto/orders` | `side, symbol, amount, pin` → `Transaction` |

### Virtual card

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/cards` | `VirtualCard[]` (balance, last4, frozen, controls, limits) |
| GET | `/cards/pricing` | `{ creation_fee_usd, creation_fee_ngn, usd_rate, funding_fee_percent }` |
| POST | `/cards` | `pin` → creates the $5 USD card |
| POST | `/cards/{id}/fund` | `amount` (USD), `pin` → `Transaction` |
| GET | `/cards/{id}/details` | full PAN/CVV/billing address — return only over TLS, short-lived |
| POST | `/cards/{id}/freeze` · `/unfreeze` | toggle frozen |
| PATCH | `/cards/{id}/controls` | `online_payments? atm_withdrawals? contactless?` |

### Cardless ATM

| Method | Route | Notes |
| --- | --- | --- |
| POST | `/atm-withdrawals` | `amount, pin` → `{ code (6 digits), amount, expires_at }` |
| DELETE | `/atm-withdrawals/{id}` | cancel and release the hold |

Every money-moving endpoint validates the transaction `pin` server-side (throttled),
returning a `422` with an `errors.pin` message on mismatch.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Dev server |
| `npm run android` / `ios` | Start on a platform |
| `npm run typecheck` | TypeScript check |

## Store builds

```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

Bundle IDs (`com.nikimacsolutions.gutterapp`) are in `app.json`.
