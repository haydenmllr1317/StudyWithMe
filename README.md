# StudyWithMe

StudyWithMe is a mobile-first social study and time-tracking application for iPhone and desktop browsers. The repository contains a polished frontend shell, Supabase authentication, user-owned study goals, persistent normal and Pomodoro sessions, personal history/statistics, application-wide rankings, and private study groups with secure invite links.

## Technology stack

- Next.js 16 App Router, React 19, and strict TypeScript
- Tailwind CSS 3
- Supabase Auth and PostgreSQL via `@supabase/supabase-js` and `@supabase/ssr`
- Versioned Supabase CLI migrations
- Vercel-compatible deployment
- Standards-based installable PWA with a conservative custom service worker

## Local application

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Authentication and study goals require a configured Supabase project; unimplemented product areas remain clearly marked previews.

Quality checks:

```bash
npm run lint
npm run typecheck
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
docs/ROADMAP.md           Product implementation sequence
```

The App Router owns page composition. Supabase clients are initialized only through the shared utilities. PostgreSQL and RLS enforce ownership; server code validates identity with `getClaims()` and never treats a cookie-loaded session as authorization proof. See [authentication](docs/AUTHENTICATION.md), [database architecture](docs/DATABASE.md), and [the roadmap](docs/ROADMAP.md).
