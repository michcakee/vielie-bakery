# Building the mobile apps

Viet Bake Shop ships to phones with **Capacitor 7**: the same Vite build that runs on GitHub Pages is copied into a native Android project (`android/`) and a native iOS project (`ios/`). The game runs fully offline inside the app, with no backend and **no network permissions at all** (Capacitor's default `INTERNET` permission was removed from the manifest; add it back only for a live-reload dev build).

> **Status:** the native projects are generated, configured and committed, but they have **not been compiled** yet. This repository was set up on a Windows machine without a JDK or Android SDK, and iOS builds need a Mac with Xcode. Nothing has been submitted to any store.

| | |
| --- | --- |
| App ID / bundle ID | `com.michcakee.vieliebakery` |
| App name | Viet Bake Shop |
| Version | 3.0.0 (`package.json`, Android `versionName`, iOS `MARKETING_VERSION`) |
| Build number | Android `versionCode` 1, iOS `CURRENT_PROJECT_VERSION` 1 |
| Web assets | `dist/` → `android/app/src/main/assets/public`, `ios/App/App/public` (generated, git-ignored) |
| Config | [`capacitor.config.ts`](../capacitor.config.ts) |
| Plugins | `@capacitor/app` (back button), `@capacitor/status-bar`, `@capacitor/splash-screen` |

## Everyday workflow

After any change to the game:

```bash
npm run mobile:sync
```

This builds the web app and copies it into both native projects. Then open the native IDE:

```bash
npm run mobile:android
```

```bash
npm run mobile:ios
```

## Icons and splash screens

All icons and splashes are drawn from the game's own pixel bánh mì sprite by a dependency-free script:

```bash
npm run icons
```

It writes:

- `public/icons/` and `public/favicon.png`: PWA and browser icons (192, 512, maskable 512, Apple touch 180)
- `resources/icon-1024.png`: store icon (no transparency, as Apple requires)
- `resources/play-feature-1024x500.png`: Google Play feature graphic
- `resources/splash-2732.png`: master splash
- Every Android `mipmap-*` launcher icon (including the adaptive foreground; background colour `#2F5D3A`) and every `drawable*/splash.png`, at the sizes Capacitor generated
- iOS `AppIcon-512@2x.png` and the three `splash-2732x2732*.png`

Re-run it if you change the sprite or palette, then `npm run mobile:sync`.

## Android

**You need:** Android Studio (Koala or newer) with JDK 17+, Android SDK 35 (Capacitor 7 targets API 35, minimum API 23).

1. `npm install`, then `npm run mobile:android`. Android Studio opens the `android/` project and syncs Gradle.
2. **Run** on an emulator or a USB-connected phone to test.
3. **Release build:** *Build → Generate Signed App Bundle / APK → Android App Bundle*. Create an upload keystore the first time and **back it up**. Losing it means you can't update the app. Never commit it.
4. Before each new upload, increase `versionCode` (and `versionName` if it's a new version) in `android/app/build.gradle`.

From a terminal instead of Android Studio (after the SDK is installed):

```bash
cd android && ./gradlew bundleRelease
```

### Back button

The Android back button closes the topmost sheet, modal or sub-screen (the same stack the Escape key and on-screen back buttons use, in `src/ui/backButton.ts`). With nothing left to close, it minimises the app rather than quitting it.

## iOS

**You need:** a Mac with Xcode 16+, CocoaPods (`sudo gem install cocoapods`) or Swift Package Manager, and an Apple Developer account ($99/year) to ship.

1. `npm install`, then `npx cap sync ios`, then `npm run mobile:ios`.
2. In Xcode, select the **App** target → *Signing & Capabilities* → choose your team. Keep the bundle ID `com.michcakee.vieliebakery` (or change it everywhere, including `capacitor.config.ts`).
3. Run on a simulator or device.
4. **Release:** set the scheme to *Any iOS Device*, then *Product → Archive → Distribute App → App Store Connect*.
5. Increase *Build* (`CURRENT_PROJECT_VERSION`) for every upload.

## Offline and saves

- Inside the app, everything (code, fonts, sprites) ships in the bundle: no network needed.
- On the web, a small service worker (`public/sw.js`, registered only in production builds and never inside Capacitor) caches the app shell after the first visit.
- Saves live in the WebView's `localStorage`, in three slots plus an automatic backup, and migrate forward between versions. Uninstalling the app deletes them, so the in-game **save code** is the way to move a bakery between devices.

## Store submission checklist

Placeholders for everything the stores ask for are in [`docs/store/`](store/):

- [ ] Fill in [`STORE_LISTING.md`](store/STORE_LISTING.md) (descriptions, keywords, category)
- [ ] Publish [`PRIVACY_POLICY.md`](store/PRIVACY_POLICY.md) at a public URL (GitHub Pages works) and add a contact email
- [ ] Answer the content rating questionnaires using [`CONTENT_RATING.md`](store/CONTENT_RATING.md)
- [ ] Google Play *Data safety*: no data collected or shared
- [ ] App Store *App Privacy*: Data Not Collected
- [ ] Screenshots: phone (and 7"/10" tablet for Play, 6.7"/6.5"/iPad for Apple), taken from real builds
- [ ] Test on at least one small phone (≈360 dp wide) and one tablet
- [ ] Signed release builds uploaded to an internal test track / TestFlight first
