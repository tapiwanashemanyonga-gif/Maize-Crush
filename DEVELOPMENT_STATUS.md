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

## Android phone/tablet smoke follow-up — in progress

- Earlier PR #68 device-matrix run [42042889383](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42042889383) completed its debug build successfully but both emulator jobs failed in the UI smoke helper. The compact-phone run accepted a diagonal connection and confirmed the mismatched drag did not swap crops or consume a move, then failed during landscape geometry validation. The tablet run launched the app but found zero fully visible crop tiles after tutorial dismissal.
- The tablet helper on PR #68 did not include the latest mainline accessibility-label handling for Focus Play and used an unreliable tablet scroll gutter. The phone failure exposed eight bottom-row accessibility rectangles clipped to the viewport edge.
- New PR [#70](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/70) is based directly on current main (c7edc390524d305a72b255020e56652419b692b8) and ports the mainline rotation/Focus Play logic together with edge-aware clipped-bound filtering and a right-side tablet scroll gutter.
- Added regression coverage for eight clipped bottom-row tiles, clipped bounds just inside the viewport edge, and safe tablet scroll-gutter coordinates. The phone/tablet smoke workflow now also runs on pushes to main.
- PR #70 head: 78ee4d7d223577fcd40d7047de2f8fb2cdd48f44. The pull request has been opened; its new CI conclusions are pending and must be checked before merge. No emulator pass is claimed for this increment yet.
- PR #68 remains open but is superseded by the clean, current-mainline PR #70; do not merge the stale branch.

## Remaining release gates

- Test on physical devices (Android 7/API 24+, current Android, compact phone and tablet); emulator coverage is not a substitute.
- Validate low-memory/slower-device performance, long sessions, background/resume, rotation, all objective types, endless progression, save/restore and backup-import safety.
- Review launcher icon, package identity, permissions, privacy policy, screenshots, store descriptions, age/content rating and current store declarations.
- The release APK/AAB built by CI are unsigned. A temporary CI-only key is used solely to verify the signing pipeline. The user's private release keystore must never enter the repository; do not sign or publish without explicit authorization and the required credentials.

## Latest increment

- Branch: qa/android-layout-smoke-mainline-v2.
- Commits: c6e7f75 (edge-aware clipping and tablet gutter), 302779c (Python regression tests), e507b43 (main-push workflow trigger), and 78ee4d7 (workflow assertion test).
- Diff: four files only; no app gameplay, Android identity, permissions, signing files, or bundled assets changed.
- Pull request: [#70](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/70), awaiting GitHub Actions.
- Next: inspect all PR #70 CI jobs and logs. Fix any failed helper/device job before merging. Keep PR #68 closed only after the replacement matrix passes or the superseded branch is otherwise safely retired.
