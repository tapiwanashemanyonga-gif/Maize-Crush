# Maize Crush — Release Readiness Checklist

## Current Android identity

- Application ID: `com.maizecrush.zimbabweharvest`
- Current version: `1.0.0` (`versionCode 1`)
- Minimum Android version: Android 7.0 / API 24
- Target SDK: API 36 (Android 16)
- Gameplay is bundled locally in the Android WebView; a network connection is not required to play.

## Automated release gate

The **Maize Crush Android Release Candidate** workflow runs the gameplay regression tests, verifies that the browser and Android copies of the game assets are byte-for-byte identical, and builds both the release APK and Android App Bundle.

The uploaded `app-release-unsigned.apk` and `app-release.aab` are **unsigned release candidates**. They are for build validation only and must not be distributed as a public release.

## Required before public distribution

- [ ] Configure a private Android release keystore in GitHub Actions secrets; never commit the keystore, passwords, or signing key to this repository.
- [ ] Build and verify a release-signed APK for direct distribution and/or a release-signed AAB for Google Play.
- [ ] Increase `versionCode` for each subsequent published Android release.
- [ ] Install the release-signed build on physical Android 7+, Android 15, and Android 16 devices where available; test first launch, edge-to-edge safe areas, system back gestures, landscape/large-screen resizing, touch/drag selection, pause/resume, app background/foreground, offline gameplay, all six primary objective types, progression past level 100, themed world-map paging, daily challenge, save restore, undo, sound/vibration settings, level-complete replay/next actions, dialogs (including pressing Android Back while a dialog is open), and screen rotation.
- [ ] Confirm the release package ID, app name, launcher icon, screenshots, short/long descriptions, privacy disclosure, age/content rating, and store listing match the endless-level build.
- [ ] Verify that the score-based level and daily challenge, crop collection, long-chain, cascade, special-harvest, and successful-connection objectives all show correct progress and complete at the right time.
- [ ] Keep a secure backup of the release keystore and document who controls it. Losing it can prevent updates to an existing package.
- [ ] Review the target store's current policies and required declarations before submission.

## Important limitation

A successful CI build confirms that the code compiles and the automated checks pass. It does not replace hands-on testing on physical devices, signing, store-policy review, or acceptance by Google Play/Uptodown.

## Release signing setup

1. In a private terminal with a JDK installed, generate the keystore and choose a strong password when prompted:

   ```sh
   keytool -genkeypair -v -keystore maize-crush-release.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias maize-crush
   base64 maize-crush-release.jks | tr -d '\n' > maize-crush-release.base64
   ```

   Keep the original `.jks` in at least two secure backups. Never commit it to GitHub or send it in chat. **Losing this key can prevent future updates to the same Android package.**
2. Copy the contents of `maize-crush-release.base64` into the repository Actions secret `ANDROID_KEYSTORE_BASE64`. Do not put the raw keystore or passwords in source code.
3. In **GitHub → repository Settings → Secrets and variables → Actions**, add these repository secrets:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
4. Open **Actions → Maize Crush Signed Android Release → Run workflow**. The workflow checks the secrets, runs tests, verifies browser/Android asset parity, builds APK/AAB, and verifies signatures. Download the `maize-crush-signed-release` artifact only after the run succeeds.
5. Do not create a public release tag until the keystore secrets are configured and the physical-device release checklist above is complete. The workflow builds signed artifacts but does not upload them to Google Play or Uptodown automatically.

## Store listing materials

Use [STORE_LISTING.md](STORE_LISTING.md) for the title, short and full descriptions, feature bullets, support URL, and real-device screenshot plan. Confirm the final signed build matches the copy and review the current requirements in each store's developer console before submission.

## Privacy policy

The public policy page is `privacy-policy.html`, hosted at `https://tapiwanashemanyonga-gif.github.io/Maize-Crush/privacy-policy.html`. Review it before publishing. If ads, analytics, accounts, or online services are added in a later version, update the policy and store disclosures first.
