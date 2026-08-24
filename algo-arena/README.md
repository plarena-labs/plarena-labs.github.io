# Algo Arena

*Escapes from brute force.* Part of [Plarena](https://plarena.app/) — single-file, offline,
hand-drawn teaching apps. Built for an undergraduate algorithm-techniques course.

One 12×12 campus map, one robot, nine rooms. Every interesting problem can in principle be
solved by brute-force search; this course is a sequence of increasingly clever escapes from it,
and each escape works only when the problem has the right structure. The arena keeps the world
fixed and escalates the question — the same map becomes a graph, an interference graph, a point
set, a DP table, a flow network — so that what changes between modules is visibly the
*formulation*, not the scenery. Each room runs one full loop: **Problem → Formulate → Solve →
Verify → Limits ↻**, where the return arrow is the escape into the next room's problem.

Open `index.html` in a browser. No install, no network, no build step.

## The nine rooms

Certified headline numbers are the values the app reproduces to the digit; see
[Correctness](#correctness) below.

| Room | The idea | Certified headline numbers |
|---|---|---|
| **M0 · Opening day**<br>Introduction | The whole loop in 1-D, then the map, then the price of the question. Linear scan against binary search on the pickup rack; then who sorted the rack, and was it worth it; then the map is unveiled and turns out to be a graph. | Scan **14 probes** vs binary search **3** (a 16-slot rack, order #87). Sorting the rack: **63 comparisons + 50 shifts = 113 operations**, paid once, **break-even after 11 deliveries**. Brute force priced: **4¹⁵ = 1,073,741,824** move plans → **150,627** survive the walls → **1** delivers the lunch. |
| **M1 · Get to P1**<br>Blind search (BFS · DFS) | Escape #1 is memory: fold "how I got here" into "where I am", remember what you have seen, and a billion plans collapse to 108 cells. Instinct fails first; BFS rings are an induction proof you can watch. | Greedy walk stuck at **(5,0) after 5 steps**. BFS **58 expanded / 15 hops**. DFS **29 expanded / 27 hops**. |
| **M2 · The cheapest route**<br>Informed search (Dijkstra · Bellman–Ford · A*) | Escape #2 is an invariant plus knowledge. Weights make fewest-steps meaningless; Dijkstra's settled set is the invariant; two certified failure demos show exactly where an invariant and a heuristic each break. | Fewest-steps route costs **25**, Dijkstra **23**. Conveyor (negative edge): closed-set Dijkstra reports **23**, Bellman–Ford's true answer is **21**. Overpass witness (0,4)→P2: A* reports **19**, truth is **12** (**14** inadmissible cells). Dijkstra **104 expanded** vs A* **61**, same cost 23. Certify: **1000/1000** agree, cost checksum **14905**. |
| **M3 · Channels**<br>Backtracking | The problem shape changes for the first time: an assignment, not a path. Exhaustive search returns, but organized — a tree over partial assignments, with pruning and forward checking as the escape *inside* exhaustion. It is graph coloring; remember that at the Wall. | χ(C5) = **3**. Two channels: **18 nodes** plain vs **8** with forward checking (both prove it impossible). Three channels: **9** vs **5**. |
| **M4 · Commit**<br>Greedy algorithms | Commit and never look back — when do you dare? When you have a proof. The exchange argument as four replayable steps, and the cut property behind Prim. When you have no proof, greedy lies. | Earliest-finish-time schedules **4** sessions, equal to the brute-force optimum; earliest-start manages **2**. MST = **24** (cross-checked against all **16** spanning trees; edge costs are true walking distances). Knapsack greedy **14** vs optimum **16**. |
| **M5 · Split**<br>Divide & conquer | Independent subproblems. Closest pair with a dividing line and a strip scan; then counted races — operations, never a stopwatch — so the growth rates separate on screen. | Closest pair **4.00** vs runner-up **4.12** on the six pins. Counted race, naive vs D&C: **496 vs 161** at n=32, **8128 vs 673** at n=128. |
| **M6 · Remember**<br>Dynamic programming | Overlapping subproblems — the exact complement of M5. The signature shot: the campus map itself becomes the DP table, one number per open cell, then the route is traced back. | Stairs at n=10: **177** recursive calls vs **89** ways. Map-as-DP-table, D→C3 right/down only: cost **22**, **53** optimal monotone paths. Knapsack table closes at **16**, settling M4's teaser. |
| **M7 · Scale up**<br>Network flow | Reformulation at scale: the lunch rush becomes a flow network, and reduction is Formulate at a higher level. Max flow equals min cut, and the bottleneck is visible before the theorem names it. | Max flow **2** = min cut **2** — and the cut is the cafeteria's own two doors, not the corridor. |
| **M8 · The Wall**<br>NP-hardness | Where escape #1 stops working: visit-ALL forces the state to become "where I am *and* whom I have served", the fold collapses, and brute force returns. Greedy lies again. An honest ending — escapes have a boundary. | **720** tours enumerated; optimal **51** vs nearest-neighbour **53**. Twenty pins: **20! = 2.4×10¹⁸** — the Scoreboard's final red row. |

## What is in it for an instructor

- **Step scrubber.** Every animated scenario has a slider and a step-back button. Freeze on one
  probe or one expansion and talk about it; Step and Auto continue from wherever you stopped.
  One Step is one loop iteration (pop, four checks, the pushes); **Substep** walks the checks
  individually.
- **Scenarios arm, they do not autoplay.** Selecting a scenario sets up the board at step 0 and
  waits. Discuss the question, re-aim the target, take predictions, then press Auto.
- **A copy-ready code panel.** Plain hand-written Python for every algorithm beat, matching the
  certified core line for line — same neighbour order, same tie-breaks, same goal test — with a
  copy button. No libraries, so the brute-force logic stays visible; the four search algorithms
  are colour-coded into shared skeleton, algorithm-specific lines, and bookkeeping. Every block
  carries a complexity line anchored to a number from this arena.
- **Certify.** One click runs **1,000 sister instances** — same walls, randomized positive
  weights — as an in-browser differential test asserting A* cost ≡ Dijkstra cost, in about a
  second, with the checksum compared live. Verification as a live demo, not a claim.
- **3× PNG export.** A genuine 1860×1800 re-render, not an upscaled screenshot, frozen at the
  current scrubber step, with room / scenario / step / view in the filename. Scrub, then export:
  that is the slide workflow.
- **Deterministic share links.** The URL hash carries room, scenario, close-up and target, so a
  link reproduces exactly what you or a student was looking at.
- **Multiple views of the same object.** The discovery tree grows beside the map in real time;
  **State space** (108 states, 148 edges) and **Ambient grid** (192 positions: 108 free, 36 walls,
  48 off-map) show the map's two formal faces; **array view** redraws the world as `grid[12][12]`;
  and a live data-structure panel shows the queue, stack or priority queue that is the only real
  difference between the four search algorithms.
- **Scoreboard, briefings and POE bets.** A cross-room Scoreboard accumulates all semester and
  ends red. Each room opens with a briefing panel: the room's question, how the campus map is used
  (or why it steps offstage), and the order to run the scenarios. Predict-observe-explain bets sit
  on the three comparisons with genuine suspense (DFS vs BFS, Dijkstra vs A*, and whether
  nearest-neighbour finds the optimal tour).
- **Keyboard and accessibility.** Full keyboard navigation including room entry, live-region
  announcements, checked contrast, and shape redundancy so nothing is distinguished by colour
  alone.

## Directory layout

```
index.html      latest build
README.md       this file
CHANGELOG.md    what changed, for instructors
src/            algo_arena.src.html, algo_core.js, algo_core.py (Python twin), twin_check.js
data/           emitted artifacts: map1.json, pinned_{js,py}.json, certification report, verify_map1.py
fall2026/       frozen semester snapshot — link assignments here
```

Edit only the files in `src/`, then build from the repo root:

```
python3 lib/build.py
```

The build inlines the deterministic core and the vendored renderer into a single offline
`index.html`. It never writes `fall2026/` — cutting a semester snapshot is a deliberate act, not
a build side effect.

**Two versioning axes.** `fall2026/` is the frozen semester snapshot; point assignments and grading
at that path. Releases are git tags — current release **v0.1.3**, with
`v1.0.0` reserved for the first formal public release. A room already taught goes hotfix-only for
the rest of the term.

## Correctness

Every teaching number in this app is reproduced twice. `src/algo_core.py` is a Python twin of
`src/algo_core.js`, aligned operation by operation — the same neighbour order (down, up, right,
left), the same edge-cost convention, the same heap tie-breaks, the same sweep order — and
`src/twin_check.js` runs them against each other over the full set of pinned values. All 74 pinned
values are integers or integer structures, and the two implementations agree exactly — the check is
string equality on canonicalised JSON, so the difference is **0**, not a tolerance. The map itself was originally certified by
`data/verify_map1.py`; `src/algo_core.py` supersedes it and is normative — if the JavaScript ever
disagrees, the JavaScript is what gets fixed. `data/map1.json` and `data/pinned_{js,py}.json` are
emitted from those cores, so external tooling (slide figures, homework generation) draws on the
same certified numbers, and no number reaches a slide by being worked out by hand.

## License

Licensing for the whole suite — code, course content, and brand assets — is stated at the
repository root, in `LICENSE` and `BRAND.md`.
