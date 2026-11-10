# Maize Crush development status

Last reviewed: 2026-11-10

## Current verified baseline

- Default branch: `main`; latest merge is `b08622f2428e74fee7a4a4a8fd1ee8307eee5ae8` (Android-managed backup privacy disclosure). Latest gameplay/Android code commit remains `5bc9b586539ad07ba99074be6047c1c8d2e00abf`.
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

## Long-session browser memory soak — verified and merged

- PR [#76](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/76) was squash-merged into `main` on 2026-11-09 as `31a0385c0f641c3ded68a1da943d0cc50eede751`.
- The Playwright browser QA now performs 20 valid three-crop connections per viewport across five fresh rounds (four restarts) on compact mobile (390×844) and tablet (1024×768). It verifies the score increases, exactly one move is consumed per harvest, and a valid 8×8 stable round checkpoint is persisted after every harvest: **20/20 checkpoints per viewport**.
- Both viewports retained the core rules: mismatched adjacent drags did not swap crops or spend moves; a diagonal three-crop connection scored 30 points. There was no horizontal overflow. Board widths were 374px on mobile and 930.8px on tablet.
- Gesture layout instrumentation remained at **6 crop-tile bounds reads, 3 board bounds reads and 0 board-wide selector calls** for the tested diagonal path on each viewport.
- After explicit Chromium garbage collection, mobile DOM nodes changed from 912 to 910 (**−2**), and retained JavaScript heap rose from 2,274,708 to 2,419,988 bytes (**+145,280 bytes**). Tablet DOM nodes changed from 907 to 905 (**−2**), and retained heap rose from 2,247,788 to 2,409,380 bytes (**+161,592 bytes**). Both are comfortably within the browser regression guardrails of +160 nodes and +8 MiB. These Chromium measurements do not represent Android native/WebView hardware memory.
- The first PR runs exposed harness issues: a syntax error, then coordinate sampling during the staggered 0.26-second tile-arrival animation. The harness now runs `node --check` before downloading Chromium and waits for tile animations to finish after load, shuffle, restart and harvest. The soak verifies all three selected cells before release.
- Exact PR-head validation passed on `dd55db2cfa058e2ac058cc2d3571e94f7b7ec0d7`: gameplay checks **107/107**, Android debug APK, unsigned release candidate/package metadata/temporary signing smoke, and browser visual QA. The PR browser artifact `13680506674` was downloaded and inspected.
- All five post-merge main workflows passed on exact merge commit `31a0385c0f641c3ded68a1da943d0cc50eede751`: gameplay checks run `42630167736` (**107/107**), Android debug APK run `42630167663`, unsigned release candidate run `42630167696`, browser visual QA run `42630167671`, and Pages deployment run `42630166547`.
- Verified post-merge artifacts: [debug APK](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42630167663) (`60,366` bytes), [unsigned release APK/AAB candidate](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42630167696) (`101,237` bytes), and [mobile/tablet screenshots plus soak results](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42630167671) (artifact `13680701917`, `4,532,358` bytes).
- No game rules, crop art, Android identity, permissions, signing credentials, ads or paid services changed. The release candidate remains unsigned.

## Follow-up: stable-round soak edge case — verified and merged

- PR [#77](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/77) was squash-merged into `main` on 2026-11-09 as `2dcb697b357e63fd6bf8810c130f4fb9cb0e4412`.
- The previous browser wait could time out when a legitimate level-complete/failed state appeared. The soak now waits for the saved checkpoint to match the expected moves and score, includes diagnostic state if it times out, uses two harvests per round, and closes legitimate result dialogs before restarting.
- Exact PR-head validation passed on `6a2a325faa6043b24fb96cbd05e6efc79924796f`: gameplay checks **107/107**, Android debug APK, unsigned release candidate/package metadata/temporary signing smoke, and browser visual QA. PR-head browser results artifact `13680379278` was downloaded and inspected.
- The hardened soak completed **20 harvests and 20 stable checkpoints on each viewport**. Mobile: 10 rounds, 9 restarts, DOM nodes 916→906 (−10), JS heap 2,288,640→2,465,644 bytes (+177,004). Tablet: 10 rounds, 9 restarts, DOM nodes 901→916 (+15), JS heap 2,247,720→2,422,044 bytes (+174,324). Both stayed below the +160-node and +8 MiB browser guardrails.
- Both profiles continued to reject mismatched drags without consuming a move, accept a diagonal connection, and preserve 8×8 checkpoints. Board widths remained 374px on mobile and 930.8px on tablet with no document overflow. Gesture instrumentation remained 6 tile bounds reads, 3 board bounds reads and 0 board-wide selector calls.
- Verified PR-head artifacts: [debug APK](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42631089705) (`60,372` bytes), [unsigned release candidate](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42631089556) (`101,237` bytes), and [browser screenshots/results](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/42631090121) (artifact `13680379278`, `4,551,625` bytes).
- Post-merge mainline verification on `2dcb697b357e63fd6bf8810c130f4fb9cb0e4412`: gameplay tests passed **107/107** (run `42631442561`); Android debug APK passed (run `42631442776`); unsigned release candidate and temporary signing smoke passed (run `42631442570`). Browser visual QA (run `42631442798`) and Pages deployment (run `42631441325`) were still running when this log entry was written; check their final conclusions before relying on post-merge browser/deployment status.
- Browser heap figures are Chromium metrics only, not proof of Android native/WebView performance. No physical device was connected or tested. Release candidate remains unsigned; no signing credentials, ads or paid services were added.

## Next milestone

Complete real-device Android WebView validation on at least one modest/older phone and one current phone or tablet, covering 20+ harvest sessions, repeated cascades, process/background recovery, rotation, all objective types, and low-memory behavior. Browser soak is repeatable shared-asset QA only and cannot establish physical Android performance. Then complete final app identity, permission, privacy and store-package review before declaring the unsigned APK/AAB ready for the user's signing credentials.


## Android system backup privacy disclosure — verified and merged

- PR [#78](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/78) was squash-merged into `main` on 2026-11-10 as `b08622f2428e74fee7a4a4a8fd1ee8307eee5ae8`.
- The Android manifest explicitly sets `android:allowBackup="true"`. The previous privacy policy described local storage and user-created JSON exports but omitted Android-managed Auto Backup and device-to-device transfers. The public policy and bundled Android copy now explain eligible system backups, device/provider-managed retention, and the distinction from Maize Crush-operated services and optional JSON exports.
- Added a security regression test for the manifest setting, backup disclosure, and exact browser/Android privacy-policy parity. Added a release checklist item for backup/restore and privacy review. Both policy copies are byte-identical.
- Initial PR test attempt reported 107 passed and 1 failed because the assertion expected different wording from the policy. Corrected the assertion and reran on exact PR head `c6da277c9436c100bd7d983b1408b34f62c66bf5`: **108/108 gameplay/security checks passed** (run `42824675213`; earlier corrected run `42824618046` also passed 108/108).
- PR-head Android debug build passed (run `42824675524`; artifact `13768147919`, 60,862 bytes). Unsigned release APK/AAB build and temporary CI signing verification passed (run `42824675568`; artifact `13769090676`, 102,005 bytes). Browser mobile/tablet visual QA passed (run `42824675543`; artifact `13767759785`, 4,600,027 bytes). The optional Android emulator diagnostic was skipped because it is manual-dispatch-only; no physical Android backup/restore test is claimed.
- The PR changed only the two privacy-policy copies, security regression tests, release checklist and development log. No gameplay/runtime code, manifest permission, app identity, signing configuration, ads or paid services changed. Release APK/AAB artifacts remain unsigned.
- Post-merge mainline validation on development-log commit `72a56b0bcf34acc12c88c7d2a07708f5f7ae3a07` passed: gameplay/security checks **108/108** (run `42824997315`), Android debug APK (run `42824997316`, artifact `13769630287`, 60,860 bytes), unsigned release APK/AAB and temporary CI signing verification (run `42824997341`, artifact `13769800107`, 102,005 bytes), browser mobile/tablet visual QA (run `42824997343`, artifact `13768796355`, 4,547,140 bytes), and GitHub Pages deployment (run `42824997320`). The optional Android emulator diagnostic in browser QA was skipped because it is manual-dispatch-only; no physical-device test is claimed.

## Next milestone

Complete physical Android WebView and system-backup/device-transfer validation on a modest/older phone and a current phone or tablet, including 20+ harvest sessions, repeated cascades, process/background recovery, rotation, all objective types, low-memory behavior, and backup/restore settings. Browser/CI checks do not prove physical-device, low-memory or manufacturer-specific behavior. Then finish the signed-build identity, permissions, privacy and store-package review before declaring the unsigned APK/AAB ready for the user's signing credentials.


## Vibrant fantasy-farming redesign — foundation

- Started the approved redesign on dedicated branch `redesign/vibrant-fantasy-foundation`, based on main commit `e9a314ab4858d2ee44c8a6218e07667917d94334`.
- Added semantic design tokens for the fantasy-farming world palette, crop colors, card surfaces, typography colors, spacing, radii, shadows, and motion timing.
- Kept all existing rendered colors and gameplay styles unchanged in this foundation increment; the tokens prepare the upcoming background, journey-map, and adaptive-layout work without changing game behavior.
- Updated browser and Android WebView stylesheets together. They must remain byte-for-byte identical and are checked by the Android release-candidate workflow.
- No game rules, saved progress format, Android identity, permissions, privacy behavior, ads, signing configuration, or release artifacts changed.
- Validation pending: gameplay regression tests and browser/Android asset-parity/build workflows on this branch. No physical-device result is claimed.

## Next milestone

Use the approved vibrant fantasy-farming tokens to introduce original world scenery and the visual identity, then build the winding journey map while preserving saved level progress.


## Vibrant fantasy-farming redesign — stage 2 in progress

- Created draft PR [#79](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/79) from `redesign/vibrant-fantasy-foundation`; it remains unmerged.
- Stage 1 added shared design tokens for the fantasy farming world, crop colours, surfaces, spacing, shadows and motion.
- Stage 1 CI passed: gameplay checks (run `42897189426`), browser/mobile/tablet visual and interaction QA (run `42897190437`), Android debug APK (run `42897189503`), and release-candidate build plus browser/Android asset parity (run `42897189484`). Optional emulator launch was skipped.
- Stage 2 applies a bright sky, sunlit hills, field rows, warm harvest surfaces, clearer controls and colourful crop-field styling. Browser and Android WebView stylesheets are updated together.
- Next: inspect browser screenshots at compact-phone and tablet sizes, then continue with the winding journey-map presentation. Do not claim physical-device verification from browser QA.
