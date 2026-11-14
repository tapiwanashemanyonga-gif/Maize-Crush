"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("Zimbabwean Harvest Trail scenery uses landscape and crops, not hut buildings", () => {
  const browserGame = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const androidGame = fs.readFileSync(path.join(root, "android/app/src/main/assets/game.js"), "utf8");
  const browserWorld = fs.readFileSync(path.join(root, "assets/harvest-world.svg"), "utf8");
  const androidWorld = fs.readFileSync(path.join(root, "android/app/src/main/assets/assets/harvest-world.svg"), "utf8");

  assert.equal(androidGame, browserGame, "Android and browser game logic must stay identical");
  assert.equal(androidWorld, browserWorld, "Android and browser landscape art must stay identical");
  assert.match(browserGame, /scenery\.textContent="🪨   🌳   🌻   🌾"/);
  assert.doesNotMatch(browserGame, /🏡|🏠|🛖/);
  assert.match(browserWorld, /granite kopjes, maize fields, hills and river/);
  assert.doesNotMatch(browserWorld, /homestead|hut|village building/i);
  assert.doesNotMatch(browserWorld, /🏡|🏠|🛖/);
});
