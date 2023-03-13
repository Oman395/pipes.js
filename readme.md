# pipes.js
![2023-03-07T11:34:14,062917750-05:00](https://user-images.githubusercontent.com/77183348/223487552-9165e4ce-f142-457d-8cde-180e285723e0.png)

Pipes.js is a side project of mine based on the (probably abandoned) [pipes.sh](https://github.com/pipeseroni/pipes.sh), written in node.js (because it's the only language I'm good at). Somehow, it's actually significantly faster than the original, because of abundant use of promises-- I've managed to get it to render 1000 concurrent pipes at a very high FPS with no real issues (other than 100% CPU usage).
## CLI Options
- --config,-c: Specify configuration path

- --help,-h: Display help page

- --max-char,-C: Maximum characters displayed before clearing screen. Infinity if -1.

- --num-head,-H: Number of distinct pipes to draw at once.

- --random-mode,-m: 0 = Exponential, RAND_AMOUNT ** x, 1 = Static.

- --min-dist: Number of characters before being allowed to turn.

- --random-threshold: Threshold for Math.random() to be under. Will increase exponentially if random mode is exponential.

- --unstretch-vert: Apply fix for vertical lines being taller than horizontal lines are long.

- --unstretch-factor: Factor to increase probability that the vertical line goes horizontal to. Ignored if unstretchVertical is true.

- --verbose: Verbose logging.
## Configuration options
- minimumDistanceBeforeTurn: Number of characters before being allowed to turn.
- randomThreshold: Threshold for Math.random() to be under. Will increase exponentially if random mode is exponential.
- randomMode: 0 = Exponential, RAND_AMOUNT ** x, 1 = Static.
- unstretchVertical: Apply fix for vertical lines being taller than horizontal lines are long.
- unstretchFactor: Factor to increase probability that the vertical line goes horizontal to. Ignored if unstretchVertical is true.
- maximumCharacters: Maximum characters displayed before clearing screen. Infinity if -1.
- numberOfHeads: Number of distinct pipes to draw at once.
- characters: Characters to use. Keys are upperLeft, upperRight, bottomLeft, bottomRight, horizontal, vertical.
### Example configuration file
```json
{
  "minimumDistanceBeforeTurn": 1,
  "randomThreshold": 0.01,
  "randomMode": 0,
  "FPS": 75,
  "colors": [
    0,
    1,
    2,
    3,
    4,
    5
  ],
  "unstretchVertical": true,
  "unstretchFactor": 5,
  "maximumCharacters": -1,
  "numberOfHeads": 1,
  "characters": {
    "upperLeft": "╭",
    "upperRight": "╮",
    "bottomRight": "╯",
    "bottomLeft": "╰",
    "horizontal": "─",
    "vertical": "│"
  }
}
```
## Installation
- Download files: `git clone https://github.com/Oman395/pipes.js/ pipesjs && cd pipesjs`
- Make sure pipes.js is executable: `chmod +x ./pipes.js`
- Copy pipes.js to your `$PATH` (in this example, we will use `~/bin`): `cp ./pipes.js ~/bin/pipes.js`
- (Optional) create a configuration file (in this example, I'll just use the default path of `~/.config/pipes.js/config.json`): `mkdir -p ~/.config/pipes.js && touch ~/.config/pipes.js/config.json`, then open it with your text editor of choice.
## License
# DON'T BE A DICK PUBLIC LICENSE

> Version 1.1, December 2016

> Copyright (C) 2023 Orander Robinson-Hartley

Everyone is permitted to copy and distribute verbatim or modified
copies of this license document.

> DON'T BE A DICK PUBLIC LICENSE
> TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

1. Do whatever you like with the original work, just don't be a dick.

   Being a dick includes - but is not limited to - the following instances:

 1a. Outright copyright infringement - Don't just copy this and change the name.
 1b. Selling the unmodified original with no work done what-so-ever, that's REALLY being a dick.
 1c. Modifying the original work to contain hidden harmful content. That would make you a PROPER dick.

2. If you become rich through modifications, related works/services, or supporting the original work,
share the love. Only a dick would make loads off this work and not buy the original work's
creator(s) a pint.

3. Code is provided with no warranty. Using somebody else's code and bitching when it goes wrong makes you a DONKEY dick. Fix the problem yourself. A non-dick would submit the fix back.
## Credits
Myself, obviously.
[Pipeseroni](https://github.com/pipeseroni), for making the original.
[Catppuccin](https://github.com/catppuccin), for being an amazing color scheme that you should use (totally not biased at all).
## TODO
- [ ] Add option in configuration file to change box drawing characters
- [ ] Add more default color schemes
- [ ] Add catppuccin specifically with an RGB colorscheme for anyone who doesn't use it
