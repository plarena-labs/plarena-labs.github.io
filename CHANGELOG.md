# Plarena — Changelog

Suite-level history: releases, semester snapshots, and anything that cuts across more
than one arena. **Each arena keeps its own changelog** — that is where you look to find
out whether your demo will behave differently:

- [`search-arena/CHANGELOG.md`](search-arena/CHANGELOG.md)
- [`algo-arena/CHANGELOG.md`](algo-arena/CHANGELOG.md)
- [`game-arena/CHANGELOG.md`](game-arena/CHANGELOG.md)
- [`ml-arena/CHANGELOG.md`](ml-arena/CHANGELOG.md)

These changelogs are written for instructors, not for engineers. Internal refactors,
build sizes and test counts are deliberately left out.

**Two axes of versioning.** They are independent, and they exist for different reasons:

- **Semester snapshots are directories** — `<arena>/fall2026/` — because a frozen build
  has to stay openable in a browser. One per term. Point course materials, assignment
  share-links, and anything that must reproduce months later at the snapshot; the arena
  root keeps improving, the snapshot does not. A share-link handed out in week 2 still
  reproduces in week 14.
- **Releases are git tags** — because history belongs in git, not in duplicated
  directories. `v1.0.0` is reserved for the first formal public release; until then the
  suite is `v0.x`.

---

## v0.1.3 — 2026-08-24

First public release of the suite. Four arenas, each a single self-contained HTML file
that runs offline from disk.

### Added

- **Algo Arena** joins the suite — nine rooms on one certified campus map, from linear
  scan to the travelling-salesman wall.
- `fall2026/` semester snapshots cut for all four arenas.
- Per-arena `README.md` and `CHANGELOG.md`.

### Changed

- **The suite makes no network requests at all.** Search Arena was the last holdout: it
  pulled three faces from Google Fonts, which also meant a console error whenever the
  page was opened offline. It now uses the same system font stack as the other three
  arenas. Every arena is now genuinely offline-clean — open it from a USB stick in a
  lecture hall with no Wi-Fi and nothing is missing.
- **Repository restructured so that each arena is self-contained.** Sources, data and
  snapshots now live under the arena that owns them; only genuinely shared things
  (`rough.js`, the build script) sit in `lib/`. One arena can be read, forked or handed
  over without touching the others.
- **All four arenas are reproducible from source, byte for byte**, via
  `python3 lib/build.py`. Algo Arena was previously not covered by the build script.
- **Licensing stated in three layers** — code, course content, and brand assets each
  carry their own terms. See `BRAND.md`.

### Removed

- The `v1/` pinned-version directories. Their job — a frozen, linkable build — is done
  by the semester snapshots, and the name `v1` is reserved for the first formal release
  instead.
