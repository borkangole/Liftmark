# Liftmark

**Your progress partner.** A free, offline-first workout tracker that tells you whether you're actually getting stronger, and what to do next session.

Most gym trackers put progress insights behind a subscription. Liftmark keeps everything on your phone, free, and adds a rule-based coaching layer.

## Features

- **Plateau detection.** Each lift is classified as *progressing*, *stalling* or *regressing* from the trend in your estimated 1RM, with a plain-language reason ("No new best in 4 sessions").
- **Next-session suggestions.** Double progression: hit the top of your rep range on every set and Liftmark suggests adding weight; otherwise it targets one more rep. Long plateaus or a downward trend trigger a deload.
- **Workout logging** with smart prefill, warm-up sets, PR detection on every set, an auto rest timer and a finish summary.
- **Routine templates.** Full Body, Upper/Lower, Push/Pull/Legs and Bro Split presets, fully editable, with an "Up next" day that rotates automatically.
- **Progress dashboard.** Lift status, weekly volume, a consistency heatmap, streaks and a PR feed.
- **History.** Monthly feed of workouts with per-set editing, PRs at the time, and "repeat this workout".
- **Form demos and muscle maps.** Original animated demos for all 29 library exercises and a front/back muscle map that lights up primary and secondary muscles, drawn in code with react-native-svg.

## Tech stack

| Area | Choice |
| --- | --- |
| App | React Native + Expo (SDK 58), TypeScript |
| Navigation | Expo Router (file-based, `src/app/`) |
| Storage | `expo-sqlite` + Drizzle ORM (local-first, no backend) |
| State | Zustand |
| Charts | react-native-gifted-charts |
| Tests | Vitest (progression engine) |

## Project structure

```
src/
  app/                    # Expo Router screens
    (tabs)/               # Today, Progress, History, Exercises
    workout/[id].tsx      # active workout
    exercise/[id].tsx     # trend, suggestion, e1RM chart
  components/             # UI primitives + shared components
  db/                     # Drizzle schema, client, seed data
  features/               # pure, tested logic with no React or DB imports
    progression/          #   e1RM, PRs, plateau detection, suggestions
    progress/             #   dashboard aggregation (volume, streaks, PR feed)
    history/              #   month grouping, PRs at the time of each set
    routines/             #   preset splits, next-day rotation
    demos/                #   stick-figure kinematics and exercise demo specs
    muscles/              #   body map geometry and exercise → muscle targets
  hooks/                  # data hooks combining DB + engine
  stores/                 # Zustand stores
  theme/                  # design tokens (matches the logo palette)
drizzle/                  # generated SQL migrations
```

The progression engine in `src/features/progression` has no React or database imports, so it is unit-tested in isolation.

## Getting started

```bash
npm install
npm start          # scan the QR code with Expo Go on your phone
```

Other scripts:

```bash
npm test           # run progression engine tests
npm run typecheck  # tsc --noEmit
npm run db:generate  # create a migration after editing src/db/schema.ts
```

Always add Expo packages with `npx expo install <pkg>` so versions match the SDK.

## Roadmap

- [x] Project setup, schema, migrations, seed exercise library
- [x] Progression engine: e1RM, PRs, plateau detection, suggestions
- [x] Workout logging with rest timer and PR celebrations
- [x] Progress dashboard
- [x] Routine templates with preset splits
- [x] Form demos and muscle maps for every exercise
- [x] History with set editing
- [ ] Settings: kg/lb, rest time, reset data, CSV export
- [ ] Custom exercises
- [ ] Share with testers via EAS Update; later TestFlight

## License

MIT
