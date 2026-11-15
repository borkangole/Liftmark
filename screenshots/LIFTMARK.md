# Liftmark — Your progress partner

A free, offline workout tracker for iOS and Android that tells you which lifts are moving, which have stalled, and exactly what to lift next. No subscription, no account, no ads.

---

## Portfolio description

**Short (one line)**
A free, offline gym tracker for iOS and Android that spots plateaus and tells you what to lift next.

**Medium (project card)**
Liftmark is a cross-platform workout tracker built with Expo and React Native. It sets you up with a training split matched to your body, experience and goal. Then, as you log, it reads every set to detect progress, plateaus and regressions, and suggests your next session's weight and reps. Everything stays on the phone in a local SQLite database: no subscription, no account.

**Long (case study intro)**
Most gym trackers lock their useful features behind a monthly subscription. I built Liftmark so lifters get the smart parts for free. A one-minute onboarding asks for age, height, weight, experience and goal, then calculates BMI, picks a split (Full Body, Upper/Lower, Push/Pull/Legs or a body-part split), tunes rep ranges and rest times, and estimates starting weights from bodyweight.

During a workout, every set is prefilled from your last session or from the app's suggestion. Personal records are flagged as they happen, and a rest timer starts automatically. Over time, a progression engine (Epley estimated 1RM, trend analysis and plateau detection) labels each lift as progressing, stalling or regressing and recommends what to do next, including deloads.

Every exercise has an original animated form demo and an anatomical muscle map that highlights the muscles being trained. The app runs fully offline, supports light and dark mode and kg or lb, exports your history to CSV, and ships from a single TypeScript codebase to both iOS and Android.

---

## Store listing copy

### Apple App Store
- **Name (30 max):** Liftmark: Workout Tracker
- **Subtitle (30 max):** Free gym log & progress coach
- **Promotional text (170 max):** Log sets fast, catch plateaus early, and always know what to lift next. Free forever. No subscription, no account, and your data never leaves your phone.
- **Keywords (100 max):** gym,workout,log,lifting,strength,progressive overload,1rm,split,ppl,plateau,tracker,fitness

### Google Play
- **Title (30 max):** Liftmark: Workout Tracker
- **Short description (80 max):** Free gym log that spots plateaus and tells you what to lift next.

**Full description (both stores)**

Liftmark is a free workout tracker that does more than record numbers. It reads your training and tells you what to do next.

SMART FROM DAY ONE
• Quick setup: age, height, weight, experience and goal
• Automatic BMI with honest context
• A training split picked for you: Full Body, Upper/Lower, Push/Pull/Legs and more
• Starting weights estimated from your bodyweight and experience

FAST LOGGING
• Every set prefilled from last time or from your next-session target
• Live personal-record alerts while you train
• Automatic rest timer with +30s and skip
• Warm-up sets tracked separately

KNOW IF YOU'RE PROGRESSING
• Each lift labelled Progressing, Stalling or Regressing
• Next-session suggestions, including when to deload
• Estimated 1RM trend charts, weekly volume and a consistency heatmap
• Training streaks and PR history

LEARN EVERY LIFT
• Animated form demos for all 29 exercises
• Muscle maps that highlight the muscles each exercise and workout trains

YOURS, PRIVATELY
• Works fully offline. No account, no ads, no subscription
• Your data stays on your phone
• Export your full history to CSV
• Light and dark mode, kg or lb

---

## Features

**Onboarding & personalisation**
- 8-step onboarding: age, sex (optional), height (cm or ft/in), weight (kg or lb), experience, goal, days per week
- Automatic BMI with a colour-coded gauge and plain-language caveats
- Recommends a split (Full Body, Upper/Lower, Push/Pull/Legs, Bro split) and sets rep ranges and rest times by goal
- Starting-weight estimates from bodyweight, experience and sex
- Profile editable later from Settings

**Workout logging**
- Routine templates with preset splits; the app rotates through split days ("Up next")
- Quick workouts without a routine
- Smart prefill from the current workout, the next-session suggestion, last session or your profile
- Live PR detection with an animated toast; only the first set that beats your best counts
- Auto-starting rest timer, warm-up sets, long-press to delete, haptic feedback

**Progress & coaching**
- Estimated 1RM per set (Epley formula)
- Trend analysis per lift: progressing, stalling (no new best in N sessions) or regressing (falling 1RM)
- Next-session suggestion: add weight, add reps, hold, or deload
- Progress dashboard: weekly volume, streak, PR count, consistency heatmap, 4W / 12W / 6M / All ranges
- Per-exercise detail: 1RM chart, form demo, muscle map and next target

**Exercise library**
- 29 preset exercises, each with an original animated stick-figure form demo
- Detailed front and back anatomical muscle maps showing primary and secondary muscles

**History**
- Workouts grouped by month with totals
- Each card lists every exercise with its sets and top set, plus PR badges
- Workout detail: edit or delete sets, rename or delete workouts

**Settings & data**
- kg or lb, default rest time, light / dark / system theme
- CSV export through the system share sheet
- Reset all data; fully offline, with no account or network calls

---

## Tools & tech stack

| Area | Tools |
|---|---|
| Language | TypeScript |
| Framework | React Native 0.88, React 19, Expo SDK 58 |
| Navigation | Expo Router (file-based, typed routes) |
| Database | SQLite (expo-sqlite) + Drizzle ORM, with versioned migrations (drizzle-kit) |
| State | Zustand, persisted with expo-sqlite key-value storage |
| Graphics | react-native-svg (muscle maps, animated form demos) |
| Charts | react-native-gifted-charts, plus custom SVG sparklines and heatmap |
| Animation | React Native Animated API, with reduced-motion support |
| Native features | expo-haptics, expo-file-system + expo-sharing (CSV export), expo-linear-gradient, expo-splash-screen |
| Icons | @expo/vector-icons (Ionicons) |
| Testing | Vitest (193 unit tests covering progression, PR detection, history, CSV and BMI) |
| Platforms | iOS and Android from one codebase; Expo Go for testing, EAS Build for store builds |

**Engineering highlights**
- Pure, framework-free logic modules (progression engine, PR detection, plan recommendation), each unit-tested
- Custom live-query hook that re-renders when *any* joined table changes (Drizzle's built-in one only watches one table)
- Hand-built SVG muscle anatomy and frame-by-frame exercise kinematics, no licensed assets
- Accessible: screen-reader labels, reduced-motion support, light and dark themes

---

## What's in this folder

| Path | Use |
|---|---|
| `liftmark-showcase.png` | Portfolio hero: all 7 screens in iPhone frames (4600×1560) |
| `ios/01–07` | App Store screenshots, 1179×2556 (6.1"/6.3" iPhone) |
| `android/01–07` | Google Play phone screenshots, 1080×1920 (9:16, no transparency) |
| `play-feature-graphic.png` | Google Play feature graphic, 1024×500 (required by Play) |

**Store notes**
- **iPhone screenshots won't upload to Play.** They are taller than Play's 2:1 limit, which is why there is a separate Android set.
- **Apple screenshot sizes.** Apple's current main requirement is the 6.9" size (1320×2868), and it scales that set down for smaller iPhones. Before submitting, re-capture or upscale to that size.
- **Privacy disclosures.** Both stores need a privacy policy URL and a privacy questionnaire: Play's "Data safety" form and Apple's "App Privacy" section. Since Liftmark collects nothing off-device, you can answer "no data collected" on both.
