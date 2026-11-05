# Maize Crush development status

Last reviewed: 2026-11-05

## Current verified baseline

- Default branch: `main`, commit `9ab62a589cbcd2138fd48d786a28cb42517785b2`.
- Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0`, min SDK 24, target SDK 36.
- Gameplay is an original 8×8 path-connecting puzzle: drag through 3+ matching adjacent crops; diagonals count; tiles are never swapped.
- The project includes six original Zimbabwe-harvest crop illustrations (maize, tomato, groundnut, banana, orange and sweet potato), eight objective types, endless level scaling, local progress, boosters, accessibility settings, and optional generated sound effects with a mute control.
- The crop-art WebView fix is present on main: the SVG symbols are embedded inline in both browser and Android HTML, and the renderer uses same-document symbol references. The Android emulator screenshot from run 42015170598 visibly shows the illustrated crops on the board; the original “plain coloured squares” symptom is not reproduced in that screenshot.

## Verified CI on current main

- Gameplay and repository checks: run [42016731177](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42016731177), success; 97 Node tests passed, 0 failed.
- Android debug APK: run [42028386489](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42028386489), success; artifact `maize-crush-android-debug-apk` (artifact ID `13414359052`).
- Unsigned release APK/AAB and temporary-key signing smoke: run [42016731332](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42016731332), success. Package metadata was verified and the signed smoke APK launched on an API 35 emulator. Artifact `maize-crush-unsigned-release-candidate` (artifact ID `13408639011`).
- These are CI outputs only. They do not include the user's private release keystore and do not authorize publishing.

## Device-layout QA finding

- The latest pre-merge runtime matrix, run [42015170598](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42015170598) on branch commit `2ecbec4d040131b836890412a7867d3e5bb855b2`, failed in the test harness. The compact-phone failure counted eight bottom-row tiles clipped by the screen edge as distorted 100×15 accessibility rectangles; the captured screenshot shows the tiles themselves remain square and illustrated. The tablet job encountered a Pixel Launcher ANR and did not obtain a usable fully-visible board snapshot.
- Main already contains the newer helper logic that excludes viewport-clipped accessibility bounds and retries the launcher ANR. This QA increment adds an explicit regression test for all eight partially clipped bottom-row tiles and enables the phone/tablet runtime workflow on pushes to `main`, so the merged mainline is tested too.
- Do not treat the previous failed matrix as a confirmed game-rendering defect, but do not mark device-layout QA complete until the updated workflow passes on the current code.

## Release work still required

- Pass the updated compact-phone and tablet runtime smoke workflow on main.
- Physical-device testing on Android 7+ and current Android versions, including the user's Samsung device; emulator results are not a substitute.
- Hands-on validation of drag/diagonal input, no-swap behavior, objectives, progression well beyond level 100, save/restart, backup/restore, rotation, pause/resume, sound/vibration and accessibility.
- Performance review on lower-memory/slower Android hardware.
- Final review of launcher identity/assets, permissions, privacy policy, screenshots and store disclosures.
- Produce and validate the final release APK/AAB against the user's own signing configuration. Never commit keystores or passwords; do not sign or publish without explicit authorization.

## Current increment and next step

- Branch: `qa/android-layout-smoke-mainline` (based on main commit `9ab62a589cbcd2138fd48d786a28cb42517785b2`).
- Changes: add a clipped-bottom-row geometry regression test; run the device-layout workflow on main pushes as well as pull requests; keep this status log current.
- First PR CI exposed one stale repository test that explicitly prohibited a `push:` trigger (96/97 tests passed); updated its expectation. The next run passed all Node checks, the 22 Python helper tests, Android debug build, and unsigned release candidate with API 35 emulator launch.
- Runtime matrix then exposed two harness edge cases: tablet swipes at x=80 landed outside the centered WebView content, and the compact-phone landscape snapshot had bottom-row bounds ending within 1px of the viewport edge. Updated the swipe inset to use the right-side WebView gutter and widened the clipped-bound exclusion margin to 16px; added regression coverage for both conditions.
- Next: rerun all PR CI, especially compact-phone/tablet runtime jobs. If either device job still fails, fix that QA blocker before adding another gameplay feature.
