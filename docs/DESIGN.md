---
name: StudyWithMe
description: A calm, concerted system for focused study, visible progress, and quiet accountability.
colors:
  paper: "#FBF8F1"
  surface: "#FFFEFA"
  ink: "#25312D"
  muted: "#68736E"
  line: "#DDD9CF"
  coral: "#B84D3A"
  coral-dark: "#963D30"
  coral-soft: "#F2D8D0"
  moss: "#648571"
  moss-dark: "#466655"
  moss-soft: "#DCE7DF"
  sky: "#769EAE"
  sky-soft: "#DDE9ED"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(4.25rem, 8vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.14em"
rounded:
  field: "0.625rem"
  panel: "0.875rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
  section: "3rem"
  section-wide: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0.75rem 1.25rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.coral-dark}"
    textColor: "{colors.surface}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0.75rem 1rem"
    height: "3rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "1.25rem"
  focus-launcher:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.surface}"
    rounded: "0"
    padding: "1.25rem"
    height: "5rem"
---

# Design System: StudyWithMe

## Overview

Authentication is intentionally reduced to a centered StudyWithMe wordmark, required fields, one primary action, and the reciprocal login/signup link. Do not restore marketing panels, feature copy, or decorative cards to these entry screens.

Use the shared circular avatar primitive everywhere learner identity appears. Photos crop with `object-cover`; missing or invalid paths fall back to initials in the existing palette. Profile is the only editing surface, with Change and Remove actions kept beside the image.

Session completion becomes a quiet reflection measure after duration is durably saved: rating, reflection text, one optional photo, and an explicit Activity-sharing choice lead to one “Save and finish” action. Activity keeps one restrained heart interaction below shared reflection content; it does not expand into a general social-control row.

**Creative North Star: "In Concert"**

StudyWithMe treats individual effort and trusted social context as parallel voices in one restrained composition. The interface feels focused, calm, polished, motivating, modern, and slightly playful: premium without becoming corporate, social without resembling social media, and competitive without aggression. Its identity is light and gender-neutral, built from warm ivory, precise ink, accessible coral, moss, and sky.

The visual grammar borrows from a musical score rather than a dashboard. Fine horizontal and vertical measure lines organize time, pace, history, and people into a readable rhythm. Broad open fields and expressive time figures establish hierarchy; flat rows and restrained containers keep evidence of progress honest and legible. Coral marks the clearest next action, while moss and sky support personal pace and quiet company.

Circles extend that same composition without becoming a separate social product. Private pace comes first, membership and owner controls follow, and privacy boundaries are stated in plain language wherever an invitation, aggregate comparison, or Activity projection could create uncertainty.

Interaction is direct and composed. State changes use short color, transform, and disclosure transitions (200ms with an ease-out curve); small translations or rotations clarify response without becoming spectacle. Honor `prefers-reduced-motion` by removing smooth scrolling and reducing transitions and animations to effectively instantaneous changes.

**Key Characteristics:**

- Warm, light, gender-neutral canvas with dark green-black ink.
- Score-like measure lines and structured rows instead of equal-card dashboards.
- One dominant coral action, supported by quieter moss and sky signals.
- Expressive tabular time typography paired with compact, disciplined labels.
- Restrained radii, flat surfaces, and generous breathing room.
- Five-item mobile bottom navigation that becomes a calm top navigation on desktop.

## Colors

The palette is warm and grounded: coral supplies decisive energy, moss communicates steady progress, sky distinguishes social or secondary voices, and ivory-and-ink neutrals carry most of every screen.

### Primary

- **Accessible Coral:** The action color for starting a session, active navigation measures, links, focus outlines, selection, and the current learner. Use its dark state for hover and press feedback and its soft state for quiet emphasis.

### Secondary

- **Measured Moss:** The progress and steadiness color for positive pace, active progress bars, toggles, and supportive identity marks. It should reassure rather than celebrate loudly.

### Tertiary

- **Open Sky:** A secondary social voice used to distinguish people, goals, or gentle hover states without implying rank or urgency.

### Neutral

- **Warm Paper:** The application canvas. Its ivory warmth keeps long focus sessions softer than stark white.
- **Quiet Surface:** The near-white field for cards, forms, and contained controls.
- **Study Ink:** The primary text, strong border, and structural mark color.
- **Muted Notation:** Secondary copy, metadata, timestamps, inactive navigation, and supporting labels.
- **Measure Line:** Dividers, field borders, inactive tracks, and structural rules.

### Named Rules

**The One Strong Voice Rule.** Coral is reserved for the primary action, active state, focus state, or current learner; do not scatter it as decoration.

**The Parallel Voices Rule.** Moss and sky distinguish progress and people, but labels, position, and structure must also communicate meaning so color never carries information alone.

## Typography

**Display Font:** Geist (with `ui-sans-serif`, `system-ui`, and `sans-serif` fallbacks)  
**Body Font:** Geist (with `ui-sans-serif`, `system-ui`, and `sans-serif` fallbacks)

**Character:** Geist gives StudyWithMe a precise, contemporary voice without corporate stiffness. Weight, scale, tabular numerals, and tight headline spacing create expression within a single-family system; the result is clear and gender-neutral rather than decorative.

### Hierarchy

- **Display:** Semibold, tightly tracked, and compact in line height. Reserve it for the dominant focused-time figure on Today; units step down in size and muted color so the value remains scannable.
- **Headline:** Semibold with tight tracking. Use for route headings and the strongest page-level statements.
- **Title:** Semibold with subtly tight tracking. Use for section titles and important row headings.
- **Body:** Regular at a compact, readable size with relaxed leading for explanations, notes, and supporting copy. Keep long text measures near 42rem rather than stretching across the container.
- **Label:** Semibold uppercase with wide tracking. Use for measure names such as “Daily target” and “Current streak,” never for paragraphs.
- **Numeric data:** Use tabular numerals for times, percentages, ranks, targets, and streaks so changing values remain visually stable.

### Named Rules

**The Time Leads Rule.** On progress surfaces, the primary time figure owns the strongest typographic scale; surrounding targets and context stay subordinate.

**The Quiet Label Rule.** Uppercase notation is small, muted, and widely tracked. Never enlarge it into a badge or promotional eyebrow.

## Layout

The application uses a mobile-first single-column flow within a centered maximum width of 76rem. Horizontal gutters begin at 1.25rem, increase to 2rem on small screens, and reach 2.5rem on large screens. Major sections use 3rem of vertical separation on mobile and 4rem from small screens upward; page content clears the fixed mobile navigation with generous bottom padding.

Fine one-pixel measure lines establish grouping. Sections frequently begin or end with a rule, while rows repeat at a steady vertical rhythm. Desktop compositions use intentionally unequal columns: the main task or evidence receives roughly 1.4–1.45 shares to the supporting voice’s 0.55–0.6. Secondary content may be separated by a vertical measure line, but it never competes at equal weight with the primary action.

At iPhone widths, dense comparisons recompose into legible three-column rows, secondary details move onto their own line, and desktop vertical rules become horizontal divisions. At the medium breakpoint, navigation changes from a fixed five-item bottom bar with safe-area padding to a sticky desktop header. Do not create horizontal carousels or merely shrink desktop tables.

Post-session reflection stays in the same single-column Today flow on mobile. Rating controls wrap without shrinking below a comfortable touch target, photo actions wrap as text actions, previews remain width-bound and cropped, and the primary save action stays visually separate from the quieter “Not now” exit.

Circle is a primary destination alongside Activity. Its selector routes among Circles the learner actually belongs to; when none exist, it becomes a restrained self-only pace view with creation nearby. A Circle detail leads with private pace, then separates members from membership or owner controls in an intentionally unequal desktop split. Invitation acceptance is a narrow, centered flow that presents the Circle and its privacy terms before the join action.

**The Measure, Then Space Rule.** Use lines to articulate meaningful boundaries and whitespace to establish hierarchy; do not wrap every group in a container.

## Elevation & Depth

StudyWithMe is flat by default and uses no box-shadow vocabulary. Depth comes from tonal contrast between Warm Paper and Quiet Surface, fine measure lines, sticky or fixed positioning, and restrained translucent navigation backdrops with a small blur. Cards do not float; interactive emphasis comes from color and movement, not shadow.

**The Flat Score Rule.** Surfaces remain on the page like notation on paper. Do not add drop shadows, floating tiles, glass panels, or depth effects to make ordinary content feel important.

## Shapes

The form language is mostly rectilinear, softened only where touch and control affordances benefit. Fields and standard buttons use gently restrained corners; optional cards use a slightly larger but still modest radius. The signature Start Study Session control is broad and square-cornered, reinforcing its role as a decisive measure across the page. Circles are reserved for avatars, status dots, toggle tracks and thumbs, and the small identity mark.

Borders are one-pixel Measure Line rules. Progress tracks may use pill ends because they encode duration, but panels and sections should not default to pill or capsule silhouettes.

**The Earned Curve Rule.** A curve must communicate a control, person, status point, or continuous measure. Structural content stays square or only gently rounded.

## Components

Components feel restrained and precise at rest, then respond clearly through color or a small directional movement.

### Buttons

- **Shape:** Standard buttons use gently curved corners and a minimum 3rem touch height. The full-width focus launcher is square-cornered and at least 5rem high on mobile, growing to 6rem on larger screens.
- **Primary:** Accessible Coral with Quiet Surface text, semibold labeling, and balanced horizontal padding. Use one dominant primary action per task region.
- **Hover / Focus:** Darken coral over 200ms. A press may move down by one pixel. All keyboard-focusable elements use a two-pixel coral outline with a three-pixel offset.
- **Secondary:** Use an ink border on the paper or surface field; invert to ink with light text on hover.
- **Text action:** Use coral semibold text with a subtle underline that strengthens on hover. Do not turn tertiary links into filled pills.
- **Disabled:** Measure Line background with Muted Notation text and a not-allowed cursor.

### Cards / Containers

- **Corner Style:** Gently rounded only when a true self-contained card is useful; most content instead uses open rows and measure lines.
- **Background:** Quiet Surface against Warm Paper.
- **Shadow Strategy:** None; use tonal contrast and borders.
- **Border:** Omit on standalone cards unless the boundary is necessary. Forms and row groups use Measure Line rules.
- **Internal Padding:** Typically 1.25rem on mobile and 1.5rem from small screens upward.

### Inputs / Fields

- **Style:** Quiet Surface fill, one-pixel Measure Line border, gently curved corners, a minimum 3rem height, and Study Ink text. Labels sit above fields in small semibold type.
- **Hover / Focus:** Hover shifts the border toward Muted Notation. Focus uses a coral border plus a soft two-pixel coral-tinted ring; the global focus outline remains the accessibility fallback.
- **Placeholder / Disabled:** Placeholder text uses a softened Muted Notation. Disabled controls must remain legible and clearly non-interactive.

### Navigation

- **Desktop:** A sticky 4rem header on Warm Paper with slight translucency and backdrop blur. The plain StudyWithMe wordmark anchors the left; active links use Study Ink plus one coral point, while inactive links remain quiet.
- **Mobile:** A fixed five-column, text-only bottom navigation with at least 4rem-high destinations and safe-area padding. The active destination is semibold and marked by one small coral point; avoid generic tab-bar icon sets.
- **Identity:** Use the single-word StudyWithMe wordmark with a coral full stop. Do not pair it with a generic abstract app mark.

### Tabs, Rows, and Progress Measures

- **Tabs:** Text tabs share a bottom rule. Selection is shown by ink text and a short coral underline, with full ARIA tab semantics.
- **Rows:** History, rankings, goals, and social presence are expressed as flat bordered rows. Use compact status dots and aligned tabular values; provide text for every meaningful status or relative pace.
- **Analytics:** History and Leaderboard share one six-option timeframe rail. Rankings and charts always use the same range. Goal totals use restrained horizontal coral, moss, and sky measures; daily totals use a thin moss SVG line with sparse date labels and an expandable textual value table. Charts remain open sections rather than nested dashboard cards.
- **App icon:** The icon uses the ivory field with moss and coral sleeves framing two held hands. The central gesture carries togetherness at small sizes without faces, text, or study-tool clutter.
- **Progress measures:** Render progress as thin score-like lines with small pill-ended fills. Keep charts quiet and legible; axes, labels, or adjacent values must make the information understandable without hue alone.
- **Today pace preview:** Keep the weekly mini-leaderboard to three learners, using compact rank, avatar, identity, and duration columns. Highlight the current learner with the soft coral row treatment; if they fall outside the preview, state their position in quiet text instead of expanding the list. Empty and unavailable states remain flat between measure lines.

### Toggles and Disclosure

- **Toggles:** Use a Measure Line track when off and Measured Moss when on, with a Quiet Surface thumb. Preserve a comfortable labeled touch target and expose the pressed state semantically.
- **Disclosure:** Expand setup content immediately beneath its trigger by transitioning the grid row over 200ms. The launcher arrow may translate on hover and rotate when open. Under reduced motion, these state changes occur without meaningful animation.

### Circles

- **Placement:** Present “Your Circles” as a flat score-line list with Circle name, role, learner count, and a restrained text action; do not promote Circles into cards.
- **Circle detail:** Lead with the private leaderboard and period tabs before members and management. Highlight the current learner with the existing soft coral row treatment, preserve tabular ranks and duration, and show names, usernames, roles, and aggregate totals as clearly aligned text.
- **Privacy framing:** Describe Circles as small spaces for people the learner knows. State that membership and rankings are private, invite links are owner-only, and raw sessions and goal lists remain private. Notes appear in Activity only after explicit sharing. Invitation screens repeat the relevant boundary before asking someone to join.
- **Owner controls:** Keep invite, rename, member removal, and deletion in a quiet secondary column after group pace and membership. The invite value uses a read-only field with a text-style Copy action; regeneration remains a lower-emphasis link action.
- **Destructive confirmation:** Reveal leave and delete confirmation inline where the action began. Name the consequence and what data remains untouched, then pair the destructive submit with a plain Cancel action. Do not use a modal for these compact, contextual decisions.
- **Pending and error states:** Disable the active control and replace its label with a specific present-participle state such as “Creating…,” “Joining…,” or “Deleting…”. Render action failures as nearby alerts in dark coral; route-level failures use a flat bordered message and a clear route back.
- **Copy feedback:** Announce successful copy through a polite live region without adding visible celebration. If copying fails, show a concise visible message that tells the learner to select and copy the read-only link manually.

**The Private Pace First Rule.** A Circle page answers “How are we pacing?” before exposing membership management; administration never becomes the hero of the surface.

### Activity

- **Structure:** Activity is a chronological score of completed sessions, rendered as open rows separated by measure lines rather than a stack of social cards.
- **Hierarchy:** Identity leads, followed by subject and duration; time and rating remain compact metadata. A shared reflection is the final, quieter voice.
- **Scope:** A native select switches among My Activity, Everyone, and the learner’s Circles. Circle options are membership-derived and never fabricated.
- **Privacy:** Every completed valid session may contribute a feed-safe entry, but reflection text and its photo appear only after an explicit, default-off sharing choice. Reflection photos remain in private storage and are delivered only through an authorized Activity route; previews and feed images use restrained rounded cropping without turning the row into an image card. Activity never implies access to raw sessions or goal lists.
- **Love:** One compact heart action sits below shared reflection content with a plain count, a pressed state, and an accessible label. The action uses the normal touch-target floor and reports failure next to itself; the learner’s own session shows the count without an interactive control.
- **Restraint:** Love is the single permitted social response. Do not add comments, reaction pickers, follower mechanics, messaging, popularity sorting, celebratory animation, or oversized feed cards.

### Session Reflection and Media

- **Sequence:** Save positive session duration before presenting reflection. Clearly reassure the learner that their study time is already safe, then offer rating, reflection text, one optional photo, the Activity-sharing choice, and one “Save and finish” action.
- **Rating:** Use five numbered circular controls with explicit pressed states and a quiet Clear action. Rating is optional and must remain understandable without color.
- **Photo:** Present Add, Change, and Remove as restrained text actions beside a bounded preview. Accept common phone formats, prepare images before upload, and keep loading, failure, and retry feedback adjacent to the media controls.
- **Sharing:** Keep “Share reflection with Activity” off by default and state plainly that both text and photo stay private unless enabled. Removing or replacing media must not jeopardize the already-saved study duration.
- **Avatar:** Reuse the circular avatar primitive for Today pace, Activity, Leaderboard, Circles, and Profile. Crop photos consistently, preserve initials as the resilient fallback, and keep upload or removal exclusive to Profile with nearby pending and error feedback.

**The Saved Time First Rule.** Reflection enriches a completed session; it never gates, delays, or risks the study time already recorded.

## Do's and Don'ts

### Do:

- **Do** make beginning focused work the clearest, broadest action on Today.
- **Do** use score-like lines, open rows, unequal columns, and whitespace to compose hierarchy.
- **Do** keep coral rare and decisive; use moss and sky as quieter parallel voices.
- **Do** use tabular numerals and text labels for progress, time, ranking, and pace.
- **Do** recompose dense content for iPhone and preserve the labeled five-item bottom navigation.
- **Do** keep motion short, directional, and state-driven, and fully respect reduced-motion preferences.
- **Do** preserve visible keyboard focus, sufficient contrast, semantic controls, and comfortable touch targets.
- **Do** lead Circle detail with aggregate pace before controls.
- **Do** place pending, error, empty, unavailable, and copy feedback next to the action or content it explains, with appropriate alert or live-region semantics.
- **Do** confirm leave and delete actions inline and state both the consequence and the study data that remains intact.

### Don't:

- **Don't** create an equal-card dashboard or wrap every metric in a rounded tile.
- **Don't** use generic purple or blue gradients, glassmorphism, drop shadows, or synthetic SaaS polish.
- **Don't** add excessive rounded containers, pill-shaped controls, decorative icons, badge clutter, or childlike gamification.
- **Don't** turn social context into a feed, popularity mechanic, reaction stream, or public performance.
- **Don't** make competition aggressive through podium theatrics, metallic rank colors, oversized placement, or winner/loser language.
- **Don't** rely on color alone to explain identity, progress, selection, or relative pace.
- **Don't** animate for spectacle; avoid looping motion, celebratory bursts, and transitions that delay study actions.
- **Don't** shrink desktop tables into cramped mobile layouts or replace them with carousels.
- **Don't** turn Circles into a public directory, discovery feed, or separate card dashboard.
- **Don't** expose invite links as decorative share objects or imply that Circle membership grants access to raw sessions, goal lists, or private notes.
- **Don't** hide destructive consequences in vague labels, trigger destructive actions immediately, or rely on a toast as the only confirmation or error feedback.
