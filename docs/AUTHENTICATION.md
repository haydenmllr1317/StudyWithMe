# Authentication

StudyWithMe uses Supabase Auth with email/password credentials, cookie-backed SSR sessions, and PostgreSQL Row Level Security. The application never accepts a browser-provided user ID as proof of identity.

## Flow

1. Signup validates display name, username, email, and password on the server.
2. The app checks username availability through a narrowly scoped database function.
3. `auth.signUp()` stores `username` and `display_name` in signup metadata.
4. The existing `auth.users` trigger creates the single corresponding `profiles` row. No application code inserts a competing profile.
5. When confirmation is enabled, signup shows `/signup/check-email`. The confirmation handler verifies the token and stores the resulting session in cookies.
6. The request proxy validates the JWT with `getClaims()`, refreshes cookies when needed, and protects application routes.
7. Profile rendering validates the claims again, then reads the caller’s profile through normal authenticated access and RLS.

## Supabase dashboard settings

In **Authentication → URL Configuration**:

- Site URL for local development: `http://localhost:3000`
- Additional redirect URL: `http://localhost:3000/auth/confirm`
- Add the production equivalents before deployment, for example `https://your-domain.example` and `https://your-domain.example/auth/confirm`.

Keep **Confirm email** enabled unless the product deliberately chooses lower signup friction over verified ownership. For the token-hash SSR flow, update the **Confirm signup** email template link to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

The confirmation handler also accepts the standard PKCE `code` callback for compatibility. Do not add wildcard production redirect URLs.

## Local verification

1. Put the project URL, publishable key, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local`.
2. Start the app with `npm run dev`.
3. In a private browser window, visit `http://localhost:3000/today`; confirm it redirects to `/login`.
4. Visit `/signup`, create a unique account, and confirm the check-email state appears when email confirmation is enabled.
5. Open the confirmation email on the same browser. Confirm the link ends at `/today`.
6. Visit `/profile`; confirm the real display name, username, and email appear.
7. Refresh `/profile`; confirm the session persists.
8. Log out from Profile; confirm `/login` appears and `/today` redirects back to it.
9. Try an incorrect password, existing username, malformed username, short password, and invalid/expired confirmation link; confirm each produces a restrained, actionable state without raw provider errors.

Supabase’s default SMTP service is rate-limited and intended for development. Configure custom SMTP before production email delivery.

## Security decisions

- Only the publishable key is available to browser code. No service-role or secret key is used.
- Server authorization uses verified JWT claims, not `getSession()` or local storage.
- The confirmation handler has fixed destinations; user-provided redirects are not accepted.
- The availability RPC exposes only a boolean. The database unique constraint remains the race-safe authority.
- Database advisors intentionally report the availability RPC as an anonymous/authenticated `SECURITY DEFINER` function. This is the one reviewed exception: unauthenticated signup cannot read `profiles`, the function has a fixed boolean-only query and empty `search_path`, and execute is revoked from `PUBLIC` before being granted only to `anon` and `authenticated`. Remove the exception if username selection moves behind authentication.
- Auth pages do not use the authenticated application shell or leak user-specific cached output.
- User metadata supplies profile fields only; it is never used for authorization.
