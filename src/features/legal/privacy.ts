/**
 * Liftmark's privacy policy, shown in-app (Settings → Privacy policy).
 * Keep docs/privacy.html (the public copy linked from the store listings) in sync.
 */
export const PRIVACY_UPDATED = 'November 15, 2026';

export const PRIVACY_URL = 'https://borkangole.github.io/Repster---Your-progress-partner/privacy.html';

export const PRIVACY_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'The short version',
    body: [
      'Liftmark does not collect, sell or share your personal data. There is no account, no ads, no analytics and no tracking. Everything you enter stays on your phone.',
    ],
  },
  {
    title: 'What is stored on your phone',
    body: [
      'Your profile (age, sex, height, weight, training goal and experience), your workouts, sets, routines, custom exercises, bodyweight weigh-ins, your food log and custom foods, and app settings.',
      'This is saved in a local database on your device. The developer has no server and cannot see, access or recover it.',
    ],
  },
  {
    title: 'Apple Health and Health Connect',
    body: [
      'Only if you connect it, Liftmark reads your steps, sleep and body weight from Apple Health (iPhone) or Health Connect (Android), and writes your finished workouts there. You choose which of these to allow, and can turn any of them off in Liftmark or in Apple Health / Health Connect.',
      'This data is read on your phone and used only for features inside the app: your step count, calorie target, recovery map and weekly weigh-ins. It is never uploaded, sold, shared or used for advertising.',
    ],
  },
  {
    title: 'Notifications',
    body: [
      'Rest timer alerts and reminders are scheduled on your phone. Nothing about them is sent anywhere.',
    ],
  },
  {
    title: 'Internet use',
    body: [
      'The only time Liftmark goes online is to check for app updates through Expo’s update service (EAS Update). That request carries technical details needed to deliver the right update, such as the app version, platform and an anonymous installation ID. It never includes your workouts, profile, bodyweight or food log.',
    ],
  },
  {
    title: 'Exporting your data',
    body: [
      'Export to CSV creates a file only when you tap it, and it goes only where you choose to share it. What happens to it after that is up to you and the app you share it with.',
    ],
  },
  {
    title: 'Deleting your data',
    body: [
      'Use Settings → Reset all data to erase everything, or uninstall the app. Because nothing is kept anywhere else, deletion is immediate and permanent.',
    ],
  },
  {
    title: 'Health information',
    body: [
      'Calorie targets, BMI and training suggestions are general estimates, not medical advice. Talk to a doctor before big changes to your diet or training.',
    ],
  },
  {
    title: 'Children',
    body: ['Liftmark is not directed at children under 13 and does not knowingly collect data from anyone.'],
  },
  {
    title: 'Changes and contact',
    body: [
      'If this policy changes, the new version will be posted here with a new date. Questions? Open an issue on the Liftmark GitHub page.',
    ],
  },
];
