const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Android WebView blocks untrusted local and unsupported navigation", () => {
  const activity = read("android/app/src/main/java/com/maizecrush/zimbabweharvest/MainActivity.java");
  assert.ok(activity.includes('setAllowContentAccess(false)'), "content URI access must remain disabled");
  assert.ok(activity.includes('setAllowFileAccessFromFileURLs(false)'), "file-to-file access must remain disabled");
  assert.ok(activity.includes('setAllowUniversalAccessFromFileURLs(false)'), "file-to-network access must remain disabled");
  assert.ok(activity.includes('return !url.startsWith("file:///android_asset/");'), "only bundled Android assets may load in the bridge-enabled WebView");
  assert.ok(activity.includes('"https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)'), "web links must be handled externally");
  assert.ok(activity.includes("// Block unsupported schemes"), "unsupported URL schemes must be blocked");
});

test("Android package stays offline-only and requests only vibration permission", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android\.permission\.VIBRATE/);
  assert.doesNotMatch(manifest, /android\.permission\.INTERNET/);
  assert.doesNotMatch(manifest, /android\.permission\.(READ_CONTACTS|ACCESS_FINE_LOCATION|CAMERA|RECORD_AUDIO)/);
});

test("native save-backup bridge rejects null and oversized payloads", () => {
  const activity = read("android/app/src/main/java/com/maizecrush/zimbabweharvest/MainActivity.java");
  assert.match(activity, /MAX_BACKUP_BYTES\s*=\s*1024\s*\*\s*1024/);
  assert.ok(activity.includes("json == null || json.getBytes(StandardCharsets.UTF_8).length > MAX_BACKUP_BYTES"));
});

test("private signing material is excluded from source control", () => {
  const ignore = read(".gitignore");
  for (const pattern of ["*.jks", "*.keystore", "*.p12", "*.pfx", "*.apk", "*.aab", "android/local.properties"]) {
    assert.ok(ignore.includes(pattern), "missing ignore rule " + pattern);
  }
});


test("Android backgrounding checkpoints the stable round before pausing WebView timers", () => {
  const activity = read("android/app/src/main/java/com/maizecrush/zimbabweharvest/MainActivity.java");
  const pauseStart = activity.indexOf("protected void onPause()");
  const resumeStart = activity.indexOf("protected void onResume()", pauseStart);
  assert.ok(pauseStart >= 0 && resumeStart > pauseStart, "onPause and onResume must remain distinct lifecycle methods");
  const pause = activity.slice(pauseStart, resumeStart);
  assert.ok(pause.indexOf("evaluateJavascript") >= 0, "onPause must ask the game to checkpoint");
  assert.ok(pause.indexOf("evaluateJavascript") < pause.indexOf("pauseWebViewAfterCheckpoint(current)"), "WebView timers must be paused only after the checkpoint callback");
  assert.match(pause, /activityResumed\s*=\s*false/);
  assert.match(activity, /private void pauseWebViewAfterCheckpoint\(WebView target\)/);
  assert.match(activity, /target != webView \|\| activityResumed/);
  const resumeEnd = activity.indexOf("protected void onSaveInstanceState()", resumeStart);
  const resume = activity.slice(resumeStart, resumeEnd);
  assert.match(resume, /activityResumed\s*=\s*true/);
  assert.match(resume, /webView\.onResume\(\);\s*webView\.resumeTimers\(\);/);
});

test("game exposes one stable-round checkpoint hook for Android backgrounding and browser page loss", () => {
  const source = read("game.js");
  const androidSource = read("android/app/src/main/assets/game.js");
  assert.equal(source, androidSource, "browser and Android checkpoint behavior must remain identical");
  assert.match(source, /window\.maizeCrushPrepareForBackground=\(\)=>\{if\(busy\)return false;saveRoundCheckpoint\(\);return true\}/);
  assert.match(source, /window\.addEventListener\("pagehide",window\.maizeCrushPrepareForBackground\)/);
  assert.match(source, /window\.addEventListener\("blur",window\.maizeCrushPrepareForBackground\)/);
});


test("Android system backup and device transfers are disclosed separately from game-operated services", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const policy = read("privacy-policy.html");
  const androidPolicy = read("android/app/src/main/assets/privacy-policy.html");
  assert.match(manifest, /android:allowBackup="true"/);
  assert.equal(policy, androidPolicy, "browser and Android privacy policies must stay identical");
  assert.match(policy, /Android system backup and device transfers/);
  assert.match(policy, /eligible app data/);
  assert.match(policy, /device-to-device transfer/);
  assert.match(policy, /does not receive those backups/);
  assert.match(policy, /do not want cloud-based app backup/);
});
