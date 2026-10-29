const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflow = fs.readFileSync(
  path.resolve(__dirname, "..", ".github", "workflows", "android-signed-release.yml"),
  "utf8"
);

test("signed release workflow publishes only version-tag builds", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /tags:\s*\["v\*"\]/);
  assert.match(workflow, /if: startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(workflow, /uses: softprops\/action-gh-release@v2/);
  assert.match(workflow, /token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(workflow, /contents: write/);
});

test("signed release workflow requires signing secrets and verifies both packages", () => {
  for (const secret of [
    "ANDROID_KEYSTORE_BASE64",
    "ANDROID_KEYSTORE_PASSWORD",
    "ANDROID_KEY_ALIAS",
    "ANDROID_KEY_PASSWORD"
  ]) assert.ok(workflow.includes(secret), "missing signing secret " + secret);
  assert.match(workflow, /verify --verbose "\$APK"/);
  assert.match(workflow, /jarsigner -verify "\$AAB"/);
  assert.match(workflow, /app-release\.apk/);
  assert.match(workflow, /app-release\.aab/);
});
