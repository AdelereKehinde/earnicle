# Earnicle Auth API — Backend Contract (for opencode integration)

Base URL: `https://earnicle-backend.onrender.com/`
(Set `EXPO_PUBLIC_API_BASE_URL=https://earnicle-backend.onrender.com` in the app env.)

- All request bodies are `application/json`.
- All error responses look like: `{ "detail": "message" }`.
- Auth-protected endpoints need header: `Authorization: Bearer <access_token>`.
- Tokens returned: `access_token` (expires 30 min) + `refresh_token` (expires 30 days).
- There is **NO email/OTP verification on signup** — signup returns tokens immediately.
- OTP is used **only for password reset**.

---

## 1. Sign Up — `POST /auth/signup`

Request body:
```json
{
  "full_name": "Deborah Adele",
  "email": "deborahadelere091@gmail.com",
  "password": "MyNewPass123!"
}
```

Response (`200/201`):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

## 2. Login — `POST /auth/login`

Request body:
```json
{
  "email": "deborahadelere091@gmail.com",
  "password": "MyNewPass123!"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

## 3. Refresh Tokens — `POST /auth/refresh`

Use when `access_token` is expired (e.g. on a 401) to get a fresh pair.

Request body:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

## 4. Get Current User — `GET /auth/me`

Header:
```
Authorization: Bearer <access_token>
```

Response:
```json
{
  "id": "3f7c1b2e-...-uuid",
  "full_name": "Deborah Adele",
  "username": null,
  "role": "reader",
  "bio": null,
  "avatar_url": null,
  "followers": 0,
  "following": 0,
  "total_earnings": 0,
  "total_stories": 0,
  "is_writer": false,
  "is_top_writer": false,
  "is_pro_member": false,
  "created_at": "2026-08-15T20:00:00+00:00"
}
```

---

## 5. Choose Role — `POST /auth/choose-role`

Header:
```
Authorization: Bearer <access_token>
```

Request body (`role` is `reader`, `writer`, or `both`):
```json
{
  "role": "writer"
}
```

Response: the updated profile (same shape as `/auth/me`).

---

## 6. Forgot Password (sends 6-digit OTP) — `POST /auth/forgot-password`

Request body:
```json
{
  "email": "deborahadelere091@gmail.com"
}
```

Response:
```json
{
  "message": "If that email exists, a code has been sent"
}
```

---

## 7. Resend OTP — `POST /auth/resend-otp`

Request body:
```json
{
  "email": "deborahadelere091@gmail.com"
}
```

Response:
```json
{
  "message": "Code resent"
}
```

---

## 8. Reset Password — `POST /auth/reset-password`

`reset_token` = the **6-digit OTP code** from the email (raw code works directly — no need to call verify-otp first).

Request body:
```json
{
  "email": "deborahadelere091@gmail.com",
  "reset_token": "123456",
  "new_password": "BrandNewPass456!"
}
```

Response:
```json
{
  "message": "Password updated"
}
```

---

## 9. Verify OTP (optional, two-step reset) — `POST /auth/verify-otp`

Only needed if you want a JWT instead of passing the raw OTP to reset-password.

Request body:
```json
{
  "email": "deborahadelere091@gmail.com",
  "code": "123456"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "",
  "token_type": "reset"
}
```

---

# PERSISTENT AUTH — REQUIRED (no flicker on launch)

Implement this in the frontend (the backend already supports it). Follow `AGENTS.md`:

1. **Storage:** after signup or login, persist `access_token` and `refresh_token` in `expo-secure-store` (NOT AsyncStorage).
2. **Single `AuthProvider` at the app root** (`src/providers/auth-provider.tsx`) — one place that owns the session. Remove per-screen session reads.
3. **On launch (no flicker):**
   - Show a splash/loading state first.
   - Read the stored `access_token` once.
   - Call `GET /auth/me` with it.
   - `200` → set session, route to **main dashboard (Home)**.
   - `401` → call `POST /auth/refresh` with the stored `refresh_token`, save the new pair, then `GET /auth/me`.
   - Only if refresh also fails → clear storage and show **login screen**.
4. **Do not render the Login screen while the check runs** — gate on `ready` (the loading flag) to avoid a flash of the wrong screen.
5. **All API calls go through `lib/api.ts`** — replace the `apiFetch` placeholder with a real typed fetch wrapper that:
   - auto-adds `Authorization: Bearer <access_token>`,
   - on `401` transparently refreshes and retries once,
   - centralizes the base URL from `EXPO_PUBLIC_API_BASE_URL`.

## Auth flow in the app

- Sign Up → call `/auth/signup` → save tokens → go straight to dashboard (no email verification screen).
- Sign In → call `/auth/login` → save tokens → dashboard.
- Forgot Password → `/auth/forgot-password` → enter OTP + new password → `/auth/reset-password` (raw OTP as `reset_token`) → success → Sign In screen.