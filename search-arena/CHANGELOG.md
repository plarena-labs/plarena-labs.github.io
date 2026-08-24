# Search Arena — Changelog

This changelog is written for instructors, not for engineers. Each entry answers one
question: **what will be different about your demo?** Internal refactors, build details
and anything invisible from the lectern are left out on purpose.

Search Arena is the first and oldest arena in the Plarena suite. It predates the
convention of keeping a per-arena plan document, so its early history lives across
several older notes and is **summarised here rather than itemised** — the entries get
more granular as they get more recent.

**Certified numbers.** Every entry carries a *Certified numbers* line. These are the
pinned teaching numbers — the expansion counts, path lengths and scores quoted in
lecture material — which any release must still reproduce exactly from the same
`(seed, config)`. If that line says *unchanged*, the numbers you wrote on last
semester's slides still come out of the app.

**Two axes of versioning.**

- `search-arena/fall2026/` is a **frozen semester snapshot**. Point student assignment
  links here: it does not move while the semester runs, whatever else changes.
- **Git tags are releases.** `search-arena/index.html` always serves the newest one.
  Current release: **v0.1.3** — the state described by the newest entry below.

> The `fall2026/` snapshot was cut on 2026-08-24 and is byte-identical to the build
> described by the newest entry below — so for this semester the two are the same page.
> They will diverge the first time the top-level build changes, and from that point on
> the snapshot is the one that stays put.

---

## 2026-08-24

**Certified numbers** unchanged

### Changed for your classroom

- **Fonts now load from the system. The app makes no network request at all.**
  Search Arena used to pull three web fonts (Patrick Hand, JetBrains Mono,
  Press Start 2P) from Google Fonts. That was the only external request anywhere in the
  Plarena suite. It now uses the same system font stack as the other three arenas.
- **What you will actually notice:** in the **pixel / retro** theme the 8-bit face is
  gone — you get a plain monospace face instead, unless Press Start 2P happens to be
  installed on the machine you are presenting from. Everything else looks the same.
- **What this buys you:** the file is now genuinely offline-clean. Open `index.html`
  from a USB stick in a lecture hall with no Wi-Fi and there is no console error, no
  waiting on a font that will never arrive, and no first-paint flicker.
- Nothing about behaviour changed with it: no algorithm, no count, no layout.

### Added

- Nothing.

### Fixed

- The console error that appeared when the page was opened offline.

---

## 2026-08-22

**Certified numbers** unchanged

### Changed for your classroom

- **Colours re-anchored to the suite's shared semantic palette.** Search Arena had
  grown its own set of hexes; it now draws from the same four semantic colours used in
  the course slide theme and the other arenas — *problem* (red: walls, rejected probes,
  "Stuck!"), *structure* (blue: expanded cells, the solution path in the tree),
  *result* (green: tree nodes, success), *attention* (orange: the frontier ring).
  Slides and app now speak the same colour vocabulary.
  - **Practical consequence:** screenshots you took before this date are slightly off in
    hue from what the app draws now. If a handout depends on an exact colour match,
    retake the screenshot.
  - The pixel / retro theme keeps its own high-contrast set, as before.

### Added

- **The Plarena robot mascot** is now the character you watch move. It renders as the
  maze walker and as the vacuum robot; the city world keeps its ambulance. In the pixel
  theme it switches to the dark-surface variant.
  - The mascot marks **only where the agent really is** — never as decoration on
    expanded or visited cells. That restraint is deliberate: a robot sitting on every
    closed-set cell would teach students that expanding a node means going there.

### Fixed

- Nothing behavioural. No algorithm, count or metric moved.

---

## 2026-08-01

*This entry covers a correctness-and-honesty hardening pass and the smaller teaching
additions that followed it through mid-August. Search Arena predates the per-arena plan
convention, so this stretch is summarised rather than itemised.*

**Certified numbers** re-verified and unchanged — with one honest correction, see below

### Changed for your classroom

- **The app no longer claims optimality it cannot prove.** A correctness audit found
  that Search Arena was telling students an answer was optimal in cases where it was
  not. Concretely: with a hand-written custom heuristic, the app would print its
  "certifies optimality" message directly above a score of 0.85 — a visibly suboptimal
  path. The certification message is now gated on whether the heuristic is admissible.
  Dijkstra always certifies; A\* certifies with the built-in heuristics; BFS certifies
  only on unit costs (i.e. with terrain off); a custom heuristic never certifies,
  because the app cannot know it is admissible. **If you have ever used the
  certification message as a talking point, it is now trustworthy — and it will
  correctly stay silent in the inadmissible-heuristic demo, which is a better lesson
  than the old wrong message.**
- **The observability toggle now actually binds.** It used to be cosmetic for the
  built-in algorithms: the goal's position was handed to the agent even under fog, and
  hovering a fogged cell revealed whether it was a wall. A student running the fog demo
  could reasonably have concluded that observability does not matter. Now the percept
  withholds the goal until the agent has actually seen that cell, and the hover
  inspector respects the fog. The fog demo teaches what it claims to teach.
- **The vacuum world runs a real coverage agent.** Coverage now runs greedy
  nearest-frontier — a small BFS to the closest dirty cell for each leg — with the
  panels saying so, instead of leaving the algorithm buttons looking active while being
  ignored. Point-to-point search visibly living *inside* a coverage task is the lesson.
- **Honest correction to a teaching number:** hill climbing's success rate was measured
  properly. It is far more seed- and difficulty-dependent than previously stated — it
  gets through occasionally on easy corridor mazes and essentially never on medium or
  hard ones. Plan the "sometimes it gets lucky" beat on an **easy** world, and do not
  promise the class a specific hit rate.

### Added

- **A seed box in the header, and share links that actually restore the world.** The
  share link used to encode the configuration and then be ignored on load — opening a
  copied link gave you the defaults. Both halves now work, so **a URL is genuinely an
  assignment**: world, width, height, seed, difficulty, terrain, exit mode,
  observability, wall style and theme all travel in the link.
- **An error banner directly under the code editor.** Student agent errors used to
  appear in the search-tree caption on the opposite side of the screen, where nobody
  looked.
- **`from agent` (2026-08-13).** A checkbox next to *Run agent*: the search is rooted at
  the character's current position instead of the fixed start. Walk the character into a
  dead end by hand, tick the box, run — the tree re-roots and S becomes an ordinary node
  in it. The *optimal* metric follows suit and reports the optimum from the current
  position, so the score stays meaningful. Under fog, the memory you built up by walking
  is handed over to the algorithm.
- **Predict mode.** A quiz toggle: before each expansion the run pauses and the class
  clicks the cell they think the algorithm pops next, scored against random guessing at
  the end.

### Fixed

- **Large worlds no longer hang the page.** Running DFS on a 61×61 world used to grow
  the search-tree canvas past what the browser can allocate — a blank tree and a frozen
  tab, mid-lecture. The tree is now scaled to stay inside safe limits.

---

## Earlier — the first build

*No release date is recorded for the original build; it was already in use by
2026-08-01.*

**Certified numbers** established

On a **hard (looping) maze at the default seed #4213**, where the optimal path is
**44** steps:

| Algorithm | steps | expanded | score |
|---|---|---|---|
| BFS | 44 | 247 | 1.00 |
| Dijkstra / UCS | 44 | 247 | 1.00 |
| A\* | 44 | 146 | 1.00 |
| Greedy best-first | 52 | 125 | 0.85 |
| DFS | 76 | 201 | 0.58 |

Supporting numbers on the same world:

- **Full space** renders the complete reachable state space: **251** states.
- **Dijkstra and BFS are identical on a unit-cost grid** (247 = 247). To separate them
  you must switch terrain costs on — which is exactly the point of that lecture beat.
- Setting A\*'s heuristic to **zero** collapses it onto Dijkstra: 247 = 247.
- **DFS with *Require optimal path*** is forced to sweep all **251** nodes and its path
  still scores **0.58**. The strategy is the problem, not the stopping rule.
- In the **city** world (ambulance → hospital), BFS expands **365** nodes where A\*
  expands **41**, both finding a 40-step path at score 1.00 — a ~9× advantage for the
  heuristic, against only ~1.7× (247 vs 146) in the maze. Same algorithms, different
  world structure: a heuristic is worth exactly what it knows about the real remaining
  cost.

### Changed for your classroom

- First build — everything below was new.

### Added

- Six algorithms behind one generic engine (BFS, DFS, Greedy best-first, Dijkstra / UCS,
  A\*, hill climbing), differing only in how the frontier is popped.
- The probe-level search tree, including rejected probes, with f/g/h inside the nodes.
- The live frontier data-structure panel (queue / stack / priority queue).
- Three worlds: maze, city, vacuum coverage.
- Observability toggle with a literal sensing radius and persistent memory.
- Terrain costs, difficulty control, random or corner exit, *Require optimal path*.
- My-code mode: a JavaScript `agent(percept)` function, textbook-style.
- The 2D-array view and the hover inspector.
- Run history, PNG and SVG export, hand-drawn and pixel themes.

### Fixed

- Not applicable.
