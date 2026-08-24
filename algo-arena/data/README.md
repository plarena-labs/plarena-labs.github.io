# data — certified Map-1 artifacts

The map itself is a `GRID` literal, mirrored operation-for-operation in
`../src/algo_core.py` (normative) and `../src/algo_core.js`. The twin check
covers it: a grid checksum is one of the pinned values. Nothing in this
directory is edited by hand.

- `map1.json` — topology, toggle layers and every room instance, **emitted** by
  `python3 ../src/algo_core.py --emit ../data`. Consumed by external tooling
  (for example the Typst figure generator, maintained separately); the
  single-file app does not read it at runtime.
- `pinned_py.json` — pinned numbers from the Python side, emitted by the same
  command.
- `pinned_js.json` — the JavaScript side's values, emitted by
  `node ../src/twin_check.js`, which then diffs the two (integer diff = 0).
- `map1_certification_report.txt` — the human-readable PASS list for the
  R-checks.
- `verify_map1.py` — the original standalone certification script (it emits
  R0, R1, R2, R3, R4, R5, R8 and R10; R0 connectivity is the one check that
  lives only here).
  Kept as the historical record of how Map-1 was certified; `../src/algo_core.py`
  supersedes it and is the normative implementation today.

Rule: never build UI on an unverified map. Any layout or instance change ⇒
re-emit and re-run the twin check before touching the app or the slides.
