# Plarena

**Playable arenas for hard ideas.** *Ludendo discimus — we learn by playing.*

Plarena is a suite of zero-install, single-file browser apps for teaching
computer-science courses through play: students don't watch an algorithm,
they run it, break it, race it, and write their own agents against it.

Site: **https://plarena-labs.github.io/**

> The custom domain **plarena.app** is registered but not yet pointed at this site.
> When DNS goes live, the `CNAME` file is added and every link below swaps host only —
> the paths stay identical.

## Arenas

| Arena | Course | Status |
|---|---|---|
| [**Search Arena**](https://plarena-labs.github.io/search-arena/) | Algorithms · AI (search) | ✅ stable |
| [**Algo Arena**](https://plarena-labs.github.io/algo-arena/) | Algorithms (design paradigms) | ✅ v0 |
| [**Game Arena**](https://plarena-labs.github.io/game-arena/) | AI (adversarial search) | ✅ v0 |
| [**ML Arena**](https://plarena-labs.github.io/ml-arena/) | AI (ML unit) · Machine Learning | ✅ v0 |
| Vision Arena | Computer Vision | planned |
| Data Arena | Data Mining | planned |

### Search Arena

A character navigates procedurally generated grid worlds — mazes, cities
(ambulance → hospital), and coverage tasks (vacuum robot). Everything a
search lecture needs is a first-class toggle:

- **6 algorithms** — BFS, DFS, Greedy best-first, Dijkstra, A*, hill climbing —
  driven by one generic engine that differs only in frontier pop policy
- **Probe-level search tree** — every neighbor probe is drawn, including
  rejections (wall / already-seen / out-of-bounds), with f/g/h values inside nodes
- **Frontier data-structure panel** — watch the queue / stack / priority queue
  itself, synchronized with the world
- **Observability toggle** — full view vs. fog of war with literal sensing
  radius and persistent memory
- **Heuristics** — Manhattan, Euclidean, zero, or a custom expression
  (with admissibility gating on optimality claims)
- **My-code mode** — students submit a JavaScript agent function
  (percept in, action out, textbook-style API)
- **Deterministic share links** — `(seed, config)` fully reproduces a world;
  a URL is an assignment
- Terrain costs, difficulty control, exhaustive full-space rendering,
  run history with exploration footprints, PNG/SVG export, hand-drawn and
  pixel themes

### Algo Arena

Nine rooms on one campus delivery map, each an escape from brute force — the
arc runs from *search the space* to *the space fights back*.

- **M0–M2 · from blind to informed** — 1-D shelf (linear scan vs binary search),
  then greedy walk, DFS/BFS on the map, then Dijkstra and A\* with terrain costs,
  a conveyor belt (negative edge — where Dijkstra's settled-invariant lies) and
  an overpass (inadmissible heuristic — where A\* lies)
- **M3 · reformulation** — dock assignment as graph colouring, plain
  backtracking vs forward checking, with the search tree drawn live
- **M4–M6 · three design paradigms**, ordered by how far ahead they look —
  greedy (interval scheduling, MST), divide & conquer (closest pair),
  dynamic programming (stairs, grid DP, knapsack)
- **M7 · reduction** — max-flow / min-cut via Edmonds–Karp, with the binding
  cut made visible
- **M8 · the boundary** — TSP: 720 tours enumerated live (optimal 51 vs
  nearest-neighbour 53), then 20 pins → 2.4×10¹⁸ and the wall
- **Step scrubber** across every scenario (freeze on any single probe),
  a copy-ready Python code panel per algorithm, an in-browser **Certify**
  button that differential-tests 1,000 sister instances, and 3× PNG export
  for slides

### Game Arena

Adversarial search on tic-tac-toe — the classic clean specimen: every branch
reaches a true terminal utility, so all values in the tree are exact (no
evaluation-function approximations).

- **Minimax** with the game tree drawn live — nodes are mini boards, MAX/MIN
  levels alternate, values back up the tree as the search runs
- **Alpha-beta pruning** made visible: pruned branches drawn as never-evaluated
  stubs with a one-line reason (α ≥ β), plus a real-time **α/β window panel**
- **Move ordering** as a first-class experiment — best / worst / seeded-random
  ordering, same position, watch *nodes evaluated* change
  (from the empty board: minimax 549,946 · alpha-beta best-order 2,312)
- **Play vs the optimal AI** (either side) or watch AI vs AI step by step;
  deterministic share links reproduce position + settings
- **Student-code agent API** — `agent(percept)` in JavaScript, with an
  auto-checkable rubric (never lose vs random ×20, draw vs optimal)
- **Kriegspiel mode** (blind tic-tac-toe) and stochastic opponents
  (ε-random / random) — observability and determinism become toggles,
  mirrored in a live AIMA ch.2 environment scorecard (both arenas have one)

### ML Arena

A tiny recommender where **your clicks are the training set**. Rate seeded
Miami dishes (like/dislike or 1–5 stars); three lenses learn your taste on
one shared canvas:

- **Linear regression** (closed form, instant refit, residual sticks) —
  wins on graded targets, embarrasses itself on binary ones
- **Logistic regression** (watch gradient descent raise the boundary) —
  wins on separable tastes, lies flat on XOR
- **MLP** (hidden-units slider 0–16 — slide to 0 and it *is* logistic) —
  wins on XOR, memorizes noise on tiny data (watch the loss scissors open)

A second entry mode re-skins the same three models onto a student-grades
dataset — hours studied against score, then pass/fail — so the same machinery
arrives twice on different data.
- Three pinned scenarios with **predict-then-reveal bets**, a live baseline,
  count-based metrics, held-out evaluation against persona ground truth,
  CSV export, and deterministic share links
- Every trajectory is verified against a Python twin implementation
  (identical numerics), which doubles as an out-of-browser data generator

No build, no server, no network: each arena is one self-contained file.
Open it from disk and it works.

## Repository layout

Every arena is **self-contained** — its sources, data and snapshots live under
its own directory, so one arena can be read, forked or handed over without
touching the others. Only genuinely shared things sit in `lib/`.

```
index.html            ← portal landing page
CHANGELOG.md          ← suite-level: releases and semester snapshots
lib/
  rough.js            ← vendored (MIT)
  build.py            ← the only build script
docs/
  ARCHITECTURE.md
<arena>/              ← search-arena · algo-arena · game-arena · ml-arena
  index.html          ← latest — always the newest build
  README.md           ← what this arena teaches
  CHANGELOG.md        ← what changed, written for instructors
  src/                ← *.src.html + deterministic core (+ Python twin)
  data/               ← single source of truth for the arena's instances
  fall2026/           ← semester snapshot — frozen, safe to link from
                        assignments
```

**Versioning policy — two independent axes:**

- **Semester snapshots** (`<arena>/fall2026/`) are directories, because a frozen
  build has to stay *openable in a browser*. One per term. Course materials,
  assignment share-links and anything that must reproduce months later point
  here — the arena root keeps improving, the snapshot does not.
- **Releases are git tags**, because history belongs in git, not in duplicated
  directories. `v1.0.0` is reserved for the first formal public release; until
  then the suite is `v0.x`. Current release: **v0.1.3**.

A share-link handed out in week 2 still reproduces in week 14 — that is the
whole point of the split.

## Building

Only needed after editing the source:

```
python3 lib/build.py
```

This inlines `lib/rough.js` — and each arena's deterministic core, where it has
one — into `<arena>/src/*.src.html`, writing `<arena>/index.html`. All four
arenas are reproducible from source, byte for byte. `<arena>/fall2026/` is never
written by the build: cutting a semester snapshot is a deliberate act.

What is published here is checked before every push against an allowlist
(`PUBLIC_MANIFEST.txt`) by maintainer tooling kept outside this repository.

## Changelogs

Each arena keeps its own changelog, written for instructors — the question it answers
is *what will be different about your demo*:

- [`search-arena/CHANGELOG.md`](search-arena/CHANGELOG.md)
- [`algo-arena/CHANGELOG.md`](algo-arena/CHANGELOG.md)
- [`game-arena/CHANGELOG.md`](game-arena/CHANGELOG.md)
- [`ml-arena/CHANGELOG.md`](ml-arena/CHANGELOG.md)

[`CHANGELOG.md`](CHANGELOG.md) at the root covers releases, semester snapshots and
anything that cuts across arenas.

## Docs

- `docs/ARCHITECTURE.md` — the 2026-08-01 design record. Historical: the shipped apps
  diverged from it. Per-arena READMEs describe what actually exists.

An instructor guide is planned; it is not part of this repository yet.

## License

Three layers, stated in full in [`BRAND.md`](BRAND.md):

| Layer | Terms |
|---|---|
| **Code** — arenas, deterministic cores, Python twins, build script | **MIT** (see `LICENSE`) |
| **Course content & data** — in-app instructional text, the Map-1 dataset and its certification reports, the pinned teaching numbers | **CC BY 4.0** — take it and teach with it, just attribute |
| **Brand** — the Plarena name, logotype and robot mascot (incl. the embedded `MASCOT` / `ICONS` path tables) | **All rights reserved** |

Vendors [rough.js](https://roughjs.com) (MIT).

## Citation

See `CITATION.cff`, or via GitHub's "Cite this repository" button.
