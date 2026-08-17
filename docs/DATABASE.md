# Database architecture

The migration in `supabase/migrations` is the source of truth. Dashboard edits should be captured as a new migration before they are relied on by application code.

## Relationships

```text
auth.users
    │ 1:1
    ▼
profiles
    ├──< study_goals
    │         └──< study_sessions (optional goal)
    ├──< study_sessions
    ├──< groups (owner)
    └──< group_members >── groups
```

## Tables

- `profiles`: one social identity per Auth user. The primary key references `auth.users` with cascade deletion. Usernames use `citext` for case-insensitive uniqueness and a normalized format. `timezone` stores an IANA name for local calendar boundaries.
- `study_goals`: private, user-owned study categories with optional descriptions and daily/weekly targets. Archiving preserves session history.
- `study_sessions`: source-of-truth time intervals. A session is either active (`ended_at` and `duration_seconds` are null) or completed with a non-negative, internally consistent duration. The composite goal foreign key prevents assigning another user’s goal. A partial unique index permits only one active session per user.
- `groups`: owner-controlled private study circles with unique 192-bit invite tokens. Tokens are visible only to owners through an authorized group-detail RPC.
- `group_members`: unique group/user memberships with only `owner` and `member` roles. Creating a group automatically creates its protected owner membership.

Deleting an Auth user cascades through their profile, goals, sessions, and memberships. A group owner cannot be deleted while they own a group; ownership must be transferred or the group deleted first. This prevents silent orphaning.

## Ownership and Row Level Security

RLS is enabled on every public table. No public-table permissions are granted to `anon`.

- Authenticated users may read and update only their own full profile row. Cross-user identity is available only through reviewed aggregate functions that project explicitly approved public fields.
- Goals and sessions are visible and mutable only by their owner.
- Direct authenticated table privileges on groups and memberships are revoked. Narrow RPCs enforce membership and ownership for every read and mutation.
- Group members may retrieve their group identity, safe member roster, and aggregate group leaderboard. Owners additionally receive the active invite token and may rename, regenerate invitations, remove ordinary members, or delete the group. Ordinary members may only leave themselves; owners cannot leave without deleting the group.

Private `security definer` membership helpers live in the unexposed `private` schema, use an empty `search_path`, and expose only boolean checks to `authenticated`. Application authorization must still use validated claims; server code should use `auth.getClaims()`, not trust `getSession()` by itself.

## Source and derived data

Source data includes profiles, goals and targets, session timestamps/duration/notes/rating, groups, and membership. Daily/weekly/monthly/all-time totals, streaks, progress percentages, and leaderboard positions are derived from completed `study_sessions`; they are not stored redundantly.

The application-wide leaderboard uses `get_application_leaderboard(period, limit)`, a reviewed `security definer` function that aggregates inside PostgreSQL while raw session RLS remains owner-only. It returns only display name, username, aggregate duration, rank, and current-user flags. It does not expose internal user IDs, and it cannot return sessions, timestamps, goals, notes, ratings, avatar URLs, profile timezone, or settings. `EXECUTE` is revoked from `PUBLIC` and `anon` and granted only to `authenticated`; the function requires `auth.uid()`, validates period and limit (including explicit nulls), uses an empty `search_path`, and schema-qualifies every relation.

Leaderboard results are capped at 50 by the application (the function accepts only 1–100) and include a separate current-user result, so an out-of-range user receives rank context without downloading every participant. Only users with at least one completed, positive-duration session in the selected period enter the ranking. A zero-time viewer remains unranked but receives a safe zero-time current-user result.

Goal mutations use the authenticated user ID from verified server claims and remain constrained by RLS. Permanent deletion uses `delete_unused_study_goal`, which locks the archived goal and refuses deletion when session history exists. Session start takes a compatible lock, so deletion and a concurrent start cannot race and detach a new session from its goal.

## Session lifecycle

Authenticated clients have `SELECT` access to their session rows, while direct `INSERT`, `UPDATE`, and `DELETE` privileges are revoked. Meaningful writes use narrowly granted functions:

- `start_study_session` verifies the authenticated user, locks and verifies an owned active goal, uses `clock_timestamp()` for `started_at`, and relies on the partial unique index as the final one-active-session guard.
- `finish_study_session` locks the owned row, is idempotent when another client already finished it, and calculates `ended_at` and `duration_seconds` together from database timestamps.
- `update_study_session_reflection` updates only notes and rating on an owned completed session.
- `pause_study_session` and `resume_study_session` persist pause boundaries and accumulated paused seconds. Final duration subtracts all paused time, including a session finished while paused.

Pomodoro sessions persist `pomodoro_minutes` as either 25 or 50. Active rows may carry `paused_at`; completed rows always clear it. These fields keep recovery timestamp-based across refreshes and device suspension.

These functions are intentionally `security definer` Data API endpoints because direct table writes are revoked. They use an empty `search_path`, explicitly require `auth.uid()`, constrain every lookup by ownership, expose no ownership or timestamp parameters, and have `EXECUTE` revoked from `PUBLIC` and `anon`. Supabase Security Advisor reports authenticated-callable security-definer functions as review warnings; for these lifecycle endpoints that exposure is deliberate and their explicit checks are the security boundary.

## Timezones

`get_personal_history_stats(days)` derives private today/week/month/all-time totals, a 30-day daily series, range-scoped goal distribution, and the current streak without returning notes or ratings. Weeks begin Monday. A qualifying streak day has at least one completed positive-duration session; the current streak may end today, or yesterday when today has no completed study yet. `delete_completed_study_session` deletes only an authenticated user’s completed row, so totals are always recalculated from source sessions.

All timestamps are `timestamptz` and represent absolute instants. Aggregates derive local boundaries from `profiles.timezone`; weeks begin Monday. Sessions crossing midnight are clipped where daily totals require it.

Application leaderboard periods use the viewing user's IANA timezone: Today begins at that viewer's local midnight, Week begins Monday at local midnight, Month begins on the first local calendar day, and All Time has no lower boundary. Consistent with the Step 6 headline totals, a completed session is assigned wholly according to its `started_at` instant in the viewer's timezone; it is not split across period boundaries. Rankings use SQL `DENSE_RANK()`, so equal durations share a rank and the next distinct duration advances by one rank. Rows with equal totals have deterministic display order by normalized username and user ID.

## Constraints and indexes

Checks limit names, notes, target minutes, and ratings. Completed-session timing must agree to the second. Indexes cover user history, goal history, completed interval aggregation, group ownership, and membership lookup. The existing partial completed-session interval index supports leaderboard time filtering and grouping without a second redundant score or leaderboard index.

Session lifecycle functions use database-owned start/end timestamps and derive duration server-side, preventing direct fabricated durations or client-supplied timestamps. The MVP does not yet detect a user intentionally leaving a legitimate session running for an implausibly long time; stronger duration caps or review signals are deferred until product rules are established.

Leaderboard pages are dynamically rendered and call the aggregation function on navigation or reload. There is no realtime subscription or persistent application cache, so a newly finished session appears on the next Leaderboard navigation or reload.

History statistics use one materialized scan of the caller's completed sessions. The current-streak calculation orders only qualifying dates and compares them with consecutive expected dates; it does not generate or rescan decades of possible days. History page reads for goals, profile timezone, statistics, and paginated sessions run concurrently.

## Private groups and invitations

`create_study_group` derives ownership from `auth.uid()`; the existing trigger atomically creates the owner membership. A normalized owner/name unique index prevents duplicate double-submit creation. `get_my_study_groups` returns only groups the caller belongs to with role and member count.

Invite tokens use 24 cryptographically random bytes encoded as 48 lowercase hexadecimal characters. `preview_group_invite` and `join_study_group` accept only that exact format and look up the token server-side. Joining is idempotent through the membership primary key. Only owners receive the token; regenerating it replaces the stored value immediately, invalidating the old link without changing membership.

`get_study_group` requires current membership before returning group data. Members can see group name, member count, member display names/usernames/roles, and aggregate duration/rank for Today, Week, Month, or All Time. It uses the viewer-timezone and `DENSE_RANK()` conventions of the global leaderboard. It never returns sessions, timestamps, goals, notes, ratings, emails, timezones belonging to other users, auth metadata, or internal member IDs.

`rename_study_group`, `regenerate_group_invite`, `remove_study_group_member`, and `delete_study_group` require database-verified ownership. Removal targets usernames but deletes only ordinary-member rows. `leave_study_group` deletes only the caller's ordinary membership and refuses owner leave. Group deletion cascades membership rows only; profiles, sessions, and goals have no cascading relationship to groups.

There is no public discovery, invite expiration, ownership transfer, moderation, or application-level rate limiter in this MVP. Invite entropy makes enumeration impractical, but production abuse controls should add endpoint-level rate limits and monitoring.

## Migrations and local development

Create every schema change with `npx supabase migration new <name>`, edit the SQL, then validate with `npx supabase db reset`. Local Supabase requires Docker. To deploy reviewed migrations, link the intended project and run `npx supabase db push`; never use a destructive linked reset against production.

The profile trigger reads optional `username`, `display_name`, and `timezone` values from `raw_user_meta_data`. It sanitizes the username, appends a stable UUID fragment for uniqueness, validates the timezone against PostgreSQL’s timezone catalog, and safely falls back when metadata is missing. Metadata is not used for authorization.

## Generated TypeScript types

`src/types/database.ts` is generated from the linked project. Replace it—not supplement it—whenever the schema changes:

```bash
# Linked cloud project
npx supabase gen types typescript --linked --schema public > src/types/database.ts

# Or local stack
npx supabase gen types typescript --local --schema public > src/types/database.ts
```

Regenerate types after every schema migration and include the result in the same change.
