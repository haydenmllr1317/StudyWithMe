# Release QA checklist

Run this checklist against a fresh deployment at iPhone width (approximately 390×844), an installed/standalone PWA when applicable, and a desktop browser. Use two test accounts. Do not use real private notes in production smoke tests.

## Account

- [ ] Sign up with a unique username and confirm the confirmation email reaches the expected domain.
- [ ] Confirm the email link returns to `/today`; invalid or expired links show a useful error.
- [ ] Sign in, refresh, close/reopen the browser, and confirm the session persists.
- [ ] Sign out and confirm `/today`, `/history`, `/leaderboard`, `/profile`, group, and invite routes redirect to login as appropriate.
- [ ] Confirm an external or protocol-relative `next` URL cannot redirect outside StudyWithMe.

## Goals

- [ ] Create and edit a goal with daily/weekly targets; verify validation and double-submit protection.
- [ ] Archive and restore it; archived goals cannot start new sessions.
- [ ] Delete an unused archived goal; confirm a goal with session history cannot be permanently deleted.
- [ ] Confirm the no-goals and no-archived-goals states explain the next action.

## Sessions

- [ ] Start and finish a short open session, add notes/rating, and confirm it appears in History.
- [ ] Start both 25- and 50-minute Pomodoro sessions; verify the countdown survives refresh and backgrounding.
- [ ] Pause, refresh, and resume; paused time must not count.
- [ ] With two tabs open, try repeated start/pause/resume/finish actions; confirm only one active session exists and stale actions recover safely.
- [ ] Confirm timer changes are not announced every second by a screen reader.

## History and statistics

- [ ] Verify Today/Week/Month/All-time totals against known completed sessions.
- [ ] Check 7/30/90/all ranges, goal filters, pagination, and the no-results state.
- [ ] Edit and delete reflection data; confirm totals and streaks update after deletion.
- [ ] Test just before/after local midnight, Monday, and month end; change the profile timezone in Supabase only in a test environment and repeat.
- [ ] Confirm the chart has an accessible label and accompanying text/totals.

## Leaderboards, groups, and invites

- [ ] Check Today/Week/Month/All-time global rankings and current-user context, including an account with no study time.
- [ ] Create a group, copy/regenerate an invite, join as User B, and verify the old invite becomes invalid.
- [ ] Check the private group ranking/member list; rename, remove User B, rejoin, leave, and delete with confirmations.
- [ ] Verify non-members cannot open a group URL and ordinary members cannot access owner controls.
- [ ] Verify empty global and group leaderboard states are clear.

## Two-account privacy (release blocking)

- [ ] User A creates a goal and completed session with distinctive private notes and rating.
- [ ] As User B, verify direct table/API reads cannot access User A's profile row, goals, session rows, timestamps, notes, rating, or email.
- [ ] Verify User B sees only approved aggregate duration and display name/username on the global leaderboard.
- [ ] Verify User B cannot see User A's private group until joining and cannot access other groups after leaving/removal.
- [ ] Run Supabase Security Advisor and review every warning; do not weaken RLS to clear a warning.

## PWA, mobile, and desktop

- [ ] Over HTTPS, verify manifest and all icons resolve, then install from iPhone Safari and a supported desktop browser.
- [ ] Open standalone mode; confirm safe areas, keyboard-visible forms, 44px+ targets, bottom navigation, and no horizontal overflow.
- [ ] Go offline: navigation shows the static offline page and no prior user's private page is served.
- [ ] Deploy a new version: confirm the update prompt appears and refresh occurs only after choosing it.
- [ ] Sign out, sign in as the other account, and confirm no private content from the first account appears.
- [ ] At desktop widths, verify constrained content width, navigation, forms, charts, rankings, groups, and History.

## Post-deployment smoke test

1. Open the production HTTPS URL in a private window.
2. Sign in and visit every primary destination.
3. Create a temporary goal, start/finish a short session, and confirm it in History.
4. Confirm the global leaderboard and one group you are authorized to access.
5. Refresh, sign out, and verify a protected route redirects to login.
6. Install/open the PWA if this release changes PWA assets or behavior.
7. Archive and delete the temporary unused goal; avoid destructive testing of real user data.
