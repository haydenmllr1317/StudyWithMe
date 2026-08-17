# Repository conventions

These conventions apply to all future work in this repository.

## Engineering

- Use TypeScript for application code and keep strict type checking enabled.
- Prefer small, focused, reusable components over large page components.
- Keep shared UI primitives in `src/components/ui`, layout components in `src/components/layout`, and feature-specific code in clearly named feature folders as the product grows.
- Avoid unnecessary dependencies. Prefer platform, React, Next.js, and Tailwind capabilities when they are sufficient.
- Use the `@/*` import alias for modules under `src`.
- Keep placeholder UI separate from future domain and persistence logic.

## Product and interface

- Preserve mobile-first responsiveness and verify changes at iPhone and desktop widths.
- Maintain accessible labels, visible keyboard focus, sufficient contrast, and comfortable touch targets.
- Reuse the design tokens and primitives defined in `tailwind.config.ts` and `src/components/ui` before adding one-off styles.
- Keep the visual language calm, clear, and motivating.

## Quality and safety

- After changes, run `npm run lint`, `npm run typecheck`, and, when appropriate, `npm run build`.
- Do not introduce backend or database logic without considering authorization, data integrity, row-level security, migrations, and safe handling of user data.
- Never expose Supabase service-role keys or other secrets to the browser or commit them to the repository.
- Add dependencies, environment variables, and architectural decisions to the README when they become part of the project.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
