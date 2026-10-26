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

## Next 50-step harvest upgrade batch

1. Add a browser-app manifest. 2. Define standalone display mode. 3. Define portrait orientation. 4. Add app theme metadata. 5. Add an installable app icon. 6. Explain offline play. 7. Add a connection-status label. 8. Add a first-run tutorial. 9. Explain connect-not-swap controls. 10. Explain diagonal matching. 11. Explain Golden Harvest. 12. Explain Harvest Storm. 13. Explain booster costs. 14. Add move undo. 15. Restore the previous board. 16. Restore the previous score. 17. Restore the previous move count. 18. Disable undo during animations. 19. Add native score sharing. 20. Add clipboard fallback. 21. Add a settings dialog. 22. Add a local privacy note. 23. Add high-contrast preference styling. 24. Add larger text styling. 25. Add light-theme styling. 26. Preserve dark theme as default. 27. Add keyboard-friendly buttons. 28. Add deterministic random generator. 29. Add reproducible seeded boards. 30. Add playable board generation. 31. Avoid initial horizontal matches. 32. Avoid initial vertical matches. 33. Guarantee a legal connected chain. 34. Add board validation. 35. Add board cloning. 36. Add crop-count statistics helper. 37. Add board summary helper. 38. Add combo scoring helper. 39. Add level-star helper. 40. Add safe save normalization. 41. Bound imported level data. 42. Sanitize numeric stats. 43. Filter malformed records. 44. Add seeded-board tests. 45. Add dead-board recovery tests. 46. Add validation tests. 47. Add scoring tests. 48. Keep browser and Android assets synchronized. 49. Keep Android gameplay offline. 50. Document local-only progress and privacy.
