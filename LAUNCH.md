# Launching Liftmark

Everything in the repo is ready: `eas.json` has the build profiles, `app.json` has updates,
permissions and export compliance set, and the privacy policy lives in the app and in `docs/`.
What's left are the steps that need **your** accounts. Run them in order from the project folder.

## 1. Link the project to Expo (once, ~5 min)

Free Expo account: https://expo.dev/signup

```bash
npx eas-cli@latest login
npx eas-cli@latest init             # creates the project, adds extra.eas.projectId + owner to app.json
npx eas-cli@latest update:configure # adds updates.url, turns on over-the-air updates
```

Commit the app.json changes these make.

## 2. Publish the privacy policy (once, ~3 min)

Both stores require a public URL. The page is already built at `docs/privacy.html`.

1. Push the repo to GitHub (`docs/` included).
2. GitHub repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `/docs` → Save.
3. After a minute it's live at
   https://borkangole.github.io/Repster---Your-progress-partner/privacy.html

If you change the policy, edit `src/features/legal/privacy.ts`, then run `npm run privacy`
to regenerate the HTML so the app and the web page stay identical.

## 3. Share with friends now (free, no store)

**Android: an installable APK.**

```bash
npm run build:apk
```

EAS builds in the cloud (~15 min) and gives you a link and QR code. Friends open it on their
phone, download, allow "install unknown apps" once, done. Every phone gets its own private database.

**iPhone: Expo Go (no Apple developer account).**

1. expo.dev → create an **organization**, move the project into it, invite friends as members
   (they need free Expo accounts).
2. `npm run update:preview` publishes the current code.
3. Friends install **Expo Go**, sign in, and open Liftmark from the project list.

## 4. Ship fixes without rebuilding

JavaScript-only changes (screens, logic, styles) go out over the air:

```bash
npm run update:preview      # friends' APKs / Expo Go
npm run update:production   # store builds
```

Users get it on the next app launch. **If you add a library with native code, bump `version`
in app.json and make a new build**: updates only reach builds with the same version
(`runtimeVersion` policy is `appVersion`).

## 5. Google Play (US$25 once)

1. Create a developer account: https://play.google.com/console/signup
   *Personal accounts created after Nov 13, 2023 must run a **closed test with at least 12
   testers for 14 continuous days** before production. Line up your friends early.*
2. Create the app: name **Liftmark**, free, category **Health & Fitness**.
3. `npm run build:android` → downloads an `.aab`. Upload the first one by hand in
   **Testing → Closed testing**. (Later builds can use `npx eas-cli@latest submit -p android`
   with a Google service-account key.)
4. Store listing: description in `screenshots/LIFTMARK.md`, screenshots from
   `screenshots/android/`, feature graphic `screenshots/play-feature-graphic.png`, icon `assets/icon.png`.
5. App content answers:
   - Privacy policy: the URL from step 2
   - Ads: **No**
   - App access: **All functionality available without special access** (no login)
   - Data safety: **No data collected or shared**. The update check sends no personal data.
   - Content rating questionnaire: no violence, no user content, no purchases → Everyone
   - Target audience: 13+ (or 18+)
   - Health apps declaration: fitness / activity tracking, not a medical device
6. After 14 days with 12+ testers, apply for production access, then promote the release.

## 6. App Store (later, US$99/year)

```bash
npm run build:ios                       # EAS handles certificates and profiles
npx eas-cli@latest submit -p ios        # uploads to App Store Connect / TestFlight
```

- App Privacy: **Data Not Collected**
- Export compliance: already answered in app.json (`usesNonExemptEncryption: false`)
- Screenshots: App Store wants 6.9" iPhone shots (1320×2868). The portfolio set in
  `screenshots/ios/` is 1179×2556, so regenerate at the larger size before submitting.
- TestFlight lets up to 10,000 friends install before release.

## Version checklist for every store release

- [ ] `npm run typecheck && npm test`
- [ ] Bump `version` in app.json if native code changed (build numbers auto-increment on EAS)
- [ ] `npm run build:android` / `npm run build:ios`
