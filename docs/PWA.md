# Progressive Web App architecture

StudyWithMe uses the Next.js App Router manifest plus a small custom service worker. No PWA dependency is required. The service worker is registered only in production.

## Cache and privacy

`public/sw.js` precaches only the self-contained `/offline.html` fallback and app icons. Runtime caching is restricted to content-hashed files below `/_next/static/` plus those explicit precache assets. Navigations always use the network and fall back to the dependency-free offline page; authenticated HTML, React server responses, arbitrary same-origin images, Supabase APIs, session data, profiles, leaderboards, and group data are never cached. Mutating requests are never intercepted or queued.

## Offline behavior

An already-rendered active timer continues deriving its display from database timestamps while the page remains open or returns from the background. JavaScript does not need to run while the phone is locked. Reloading or launching without connectivity shows the honest offline page rather than stale private data. Starting, pausing, resuming, finishing, reflections, and other writes require the network and report failure normally; there is no offline mutation queue.

## Updates

HTML remains network-only, preventing stale HTML from referring to obsolete chunks. When a changed service worker installs behind an existing controller, the app presents a refresh action. The worker activates only after the user chooses it, so an active study screen is never reloaded unexpectedly. Content-hashed assets safely coexist across deployments.

## Installation

On iPhone, open the HTTPS deployment in Safari, tap Share, choose **Add to Home Screen**, and confirm. On supported desktop browsers, use the browser's Install command. Installation hints are restrained, dismissible, and hidden in standalone mode.
