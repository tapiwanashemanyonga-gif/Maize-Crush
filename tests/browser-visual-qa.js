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
  return 
(async () => {
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

async function waitForBoardAnimations(page) {
  await page.waitForFunction(() => {
    const tiles = Array.from(document.querySelectorAll("#game-board .crop-tile"));
    return tiles.length === 64 &&
      tiles.every(tile => tile.getAnimations().every(animation => animation.playState !== "running"));
  }, null, { timeout: 8000 });
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

async function dragPath(page, tiles, verifySelection = false, release = true) {
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
  if (release) await page.mouse.up();
}

function findConnectedTriple(tiles) {
  const byPosition = new Map(tiles.map(tile => [tile.row + "," + tile.col, tile]));
  for (const start of tiles) {
    if (!start.visible) continue;
    const crop = cropName(start.label);
    const visit = (current, path) => {
      if (path.length === 3) return path;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const next = byPosition.get((current.row + dr) + "," + (current.col + dc));
          if (!next || !next.visible || cropName(next.label) !== crop ||
              path.some(item => item.row === next.row && item.col === next.col)) continue;
          const found = visit(next, path.concat(next));
          if (found) return found;
        }
      }
      return null;
    };
    const found = visit(start, [start]);
    if (found) return found;
  }
  return null;
}

async function installLayoutProbe(page) {
  await page.evaluate(() => {
    const probe = {
      active: false,
      tileRectReads: 0,
      boardRectReads: 0,
      boardSelectorCalls: 0
    };
    window.__maizeCrushLayoutProbe = probe;
    const originalRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (...args) {
      if (probe.active) {
        if (this.classList && this.classList.contains("crop-tile")) probe.tileRectReads++;
        else if (this.id === "game-board") probe.boardRectReads++;
      }
      return originalRect.apply(this, args);
    };
    const originalQuery = Element.prototype.querySelector;
    Element.prototype.querySelector = function (selector) {
      if (probe.active && this.id === "game-board") probe.boardSelectorCalls++;
      return originalQuery.call(this, selector);
    };
    const originalQueryAll = Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function (selector) {
      if (probe.active && this.id === "game-board") probe.boardSelectorCalls++;
      return originalQueryAll.call(this, selector);
    };
  });
}

async function useFreshField(page) {
 const open=await page.locator("body").evaluate(body=>body.classList.contains("tools-open"));
 if(!open) await page.locator("#tools-toggle-button").click();
 await page.locator("#shuffle-button").click();
 if(await page.locator("body").evaluate(body=>body.classList.contains("tools-open"))) await page.locator("#tools-toggle-button").click();
}

async function runLongSessionSoak(page, profile) {
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");
  await client.send("HeapProfiler.enable");

  async function measureAfterCollection() {
    await client.send("HeapProfiler.collectGarbage");
    const response = await client.send("Performance.getMetrics");
    const metrics = Object.fromEntries(response.metrics.map(metric => [metric.name, metric.value]));
    return {
      nodes: Math.round(metrics.Nodes || 0),
      jsHeapUsedBytes: Math.round(metrics.JSHeapUsedSize || 0),
      layoutCount: Math.round(metrics.LayoutCount || 0),
      recalcStyleCount: Math.round(metrics.RecalcStyleCount || 0)
    };
  }

  // Start from a known fresh round, then exercise repeated short sessions.
  // Read the current opening move budget from the game engine so the soak stays
  // valid when the difficulty curve is intentionally rebalanced.
  const openingMoves = await page.evaluate(() => { const match = document.querySelector("#level-label").textContent.match(/Level\s+(\d+)/); const level = match ? Number(match[1]) : 1; return window.MaizeCrush.movesForLevel(level); });
  await page.locator("#restart-button").click();
  await page.waitForFunction((expectedMoves) =>
    Number(document.querySelector("#moves-value").textContent) === expectedMoves &&
    Number(document.querySelector("#score-value").textContent.replace(/,/g, "")) === 0 &&
    document.querySelectorAll("#game-board .crop-tile").length === 64,
    openingMoves
  );
  await waitForBoardAnimations(page);
  const baseline = await measureAfterCollection();

  const harvestsPerRound = 2;
  const maxRounds = 20;
  let rounds = 0;
  let harvests = 0;
  let restarts = 0;
  let checkpointBytes = 0;

  while (harvests < 20 && rounds < maxRounds) {
    if (rounds > 0) {
      await page.locator("#restart-button").click();
      await page.waitForFunction((expectedMoves) =>
        Number(document.querySelector("#moves-value").textContent) === expectedMoves &&
        Number(document.querySelector("#score-value").textContent.replace(/,/g, "")) === 0 &&
        document.querySelectorAll("#game-board .crop-tile").length === 64,
        openingMoves
      );
      
      await waitForBoardAnimations(page);
      restarts++;
    }
    rounds++;

    for (let move = 0; move < harvestsPerRound && harvests < 20; move++) {
      let tiles = await getBoardState(page);
      let chain = findConnectedTriple(tiles);
      for (let attempt = 0; !chain && attempt < 10; attempt++) {
        await useFreshField(page);
        await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length === 64);
        
        await waitForBoardAnimations(page);
        tiles = await getBoardState(page);
        chain = findConnectedTriple(tiles);
      }
      if (!chain) throw new Error(profile + " long-session soak could not find a visible matching three-crop path.");

      const movesBefore = Number(await page.locator("#moves-value").innerText());
      const scoreBefore = Number((await page.locator("#score-value").innerText()).replace(/,/g, ""));
      await dragPath(page, chain, true);
      const expectedMoves = movesBefore - 1;
      try {
        await page.waitForFunction(expected => {
          const board = document.querySelector("#game-board");
          const moves = Number(document.querySelector("#moves-value").textContent);
          const score = Number(document.querySelector("#score-value").textContent.replace(/,/g, ""));
          let checkpoint;
          try {
            checkpoint = JSON.parse(localStorage.getItem("maize-crush-round") || "null");
          } catch (_) {
            return false;
          }
          return moves === expected &&
            board.querySelectorAll(".crop-tile").length === 64 &&
            board.querySelectorAll(".crop-tile.clearing").length === 0 &&
            checkpoint && checkpoint.moves === expected && checkpoint.score === score;
        }, expectedMoves, { timeout: 12000 });
      } catch (error) {
        const diagnostic = await page.evaluate(() => {
          let checkpoint = null;
          try { checkpoint = JSON.parse(localStorage.getItem("maize-crush-round") || "null"); } catch (_) {}
          const isOpen = selector => {
            const dialog = document.querySelector(selector);
            return !!dialog && (dialog.open || dialog.hasAttribute("open"));
          };
          return {
            moves: Number(document.querySelector("#moves-value").textContent),
            score: Number(document.querySelector("#score-value").textContent.replace(/,/g, "")),
            tileCount: document.querySelectorAll("#game-board .crop-tile").length,
            clearingCount: document.querySelectorAll("#game-board .crop-tile.clearing").length,
            selectedCount: document.querySelectorAll("#game-board .crop-tile[aria-pressed='true']").length,
            checkpointMoves: checkpoint && checkpoint.moves,
            checkpointScore: checkpoint && checkpoint.score,
            checkpointCompleted: checkpoint && checkpoint.completed,
            completeDialogOpen: isOpen("#level-complete-dialog"),
            failedDialogOpen: isOpen("#level-failed-dialog"),
            message: document.querySelector("#game-message")?.textContent || ""
          };
        });
        throw new Error(profile + " long-session harvest " + (harvests + 1) +
          " did not settle at " + expectedMoves + " moves: " + JSON.stringify(diagnostic) +
          ". " + error.message);
      }

      const state = await page.evaluate(() => {
        const checkpoint = JSON.parse(localStorage.getItem("maize-crush-round") || "null");
        const complete = document.querySelector("#level-complete-dialog");
        const failed = document.querySelector("#level-failed-dialog");
        const isOpen = dialog => !!dialog && (dialog.open || dialog.hasAttribute("open"));
        return {
          score: Number(document.querySelector("#score-value").textContent.replace(/,/g, "")),
          checkpoint,
          checkpointBytes: new Blob([localStorage.getItem("maize-crush-round") || ""]).size,
          completeDialogOpen: isOpen(complete),
          failedDialogOpen: isOpen(failed),
          terminal: !!(checkpoint && checkpoint.completed) || isOpen(complete) || isOpen(failed)
        };
      });
      if (state.score <= scoreBefore) {
        throw new Error(profile + " long-session harvest " + (harvests + 1) + " did not increase the score.");
      }
      if (!state.checkpoint || !Array.isArray(state.checkpoint.board) ||
          state.checkpoint.board.length !== 8 ||
          !state.checkpoint.board.every(row => Array.isArray(row) && row.length === 8) ||
          state.checkpoint.moves !== expectedMoves || state.checkpoint.score !== state.score) {
        throw new Error(profile + " long-session harvest " + (harvests + 1) + " did not persist a valid stable round checkpoint.");
      }
      checkpointBytes = state.checkpointBytes;
      harvests++;
      await waitForBoardAnimations(page);

      // A random cascade can legitimately finish the score objective. Close
      // the result dialog and start a fresh round rather than treating success
      // as a failed soak or trying to move on a completed board.
      if (state.completeDialogOpen) await page.locator("#level-complete-close").click();
      if (state.failedDialogOpen) await page.locator("#level-failed-close").click();
      if (state.terminal) break;
    }
  }
  if (harvests !== 20) {
    throw new Error(profile + " long-session soak completed only " + harvests + " of 20 harvests in " + rounds + " rounds.");
  }

  const after = await measureAfterCollection();
  const nodeGrowth = after.nodes - baseline.nodes;
  const heapGrowthBytes = after.jsHeapUsedBytes - baseline.jsHeapUsedBytes;
  if (nodeGrowth > 160) {
    throw new Error(profile + " long-session DOM node count grew by " + nodeGrowth + " after garbage collection.");
  }
  if (heapGrowthBytes > 8 * 1024 * 1024) {
    throw new Error(profile + " long-session JavaScript heap grew by " + heapGrowthBytes + " bytes after garbage collection.");
  }

  await client.detach();
  return {
    rounds,
    harvests,
    restarts,
    stableCheckpointVerified: harvests,
    checkpointBytes,
    baseline,
    after,
    nodeGrowth,
    heapGrowthBytes
  };
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
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    boardWidth: document.querySelector("#game-board").getBoundingClientRect().width,
    boardHeight: document.querySelector("#game-board").getBoundingClientRect().height,
    boardTop: document.querySelector("#game-board").getBoundingClientRect().top,
    boardBottom: document.querySelector("#game-board").getBoundingClientRect().bottom,
    actionsBottom: document.querySelector(".action-row").getBoundingClientRect().bottom,
    boardRatio: document.querySelector("#game-board").getBoundingClientRect().width / document.querySelector("#game-board").getBoundingClientRect().height,
    actionButtonHeights: Array.from(document.querySelectorAll(".action-row button:not([hidden])")).map(button => button.getBoundingClientRect().height),
    actionButtonRows: Array.from(new Set(Array.from(document.querySelectorAll(".action-row button:not([hidden])")).map(button => Math.round(button.getBoundingClientRect().top))))
  }));
  if (dimensions.documentWidth > dimensions.viewportWidth + 2) {
    throw new Error(profile + " layout overflows horizontally: " + JSON.stringify(dimensions));
  }
  if (dimensions.documentHeight > dimensions.viewportHeight + 2 ||
      dimensions.boardTop < -1 ||
      dimensions.boardBottom > dimensions.viewportHeight + 1 ||
      dimensions.actionsBottom > dimensions.viewportHeight + 1) {
    throw new Error(profile + " active gameplay does not fit one viewport without vertical scrolling: " + JSON.stringify(dimensions));
  }
  if (Math.abs(dimensions.boardRatio - 1) > 0.015) throw new Error(profile + " crop board is not square: " + JSON.stringify(dimensions));
  if (dimensions.actionButtonRows.length > (profile.includes("landscape") ? 2 : 1) || dimensions.actionButtonHeights.some(height => height < 40)) throw new Error(profile + " primary controls wrap or are too small: " + JSON.stringify(dimensions));
  if (!(dimensions.boardWidth > 0 && dimensions.boardHeight > 0)) {
    throw new Error(profile + " crop board has no visible dimensions.");
  }

  await page.screenshot({
    path: path.join(OUTPUT, profile + "-initial.png"),
    fullPage: true,
    animations: "disabled"
  });

  // The active game must already fit; do not scroll the board into view.
  await waitForBoardAnimations(page);

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
    await useFreshField(page);
    await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length === 64);
    await waitForBoardAnimations(page);
    tiles = await getBoardState(page);
    diagonal = findDiagonalTriple(tiles);
  }
  if (!diagonal) throw new Error(profile + " could not generate a diagonal matching triple after 10 fresh fields.");
  const scoreBefore = Number((await page.locator("#score-value").innerText()).replace(/,/g, ""));
  const movesBefore = Number(await page.locator("#moves-value").innerText());
  await installLayoutProbe(page);
  await page.evaluate(() => { window.__maizeCrushLayoutProbe.active = true; });
  await dragPath(page, diagonal, true, false);
  const layoutWork = await page.evaluate(() => {
    const probe = window.__maizeCrushLayoutProbe;
    probe.active = false;
    return {
      tileRectReads: probe.tileRectReads,
      boardRectReads: probe.boardRectReads,
      boardSelectorCalls: probe.boardSelectorCalls
    };
  });
  if (layoutWork.tileRectReads > 24) throw new Error(profile + " pointer gesture performed too many crop layout reads: " + JSON.stringify(layoutWork));
  if (layoutWork.boardRectReads > 10) throw new Error(profile + " pointer gesture performed too many board layout reads: " + JSON.stringify(layoutWork));
  if (layoutWork.boardSelectorCalls !== 0) throw new Error(profile + " pointer gesture performed a board-wide DOM selector: " + JSON.stringify(layoutWork));
  await page.mouse.up();
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
  await page.locator("#tools-toggle-button").click();
  await page.locator("#settings-button").click();
  await page.locator("#settings-dialog").waitFor({ state: "visible" });
  await page.locator("#settings-close").click();
  await page.locator("#settings-dialog").waitFor({ state: "hidden" });
  await page.locator("#tools-toggle-button").click();

  await page.screenshot({
    path: path.join(OUTPUT, profile + "-after-interactions.png"),
    fullPage: true,
    animations: "disabled"
  });

  const longSession = await runLongSessionSoak(page, profile);
  await page.screenshot({
    path: path.join(OUTPUT, profile + "-after-long-session.png"),
    fullPage: true,
    animations: "disabled"
  });

  await context.close();
  return { profile, ...dimensions, mismatchRejected: true, diagonalConnection: true, scoreBefore, scoreAfter, layoutWork, longSession };
}

async function runLayoutOnly(browser, profile, viewport) {
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage();page.on("pageerror",error=>errors.push(profile+": "+error.message));
 await page.addInitScript(()=>localStorage.setItem("maize-crush-tutorial-seen","true"));
 await page.goto(BASE_URL,{waitUntil:"networkidle",timeout:30000});
 await page.locator("#game-board .crop-tile").first().waitFor({state:"visible",timeout:15000});
 await page.waitForFunction(()=>document.querySelectorAll("#game-board .crop-tile").length===64);
 const d=await page.evaluate(()=>{const b=document.querySelector("#game-board").getBoundingClientRect(),a=document.querySelector(".action-row"),buttons=Array.from(a.querySelectorAll("button:not([hidden])")).map(x=>x.getBoundingClientRect());return{viewportWidth:innerWidth,viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,boardWidth:b.width,boardHeight:b.height,boardTop:b.top,boardBottom:b.bottom,actionsBottom:a.getBoundingClientRect().bottom,actionButtonRows:[...new Set(buttons.map(x=>Math.round(x.top)))],actionButtonHeights:buttons.map(x=>x.height)}});
 if(d.documentWidth>d.viewportWidth+2||d.documentHeight>d.viewportHeight+2||d.boardTop<0||d.boardBottom>d.viewportHeight+1||d.actionsBottom>d.viewportHeight+1)throw new Error(profile+" screen overflow: "+JSON.stringify(d));
 if(Math.abs(d.boardWidth-d.boardHeight)>2)throw new Error(profile+" board is not square: "+JSON.stringify(d));
 if(d.actionButtonRows.length!==1||d.actionButtonHeights.some(h=>h<40))throw new Error(profile+" controls wrap or are too small: "+JSON.stringify(d));
 await page.screenshot({path:path.join(OUTPUT,profile+"-layout.png"),fullPage:true,animations:"disabled"});
 await context.close();return{profile,...d,fit:true,squareBoard:true,singleActionRow:true};
}


(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const results = [];
  let browser;
  try {
    await startServer();
    browser = await chromium.launch({ headless: true });
    results.push(await runViewport(browser, "mobile", { width: 390, height: 844 }));
    results.push(await runViewport(browser, "tablet-landscape", { width: 1024, height: 768 }));
    results.push(await runLayoutOnly(browser, "compact-phone", {width:360,height:640}));
    results.push(await runLayoutOnly(browser, "tablet-portrait", {width:800,height:1280}));
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
