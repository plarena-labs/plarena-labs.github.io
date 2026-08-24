#!/usr/bin/env python3
"""Build the self-contained Plarena app HTML files.

Every arena is self-contained: its sources live in <arena>/src/ and its data
in <arena>/data/. This script inlines the shared vendored rough.js, plus each
arena's deterministic core, into the <!--PLACEHOLDER--> slots of the source
file, producing one offline-capable HTML file per arena.

Usage:  python3 lib/build.py
Writes: <arena>/index.html for every arena below.

Also refreshes the temporary development notice (lib/notice.html) in the
paired NOTICE markers of every page, including the hand-written portal
index.html. That file is OPTIONAL: delete it, rebuild, and the notice
disappears everywhere with the markers left intact. Nothing depends on it.

Does NOT touch <arena>/fall2026/ — semester snapshots are frozen once the
term's links are handed out; cut a new one deliberately, never from a build.
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
rough = (root / "lib" / "rough.js").read_text(encoding="utf-8")
ROUGH_BANNER = (
    "/*!\n"
    " * rough.js v4.6.6 — https://roughjs.com  (inlined verbatim)\n"
    " * Copyright (c) 2019 Preet Shihn\n"
    " * Permission is hereby granted, free of charge, to any person obtaining a copy of\n"
    " * this software and associated documentation files (the \"Software\"), to deal in\n"
    " * the Software without restriction, including without limitation the rights to\n"
    " * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of\n"
    " * the Software, and to permit persons to whom the Software is furnished to do so,\n"
    " * subject to the following conditions: the above copyright notice and this\n"
    " * permission notice shall be included in all copies or substantial portions of the\n"
    " * Software. THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND,\n"
    " * EXPRESS OR IMPLIED. See the MIT License for the full text.\n"
    " */\n"
)
ROUGH_INLINE = "<script>\n" + ROUGH_BANNER + rough + "\n</script>"

# --- temporary development notice (optional; absent = no notice anywhere) ---
_notice_file = root / "lib" / "notice.html"
NOTICE = _notice_file.read_text(encoding="utf-8").strip() if _notice_file.exists() else ""
_BEGIN, _END = "<!--NOTICE:BEGIN-->", "<!--NOTICE:END-->"
# A marker inside the injected text would end the region early on the next
# build, duplicating the notice in the in-place-edited portal. Refuse it.
assert _BEGIN not in NOTICE and _END not in NOTICE, \
    "lib/notice.html must not contain the NOTICE marker comments"
_NOTICE_RE = re.compile(re.escape(_BEGIN) + r".*?" + re.escape(_END), re.S)


def inject_notice(html):
    """Refill the NOTICE region. Idempotent - the markers always survive."""
    if _BEGIN not in html:
        return html
    filled = _BEGIN + (("\n" + NOTICE + "\n") if NOTICE else "") + _END
    return _NOTICE_RE.sub(lambda _m: filled, html, count=1)

# arena dir -> (source file, [(placeholder, core file, banner), ...])
APPS = {
    "search-arena": ("search-arena/src/search_arena.src.html", []),
    "game-arena":   ("game-arena/src/game_arena.src.html",     []),
    "ml-arena":     ("ml-arena/src/ml_arena.src.html", [
        ("<!--MLCORE-->", "ml-arena/src/ml_core.js",
         "/* ML Arena deterministic core (twin: verified vs ml_core.py) */"),
        ("<!--GRADESJS-->", "ml-arena/src/ml_grades.js",
         "/* Student Grades teaching mode */"),
    ]),
    "algo-arena":   ("algo-arena/src/algo_arena.src.html", [
        ("<!--ALGOCORE-->", "algo-arena/src/algo_core.js",
         "/* Algo Arena deterministic core (twin: verified vs algo_core.py) */"),
    ]),
}

for out_dir, (src_rel, extras) in APPS.items():
    src_path = root / src_rel
    if not src_path.exists():
        print(f"skip {out_dir} (source missing: {src_rel})")
        continue
    html = src_path.read_text(encoding="utf-8")
    assert "<!--ROUGHJS-->" in html, f"ROUGHJS placeholder missing in {src_rel}"
    html = html.replace("<!--ROUGHJS-->", ROUGH_INLINE)
    for placeholder, core_rel, banner in extras:
        assert placeholder in html, f"{placeholder} missing in {src_rel}"
        code = (root / core_rel).read_text(encoding="utf-8")
        html = html.replace(placeholder, "<script>\n" + banner + "\n" + code + "\n</script>")
    html = inject_notice(html)
    out = root / out_dir / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(root)} ({len(html):,} chars)")


# The portal is hand-written, not generated - only its notice region is refreshed.
_portal = root / "index.html"
if _portal.exists():
    _before = _portal.read_text(encoding="utf-8")
    _after = inject_notice(_before)
    if _after != _before:
        _portal.write_text(_after, encoding="utf-8")
        print("wrote index.html (portal notice refreshed)")
