# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Run on iOS simulator
npx expo run:ios

# Run on physical device
npx expo run:ios --device

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a single test file
npx jest __tests__/submissions.test.ts
```

> Requires Node 20 (`nvm use 20`), Ruby 3+ with CocoaPods, and Xcode 15 with iOS 17 simulator runtime.

## Architecture

**Expo Router** drives all navigation. `app/_layout.tsx` is the root — it initializes the SQLite DB and manages the splash screen. Tabs live under `app/(tabs)/`. Dynamic routes use bracket syntax (`app/trick/[id].tsx`, `app/session/[id].tsx`).

**Two storage layers run in parallel:**
- **SQLite** (`expo-sqlite`, via `src/db/`) — local-first storage for all user data: tricks, sessions, videos, per-side progress, and the offline submission queue (`pending_submissions`).
- **Supabase** (`src/lib/supabase.ts`) — optional remote backend, gated by `isSupabaseConfigured`. Handles auth and the crowd-sourced trick submission workflow. Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.

**State management** uses Zustand stores in `src/stores/`:
- `tricksStore` — trick library + user progress (SQLite-backed)
- `sessionsStore` — training sessions (SQLite-backed)
- `videosStore` — video attachments (SQLite-backed)
- `authStore` — Supabase session, subscribes to `onAuthStateChange`; avoids re-renders on token refresh by comparing user IDs

**Crowd-source submission flow** (`feature/supabase-auth-crowdsource` branch): users suggest tricks via `app/suggest-trick.tsx`. Submissions are written locally to `pending_submissions` (SQLite) and synced to Supabase when online. Admins approve/reject from `app/(tabs)/submissions.tsx`. Admin status is determined by `is_admin` in the Supabase JWT app_metadata — see `src/lib/submissionsHelpers.ts:getIsAdmin`.

**DB lifecycle**: `src/db/index.ts` exports a singleton `getDb()`. Schema is in `src/db/schema.ts`, migrations in `src/db/migrations.ts`, seed data (30+ tricks) in `src/db/seed.ts`. The Supabase schema mirrors this in `supabase/schema.sql`.

## Testing

Tests live in `__tests__/` and run in a Node environment (no React Native runtime). `expo-sqlite` and `expo-crypto` are mocked in `__mocks__/` and use `better-sqlite3` as the in-memory SQLite implementation. TypeScript strict mode is disabled for tests (`ts-jest` config in `package.json`). Do not use React Native–specific APIs in test files.

## Environment

Copy `.env.example` to `.env` and fill in Supabase credentials. Without them, `isSupabaseConfigured` is `false` and all Supabase features are silently disabled — the app works fully offline.

## Engineering Standards

These apply to all code suggestions, new features, and refactors.

**Secrets & environment separation**
- Never hardcode secrets or API keys. Use `.env` (gitignored). See `.env.example` for required vars.
- Dev and prod Supabase projects should use separate API tokens — not the same key copy-pasted.

**Observability**
- Add crash reporting and error logging from day one, not after the first bug report.
- Errors surfaced to users must also be logged with enough context to diagnose remotely.

**External service wrappers**
- All third-party API calls go through a dedicated service layer (`src/lib/` or `src/services/`), not inlined into components or stores.
- Auth and write operations must have rate limiting — add it upfront, not as an afterthought.

**Input validation**
- Validate all external input server-side (Supabase RLS, Edge Functions). Never trust client-sent data.
- AI-generated code focuses on the happy path — explicitly handle malformed input, missing fields, and unexpected API responses.

**Architecture discipline**
- Break logic out of large view files early. No single component should own data fetching, business logic, and rendering.
- Database schema changes must go through versioned migrations (`src/db/migrations.ts`). Never mutate schema in place.

**Error & edge case coverage**
- Test unhappy paths: network failure, empty state, unexpected API shape, auth expiry.
- If you add a backup or restore mechanism, include a test restore before it's ever needed in production.

**Time handling**
- Store all timestamps in UTC. Convert to local time only at the display layer.

**Technical debt**
- If something is intentionally left hacky, add a `// TODO:` comment with a reason. "I'll fix it later" without a note is a bug waiting to happen.
- Feature flags are not comments. If a code path is toggled by commenting it out, that's not a feature flag system.

**Simplicity over completeness**
- Complexity kills projects silently — it compounds. Every abstraction added today makes the next refactor harder, the test suite larger, and the bug surface wider.
- When architecting a solution, default to the simplest thing that works. You don't need a queue for non-critical messages or object storage for avatars if a simpler path exists.
- There is a difference between *supporting* an edge case and *handling* it. You don't need to support every edge case — just handle failure gracefully and move on. Don't add complexity to cover scenarios that rarely happen.
- Before finalizing any architectural decision, review it through this lens: *is this the minimum structure needed to complete the mission safely?* If not, simplify.

**The mental model**
Claude Code is a fast, capable collaborator — but architecture decisions, security choices, and long-term maintainability judgments belong to the engineer. Push back on suggestions that cut corners on security or correctness. Equally, push back on suggestions that introduce unnecessary complexity. A fighter jet carries just enough to complete the mission and come home — not passenger-jet amenities. Build accordingly.
