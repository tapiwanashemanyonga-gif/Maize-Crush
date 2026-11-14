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
 for (const feature of ["BABYLON.Engine", "level-gate-", "ArcRotateCamera", "onSelectLevel", "ImportMeshAsync", "harvest-world-farmstead.glb", "harvest-world-terrain.glb", "terrainLoaded", "Promise.all"]) {
  assert.ok(web.includes(feature), "3D scene is missing " + feature);
 }
 assert.match(html, /src="\.\/vendor\/babylon\.js"/);
 assert.doesNotMatch(html, /cdn\.babylonjs\.com/);
 assert.match(fs.readFileSync(path.join(root, "scripts/prepare-babylon-runtime.js"), "utf8"), /babylonjs\/babylon\.js/);
 assert.match(html, /harvest-world-canvas/);
 assert.match(game, /HarvestWorld3D\.focusLevel\(level,true\)/);
 assert.ok(html.includes("babylonjs.loaders.min.js"));
 assert.ok(web.includes("harvest-world-farmstead.glb"));
 assert.ok(fs.readFileSync(path.join(root, "scripts/build_harvest_world_assets.py"), "utf8").includes("export_scene.gltf"));
 const terrainBuilder = fs.readFileSync(path.join(root, "scripts/build_harvest_world_terrain.py"), "utf8");
 assert.ok(terrainBuilder.includes("Continuous asphalt road surface"));
 assert.ok(terrainBuilder.includes("Sculpted Zimbabwe countryside terrain"));
 assert.ok(terrainBuilder.includes("terrain_height"));
 const browserWorkflow = fs.readFileSync(path.join(root, ".github/workflows/android-layout-smoke.yml"), "utf8");
 assert.equal((browserWorkflow.match(/blender --background --python scripts\/build_harvest_world_terrain.py/g) || []).length, 2, "both Android build and browser QA jobs must generate the terrain GLB");
 assert.ok(fs.readFileSync(path.join(root, "sw.js"), "utf8").includes("harvest-world-terrain.glb"));
 assert.equal(fs.readFileSync(path.join(root, "android/app/src/main/assets/sw.js"), "utf8"), fs.readFileSync(path.join(root, "sw.js"), "utf8"));
 assert.match(fs.readFileSync(path.join(root, "scripts/prepare-babylon-runtime.js"), "utf8"), /babylonjs-loaders/);
});
