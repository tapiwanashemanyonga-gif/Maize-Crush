"use strict";
const fs = require("node:fs");
const path = require("node:path");
const source = path.resolve(__dirname, "../node_modules/babylonjs/babylon.js");
const loaderSource = path.resolve(__dirname, "../node_modules/babylonjs-loaders/babylonjs.loaders.min.js");
const loaderTargets = [
  path.resolve(__dirname, "../vendor/babylonjs.loaders.min.js"),
  path.resolve(__dirname, "../android/app/src/main/assets/vendor/babylonjs.loaders.min.js")
];
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
if (!fs.existsSync(loaderSource)) throw new Error("Pinned Babylon.js glTF loader package is missing.");
const loaderBytes = fs.readFileSync(loaderSource);
for (const target of loaderTargets) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, loaderBytes); }
console.log("Prepared local Babylon.js runtime and glTF loader:", bytes.length, "+", loaderBytes.length, "bytes");
