#!/usr/bin/env node
"use strict";

// Browser-based visual and interaction QA for the same HTML/JS assets bundled
// into the Android WebView. This deliberately does not boot an Android emulator.

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "artifacts", "browser-visual-qa");
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const errors = [];
let serverProcess;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startServer() {
  serverProcess = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: ROOT,
    stdio: "ignore"
  });
  return (async () => {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const response = await fetch(BASE_URL);
        if (response.ok) return;
      } catch (_) {
        await wait(250);
      }
    }
    throw new Error("Local game web server did not become ready.");
  })();
}

async function getBoardState(page) {
  return page.locator("#game-board .crop-tile").evaluateAll(tiles =>
    tiles.map(tile => ({
      row: Number(tile.dataset.row),
      col: Number(tile.dataset.col),
      label: tile.getAttribute("aria-label") || "",
      box: (() => {
        const rect = tile.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })(),
      visible: (() => {
        const rect = tile.getBoundingClientRect();
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        return x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight;
      })()
    }))
  );
}

function cropName(label) {
  return label.replace(/, row \d+, column \d+$/i, "").trim();
}

function findDiagonalTriple(tiles) {
  const byPosition = new Map(tiles.map(tile => [tile.row + "," + tile.col, tile]));
  for (const tile of tiles) {
    for (const dc of [-1, 1]) {
      const path = [
        tile,
        byPosition.get((tile.row + 1) + "," + (tile.col + dc)),
        byPosition.get((tile.row + 2) + "," + (tile.col + 2 * dc))
      ];
      if (path.every(tile => tile && tile.visible) &&
          cropName(path[0].label) === cropName(path[1].label) &&
          cropName(path[1].label) === cropName(path[2].label)) return path;
    }
  }
  return null;
}

function findMismatchPair(tiles) {
  const byPosition = new Map(tiles.map(tile => [tile.row + "," + tile.col, tile]));
  for (const tile of tiles) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const other = byPosition.get((tile.row + dr) + "," + (tile.col + dc));
      if (other && tile.visible && other.visible && cropName(tile.label) !== cropName(other.label)) return [tile, other];
    }
  }
  return null;
}

async function dragPath(page, tiles, verifySelection = false) {
  await page.mouse.move(tiles[0].box.x, tiles[0].box.y);
  await page.mouse.down();
  if (verifySelection) {
    await page.waitForFunction(
      () => document.querySelectorAll("#game-board .crop-tile[aria-pressed='true']").length === 1,
      null,
      { timeout: 5000 }
    );
  }
  for (let index = 1; index < tiles.length; index++) {
    const tile = tiles[index];
    await page.mouse.move(tile.box.x, tile.box.y, { steps: 10 });
    if (verifySelection) {
      const expectedLength = index + 1;
      await page.waitForFunction(
        expected => document.querySelectorAll("#game-board .crop-tile[aria-pressed='true']").length === expected,
        expectedLength,
        { timeout: 5000 }
      );
    }
  }
  await page.mouse.up();
}

async function runViewport(browser, profile, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: profile === "mobile",
    hasTouch: profile === "mobile"
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(profile + ": " + error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(profile + " console: " + message.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem("maize-crush-tutorial-seen", "true");
  });
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("#game-board .crop-tile").first().waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length === 64);

  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    boardWidth: document.querySelector("#game-board").getBoundingClientRect().width,
    boardHeight: document.querySelector("#game-board").getBoundingClientRect().height
  }));
  if (dimensions.documentWidth > dimensions.viewportWidth + 2) {
    throw new Error(profile + " layout overflows horizontally: " + JSON.stringify(dimensions));
  }
  if (!(dimensions.boardWidth > 0 && dimensions.boardHeight > 0)) {
    throw new Error(profile + " crop board has no visible dimensions.");
  }

  await page.screenshot({
    path: path.join(OUTPUT, profile + "-initial.png"),
    fullPage: true,
    animations: "disabled"
  });

  // Put the board in the viewport before sending pointer gestures. On tablet
  // layouts the complete page is taller than the browser viewport.
  await page.locator("#game-board").scrollIntoViewIfNeeded();
  await wait(100);

  // Verify a mismatched drag never swaps crops or consumes a move.
  let tiles = await getBoardState(page);
  const mismatch = findMismatchPair(tiles);
  if (!mismatch) throw new Error(profile + " could not find a mismatched adjacent crop pair.");
  const beforeMismatch = tiles.map(tile => tile.label);
  const movesBeforeMismatch = Number(await page.locator("#moves-value").innerText());
  await dragPath(page, mismatch);
  await wait(150);
  const afterMismatch = await getBoardState(page);
  const movesAfterMismatch = Number(await page.locator("#moves-value").innerText());
  if (movesAfterMismatch !== movesBeforeMismatch) {
    throw new Error(profile + " mismatched drag incorrectly consumed a move.");
  }
  if (afterMismatch.map(tile => tile.label).join("|") !== beforeMismatch.join("|")) {
    throw new Error(profile + " mismatched drag changed or swapped crop tiles.");
  }

  // Exercise a real diagonal three-crop connection on the rendered game board.
  tiles = await getBoardState(page);
  let diagonal = findDiagonalTriple(tiles);
  for (let attempt = 0; !diagonal && attempt < 10; attempt++) {
    await page.locator("#shuffle-button").click();
    await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length === 64);
    tiles = await getBoardState(page);
    diagonal = findDiagonalTriple(tiles);
  }
  if (!diagonal) throw new Error(profile + " could not generate a diagonal matching triple after 10 fresh fields.");
  const scoreBefore = Number((await page.locator("#score-value").innerText()).replace(/,/g, ""));
  const movesBefore = Number(await page.locator("#moves-value").innerText());
  await dragPath(page, diagonal, true);
  await page.waitForFunction(
    previous => Number(document.querySelector("#moves-value").textContent) === previous - 1,
    movesBefore,
    { timeout: 5000 }
  );
  await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length === 64);
  const scoreAfter = Number((await page.locator("#score-value").innerText()).replace(/,/g, ""));
  if (scoreAfter <= scoreBefore) throw new Error(profile + " valid diagonal connection did not increase the score.");

  // Check that the hint and settings controls remain operable.
  await page.locator("#hint-button").click();
  await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile.hinted").length >= 3);
  await page.locator("#settings-button").click();
  await page.locator("#settings-dialog").waitFor({ state: "visible" });
  await page.locator("#settings-close").click();
  await page.locator("#settings-dialog").waitFor({ state: "hidden" });

  await page.screenshot({
    path: path.join(OUTPUT, profile + "-after-interactions.png"),
    fullPage: true,
    animations: "disabled"
  });

  await context.close();
  return { profile, ...dimensions, mismatchRejected: true, diagonalConnection: true, scoreBefore, scoreAfter };
}

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const results = [];
  let browser;
  try {
    await startServer();
    browser = await chromium.launch({ headless: true });
    results.push(await runViewport(browser, "mobile", { width: 390, height: 844 }));
    results.push(await runViewport(browser, "tablet", { width: 1024, height: 768 }));
    if (errors.length) throw new Error("Browser console errors detected:\n" + errors.join("\n"));
    fs.writeFileSync(path.join(OUTPUT, "results.json"), JSON.stringify({ passed: true, results, errors }, null, 2));
    process.stdout.write(JSON.stringify({ passed: true, results }, null, 2) + "\n");
  } catch (error) {
    fs.writeFileSync(path.join(OUTPUT, "results.json"), JSON.stringify({
      passed: false, results, errors, failure: error.stack || error.message
    }, null, 2));
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill("SIGTERM");
  }
})();
