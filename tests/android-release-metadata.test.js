const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const gradle = read("android/app/build.gradle");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const strings = read("android/app/src/main/res/values/strings.xml");
const checklist = read("RELEASE_CHECKLIST.md");
const releaseCandidate = read(".github/workflows/android-release-candidate.yml");
const signedRelease = read(".github/workflows/android-signed-release.yml");

function requiredMatch(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, "missing Android release metadata: " + label);
  return match[1];
}

test("Android package identity and SDK metadata agree with the release checklist and build workflows", () => {
  const applicationId = requiredMatch(gradle, /applicationId\s+'([^']+)'/, "applicationId");
  const namespace = requiredMatch(gradle, /namespace\s+'([^']+)'/, "namespace");
  const versionCode = Number(requiredMatch(gradle, /versionCode\s+(\d+)/, "versionCode"));
  const versionName = requiredMatch(gradle, /versionName\s+'([^']+)'/, "versionName");
  const minSdk = Number(requiredMatch(gradle, /minSdk\s+(\d+)/, "minSdk"));
  const targetSdk = Number(requiredMatch(gradle, /targetSdk\s+(\d+)/, "targetSdk"));
  const compileSdk = Number(requiredMatch(gradle, /compileSdk\s+(\d+)/, "compileSdk"));
  const appName = requiredMatch(strings, /<string name="app_name">([^<]+)<\/string>/, "app_name");

  assert.equal(namespace, applicationId, "Android namespace and installed package ID must match");
  assert.ok(versionCode > 0, "versionCode must be a positive integer");
  assert.match(versionName, /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, "versionName must be semantic-version shaped");
  assert.equal(minSdk, 24, "the agreed Android 7 / API 24 minimum must remain supported");
  assert.equal(targetSdk, 36, "the release must target Android 16 / API 36");
  assert.equal(compileSdk, 36, "the release must compile against API 36");

  assert.ok(checklist.includes("Application ID: \`" + applicationId + "\`"), "release checklist package ID is stale");
  assert.ok(checklist.includes("Current version: \`" + versionName + "\` (\`versionCode " + versionCode + "\`)"), "release checklist version is stale");
  assert.ok(checklist.includes("Minimum Android version: Android 7.0 / API " + minSdk), "release checklist minimum SDK is stale");
  assert.ok(checklist.includes("Target SDK: API " + targetSdk + " (Android 16)"), "release checklist target SDK is stale");

  const packageMetadata = "package: name='" + applicationId + "' versionCode='" + versionCode + "' versionName='" + versionName + "'";
  for (const [name, workflow] of [["release candidate", releaseCandidate], ["signed release", signedRelease]]) {
    assert.ok(workflow.includes(packageMetadata), name + " workflow package metadata check is stale");
    assert.ok(workflow.includes("sdkVersion:'" + minSdk + "'"), name + " workflow minimum SDK check is stale");
    assert.ok(workflow.includes("targetSdkVersion:'" + targetSdk + "'"), name + " workflow target SDK check is stale");
    assert.ok(workflow.includes("application-label:'" + appName + "'"), name + " workflow application label check is stale");
  }

  assert.equal(appName, "Maize Crush", "the Android launcher label must retain the agreed app name");
  assert.match(strings, /Zimbabwe Harvest crop connection puzzle/);
});

test("adaptive and legacy launcher icon resources referenced by the manifest exist", () => {
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher_round"/);

  const adaptivePaths = [
    "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
    "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"
  ];
  for (const file of adaptivePaths) {
    assert.ok(fs.existsSync(path.join(root, file)), "missing adaptive launcher resource " + file);
    const xml = read(file);
    assert.match(xml, /<adaptive-icon/);
    assert.match(xml, /@color\/ic_launcher_background/);
    assert.match(xml, /@drawable\/ic_launcher_foreground/);
  }

  const legacyIcon = read("android/app/src/main/res/mipmap-anydpi/ic_launcher.xml");
  const foreground = read("android/app/src/main/res/drawable/ic_launcher_foreground.xml");
  const colors = read("android/app/src/main/res/values/colors.xml");
  assert.match(legacyIcon, /<vector/);
  assert.match(legacyIcon, /android:width="48dp"/);
  assert.match(foreground, /<vector/);
  assert.match(foreground, /android:viewportWidth="108"/);
  assert.match(colors, /<color name="ic_launcher_background">#[0-9A-Fa-f]{6}<\/color>/);
});

test("Android manifest keeps the offline game permission surface minimal", () => {
  const permissions = Array.from(
    manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"\s*\/>/g),
    match => match[1]
  );
  assert.deepEqual(permissions, ["android.permission.VIBRATE"]);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android:allowBackup="true"/);
});
