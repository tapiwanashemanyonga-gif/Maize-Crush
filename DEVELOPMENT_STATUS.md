# Maize Crush development status

Last reviewed: 2026-11-05

## Current verified baseline

- Default branch: `main`; crop-art fix merged as commit `1c9eb36b3915d72b146e66eaf27376e3ce2ccf26` (PR [#69](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/69)).
- Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0` (`versionCode 1`), min SDK 24, target SDK 36.
- Gameplay remains an original 8×8 connect-path puzzle: drag through 3+ matching adjacent crops; diagonals count; tiles are never swapped.
- Six original Zimbabwe-harvest illustrations are included: maize, tomato, groundnut, banana, orange and sweet potato. The project also has endless level scaling, eight objective types, local progress, boosters, accessibility options, and responsive phone/tablet layouts.
- No ads, analytics, or internet permission have been added. Game assets are bundled for offline play.

## Crop artwork WebView fix — verified

- Root cause: Android WebView did not reliably render the board's SVG `<use href="#crop-…">` references, leaving only coloured tile backgrounds.
- The renderer now clones each original SVG symbol's vector paths directly into each tile. If a symbol is unexpectedly missing, the crop emoji is used as a fallback. Browser and Android copies of the renderer remain byte-for-byte identical.
- PR #69 was merged after all four PR workflows passed on head `c9da81a4065d54fd10d06dd9aa520a1496bb631c`:
  - Gameplay and service-worker checks: run `42048301186` — success.
  - Android debug APK: run `42048301107` — success.
  - Unsigned release APK/AAB build, package metadata, temporary CI signing smoke test, and Android 15 emulator launch: run `42048301134` — success.
  - Compact-phone and tablet runtime smoke: run `42048301105` — both jobs passed. The captured initial-board screenshots show the six crop illustrations; the automated gesture checks accepted a diagonal connection and verified that a mismatched drag does not swap crops or consume a move.
- The merged `main` commit `1c9eb36b3915d72b146e66eaf27376e3ce2ccf26` also passed:
  - Gameplay/service-worker checks: run `42050480290`.
  - Android debug APK: run `42050480269`.
  - Android release-candidate workflow: run `42050480510`.
  - GitHub Pages deployment: run `42050479416`.
- Verified artifacts from the merged commit: debug APK artifact `maize-crush-android-debug-apk` (59,206 bytes) and unsigned release candidate artifact `maize-crush-unsigned-release-candidate` (99,177 bytes; APK and AAB). These are CI build outputs, not a user-signed public release.

## Open QA follow-up

- PR [#68](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/68) is still open and is based on the pre-PR-69 mainline. Its latest device-layout matrix (run `42042889383`) failed in the smoke harness:
  - Compact phone: diagonal connect and no-swap assertions passed, then landscape geometry validation classified eight clipped accessibility bounds as non-square.
  - Tablet: the helper found zero fully visible crop tiles immediately after dismissing the tutorial and could not bring the board into view.
- This is a test-harness/orientation/scroll-detection issue, not evidence that the crop renderer is broken. PR #69's newer smoke run passed both device profiles. Next, port/rebase the known-good rotation, focus-mode and safe-scroll handling into PR #68, retain the regression tests, and rerun the full phone/tablet matrix before merging it.

## Remaining release gates

- Test on physical devices (Android 7/API 24+, current Android, compact phone and tablet); emulator coverage is not a substitute.
- Validate low-memory/slower-device performance, long sessions, background/resume, rotation, all objective types, endless progression, save/restore and backup-import safety.
- Review launcher icon, package identity, permissions, privacy policy, screenshots, store descriptions, age/content rating and current store declarations.
- The release APK/AAB built by CI are unsigned. A temporary CI-only key is used solely to verify the signing pipeline. The user's private release keystore must never enter the repository; do not sign or publish without explicit authorization and the required credentials.

## Next milestone

Fix and revalidate PR #68's compact-phone/tablet smoke harness using the successful PR #69 implementation, then merge the mainline device-matrix trigger. After that, audit progression/save/backup recovery and low-end performance. Physical-device testing and user-controlled release signing remain mandatory release gates.
