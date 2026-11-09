# Maize Crush development status

Last reviewed: 2026-11-09

## Current verified baseline

- Default branch: `main`; latest commit at the start of this increment is `38edae14c61d582e21f00addbc6b5a4031fc9ba8` (development log). Latest gameplay/Android code commit is `5bc9b586539ad07ba99074be6047c1c8d2e00abf`.
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


## Board gesture rendering efficiency — verified and merged

- PR [#75](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/75) was squash-merged into `main` on 2026-11-09 as `5bc9b586539ad07ba99074be6047c1c8d2e00abf`. The PR head was `556ddf79a3a2e6fd8c7932b2238edcd1a0e2575f`.
- The pointer hot path now uses `document.elementFromPoint()` instead of scanning the 64 crop tiles and reading every tile's bounds on each pointer event. Board rendering caches tile references and the connection SVG nodes; path rendering updates only tiles whose selected, hinted or endpoint state changes. The redundant second hit-test fallback was removed.
- Browser visual QA passed on compact mobile (390×844) and tablet (1024×768), both on the PR head and again on the merged main commit. Both profiles had no horizontal overflow; mismatched drags did not swap crops or spend a move; valid diagonal connections scored 30 points and spent exactly one move. There were no browser errors.
- The Playwright instrumentation measured the tested three-crop path at **6 crop-tile bounds reads, 3 board bounds reads and 0 board-wide selector calls** on each viewport. This verifies lower DOM/layout work in the tested gesture path; it is not a frame-rate benchmark or a substitute for low-end hardware profiling.
- The initial PR browser attempt failed because the test probe also counted three expected `clearCells` selectors after pointer release. The probe was narrowed to measure path selection before release; the corrected rerun passed. No gameplay rule change was made.
- Exact PR-head checks passed: gameplay tests run `42626799507` (**107/107**), Android debug APK run `42626799556` (60,370 bytes), browser visual QA run `42626799529` (artifact `13677979735`), and unsigned release candidate run `42626799594` (101,237 bytes).
- All five post-merge main workflows passed on exact merge commit `5bc9b586539ad07ba99074be6047c1c8d2e00abf`: gameplay checks run `42627201710` (**107/107**), Android debug APK run `42627201737` (60,369 bytes), browser visual QA/debug build run `42627201639`, unsigned release candidate run `42627201725` (101,237 bytes), and Pages deployment run `42627198493`.
- Post-merge artifacts were verified: [debug APK](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42627201737), [unsigned release candidate APK/AAB](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42627201725), and [mobile/tablet screenshots plus results](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42627201639). The screenshots and `results.json` were downloaded and inspected.
- The Android release candidate's package metadata, browser/Android asset parity, release outputs and temporary CI signing smoke all passed. The candidate remains unsigned with the user's own credentials; the temporary CI key is not a production signing key.
- Real Android emulator diagnostics were skipped on normal push/PR runs, and no physical-device, low-memory, long-session or frame-rate result is claimed. Physical-device testing remains a release gate.

## Long-session browser soak — in progress

- Verified repository access, default branch `main`, recent commits, tests and workflows before starting this increment.
- Baseline commit: `38edae14c61d582e21f00addbc6b5a4031fc9ba8`. All four latest main workflows completed successfully on this exact SHA: gameplay checks `42627477866`, Android debug APK `42627478089`, unsigned Android release candidate `42627478034`, browser visual QA/debug build `42627477892`, plus Pages deployment `42627477171`. All conclusions were `success`.
- Latest verified artifacts: debug APK `60,368` bytes (artifact `13679795761`); unsigned release candidate bundle `101,237` bytes (artifact `13680145153`); browser screenshots/results artifact `13679415964` (3,002,472 bytes). Emulator-only diagnostics were skipped in normal CI and are not physical-device evidence.
- New branch: `qa/long-session-memory-soak`, based directly on the verified main SHA.
- Added a Playwright long-session soak to the existing mobile (390×844) and tablet (1024×768) browser QA. Each profile performs 20 valid three-crop connections over five fresh rounds, checks every stable 8×8 checkpoint and move/score update, and collects Chromium DOM-node and JavaScript-heap metrics after garbage collection.
- The soak fails if live DOM nodes grow by more than 160 or retained JS heap grows by more than 8 MiB after 20 harvests. These are browser regression guardrails, not claims about Android hardware performance.
- Initial PR CI exposed a JavaScript syntax error in the browser harness: an insertion retained the `async` prefix on the synchronous path finder and removed it from `installLayoutProbe`. This failed before Chromium launched; it is a test-harness defect, not a gameplay failure. Corrected both declarations in commit `02895930387c3fec46d73ed4556aa6b527bfb809`.
- Added an early `node --check tests/browser-visual-qa.js` workflow step and a regression assertion in commits `4ce7bea5cf2f6f5fe96794ee55334d3b6f7bbbbf` and `e07c67ee66331fd84a788e4d820f4e09af5a77ec`, so malformed browser QA scripts fail before Chromium is downloaded.
- PR #76's initial gameplay check passed **107/107**; the first browser run failed at syntax parsing. Corrected CI reruns are pending. No soak pass or performance improvement is claimed until the new browser run completes and its metrics/artifacts are inspected.

## Next milestone

Verify the long-session soak on both browser viewports, inspect retained-heap and DOM-node metrics, and correct any failure before merging. Browser soak is repeatable shared-WebView-asset coverage only; it does not replace physical Android testing, low-memory hardware profiling, long-session testing on a real device, or final identity/permission/privacy/store-package review.
