# Maize Crush development status

Last reviewed: 2026-11-13

## Current verified baseline

- Default branch: main; latest verified code merge is 732344c1345d128b9023be0c3c76bdb5dfeca16c via PR #105 (keyboard connect-path fix). The current layout baseline includes viewport-fitted phone/tablet play, short-window checks and 44px primary touch targets.
- Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0` (`versionCode 1`), min SDK 24, target SDK 36.
- Gameplay is an original 8×8 connect-path puzzle: drag or use arrow keys + Enter to connect 3+ matching adjacent crops; diagonal connections count; tiles are never swapped.
- Six Zimbabwe-harvest illustrations are bundled: maize, tomato, groundnut, banana, orange and sweet potato. The game includes eight base objective families, mixed multi-goal combinations, marked delivery plots with ordered routes, endless level scaling, local progress, boosters, accessibility options and responsive phone/tablet layouts.
- No ads, analytics or internet permission are included. Game assets are bundled for offline play.

> Historical note: the Stage 6–11 entries below preserve earlier development snapshots. Where their old headings say “in progress” or “pending”, use the current verified baseline, recent mainline increments and remaining release gates in this file as the source of truth.

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


## Vibrant fantasy-farming redesign — stage 3 in progress

- Stage 2 branch `redesign/vibrant-fantasy-foundation` was merged into `main` via PR #79 after gameplay tests, browser/mobile/tablet visual QA, Android APK, and release-candidate workflows passed. Merge commit: `24ab0b3190ea01300a2807c716b23e3cfeb949e0`.
- Stage 3 branch: `redesign/winding-harvest-journey-map`.
- Reworked the existing level browser into a bright countryside journey: winding dotted farm trail, chapter scenery, objective icons, unlocked/current/locked level treatments, and responsive map sizing.
- Kept the existing level data, paging, unlock rules, replay selection, and saved progression logic intact. The route and scenery are decorative only.
- Browser and Android WebView CSS are updated together and must remain byte-for-byte identical.
- Validation pending: gameplay tests, browser/mobile/tablet visual QA, Android builds and release-candidate parity. No physical-device result is claimed.


## Fantasy harvest gameplay screen — stage 4 in progress

- Stage 3 winding Harvest Trail map was merged through PR #80; merge commit: `fdd643ae3fb3907bb5ad62a404271863ebe6a113`.
- Stage 4 branch: `redesign/fantasy-harvest-gameplay`.
- Reworked the play panel with warm harvest-card surfaces, clearer score/goal/move panels, objective and mission progress cards, a grassy framed crop field, and distinct harvest controls.
- Preserved the existing game markup, game engine, connect-path rules, objective logic, save format, and Android identity. This increment is CSS-only apart from the offline cache version update.
- Browser and Android WebView stylesheets and service workers are mirrored byte-for-byte; cache advanced to v5 so returning players refresh the new presentation.
- Validation pending: gameplay regression tests, browser/mobile/tablet visual QA, Android builds, and release-candidate parity. No physical-device result is claimed.


## Immersive farm-world backdrop — stage 5 in progress

- Stage 4 fantasy harvest gameplay screen was merged through PR #81; merge commit: `63e01852627871faad9a8e044bf14fbc3431eb36`.
- Stage 5 branch: `redesign/immersive-farm-world-backdrop`.
- Added layered sky glow, rolling green hills and subtle field-row textures behind the game, with a glassy framed top bar and crop guide.
- Added gentle floating crop-card motion with reduced-motion support; existing puzzle UI and game logic are untouched.
- Browser and Android WebView stylesheets and service workers are mirrored byte-for-byte; offline shell cache advanced to v6.
- Validation pending: gameplay regression checks, browser visual QA, Android builds and release-candidate parity. No physical-device result is claimed.


## Stronger opening challenge — stage 6 in progress

- Based on the verified Stage 5 merge `5bf5260b107dc5de2ab49e983ee15ab07ff94d40`.
- Audited the existing first 20 score goals, move budgets and eight rotating objective types. The opening chapter previously began at 500 points and 20 moves, with objective difficulty staying flat across the first seven levels.
- Raised the first-level score target to 650 and set a smoother opening score progression through level 20 (ending at 6,500). Reduced the opening move budget to 18, then increased it gradually to 28 by level 20.
- Kept the established objective scaling rules intact after regression review; added regression coverage for the opening eight objective targets and move budgets.
- Browser and Android WebView game engines and service workers are updated together; offline cache advanced from v6 to v7.
- Preserved the 8×8 board, connect-not-swap and diagonal path rules, crop roster, save/checkpoint format, boosters, achievements, endless level support, Android identity and offline operation.
- Validation pending on this PR: gameplay/security regression suite, browser phone/tablet visual QA, Android debug/APK and release-candidate asset-parity workflows. No physical-device test is claimed.

- CI correction: keep the established objective scaling bands intact; the opening challenge is rebalanced through score goals and move budgets, not by unexpectedly changing unrelated objective progression. Browser soak now reads the current displayed level before checking its restart move budget.


## Stage 6 corrective follow-up — validation required

- PR #83 was automatically merged by GitHub as `6762dfa27c5e2fa0442f83c4d508b3604fc8a876` before its failing checks were resolved. Its checks did fail; this is not a verified release.
- Corrective branch restores the established objective scaling formula while retaining the new opening score goals and move budgets.
- Browser long-session QA now derives the expected restart move count from the currently displayed level, rather than assuming the player is still on level 1 after earlier gameplay interactions.
- Browser and Android WebView game engines remain byte-identical. Corrective PR and fresh CI validation are required before Stage 6 can be considered complete.


## Stage 8 — research-led viewport-fitted gameplay HUD (in review)

- Audit found the previous focus-play layout could still allow the 8×8 board or action dock to extend beyond the visible phone viewport. The game had no reliable compact-phone fit assertion.
- Research applied: Apple WWDC24 game UI advice to anchor interface zones and respect safe areas; Android adaptive-layout guidance to reflow and use panes; Roblox adaptive-design guidance to move secondary actions into collapsible menus. The resulting play screen prioritises the board, persistent score/goal/moves, the primary objective and a fixed touch dock.
- Phones use a bounded one-column HUD; tablets/wider screens use a two-pane board + side-HUD composition. The visual refresh uses a sunny Zimbabwe countryside palette and warm harvest card while preserving the crop tile artwork.
- Secondary features remain in More; the optional bonus mission continues tracking but does not consume permanent active-play space.
- Browser and Android WebView CSS/HTML/service-worker assets remain byte-identical; gameplay engine and save format are unchanged. Offline cache is v9.
- Browser QA now includes compact phone, standard phone, tablet portrait, tablet landscape and wide landscape viewport checks for no document scrolling, full board visibility and visible action controls. These are browser tests, not physical-device tests.


## Stage 9 — portrait-tablet board fit and primary action dock

- Follow-up to merged research-led PR #90 (`ab1006320cb8c9eff4f1d0567ab7088122bad443`). Review of its actual Chromium screenshots showed the tablet portrait and landscape HUDs left too much unused space around a 496px / 408px board, while phone play still used a five-action two-row dock.
- Portrait phones and portrait tablets now use a board-first single-column layout. On the 800×1280 tablet profile the square field can use nearly the full available width; the bonus mission remains visible in the expanded portrait-tablet HUD.
- Landscape tablets keep a side-HUD composition and get a larger square field. Four frequently used actions stay in the primary dock; Fresh Field and Focus Play move into More.
- Browser and Android WebView markup/styles/service workers remain byte-identical. Offline cache advances from v9 to v10.
- Browser QA checks 360×640, 390×844, 800×1280, 1024×768, 1280×720 and 844×390. It asserts no document scrolling, zero scroll offset, square board geometry, full board visibility, a single portrait action row and touch targets of at least 40px. Long-session QA no longer scrolls the board into view.
- Verified on the latest main commit `5b02a8c38d33b6f1bfff89d0b4f0d9a7b3510578`: gameplay checks (112/112), Android debug APK, unsigned release APK/AAB candidate, browser visual QA and GitHub Pages deployment all passed (runs `42980311176`, `42980311520`, `42980311256`, `42980311210`, `42980310796`). The release workflow confirmed package `com.maizecrush.zimbabweharvest`, version `1.0.0` / code 1, min SDK 24, target SDK 36 and label `Maize Crush`. The temporary CI key smoke test verified APK/AAB signing; it is not the user's release key. Browser QA is not a physical-device test, and the optional emulator diagnostic was skipped.


## Stage 10 — Android release metadata and launcher asset regression guards (verified and merged)

- PR [#95](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/95) was squash-merged to `main` on 2026-11-12 as `1c9fcce3140068fa6c777f073adaae792f1b62e1`; PR head: `40990818c838b7010569bdfa6365ce9023f59aee`.
- Added `tests/android-release-metadata.test.js` to protect namespace/application ID, positive version code and semantic version name, min/target/compile SDK levels, release-checklist consistency, release workflow metadata assertions, adaptive and legacy launcher icon references, and the current offline-only permission surface.
- The increment is test-only: no gameplay behavior, Android identity, manifest permissions, art, saved data, signing credentials or release outputs were changed.
- Exact PR-head validation passed: **115/115 tests** (run `43034463824`), Android APK (run `43034463720`), unsigned release candidate (run `43034463632`), and browser visual QA (run `43034464032`). The first browser attempt failed while Ubuntu apt mirrors temporarily failed DNS resolution; only the failed browser job was rerun, and the retry passed. Optional emulator diagnostics were skipped.
- All five post-merge workflows passed on exact main commit `1c9fcce3140068fa6c777f073adaae792f1b62e1`: gameplay/security checks **115/115** (run `43226069827`), Android debug APK (run `43226070085`), unsigned release candidate (run `43226070058`), browser visual QA (run `43226070219`), and GitHub Pages deployment (run `43226069808`).
- Verified post-merge artifacts: Android debug APK (73,797 bytes; [workflow](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/43226070085)), unsigned release APK/AAB candidate bundle (121,070 bytes; [workflow](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/43226070058)), and browser QA screenshots/results (3,378,619 bytes; [workflow](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/actions/runs/43226070219)).
- Browser results on 390×844 mobile and 1024×768 tablet confirmed mismatched drags are rejected without swapping or spending a move, diagonal three-crop connections work and score 30 points, and 20 harvests complete per profile. The responsive viewport checks reported zero page scroll. This is Chromium/shared-asset evidence, not physical Android hardware testing.
- The release workflow built the APK/AAB and verified them with a temporary CI smoke-test key. That key is disposable and is not the user's production signing identity; release outputs remain unsigned for the user.

## Recent mainline gameplay increments — verified

- PR [#101](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/101) raised primary gameplay touch-target checks to 44px; merge commit 5a7140d0614880ac80ed61823063fbb8b88dc077.
- PR [#102](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/102) introduced mixed multi-goal harvest objectives; merge commit c201919af5ab5d7ee56b232b9b58bf1248a34842.
- PR [#103](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/103) added marked delivery plots as level tasks; merge commit 8cbf8d5831e12b3b8578352c7a944d81422528fa.
- PR [#104](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/104) added ordered harvest-delivery routes; out-of-order stops are rejected and route state is normalized on restore. Merge commit 641f5b40aff2e8a08f5b7dd42a6af2e301ddbfe6.
- Mainline validation on 641f5b40aff2e8a08f5b7dd42a6af2e301ddbfe6 passed 124/124 tests, Android APK, unsigned release candidate, browser visual QA and Pages deployment (runs 43287518137, 43287518198, 43287518251, 43287518104, 43287517268).

## Current next milestone

Complete physical Android WebView validation on a modest/older phone and a current phone or tablet, then profile low-memory and long-session performance. Continue checking all eight base objective families, mixed multi-goal combinations and ordered delivery routes, endless progression, backup/restore, background/process recovery, rotation, TalkBack and hardware-keyboard behavior where available. Browser/CI results do not replace physical-device testing. Keep release signing and publication blocked until all release-readiness gates pass and the user supplies credentials and explicit authorization.


## Stage 11 — shorter viewport and browser-chrome fit correction

- Research reviewed: Apple HIG Layout and WWDC24 game-interface guidance recommend anchoring HUD zones instead of scaling the entire interface, preserving comfortable control sizes, respecting safe areas and adapting to the actual available window size. Unity's multi-resolution guidance similarly recommends validating multiple aspect ratios and resolutions.
- Audit finding: Stage 9 validated a full 800×1280 portrait tablet viewport but did not include shorter 800px-wide portrait windows that occur when browser/system chrome or split-screen reduces the usable height. Its tablet board sizing was based on viewport width and a 360px height allowance, leaving insufficient headroom on shorter windows.
- Correction: introduce a compact portrait-tablet breakpoint for available heights up to 1199px. It reduces only secondary spacing and board dimensions; primary actions retain at least 44px targets, and the board remains square.
- QA now adds 800×1100 and 800×1024 tablet windows, checks document and body scroll heights, shell bounds, every visible HUD region (level, stats, objective, mission, board heading, board, feedback and action dock), overlap, clipping, square-board geometry and minimum action-target height. Viewport screenshots are captured at the actual viewport size rather than full-page.
- Browser and Android WebView styles remain byte-identical; service worker cache advances v10 → v11. No game logic, connect rules, progression, boosters, saves, art identity or offline behavior changes.
- Verification carried into mainline: browser QA checks 800×1100 and 800×1024 short portrait windows, full HUD bounds, overlap, square-board geometry and 44px actions. The current mainline browser QA run 43432187316 passed. This remains Chromium evidence, not physical Android hardware testing.

## Stage 16 — keyboard connect-path accessibility (verified and merged)

- Audit found that the help text advertised arrow-key navigation and Enter-to-connect, but the second keyboard-generated activation was rejected: the click handler treated the in-progress keyboard path as an active pointer drag.
- Corrected the click guard to block clicks while a real pointer is captured (activePointerId), while allowing keyboard-generated button clicks to extend the same connect path. Browser and Android WebView game.js remain byte-for-byte identical.
- Advanced the offline shell cache from v15 to v16 and mirrored the service worker into Android assets so existing offline installs refresh the keyboard fix.
- Browser QA now exercises both compact mobile (390×844) and tablet (1024×768): arrow keys + Enter must reject a mismatched crop without swapping tiles or spending a move, then complete a valid diagonal three-crop path, increase the score by 30 and spend exactly one move. Each profile also completed the existing 20-harvest long-session soak.
- PR #105 passed 126/126 tests on head 33e03396d964485e76e80f47b5358fc2cbdd0186 (run 43431877822), plus Android APK (run 43431877728), unsigned release candidate (run 43431877725) and browser visual QA/debug APK (run 43431877778).
- PR #105 was squash-merged to main as 732344c1345d128b9023be0c3c76bdb5dfeca16c. All five post-merge workflows passed on that exact commit: gameplay tests 126/126 (43432186967), Android APK (43432186959), unsigned release candidate (43432186891), browser visual QA/debug build (43432187316) and Pages deployment (43432186102).
- Verified mainline artifacts: Android debug APK, 76,260 bytes (workflow 43432186959); unsigned APK/AAB release candidate bundle, 125,008 bytes (workflow 43432186891); browser screenshots/results, 4,380,272 bytes (workflow 43432187316). These artifacts are build/QA evidence, not a signed public release.
- The optional emulator diagnostic was skipped. Browser keyboard checks do not replace testing with an external keyboard, TalkBack or touch gestures on physical Android devices. No production signing credentials were added, and no signing or publishing was performed.
- Next milestone: physical-device validation of the full objective/progression set and modest-device performance before considering release signing.

## 3D Zimbabwe Harvest Trail — authored terrain and rural settlement

- PR [#129](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/129) was merged to `main` as `1f78573795b2ac5482b18dece1e24ce4a7f89cb2`. Its Blender source builds a sculpted Zimbabwe countryside, continuous winding asphalt road and red-earth shoulders, raised centre markings, granite kopjes, msasa trees and cultivated field plots. The resulting GLB is generated in CI and mirrored byte-for-byte into Android WebView assets; the Babylon.js road map uses physical level gates on the terrain.
- PR [#130](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/130) adds a Blender-authored rural settlement model: two differently sized homes with plaster walls, corrugated roofs and verandas; a round grain store; elevated water tank; community borehole; kraal fencing; kitchen garden; firewood stack and washing line. Two instances are positioned against the sculpted terrain. The remaining procedural roadside houses and placeholder river tube are removed.
- The settlement GLB is generated from `scripts/build_harvest_world_settlement.py` in the Android, release-candidate, signed-release and web/browser workflows. Geometry is batched by material with a maximum 12-mesh budget, checked for valid GLB structure and byte-identical web/Android copies, and added to offline service-worker cache v26.
- At code head `a57be07f9167aa51f689acc1025dd2edb2205045`, PR #130's gameplay checks, Android debug APK, unsigned release candidate and browser visual QA all completed successfully (runs `43602439356`, `43602439367`, `43602439347`, `43602439361`). The optional emulator diagnostic was skipped. README art direction now explicitly calls for authentic Zimbabwean homesteads while avoiding cartoon/stereotyped hut clip-art.
- This is CI/browser evidence only. Physical Android WebView, low-memory performance and sustained play on modest devices remain release gates. Production signing credentials have not been added; no signing or publishing is authorized.
- Visual review of the PR #130 browser artifact showed that the settlement GLBs loaded but their roadside buildings were too far from the mobile camera framing to read clearly. PR #130 remains open while the homesteads are repositioned beside the road, the camera is made to follow the active level without zooming out, and browser QA asserts camera travel, stable radius and settlement proximity. Revalidate and merge only when all required checks pass on the exact updated head.


## 3D Harvest Trail visual framing correction — in progress

- Inspected PR #130's actual browser screenshots from artifact `14116892735` at 390×844 and 1024×768. The terrain and winding road rendered, and the settlement GLBs loaded, but the homes were outside the useful mobile camera framing. A green CI result alone was not enough to accept the requested real-house presentation.
- The camera's previous `setTarget` path rebuilt its radius/angles from the old fixed camera position. Focusing a later level could therefore zoom out rather than travel along the road. The correction preserves alpha/beta/radius while animating or setting the target, so camera position follows the active level.
- The Blender-authored farmstead and two settlement instances are being moved to roadside positions near levels 1–3. Browser QA will verify that focusing level 3 moves camera position and target together, preserves the 39-unit radius, and places an authored settlement within 18 world units of the selected gate; it also captures the phone/tablet settlement views.
- Previous documentation-aligned PR head `a9d1b55c7522f5a7281425119a2f9cf4297740a1` passed 141/141 gameplay tests, Android debug APK, unsigned release candidate and browser visual QA. Those checks predate this framing correction and are not evidence for the new code.
- Next step: run the full PR workflows on the framing-fix commit, inspect the refreshed screenshots, then merge PR #130 only if the houses are visibly framed and every required check passes. Physical Android and modest-device validation remain release gates.
