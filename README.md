# Pole Training App

A personal iOS pole dancing training tracker. Log tricks, track progress per side, attach videos, and see what to practice next.
I am building this for learning and for fun, contributions and ideas are welcome.

## Features

- **Trick Library** — browse and search 30+ seeded pole tricks, filter by tags, difficulty, and pole type. Add custom tricks.
- **Progress Tracking** — set status (learning / polishing / got it) and notes per side (left/right) for each trick.
- **Session Logging** — log training sessions with the tricks you practiced and which side.
- **Video Notes** — attach videos from your photo library to tricks or sessions.
- **What to Practice** — home screen shows tricks sorted by how long since you last practiced each side.

## Tech Stack

| | |
|---|---|
| Framework | React Native + Expo (SDK 52, managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router |
| Storage | SQLite via `expo-sqlite` |
| State | Zustand |
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

### Run on iOS simulator

```bash
npx expo run:ios
```

### Run on physical device

```bash
npx expo run:ios --device
```

> The `ios/` folder is git-ignored and regenerated on each `expo run:ios`.

## Project Structure

```
app/
  _layout.tsx          # Root layout — DB init + splash screen
  (tabs)/
    index.tsx          # What to Practice (home)
    library.tsx        # Trick library
    sessions.tsx       # Session list
  trick/[id].tsx       # Trick detail
  session/[id].tsx     # Session detail

src/
  types/               # TypeScript interfaces
  constants/           # Colors, predefined tags
  db/                  # SQLite schema, migrations, seed data
  stores/              # Zustand stores (tricks, sessions, videos)
  components/          # Shared UI components
```

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE). Free to use, forks must be open source and credit the original author.

## Roadmap

- **V2** — Spaced repetition (SM-2), combo builder, gamification
- **V3** — Choreography planner, social features, Supabase backend
