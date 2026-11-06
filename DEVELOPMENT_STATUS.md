# Maize Crush development status

Last reviewed: 2026-11-06

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

## Android phone/tablet smoke — verified and merged

- PR [#70](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/70) passed all four workflows on head `a9391522c5f1a042f23b54692c17a9f25631da1b`: gameplay/helper checks (run `42076573642`), Android debug APK (run `42076573630`), unsigned release candidate/package metadata/temporary signing/emulator launch (run `42076573623`), and compact-phone plus tablet runtime smoke (run `42076573702`).
- Both phone and tablet runtime jobs completed successfully. The device run uploaded separate screenshots/accessibility artifacts for both profiles and the debug APK used by the matrix.
- PR #70 was squash-merged to `main` as `ab2931ad0b9420e56c5c6ecb17d7a91399362a70`. The stale pre-PR-69 PR #68 was closed as superseded, without merging it.
- Post-merge `main` checks run `42228558109`, Android debug APK run `42228558092`, and Pages deployment run `42228558023` all completed successfully on `ab2931ad0b9420e56c5c6ecb17d7a91399362a70`. At the time of this update, post-merge release-candidate run `42228558132` and device-layout run `42228558089` were still in progress; their conclusions must be verified before treating the full mainline matrix as green.
## Remaining release gates

- Test on physical devices (Android 7/API 24+, current Android, compact phone and tablet); emulator coverage is not a substitute.
- Validate low-memory/slower-device performance, long sessions, background/resume, rotation, all objective types, endless progression, save/restore and backup-import safety.
- Review launcher icon, package identity, permissions, privacy policy, screenshots, store descriptions, age/content rating and current store declarations.
- The release APK/AAB built by CI are unsigned. A temporary CI-only key is used solely to verify the signing pipeline. The user's private release keystore must never enter the repository; do not sign or publish without explicit authorization and the required credentials.

## Latest increment — in review

- Branch: `fix/persist-undo-round-checkpoint`, based on verified `main` commit `ab2931ad0b9420e56c5c6ecb17d7a91399362a70`.
- `game.js` now writes the restored board/score/moves/objective checkpoint after Undo, so restarting after undo no longer recovers the previous pre-undo board.
- Mirrored the change into `android/app/src/main/assets/game.js`; both game engines remain byte-for-byte identical.
- Added a regression test asserting that `undoMove` persists the stable checkpoint after restoring the round.
- Commits: `677370d` (browser checkpoint), `dcf68a6` (Android asset parity), `efa9b72` (regression test). No signing files, credentials, unrelated assets, or generated outputs were changed.
- Validation for this increment is pending GitHub Actions; do not claim the new test or build has passed until the branch workflows finish.
- Next: verify the post-merge mainline release/device workflows, then validate this Undo checkpoint fix through the full CI matrix. Continue with backup-import transaction safety and Android background/restore behavior afterward.
