# Maize Crush development status

Last reviewed: 2026-11-04

## Current state

- Default branch: `main`
- Active Android release smoke-test branch: `test/android-emulator-launch-smoke`
- Latest verified default-branch commit: `580aff574436c921d7dcbd247fc56cf46cc5cb69`
- Latest functional QA commit on this branch: `0f970e70299883cbe82407302a810897947fb69d`
- Latest verified CI/test-harness commit: `3eebaa07ff967d5f6553d111f2371430cc262725` (previous stable test harness).
- Pull request: [#67 — Android emulator launch smoke test](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/67) (open; not merged).
- Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0`, min SDK 24, target SDK 36.

## Completed and verified

- Core connect gameplay remains path-based, not tile-swapping: 3+ matching crops, adjacent cells, diagonals allowed.
- Existing endless progression, eight rotating primary objective types, local progress/checkpoints, boosters, accessibility settings, and phone/tablet responsive board remain in place.
- The release-candidate emulator job applies the `/dev/kvm` udev permissions and passed its Android 15 launch check.
- The compact-phone/tablet workflow's three harness issues are resolved: KVM permissions, recursive APK artifact discovery, and self-contained one-line shell commands for the emulator runner. Regression tests cover these requirements. The PR-only/manual trigger also avoids duplicate push + PR emulator runs.
- Latest verified PR-branch regression suite: 92 tests passed, 0 failed (run `41844446364` on `3eebaa07ff967d5f6553d111f2371430cc262725`).
- Latest verified PR-branch Android debug APK build: passed (run `41844446366` on `3eebaa07ff967d5f6553d111f2371430cc262725`). Debug artifact ID `13329719659` expires 2026-11-18.
- Latest verified PR-branch Android release candidate: passed (run `41844446451` on `3eebaa07ff967d5f6553d111f2371430cc262725`). It built unsigned APK and AAB files, verified package metadata, passed temporary CI signing validation, booted Android 15, installed and launched the signed test APK, and passed the fatal-exception check. Unsigned release artifact ID `13329164844` expires 2026-11-18.
- Latest verified PR-branch compact-phone and tablet runtime smoke: passed (run `41844446297` on `3eebaa07ff967d5f6553d111f2371430cc262725`). Both profiles installed the debug APK, launched `MainActivity`, stayed resumed through portrait/landscape changes and Home/resume, and had no app-specific fatal exception.
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

Verify the corrected phone/tablet UI matrix and Android release/debug builds on commit `984b4a4f500e1460f3c2742d19979342572c0406`. If the UI matrix passes, proceed to save/restore and progression reliability QA; physical-device testing remains a separate release gate.
