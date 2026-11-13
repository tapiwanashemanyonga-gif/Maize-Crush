const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("harvest clear and refill animations stay in sync across browser and Android", () => {
  const root = path.join(__dirname, "..");
  const browserGame = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const androidGame = fs.readFileSync(path.join(root, "android/app/src/main/assets/game.js"), "utf8");
  const browserCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const androidCss = fs.readFileSync(path.join(root, "android/app/src/main/assets/styles.css"), "utf8");
  assert.equal(androidGame, browserGame, "Android gameplay renderer must match browser gameplay");
  assert.equal(androidCss, browserCss, "Android board styling must match browser styling");
  assert.ok(browserGame.includes('tile.style.animationDelay=(((G.SIZE-1-r)*9)+(c*5))+"ms";'));
  assert.ok(browserCss.includes(".crop-tile.clearing{opacity:0;transform:scale(.34) rotate(9deg)"));
  assert.ok(browserGame.includes('tile.style.setProperty("--harvest-delay",Math.min(70,index*5)+"ms")'));
  assert.ok(browserGame.includes('tile.classList.add("harvest-impact","clearing")'));
  assert.ok(browserGame.includes("Math.max(delay,180)+70"));
  assert.ok(browserCss.includes(".crop-tile.harvest-impact::before"));
  assert.ok(browserCss.includes("@keyframes harvest-ring"));
  assert.ok(browserCss.includes("transition-delay:var(--harvest-delay,0ms)"));
  assert.ok(browserCss.includes(".crop-tile.harvest-impact::before{display:none;animation:none!important}"));
  assert.ok(browserCss.includes("translateY(-28px) scale(.82)"));
  assert.ok(browserCss.includes("@media(prefers-reduced-motion:reduce){.crop-tile.tile-arrive{animation:none}}"));
});
