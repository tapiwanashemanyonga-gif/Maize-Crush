const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const signedRelease = fs.readFileSync(
  path.join(root, ".github", "workflows", "android-signed-release.yml"),
  "utf8"
);
const releaseCandidate = fs.readFileSync(
  path.join(root, ".github", "workflows", "android-release-candidate.yml"),
  "utf8"
);
const layoutWorkflow = fs.readFileSync(
  path.join(root, ".github", "workflows", "android-layout-smoke.yml"),
  "utf8"
);

test("signed release workflow publishes only version-tag builds", () => {
  assert.match(signedRelease, /workflow_dispatch:/);
  assert.match(signedRelease, /tags:\s*\["v\*"\]/);
  assert.match(signedRelease, /if: startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(signedRelease, /uses: softprops\/action-gh-release@v2/);
  assert.match(signedRelease, /token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(signedRelease, /contents: write/);
});

test("signed release workflow requires signing secrets and verifies both packages", () => {
  for (const secret of [
    "ANDROID_KEYSTORE_BASE64",
    "ANDROID_KEYSTORE_PASSWORD",
    "ANDROID_KEY_ALIAS",
    "ANDROID_KEY_PASSWORD"
  ]) assert.ok(signedRelease.includes(secret), "missing signing secret " + secret);
  assert.match(signedRelease, /verify --verbose "\$APK"/);
  assert.match(signedRelease, /jarsigner -verify "\$AAB"/);
  assert.match(signedRelease, /app-release\.apk/);
  assert.match(signedRelease, /app-release\.aab/);
});

test("normal Android release-candidate validation skips emulator startup", () => {
  assert.match(releaseCandidate, /if: github\.event_name == 'workflow_dispatch'/);
  assert.match(releaseCandidate, /Launch signed release APK on Android emulator/);
  assert.match(releaseCandidate, /assembleRelease bundleRelease/);
  assert.match(releaseCandidate, /dump badging/);
  assert.match(releaseCandidate, /verify --verbose/);
});

test("normal layout QA uses browser screenshots and interaction checks without an emulator", () => {
  assert.match(layoutWorkflow, /name: Maize Crush Android Build and Browser Visual QA/);
  assert.match(layoutWorkflow, /browser-visual-qa:/);
  assert.match(layoutWorkflow, /node --check tests\/browser-visual-qa\.js/);
  assert.match(layoutWorkflow, /playwright@1\.56\.1/);
  assert.match(layoutWorkflow, /playwright install --with-deps chromium/);
  assert.match(layoutWorkflow, /node tests\/browser-visual-qa\.js/);
  assert.match(layoutWorkflow, /if: always\(\)/);
  assert.match(layoutWorkflow, /artifacts\/browser-visual-qa\//);
  assert.match(layoutWorkflow, /runtime-smoke:\n    if: github\.event_name == 'workflow_dispatch'/);
});

test("browser QA exercises both compact mobile and tablet layouts and gameplay", () => {
  const script = fs.readFileSync(path.join(root, "tests", "browser-visual-qa.js"), "utf8");
  assert.match(script, /width: 390, height: 844/);
  assert.match(script, /width: 1024, height: 768/);
  assert.match(script, /findDiagonalTriple/);
  assert.match(script, /waitForBoardAnimations/);
  assert.match(script, /dragPath\(page, chain, true\)/);
  assert.match(script, /checkpoint\.moves === expected && checkpoint\.score === score/);
  assert.match(script, /level-complete-close/);
  assert.match(script, /level-failed-close/);
  assert.match(script, /mismatched drag incorrectly consumed a move/);
  assert.match(script, /did not increase the score/);
  assert.ok(script.includes('profile + "-initial.png"'));
});

test("browser visual QA measures board layout work during real crop gestures", () => {
  const script = fs.readFileSync(path.join(root, "tests", "browser-visual-qa.js"), "utf8");
  assert.match(script, /installLayoutProbe/);
  assert.match(script, /tileRectReads > 24/);
  assert.match(script, /boardRectReads > 10/);
  assert.match(script, /boardSelectorCalls !== 0/);
});
