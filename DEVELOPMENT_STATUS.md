# Maize Crush development status

Last reviewed: 2026-11-04

## Current state

- Default branch: `main`
- Active Android release smoke-test branch: `test/android-emulator-launch-smoke`
- Latest verified default-branch commit: `580aff574436c921d7dcbd247fc56cf46cc5cb69`
- Latest functional QA commit on this branch: `0f970e70299883cbe82407302a810897947fb69d`
- Pull request: [#67 — Android emulator launch smoke test](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/67) (open; not merged).
- Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0`, min SDK 24, target SDK 36.

## Completed and verified

- Core connect gameplay remains path-based, not tile-swapping: 3+ matching crops, adjacent cells, diagonals allowed.
- Existing endless progression, eight rotating primary objective types, local progress/checkpoints, boosters, accessibility settings, and phone/tablet responsive board remain in place.
- The release-candidate emulator job applies the `/dev/kvm` udev permissions and passed its Android 15 launch check.
- The compact-phone/tablet layout workflow first lacked KVM permissions; adding the proven KVM udev rule fixed startup and both profiles booted in about 30–37 seconds. The next failure exposed two emulator-runner script-wrapper constraints: the artifact path must be discovered recursively, and each shell command/control structure must be self-contained on one line. The recursive APK lookup was added in `938f8960f02293ab9dfa15bb635d7874d83c1c91`; the multiline `if` block then failed with a shell syntax error before installation. Rewrote the APK check, activity assertions, and crash guard as self-contained commands and added regression coverage in `80720bc4478bfd9390ced392930dd181b94275fd`. Latest CI is pending.
- Emulator crash guard runs as one shell command, avoiding the previous shell parser error.
- Latest PR-branch gameplay regression suite: 89 tests passed, 0 failed (run 41642257982).
- Latest PR-branch Android debug APK build: passed (run 41642258029).
- Latest PR-branch Android release candidate: passed (run 41642258001). It built the unsigned APK and AAB, verified package metadata, smoke-tested temporary signing, booted the Android 15 emulator, installed the signed test APK, launched `MainActivity`, confirmed the app process remained alive, and completed the fatal-exception check without a match.
- Latest default-branch gameplay checks, debug APK, and unsigned release-candidate workflows all passed on `580aff574436c921d7dcbd247fc56cf46cc5cb69` (runs 41639831486, 41639831662, and 41639831469 respectively).
- The default-branch hourly Android check schedule remains configured in `.github/workflows/android-apk.yml`.
- `.github/workflows/android-layout-smoke.yml` builds the debug APK once, then runs Android 15 runtime checks on a compact-phone emulator (`pixel_2`) and tablet emulator (`pixel_tablet`), rotating the display and backgrounding/resuming the app. KVM startup and recursive APK discovery are in place; the latest fix adapts every script command to the emulator runner's line-by-line shell wrapper. Both runtime jobs must still pass install, rotation, background/resume, and crash checks.

## Release work still required

- Physical-device testing on Android 7+, current Android versions, small phones, and tablets; emulator launch smoke testing is not a substitute.
- Hands-on validation of drag/diagonal input, level goals, progression beyond level 100, backup/restore, rotation, pause/resume, sound/vibration, and accessibility on real devices.
- Review performance on lower-memory and slower Android hardware.
- Confirm app identity, launcher icon, screenshots, store disclosures, privacy policy, and current store requirements.
- Configure the user's own private release keystore only when explicitly authorized. Never commit signing credentials or a keystore.
- Do not distribute the unsigned CI release candidate or publish without explicit authorization.

## Next milestone

Verify the self-contained emulator script installs and launches the game on both compact-phone and tablet profiles, then completes rotation and background/resume checks. If successful, extend UI-level checks to verify the actual game board and input; otherwise diagnose the next concrete failure before feature work.
