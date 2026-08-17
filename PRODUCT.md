# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who study independently or alongside a trusted circle and want to turn focused time into visible personal progress. The initial product is mobile-first for iPhone while remaining polished and fully usable on Mac and desktop browsers. Whether the first launch should target a narrower segment such as exam-prep students remains an open product decision.

## Product Purpose

StudyWithMe is a social study and time-tracking application. It helps people begin focused work, understand daily and weekly progress, sustain personal consistency, and feel quietly accountable to other learners. Success means beginning a session feels easy, completed effort feels meaningful, and social comparison motivates without creating pressure.

## Positioning

StudyWithMe combines the immediacy and shared momentum of an activity product with the restraint of a focused study environment. Social presence should feel like studying alongside others, not posting into a social-media feed; competition should provide pace and encouragement, not status or aggression.

## Operating Context

The primary workflow begins on Today: choose or confirm a study goal, start a session, stay focused, and see the completed effort reflected in personal and social progress. Supporting workflows include reviewing recent sessions, comparing study time over Today/Week/Month, managing goals and targets, and recording previous sessions. The product should work comfortably in short mobile interactions and in longer desktop study sessions.

## Capabilities and Constraints

- Current routes are Today, History, Leaderboard, and Profile.
- Current capabilities include email/password accounts, verified SSR sessions, protected application routes, and real profile identity. Future capabilities include study goals, standard and Pomodoro timers, session notes and ratings, totals, streaks, groups, leaderboards, PWA installation, and notifications.
- The frontend currently uses realistic mocked data and UI state where useful.
- Supabase clients, migrations, schema, Row Level Security, and MVP authentication are established; live study queries, real session persistence, timer behavior, push notifications, and native iOS code remain out of scope for this phase.
- The existing Next.js, React, TypeScript, and Tailwind stack must be preserved without unnecessary UI libraries.
- Future backend work must treat authorization, data integrity, Row Level Security, migrations, privacy, and secrets as first-class constraints.

## Brand Commitments

- Product name: StudyWithMe.
- Voice: focused, calm, polished, motivating, modern, slightly playful, and premium without becoming corporate.
- Social interaction must not feel like conventional social media.
- Competition must not feel aggressive, and progress must not resemble a children’s game.
- Avoid generic SaaS-dashboard styling, generic purple/blue gradients, excessive rounded containers, decorative icons, badge clutter, weak hierarchy, and synthetic “AI-generated app” polish.
- Preserve a mobile-first approach with an intuitive bottom navigation pattern on iPhone.

## Evidence on Hand

The repository contains an operational frontend scaffold, responsive navigation, four routes, reusable layout and UI primitives, realistic placeholder copy, and an incumbent muted canvas/sage/lilac visual foundation. It contains no validated user research, production usage data, real community activity, testimonials, or brand imagery; future work must not fabricate those as product evidence.

## Product Principles

1. Make beginning focused work the clearest and easiest action.
2. Turn completed time into calm, legible evidence of progress.
3. Create social accountability through co-presence and encouragement, not attention mechanics.
4. Use competition to answer “How am I pacing?” rather than “What is my status?”
5. Keep historical detail available without letting it compete with the present study moment.

## Accessibility & Inclusion

Maintain labeled navigation, keyboard-visible focus, semantic controls, sufficient contrast, reduced-motion support, comfortable touch targets, and layouts that work at iPhone and desktop widths. Progress and ranking information must remain understandable without relying on color alone.
