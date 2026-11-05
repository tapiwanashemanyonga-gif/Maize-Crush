const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Android phone and tablet workflow runs UI-level board and gesture checks", () => {
  const root = path.join(__dirname, "..");
  const workflow = fs.readFileSync(
    path.join(root, ".github/workflows/android-layout-smoke.yml"),
    "utf8"
  );
  const script = fs.readFileSync(
    path.join(root, "scripts/android_layout_smoke.py"),
    "utf8"
  );
  assert.ok(workflow.includes("python3 -m unittest discover -s tests -p 'test_android_layout_smoke.py'"));
  assert.ok(workflow.includes("python3 scripts/android_layout_smoke.py"));
  assert.ok(workflow.includes("if: always()"));
  assert.ok(script.includes("uiautomator"));
  assert.ok(script.includes("find_diagonal_chain"));
  assert.ok(script.includes("fresh field"));
  assert.ok(script.toLowerCase().includes("moves left"));
  assert.ok(script.includes("tile swapping is not allowed"));
  assert.ok(script.includes("landscape"));
  assert.ok(script.includes("portrait"));
});
