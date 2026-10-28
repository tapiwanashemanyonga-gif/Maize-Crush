# Maize Crush — Zimbabwe Harvest 🌽

An original, mobile-friendly HTML5 puzzle game inspired by Zimbabwean crops and harvests.

## Gameplay

- **Connect, don't swap.** Touch a crop and drag through matching neighbours.
- Connect at least three of the same crop in one continuous chain. A four-crop chain triggers a Seed Burst in a nearby 3×3 area; five or six trigger Golden Harvest; seven or more trigger Harvest Storm.
- Horizontal, vertical, and diagonal connections are allowed.
- Release to harvest the chain, earn points, and refill the field.
- Reach the level goal before your moves run out.
- Progress, best score, achievements, daily challenge completion, and each level’s best star rating are saved locally on the device. Earn one, two, or three stars by reaching the goal, 125% of the goal, or 175% of the goal. Replay a level to improve its saved rating. Stable round checkpoints also let you resume your current board, score, moves, and once-per-round boosters after closing or refreshing the game. Invalid or out-of-date checkpoints are safely discarded. Daily challenge goals change by date and work offline.

Crops: maize, tomatoes, groundnuts, bananas, oranges, and sweet potatoes.

## Play locally

This is a static browser game with no build step. Open `index.html` in a modern browser, or serve the folder with any static file server.

## Automated checks

Requires Node.js 20 or newer.

```sh
npm test
```

GitHub Actions runs the gameplay-rule tests on pushes and pull requests to `main`.

## GitHub Pages

The repository is structured as a static site and includes a root `index.html`. To publish it, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save. GitHub Pages publishes static HTML, CSS, and JavaScript from a repository. See the [GitHub Pages guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Current milestone

Current features: responsive 8×8 board, touch drag selection, diagonal connections, cascades, Golden Harvest and Harvest Storm specials, offline sound effects, vibration feedback where supported, persistent best score, level map, daily challenges, and local achievements, and a one-use-per-round Fertilizer Boost, a one-use Rain Shower that clears a 3×3 patch, free hints, automatic recovery when a board has no legal chain, lifetime statistics, per-level best scores, persistent sound settings, and ten achievements.

## Android APK

The Android app wraps the same game in a local WebView and bundles the HTML, CSS, and JavaScript in the APK. Gameplay therefore works offline and does not require the GitHub Pages website or a network connection. The Android package ID is `com.maizecrush.zimbabweharvest` (minimum Android version: Android 7.0 / API 24).

Every push to `main` runs the Android APK workflow. When the run succeeds, open **Actions → Maize Crush Android APK → Artifacts** and download `maize-crush-android-debug-apk`. The ZIP contains an installable debug APK for testing; it is not a signed Play Store release. A release-signed APK/AAB can be configured separately when preparing for distribution.

The Android wrapper uses the bundled local assets and system fonts so the game does not depend on external fonts or web hosting.

## Next 50-step harvest upgrade batch

1. Add a browser-app manifest. 2. Define standalone display mode. 3. Define portrait orientation. 4. Add app theme metadata. 5. Add an installable app icon. 6. Explain offline play. 7. Add a connection-status label. 8. Add a first-run tutorial. 9. Explain connect-not-swap controls. 10. Explain diagonal matching. 11. Explain Golden Harvest. 12. Explain Harvest Storm. 13. Explain booster costs. 14. Add move undo. 15. Restore the previous board. 16. Restore the previous score. 17. Restore the previous move count. 18. Disable undo during animations. 19. Add native score sharing. 20. Add clipboard fallback. 21. Add a settings dialog. 22. Add a local privacy note. 23. Add high-contrast preference styling. 24. Add larger text styling. 25. Add light-theme styling. 26. Preserve dark theme as default. 27. Add keyboard-friendly buttons. 28. Add deterministic random generator. 29. Add reproducible seeded boards. 30. Add playable board generation. 31. Avoid initial horizontal matches. 32. Avoid initial vertical matches. 33. Guarantee a legal connected chain. 34. Add board validation. 35. Add board cloning. 36. Add crop-count statistics helper. 37. Add board summary helper. 38. Add combo scoring helper. 39. Add level-star helper. 40. Add safe save normalization. 41. Bound imported level data. 42. Sanitize numeric stats. 43. Filter malformed records. 44. Add seeded-board tests. 45. Add dead-board recovery tests. 46. Add validation tests. 47. Add scoring tests. 48. Keep browser and Android assets synchronized. 49. Keep Android gameplay offline. 50. Document local-only progress and privacy.

Browser installation: GitHub Pages serves the web app over HTTPS, where the service worker can cache the local game shell for offline browser play.

## Reliability and daily-streak upgrade batch

1. Undo restores lifetime round statistics. 2. Undo restores per-level best records. 3. Undo restores earned achievements. 4. Undo refreshes the achievement counter. 5. Undo restores daily completion history. 6. Undo clears stale completion state. 7. Restart clears an old undo snapshot. 8. Fresh field clears an old undo snapshot. 9. Persisted sound preference updates the visible button. 10. Sound button restores its accessible pressed state. 11. Vibration preference controls fertilizer feedback. 12. Vibration preference controls rain feedback. 13. Add daily challenge completion history. 14. Keep daily completion dates unique. 15. Sort daily completion history consistently. 16. Calculate consecutive daily challenge streaks. 17. Handle a streak completed through yesterday. 18. Detect broken streaks. 19. Award a seven-day daily-harvest achievement. 20. Display daily streak in lifetime statistics. Automated tests cover the new date-history helpers.

## Market Cart and animation upgrades

1. Add a Market Cart row-and-column power-up. 2. Target the most common crop for the power-up anchor. 3. Clear one full row. 4. Clear one full column. 5. Avoid duplicate center-cell scoring. 6. Charge one move per use. 7. Award points per cleared tile. 8. Count Market Cart uses in booster statistics. 9. Respect the saved vibration preference. 10. Add a dedicated Market Mover achievement. 11. Reset the power-up every round. 12. Restore its used state when undoing a move. 13. Disable the button after use. 14. Add button styling. 15. Update the tutorial. 16. Expand the achievement counter. 17. Animate newly rendered crops into the field. 18. Stagger crop animations for a falling-field feel. 19. Respect reduced-motion settings. 20. Test cross selection, tie-breaking and empty boards. Browser and Android assets remain synchronized.


### Endless Harvest progression

- The level map exposes all 100 levels, with future levels locked until progression unlocks them.
- The eight themed worlds cover levels 1–32; level 33 onward uses Endless Harvest.
- Levels 1–20 keep their existing goals and move counts. Later goals increase by 350 points per level, while move counts increase gradually and cap at 38 to keep long-term progression playable.


## Save backup and restore

- Open **Settings** and export a JSON backup of your progress, level bests and stars, achievements, daily challenge history, round checkpoint, and preferences.
- Import a previously exported backup to restore it on this device. The file is validated before saved data is replaced, and the game reloads after a successful import.
- Backups are user-controlled files; they are not uploaded to a server. Keep a copy somewhere safe if you clear browser storage or move to another device.


## Varied level missions

Each non-daily level includes an optional bonus mission that rotates across four objectives: make a chain of five crops, trigger a cascade, perform a special harvest, or complete four harvests. Mission progress is shown separately from the main score goal, so players can still complete a level without being blocked by a difficult bonus objective. Completing a mission awards 100 bonus points once per round. Mission state is included in the validated round checkpoint and undo snapshot; starting or replaying a level resets the mission. Daily Challenge keeps its existing rules and does not use level missions.


## Farm Journal

Open **Farm Journal** to track lifetime crops cleared by type. Counts include ordinary harvests, special clears and cascade clears. Each crop has milestones at 100, 500 and 1,000 cleared. The journal stays on the device, is included in exported save backups, and is restored by undoing the last move.


## Board generation reliability

New rounds retry random board generation to avoid pre-existing line matches and ensure at least one valid crop chain. If repeated random attempts fail, the game now falls back to a deterministic 8×8 pattern with a guaranteed matching diagonal instead of modifying a random board in a way that could accidentally create starting line matches. Automated tests check 100 seeded boards for both conditions.
