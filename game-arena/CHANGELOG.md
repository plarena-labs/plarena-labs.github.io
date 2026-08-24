# Game Arena — Changelog

Written for instructors: what will be different about your demo. Engineering
detail lives in the commit history; this file records what changed on screen,
what it changes in class, and which numbers are pinned.

**Two axes of versioning, and they are independent.**

- **Semester snapshot = a directory.** `game-arena/fall2026/` is a frozen copy
  you can open in a browser. Point assignments, share links, and graded work at
  it — `game-arena/index.html` keeps moving, `fall2026/` does not.
- **Release = a git tag.** History lives in git, not in copied folders.
  Current release: **v0.1.3**. The tag `v1.0.0` is reserved for the first formal
  public release; everything before that is `v0.x`.

**Scope of this file.** Game Arena has a short history: it was built and
verified on 2026-08-11, then extended once on 2026-08-13. Those are the only two
dates the record covers, and both are below. Anything not listed here has not
changed.

---

## 2026-08-13

**Certified numbers** — the Game space explorer's per-level counts from the
empty board were pinned, and they sum to the already-pinned full-tree total:

| Depth | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| Nodes | 1 | 9 | 72 | 504 | 3,024 | 15,120 | 54,720 | 148,176 | 200,448 | 127,872 |

Total 549,946 — the same figure the minimax run reports, reached by pure
enumeration instead of search. The ε-random opponent is pinned at ε = 0.3.

### Added

- **Game space explorer.** A "Game space" row in the game tree panel: pick a
  depth of 1–4, press **Draw game space**, and the app enumerates the first *d*
  levels from the current position — no search, no pruning. This is the
  adversarial counterpart to Search Arena's "Full space" button. The caption
  lists the exact node count for *every* level down to the end of the game, with
  the drawn levels in bold, so students read 9 → 72 → 504 → 3,024 → … → 549,946
  and can extrapolate with real numbers instead of a hand wave. The caption ends
  on the line that hands you the next slide: *"Enumerate all of that — or search
  it cleverly?"*
- **Student-code agent API.** Students write `agent(percept)` in JavaScript
  returning a square 0–8, with `percept` = `{board, you, legalMoves}`. Example
  code is pre-filled. Two buttons: **My agent vs optimal** (one animated game)
  and **Test vs random ×20** (instant W/D/L). The rubric is auto-checkable:
  never lose vs random ×20, and draw vs optimal. Compile errors, runtime crashes,
  and illegal moves each raise their own banner rather than failing silently.
  The shipped example agent scores 15W / 1D / 4L and therefore **fails** the
  rubric — which is the correct teaching outcome, not a bug.
- **Kriegspiel (blind) mode.** A checkbox in Play mode hides the opponent's
  pieces (grey squares). Clicking a square the opponent already holds returns
  *"Referee: illegal — still your move"* and reveals that one square. Analysis,
  the tree, and the prediction are all suppressed while it is on, so the display
  cannot leak the hidden board; the Run button explains why instead of just
  going dead.
- **Stochastic opponents.** Opponent is now `optimal | ε-random (ε = 0.3) |
  random`, seeded and reproducible. When the opponent slips, a toast says so
  explicitly — *that was a random move, not minimax* — so a surprising result
  does not get blamed on the search.
- **Environment scorecard.** A six-row environment panel in both Game Arena and
  Search Arena. In Game Arena the *observable* and *deterministic* rows change
  colour live as you toggle Kriegspiel and the opponent policy; in Search Arena
  the *observable* row tracks the fog control, and the panel notes that the
  *agents* row is the one that flips over in Game Arena. Observability and
  determinism stop being definitions on a slide and become switches on screen.
- **AI assistance in Play mode**, three levels that close the loop from
  *play it yourself* to *let the machine finish*:
  - **Run / resume** — show the analysis, place nothing (this was already there).
  - **AI: play this move for me** — draws the full analysis tree for the current
    position, points at the green edge out of the root, then plays that move for
    you; the opponent replies as usual.
  - **AI: take over my side** — the AI plays your side optimally to the end of
    the game, refreshing the tree and the prediction at every move, while the
    opponent keeps whichever policy you selected.
- **Two pinned demo recipes (A and B)** for minimax indifference — the
  tic-tac-toe analogue of the CS188 "suicidal agent" moment. Recipe A is
  reproducible live (`0132` → the AI gives up a win and plays 4); recipe B is
  reproducible from a share link (`013` → the AI does not block a forced win).

### Changed for your classroom

- **Share links carry more state.** The hash gained `op=` (opponent policy) and
  `kr=` (Kriegspiel), on top of mode, side, algorithm, ordering, seed, and the
  move sequence. A link now reproduces a partially observable or stochastic
  setup, not just a position.
- **The seed box appears only when it matters** — when ordering is `random`, or
  when the opponent is anything other than `optimal`. Previously it sat there
  under `best`/`worst` ordering implying a randomness that was not present.
- **The tree scrolls itself to centre the root** after drawing, so a
  projector-sized tree opens where you want to start talking.
- The AI-assistance buttons appear in Play mode only, and are disabled under
  Kriegspiel with an on-screen reason — the analysis tree would reveal the
  hidden board.

### Fixed

- **Race between AI takeover and the opponent's reply.** Every delayed AI move
  now runs on a single shared timer that a stop clears, so switching modes or
  resetting mid-move no longer leaves a stray move landing on the board
  afterwards.

---

## 2026-08-11

**Certified numbers** first pinned. Every headline figure this arena quotes was
fixed on this date and cross-checked against an independent Python reference
implementation with zero mismatches:

- **5,478** reachable positions — exact minimax value agrees position by
  position with the reference.
- The same 5,478 positions under alpha-beta across all three orderings
  (best, worst, random with seed 42) return the same root values.
- The un-pruned minimax event path (no memoization) agrees on 5,397 positions
  (six or fewer empty squares, plus the empty board).
- The classic literature figures reproduce exactly from the empty board:
  **549,946** nodes and **255,168** terminal nodes in the full tree.
- **Nodes evaluated from the empty board** — the comparison table to put on a
  slide:

  | Configuration | Nodes evaluated | vs minimax |
  |---|---|---|
  | Minimax | 549,946 | 1× |
  | Alpha-Beta, best ordering | **2,312** | **238×** |
  | Alpha-Beta, random ordering (seed 42) | 18,608 | 30× |
  | Alpha-Beta, worst ordering | 198,837 | 2.8× |

  The one-sentence argument these numbers buy you: **almost all of pruning's
  benefit comes from the ordering.** Worst ordering saves 2.8×; best ordering
  saves 238×. That is the numerical version of *good move ordering ≈ a good
  heuristic*.

### Added

- **Game Arena, first build** — adversarial search on tic-tac-toe, one
  self-contained offline file at `game-arena/index.html`. Live on the portal.
- **Minimax with the tree drawn live.** Root is the current position; every node
  is a miniature 3×3 board; MAX and MIN levels alternate in shade and carry
  ▲/▽ marks; leaves are labelled with their utility; values back up node by node
  as the search runs, with the node currently being visited highlighted.
- **Alpha-beta pruning made visible.** Flip the algorithm toggle on the same
  position: pruned subtrees grey out with a cut mark, α and β are written
  directly on the nodes, and hovering a cut gives the one-line reason in the
  form *"pruned because v ≥ β (3 ≥ 2)"*.
- **The α/β window panel** — the current node's α, β, best-so-far value, and
  best move, updating one step at a time, with a flash at the instant a prune
  happens. This is Game Arena's signature panel, the counterpart to Search
  Arena's frontier data-structure panel.
- **Move ordering as a first-class experiment.** `best | worst | random`, the
  random ordering seeded so it reproduces, with *nodes evaluated* changing on
  screen as you switch.
- **Two modes.** *Play vs AI* — you take either side against an optimal
  opponent, which is how students feel the "the opponent plays optimally"
  assumption (play MIN badly on purpose and watch the predicted value jump).
  *Watch (AI vs AI)* — both sides automated, step or auto-play with a speed
  slider, for demonstrating back-up and pruning from the front of the room.
- **Metrics** in the same vocabulary as Search Arena: nodes evaluated, terminal
  nodes reached, prune events, elapsed steps.
- **Deterministic share links.** The hash restores mode, side, algorithm,
  ordering (and seed), and the move sequence — so a mid-game link puts the whole
  class on the same position. A URL is an assignment.
- **PNG export** of the tree for slides.

### Changed for your classroom

- Portal and suite README updated: Game Arena moved from *planned* to *live*.

### Fixed

- Nothing — this was the first build.

### Known limits at this build

- Hand-drawn theme only; the pixel theme was not built.
- PNG export only; SVG export was not built.
- In Watch mode, stepping across an analysis boundary behaves in a simplified
  way.
