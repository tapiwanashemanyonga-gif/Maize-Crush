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


// Treat the journey map as the launch surface; wait for its generated chapter and path nodes.
async function enterGameFromJourney(page, verify = false) {
  await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length === 64, null, {timeout:15000});
  let journeyOpen = await page.waitForFunction(() => { const map=document.querySelector("#level-map"); return !!map && map.open && map.querySelectorAll(".map-world-group").length > 0; }, null, {timeout:15000}).then(() => true).catch(() => false);
  if (!journeyOpen) {
    const initial = await page.evaluate(() => ({open:!!document.querySelector("#level-map")?.open,chapters:document.querySelectorAll("#level-map .map-world-group").length}));
    if (initial.open) {
      // The dialog can be present before its chapter nodes finish rendering in an emulated mobile context.
      // Force the existing Levels action only when the full-screen map is already open but still empty.
      await page.locator("#level-map-button").click({force:true});
      try {
        await page.waitForFunction(() => document.querySelectorAll("#level-map .map-world-group").length > 0, null, {timeout:15000});
      } catch (error) {
        const diagnostic = await page.evaluate(() => ({
          boardTiles: document.querySelectorAll("#game-board .crop-tile").length,
          mapOpen: !!document.querySelector("#level-map")?.open,
          mapMarkup: document.querySelector("#level-map-list")?.innerHTML?.slice(0,800) || null,
          mapButton: !!document.querySelector("#level-map-button"),
          engine: typeof window.MaizeCrush,
          levelText: document.querySelector("#level-label")?.textContent || null
        }));
        throw new Error("Harvest Trail did not render chapters: " + JSON.stringify(diagnostic) + "; browser errors: " + errors.slice(-10).join(" | ") + ". " + error.message);
      }
      journeyOpen = true;
    }
  }
  if (!journeyOpen && !verify) {
    const tutorial = await page.locator("#tutorial-dialog").evaluate(dialog => !!dialog && dialog.open).catch(() => false);
    if (tutorial) await page.locator("#tutorial-start").click();
    else await page.locator("#level-map-button").click();
    await page.evaluate(() => {
      const tutorialDialog=document.querySelector("#tutorial-dialog");
      if(tutorialDialog?.open)tutorialDialog.close();
      const map=document.querySelector("#level-map");
      if(map && !map.open && typeof map.showModal==="function")map.showModal();
    });
    await page.waitForFunction(() => { const map=document.querySelector("#level-map"); return !!map && map.open && map.querySelectorAll(".map-world-group").length > 0; }, null, {timeout:8000});
    journeyOpen = true;
  }
  if (!journeyOpen) {
    const state = await page.evaluate(() => ({mapExists:!!document.querySelector("#level-map"),mapOpen:!!document.querySelector("#level-map")?.open,tutorialOpen:!!document.querySelector("#tutorial-dialog")?.open,tutorialSeen:localStorage.getItem("maize-crush-tutorial-seen"),mapButton:!!document.querySelector("#level-map-button")}));
    throw new Error("Harvest Trail did not open automatically: " + JSON.stringify(state));
  }
  if (verify) {
    const journey = await page.evaluate(() => ({
      title: document.querySelector("#level-map h2")?.textContent?.trim(),
      chapters: document.querySelectorAll("#level-map .map-world-group").length,
      markers: document.querySelectorAll("#level-map .map-level").length,
      road: !!document.querySelector("#level-map .map-route"),
      play: document.querySelector("#map-play-current")?.textContent?.trim()
    }));
    if (journey.title !== "Harvest Trail" || journey.chapters < 1 || journey.markers !== 4 || !journey.road || !/^▶ Play Level 1$/.test(journey.play || "")) {
      throw new Error("Harvest Trail launch screen is incomplete: " + JSON.stringify(journey));
    }
  }
  await page.locator("#map-play-current").click();
  await page.waitForFunction(() => { const map=document.querySelector("#level-map"); return !!map && !map.open; }, null, {timeout:3000});
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

async function focusCellWithArrowKeys(page, from, to) {
  const keys = [];
  if (to.col > from.col) keys.push("ArrowRight");
  else if (to.col < from.col) keys.push("ArrowLeft");
  if (to.row > from.row) keys.push("ArrowDown");
  else if (to.row < from.row) keys.push("ArrowUp");
  for (const key of keys) await page.keyboard.press(key);
  await page.waitForFunction(({ row, col }) => {
    const active = document.activeElement;
    return active && active.classList.contains("crop-tile") &&
      Number(active.dataset.row) === row && Number(active.dataset.col) === col;
  }, { row: to.row, col: to.col }, { timeout: 3000 });
}

async function verifyKeyboardConnect(page, profile) {
  // Start from a settled, fresh board so this checks real keyboard interaction,
  // not a leftover pointer path or an in-flight refill animation.
  await waitForBoardAnimations(page);
  await wait(300);
  await useFreshField(page);
  await waitForBoardAnimations(page);

  // A keyboard attempt to extend into a different crop must be ignored exactly
  // like a mismatched touch drag: no swap, no move spent, and no second tile selected.
  const mismatchTiles = await getBoardState(page);
  const mismatch = findMismatchPair(mismatchTiles);
  if (!mismatch) throw new Error(profile + " could not find an adjacent mismatch for keyboard validation.");
  const mismatchBoardBefore = mismatchTiles.map(tile => tile.label).join("|");
  const mismatchMovesBefore = Number(await page.locator("#moves-value").innerText());
  const mismatchStart = page.locator('#game-board .crop-tile[data-row="' + mismatch[0].row + '"][data-col="' + mismatch[0].col + '"]');
  await mismatchStart.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => document.querySelectorAll("#game-board .crop-tile[aria-pressed='true']").length === 1,
    null,
    { timeout: 3000 }
  );
  await focusCellWithArrowKeys(page, mismatch[0], mismatch[1]);
  await page.keyboard.press("Enter");
  await wait(120);
  const mismatchBoardAfter = (await getBoardState(page)).map(tile => tile.label).join("|");
  const mismatchMovesAfter = Number(await page.locator("#moves-value").innerText());
  const mismatchSelected = await page.locator("#game-board .crop-tile[aria-pressed='true']").count();
  if (mismatchBoardAfter !== mismatchBoardBefore || mismatchMovesAfter !== mismatchMovesBefore || mismatchSelected !== 1) {
    throw new Error(profile + " keyboard mismatch changed the board, spent a move, or selected a different crop.");
  }

  // Clear the intentionally incomplete path and begin the diagonal connection
  // from a fresh round so the successful keyboard action is independently measured.
  await page.locator("#restart-button").click();
  await waitForBoardAnimations(page);

  let chain = findDiagonalTriple(await getBoardState(page));
  for (let attempt = 0; !chain && attempt < 10; attempt++) {
    await useFreshField(page);
    await waitForBoardAnimations(page);
    chain = findDiagonalTriple(await getBoardState(page));
  }
  if (!chain) throw new Error(profile + " could not prepare a diagonal keyboard path after 10 fresh fields.");

  const movesBefore = Number(await page.locator("#moves-value").innerText());
  const scoreBefore = Number((await page.locator("#score-value").innerText()).replace(/,/g, ""));
  const first = page.locator('#game-board .crop-tile[data-row="' + chain[0].row + '"][data-col="' + chain[0].col + '"]');
  const accessibleName = await first.getAttribute("aria-label");
  if (!accessibleName) throw new Error(profile + " keyboard target has no accessible crop label.");

  await first.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(({ row, col }) => {
    const active = document.activeElement;
    return active && active.classList.contains("crop-tile") &&
      Number(active.dataset.row) === row && Number(active.dataset.col) === col &&
      active.getAttribute("aria-pressed") === "true";
  }, { row: chain[0].row, col: chain[0].col }, { timeout: 3000 });

  for (let index = 1; index < chain.length; index++) {
    await focusCellWithArrowKeys(page, chain[index - 1], chain[index]);
    await page.keyboard.press("Enter");
    if (index < chain.length - 1) {
      await page.waitForFunction(
        expected => document.querySelectorAll("#game-board .crop-tile[aria-pressed='true']").length === expected,
        index + 1,
        { timeout: 3000 }
      );
    }
  }

  await page.waitForFunction(
    previous => Number(document.querySelector("#moves-value").textContent) === previous - 1,
    movesBefore,
    { timeout: 5000 }
  );
  await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length === 64);
  const scoreAfter = Number((await page.locator("#score-value").innerText()).replace(/,/g, ""));
  if (scoreAfter <= scoreBefore) throw new Error(profile + " Enter-based diagonal connection did not increase the score.");
  await waitForBoardAnimations(page);
  await wait(300);
  return {
    keyboardMismatchRejected: true,
    keyboardDiagonalConnection: true,
    accessibleCropLabel: accessibleName,
    path: chain.map(({ row, col }) => ({ row, col })),
    movesBefore,
    movesAfter: Number(await page.locator("#moves-value").innerText()),
    scoreBefore,
    scoreAfter
  };
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
  const open = await page.locator("body").evaluate(body => body.classList.contains("tools-open"));
  if (!open) await page.locator("#tools-toggle-button").click();
  await page.locator("#shuffle-button").click();
  if (await page.locator("body").evaluate(body => body.classList.contains("tools-open"))) await page.locator("#tools-toggle-button").click();
}

async function dismissResultDialogs(page) {
  for (const [dialog, closeButton] of [
    ["#level-complete-dialog", "#level-complete-close"],
    ["#level-failed-dialog", "#level-failed-close"]
  ]) {
    const isOpen = await page.locator(dialog).evaluate(element => !!element && (element.open || element.hasAttribute("open"))).catch(() => false);
    if (isOpen) {
      await page.locator(closeButton).click();
      await page.locator(dialog).waitFor({ state: "hidden", timeout: 5000 });
    }
  }
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
  await dismissResultDialogs(page);
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
      await dismissResultDialogs(page);
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


async function verifyResponsiveFit(browser, profile, viewport) {
  const mobile = profile === "short-landscape";
  const context = await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("maize-crush-tutorial-seen","true"));
  await page.goto(BASE_URL,{waitUntil:"networkidle",timeout:30000});
  await enterGameFromJourney(page, true);
  await page.waitForFunction(() => document.querySelectorAll("#game-board .crop-tile").length===64);
  const layout=await page.evaluate(()=>{
    const rect=selector=>{
      const element=document.querySelector(selector),r=element.getBoundingClientRect(),style=getComputedStyle(element);
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,visible:style.display!=="none"&&r.width>0&&r.height>0};
    };
    const board=rect("#game-board"),actions=rect(".action-row");
    const buttons=Array.from(document.querySelectorAll(".action-row button:not([hidden])")).map(x=>x.getBoundingClientRect());
    const critical=[".topbar",".game-panel",".level-row",".stats","#objective-card","#mission-card",".board-heading","#game-board",".game-message",".action-row"]
      .map(selector=>({selector,...rect(selector)})).filter(item=>item.visible);
    const overlaps=[];
    const peerRegions=critical.filter(item=>item.selector!==".game-panel");
    for(let i=0;i<peerRegions.length;i++)for(let j=i+1;j<peerRegions.length;j++){
      const a=peerRegions[i],b=peerRegions[j];
      const width=Math.min(a.right,b.right)-Math.max(a.left,b.left);
      const height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(width>2&&height>2)overlaps.push([a.selector,b.selector]);
    }
    return {viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight},
      shell:rect(".app-shell"),scrollY,focusPlay:document.body.classList.contains("focus-play"),board,actions,
      critical,overlaps,actionRows:[...new Set(buttons.map(x=>Math.round(x.top)))],buttonHeights:buttons.map(x=>x.height),tileCount:document.querySelectorAll("#game-board .crop-tile").length};
  });
  const maxRows=profile.includes("landscape")?2:1;
  const clipped=layout.critical.some(item=>item.top < -1 || item.bottom > layout.viewport.height+1 || item.left < -1 || item.right > layout.viewport.width+1);
  const failed=!layout.focusPlay||layout.tileCount!==64||layout.document.width>layout.viewport.width+2||
    layout.document.height>layout.viewport.height+2||layout.document.bodyHeight>layout.viewport.height+2||layout.scrollY!==0||
    layout.shell.bottom>layout.viewport.height+1||clipped||layout.overlaps.length>0||
    layout.board.top<0||layout.board.bottom>layout.viewport.height+1||layout.actions.bottom>layout.viewport.height+1||
    Math.abs(layout.board.width-layout.board.height)>2||layout.actionRows.length>maxRows||
    layout.buttonHeights.some(h=>h<44);
  await page.screenshot({path:path.join(OUTPUT,profile+"-viewport-fit.png"),fullPage:false,animations:"disabled"});
  await context.close();
  if(failed)throw new Error(profile+" viewport-fit failure: "+JSON.stringify(layout));
  return {profile,...layout,fit:true,squareBoard:true};
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
  await enterGameFromJourney(page);
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
    actionButtonRows: Array.from(new Set(Array.from(document.querySelectorAll(".action-row button")).filter(button => {
      const style = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return !button.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }).map(button => Math.round(button.getBoundingClientRect().top)))),
    actionButtonHeights: Array.from(document.querySelectorAll(".action-row button")).filter(button => {
      const style = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return !button.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }).map(button => button.getBoundingClientRect().height)
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
  if (Math.abs(dimensions.boardRatio - 1) > 0.015) throw new Error(profile + " board is not square: " + JSON.stringify(dimensions));
  if (dimensions.actionButtonRows.length > (profile === "tablet" ? 2 : 1) || dimensions.actionButtonHeights.some(height => height < 40)) throw new Error(profile + " primary action dock does not fit: " + JSON.stringify(dimensions));
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

  const keyboardConnection = await verifyKeyboardConnect(page, profile);

  const longSession = await runLongSessionSoak(page, profile);
  await page.screenshot({
    path: path.join(OUTPUT, profile + "-after-long-session.png"),
    fullPage: true,
    animations: "disabled"
  });

  await context.close();
  return { profile, ...dimensions, mismatchRejected: true, diagonalConnection: true, keyboardConnection, scoreBefore, scoreAfter, layoutWork, longSession };
}


async function verifyCompactViewport(browser) {
  const viewport={width:360,height:640};
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem("maize-crush-tutorial-seen","true"));
  await page.goto(BASE_URL,{waitUntil:"networkidle",timeout:30000});
  await enterGameFromJourney(page, false);
  await page.locator("#game-board .crop-tile").first().waitFor({state:"visible",timeout:15000});
  const layout=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    const buttons=Array.from(document.querySelectorAll(".action-row button:not([hidden])")).map(x=>x.getBoundingClientRect());
    return{viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
      scrollY,focusMode:document.body.classList.contains("focus-play"),board:rect("#game-board"),actions:rect(".action-row"),
      actionRows:[...new Set(buttons.map(x=>Math.round(x.top)))],buttonHeights:buttons.map(x=>x.height),tileCount:document.querySelectorAll("#game-board .crop-tile").length};
  });
  if(!layout.focusMode||layout.tileCount!==64||layout.document.width>layout.viewport.width+2||layout.document.height>layout.viewport.height+2||
    layout.scrollY!==0||layout.board.top<0||layout.board.bottom>layout.viewport.height+1||
    Math.abs(layout.board.width-layout.board.height)>2||layout.actions.bottom>layout.viewport.height+1||
    layout.actionRows.length!==1||layout.buttonHeights.some(h=>h<44)){
    throw new Error("compact-phone gameplay is not fully visible without scrolling: "+JSON.stringify(layout));
  }
  await page.screenshot({path:path.join(OUTPUT,"compact-phone-viewport-fit.png"),animations:"disabled"});
  await context.close();return layout;
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
    results.push({ profile: "compact-phone-viewport-fit", ...(await verifyCompactViewport(browser)) });
    results.push(await verifyResponsiveFit(browser,"tablet-portrait",{width:800,height:1280}));
    results.push(await verifyResponsiveFit(browser,"tablet-portrait-browser-chrome",{width:800,height:1100}));
    results.push(await verifyResponsiveFit(browser,"tablet-portrait-short-window",{width:800,height:1024}));
    results.push(await verifyResponsiveFit(browser,"wide-landscape",{width:1280,height:720}));
    results.push(await verifyResponsiveFit(browser,"short-landscape",{width:844,height:390}));
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
