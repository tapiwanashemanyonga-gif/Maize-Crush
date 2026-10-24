const test = require("node:test");
const assert = require("node:assert/strict");
const game = require("../game.js");

test("board is 8 by 8 and starts without horizontal or vertical triples", () => {
  let seed = 123456;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const board = game.makeBoard(random);
  assert.equal(board.length, 8);
  assert.ok(board.every(row => row.length === 8));
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    assert.ok(board[r][c] >= 0 && board[r][c] < game.CROPS.length);
    if (c >= 2) assert.ok(!(board[r][c] === board[r][c - 1] && board[r][c] === board[r][c - 2]));
    if (r >= 2) assert.ok(!(board[r][c] === board[r - 1][c] && board[r][c] === board[r - 2][c]));
  }
});

test("valid chain requires at least three same-crop adjacent cells", () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));
  assert.equal(game.isValidChain(board, [{r:0,c:0},{r:0,c:1},{r:1,c:2}]), true);
  assert.equal(game.isValidChain(board, [{r:0,c:0},{r:0,c:1}]), false);
});

test("chains cannot mix crops, skip cells, or revisit a cell", () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));
  board[0][1] = 1;
  assert.equal(game.isValidChain(board, [{r:0,c:0},{r:0,c:1},{r:1,c:1}]), false);
  assert.equal(game.isValidChain(board, [{r:0,c:0},{r:0,c:2},{r:1,c:2}]), false);
  assert.equal(game.isValidChain(board, [{r:0,c:0},{r:0,c:1},{r:1,c:1},{r:0,c:0}]), false);
});

test("diagonal neighbours are allowed but distant cells are not", () => {
  assert.equal(game.isAdjacent({r:2,c:2},{r:3,c:3}), true);
  assert.equal(game.isAdjacent({r:2,c:2},{r:2,c:4}), false);
  assert.equal(game.isAdjacent({r:2,c:2},{r:2,c:2}), false);
});

test("longer chains score more and levels have increasing goals", () => {
  assert.equal(game.scoreForChain(2), 0);
  assert.equal(game.scoreForChain(3), 30);
  assert.ok(game.scoreForChain(5) > game.scoreForChain(3));
  assert.ok(game.goalForLevel(2) > game.goalForLevel(1));
  assert.equal(game.movesForLevel(1), 20);
});

test("refilling removes selected cells and leaves a full board", () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));
  let n = 0;
  const random = () => ((n++ % game.CROPS.length) + 0.1) / game.CROPS.length;
  game.refillBoard(board, [{r:7,c:0},{r:6,c:0},{r:5,c:0}], random);
  assert.equal(board.length, 8);
  assert.ok(board.every(row => row.length === 8));
  assert.ok(board.flat().every(crop => crop >= 0 && crop < game.CROPS.length));
});