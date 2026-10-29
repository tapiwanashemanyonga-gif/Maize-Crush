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
