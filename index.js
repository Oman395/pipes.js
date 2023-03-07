#!/bin/node

const fs = require("fs");

const CHARS = {
  ul: "╭",
  ur: "╮",
  br: "╯",
  bl: "╰",
  ho: "─",
  ve: "│",
};

// Get command line arguments. There's libraries to do this, but I want this to work as a standalone program, so I just wrote
// this scuffed version.

let args = process.argv.slice(2, process.argv.length);
let cfgPath = "~/.config/pipes.js/config.json";
for (let i = 0; i < args.length; i++) {
  let arg = args[i];
  if (arg[0] === "-") {
    switch (arg.slice(1, arg.length)) {
      case "-help":
        console.log(
          `pipes.js help
==> Arguments
  --config,-c: Specify configuration path

  --help,-h: Display this page

==> Configuration
  minimumDistanceBeforeTurn: Number of characters before being allowed to turn.

  randomThreshold: Threshold for Math.random() to be under. Will increase exponentially if random mode is exponential.

  randomMode: 0 = Exponential, RAND_AMOUNT ** x, 1 = Static.

  unstretchVertical: Apply fix for vertical lines being taller than horizontal lines are long.

  unstretchFactor: Factor to increase probability that the vertical line goes horizontal to. Ignored if unstretchVertical is true.

  maximumCharacters: Maximum characters displayed before clearing screen. Infinity if -1.

  numberOfHeads: Number of distinct pipes to draw at once.`
        );
        process.exit(1);
      case "-config":
        cfgPath = args[i + 1];
        i++;
        continue;
      case "h":
        process.exit(0);
      case "c":
        cfgPath = args[i + 1];
        i++;
        continue;
      default:
        console.error(
          "Unknown argument (type -h for help)! Attempted to read: " + arg
        );
        process.exit(1);
    }
  } else {
    console.error(
      "Unknown argument (type -h for help)! Attempted to read: " + arg
    );
    process.exit(1);
  }
}

// Default values

// Number of characters before being allowed to turn
let MIN_DIST_TURN = 1;
// Threshold for Math.random() to be under, if the random mode is exponential then this will increase exponentially
let RAND_AMOUNT = 0.01;
// 0 = Exponential, RAND_AMOUNT ** x
// 1 = Static
let RAND_MODE = 0;
// Take a wild guess
let FPS = 75;
// Terminal colors or RGB in the format "r;g;b"
let COLORS = [0, 1, 2, 3, 4, 5];
// If true, when moving vertically, the random chance will be doubled
let UNSTRETCH_VERTICAL = true;
// What to multiply the random amount by when we are moving vertically if UNSTRETCH_VERTICAL is true
let UNSTRETCH_FACTOR = 5;
// Number of characters allowed to print on the screen; once this is passed, screen will clear
let MAX_CHARS = 20000;
// Number of paths to run concurrently
let PATH_COUNT = 1;
let delay = false;
if (fs.existsSync(cfgPath)) {
  try {
    let opts = JSON.parse(fs.readFileSync(cfgPath).toString());
    MIN_DIST_TURN = opts.minimumDistanceBeforeTurn ?? MIN_DIST_TURN;
    RAND_AMOUNT = opts.randomThreshold ?? RAND_AMOUNT;
    RAND_MODE = opts.randomMode ?? RAND_MODE;
    FPS = opts.FPS ?? FPS;
    COLORS = opts.colors ?? COLORS;
    UNSTRETCH_VERTICAL = opts.unstretchVertical ?? UNSTRETCH_VERTICAL;
    UNSTRETCH_FACTOR = opts.unstretchFactor ?? UNSTRETCH_FACTOR;
    MAX_CHARS =
      (opts.maximumCharacters === -1 ? Infinity : opts.maximumCharacters) ??
      MAX_CHARS;
    PATH_COUNT = opts.numberOfHeads ?? PATH_COUNT;
  } catch (e) {
    console.error("Invalid configuration file! Error:", e);
    process.exit(1);
  }
} else {
  console.error(`Warning: ${cfgPath} not found, resorting to defaults`);
  delay = true;
}

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
  // Exponentially increase chance as time goes on
  else randFact = 1.0 - RAND_AMOUNT; // Just based on the value
  randFact *= UNSTRETCH_VERTICAL && dir % 2 === 0 ? UNSTRETCH_FACTOR : 1; // Unstretch literally just increases the chance
  // for paths going vertically to switch to horizontal
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
  // Y is inverse
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
      process.stdout.write("\x1b[2J"), (charCount = 0); // Clear screen and reset character count
    let nd = getNextDir(cStep, cDir);
    process.stdout.write(`\x1b[1;38;5;${color}m`); // Set color
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

function start() {
  process.stdout.write("\x1b[2J\x1b[?25l"); // Clear screen and hide cursor
  // tick() returns a promise, so we can just loop the number of paths we want and call them and they will all run asynchronously
  // in parallel
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

  process.stdin.setRawMode(true); // Raw mode is set so that any keypress will close the program, even without a newline
  process.stdin.on("data", () => process.exit(1));

  process.on("exit", () => process.stdout.write("\x1b[?25h")); // Show cursor when the process exits
}

if (delay) setTimeout(start, 500);
else start();
