# Algo Arena — changelog for instructors

What changed, written for the person who has to teach with it: what will be different
about your demo, and what in your lesson plan may need a line edited. Engineering detail
is deliberately left out.

**Two versioning axes, and they are unrelated:**

- **Semester snapshot = a directory.** `algo-arena/fall2026/` is the frozen Fall 2026 build.
  Point assignments and grading at that path — it does not move once the
  semester starts. `algo-arena/index.html` is the latest build and keeps changing.
- **Release = a git tag.** History lives in git, not in copied folders. Current release:
  **v0.1.3**. The tag `v1.0.0` is reserved for the first formal public release.

A room that has already been taught goes hotfix-only for the rest of the term.

**How to read the certified-numbers line.** Every teaching number in the arena is produced by
a Python reference implementation and its JavaScript twin, run against each other. Each entry
below states whether that set of pinned values moved. `diff = 0` means the two implementations
agreed on every pinned value, to the digit.

---

## 2026-08-24

**Certified numbers** unchanged (Python/JS twin, 74 pinned values, diff = 0). The binary-search
midpoint was rewritten to the overflow-safe form and everything was re-certified from scratch;
every pinned value came back identical.

### Changed for your classroom

- **Every room now carries two names.** Home cards, room tags and briefing titles show the story
  name and the subject name together: Introduction · Blind search (BFS · DFS) · Informed search
  (Dijkstra · Bellman–Ford · A*) · Backtracking · Greedy algorithms · Divide & conquer · Dynamic
  programming · Network flow · NP-hardness.
  *Lesson-plan note:* syllabus and textbook cross-references can now name a room the way your
  syllabus already names the topic, without dropping the story title.
- **Binary search uses `mid = lo + (hi - lo) // 2`** in the code panel and in both cores, with a
  short comment on why it is not the textbook one-liner. The classic `(lo + hi) // 2` overflow bug
  is now a teachable aside rather than something a student can catch you on. Every probe count is
  unchanged.
- **The charging docks explain themselves in the early rooms.** C1–C3 are visible but idle in
  M0–M2, and the briefings now say when they wake up: radio channels in M3, a schedule and cabling
  in M4, the destination in M6 and M7.
- **"Probes" stays the word** for M0's counting (14 vs 3). If you prefer "comparisons" in your
  lecture, it is a wording swap only — the numbers do not move.

### Added

- **M0 ends with a season trailer (scenario ⑥).** The same campus map gains one component per
  step — terrain, the moving parts, the docks waking up, capacity, then visit-ALL with the six
  pins ringed and the red 2.4×10¹⁸ — and each step changes what *kind* of problem the map poses.
  It is the mirror image of the unveiling: the unveiling reveals the space, the trailer reveals
  the questions. Ends on "same map, nine rooms, escalating questions — see you in M1."
  *Lesson-plan note:* this is a natural end-of-first-lecture slide replacement.
- **A complexity line under every code block** (all 23 blocks): time and space, each anchored to
  a number this arena actually certified — binary "n=16: 14 vs 3", closest pair "8128 vs 673 at
  n=128", backtracking "2-ch: 18 nodes", TSP "720 · 2.4×10¹⁸". Two are handled honestly rather
  than tidily: Dijkstra/A* are labelled with the real heap bound and a note that the min-scan
  shown is an O(V²) teaching stand-in, and knapsack DP is labelled pseudo-polynomial ("W is a
  NUMBER, not a size — remember this at the Wall").
  *Lesson-plan note:* the suggested place to introduce asymptotic notation is the M0 → M1 boundary.
  By then students have measured real counts (14 vs 3, 113 operations, the 4¹⁵ funnel), so big-O
  arrives as a name for something already seen. Recurrences fit naturally at M5, pseudo-polynomial
  at M6's knapsack, NP language at M8.
- **Slide-ready map figures.** The campus map can now be drawn natively inside a Typst deck from
  the same `map1.json` this app reads — plain, cropped to the close-up window, or overlaid with
  certified visited/frontier/distance/route data. The generator is maintained
  separately and is not part of this repository. Change the map data, re-run it, and your slides follow.

### Fixed

- The **State space** and **Ambient grid** buttons no longer sit there during M0's pickup-rack
  scenarios, where they have nothing to show. They appear on the map scenarios only.
- The home-page footnote still showed the retired beat notation; it now reads P→F→S→V→L ↻.

---

## 2026-08-23

**Certified numbers** changed: 70 → 74 pinned values, diff = 0, and DFS was re-pinned.

- **DFS is now 29 expanded / 27 hops** on the authored target. It was 90 pops / 31 hops at launch
  and briefly 105 / 45 on 2026-08-22. This is the current pair.
- **Four new pinned values**, all for M0's brute-force finale: 475 legal 8-step plans, 150,627
  legal 15-step plans, exactly **1** plan that both survives the walls and ends on P1, and 12 for
  P2.
- Everything else came back bit-identical: BFS 58 expanded / 15 hops, Dijkstra 104 / cost 23,
  A* 61 / cost 23, conveyor 23 vs 21, overpass 19 vs 12, Certify 1000/1000 with checksum 14905,
  M0's sort at 63 comparisons / 50 shifts / break-even 11.

### Changed for your classroom

- **One Step is now one loop iteration** — a pop, all four checks, and the pushes that survive.
  Stepping through the checks one at a time moved to a new **Substep** button. The scrubber
  readout reads `iter t/T · i/N`, and arming a scenario announces both counts.
  *Lesson-plan note:* if your notes say "press Step to see the next check", that is Substep now.
  Step is the loop.
- **All four search algorithms run one visible skeleton.** Pop, then a for-loop over the four
  moves running the same three-question check ladder (within the map? not a wall? not already
  dealt with?), then push the survivors. Queue and stack never hold an illegal or duplicate cell,
  so their pop is unconditional; the two priority queues need a fourth check at the pop to skip a
  stale copy — the asymmetry is forced by the mathematics and is now the teaching point ("the heap
  is the one container that can change its mind"). This is what moved DFS to 29 / 27.
  *Lesson-plan note:* any slide or handout quoting DFS counts needs the 29 / 27 pair.
- **The brute-force finale moved from M1 to the end of M0**, and M1 is back to five scenarios.
  M0's job is the world and the price of the question; M1 now opens with a target already on the
  table ("M0 closed with a billion plans; this room builds escape #1").

### Added

- **M0 scenario ⑤, "the REAL brute force — a billion plans."** First, four sample plans are
  actually run on the campus map: all-up dies off the map at step 1 (the ✗ is drawn outside the
  frame), all-down hits a wall at step 9, a legal wanderer walks all 15 steps and delivers nothing,
  and the fourth is the certified needle. Then the funnel table grows row by row —
  1,073,741,824 plans → 150,627 that survive the walls → 1 that ends on P1 — against a green
  comparison row: BFS finds that needle, with a certificate, in 58 pops.
  *Lesson-plan note:* this is where the course tagline gets a number. "Escapes from brute force"
  now has a first escape with a price tag attached, on day one.
- **State space and Ambient grid views work in M0**, as the map's two formal faces during the
  unveiling.
- **The code panel colours the four search blocks by role**: the shared skeleton in blue, what
  belongs to this algorithm alone in bold orange, bookkeeping in grey. BFS and DFS show exactly
  one orange line each — the character that differs — while Dijkstra and A* go orange in patches.
  The colour distribution is itself the argument. Copying still yields clean plain text.
- A `brute_plans` code block, plus a footnote on the BFS block spelling out that BFS is not the
  brute force — it is escape #1.

---

## 2026-08-22

**Certified numbers** changed: 67 → 70 pinned values, diff = 0, and DFS was re-pinned once.

- **Three new pinned values** for M0's new sorting scenario: 63 comparisons, 50 shifts,
  break-even after 11 deliveries.
- **DFS moved from 90 pops / 31 hops to 105 expanded / 45 hops.** This was superseded the next
  day — see 2026-08-23 for the current 29 / 27.
- Every other certified number was bit-identical throughout.

### Changed for your classroom

- **Choosing a scenario no longer starts it.** Clicking a scenario now *arms* it at step 0: the
  map, the target ring and the opening state are all on screen, and the status line tells you what
  your options are. You decide when it runs.
  *Lesson-plan note:* this is the biggest behavioural change in this list. It buys you the beat
  between "here is the question" and "here is the answer" — read the code panel, re-aim the
  target, take predictions — but if your lesson plan says "click BFS and talk over it", you now
  need a second click on Auto. On a finished run, Auto replays; Reset returns to the armed state.
- **The beat bar closed into a loop: P · F · S · V · L ↻.** Problem, Formulate, Solve, Verify,
  Limits, and a return arrow — the limits become the next problem. Formulate is now its own beat
  (modelling is the action the course repeats: map→graph in M0, docks→interference graph in M3,
  pins→point set in M5, map→DP table in M6, lunch rush→flow network in M7), and the loop is a
  spiral, not a circle: nine rooms are the same loop run nine times on a harder question.
  *Lesson-plan note:* slides showing the older P→S→V→L→I list are out of date. The named edge
  L → next Problem is the course tagline drawn as a structural arrow.
- **Map-1 is called "the campus map" in prose.** Titles keep the formal tag
  (`Campus map (Map-1) — …`) and the certification text keeps the formal name. The numbering
  system is untouched: sister maps carry the same certified pipeline, and every slides/homework
  cross-reference still resolves.
- **You choose who gets lunch.** M1 and M2 have a "deliver to" chip row (P1–P6). The chosen pin
  is ringed and labelled before the run, not revealed after it.
  *Lesson-plan note:* the certified numbers and the POE bets stay pinned to the authored targets
  (P1 in M1, P2 in M2). Re-aiming at another pin is an honest live run — same certified engine,
  computed on the spot, captioned as such, and recorded on the Scoreboard as `Depot→Pk` — but bets
  are only offered on the certified instances. Two useful accidents: DFS on P3 happens to find a
  12-hop shortest route, which nothing certified in advance, and the greedy walk "succeeds" on
  targets with no wall in the way, where the caption says plainly that luck is not an algorithm.
- **Rejected candidates are drawn as real nodes.** Every expansion checks four neighbours; the
  ones that fail (off the map, or a wall) now appear in the tree as full-size red ✗ nodes in the
  same row as their siblings, in the order the algorithm checked them — down, up, right, left. On
  the map, off-the-map candidates are drawn outside the frame. After the root expands, "four
  candidates, two die off the map, two enter the frontier" is visible, and the red-to-grey ratio
  across a finished tree is the evidence that most checks fail.
- **The discovery tree was recoloured** to fill nodes rather than outline them: solid green route
  nodes with bold green edges, solid blue current, solid orange dashed-outline frontier, warm grey
  expanded — the same language as the map.
- **The TARGET marker is green, not red.** In the Ambient grid the red target ring was drowning in
  a screenful of red invalid nodes. Green is the result colour; red now means problem or invalid,
  everywhere.

### Added

- **Step scrubber.** A slider plus a single-step-back button under every animated scenario, with
  an `i/N` readout. Freeze on any probe or expansion and talk. Dragging is live. It works in every
  room because it lives in the animation engine, and Step/Auto continue from wherever you stopped.
  Paired with M0's binary search, where the eliminated half of the rack is now dimmed and struck
  through, you can park on probe 1 and make "half of what remains dies with every probe" a still
  image.
- **"The code" panel** under the main canvas: for each algorithm beat, plain hand-written Python
  with a copy button, offline-safe. It matches the certified core line for line — same neighbour
  order, same tie-breaks, goal test at the pop — so students never see code that disagrees with
  the animation. No libraries: the heap is written out as `min(...)` with a note that a binary heap
  does exactly this, just faster. Descriptive variable names throughout; single letters only where
  they are the community standard (i/j, lo/hi/mid, g/h/f).
- **3× PNG export.** A ⤓ button on the main canvas and another on the side panel, rendering a
  genuine 1860×1800 re-render (not an upscaled screenshot) frozen at the current scrubber step,
  on the paper background, with the room, scenario, step and view in the filename. Scrub, then
  export: that is the slide-making workflow.
- **A data-structure panel** showing the container live — QUEUE (FIFO) for BFS, STACK (LIFO) for
  DFS, PRIORITY QUEUE for Dijkstra and A*, with keys shown and stale copies struck through in
  grey so the rent that lazy insertion pays is visible. Split into ITERATION START (the container
  when this iteration's pop happened) and ITERATION END so one loop iteration can be told
  end-to-end. It is honest when armed: only the start cell inside, nothing pushed yet.
- **Two formal views of the map, as buttons beside Tree view.** **State space** — 108 states, 148
  edges, laid out in rows by true distance from D. **Ambient grid** — the 14×14 window of 192
  positions the move operator can even name: 108 free, 36 walls, 48 off-map, with the failures
  drawn as red ✗ nodes. Delete the red and you get the state space; the canvas footnotes say so in
  the standard terms (the state space is the induced subgraph of the ambient grid on the free
  cells). A second footnote makes the point that the full space is a **graph, not a tree** — the
  cross links are cycles, an unbounded walk tree is infinite, and the discovery tree is the acyclic
  carving one algorithm makes on the graph, which is exactly why the seen set exists. During a run,
  the explored part lights up inside the full space, so "the space is this big, we walked this
  little" is one picture.
- **Array view.** A `map | array` toggle in M1, M2, M7 and M8 that redraws the same world as a
  literal `grid[12][12]` table with coordinates in the cells — run state, mud costs, heuristic
  numbers and the robot all stay in sync. Same object, different costume.
- **The discovery tree is permanently on screen** in the side panel, growing with the animation
  frame by frame; Tree view now means "blow it up onto the main canvas". The panel is larger
  (430×400), and M3's interference graph scales to fit any panel size.
- **M0 scenario ②, "who sorted the rack? — buying the structure."** Opening morning, the crates
  arrive out of order; insertion sort animates the way a person actually tidies a shelf, counting
  comparisons and shifts live, and closes on 63 + 50 = 113 operations paid once, against 11
  probes saved per lookup — break-even after 11 deliveries, and the rack stays sorted forever.
  Structure is an investment, not a gift. M0 now runs the whole P·F·S·V·L↻ loop on day one.

### Fixed

- Row numbers 10 and 11 overflowed the map frame; axis labels are now properly anchored.
- Dragging the scrubber advanced only one step and then stopped. Dragging is now continuous live
  scrubbing.
- The selected scenario is now clearly marked (red dashed border), which matters much more now
  that selecting a scenario arms rather than runs it.
- Rejected-candidate marks were drawn in the enlarged tree view but not in the side panel, which
  had a legend promising them.
- Empty-queue labels overlapped in the data-structure panel.

---

## 2026-08-20

**Certified numbers** first pinned: **67 values, Python/JS twin diff = 0**, including the grid
checksum. Certified at launch and unchanged since unless noted in a later entry: greedy walk stuck
at (5,0) after 5 steps, BFS 15 hops, Dijkstra cost 23 against 25 for the fewest-steps route,
conveyor 23 vs 21, overpass 19 vs 12 with 14 inadmissible cells, χ(C5) = 3, closest pair 4.00 vs
4.12, TSP 720 tours with 51 optimal against 53 for nearest-neighbour, max flow 2, Certify
1000/1000 with cost checksum 14905, knapsack greedy 14 vs optimal 16, MST 24, stairs 89 ways,
grid DP D→C3 cost 22 with 53 optimal monotone paths.
*DFS was 90 pops / 31 hops on this date; see the 2026-08-22 and 2026-08-23 entries for the
current 29 / 27.*

### Added

- **First complete build: all nine rooms, M0 through M8**, on one 12×12 map — deliberately rough
  in polish, complete in arc, and with no compromise on the numbers.
- **The Scoreboard**, accumulating across rooms for the whole session — instance, algorithm,
  expanded/operations, answer quality — ending in M8's red row.
  *Lesson-plan note:* it is session-local by design. Reloading clears it; every row is one click
  to recreate.
- **The beat bar**, marking which stage of the loop each scenario belongs to, so "we are in the
  Verify stage" is a place you can point at.
- **POE bets** (predict, then run, then reveal) on the three cross-algorithm comparisons with real
  suspense: DFS vs BFS in M1, Dijkstra vs A* in M2, and whether nearest-neighbour finds the
  optimal tour in M8.
- **The Certify button** in M2: 1,000 sister instances — the same walls, randomized positive
  weights — differential-tested in the browser in about a second, asserting A* cost ≡ Dijkstra
  cost, with the checksum compared live. A working demonstration that "verify" means something.
- **Deterministic share links** carrying room, scenario and the close-up toggle, plus a headless
  hook for automation.
- **Per-room briefing panels** (three parts: the room's question, how the campus map is used or
  why it steps offstage, and the order to run the scenarios).
- **The discovery tree**, growing from the same event stream as the map animation — the rows of a
  BFS tree are literally its rings.
- Close-up mode, HiDPI rendering, and the whole thing as one offline single file.

### Changed for your classroom

- **The world is a campus cafeteria delivery robot** — the cafeteria sends meals to students
  across campus — replacing the earlier warehouse framing. The topology and every certified number
  are untouched. Formal identifiers are untouched too: D, P1–P6, C1–C3 and Scoreboard labels like
  `Depot→P1` remain the cross-reference names for homework, slides and the certification report,
  with the briefings glossing them ("D = the cafeteria — formally, the Depot").
- **M7's narration was corrected.** On this map the row-7 corridor is *not* the minimum cut; the
  certified cut is the cafeteria's own two doors. The room now says so ("the cut was visible all
  along").
  *Lesson-plan note:* if your slides call the row-7 corridor the binding bottleneck, they disagree
  with the certified map. Making the corridor the binding cut would require changing the map and
  re-certifying.
- **M0 was rebuilt around the rack.** The pickup rack is drawn on the main canvas as a literal
  one-row map (16 cells, same visual language as the campus map), with the eliminated interval
  highlighted, and it closes with the bridging line: scan is exploring blindly, binary search is
  exploiting structure — M1 replays the first half in 2-D, M2 finishes the second.
- **Mini-map insets were removed** and their job given to the briefing panels: an off-map
  visualization now explains its relationship to the campus map in words rather than in a small
  picture.
- **The map got real icons**: a cafeteria storefront, charging kiosks, teardrop pins and a delivery
  robot, drawn as vector paths so nothing loads from the network. The robot appears only where the
  robot really is — walking the greedy walk, or gliding along a returned route to make the
  delivery. Expanded cells stay blue circles, because marking them with a robot would teach a
  misconception.

### Fixed

A review pass over the first build found and fixed 39 issues.
The ones you would have hit in class:

- Scenarios could leak across rooms — switching rooms mid-animation let an old run write into the
  new room's canvas, caption or Scoreboard.
- Rooms could open with the previous room's canvas, title or sidebar still in place.
- Auto's pause/resume and the speed slider did not affect about ten scenarios (the four-step
  exchange-argument proof ran in under half a second).
- POE verdicts vanished after a few seconds, bets could be silently changed, and Auto could bypass
  a pending bet.
- In close-up mode a route that left the window and came back was drawn as a straight line through
  walls; M2's overpass route was drawn as a chord across four wall cells instead of along the
  bridge.
- The home cards could not be reached from the keyboard at all. Keyboard entry, live-region
  announcements, contrast and shape redundancy (so nothing is distinguished by colour alone) were
  all brought up to standard.
- Three captions contradicted the certified numbers and were corrected.
