# Maize Crush development status

Last reviewed: 2026-11-04

## Current state

- Default branch: `main` (latest verified commit `580aff574436c921d7dcbd247fc56cf46cc5cb69`).
- Active QA branch: `test/android-emulator-launch-smoke`.
- Pull request: [#67 — Android emulator launch smoke test](https://github.com/tapiwanashemanyonga-gif/Maize-Crush/pull/67), open and not merged.
- Latest branch head before this cycle: `9c5c2eba7c045011c307a5b4efdfd3f2e57b52f4`; this cycle's code commits: `aa6f26bbfd1e985739434a96ae4514933a9f20de` and `ca16235371d3c2fd479d7df6e6e961c27c31619e`.
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

## Next milestone

Verify the updated compact-phone/tablet runtime gesture matrix and all Android builds on the latest branch head. Once that passes, move to the first substantial visual-content milestone: original illustrated Zimbabwean crop sprites, animated harvest effects, and audio feedback. Physical-device testing remains a separate release gate.
