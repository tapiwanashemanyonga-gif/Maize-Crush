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
  assert.match(worker, /CACHE_NAME = "maize-crush-shell-v2"/);
  assert.match(worker, /key === "maize-crush-v2"/);
  assert.match(worker, /const cached = await caches\.match\(request\)/);
  assert.match(worker, /request\.mode === "navigate"/);
});

test("browser and Android WebView gameplay and worker assets are byte-identical", () => {
  for (const [browser, android] of [
    ["game.js", "android/app/src/main/assets/game.js"],
    ["sw.js", "android/app/src/main/assets/sw.js"],
    ["styles.css", "android/app/src/main/assets/styles.css"],
    ["index.html", "android/app/src/main/assets/index.html"],
    ["manifest.webmanifest", "android/app/src/main/assets/manifest.webmanifest"],
    ["icon.svg", "android/app/src/main/assets/icon.svg"],
    ["privacy-policy.html", "android/app/src/main/assets/privacy-policy.html"]
  ]) {
    assert.equal(read(browser), read(android), browser + " must match " + android);
  }
});
