# Maize Crush — Zimbabwe Harvest 🌽

An original, mobile-friendly HTML5 puzzle game inspired by Zimbabwean crops and harvests.

## Gameplay

- **Connect, don't swap.** Touch a crop and drag through matching neighbours.
- Connect at least three of the same crop in one continuous chain.
- Horizontal, vertical, and diagonal connections are allowed.
- Release to harvest the chain, earn points, and refill the field.
- Reach the level goal before your moves run out.
- Progress is saved in your browser using local storage.

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

First playable prototype: responsive 8×8 board, pointer/touch drag selection, diagonal connections, scoring, moves, level goals, restart, fresh-field shuffle, saved unlocked level, and automated rules tests.

This is an early prototype. Sound, special boosters, richer animations, accessibility polish, and a complete level map are future improvements.
