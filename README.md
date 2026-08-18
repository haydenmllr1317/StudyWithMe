# StudyWithMe

StudyWithMe is a mobile-first social study and time-tracking application for iPhone and desktop browsers. The MVP includes Supabase authentication, user-owned study goals, persistent normal and 25/50-minute Pomodoro sessions with pause/resume, personal history/statistics, application-wide rankings, private study groups, and installable PWA support.

## Technology stack

- Next.js 16 App Router, React 19, and strict TypeScript
- Tailwind CSS 3
- Supabase Auth and PostgreSQL via `@supabase/supabase-js` and `@supabase/ssr`
- Client-side HEIC/HEIF conversion via pinned `heic-to` for iPhone photo uploads
- Versioned Supabase CLI migrations
- Vercel-compatible deployment
- Standards-based installable PWA with a conservative custom service worker

## Local application

Requires Node.js 22 or newer and npm. For production, select Node.js 22.x in Vercel so deployments use a deliberate, tested runtime major.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Product data requires a configured Supabase project.

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Connect Supabase

Create a Supabase project, then copy its Project URL and Publishable key from the Dashboard’s **Connect** dialog into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never place a secret key or service-role key in a `NEXT_PUBLIC_` variable. Local environment files are ignored by Git.

To apply the committed schema to a new cloud project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

For the full local stack, install a Docker-compatible runtime and run:

```bash
npx supabase start
npx supabase db reset
```

Docker is not required to run the Next.js frontend.

After applying any new migration, regenerate and commit the database types:

```bash
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

The current release-readiness migration restricts full profile reads to the owning user. Apply it before inviting real users.

Session reflection photos use a separate private `reflection-photos` bucket. Access follows the session’s current Activity-sharing flag and is checked on every image request. The same migration adds the normalized `session_loves` interaction model.

## Production deployment

Import the repository into Vercel with these settings:

- Framework preset: **Next.js**
- Root directory: repository root
- Install command: `npm install` (Vercel may use `npm ci` automatically with the lockfile)
- Build command: `npm run build`
- Output directory: leave unset; Next.js manages `.next`
- Node.js: 22.x, matching `package.json`

Add these Vercel Production environment variables using the production Supabase project values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=https://YOUR_PRODUCTION_DOMAIN
```

Do not add a service-role key to Vercel for this application. Redeploy after changing environment variables.

In Supabase **Authentication → URL Configuration**, set:

- Site URL: `https://YOUR_PRODUCTION_DOMAIN`
- Redirect URL: `https://YOUR_PRODUCTION_DOMAIN/auth/confirm`
- Development redirect: `http://localhost:3000/auth/confirm`

Keep email confirmation enabled and configure the confirmation template and production SMTP as described in [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md). Avoid wildcard production redirects. Deployments must use HTTPS for PWA installation and secure auth cookies.

Before release, run the repeatable [QA checklist](docs/QA.md), including its two-account privacy test and post-deployment smoke test.

## Architecture

```text
src/app/                  Routes, metadata, and global styles
src/components/           Shared layout, navigation, and UI primitives
src/features/             Feature-specific UI for goals, sessions, history, and leaderboards
src/lib/leaderboard.ts    Safe parsing and period conventions for aggregate leaderboard data
src/lib/goals/            Goal validation and display helpers
src/lib/sessions/         Timestamp-based timer formatting helpers
src/lib/supabase/         Browser, server, environment, and session-proxy utilities
src/types/database.ts     CLI-generated types from the deployed public schema
supabase/migrations/      Version-controlled database source of truth
docs/DATABASE.md          Schema, RLS, derived-data, and migration decisions
docs/AUTHENTICATION.md    Auth flow, dashboard settings, and test checklist
docs/DESIGN.md            Visual and interaction conventions
docs/PWA.md               Install, caching, offline, update, and privacy behavior
docs/QA.md                Repeatable release, privacy, mobile, and deployment checks
docs/ROADMAP.md           Product implementation sequence
```

The App Router owns page composition. Supabase clients are initialized only through the shared utilities. PostgreSQL and RLS enforce ownership; server code validates identity with `getClaims()` and never treats a cookie-loaded session as authorization proof. See [authentication](docs/AUTHENTICATION.md), [database architecture](docs/DATABASE.md), and [the roadmap](docs/ROADMAP.md).
