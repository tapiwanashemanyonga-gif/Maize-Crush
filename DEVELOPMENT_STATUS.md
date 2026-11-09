# Maize Crush development status

Last reviewed: 2026-11-09

## Current verified baseline

- Default branch: `main`; latest merged gameplay/Android code commit is `a394c9ecc882e995656f51e83f67ae6e73df5af4`. The current development-log update follows that code commit.
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

## Android background checkpoint and process-death recovery — verified and merged

- PR [#73](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/73) adds an explicit stable-round checkpoint hook before Android pauses WebView rendering and JavaScript timers. The native `onPause()` requests the checkpoint and only pauses WebView after the evaluation callback; a resume guard prevents a late callback from pausing an active foreground game.
- Browser `pagehide` and `blur` use the same hook. The game skips a checkpoint while a cascade/round mutation is busy, preserving the last stable round rather than serializing a partially settled board.
- The emulator matrix now backgrounds and resumes the Activity, force-stops the app process, relaunches it, and verifies that the same 19-move checkpoint is restored. It also checks diagonal connection, the no-swap rule, and portrait/landscape layout.
- PR #73 passed all four checks on exact head `b77de0fcbaef9b9326f1ac852373df38183b1e52`: gameplay regression checks (105/105; run `42484277667`), Android debug APK (`42484277663`), unsigned release candidate including temporary signing and Android 15 emulator launch (`42484277824`), and compact-phone/tablet process-recovery smoke (`42484277694`). Both device profiles passed.
- PR #73 was squash-merged to `main` as `a394c9ecc882e995656f51e83f67ae6e73df5af4`.
- All five post-merge workflows passed on that exact main commit: gameplay checks 105/105 (`42485630248`), Android debug APK (`42485630191`), unsigned release candidate and Android 15 emulator verification (`42485630195`), compact-phone/tablet runtime smoke (`42485630786`), and Pages deployment (`42485629446`).
- The post-merge phone and tablet logs both explicitly report: `Round checkpoint recovered after process relaunch: 19 moves remain.` Both also confirm the diagonal connect and no-swap behavior. No crash was reported.
- Verified post-merge artifacts: debug APK 60,126 bytes ([workflow](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42485630191)); unsigned release-candidate bundle 100,808 bytes ([workflow](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42485630195)); compact-phone and tablet screenshots/accessibility snapshots ([device workflow](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42485630786)).
- The first intermediate PR device run failed on the tablet's repeated post-relaunch geometry scan; this was a test-harness timing/visibility issue. The helper was corrected to wait for the accessible board and expected move counter without repeating geometry already checked earlier. The final PR and post-merge phone/tablet runs both passed.

## Remaining release gates

- Test on physical devices (Android 7/API 24+, current Android, compact phone and tablet); emulator coverage is not a substitute.
- Validate low-memory/slower-device performance, long sessions, background/resume, process recreation, rotation, all objective types, endless progression, save/restore and backup-import safety.
- Review launcher icon, package identity, permissions, privacy policy, screenshots, store descriptions, age/content rating and current store declarations.
- Release APK/AAB outputs are unsigned. Temporary CI signing is only a pipeline smoke test. Never commit a keystore, password or signing token, and do not sign or publish without explicit authorization and the user's credentials.

## Latest increment

- Merged to `main` as `a394c9ecc882e995656f51e83f67ae6e73df5af4` via PR #73.
- The increment changed the Android Activity lifecycle, browser and Android WebView game checkpoint hook, lifecycle/security regression tests, compact-phone/tablet process-relaunch smoke helper and this status log.
- The exact PR head passed 105 gameplay tests, Android debug/release builds, temporary CI signing smoke, Android 15 release-emulator launch, and both phone/tablet process-recovery smoke jobs. All five post-merge workflows passed on the exact merge commit.
- No game rules, art, ads, Android identity, permissions, release signing credentials, or generated build outputs were changed.
- Next milestone: audit performance and memory behavior on modest Android devices and during longer play sessions. Physical-device testing, full objective/endless-progression QA, and user-controlled release signing remain open.


## Emulator-free visual QA — verified and merged

- PR [#74](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/74) was squash-merged to `main` on 2026-11-09 as `103c0030b7338a1936f661ca8ef7ea7a40659fb7`.
- Normal push and pull-request validation no longer depends on Android emulator startup. Android debug/release builds, package metadata checks, release asset parity, temporary CI signing smoke, and the existing gameplay tests remain mandatory.
- Playwright Chromium browser QA runs on Ubuntu 24.04 against the shared HTML/CSS/JavaScript assets bundled into Android WebView. It checks compact mobile (390×844) and tablet (1024×768), takes initial and post-interaction screenshots, checks horizontal overflow and browser errors, verifies mismatched drags do not swap crops or consume moves, and verifies a valid diagonal three-crop connection, score increase, hint and settings interactions.
- The first tablet browser attempt exposed a test-harness issue: its simulated pointer coordinates targeted tiles below the browser viewport. The helper now scrolls the board into view and selects only visible adjacent/diagonal tiles. Both mobile and tablet browser tests then passed, with no browser console errors.
- Verified on the exact merged main commit `103c0030b7338a1936f661ca8ef7ea7a40659fb7`: gameplay checks run `42576437943`; Android debug APK run `42576437897`; unsigned release candidate and temporary signing smoke run `42576437918`; browser visual QA and debug build run `42576437954`; Pages deployment run `42576437416`. All five workflows passed.
- Browser QA uploaded four screenshots (mobile/tablet, initial/after interactions) and structured `results.json` as a GitHub Actions artifact. The results confirmed both viewports had no horizontal overflow; both rejected mismatched drags without spending a move and accepted a diagonal connection scoring 30 points while spending exactly one move.
- The emulator matrix and release-candidate emulator launch remain available only through manual workflow dispatch as optional diagnostics. They are skipped on normal push/PR checks. This browser coverage is not a substitute for physical Android WebView, native Activity lifecycle or hardware testing; physical-device verification remains a release gate.
- No gameplay rules, crop art, package identity, permissions, ads, internet access, production signing credentials or signing secrets were changed.
- A post-merge stability follow-up commit `937fa6d1e23696330682c4d8d8e8736ec087a022` synchronizes browser pointer gestures with each selected tile and uses denser mouse sampling, avoiding timing-sensitive diagonal-drag assertions. On that exact main commit, gameplay checks `42576874464`, Android APK `42576874472`, release candidate/signing smoke `42576874365`, browser visual QA/debug APK `42576874332`, and Pages deployment `42576874442` all passed.
- Next milestone: inspect the captured screenshots as part of each QA review and complete physical-device checks for lifecycle recovery, longer sessions, all objectives and performance before release signing.


## Board gesture rendering efficiency — in progress

- Verified the latest main commit before changing code: 71a89f9a11bf764f78082c79f9d5fa4ebdb76174. The push workflows all completed successfully on that exact SHA: gameplay checks run 42577013445 (104/104), Android debug build run 42577013584, release candidate run 42577013450, browser visual QA/debug build run 42577013549, and Pages deployment run 42577013398. The scheduled debug build run 42584122851 also passed on the same SHA.
- Inspected the latest browser QA screenshots and results from artifact 13655394130. At 390×844 mobile and 1024×768 tablet, both layouts had no horizontal overflow; the board measured 374px and 930.8px wide respectively. Both profiles rejected mismatched drags without spending a move and completed a diagonal connection for 30 points.
- The current pointer hot path performed a full 64-tile bounds scan in locateTileAtPoint on every pointermove. renderPath also queried and updated every crop tile and repeatedly queried the SVG trail, even when only one path cell changed.
- New branch: perf/reduce-board-pointer-render-work, based directly on the verified main SHA above. The implementation uses document.elementFromPoint for pointer hit-testing, caches tile and SVG element references when the board is rendered, and updates only cells whose selected/hinted/endpoint state changed. The Playwright mobile/tablet test now measures explicit layout reads and board-wide selector calls during a real diagonal drag.
- Automated validation for this increment is pending on PR CI. No improvement is claimed until the browser interaction checks, gameplay tests, Android builds and release asset-parity check pass on the exact PR head.
- Next: verify the measured layout-work counts on both viewports and inspect the new screenshots. If all checks pass, merge this optimization, then continue low-memory/long-session profiling and physical-device testing.
