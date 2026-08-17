# Product roadmap

Implementation should proceed in this order so that each layer rests on a tested foundation:

1. **App shell** — Establish the mobile-first layout, navigation, design tokens, and reusable interface components.
2. **Supabase setup** — Complete: local configuration, environment documentation, browser/server clients, migrations, schema, and Row Level Security foundation.
3. **Authentication** — Complete for the MVP: email/password signup, confirmation, sign-in, sign-out, protected routes, persisted SSR sessions, and real profile identity. Account recovery remains a later auth enhancement.
4. **Database schema** — Foundation complete alongside Supabase setup; evolve only through reviewed migrations as features are implemented.
5. **Study goals** — Complete for the MVP: authenticated users can create, edit, archive, restore, and safely delete unused goals; Today uses their active goals.
6. **Study timer** — Complete for the MVP: timestamp-based normal and 25/50-minute Pomodoro sessions, persistent pause/resume, resilient active-session recovery, atomic lifecycle operations, reflection, and timezone-safe Today totals.
7. **Session history and statistics** — Complete for the MVP: bounded/filterable history, reflection editing, confirmed deletion, totals, goal distribution, daily trends, and timezone-aware streaks.
8. **Statistics expansion** — Add richer target reporting and longer-term comparisons only when product usage justifies them.
9. **Leaderboards and groups** — Complete for the MVP: application-wide rankings, private groups, owner-only invite management, member lifecycle, and private group leaderboards.
10. **PWA support** — Complete for installation, icons, safe-area behavior, conservative static caching, offline status/fallback, and controlled updates. Push notifications remain deferred.
11. **Polish and testing** — Expand accessibility, responsive, unit, integration, and end-to-end coverage; tune performance and deployment observability.

The repository has completed the timer, history/statistics, and MVP social leaderboard/group phases. PWA installation and offline strategy are next.
