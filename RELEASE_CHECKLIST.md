# Maize Crush — Release Readiness Checklist

## Current Android identity

- Application ID: `com.maizecrush.zimbabweharvest`
- Current version: `1.0.0` (`versionCode 1`)
- Minimum Android version: Android 7.0 / API 24
- Target SDK: API 35
- Gameplay is bundled locally in the Android WebView; a network connection is not required to play.

## Automated release gate

The **Maize Crush Android Release Candidate** workflow runs the gameplay regression tests, verifies that the browser and Android copies of the game assets are byte-for-byte identical, and builds both the release APK and Android App Bundle.

The uploaded `app-release-unsigned.apk` and `app-release.aab` are **unsigned release candidates**. They are for build validation only and must not be distributed as a public release.

## Required before public distribution

- [ ] Configure a private Android release keystore in GitHub Actions secrets; never commit the keystore, passwords, or signing key to this repository.
- [ ] Build and verify a release-signed APK for direct distribution and/or a release-signed AAB for Google Play.
- [ ] Increase `versionCode` for each subsequent published Android release.
- [ ] Install the release-signed build on a physical Android 7+ phone/tablet and test first launch, touch/drag selection, pause/resume, app background/foreground, offline gameplay, level progression, daily challenge, save restore, undo, sound/vibration settings, dialogs, and screen rotation.
- [ ] Confirm the release package ID, app name, launcher icon, screenshots, short/long descriptions, privacy disclosure, age/content rating, and store listing.
- [ ] Keep a secure backup of the release keystore and document who controls it. Losing it can prevent updates to an existing package.
- [ ] Review the target store's current policies and required declarations before submission.

## Important limitation

A successful CI build confirms that the code compiles and the automated checks pass. It does not replace hands-on testing on physical devices, signing, store-policy review, or acceptance by Google Play/Uptodown.

## Release signing setup

1. Generate a release keystore in a private location (for example, using Android's `keytool` from a local JDK). Use a long, unique password and alias. Keep at least one secure offline backup of the original keystore. **Never commit it to GitHub or send it in chat.**
2. Encode the keystore file as Base64 locally and add the resulting text as the repository Actions secret `ANDROID_KEYSTORE_BASE64`.
3. In **GitHub → repository Settings → Secrets and variables → Actions**, add these repository secrets:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
4. Open **Actions → Maize Crush Signed Android Release → Run workflow**. The workflow checks the secrets, runs tests, verifies browser/Android asset parity, builds APK/AAB, and verifies signatures. Download the `maize-crush-signed-release` artifact only after the run succeeds.
5. Do not create a public release tag until the keystore secrets are configured and the physical-device release checklist above is complete. The workflow builds signed artifacts but does not upload them to Google Play or Uptodown automatically.

## Privacy policy

The public policy page is `privacy-policy.html`, hosted at `https://tapiwanashemanyonga-gif.github.io/Maize-Crush/privacy-policy.html`. Review it before publishing. If ads, analytics, accounts, or online services are added in a later version, update the policy and store disclosures first.
