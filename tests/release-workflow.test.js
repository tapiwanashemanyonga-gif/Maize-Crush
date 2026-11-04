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

test("phone and tablet layout smoke workflow enables KVM before emulator startup", () => {
  const layoutWorkflow = fs.readFileSync(
    path.resolve(__dirname, "..", ".github", "workflows", "android-layout-smoke.yml"),
    "utf8"
  );
  assert.ok(layoutWorkflow.includes("profile: pixel_2"), "compact-phone emulator profile is required");
  assert.ok(layoutWorkflow.includes("profile: pixel_tablet"), "tablet emulator profile is required");
  assert.ok(layoutWorkflow.includes('KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"'));
  assert.ok(layoutWorkflow.includes("sudo udevadm trigger --name-match=kvm"));
  assert.ok(
    layoutWorkflow.indexOf("Enable KVM group perms") < layoutWorkflow.indexOf("Launch, rotate, background and resume"),
    "KVM permissions must be applied before starting either emulator"
  );
});
