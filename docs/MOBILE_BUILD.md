# Building the mobile apps

Viet Bake Shop Simulator ships to phones with **Capacitor 7**: the same Vite build that runs on GitHub Pages is copied into a native Android project (`android/`) and a native iOS project (`ios/`). The game runs fully offline inside the app, with no backend and **no network permissions at all** (Capacitor's default `INTERNET` permission was removed from the manifest; add it back only for a live-reload dev build).

> **Status:** the owner is shipping **iOS only**. Version 3.1.0 is checked on GitHub's Macs by the *iOS build check* workflow (`.github/workflows/ios.yml`): it builds the app, launches it on an iPhone and an iPad simulator and saves a screenshot of each. Nothing is signed or submitted yet; that needs an Apple Developer account. The Android project is kept and its debug build still compiles, but it is not being released.

| | |
| --- | --- |
| App ID / bundle ID | `com.michcakee.vietbakeshop` |
| App name | Viet Bake Shop Simulator |
| Name under the icon | Viet Bake Shop Sim |
| Version | 3.1.0 (`package.json`, Android `versionName`, iOS `MARKETING_VERSION`) |
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

All icons and splashes are drawn from the logo, a smiling pixel bánh flan on light green (the grid is in the script), by a dependency-free script:

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

**You need:** Android Studio with the Android SDK, plus **JDK 21 exactly**: Capacitor 7's Android library is compiled for Java 21, and this project's Gradle (8.11) can't run on Java 24+. Android Studio's bundled JDK may be newer (it was 25 here), so point Gradle at a JDK 21:
- command line: `JAVA_HOME` set to a JDK 21 (this PC keeps one at `C:\Users\michl\.jdks\jdk-21`, pinned for Gradle in `~/.gradle/gradle.properties` as `org.gradle.java.home`), or
- Android Studio: Settings → Build Tools → Gradle → Gradle JDK → 21.

`android/local.properties` holds `sdk.dir=C:/Users/michl/AppData/Local/Android/Sdk` (forward slashes; backslashes are escape characters in that file). Both files are git-ignored.

1. `npm install`, then `npm run mobile:android`. Android Studio opens the `android/` project and syncs Gradle.
2. **Run** on an emulator or a USB-connected phone to test.
3. **Release build:** the upload keystore already exists at `C:\Users\michl\viet-bake-shop-keys\upload-keystore.jks` with its password in `key.properties` beside it (a copy of `key.properties` sits in `android/`, git-ignored, and `app/build.gradle` reads it). **Back that folder up**; losing it means you can't update the app. Then:

```bash
cd android && ./gradlew bundleRelease
```

The signed bundle lands in `android/app/build/outputs/bundle/release/app-release.aab`. Or in Android Studio: *Build → Generate Signed App Bundle*, pointing at the same keystore.
4. Before each new upload, increase `versionCode` (and `versionName` if it's a new version) in `android/app/build.gradle`.

From a terminal instead of Android Studio (after the SDK is installed):

```bash
cd android && ./gradlew bundleRelease
```

### Back button

The Android back button closes the topmost sheet, modal or sub-screen (the same stack the Escape key and on-screen back buttons use, in `src/ui/backButton.ts`). With nothing left to close, it minimises the app rather than quitting it.

## iOS

**To ship you need:** an Apple Developer account ($99/year), and either a Mac with Xcode 16+ or a cloud Mac (GitHub Actions, as below).

### Without a Mac: the build check

Every push that touches `ios/`, `capacitor.config.ts` or `package.json` runs **iOS build check** on a GitHub Mac (free for a public repository). You can also start it by hand: GitHub → Actions → *iOS build check* → *Run workflow*. It:

1. builds the web game and copies it into the iOS project (`npx cap sync ios`, which also runs `pod install`),
2. builds the app for the simulator, launches it on an iPhone 16 Pro Max and an iPad Pro 13-inch, and uploads a screenshot of each as the `ios-screenshots` artifact,
3. builds the Release configuration for real devices, unsigned.

A green run means the project compiles and starts. It does not prove the game plays well on a real iPhone; only a device or TestFlight does.

### With a Mac

1. `npm install`, then `npx cap sync ios`, then `npm run mobile:ios`.
2. In Xcode, select the **App** target → *Signing & Capabilities* → choose your team. The bundle ID is `com.michcakee.vietbakeshop` (to change it, change it in `capacitor.config.ts` too).
3. Run on a simulator or device.
4. **Release:** set the scheme to *Any iOS Device*, then *Product → Archive → Distribute App → App Store Connect*.
5. Increase *Build* (`CURRENT_PROJECT_VERSION`) for every upload.

### What the project is set to

- iPhone plays upright only; iPad allows every orientation.
- `ITSAppUsesNonExemptEncryption` is `false` in `Info.plist`, so App Store Connect does not ask the export-compliance question on each upload.
- iOS 15 or later (the purchase plugin uses StoreKit 2); iPhone and iPad.

### In-app purchases (diamonds)

- Plugin: [`@capgo/native-purchases`](https://github.com/Cap-go/capacitor-native-purchases) 7.19.3 (StoreKit 2, no server or extra account). `npx cap sync ios` adds its pod.
- Code: `src/ui/purchases.ts`. Purchases are only offered when `Capacitor.getPlatform() === 'ios'`; the website and Android never sell anything.
- Each transaction id is written to the device wallet (`vietbakeshop-wallet-v1`) before the transaction is finished, so a crash or a second notice can't credit it twice. Purchases approved later (Ask to Buy) arrive through the `transactionUpdated` listener.
- Products: see [`STORE_LISTING.md`](store/STORE_LISTING.md#in-app-purchases-set-up-in-app-store-connect). The *In-App Purchase* capability is on by default for App Store apps; nothing to add in Xcode.
- **Testing:** prices and purchases only work once the products exist in App Store Connect (status *Ready to Submit*) and the build runs from TestFlight or Xcode with a Sandbox Apple ID (Settings → App Store → Sandbox Account on the iPhone). Until then the shop shows "Not available" and the rest of the game works normally.

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
- [ ] Create the three diamond in-app purchases and submit them with the app ([`STORE_LISTING.md`](store/STORE_LISTING.md))
- [ ] Buy each pack once on TestFlight with a Sandbox account; check the diamonds arrive, the Dream team unlocks, and a second launch doesn't add them again
- [ ] Screenshots: phone (and 7"/10" tablet for Play, 6.7"/6.5"/iPad for Apple), taken from real builds
- [ ] Test on at least one small phone (≈360 dp wide) and one tablet
- [ ] Signed release builds uploaded to an internal test track / TestFlight first
