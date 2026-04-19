# Pole Training App

A personal iOS pole dancing training tracker. Log tricks, track progress per side, attach videos, and see what to practice next.
I am building this for learning and for fun, contributions and ideas are welcome.

## Features

- **Trick Library** — browse and search 30+ seeded pole tricks, filter by tags, difficulty, and pole type. Add custom tricks.
- **Progress Tracking** — set status (learning / polishing / got it) and notes per side (left/right) for each trick.
- **Session Logging** — log training sessions with the tricks you practiced and which side.
- **Video Notes** — attach videos from your photo library to tricks or sessions.
- **Community Submissions** — suggest new tricks; admin reviews and approves them into the shared library.
- **Profile** — optional sign-in to link submissions to your account. App works fully offline without an account.

## Tech Stack

| | |
|---|---|
| Framework | React Native + Expo (SDK 52, managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router |
| Local storage | SQLite via `expo-sqlite` |
| State | Zustand |
| Auth + cloud | Supabase (optional) |
| Media | `expo-av` + `expo-image-picker` |

## Getting Started

### Prerequisites

- Node 20 (via nvm: `nvm use 20`)
- Ruby 3+ with CocoaPods (via rbenv)
- Xcode 15 with iOS 17 simulator runtime

### Install

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root (already in `.gitignore`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Without these the app works fully locally — sign-in and community submissions are disabled.
See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to set up a new Supabase project.

### Run tests

```bash
npm test
```

---

## Running on a device

### Option 1 — Expo Go (quickest, no build needed)

Best for development and testing. No Apple Developer account required.

1. Install **Expo Go** on your iPhone from the App Store.
2. Make sure your phone and Mac are on the same Wi-Fi network.
3. Start the dev server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with your iPhone camera (or the Expo Go app on Android).

> Supabase features work in Expo Go as long as your `.env` file is present when you start the server.

---

### Option 2 — Direct install via USB (free, no App Store)

Installs a real build directly onto your phone. No Apple Developer account required, but the certificate expires every **7 days** with a free Apple ID (re-run the command to renew). A paid Apple Developer account ($99/yr) extends this to 1 year.

1. Connect your iPhone via USB and trust the computer on your phone.
2. Open Xcode once and sign in with your Apple ID under **Settings → Accounts**.
3. Build and install:
   ```bash
   npx expo run:ios --device
   ```
4. On first launch, go to **Settings → General → VPN & Device Management** on your phone and trust your developer certificate.

To rebuild after code changes:
```bash
npx expo run:ios --device
```

---

### Option 3 — TestFlight (most app-like, stays installed permanently)

Requires an **Apple Developer Program** membership ($99/yr) and [EAS CLI](https://docs.expo.dev/eas/).

```bash
npm install -g eas-cli
eas login
eas build:configure   # first time only
```

**Build and submit to TestFlight:**
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Then open **TestFlight** on your iPhone and install the build. Updates can be pushed at any time by running the same commands — testers get notified automatically.

---

## Project Structure

```
app/
  _layout.tsx          # Root layout — DB init + splash screen
  (tabs)/
    library.tsx        # Trick library
    sessions.tsx       # Session list
    profile.tsx        # Auth state, stats, sign-in
  trick/[id].tsx       # Trick detail
  session/[id].tsx     # Session detail
  submissions.tsx      # My Submissions / Admin review
  suggest-trick.tsx    # Submit a new trick or edit suggestion
  settings.tsx         # Account settings

src/
  types/               # TypeScript interfaces
  constants/           # Colors, predefined tags
  db/                  # SQLite schema, migrations, seed data
  stores/              # Zustand stores (tricks, sessions, videos, auth)
  components/          # Shared UI components
  lib/                 # Supabase client, flush queue, submission helpers

supabase/
  schema.sql           # Supabase table + RLS policy definitions
```

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE). Free to use, forks must be open source and credit the original author.

## Roadmap

- **V1** — Tricks database and training session planner
- **V2** — Community trick library with admin approval (done)
- **V3** — Spaced repetition (SM-2), combo builder, gamification
- **V4** — Choreography planner, social features
