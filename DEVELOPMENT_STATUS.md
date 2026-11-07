# Maize Crush development status

Last reviewed: 2026-11-07

## Current verified baseline

- Default branch: `main`; latest main commit is `8bf9b3d2b6b1074921ad461b7d71a1a47efba84f` (development-log-only update); latest gameplay/Android code commit is `1b8350315dea64270bbd6238d88dece973bcce11`.
- Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0` (`versionCode 1`), min SDK 24, target SDK 36.
- Gameplay is an original 8×8 connect-path puzzle: drag through 3+ matching adjacent crops; diagonal connections count; tiles are never swapped.
- Six Zimbabwe-harvest illustrations are bundled: maize, tomato, groundnut, banana, orange and sweet potato. The game includes eight objective types, endless level scaling, local progress, boosters, accessibility options and responsive phone/tablet layouts.
- No ads, analytics or internet permission are included. Game assets are bundled for offline play.

## Crop artwork and Android device layout — verified

- PR [#69](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/69) fixed SVG rendering in Android WebView by cloning inline crop-symbol paths into each tile, with emoji fallback. Browser and Android game engines remain byte-for-byte identical.
- PR #69 passed gameplay, debug APK, unsigned release candidate/package metadata/temporary signing smoke/Android 15 emulator launch, and compact-phone/tablet runtime smoke. The emulator checks confirmed visible crop artwork, a valid diagonal connection, and that a mismatched drag does not swap crops or consume a move.
- PR [#70](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/70) corrected clipped UIAutomator crop bounds, tablet scroll gesture placement, and mainline device-smoke triggers. Both compact-phone and tablet runtime jobs passed before the PR was squash-merged as `ab2931ad0b9420e56c5c6ecb17d7a91399362a70`.
- The post-merge mainline checks, debug APK, release candidate, phone/tablet runtime smoke, and Pages deployment all passed on commit `ab2931ad0b9420e56c5c6ecb17d7a91399362a70` (runs `42228558109`, `42228558092`, `42228558132`, `42228558089`, `42228558023`).

## Undo round checkpoint — verified and merged

- PR [#71](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/71) fixed a save-state gap: Undo restored the board and counters in memory but did not replace the persisted round checkpoint.
- The restored board, score, moves, booster flags and objective/mission state are now checkpointed after Undo. The Android WebView asset mirrors the browser game engine, and a regression test protects the call ordering.
- All four PR workflows passed on head `98c97451d80d813a356bb9ad6f0f98dfc2d8f5ca`: gameplay checks run `42229218644`, debug APK run `42229218588`, release candidate run `42229218606`, and phone/tablet device smoke run `42229218460`. Both compact-phone and tablet runtime jobs passed.
- PR #71 was squash-merged as `1123ac7b9e56e422f06a44a9f2a647f7b28ae5d3`.
- All five post-merge workflows passed on that exact main commit: gameplay checks `42376143608`, Android debug APK `42376143561`, unsigned release candidate `42376143539`, phone/tablet runtime smoke `42376143645`, and Pages deployment `42376143305`.
- Verified artifacts from the post-merge main commit: debug APK (59,218 bytes), unsigned release candidate package bundle (99,201 bytes), phone smoke screenshots/accessibility snapshot (6,686,567 bytes), and tablet smoke screenshots/accessibility snapshot (11,172,131 bytes). They are available from the [mainline workflow runs](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions).

## Backup restore transaction safety — verified and merged

- The previous importer wrote progress, statistics, level records, daily state, round checkpoint and preferences one key at a time. A storage/quota error partway through could leave a partially imported save.
- Added a reusable storage transaction helper that snapshots every target key before writing, rejects duplicate/invalid entries, applies all updates, and restores attempted keys in reverse order if a write fails. It reports whether rollback completed.
- The backup importer now routes every save-key change through that helper. It distinguishes a failed restore with successful rollback from a rollback that could not fully complete.
- Browser and Android WebView game engines are byte-for-byte identical after the importer change.
- Added regression tests for successful apply/removal, rollback after a quota-style write failure, incomplete rollback reporting, duplicate-key rejection, and importer integration.
- PR [#72](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/72) passed all four workflows on head `7ba575a32be0dbc834d9eaeae7508a9838a79f29`: gameplay checks run `42376819019` (103 tests, 103 passed, 0 failed), debug APK run `42376818989`, unsigned release candidate/Android emulator verification run `42376818994`, and compact-phone/tablet runtime smoke run `42376818956`. Both device profiles passed.
- PR #72 was squash-merged as `1b8350315dea64270bbd6238d88dece973bcce11`.
- All five post-merge main workflows passed on that exact commit: gameplay checks run `42377163215` (103/103), Android debug APK run `42377163123`, unsigned release candidate run `42377163218`, compact-phone/tablet runtime smoke run `42377163295`, and Pages deployment run `42377162736`.
- Verified post-merge artifacts: debug APK (59,688 bytes), unsigned release candidate bundle (100,033 bytes), compact-phone smoke screenshots/accessibility snapshot (6,914,299 bytes), and tablet smoke screenshots/accessibility snapshot (11,692,511 bytes). See the [mainline workflow runs](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions).
- The existing `feature/backup-import-safety` branch was inspected but not merged or reused because it was stale and diverged (5 commits ahead, 159 behind main).

## Android background checkpoint — in progress

- Verified the exact current main commit `8bf9b3d2b6b1074921ad461b7d71a1a47efba84f`: gameplay checks, Android debug APK, unsigned release candidate (including temporary signing and Android 15 emulator launch), compact-phone/tablet device smoke, and Pages deployment all completed successfully on that SHA. Run IDs: `42377612719`, `42377612691`, `42377612774`, `42377612689`, and `42377612015`. Both phone and tablet runtime jobs passed.
- The native Activity previously paused WebView rendering and JavaScript timers immediately on `onPause`, without first explicitly asking the game to checkpoint its last stable round.
- New branch `fix/android-background-checkpoint` adds a JavaScript background-checkpoint hook. Android invokes it from `onPause` and pauses WebView/timers only after the evaluation callback; a foreground-resume guard prevents a late callback from pausing a WebView after the user returns.
- The same hook is used for browser `pagehide` and `blur`. It deliberately skips a checkpoint while a cascade/round mutation is busy, preserving the last stable checkpoint instead of writing a partial board.
- Added static regression checks for the native lifecycle ordering and browser/Android checkpoint-hook parity. PR validation is pending; do not claim background/process-death runtime coverage until an emulator lifecycle test and physical-device checks verify it.

## Remaining release gates

- Test on physical devices (Android 7/API 24+, current Android, compact phone and tablet); emulator coverage is not a substitute.
- Validate low-memory/slower-device performance, long sessions, background/resume, process recreation, rotation, all objective types, endless progression, save/restore and backup-import safety.
- Review launcher icon, package identity, permissions, privacy policy, screenshots, store descriptions, age/content rating and current store declarations.
- Release APK/AAB outputs are unsigned. Temporary CI signing is only a pipeline smoke test. Never commit a keystore, password or signing token, and do not sign or publish without explicit authorization and the user's credentials.

## Latest increment

- Branch: `fix/android-background-checkpoint`.
- Commit: `331d924da72c5040b8cb356ada2f80a2c913dda2` (one commit ahead of current main `8bf9b3d2b6b1074921ad461b7d71a1a47efba84f`).
- Five-file diff: Android Activity lifecycle, matching browser/Android game checkpoint hook, Android lifecycle regression tests, and this status log.
- The native Activity now requests a stable localStorage checkpoint before pausing WebView rendering/timers; a resume guard prevents a late callback from pausing the foreground WebView. The game skips checkpoint writes while a cascade is busy and uses the same hook on browser blur/pagehide.
- No package identity, permissions, art, ads, signing configuration, credentials, or generated build outputs changed.
- Pull request and CI validation are not yet complete. No Android background/process-death runtime pass is claimed.
- Next: run all PR workflows, inspect any failure, then add/verify emulator background-resume and process-relaunch coverage before merging. Physical-device and release-signing gates remain open.
