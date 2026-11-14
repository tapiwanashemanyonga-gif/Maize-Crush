"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
test("3D Harvest World is a Babylon scene shared with Android", () => {
 const web = fs.readFileSync(path.join(root, "harvest-world-3d.js"), "utf8");
 const android = fs.readFileSync(path.join(root, "android/app/src/main/assets/harvest-world-3d.js"), "utf8");
 const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
 const androidGame = fs.readFileSync(path.join(root, "android/app/src/main/assets/game.js"), "utf8");
 const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
 const androidHtml = fs.readFileSync(path.join(root, "android/app/src/main/assets/index.html"), "utf8");
 assert.equal(android, web, "Android 3D runtime must match browser runtime");
 assert.equal(androidGame, game, "Android game progression must match browser progression");
 assert.equal(androidHtml, html, "Android HTML must match browser HTML");
 for (const feature of ["BABYLON.Engine", "CreateRibbon", "continuous-asphalt-road", "farmhouse-walls", "river-valley", "level-gate-", "ArcRotateCamera", "onSelectLevel"]) {
  assert.ok(web.includes(feature), "3D scene is missing " + feature);
 }
 assert.match(html, /cdn\.babylonjs\.com\/babylon\.js/);
 assert.match(html, /harvest-world-canvas/);
 assert.match(game, /HarvestWorld3D\.focusLevel\(level,true\)/);
});
