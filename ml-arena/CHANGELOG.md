# ML Arena — Changelog

Written for teachers: what will be different about your demo. Engineering detail lives elsewhere;
this file records what you will see on the projector, what moved, and which pinned classroom numbers
still reproduce.

**Two axes of versioning.** `ml-arena/fall2026/` is a frozen semester snapshot — point your
assignments and share links there and they will not shift under a class. Git tags mark releases;
`ml-arena/index.html` is the latest build and can change between tags. Current release: **v0.1.3**.

Every entry opens with a **Certified numbers** line. ML Arena's numbers are certified by running the
same configuration through a Python twin of the browser engine and comparing float-for-float, so
"unchanged" means the pinned scenarios still produce the figures on your slides.

---

## 2026-08-24

**Certified numbers** unchanged for restaurant mode (the recommender engine is untouched);
the grades-mode figures are pinned for the first time and listed below.

### Added

- **Student grades mode.** A second teaching mode on the same engine: the same linear,
  logistic and MLP machinery applied to a cohort of ten students and their marks, for
  courses that would rather not teach regression on restaurant menus. It covers the
  loss-function story (MSE against MAE), what a gradient actually is, gradient descent as
  a walk downhill, the degree U-curve, and classification thresholds with their false
  positives and negatives laid out.
  - Pinned: least-squares fit **4.9939x + 44.9333**, MSE **12.49**, MAE **2.09**;
    K(5 hours) → **70**; degree 9 trains to **0.00** and scores **260.12** on the cohort;
    the logistic boundary settles at **3.49 h**; at threshold 0.5 the cohort gives 2 false
    positives and 0 false negatives, at 0.85 it gives 0 and 3.
- **A mode chooser on the landing page.** *Lesson-plan note: the app no longer opens
  straight into the restaurant recommender — there is one click first. A share link still
  goes directly to the room it encodes, so assignment links behave exactly as before.*

### Changed

- Restaurant mode is byte-for-byte the same experience: same rooms, same personas, same
  numbers, same share-link behaviour. Only the way in changed.

## 2026-08-22

**Certified numbers** unchanged (pinned Linear's home scenario re-run: 0.359, no drift; full-suite
regression clean)

### Changed for your classroom
- Anywhere like/dislike points were told apart by hue alone — the Inspect fit view, the sigmoid
  chart, the 3-D surface — dislike is now drawn as an **✕**, the same shape language as the ♥/✕ on
  the menu and the main canvas. Nothing in the app now depends on a projector reproducing colour
  faithfully, or on the viewer distinguishing hues.
- Like/dislike deliberately stay on the colour-blind-safe data palette rather than a red/green
  scheme: dislike is a preference, not an error, and a red/green mapping quietly teaches students
  that one class is "wrong".

### Added
- **Filter bubble overlay.** A toggle hatches the region of taste space that falls below the
  top-k recommendation threshold and labels it with the share of the space excluded, plus the line
  that carries the lesson: *f never recommends here — and never learns it was wrong here.* The
  hatching is diagonal, so it survives greyscale and projection.
- **Simulate 3 feedback rounds.** The system recommends three dishes, persona ground truth rates
  them, the model retrains — three times, with round badges ①②③ on the map. The verdict is the
  demo: with The Contrarian on XOR under the logistic lens, all 9 new ratings come from inside the
  bubble, the hatched zone receives 0 new labels, and 5 dishes the persona actually likes sit
  unrated then, unrated now, invisible forever. That is the whole exploration-vs-exploitation
  argument in one click.
  *Lesson-plan note:* the simulation needs an oracle, so it requires a persona data source; in
  self-rating mode the app explains this instead of running. The simulation keeps its own state —
  it only touches the taste space, Clear restores, and any retrain invalidates it.
- **`fall2026/` frozen snapshot.** A pinned copy of the app for the semester, so a share link handed
  out as an assignment keeps behaving the same way after the latest build moves on.

---

## 2026-08-13

First public release of ML Arena, plus the same-day run of additions that took it from three lenses
on one canvas to five rooms.

**Certified numbers** certified fresh for every engine change: JS/Python twin agreement at
rtol ≤ 1e-9 on loss and validation trajectories and ≤ 1e-10 on linear coefficients; the polynomial
expansion (re-run at degree 8 and 10) and the gradient-descent linear solver match the twin at
**diff = 0.0**; the hidden = 0 ≡ logistic invariant is exact epoch for epoch (**diff = 0.0**);
linear coefficients independently cross-checked against `numpy.lstsq` at a maximum relative error
of 6.25e-11.

### Changed for your classroom
- **The app now opens on a room chooser inside restaurant mode, not on the full console.** Five rooms — Linear /
  Polynomial Regression, Forecast, Logistic, MLP, Compare & Bet — each showing only the controls
  that room needs. A persistent `room:` bar under the header switches between them.
  *Lesson-plan note:* predict-then-reveal bets now live only in **Compare & Bet**; scenarios inside
  a single-model room run straight through without a bet. Share links made before this release have
  no room in them and land in Compare, which is the superset — they still work.
- **Forecast is its own room**, not a scenario hiding inside Linear. Its percepts block is the sales
  ledger, its controls are seed, New data and degree, and the recommender's menu, personas and hand
  fit are simply absent.
  *Lesson-plan note:* clicking a persona while in Forecast used to bounce you silently back into the
  recommender mid-demo. It cannot happen now.
- **Degree slider now runs 1–10** (was 1–6). Crank it to 10 on Linear's home (The Regular, 16
  ratings, stars, seed 12) and you get train RMSE **0.000** — perfect memorisation — against a
  held-out **5.611**, where the baseline is **1.282** and degree 1 sits at **0.359**. The absurdity
  shows up as guesses of 15.7★ and −2.2★ printed right in the data table.
- **The Forecast sales series gained a rain term and a temperature term.**
  *Lesson-plan note:* this changes the data. Any Forecast figure you noted from an earlier build
  will not reproduce. The pinned ladder is now, at seed 12 and degree 1: forecast RMSE
  **$147 → $87 → $53** across day only → + rain → + rain + temp, against a baseline of **$143**
  (fit RMSE $101 → $79 → $62). One sentence for the board: adding the right feature beats cranking
  ten degrees of polynomial. Day-only cannot explain the rainy-day holes no matter how it bends.
- **Controls moved to where students look for them.** Share link is now global, in the header at
  top right, just after the breadcrumb. Table, CSV export and Clear moved onto the Menu heading row,
  because actions on data belong with the data. The scenario row now holds only scenarios.
- **The grey bars outside the axes are labelled and hoverable.** They were always 10-bin histograms
  of the menu along each feature; now the canvas says so and hovering one reads out, for example,
  how many of the 30 dishes fall in a price bin. Exploratory data analysis becomes the first
  queryable thing on screen instead of decoration.
- **Recommendations now state their own rule** — "the 5 unrated dishes where f predicts the HIGHEST
  score (ranked by ŷ, not by error)" — and blue rank rings ①–⑤ appear on the taste space, visibly
  sitting in the region the surface predicts highest. Students can see the causal chain from agent
  function to action rather than take it on trust.
- **Textbook branding removed from the interface.** The scorecard is now "Environment — what kind of
  world is this? (live)". The concepts are unchanged; only the textbook name is gone, so the app
  does not imply a required text.
- **Out-of-range predictions are flagged.** In stars mode a guess outside 1–5 gets a "(!)" on the
  menu card, the recommendation card, the data table and the hover readout, matching the existing
  "(!)" for probabilities outside 0–1. A linear model predicting 8.6★ is an honest defect worth
  marking, not hiding — and the ★ unit itself is correct, because predicting in the target's own
  unit is exactly what regression does.

### Added
- **Initial release.** 30 Miami dishes with two visible features (spiciness, price); ratings as
  like/dislike or stars; three lenses on one shared canvas with mutually exclusive overlays;
  personas — The Regular (graded taste), The Purist (threshold), The Contrarian (XOR) — as
  reproducible ground truth; progressive disclosure and a cold open; Guess-before-you-taste;
  live refit for linear and Watch training for the gradient-descent lenses; count-based metrics with
  a baseline always on screen; two A/B history slots guarded by a configuration hash; CSV export;
  seeded share links.
- **Pinned scenarios (world seed 12).** Linear's home — The Regular, 16 ratings, stars. Warm-up win
  — The Purist, 16 ratings, logistic, **14/14** on the held-out pool, which buys the trust that the
  next scenario spends. XOR upset — The Contrarian, 16 ratings: logistic lands **7/14**, a pure coin
  flip, then the MLP at 4 hidden units takes **14/14**. Scissors — The Purist, 10 ratings with one
  flipped label: the MLP at 16 hidden units scores train 10/10 but **11/20 (0.55)** on the pool with
  a rising validation curve, while logistic scores train 9/10 and **17/20 (0.85)** — a 0.30 gap you
  can point at. Pinned hyperparameters: logistic lr 0.5 / 400 epochs; MLP lr 0.8 / 1500 epochs, 2000
  at 16 hidden units.
- **Polynomial degree slider** on the linear and logistic lenses. Every lens now has a
  bias-variance dial: hidden units for the MLP, degree for the other two. It also gives XOR a second
  exit — logistic at degree 1 scores 0.50 on the pool, and at degree 2, with the interaction term,
  **0.93**. Engineer the features or learn them: two roads out of underfitting. The interface keeps
  students honest with "still LINEAR in the weights".
- **Hand fit** (linear and logistic, degree 1). Three sliders for b, w₁, w₂ drive the model directly;
  the boundary, the heat map and the recommendations follow in real time, and a live readout compares
  your loss to the optimizer's. **Snap to fit** jumps to the trained optimum. Under the MLP the
  feature is disabled, and the refusal is the punchline: 16 hidden units means 65 parameters, and
  there are no sliders for that — which is why we need an optimizer.
- **Inspect panel**, a per-lens deep dive under the shared canvas. Linear: a Fit view with rating on
  the vertical axis, one feature on the horizontal, the fitted slice through the point cloud, filled
  circles for actual ratings, hollow circles for predictions, and the residual as the vertical line
  between them — plus readable coefficient text ("average dish ≈ 2.2★ · +0.64★ per spiciness ·
  −0.41★ per $"), which at high degree honestly says the weights are no longer individually
  readable. Logistic: the sigmoid itself, every rated dish sitting on the one S-curve, the boundary
  at score zero. MLP: each hidden unit's own straight boundary drawn over the main canvas, thickness
  proportional to its output weight — the curved boundary is their weighted vote, an MLP as a
  committee of logistic regressions, and at 0 hidden units the committee is one straight line, which
  is logistic.
- **Query the curve.** The Fit view extends past the data range with the outside marked
  "extrapolation", and moving the mouse along the axis drops a probe onto the curve and reads out
  the prediction. At seed 12 with The Regular and 16 ratings, degree 1 extrapolates to 4.6★ at
  x = 1.28 while degree 6 gives **9.1★** — overfitting is merely embarrassing when interpolating and
  a disaster when extrapolating. Clicking empty canvas creates an **invented dish**: a brand-new
  input the model has never seen, answered on the spot. Fitting is the means; querying is the point.
- **Forecast**, a food-truck daily sales series: days 1–24 to train on, 25–30 as the future, a
  Reveal next week button that drops the real values in and pulls out the error lines. Regression
  finally gets a genuinely continuous target inside the same food world, and linear regression now
  has all three of its faces — Forecast (continuous, its true home), stars (graded, in the
  recommender), like/dislike (its failure scene, which is what motivates logistic).
- **Forecast feature ladder**: day only → + rain → + rain + temperature. Rain is discrete, so it
  copies and shifts the whole curve — two conditional curves on the chart. Temperature is
  continuous, so it bends every single day, at which point a single curve can no longer be drawn
  honestly and the chart shows a slice at average temperature with each day's real prediction
  floating off it. Coefficients stay readable in the multi-feature case: the app reports rain at
  about −$144 per rainy day and temperature at about −$9.3 per °F.
- **3-D surface view**, in Inspect and in Forecast, rotatable by dragging. The heat map was always
  this surface seen from directly above; now you can see it from the side. Linear at degree 1 is a
  plane cutting through the point cloud; logistic is a sigmoid cliff whose edge is the decision
  boundary; the MLP on XOR is a landscape of ridges and valleys voted up by the hidden units. In
  Forecast the day-only model is a sheet that is perfectly flat along the temperature axis — a model
  cannot bend along an axis it cannot see — and it visibly tilts once temperature is an input, which
  is the geometric reason behind the RMSE ladder.
- **Solver toggle** in the Linear room: closed form (normal equations, one algebraic step) or
  gradient descent (full-batch on MSE, lr 0.5 / 400 epochs). Watch training unlocks for linear only
  in gradient-descent mode, the loss panel finally shows regression descending, and a live line
  reconciles the two roads to the same minimum. Sweep results are on file for the optimizer lesson:
  lr 0.5 converges, lr 0.8 at degree 3 diverges outright — the learning rate is a cliff, not a dial.
- **Data table view.** A Table ⇄ Cards toggle on the Menu heading turns the dataset into rows and
  columns — one row per data point, one column per feature, rating as the target, model ŷ alongside
  — with hover linked in both directions between table and canvas. Forecast has its own table
  (day, sales, curve prediction, rain, temperature) where future rows read "? (future)" until Reveal,
  and clicking a row or a point selects it stickily across both the timeline and the 3-D view.
- **Agent anatomy and a live environment scorecard.** The whole layout is arranged as an agent:
  percepts (the menu and table) at top left, actions (the recommendations) below it, and the
  learnable middle — controls, taste space, Inspect, metrics, loss — filling the large right column.
  The scorecard reads the current state: partially observable, deterministic or stochastic depending
  on the data source, discrete or continuous depending on the target, single agent, static, and
  **episodic** — noted explicitly against the sequential worlds of the companion arenas, because no
  action here carries state into the next step, which is precisely why supervised learning applies.

### Fixed
- **Hand fit now reaches the Inspect panel.** The fit slice and the coefficient text were reading
  the trained model rather than your manual weights, so dragging w₁ changed the boundary but not the
  "per spiciness" number. They are now the same model everywhere: drag a slider and the coefficient
  text moves with it.
- **Canvases render sharp on high-DPI displays.** The taste space, Inspect and loss panels were
  drawn at one device pixel per CSS pixel and looked soft on Retina-class screens and large
  projectors. Text and curves are now crisp; nothing changes on standard-density displays.
- **Recommendation cards match menu cards.** Same name and feature layout, with rank and predicted
  score in place of the rating, and hovering one highlights the dish on the canvas.
