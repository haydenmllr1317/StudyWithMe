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

- `profiles`: one social identity per Auth user. The primary key references `auth.users` with cascade deletion. Usernames use `citext` for case-insensitive uniqueness and a normalized format. `timezone` stores an IANA name for local calendar boundaries. Identity is rendered with initials; profile photos are retired.
- `study_goals`: private, user-owned study categories with optional descriptions and daily/weekly targets. Archiving preserves session history.
- `study_sessions`: source-of-truth time intervals. A session is either active (`ended_at` and `duration_seconds` are null) or completed with a non-negative, internally consistent duration. The composite goal foreign key prevents assigning another user’s goal. A partial unique index permits only one active session per user. `share_notes` defaults to false and controls only whether the current notes value appears in Activity.
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

## Profile photo storage

The `avatars` bucket is public-read so Activity, Leaderboards, and Circle rosters can render cacheable photos without signed-URL fan-out. Writes remain authenticated: Storage policies constrain inserts, updates, and deletes to the caller’s UUID folder and owned objects. The bucket accepts JPEG, PNG, and WebP files up to 4 MB. The browser crops uploads to a 512px square WebP when supported, and replacements use immutable versioned filenames before the previous owned object is removed.

Social RPCs expose only reviewed display-name and username identity fields. They do not broaden access to full profile rows.

## Source and derived data

Source data includes profiles, goals and targets, session timestamps/duration/notes/rating/note-sharing choice, groups, and membership. Daily/weekly/monthly/all-time totals, streaks, progress percentages, leaderboard positions, and Activity entries are derived from completed `study_sessions`; they are not stored redundantly.

The application-wide leaderboard uses `get_application_leaderboard(period, limit)`, a reviewed `security definer` function that aggregates inside PostgreSQL while raw session RLS remains owner-only. It returns only display name, username, aggregate duration, rank, and current-user flags. It does not expose internal user IDs, and it cannot return sessions, timestamps, goals, notes, ratings, avatar URLs, profile timezone, or settings. `EXECUTE` is revoked from `PUBLIC` and `anon` and granted only to `authenticated`; the function requires `auth.uid()`, validates period and limit (including explicit nulls), uses an empty `search_path`, and schema-qualifies every relation.

Leaderboard results are capped at 50 by the application (the function accepts only 1–100) and include a separate current-user result, so an out-of-range user receives rank context without downloading every participant. Only users with at least one completed, positive-duration session in the selected period enter the ranking. A zero-time viewer remains unranked but receives a safe zero-time current-user result.

Goal mutations use the authenticated user ID from verified server claims and remain constrained by RLS. Permanent deletion uses `delete_unused_study_goal`, which locks the archived goal and refuses deletion when session history exists. Session start takes a compatible lock, so deletion and a concurrent start cannot race and detach a new session from its goal.

## Session lifecycle

Authenticated clients have `SELECT` access to their session rows, while direct `INSERT`, `UPDATE`, and `DELETE` privileges are revoked. Meaningful writes use narrowly granted functions:

- `start_study_session` verifies the authenticated user, locks and verifies an owned active goal, uses `clock_timestamp()` for `started_at`, and relies on the partial unique index as the final one-active-session guard.
- `finish_study_session` locks the owned row, is idempotent when another client already finished it, and calculates `ended_at` and `duration_seconds` together from database timestamps.
- `update_study_session_reflection` updates notes, rating, and the default-private Activity note-sharing choice on an owned completed session.
- `pause_study_session` and `resume_study_session` persist pause boundaries and accumulated paused seconds. Final duration subtracts all paused time, including a session finished while paused.

Pomodoro sessions persist `pomodoro_minutes` as either 25 or 50. Active rows may carry `paused_at`; completed rows always clear it. These fields keep recovery timestamp-based across refreshes and device suspension.

These functions are intentionally `security definer` Data API endpoints because direct table writes are revoked. They use an empty `search_path`, explicitly require `auth.uid()`, constrain every lookup by ownership, expose no ownership or timestamp parameters, and have `EXECUTE` revoked from `PUBLIC` and `anon`. Supabase Security Advisor reports authenticated-callable security-definer functions as review warnings; for these lifecycle endpoints that exposure is deliberate and their explicit checks are the security boundary.

The four-argument reflection function updates `share_notes`; the legacy three-argument overload always resets sharing to private. Editing a shared reflection updates the same source note, so Activity never has a conflicting copy.

## Activity feed

`get_activity_feed(scope, group_id, before_ended_at, before_id, limit)` is the only cross-user session feed endpoint. It is authenticated-only, uses an empty `search_path`, validates every input, and returns a fixed JSON projection containing public identity, the associated goal name, positive completed duration, minute-rounded completion time, rating, current-user state, and notes only when `share_notes` is true. It never returns user IDs, raw timestamps, active or invalid sessions, unshared notes, session types, pause data, goal IDs, profile settings, emails, or arbitrary session columns.

The `mine` scope is limited to the caller, `everyone` includes feed-safe completed sessions from authenticated StudyWithMe users, and `circle` verifies that the caller currently belongs to the requested Circle before returning feed-safe sessions from its current members. Manipulating a Circle ID therefore fails inside PostgreSQL rather than relying on route validation. Raw `study_sessions` SELECT policy remains owner-only.

Activity uses stable `(ended_at, id)` cursor pagination and reads at most 50 rows per call; the application requests 20. Partial global and per-user cursor indexes cover completed positive-duration feed scans without indexing active or zero-duration rows.

### Reflection photos and loves

Completed sessions may reference one object in the private `reflection-photos` bucket through `study_sessions.reflection_photo_path`. Paths are versioned and scoped as `<owner-id>/<session-id>/reflection-<uuid>.webp`; both the reflection RPC and a database trigger enforce that ownership relationship. Upload policies require the authenticated owner and an already-completed matching session. Images are resized in the browser to at most 1600px and stored as WebP, with a 5 MB bucket limit.

The Activity sharing flag governs both notes and the reflection photo. Other users receive neither path unless sharing is enabled. Images are served through an authenticated application route backed by `get_visible_reflection_photo`, which re-checks current ownership/sharing on every request; this avoids the revocation delay of expiring signed URLs when sharing is turned off. Raw session rows remain owner-only.

`session_loves` uses `(session_id, user_id)` as its primary key, so duplicate loves are impossible. Direct table privileges are revoked. `toggle_session_love` derives the user from `auth.uid()`, rejects self-loves and unavailable sessions, and performs add/remove in PostgreSQL. `get_activity_feed` aggregates love count and caller state with avatar and reflection-safe fields in the same paginated RPC, avoiding per-row data queries.

## Timezones

`get_personal_history_stats(days)` derives private today/week/month/all-time totals, a 30-day daily series, range-scoped goal distribution, and the current streak without returning notes or ratings. Weeks begin Monday. A qualifying streak day has at least one completed positive-duration session; the current streak may end today, or yesterday when today has no completed study yet. `delete_completed_study_session` deletes only an authenticated user’s completed row, so totals are always recalculated from source sessions.

All timestamps are `timestamptz` and represent absolute instants. Aggregates derive local boundaries from `profiles.timezone`; weeks begin Monday. Sessions crossing midnight are clipped where daily totals require it.

The authenticated app shell detects the browser's current IANA timezone and synchronizes it to the caller's own profile through the existing owner-only profile update policy. When the stored value changes, the page refreshes once so Today, History, Activity, analytics, and ranking boundaries immediately use that local calendar. The server validates the timezone before writing it; UTC remains only the safe fallback when a browser cannot supply a valid IANA name.

Application leaderboard periods use the viewing user's IANA timezone: Today begins at that viewer's local midnight, Week begins Monday at local midnight, Month begins on the first local calendar day, and All Time has no lower boundary. Consistent with the Step 6 headline totals, a completed session is assigned wholly according to its `started_at` instant in the viewer's timezone; it is not split across period boundaries. Rankings use SQL `DENSE_RANK()`, so equal durations share a rank and the next distinct duration advances by one rank. Rows with equal totals have deterministic display order by normalized username and user ID.

## Constraints and indexes

Checks limit names, notes, target minutes, and ratings. Completed-session timing must agree to the second. Indexes cover user history, goal history, completed interval aggregation, Activity cursors, group ownership, and membership lookup. The existing partial completed-session interval index supports leaderboard time filtering and grouping without a second redundant score or leaderboard index.

Session lifecycle functions use database-owned start/end timestamps and derive duration server-side, preventing direct fabricated durations or client-supplied timestamps. The MVP does not yet detect a user intentionally leaving a legitimate session running for an implausibly long time; stronger duration caps or review signals are deferred until product rules are established.

Leaderboard pages are dynamically rendered and call the aggregation function on navigation or reload. There is no realtime subscription or persistent application cache, so a newly finished session appears on the next Leaderboard navigation or reload.

History statistics use one materialized scan of the caller's completed sessions. The current-streak calculation orders only qualifying dates and compares them with consecutive expected dates; it does not generate or rescan decades of possible days. The History route reads the profile timezone first, then runs goals, statistics, and the bounded session page concurrently. Session ranges begin at midnight in that IANA timezone rather than at an approximate rolling UTC-hour boundary, keeping the list aligned with database calendar statistics.

## Analytics aggregates

`get_study_analytics(scope, group_id, range, limit)` supplies the shared History and Leaderboard analytics model. It accepts `7d`, `30d`, `3m`, `6m`, `1y`, and `all`, resolves calendar boundaries in the authenticated viewer's IANA timezone, and returns only daily totals, goal-label totals, ranking totals, and the selected context. Zero-study dates are generated in Postgres; raw sessions and exact timestamps never leave the database for chart rendering.

The `mine` scope is restricted to `auth.uid()`. The `circle` scope requires current membership before any aggregation runs. `everyone` and `circle` goal labels are released only when at least two distinct learners contributed to the same label; smaller buckets are combined into `Other study`. This prevents the analytics endpoint from becoming a way to enumerate a person's private goals. The function is `SECURITY DEFINER` only because social aggregates must cross owner-only session RLS; it uses an empty search path, schema-qualified relations, explicit authentication and membership checks, and execute privileges limited to `authenticated`.

Session contribution is clipped to the selected interval and distributed across local calendar days in proportion to the persisted focused duration, so paused wall-clock time is not added back into totals. The existing completed-session indexes support the bounded interval scan; no client-side raw-session aggregation or N+1 goal lookup is used.

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
