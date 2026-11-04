# Maize Crush development status

Last reviewed: 2026-11-04

## Current state

- Default branch: `main` (latest verified commit `580aff574436c921d7dcbd247fc56cf46cc5cb69`).
- Active QA branch: `test/android-emulator-launch-smoke`.
- Pull request: [#67 — Android emulator launch smoke test](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/67), open and not merged.
- Current branch head at this review: `f122c6d5cf541d7de672bf82f5f6942a5847c529` on `test/android-emulator-launch-smoke` (status documentation commit). Feature code and animation parity tests are at `ca664cb27e6f820267f3ad16b0daee09c3d5e260`. Recent commits add original SVG crop art, Android offline asset parity, crop sprite tests, staggered falling/refill animations, and a clearer harvest-clear effect. The PR remains open and unmerged.
- Android identity: `com.maizecrush.zimbabweharvest`, version `1.0.0`, min SDK 24, target SDK 36.

## Verified functionality and CI

- Core gameplay is path-based crop connecting, not tile swapping: 3+ matching crops, adjacent cells, diagonals allowed.
- Existing endless progression, eight rotating objective types, local progress/checkpoints, boosters, accessibility settings, and responsive phone/tablet board remain in the project.
- Baseline QA on commit `3eebaa07ff967d5f6553d111f2371430cc262725`: 92 gameplay regression tests passed; Android debug and release-candidate builds passed; compact-phone and tablet runtime smoke passed (run `41844446297`).
- Latest default-branch Android APK workflow passed on `580aff574436c921d7dcbd247fc56cf46cc5cb69` (run `41867237656`).
- The latest UI helper regression suite passed on code commit `984b4a4f500e1460f3c2742d19979342572c0406` (run `41901804881`).
- The UI matrix failure on run `41854660950` was traced to a harness false positive: UIAutomator clips partially off-screen nodes to viewport edges, making a partially visible square tile appear to have a 4.3:1 aspect ratio. The captured emulator screenshot showed the page scroll position at the top edge of the board; the app had launched and no crash was reported.
- Corrected the harness to select the scroll snapshot with the most fully visible cells, then validate tile proportions and grid order only for cells not clipped by the viewport. Added regression tests for clipped accessibility bounds.
- A first regression run on intermediate commit `ed56165c809ef3a32b34420df0404ed44942a22d` exposed an ordering assertion that still included clipped cells; corrected that in `984b4a4f500e1460f3c2742d19979342572c0406`.

## Latest device-smoke diagnosis and changes

- Latest branch-head checks on `9c5c2eba7c045011c307a5b4efdfd3f2e57b52f4`: gameplay/helper checks passed, Android release-candidate build passed, but both compact-phone and tablet runtime smoke jobs failed (workflow run `41901970889`).
- The tablet failure was caused by the smoke helper swiping at x=2, inside Android's left-edge gesture region; the page never scrolled down to bring the crop grid into view. The captured screenshot showed the game itself launched normally and the board began below the fold.
- The compact-phone gesture test accepted a valid diagonal connection (moves 20→19), then ADB became temporarily offline while the helper attempted an optional diagnostic screenshot. Screenshot capture now retries device readiness and is non-fatal so it cannot invalidate a successful gameplay assertion.
- Updated both scroll directions to use the outer right gutter, outside the Android left-edge gesture area and outside the crop board. Added three focused unit tests for gutter selection, forward/backward swipe coordinates, and optional screenshot failure handling.
- Code commits for this cycle: `aa6f26bbfd1e985739434a96ae4514933a9f20de` and `ca16235371d3c2fd479d7df6e6e961c27c31619e`. CI triggered automatically on the pull request; conclusions must be refreshed before claiming success.

## Release work still required

- Physical-device testing on Android 7+, current Android versions, compact phones, and tablets; emulator tests are not a substitute.
- Hands-on validation of drag/diagonal input, objectives, progression beyond level 100, backup/restore, rotation, pause/resume, sound/vibration, and accessibility.
- Performance review on lower-memory/slower Android hardware.
- Review app identity, launcher icon, screenshots, permissions, privacy policy, store disclosures, and current store requirements.
- The user's own release keystore must remain private and must never be committed. Do not sign or publish without explicit authorization.

## Original crop-art milestone

- Added `crop-art.svg`, a lightweight original six-symbol vector sprite sheet: maize, tomato, groundnut, banana, orange, and sweet potato. It uses hand-authored vector paths and gradients; no third-party game art or copied Candy Crush assets.
- Updated board rendering to use scalable SVG sprite symbols rather than emoji glyphs, preserving accessible crop names and the existing 8×8 path-connecting mechanics.
- Added responsive sprite sizing and selected/clearing visual states; reduced-motion preference is respected.
- Mirrored the sprite sheet, renderer, CSS, and service worker into Android WebView assets. Bumped the offline shell cache to v3 and precached `crop-art.svg` so the new art is available offline.
- Added tests for all six sprite symbols and browser/Android asset parity.
- Earlier CI failures were fixed: the service-worker cache assertion was updated for v3, and the sprite test's invalid regular expression was replaced with literal path checks. On commit `9c4a44593467c6052d7c6b7d9aed9e33dc08792f`, gameplay checks and APK workflow passed; release-candidate and device smoke workflows were still running at the time of review. A later release-candidate run on `86feda6686a96b3c68f0c5d9c3200b6a10539a57` failed during the emulator phase; investigate the current run before treating it as a product failure.

## Harvest and refill animation milestone (in progress)

- Improved harvest clearing with a quicker shrink/fade and a warm highlight, while retaining the special-clear effect.
- Refill tiles now animate downward into the board with a small stagger by row and column, giving the player a visible falling-crop response after a successful connection or booster.
- The animation honours the reduced-motion preference; Android WebView CSS and renderer files are kept byte-for-byte aligned with browser files.
- Added tests/crop-animation.test.js to check browser/Android asset parity, falling animation, clear state, and reduced-motion handling.
- Commits: 857380f2e8000b6689f9fb2d0af57fe1385c2f3f, 51701665aca6b2fe9f93a024d5840a12586067dd, 1b6aa73ffea10ef53a4de54873d204a737d581da, a04b2baec61e3ee0651991c50c748e751df56065, ca664cb27e6f820267f3ad16b0daee09c3d5e260.
- CI runs for the animation changes were triggered on commit 1b6aa73ffea10ef53a4de54873d204a737d581da; the newer test-file commit is at ca664cb27e6f820267f3ad16b0daee09c3d5e260. Recheck Actions for the newest SHA before claiming validation.

## Next milestone

Verify animation tests, Android debug/release builds, and compact-phone/tablet runtime tests. Then add optional original sound effects with a clear in-game mute control. Physical-device testing remains a separate release gate.
