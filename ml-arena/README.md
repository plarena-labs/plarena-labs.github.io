# ML Arena

**Machine learning, playable — your clicks are the training set.**

ML Arena is a tiny recommender you teach by eating. Rate Miami dishes on a two-feature menu
(spiciness and price) and those ratings *are* the training set — there is no borrowed matrix of
someone else's data. Three lenses on that one shared canvas — linear, logistic, and a small neural
network — fit the same points at the same time, and the point of the app is that each one wins where
the others fail. Selecting a model is not picking the best algorithm; it is making an assumption
about the world, and here you can watch the assumption be right or wrong.

Single HTML file, no build step at runtime, no network, no dependencies. Laptop-sized (1180×900 and
up), designed to stay readable on a projector.

## Two modes

The app opens on a mode chooser. **Restaurant mode** is the recommender described below —
your clicks are the training set. **Student grades mode** re-skins the same engine onto a
cohort of ten students, for courses that would rather teach regression and classification
on marks than on menus. Both modes share one deterministic core; a share link goes straight
to the room it encodes, bypassing the chooser.

## The five rooms (restaurant mode)

Inside restaurant mode a persistent `room:` bar switches between them. Each room shows
only the controls it needs.

| Room | What it is for | The lesson it lands |
|---|---|---|
| **Linear / Polynomial** | Stars or like/dislike target, degree slider, Hand fit, Fit view, closed-form ⇄ gradient-descent solver | Linear regression wins on graded targets — fast fit, readable coefficients, useful on very few samples — and embarrasses itself on 0/1 labels, which is what motivates logistic |
| **Forecast** | A food truck's daily sales: 24 past days, 6 in the future, a features ladder of day → + rain → + rain + temperature, and a Reveal that lets the future arrive | Regression's true home: a continuous target and a curve that runs into the future. The multi-feature ladder shows that adding the right feature beats cranking the polynomial — at seed 12, degree 1, forecast RMSE goes **$147 → $87 → $53** against a baseline of $143 |
| **Logistic** | Like/dislike labels, the sigmoid drawn as itself, Watch training, degree as a feature-engineering exit | Wins clean on separable tastes and then lies flat on XOR — the hypothesis class does not match the world, and the failure lands on the recommendation list before it lands in the metrics |
| **MLP** | Hidden-units dial (0–16), hidden-layer anatomy overlaid on the canvas, Watch training | Wins on XOR, because a committee of straight boundaries votes a curved one into existence — and on 10 ratings with 16 hidden units it memorises the noise instead |
| **Compare & Bet** | All lenses unlocked, predict-then-reveal bets, two A/B history slots | Champion rotation: turn one dial and a different model wins. There is no best model, only a best assumption |

Hidden units set to 0 turns the MLP into logistic regression, exactly — same loss curve, epoch for
epoch. The family bridge is a dial, not a metaphor, and the anatomy overlay makes it visible: at 0
hidden units the committee is one straight line.

## For instructors

- **Predict-then-reveal bets.** Before a scenario runs in Compare, students commit to which model
  will win. Confronting a misconception beats displaying one, and the bet turns a demo into an
  exam-style judgement call.
- **Deterministic seeds and share links as assignments.** Everything — the menu, the personas, the
  ratings, the trajectories — comes from a seed. A share link carries the whole state, so a link is
  a reproducible assignment, and your third time teaching the course produces the same demo as your
  first. `fall2026/` is a frozen snapshot to point assignments at.
- **Held-out evaluation against persona ground truth.** The three personas (The Regular, The Purist,
  The Contrarian) have known taste rules, so every unrated dish is a labelled held-out item. Metrics
  are reported as counts ("14/14") rather than percentages of a handful of items, and a baseline is
  always on screen: beating nothing is not a result.
- **CSV export** of the rating data, plus a Table ⇄ Cards view of the dataset — one row per data
  point, one column per feature, rating as the target, the model's prediction alongside.
- **Degree slider (1–10)** for live overfitting. At degree 10 on the pinned stars scenario the
  training RMSE hits 0.000 — perfect memorisation — while the held-out RMSE blows out to 5.611
  against a baseline of 1.282, and the menu fills with predictions like 15.7★ and −2.2★.
- **Closed form ⇄ gradient descent.** Same minimum, two roads: solve it in one algebraic step, or
  watch 400 epochs walk down to the same answer, with the two reconciled numerically on screen.
- **Hand fit.** Be the optimizer: drag the weights yourself, watch the loss, then Snap to fit. Under
  the MLP the sliders are refused, and the refusal is the lesson.
- **Filter bubble.** Hatch the region the recommender never suggests, then simulate three feedback
  rounds and count what the model never learns it was wrong about.
- **Agent and environment scorecard.** The layout is arranged as an agent — percepts in, actions
  out, the learnable function in the middle — with a live scorecard of the environment's properties
  (partially observable, episodic, single agent, and so on) that updates as you change the data
  source and target.

## Layout

```
index.html      latest build
README.md       this file
CHANGELOG.md    what changed, for instructors
src/            ml_arena.src.html, ml_core.js, ml_core.py (Python twin), ml_grades.js
fall2026/       frozen semester snapshot — link assignments here
```

Build from the repository root with:

```
python3 lib/build.py
```

## Correctness

Every trajectory the app draws is verified against a Python twin of the engine: `ml_core.py` and
`ml_core.js` implement the same models in the same operation order, share a self-written
deterministic random number generator, and use a hand-written deterministic exponential rather than
the host language's, so results do not drift between JavaScript engines or between languages. Loss
curves, coefficients and metrics therefore reproduce exactly; agreement was measured during
development at better than 1e-15 relative, and the polynomial and gradient-descent paths match at a
difference of zero. That is what makes it safe to pin a number to a slide. (Unlike Algo Arena, this
arena does not yet ship a standing twin-check harness — the comparison is run by hand. Committing
one is outstanding work.)

The twin has a second job: `genItems(seed)` regenerates the arena's world outside the browser, so a
project notebook can be handed the same seed and get the same dataset the students explored.
