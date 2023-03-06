#!/bin/node

const CHARS = {
  ul: "╭",
  ur: "╮",
  br: "╯",
  bl: "╰",
  ho: "─",
  ve: "│",
};

// Number of characters before being allowed to turn
const MIN_DIST_TURN = 1;
// Threshold for Math.random() to be under, if the random mode is exponential then this will increase exponentially
const RAND_AMOUNT = 0.01;
// 0 = Exponential, RAND_AMOUNT ** x
// 1 = Static
const RAND_MODE = 0;
// Take a wild guess
const FPS = 75;
// Terminal colors or RGB in the format "r;g;b"
const COLORS = [0, 1, 2, 3, 4, 5];
// If true, when moving vertically, the random chance will be doubled
const UNSTRETCH_VERTICAL = true;
// What to multiply the random amount by when we are moving vertically if UNSTRETCH_VERTICAL is true
const UNSTRETCH_FACTOR = 5;
// Number of characters allowed to print on the screen; once this is passed, screen will clear
const MAX_CHARS = Infinity;
// Number of paths to run concurrently
const PATH_COUNT = 1;

function cursorTo(x, y) {
  process.stdout.write(`\u001b[${y + 1};${x + 1}f`);
}

function writeChar(prevDir, cDir, cPos) {
  cursorTo(cPos[0], cPos[1]);
  if (prevDir !== cDir) {
    switch (cDir) {
      case 0:
        if (prevDir === 3) process.stdout.write(CHARS.bl); // Left to up
        else process.stdout.write(CHARS.br); // Right to up
        break;
      case 1:
        process.stdout.write(prevDir < cDir ? CHARS.ul : CHARS.bl); // Up to right : Down to right
        break;
      case 2:
        process.stdout.write(prevDir < cDir ? CHARS.ur : CHARS.ul); // Right to down : Left to down
        break;
      case 3:
        if (prevDir === 0) process.stdout.write(CHARS.ur); // Up to left
        else process.stdout.write(CHARS.br); // Down to left
        break;
      default:
        throw new Error("Invalid Direction! Attempted to use: " + cDir);
    }
    return;
  }
  process.stdout.write(cDir % 2 === 0 ? CHARS.ve : CHARS.ho);
}

function getNextDir(step, dir) {
  let randFact = step - MIN_DIST_TURN;
  if (randFact < 0) return dir;
  if (RAND_MODE === 0) randFact = 1.0 - (1.0 - RAND_AMOUNT) ** step;
  else randFact = 1.0 - RAND_AMOUNT;
  randFact *= UNSTRETCH_VERTICAL && dir % 2 === 0 ? UNSTRETCH_FACTOR : 1;
  if (Math.random() > randFact) return dir;
  let nd = Math.random() < 0.5 ? dir - 1 : dir + 1;
  if (nd < 0) nd = 3;
  if (nd > 3) nd = 0;
  return nd;
}

function getRandColor() {
  let rand = Math.floor(Math.random() * COLORS.length);
  return COLORS[rand];
}

function applyDir(pos, dir) {
  let np;
  switch (dir) {
    case 0:
      np = [pos[0], pos[1] - 1]; // Up
      break;
    case 1:
      np = [pos[0] + 1, pos[1]]; // Right
      break;
    case 2:
      np = [pos[0], pos[1] + 1]; // Down
      break;
    case 3:
      np = [pos[0] - 1, pos[1]]; // Left
      break;
    default:
      throw new Error("Invalid Direction! Attempted to use: " + dir);
  }
  if (np[0] < 0) np[0] += process.stdout.columns;
  if (np[0] >= process.stdout.columns) np[0] -= process.stdout.columns;
  if (np[1] < 0) np[1] += process.stdout.rows;
  if (np[1] >= process.stdout.rows) np[1] -= process.stdout.rows;
  return np;
}

let charCount = 0;
function tick(cDir, cPos, cStep, color) {
  return new Promise((res) => {
    if (charCount >= MAX_CHARS)
      process.stdout.write("\x1b[2J"), (charCount = 0);
    let nd = getNextDir(cStep, cDir);
    process.stdout.write(`\x1b[1;38;5;${color}m`);
    writeChar(cDir, nd, cPos);
    let pPos = cPos;
    cPos = applyDir(cPos, nd);
    if (Math.abs(cPos[0] - pPos[0]) > 1 || Math.abs(cPos[1] - pPos[1]) > 1)
      color = getRandColor();
    charCount++;
    if (nd === cDir)
      setTimeout(() => tick(nd, cPos, cStep + 1, color), 1000 / FPS);
    else setTimeout(() => tick(nd, cPos, 0, color), 1000 / FPS);
    res();
  });
}

process.stdout.write("\x1b[2J\x1b[?25l");

for (let i = 0; i < PATH_COUNT; i++) {
  tick(
    Math.floor(Math.random() * 4),
    [
      Math.floor(process.stdout.columns / 2),
      Math.floor(process.stdout.rows / 2),
    ],
    0,
    getRandColor()
  );
}

process.stdin.setRawMode(true);
process.stdin.on("data", () => process.exit(1));

process.on("exit", () => process.stdout.write("\x1b[?25h"));
