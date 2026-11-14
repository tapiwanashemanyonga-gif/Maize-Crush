"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("Harvest Trail uses a moving perspective road with a current-level vehicle", () => {
  const browserGame = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const androidGame = fs.readFileSync(path.join(root, "android/app/src/main/assets/game.js"), "utf8");
  const browserCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const androidCss = fs.readFileSync(path.join(root, "android/app/src/main/assets/styles.css"), "utf8");

  assert.equal(androidGame, browserGame, "Android and browser game logic must stay identical");
  assert.equal(androidCss, browserCss, "Android and browser styles must stay identical");
  for (const layer of ["map-route-shadow", "map-route-shoulder", "map-route-asphalt", "map-route-edge", "map-route-line"]) {
    assert.ok(browserGame.includes(layer), "missing road layer: " + layer);
  }
  assert.match(browserGame, /className="road-vehicle"/);
  assert.match(browserGame, /stopPositions=\\[\\{x:18,y:68\\}/);
  assert.match(browserCss, /perspective:1000px/);
  assert.match(browserCss, /@keyframes harvest-road-flow/);
  assert.match(browserCss, /@keyframes road-vehicle-drive/);
});
