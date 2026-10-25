# Maize Crush — Zimbabwe Harvest 🌽

An original, mobile-friendly HTML5 puzzle game inspired by Zimbabwean crops and harvests.

## Gameplay

- **Connect, don't swap.** Touch a crop and drag through matching neighbours.
- Connect at least three of the same crop in one continuous chain.
- Horizontal, vertical, and diagonal connections are allowed.
- Release to harvest the chain, earn points, and refill the field.
- Reach the level goal before your moves run out.
- Progress, best score, achievements, and daily challenge completion are saved locally on the device. Daily challenge goals change by date and work offline.

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
