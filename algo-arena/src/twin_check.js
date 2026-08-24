// JS<->Python twin check: pinned values must be identical (integer diff = 0).
// Usage (from this directory): python3 algo_core.py --emit ../data  &&  node twin_check.js
// Artifacts go to ../data so they land where they belong; emitting into . drops three
// untracked JSON files beside the sources and the publication gate then blocks the push.
const core = require("./algo_core.js");
const fs = require("fs");

function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === "object") {
    const o = {};
    for (const k of Object.keys(x).sort()) o[k] = canon(x[k]);
    return o;
  }
  return x;
}

const P = core.computePinned(true);
fs.writeFileSync("../data/pinned_js.json", JSON.stringify(canon(P), null, 1));
const py = JSON.parse(fs.readFileSync("../data/pinned_py.json"));
const keys = new Set([...Object.keys(py), ...Object.keys(P)]);
let fails = 0;
for (const k of [...keys].sort()) {
  const a = JSON.stringify(canon(py[k])), b = JSON.stringify(canon(P[k]));
  if (a !== b) { console.log("MISMATCH", k, "py=", a, "js=", b); fails++; }
}
if (fails === 0) {
  console.log(`TWIN MATCH: all ${keys.size} pinned values identical (diff = 0)`);
  process.exit(0);
} else {
  console.log(fails + " MISMATCHES");
  process.exit(1);
}
