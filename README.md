# Maize Crush — Zimbabwe Harvest 🌽

An original, mobile-friendly HTML5 puzzle game inspired by Zimbabwean crops and harvests.

## Gameplay

- **Connect, don't swap.** Touch a crop and drag through matching neighbours.
- Connect at least three of the same crop in one continuous chain. A four-crop chain triggers a Seed Burst in a nearby 3×3 area; five or six trigger Golden Harvest; seven or more trigger Harvest Storm.
- Horizontal, vertical, and diagonal connections are allowed.
- Release to harvest the chain, earn points, and refill the field.
- Complete the level’s primary objective before your moves run out. Procedurally generated levels continue up to JavaScript’s safe-integer limit, with objectives rotating through score targets, collecting a named crop, long chains, cascades, special harvests, and successful connections. Targets scale with progression but use tested difficulty ceilings so endless play does not turn into mathematically impossible score or connection requirements. Score-based star ratings remain as optional mastery rewards.
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

## Offline web app caching

The browser app registers one authoritative service worker (`sw.js`). It caches the game shell for offline play and retires legacy cache versions when the worker updates. The Android WebView loads the bundled assets directly and does not need a service worker. Browser and Android copies of the game and worker are checked for exact parity in release CI.

## GitHub Pages

The repository is structured as a static site and includes a root `index.html`. To publish it, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save. GitHub Pages publishes static HTML, CSS, and JavaScript from a repository. See the [GitHub Pages guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Current milestone

The game includes a responsive 8×8 crop board, pointer-safe drag selection, diagonal chains, cascades, Seed Burst / Golden Harvest / Harvest Storm specials, three one-use-per-round boosters, free hints, undo, daily challenges and streaks, optional bonus missions, primary objectives that rotate through six goal types, an endless paginated, world-by-world journey map with level unlocks and stars, 13 achievements, lifetime statistics, Farm Journal milestones, persistent sound/accessibility preferences, validated save backup/restore, and safe board/cascade recovery. Reduced-motion settings are respected. Browser and Android WebView assets are checked for byte-for-byte parity in CI.

## Android APK

The Android app wraps the game in a local WebView and bundles its HTML, CSS, JavaScript, privacy policy, and supporting assets in the APK. Gameplay works offline and does not require the GitHub Pages website or network access. The Android package ID is `com.maizecrush.zimbabweharvest` (minimum Android version: Android 7.0 / API 24). A custom launcher icon is included.

Every push to `main` runs the debug APK build. The release-candidate workflow also builds an unsigned APK and AAB for validation; those unsigned files are **not distributable releases**. The protected signed-release workflow requires a private keystore supplied through GitHub Actions secrets and verifies APK/AAB signatures. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) before publishing.

The current [privacy policy](privacy-policy.html) describes local save storage and the current lack of ads, analytics, accounts, and game telemetry. Update the policy and store disclosures before adding any future online or monetized features.

## Browser offline play

The browser version registers a service worker on HTTPS hosts such as GitHub Pages. After the game has loaded successfully online once, the service worker caches the game shell and core assets so the game can reopen offline. The service worker checks the network first when available and uses the cached version when offline. A first visit still requires an internet connection.

### Endless Harvest progression

- The level map shows a paginated journey that unlocks as you progress. Procedural levels continue up to JavaScript’s safe-integer limit.
- The eight themed worlds cover levels 1–32; level 33 onward uses Endless Harvest.
- Levels 1–20 keep their existing goals and move counts. Later score goals rise by 100 points per level until a 9,000-point ceiling; crop, chain, cascade, special-harvest, and connection targets also have tested ceilings. Moves increase gradually and cap at 38, so endless progression continues without turning objectives into impossible requirements.


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


## Cascade safety

Cascade chains are capped at ten consecutive cascade resolutions. If another automatic match would exceed the cap, the board is refreshed to a valid playable layout rather than leaving unresolved automatic matches on the board. This prevents an unstable board state while preserving normal scoring and move rules for ordinary play.
