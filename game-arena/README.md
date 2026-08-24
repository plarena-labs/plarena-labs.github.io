# Game Arena

**Playable adversarial search.** One self-contained offline HTML file.

Game Arena teaches minimax, alpha-beta pruning, and move ordering on
tic-tac-toe — the clean specimen for this unit, because every branch reaches a
true terminal utility, so every value in the tree is exact. There is no
evaluation function approximating anything, which means nothing in the lesson is
muddied by "well, that's just an estimate": when the app says a move is optimal,
it is optimal. Students play against the search, watch it play itself, and write
their own agent against it.

Live: **https://plarena.app/game-arena/**

---

## The teaching beats

**1. Minimax, with the tree drawn live.** The root is the current position and
every node is a miniature 3×3 board. MAX and MIN levels alternate, marked ▲ and
▽, leaves are labelled with their utility, and values back up the tree node by
node as the search runs — the node being visited right now is highlighted.
Students watch utility propagate instead of being told that it does.

**2. Alpha-beta pruning, as branches that were never evaluated.** Flip the
algorithm toggle on the *same* position. Pruned subtrees are drawn as
never-evaluated stubs rather than quietly omitted, α and β are written on the
nodes, and every cut carries its one-line reason (α ≥ β) on hover. A live
**α/β window panel** shows the current node's α, β, best-so-far value, and best
move, and flashes at the moment a prune happens. Same answer, less work — and
you can see exactly which work was skipped and why.

**3. Move ordering as a first-class experiment.** `best | worst | random`
(seeded, so it reproduces), one position, and *nodes evaluated* moves in front
of the class. From the empty board: minimax evaluates **549,946** nodes,
alpha-beta with best-move ordering evaluates **2,312**. The payoff is the
argument, not the animation — almost all of pruning's benefit comes from the
ordering, which is the numerical version of *good move ordering ≈ a good
heuristic*. A **Game space** control enumerates the first 1–4 levels with no
search at all and prints the exact node count for every level down to the end of
the game, so the extrapolation to 549,946 is read, not asserted.

**4. Play against the optimal AI, or watch AI vs AI.** Take either side against
an opponent that never errs — the fastest way to feel the "the opponent plays
optimally" assumption, especially by playing MIN badly on purpose and watching
the predicted value jump. Or hand both sides to the AI and step through, with a
speed slider, from the front of the room. In Play mode there are three levels of
help: show the analysis without moving, play this one move for me, or take over
my side to the end.

**5. Observability and determinism become toggles.** **Kriegspiel (blind) mode**
hides the opponent's pieces and gives you a referee instead — illegal moves are
rejected and reveal one square — turning a fully observable game partially
observable and opening the door to belief states. **Stochastic opponents**
(ε-random, random) turn a deterministic opponent into a stochastic one and open
the door to expectimax. Both are mirrored live in the **environment scorecard**,
where the *observable* and *deterministic* rows change as you flip the switches.
Search Arena carries the matching scorecard, so the two arenas can be read side
by side.

---

## For instructors

- **Deterministic share links.** The URL hash carries the position (move
  sequence) plus every setting — mode, side, algorithm, ordering, seed, opponent
  policy, Kriegspiel — so a link reproduces exactly what you were looking at. A
  URL is an assignment: send a mid-game position and the whole class analyses
  the same board.
- **Student-code agent API.** Students write `agent(percept)` in JavaScript,
  returning a square `0..8`, with `percept` = `{board, you, legalMoves}`. Example
  code is pre-filled, and compile errors, runtime crashes, and illegal moves each
  get their own explanatory banner. The rubric is **auto-checkable**: never lose
  vs random ×20, and draw vs optimal. Two buttons run it — *My agent vs optimal*
  (one animated game) and *Test vs random ×20* (instant W/D/L). The shipped
  example agent fails the rubric on purpose.
- **Environment scorecard.** A six-row environment properties panel that updates
  live as the toggles change, matched by an equivalent panel in Search Arena.
- **PNG export** of the tree, for slides.
- **Certified numbers.** The node counts this app quotes were cross-checked once
  against an independent implementation; see `CHANGELOG.md` for what is pinned and
  when. Unlike Algo and ML Arena, **Game Arena does not yet ship a Python
  twin**, so those figures cannot currently be re-derived from this repository —
  only the JavaScript in the app reproduces them. Committing a twin is the main
  piece of outstanding work here.

---

## Directory layout

```
index.html      latest build
README.md       this file
CHANGELOG.md    what changed, for instructors
src/            game_arena.src.html
fall2026/       frozen semester snapshot — link assignments here
```

`index.html` always serves the latest build and will keep moving.
`fall2026/` is the frozen semester snapshot — point assignments, graded work,
and anything with a deadline at that copy, not at `index.html`.

## Building

Only needed after editing the source. Edit `src/game_arena.src.html`, then from
the repository root:

```
python3 lib/build.py
```

This inlines the vendored dependencies and writes `game-arena/index.html`.
The build does **not** write `fall2026/` — cutting a semester snapshot is a
deliberate act, not a side effect of building.
