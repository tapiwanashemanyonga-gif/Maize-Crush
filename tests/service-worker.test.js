const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("the browser registers one authoritative offline service worker", () => {
  const html = read("index.html");
  const game = read("game.js");
  assert.match(html, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.doesNotMatch(game, /navigator\.serviceWorker\.register\("\.\/service-worker\.js"\)/);
  assert.equal(fs.existsSync(path.join(root, "service-worker.js")), false);
});

test("offline worker uses a new cache version and retires the legacy cache", () => {
  const worker = read("sw.js");
  assert.match(worker, /CACHE_NAME = "maize-crush-shell-v6"/);
  assert.match(worker, /key === "maize-crush-shell-v5" || key === "maize-crush-shell-v4" || key === "maize-crush-shell-v3"/);
  assert.match(worker, /key === "maize-crush-v2"/);
  assert.match(worker, /const cached = await caches\.match\(request\)/);
  assert.match(worker, /request\.mode === "navigate"/);
});

test("original Zimbabwe harvest crop artwork contains all six accessible sprite symbols", () => {
  const artwork = read("crop-art.svg");
  for (const crop of ["maize", "tomato", "groundnut", "banana", "orange", "sweetpotato"]) {
    assert.match(artwork, new RegExp('<symbol id="crop-' + crop + '"'));
  }
  const game = read("game.js");
  assert.ok(game.includes('document.getElementById("crop-"+crop.id)'));
  assert.ok(game.includes("node.cloneNode(true)"));
  assert.ok(game.includes("tile.textContent=crop.emoji"));
  assert.doesNotMatch(game, /createElementNS\(svgNS,"use"\)/);
  const html = read("index.html");
  for (const crop of ["maize", "tomato", "groundnut", "banana", "orange", "sweetpotato"]) {
    assert.ok(html.includes('<symbol id="crop-' + crop + '"'), "inline browser sprite missing: " + crop);
  }
  assert.ok(read("sw.js").includes('"./crop-art.svg"'));
});

test("browser and Android WebView gameplay and worker assets are byte-identical", () => {
  for (const [browser, android] of [
    ["game.js", "android/app/src/main/assets/game.js"],
    ["sw.js", "android/app/src/main/assets/sw.js"],
    ["styles.css", "android/app/src/main/assets/styles.css"],
    ["index.html", "android/app/src/main/assets/index.html"],
    ["manifest.webmanifest", "android/app/src/main/assets/manifest.webmanifest"],
    ["icon.svg", "android/app/src/main/assets/icon.svg"],
    ["crop-art.svg", "android/app/src/main/assets/crop-art.svg"],
    ["privacy-policy.html", "android/app/src/main/assets/privacy-policy.html"]
  ]) {
    assert.equal(read(browser), read(android), browser + " must match " + android);
  }
});
