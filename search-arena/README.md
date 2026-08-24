# Search Arena

*A Plarena lab — playable search algorithms. Ludendo discimus.*

A character navigates procedurally generated grid worlds: mazes, cities (an ambulance
driving to a hospital), and coverage tasks (a vacuum robot cleaning a room). The
environment itself is the teaching instrument — every property a search lecture wants to
talk about is a first-class toggle rather than a slide, so observability, terrain costs,
the heuristic and the algorithm can all be flipped live and the class watches the
consequence. Students can drive the character by hand, hand control to one of the
built-in algorithms, or write their own agent function in the browser.

Zero install, no server, no network. One self-contained HTML file; open it from disk and
it works.

## What it teaches

**Six algorithms, one engine.** BFS, DFS, Greedy best-first, Dijkstra / UCS, A\* and hill
climbing all run through the same generic search driver. They differ *only* in how the
frontier is popped — which is the claim the app exists to make visible, and it is honest
in the code rather than just in the narration.

**The probe-level search tree.** Every neighbour probe is drawn, including the ones that
were rejected — wall, already seen, out of bounds — with f / g / h values printed inside
the nodes. Students see the candidates that died at birth, not just the survivors.
The **Full space** button renders the complete reachable state space, with the
expansion-order trail on top: BFS sweeps it layer by layer, A\* jumps into one corner
and hits.

**The frontier data structure, live.** A panel showing the actual queue, stack or
priority queue — elements entering and leaving, with their values, captioned per
algorithm. "Queue vs stack vs priority queue" stops being a sentence.

**Observability as a real constraint.** Fully observable, partially observable (r = 2,
sees 5×5) or local only (r = 1, sees 3×3) — a literal sensing radius with persistent
memory of what has already been seen. The fog is opaque and it binds: under fog the
percept withholds the goal's position until the agent has actually seen that cell, and
the hover inspector will not leak a fogged cell either. Pausing mid-run under fog is an
excellent freeze-frame.

**Heuristics, and where they come from.** Manhattan, Euclidean, zero, or a custom
expression you type in. Optimality claims are gated on admissibility: Dijkstra always
certifies, A\* certifies with the built-in heuristics, BFS certifies only on unit costs,
and a custom heuristic never certifies — because the app cannot know it is admissible.
Setting the heuristic to zero collapses A\* onto Dijkstra in front of the class.

**My-code mode.** Students submit a JavaScript `agent(percept)` function — percept in,
action out, textbook-style — either typed into the editor or uploaded as a `.js` file.
Module-level variables persist across steps, so an agent can carry memory. Errors appear
in a banner directly under the editor.

**Terrain costs.** Mud 3, water 5. Turning terrain on is what finally separates Dijkstra
from BFS: on a unit-cost grid they are the same algorithm, and the class can see that
they are.

**Two more knobs worth a lecture beat each.** `from agent` re-roots the search at the
character's current position, so the class discovers that the root is a choice rather
than a property of the space. `predict` pauses before each expansion and asks the room
to click the cell they think gets popped next, scored against random guessing.

**Everything else you need at the lectern.** The 2D-array view (the same world redrawn as
an indexed grid of 0/1, search overlay still animating on top), the hover inspector that
shows both `{x, y}` and `maze[y][x]` for the same cell, the live AIMA-style environment
scorecard, run history that collects each algorithm's footprint on the same world for
side-by-side comparison, PNG and SVG export of the world plus PNG export of the search
tree (slide-ready), and hand-drawn and pixel / retro themes that switch without losing
simulation state.

## Deterministic share links

All randomness flows from one seeded generator, so a `(seed, config)` pair reproduces a
world exactly — the same maze, the same expansion order, the same numbers, on any
machine. **Share this world** copies a URL that carries the whole configuration:

```
#world=maze&w=23&h=23&seed=4213&diff=hard&terrain=0&exit=corner&obs=full&walls=cells&theme=sketch
```

Opening that link rebuilds exactly the world it was copied from. **A URL is an
assignment.** Paste it into the LMS and every student gets the identical instance;
grading is reproducible because you can rebuild what they saw.

## Directory layout

```
index.html      latest build
README.md       this file
CHANGELOG.md    what changed, for instructors
src/            search_arena.src.html
fall2026/       frozen semester snapshot — link assignments here
```

`fall2026/` does not move while the semester runs. Point student links at it; point
yourself at `index.html`.

## Building

Only needed after editing `src/search_arena.src.html`. From the repository root:

```
python3 lib/build.py
```

This inlines the vendored dependencies and writes `search-arena/index.html`. Never edit
`index.html` directly — it is generated.

---

Licensing for the code, the course content and the Plarena brand is stated at the
repository root, in `LICENSE` and `BRAND.md`.
