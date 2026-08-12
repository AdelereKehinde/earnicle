# Earnicle — Agent Context

## What this app is
Earnicle is a read-to-earn / write-to-earn content platform.
- Readers earn small amounts ($0.15–$0.20) per article read to completion, can unlock
  premium articles, and can join a writer's Pro membership.
- Writers earn from views, paywall unlocks, and memberships, and can withdraw
  earnings to a bank account via Paystack.
- "Story" = long-form article. "Short" = short-form text post (NOT video).
  Both are created from one editor screen with a Stories/Shorts toggle —
  do not build separate editors unless explicitly asked.

## Stack
- React Native (Expo), TypeScript
- Supabase: Postgres, Auth, Storage, Edge Functions
- Cloudinary: avatar and cover image hosting (client uploads via unsigned preset)
- Paystack: payments/withdrawals (test mode keys currently)

## Screens (25 total)
Onboarding/splash (4) → Choose your path → Auth (sign up, sign in, verify email,
forgot/reset password, password changed) → Home feed → Explore (Stories/Short
toggle, categories, trending, writers to follow) → Earnings (simple + detailed
dashboard) → Article reader (premium preview, unlock success, reading progress)
→ Editor (Story/Shorts) → Publish settings → Publish success → Profile
(My stories/Drafts) → Library (Saved/History/Following) → Notifications →
Comment modal.

Known bugs to fix while building the matching screens:
- Sign In screen currently has its button labeled "Create account" — must say "Sign In"
- Choose-your-path onboarding has two cards labeled "Writer" — the third is meant
  to be "Both" (read + write)

## Database (Supabase Postgres)
Core tables: `profiles`, `stories`, `transactions`, `withdrawals`, `read_history`,
`follows`, `comments`, `notifications`, `saved_stories`.
- `stories.content_type` distinguishes `'story'` vs `'short'`
- `profiles.followers` / `profiles.following` are maintained by a trigger on `follows`
   — never increment/decrement them directly from the client
- `stories.comments_count` is maintained by a trigger on `comments` — same rule
- RLS is enabled on every table. Never bypass it with the service role key from
  client code — service role key only exists inside Edge Functions.

## Security rules — non-negotiable
- Never put a secret key in any `EXPO_PUBLIC_*` env var. Only the Supabase anon
  key, Paystack **public** key (`pk_...`), and Cloudinary cloud name/unsigned
  preset are safe to expose to the client.
- `PAYSTACK_SECRET_KEY` lives only as a Supabase Edge Function secret
  (`supabase secrets set ...`), never in `.env`, never committed, never printed
  in a response, log, commit message, or PR description.
- All Paystack operations that need the secret key (initialize transaction,
  verify payment) go through an Edge Function — the client calls the function,
  never Paystack's secret-key endpoints directly.
- Never read, print, or include the contents of `.env` in any output.
- `.env` must stay in `.gitignore` — never commit it.

## Design tokens (match existing screens exactly)
- Brand/accent: purple (~#5B4FE5)
- Success/earnings: green
- Pro/membership badge: purple pill
- Premium badge: light purple pill
- Cards: white surface, 12–20px corner radius, thin border, generous padding
- Bottom nav, 5 tabs: Home · Explore · Earnings · Library · Profile
- Buttons: solid purple primary CTA, light/outline secondary

## Money & numbers
- All monetary columns are `DECIMAL(10,2)` — always format to 2 decimals in the UI
- Round every displayed number; never show raw floating-point output

## Workflow / branching
- `frontend` branch = screens and RN app code (Codex's lane — it takes image
  input directly from Figma exports or provided mockups)
- `backend` branch = Supabase schema, RLS, triggers, Edge Functions, and any
  data-fetching/business logic (OpenCode/DeepSeek's lane — text-only, no images)
- Merge both into `main` daily; do not run both agents on `main` concurrently
- Do not touch the other lane's primary directory without asking:
  - `frontend` owns `/app/(screens)` and `/components`
  - `backend` owns `/supabase/migrations` and `/supabase/functions`
- Shared contract: `/lib/supabase.ts` (client init) and `types.ts` (generated via
  `supabase gen types typescript`) — regenerate `types.ts` after any schema change
  and let both agents pick it up before continuing

## Persistent auth session (no flicker on launch)
- Supabase session must persist across app restarts — the user should not be
  bounced back to Sign In every time the app opens.
- Configure the Supabase client with a persistent storage adapter
  (`expo-secure-store` or `@react-native-async-storage/async-storage`) and
  `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`.
- On app launch, call `supabase.auth.getSession()` (which reads the persisted
  session instantly) before rendering any auth-gated screen. Do not render the
  Sign In screen first and then swap to Home once the session resolves — that
  swap is the flicker. Instead, show a single splash/loading state until the
  session check resolves, then render straight into the correct screen
  (Home if session exists, Sign In if not).
- Subscribe to `supabase.auth.onAuthStateChange` for the whole app lifetime so
  sign-in/sign-out/token-refresh update state in one place, not per-screen.
- Do not read `AsyncStorage`/`SecureStore` directly in multiple screens — read
  the session once at the root (e.g. an `AuthProvider`) and pass it down, so
  there's a single source of truth and no re-render race between screens.
- Never store the Supabase session or any token in plain `AsyncStorage` without
  `expo-secure-store` if the platform supports it — prefer SecureStore for the
  session token itself.

## Email OTP verification
- OTP input is 6 boxes (matches Supabase's default 6-digit code — do not
  build a 5-box input for this screen).
- Auto-advance focus between boxes as each digit is entered; auto-submit once
  all 6 are filled.
- Client calls: `supabase.auth.signUp()` triggers the email, `supabase.auth
  .verifyOtp({ email, token, type: 'signup' })` verifies it, `supabase.auth
  .resend({ type: 'signup', email })` handles the resend button.
- The "Confirm signup" email template in the Supabase dashboard must include
  `{{ .Token }}` so it actually sends a numeric code, not just a magic link.

## Conventions
- All Supabase calls go through `/lib/supabase.ts`
- Prefer cursor-based pagination for feeds (not offset)
- Every new table needs RLS policies in the same migration that creates it
- Don't invent new screens or flows not listed above without flagging it first
