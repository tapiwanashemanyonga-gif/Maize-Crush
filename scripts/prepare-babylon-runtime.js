"use strict";
const fs = require("node:fs");
const path = require("node:path");
const source = path.resolve(__dirname, "../node_modules/babylonjs/babylon.js");
const targets = [
  path.resolve(__dirname, "../vendor/babylon.js"),
  path.resolve(__dirname, "../android/app/src/main/assets/vendor/babylon.js")
];
if (!fs.existsSync(source)) throw new Error("Pinned Babylon.js package is missing. Install babylonjs@9.36.0 first.");
const bytes = fs.readFileSync(source);
if (bytes.length < 100000 || !bytes.includes(Buffer.from("BABYLON"))) {
  throw new Error("Babylon.js runtime failed integrity checks.");
}
for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
console.log("Prepared local Babylon.js runtime:", bytes.length, "bytes");
