#!/usr/bin/env python3
"""Build the self-contained Plarena app HTML files.

Every arena is self-contained: its sources live in <arena>/src/ and its data
in <arena>/data/. This script inlines the shared vendored rough.js, plus each
arena's deterministic core, into the <!--PLACEHOLDER--> slots of the source
file, producing one offline-capable HTML file per arena.

Usage:  python3 lib/build.py
Writes: <arena>/index.html for every arena below.

Does NOT touch <arena>/fall2026/ — semester snapshots are frozen once the
term's links are handed out; cut a new one deliberately, never from a build.
"""
import pathlib

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
    out = root / out_dir / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(root)} ({len(html):,} chars)")
