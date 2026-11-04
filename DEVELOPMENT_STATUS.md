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
- The compact-phone/tablet workflow's three harness issues are now resolved: KVM permissions, recursive APK artifact discovery, and self-contained one-line shell commands for the emulator runner. The regression suite also caught and corrected an outdated path assertion. On commit `40fca226aa836a5d166838de568deb8a591bbda7`, all 92 tests passed; the debug APK and release-candidate builds passed; and both Android 15 emulator profiles successfully installed and launched the app, remained resumed through portrait/landscape changes, returned from Home, and produced no app-specific fatal exception. Runs: checks `41843302481`, debug APK `41843302259`, release candidate `41843302337`, layout matrix `41843302257` (both device jobs passed).
- Emulator crash guard runs as one shell command, avoiding the previous shell parser error.
- Latest verified PR-branch regression suite: 92 tests passed, 0 failed (run 41843302481 on `40fca226aa836a5d166838de568deb8a591bbda7`).
- Latest verified PR-branch Android debug APK build: passed (run 41843302259 on `40fca226aa836a5d166838de568deb8a591bbda7`).
- Latest verified PR-branch Android release candidate: passed (run 41843302337 on `40fca226aa836a5d166838de568deb8a591bbda7`). It produced the unsigned APK and AAB, verified package metadata, smoke-tested temporary signing, booted Android 15, installed the signed test APK, launched `MainActivity`, and passed the fatal-exception check. Artifact ID `13329473437` expires 2026-11-18.
- Latest verified PR-branch compact-phone and tablet runtime smoke: passed (run 41843302257 on `40fca226aa836a5d166838de568deb8a591bbda7`). Both profiles installed the debug APK, launched `MainActivity`, verified `topResumedActivity` after portrait/landscape changes and after Home/resume, and found no app-specific fatal exception.
- Latest default-branch gameplay checks, debug APK, and unsigned release-candidate workflows all passed on `580aff574436c921d7dcbd247fc56cf46cc5cb69` (runs 41639831486, 41639831662, and 41639831469 respectively).
- The default-branch hourly Android check schedule remains configured in `.github/workflows/android-apk.yml`.
- `.github/workflows/android-layout-smoke.yml` builds the debug APK once, then runs Android 15 runtime checks on a compact-phone emulator (`pixel_2`) and tablet emulator (`pixel_tablet`). It now triggers on pull requests or manual dispatch only, preventing duplicate matrix runs on the same PR commit.

## Release work still required

- Physical-device testing on Android 7+, current Android versions, small phones, and tablets; emulator launch smoke testing is not a substitute.
- Hands-on validation of drag/diagonal input, level goals, progression beyond level 100, backup/restore, rotation, pause/resume, sound/vibration, and accessibility on real devices.
- Review performance on lower-memory and slower Android hardware.
- Confirm app identity, launcher icon, screenshots, store disclosures, privacy policy, and current store requirements.
- Configure the user's own private release keystore only when explicitly authorized. Never commit signing credentials or a keystore.
- Do not distribute the unsigned CI release candidate or publish without explicit authorization.

## Next milestone

Extend the passing phone/tablet smoke test with UI-level assertions that the actual crop board and current level objective render, then add automated gesture coverage for adjacent and diagonal crop connections without introducing tile swapping. Keep physical-device testing as a separate release gate.
