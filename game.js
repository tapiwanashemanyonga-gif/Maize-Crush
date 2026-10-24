(function (root) {
  "use strict";

  const SIZE = 8;
  const MIN_CHAIN = 3;
  const CROPS = [
    { id: "maize", emoji: "🌽", name: "Maize" },
    { id: "tomato", emoji: "🍅", name: "Tomato" },
    { id: "groundnut", emoji: "🥜", name: "Groundnut" },
    { id: "banana", emoji: "🍌", name: "Banana" },
    { id: "orange", emoji: "🍊", name: "Orange" },
    { id: "sweetpotato", emoji: "🍠", name: "Sweet potato" }
  ];
  const WORLDS = ["Maize Fields", "Vegetable Gardens", "Groundnut Grove", "Mbare Market", "Highveld Harvest"];
  const LEVEL_GOALS = [500, 750, 1000, 1250, 1500, 1800, 2100, 2400, 2700, 3000, 3300, 3600, 3900, 4200, 4500, 4800, 5200, 5600, 6000, 6500];
  const LEVEL_MOVES = [20, 22, 22, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 30, 30, 30, 32, 32];

  function randomInt(max, random) { return Math.floor(random() * max); }
  function makeBoard(random) {
    const board = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) {
        let crop;
        do {
          crop = randomInt(CROPS.length, random);
        } while ((c >= 2 && row[c - 1] === crop && row[c - 2] === crop) ||
                 (r >= 2 && board[r - 1][c] === crop && board[r - 2][c] === crop));
        row.push(crop);
      }
      board.push(row);
    }
    return board;
  }

  function isAdjacent(a, b) {
    if (!a || !b) return false;
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return (dr !== 0 || dc !== 0) && dr <= 1 && dc <= 1;
  }

  function isValidChain(board, path, minimum) {
    if (!Array.isArray(path) || path.length < (minimum || MIN_CHAIN)) return false;
    const first = path[0];
    if (!first || !board[first.r] || board[first.r][first.c] === undefined) return false;
    const crop = board[first.r][first.c];
    const seen = new Set();
    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      if (!cell || !board[cell.r] || board[cell.r][cell.c] !== crop) return false;
      const key = cell.r + "," + cell.c;
      if (seen.has(key)) return false;
      seen.add(key);
      if (i > 0 && !isAdjacent(path[i - 1], cell)) return false;
    }
    return true;
  }

  function refillBoard(board, removed, random) {
    const removedSet = new Set(removed.map(cell => cell.r + "," + cell.c));
    for (let c = 0; c < SIZE; c++) {
      const remaining = [];
      for (let r = SIZE - 1; r >= 0; r--) {
        if (!removedSet.has(r + "," + c)) remaining.push(board[r][c]);
      }
      while (remaining.length < SIZE) remaining.push(randomInt(CROPS.length, random));
      for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) board[r][c] = remaining[i];
    }
    return board;
  }

  function cropAt(board, cell) {
    return board[cell.r][cell.c];
  }

  function scoreForChain(length) {
    if (length < MIN_CHAIN) return 0;
    return length * 10 + Math.max(0, length - 3) * 15;
  }

  function goalForLevel(level) {
    return LEVEL_GOALS[Math.min(Math.max(0, level - 1), LEVEL_GOALS.length - 1)] + Math.max(0, level - LEVEL_GOALS.length) * 500;
  }
  function movesForLevel(level) {
    return LEVEL_MOVES[Math.min(Math.max(0, level - 1), LEVEL_MOVES.length - 1)] + (level > LEVEL_MOVES.length ? 1 : 0);
  }

  const api = { SIZE, MIN_CHAIN, CROPS, WORLDS, makeBoard, isAdjacent, isValidChain, refillBoard, cropAt, scoreForChain, goalForLevel, movesForLevel };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MaizeCrush = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

(function () {
  "use strict";
  if (typeof document === "undefined") return;
  const G = window.MaizeCrush;
  const boardEl = document.getElementById("game-board");
  if (!boardEl) return;

  const $ = id => document.getElementById(id);
  let board, path, score, moves, level, busy, completed, soundOn;
  let pointerDown = false;
  let lastMessage = "";
  const saved = readProgress();
  level = saved.level;
  score = 0;
  moves = G.movesForLevel(level);
  busy = false;
  completed = false;
  soundOn = false;
  path = [];
  board = G.makeBoard(Math.random);

  function readProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem("maize-crush-progress") || "{}");
      return { level: Math.max(1, Math.min(100, Number(raw.level) || 1), best: Number(raw.best) || 0 };
    } catch (_) { return { level: 1, best: 0 }; }
  }
  function saveProgress() {
    try {
      const old = readProgress();
      localStorage.setItem("maize-crush-progress", JSON.stringify({ level: Math.max(old.level, level), best: Math.max(old.best || 0, score) }));
    } catch (_) {}
  }
  function announce(message, kind) {
    lastMessage = message;
    const el = $("game-message");
    el.textContent = message;
    el.className = "game-message" + (kind ? " " + kind : "");
  }
  function cellKey(cell) { return cell.r + "," + cell.c; }
  function locateTile(target) {
    const tile = target && target.closest ? target.closest(".crop-tile") : null;
    if (!tile || !boardEl.contains(tile)) return null;
    return { r: Number(tile.dataset.row), c: Number(tile.dataset.col) };
  }
  function renderBoard() {
    boardEl.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let r = 0; r < G.SIZE; r++) for (let c = 0; c < G.SIZE; c++) {
      const crop = G.CROPS[board[r][c]];
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "crop-tile";
      tile.dataset.row = r;
      tile.dataset.col = c;
      tile.textContent = crop.emoji;
      tile.setAttribute("aria-label", crop.name + ", row " + (r + 1) + ", column " + (c + 1));
      tile.setAttribute("aria-pressed", "false");
      fragment.appendChild(tile);
    }
    boardEl.appendChild(fragment);
    renderPath();
  }
  function renderPath() {
    boardEl.querySelectorAll(".crop-tile").forEach(tile => {
      const selected = path.some(cell => cell.r === Number(tile.dataset.row) && cell.c === Number(tile.dataset.col));
      tile.classList.toggle("selected", selected);
      tile.classList.toggle("last-selected", selected && path.length > 0 && cellKey(path[path.length - 1]) === tile.dataset.row + "," + tile.dataset.col);
      tile.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    $("chain-hint").textContent = path.length ? path.length + " crop" + (path.length === 1 ? "" : "s") + " connected" : "Drag to connect 3+";
  }
  function beginPath(cell) {
    if (busy || completed || moves <= 0 || !cell) return;
    pointerDown = true;
    path = [cell];
    renderPath();
    announce("Keep dragging through matching " + G.CROPS[G.cropAt(board, cell)].name.toLowerCase() + " crops.");
  }
  function extendPath(cell) {
    if (!pointerDown || busy || !cell || !path.length) return;
    const last = path[path.length - 1];
    if (cellKey(cell) === cellKey(last)) return;
    const existingIndex = path.findIndex(p => cellKey(p) === cellKey(cell));
    if (existingIndex >= 0) {
      if (existingIndex === path.length - 2) path.pop();
      renderPath();
      return;
    }
    if (!G.isAdjacent(last, cell) || G.cropAt(board, cell) !== G.cropAt(board, path[0])) return;
    path.push(cell);
    renderPath();
  }
  function releasePath() {
    if (!pointerDown) return;
    pointerDown = false;
    const chosen = path.slice();
    path = [];
    renderPath();
    if (!G.isValidChain(board, chosen)) {
      announce("Connect at least 3 matching neighbouring crops. Diagonals count.");
      return;
    }
    harvest(chosen);
  }
  function updateStats() {
    $("score-value").textContent = score.toLocaleString();
    $("goal-value").textContent = G.goalForLevel(level).toLocaleString();
    $("goal-status").textContent = Math.min(score, G.goalForLevel(level)).toLocaleString() + " / " + G.goalForLevel(level).toLocaleString();
    $("moves-value").textContent = moves;
    $("progress-fill").style.width = Math.min(100, score / G.goalForLevel(level) * 100) + "%";
    $("level-label").innerHTML = "Level " + level + ' <span>·</span> ' + G.WORLDS[Math.min(Math.floor((level - 1) / 4), G.WORLDS.length - 1)];
    $("next-button").hidden = !completed;
    $("restart-button").disabled = busy;
    $("shuffle-button").disabled = busy || completed;
  }
  function harvest(cells) {
    if (busy) return;
    busy = true;
    moves--;
    const gained = G.scoreForChain(cells.length);
    score += gained;
    const removed = cells.map(cell => ({ r: cell.r, c: cell.c }));
    removed.forEach(cell => {
      const tile = boardEl.querySelector('[data-row="' + cell.r + '"][data-col="' + cell.c + '"]');
      if (tile) tile.classList.add("clearing");
    });
    updateStats();
    announce("Harvested " + cells.length + " crops! +" + gained + " points.", "success");
    window.setTimeout(() => {
      G.refillBoard(board, removed, Math.random);
      renderBoard();
      busy = false;
      evaluateState();
    }, 170);
  }
  function evaluateState() {
    if (score >= G.goalForLevel(level)) {
      completed = true;
      saveProgress();
      announce("Harvest complete! You reached the goal. Ready for the next field?", "success");
    } else if (moves <= 0) {
      completed = true;
      announce("The field is resting. Restart the level and try a longer chain.", "warning");
    } else if (!lastMessage.startsWith("Harvested")) {
      announce("Keep going — connect 3 or more matching crops.");
    }
    updateStats();
  }
  function restart() {
    if (busy) return;
    score = 0;
    moves = G.movesForLevel(level);
    completed = false;
    path = [];
    board = G.makeBoard(Math.random);
    renderBoard();
    updateStats();
    announce("Fresh field! Connect 3 or more matching crops.");
  }
  function freshField() {
    if (busy || completed) return;
    board = G.makeBoard(Math.random);
    path = [];
    renderBoard();
    announce("Fresh field ready. Your score and moves stay the same.");
  }
  function nextLevel() {
    if (!completed || score < G.goalForLevel(level)) return;
    level++;
    saveProgress();
    restart();
    announce("Welcome to Level " + level + "! New harvest, new goal.");
  }
  boardEl.addEventListener("pointerdown", event => {
    const cell = locateTile(event.target);
    if (!cell) return;
    event.preventDefault();
    try { boardEl.setPointerCapture(event.pointerId); } catch (_) {}
    beginPath(cell);
  });
  boardEl.addEventListener("pointermove", event => {
    if (!pointerDown) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    extendPath(locateTile(element));
  });
  boardEl.addEventListener("pointerup", releasePath);
  boardEl.addEventListener("pointercancel", releasePath);
  boardEl.addEventListener("click", event => {
    if (event.detail !== 0 || pointerDown || busy || completed) return;
    const cell = locateTile(event.target);
    if (!cell) return;
    if (!path.length) { beginPath(cell); return; }
    extendPath(cell);
    if (path.length >= G.MIN_CHAIN) releasePath();
  });
  $("restart-button").addEventListener("click", restart);
  $("shuffle-button").addEventListener("click", freshField);
  $("next-button").addEventListener("click", nextLevel);
  $("sound-toggle").addEventListener("click", () => {
    soundOn = !soundOn;
    $("sound-toggle").setAttribute("aria-pressed", String(soundOn));
    $("sound-toggle").querySelector("span").textContent = soundOn ? "Sound on" : "Sound off";
    announce(soundOn ? "Sound effects are not included in this first build yet." : "Sound off. Ready to harvest.");
  });
  renderBoard();
  updateStats();
  announce("Ready to harvest? Connect 3 or more matching crops.");
})();