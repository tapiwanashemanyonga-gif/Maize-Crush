const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Android WebView renderer loss destroys the dead view and recovers only the active instance", () => {
  const activity = read("android/app/src/main/java/com/maizecrush/zimbabweharvest/MainActivity.java");
  assert.match(activity, /onRenderProcessGone\(WebView crashedView, RenderProcessGoneDetail detail\)/);
  assert.match(activity, /return recoverFromRendererLoss\(crashedView\)/);

  const start = activity.indexOf("private boolean recoverFromRendererLoss");
  const end = activity.indexOf("private void destroyWebView", start);
  assert.ok(start >= 0 && end > start, "renderer recovery handler must be present");
  const recovery = activity.slice(start, end);
  assert.match(recovery, /if \(crashedView != webView\)/, "a stale callback must not replace the active WebView");
  assert.match(recovery, /destroyWebView\(crashedView\)/, "the terminated WebView must be released");
  assert.match(recovery, /filePathCallback\.onReceiveValue\(null\)/, "a pending file chooser must be cancelled");
  assert.match(recovery, /pendingBackupJson = null/, "a backup dialog owned by the dead renderer must be discarded");
  assert.match(recovery, /rendererRecoveryAttempts >= MAX_AUTOMATIC_RENDERER_RECOVERIES/);
  assert.match(recovery, /attachFreshGameWebView\(\)/);
  assert.match(recovery, /return true;/, "the terminated renderer callback must be handled");
});

test("replacement WebView keeps the trusted offline origin and background pause state", () => {
  const activity = read("android/app/src/main/java/com/maizecrush/zimbabweharvest/MainActivity.java");
  assert.match(activity, /private static final String GAME_URL = "https:\/\/appassets\.androidplatform\.net\/assets\/index\.html"/);
  assert.match(activity, /new WebViewAssetLoader\.Builder\(\)/);
  assert.match(activity, /setAllowFileAccess\(false\)/);
  assert.match(activity, /setAllowContentAccess\(false\)/);

  const start = activity.indexOf("private void attachFreshGameWebView");
  const end = activity.indexOf("private void showRendererRecoveryFallback", start);
  assert.ok(start >= 0 && end > start, "fresh WebView attachment must be isolated");
  const attach = activity.slice(start, end);
  assert.match(attach, /createGameWebView\(\)/);
  assert.match(attach, /webView = replacement/);
  assert.match(attach, /replacement\.loadUrl\(GAME_URL\)/);
  assert.match(attach, /if \(!activityResumed\)[\s\S]*replacement\.onPause\(\);[\s\S]*replacement\.pauseTimers\(\)/);
});

test("repeated renderer crashes show an accessible retry without discarding the stable round", () => {
  const activity = read("android/app/src/main/java/com/maizecrush/zimbabweharvest/MainActivity.java");
  const game = read("game.js");
  const androidGame = read("android/app/src/main/assets/game.js");
  assert.match(activity, /MAX_AUTOMATIC_RENDERER_RECOVERIES = 2/);
  assert.match(activity, /fallback\.setFocusable\(true\)/);
  assert.match(activity, /fallback\.setClickable\(true\)/);
  assert.match(activity, /fallback\.setOnClickListener/);
  assert.match(activity, /Your last stable harvest is saved on this device/);
  assert.match(game, /window\.maizeCrushPrepareForBackground=\(\)=>\{if\(busy\)return false;saveRoundCheckpoint\(\);return true\}/);
  assert.match(game, /const recoveredRound=readRoundCheckpoint\(\)/);
  assert.match(game, /if\(canRecoverRound\)/);
  assert.equal(game, androidGame, "browser and Android checkpoint recovery must remain identical");
});
