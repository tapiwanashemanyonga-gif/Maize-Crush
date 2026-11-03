# Maize Crush development status

Last reviewed: 2026-11-03

## Current state

- Default branch: `main`
- Active release-smoke-test branch: `test/android-emulator-launch-smoke`
- Latest verified default-branch commit: `580aff574436c921d7dcbd247fc56cf46cc5cb69`
- Current Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0`, min SDK 24, target SDK 36.
- Functional work in progress: make the Android 15 emulator smoke test use Linux KVM acceleration correctly and enforce that setup with a regression test.

## Verified CI evidence

- Default-branch gameplay checks: passed on `580aff574436c921d7dcbd247fc56cf46cc5cb69` (run 41639831486).
- Default-branch Android debug APK: passed on the same commit (run 41639831662).
- Default-branch unsigned Android release candidate: passed on the same commit (run 41639831469); APK and AAB were uploaded as an unsigned validation artifact.
- The previous PR emulator smoke test built and signed the app, but the emulator did not boot because the Linux runner user lacked permission to access `/dev/kvm`. The app was not installed or launched in that attempt. This was an emulator-host setup failure, not evidence of an app crash.

## Remaining release work

- Re-run the Android 15 emulator smoke test after applying KVM permissions and verify the signed APK launches without a fatal app exception.
- Perform physical-device checks on Android 7+, recent Android, small phones, and tablets; emulator CI does not replace these.
- Review gameplay, save/restore, accessibility, performance, app identity, store disclosures, and the release checklist.
- Configure the user's private signing credentials only when explicitly authorized; never commit a keystore or signing secrets.
- Do not distribute the unsigned CI release candidate.

## Next milestone

Verify the KVM-enabled Android emulator launch on the updated PR branch. If it passes, continue with device-size and gameplay release QA.
