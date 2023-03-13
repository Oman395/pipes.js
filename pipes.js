#!/bin/node

const fs = require("fs");

// Global variables

let CHARS = {
  ul: "╭",
  ur: "╮",
  br: "╯",
  bl: "╰",
  ho: "─",
  ve: "│",
};
let charCount;
let delay = false; // If this is set to true, program will wait a moment before starting so the user has time to read warnings

// Options, set to default values
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

// Get command line arguments. There's libraries to do this, but I want this to work as a standalone program, so I just wrote
// this scuffed version.

function setVal(value, orig, min, max, name) {
  if (isNaN(value)) {
    console.error(`Value for ${name} is Not a Number: ${orig}`);
    process.exit(1);
  }
  if (value < min || value > max) {
    console.error(
      `Invalid value for ${name}: expected ${min} to ${max}, got ${value}`
    );
    process.exit(1);
  }
}

let args = process.argv.slice(2, process.argv.length);
let argString = args.join("\n");
/* "Quick" explanation of the regex
 * Essentially, I want to be able to take in arguments like "-m0C20000H4" and parse them into -m 0 -C 20000 -H 4
 * The first step has three seperate groups: word, char, and number. The word group is the first, "((?<=^--).+)". Essentially, this just matches the text
 * in a line that starts with "--", not including the first --.
 * Next, we remove any dashes from the matches with |-|. This is an or operator, so essentially any dashes will capture early, but not going into any group,
 * and thus not be included.
 * We can then finish the last two steps. Char, "([a-zA-Z])", just matches any single character from a-Z. Number, "([0-9\.]*[0-9])", is a bit more complicated:
 * Essentially, it first matches any number of numbers or decimals, then a single number. We do this so that if the user passes in something like .5, it matches
 *, but file.xyz does not. This gave me a mild headache trying to debug.
 * The next step is substitution: $2 is replaced with the char group, $3 is replaced with the word group, and $1 is replaced with the number group.
 * If any of those groups are empty, the newlines and dashes will still be added, so we will need to clean them up. The order they are in is somewhat important,
 * but I've forgotten exactly why I made it that order specifically.
 *
 * Now we need to clean up the resulting string, which is relatively simple. The first replace literally just removes any lines that are either empty,
 * or are nothing but dashes. The second is a bit more complicated-- essentially, it matches any line which has only a single character in it, and prepends a
 * dash to it.
 *
 * TODO: Does not work for something like -d4gb, but there aren't enough arguments that don't take a value for this to matter.
 *
 * Now that I think about it, it might have been more consise to take the more complicated non-regex route, because of this wall of text
 * Oh well, I had fun writing the regex :)
 */
argString = argString.replaceAll(
  /((?<=^--).+)|-|([a-zA-Z])([0-9\.]*[0-9])/gm,
  "$2\n$3\n--$1\n"
);
argString = argString.replaceAll(/^-*\n/gm, "");
argString = argString.replaceAll(/^([a-zA-Z])(?=\n|$)/gm, "-$1");
args = argString.split("\n");
let cfgPath = "~/.config/pipes.js/config.json";
let verbose = false;
function vlog(string) {
  if (verbose) console.log(string);
}
for (let i = 0; i < args.length; i++) {
  let arg = args[i];
  if (process.argv.length < 3) break;
  if (arg[0] !== undefined && arg[0] !== "-") {
    console.error("Unknown argument (type -h for help): " + arg);
    process.exit(1);
  }
  switch (arg.slice(1, arg.length)) {
    case "-help":
    case "h":
      console.log(
        `pipes.js help
==> Arguments
  --config,-c: Specify configuration path

  --help,-h: Display this page

  --max-char,-C: Maximum characters displayed before clearing screen. Infinity if -1.

  --num-head,-H: Number of distinct pipes to draw at once.

  --random-mode,-m: 0 = Exponential, RAND_AMOUNT ** x, 1 = Static.

  --min-dist: Number of characters before being allowed to turn.

  --random-threshold: Threshold for Math.random() to be under. Will increase exponentially if random mode is exponential.

  --unstretch-vert: Apply fix for vertical lines being taller than horizontal lines are long.

  --unstretch-factor: Factor to increase probability that the vertical line goes horizontal to. Ignored if unstretchVertical is true.

  --verbose: Verbose logging.`
      );
      process.exit(1);
    case "-config":
    case "c":
      cfgPath = args[i + 1];
      i++;
      break;
    case "-max-char":
    case "C":
      MAX_CHARS = parseInt(args[i + 1]);
      setVal(MAX_CHARS, args[i + 1], -1, Infinity, "maximum characters");
      i++;
      break;
    case "-num-head":
    case "H":
      PATH_COUNT = parseInt(args[i + 1]);
      setVal(PATH_COUNT, args[i + 1], 0, Infinity, "number of heads");
      i++;
      break;
    case "-random-mode":
    case "m":
      RAND_MODE = parseInt(args[i + 1]);
      setVal(RAND_MODE, args[i + 1], 0, 1, "random mode");
      i++;
      break;
    case "-min-dist":
      MIN_DIST_TURN = parseInt(args[i + 1]);
      setVal(MIN_DIST_TURN, args[i + 1], 0, Infinity, "minimum distance");
      i++;
      break;
    case "-random-threshold":
      RAND_AMOUNT = parseFloat(args[i + 1]);
      setVal(RAND_AMOUNT, args[i + 1], 0, 1, "random amount");
      i++;
      break;
    case "-unstretch-vert":
      UNSTRETCH_VERTICAL = true;
      break;
    case "-unstretch-factor":
      UNSTRETCH_FACTOR = parseFloat(args[i + 1]);
      setVal(UNSTRETCH_FACTOR, args[i + 1], 0, Infinity, "Unstretch factor");
      i++;
      break;
    case "-verbose":
      verbose = true;
      delay = true;
      vlog("Verbose mode enabled!");
      break;
    case "": // Fix weird shit happening
      break;
    default:
      console.error("Unknown argument (type -h for help): " + arg);
      process.exit(1);
  }
}

function validateOptions(opts) {
  Object.keys(opts).forEach((option) => {
    if (
      [
        "minimumDistanceBeforeTurn",
        "randomThreshold",
        "randomMode",
        "FPS",
        "colors",
        "unstretchVertical",
        "unstretchFactor",
        "maximumCharacters",
        "numberOfHeads",
      ].includes(option)
    )
      return;
    vlog("Invalid option or option is characters");
    if (option === "characters") {
      let chars = opts[option];
      vlog("Checking characters...");
      Object.keys(chars).forEach((key) => {
        if (
          [
            "upperLeft",
            "upperRight",
            "bottomLeft",
            "bottomRight",
            "horizontal",
            "vertical",
          ].includes(key)
        )
          return;
        console.error(
          `Invalid key set: expected upperLeft, upperRight, bottomLeft, bottomRight, horizontal, or vertical, got ${key}`
        );
        process.exit(1);
      });
      return;
    }
    console.error(`Invalid option in configuration file: ${option}`);
    process.exit(1);
  });
}

if (fs.existsSync(cfgPath)) {
  vlog("Config path exists, path is " + cfgPath);
  let opts;
  try {
    opts = JSON.parse(fs.readFileSync(cfgPath).toString());
  } catch (e) {
    console.error(`Warning: invalid json in ${cfgPath}, resorting to default`);
    vlog(`Error from fs: ${e}`);
    opts = {};
    delay = true;
  }
  vlog(`Options: ${JSON.stringify(opts)}`);
  validateOptions(opts);
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
  if (opts.characters !== undefined) {
    CHARS.ul = opts.characters.upperLeft ?? CHARS.ul;
    CHARS.ur = opts.characters.upperRight ?? CHARS.ur;
    CHARS.bl = opts.characters.bottomLeft ?? CHARS.bl;
    CHARS.br = opts.characters.bottomRight ?? CHARS.br;
    CHARS.ho = opts.characters.horizontal ?? CHARS.ho;
    CHARS.ve = opts.characters.vertical ?? CHARS.ve;
  }
  vlog(`Final options, in variables:
MIN_DIST_TURN: ${MIN_DIST_TURN}
RAND_AMOUNT: ${RAND_AMOUNT}
RAND_MODE: ${RAND_MODE}
FPS: ${FPS}
COLORS: ${COLORS}
UNSTRETCH_VERTICAL: ${UNSTRETCH_VERTICAL}
UNSTRETCH_FACTOR: ${UNSTRETCH_FACTOR}
MAX_CHARS: ${MAX_CHARS}
PATH_COUNT: ${PATH_COUNT}
CHARS:
  ul: ${CHARS.ul}
  ur: ${CHARS.ur}
  bl: ${CHARS.bl}
  br: ${CHARS.br}
  ho: ${CHARS.ho}
  ve: ${CHARS.ve}`);
} else {
  console.error(`Warning: ${cfgPath} not found, resorting to defaults`);
  delay = true;
}

function cursorTo(x, y) {
  process.stdout.write(`\u001b[${y + 1};${x + 1}f`);
}

function writeChar(prevDir, cDir, cPos) {
  cursorTo(cPos[0], cPos[1]);
  if (prevDir === cDir) {
    process.stdout.write(cDir % 2 === 0 ? CHARS.ve : CHARS.ho);
    return;
  }
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

function getRandColor() {
  let rand = Math.floor(Math.random() * COLORS.length);
  return COLORS[rand];
}

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
  charCount = 0;
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

if (delay) setTimeout(start, 1000);
else start();
