/* Algo Arena deterministic core — JS twin of algo_core.py.
 * Every function mirrors the Python reference operation-for-operation:
 * neighbor order down/up/right/left; edge weight = destination cell cost;
 * Dijkstra lazy-insertion + closed set with heap key (dist,r,c);
 * A* heap key (f,r,c); BFS/DFS goal test at pop, expanded = pops;
 * Bellman-Ford row-major sweeps; unit-capacity Edmonds-Karp.
 * Verified: pinned_js.json must equal pinned_py.json exactly (integers).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AlgoCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var GRID = [
    "D....#.....4",
    ".##..#.#....",
    "...#.#.#.##.",
    ".#.#...#..mm",
    ".#.#.##..#m2",
    ".#...#1..#mm",
    ".#####...#m.",
    ".........##.",
    "..a...#.....",
    "#...#.#..b..",
    "3...#.5.....",
    "...#.....#6c",
  ];
  var R = GRID.length, C = GRID[0].length, N = R * C;
  var OVERPASS = [[1, 0], [1, 10]];
  var CONVEYOR = [[5, 10], [4, 11]];

  function findCh(ch) {
    for (var r = 0; r < R; r++)
      for (var c = 0; c < C; c++)
        if (GRID[r][c] === ch) return [r, c];
    return null;
  }
  var DEPOT = findCh("D");
  var PINS = {}; for (var i = 1; i <= 6; i++) PINS["P" + i] = findCh(String(i));
  var DOCKS = { C1: findCh("a"), C2: findCh("b"), C3: findCh("c") };
  var CLOSEUP = { rows: [0, 5], cols: [0, 7] };

  function id(p) { return p[0] * C + p[1]; }
  function unid(k) { return [(k / C) | 0, k % C]; }
  function isWall(r, c) { return GRID[r][c] === "#"; }
  function costRC(r, c) { return GRID[r][c] === "m" ? 3 : 1; }
  function costOf(p) { return costRC(p[0], p[1]); }
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];   // down, up, right, left

  function nbrs(p) {
    var out = [], r = p[0], c = p[1];
    for (var d = 0; d < 4; d++) {
      var nr = r + DIRS[d][0], nc = c + DIRS[d][1];
      if (nr >= 0 && nr < R && nc >= 0 && nc < C && !isWall(nr, nc)) out.push([nr, nc]);
    }
    return out;
  }
  var OPEN_CELLS = [];
  for (var r0 = 0; r0 < R; r0++)
    for (var c0 = 0; c0 < C; c0++)
      if (!isWall(r0, c0)) OPEN_CELLS.push([r0, c0]);

  function sameCell(p, q) { return p[0] === q[0] && p[1] === q[1]; }

  function edgesOf(p, overpass, conveyor, costs) {
    var out = [], nb = nbrs(p);
    for (var i2 = 0; i2 < nb.length; i2++) {
      var q = nb[i2];
      out.push([q, costs ? costs[id(q)] : costOf(q)]);
    }
    if (overpass) {
      if (sameCell(p, OVERPASS[0])) out.push([OVERPASS[1], 1]);
      else if (sameCell(p, OVERPASS[1])) out.push([OVERPASS[0], 1]);
    }
    if (conveyor && sameCell(p, CONVEYOR[0])) out.push([CONVEYOR[1], -6]);
    return out;
  }
  function extraEdges(p, overpass, conveyor) {  // the non-grid links, after the 4 moves (mirrors py edges())
    var out = [];
    if (overpass) {
      if (sameCell(p, OVERPASS[0])) out.push([OVERPASS[1], 1]);
      else if (sameCell(p, OVERPASS[1])) out.push([OVERPASS[0], 1]);
    }
    if (conveyor && sameCell(p, CONVEYOR[0])) out.push([CONVEYOR[1], -6]);
    return out;
  }
  function manhattan(p, q) { return Math.abs(p[0]-q[0]) + Math.abs(p[1]-q[1]); }

  function gridChecksum() {
    var h = 5381, s = GRID.join("");
    for (var i3 = 0; i3 < s.length; i3++)
      h = (Math.imul(h, 33) ^ s.charCodeAt(i3)) >>> 0;
    return h;
  }

  // ---- binary min-heap over triple keys (lexicographic) --------------
  function Heap() { this.a = []; }
  Heap.prototype.less = function (x, y) {
    if (x[0] !== y[0]) return x[0] < y[0];
    if (x[1] !== y[1]) return x[1] < y[1];
    if (x[2] !== y[2]) return x[2] < y[2];
    return (x[3] || 0) < (y[3] || 0);      // seq: deterministic tie-break, mirrors the py tuples
  };
  Heap.prototype.push = function (k) {
    var a = this.a; a.push(k); var i = a.length - 1;
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (this.less(a[i], a[p])) { var t = a[i]; a[i] = a[p]; a[p] = t; i = p; }
      else break;
    }
  };
  Heap.prototype.pop = function () {
    var a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; var i = 0;
      for (;;) {
        var l = 2 * i + 1, r2 = l + 1, m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r2 < a.length && this.less(a[r2], a[m])) m = r2;
        if (m === i) break;
        var t = a[i]; a[i] = a[m]; a[m] = t; i = m;
      }
    }
    return top;
  };
  Heap.prototype.size = function () { return this.a.length; };

  // ---- primitives (each returns an event trace for the UI) ----------
  // GENERIC-SEARCH — the normative shape every primitive here follows:
  // ONE skeleton at the ITERATION level: pop -> for each of the four moves
  // run the CHECK LADDER -> push the survivors. The ladder is uniform:
  //   (1) within the map?  (2) not a wall?  (3) not already dealt with?
  // Queue/stack: check (3) = "already discovered" (push-once — nothing
  // illegal or duplicated ever enters, so the pop is unconditional).
  // Priority queues: (3) weakens to "already expanded", duplicates are
  // allowed into the heap, and ONE extra exit check appears at the pop
  // (['skip']: stale copy). The heap is the one container that can change
  // its mind. Heap tie-break: (key, r, c, seq). expanded = fresh pops.
  // Events arrive in CANDIDATE ORDER (down, up, right, left):
  //   ['rej', r, c, parent]  = check 1 or 2 failed (off the map / a wall)
  //   ['dup', idx]           = check 3 failed (seen before / expanded)
  //   ['push'|'relax', ...]  = all checks passed. 1 UI Step = 1 iteration.
  function ladderBfsDfs(u, discovered, container, events) {
    var ur = unid(u);
    for (var d = 0; d < 4; d++) {                            // one iteration's for-loop
      var rr = ur[0] + DIRS[d][0], cc = ur[1] + DIRS[d][1];
      if (rr < 0 || rr >= R || cc < 0 || cc >= C || isWall(rr, cc)) {
        events.push(["rej", rr, cc, u]); continue;           // checks 1+2: map, wall
      }
      var w = rr * C + cc;
      if (discovered[w]) { events.push(["dup", w]); continue; }  // check 3: seen before
      discovered[w] = 1;
      container.push([w, u]); events.push(["push", w]);
    }
  }

  function bfs(start, goal) {
    var par = new Array(N).fill(-2), discovered = new Uint8Array(N);
    var Q = [], head = 0, expanded = 0, events = [];
    Q.push([id(start), -1]); discovered[id(start)] = 1;      // pushed once, never again
    while (head < Q.length) {                                // ------ one loop turn ------
      var e = Q[head++], u = e[0], via = e[1];               // FIFO: oldest first
      expanded++; par[u] = via;                              // pop is unconditional
      events.push(["pop", u, via]);
      if (u === id(goal)) {
        var path = [], v = u;
        while (v !== -1) { path.push(unid(v)); v = par[v]; }
        path.reverse();
        return { path: path, expanded: expanded, events: events, par: par };
      }
      ladderBfsDfs(u, discovered, Q, events);
    }
    return { path: null, expanded: expanded, events: events, par: par };
  }

  function dfs(start, goal) {
    var par = new Array(N).fill(-2), discovered = new Uint8Array(N);
    var stack = [[id(start), -1]], expanded = 0, events = [];
    discovered[id(start)] = 1;
    while (stack.length) {
      var e = stack.pop(), u = e[0], via = e[1];             // LIFO: same skeleton
      expanded++; par[u] = via;
      events.push(["pop", u, via]);
      if (u === id(goal)) {
        var path = [], v = u;
        while (v !== -1) { path.push(unid(v)); v = par[v]; }
        path.reverse();
        return { path: path, expanded: expanded, events: events };
      }
      ladderBfsDfs(u, discovered, stack, events);
    }
    return { path: null, expanded: expanded, events: events };
  }

  function dijkstra(start, goal, opts) {
    opts = opts || {};
    var dist = {}, par = {}, done = new Uint8Array(N);
    var pq = new Heap(), expanded = 0, events = [], seq = 0;
    pq.push([0, start[0], start[1], 0, -1]);                 // (d, r, c, seq, via)
    while (pq.size()) {
      var k = pq.pop(), d = k[0], u = [k[1], k[2]], ui = id(u), via = k[4];
      if (done[ui]) { events.push(["skip", ui]); continue; }   // check 4 (heap only): stale copy
      done[ui] = 1; expanded++;
      dist[ui] = d; par[ui] = via;                           // settled: d is final
      events.push(["settle", ui, d, via]);
      if (goal && ui === id(goal)) break;
      for (var dd = 0; dd < 4; dd++) {                       // the check ladder, candidate order
        var rr = u[0] + DIRS[dd][0], cc = u[1] + DIRS[dd][1];
        if (rr < 0 || rr >= R || cc < 0 || cc >= C || isWall(rr, cc)) {
          events.push(["rej", rr, cc, ui]); continue;        // checks 1+2: map, wall
        }
        var vi = rr * C + cc;
        if (done[vi]) { events.push(["dup", vi]); continue; }  // check 3: already expanded
        var w = opts.costs ? opts.costs[vi] : costRC(rr, cc);
        seq++;
        pq.push([d + w, rr, cc, seq, ui]);
        events.push(["relax", vi, d + w]);
      }
      var ex = extraEdges(u, opts.overpass, opts.conveyor);  // overpass / conveyor links
      for (var xi = 0; xi < ex.length; xi++) {
        var evi = id(ex[xi][0]), ew = ex[xi][1];
        if (done[evi]) { events.push(["dup", evi]); continue; }
        seq++;
        pq.push([d + ew, ex[xi][0][0], ex[xi][0][1], seq, ui]);
        events.push(["relax", evi, d + ew]);
      }
    }
    var path = null;
    if (goal && (id(goal) in par)) {
      path = []; var x = id(goal);
      while (x !== -1) { path.push(unid(x)); x = par[x]; }
      path.reverse();
    }
    return { dist: dist, path: path, expanded: expanded, events: events };
  }

  function bellmanFord(start, opts) {
    opts = opts || {};
    var dist = {};
    dist[id(start)] = 0;
    for (var round = 0; round < OPEN_CELLS.length; round++) {
      var changed = false;
      for (var ci = 0; ci < OPEN_CELLS.length; ci++) {
        var u = OPEN_CELLS[ci], ui = id(u);
        if (!(ui in dist)) continue;
        var es = edgesOf(u, opts.overpass, opts.conveyor);
        for (var i = 0; i < es.length; i++) {
          var vi = id(es[i][0]), nd = dist[ui] + es[i][1];
          if (!(vi in dist) || nd < dist[vi]) { dist[vi] = nd; changed = true; }
        }
      }
      if (!changed) break;
    }
    return dist;
  }

  function astar(start, goal, opts) {
    opts = opts || {};
    var done = new Uint8Array(N), par = {};
    var pq = new Heap(), expanded = 0, events = [], seq = 0;
    pq.push([manhattan(start, goal), start[0], start[1], 0, 0, -1]);  // (f, r, c, seq, g, via)
    while (pq.size()) {
      var k = pq.pop(), u = [k[1], k[2]], ui = id(u), g0 = k[4], via = k[5];
      if (done[ui]) { events.push(["skip", ui]); continue; }   // check 4 (heap only): stale copy
      done[ui] = 1; expanded++; par[ui] = via;
      events.push(["settle", ui, g0, via]);
      if (ui === id(goal)) {
        var path = [], x = ui;
        while (x !== -1) { path.push(unid(x)); x = par[x]; }
        path.reverse();
        return { cost: g0, expanded: expanded, events: events, path: path };
      }
      for (var dd = 0; dd < 4; dd++) {                       // the check ladder, candidate order
        var rr = u[0] + DIRS[dd][0], cc = u[1] + DIRS[dd][1];
        if (rr < 0 || rr >= R || cc < 0 || cc >= C || isWall(rr, cc)) {
          events.push(["rej", rr, cc, ui]); continue;        // checks 1+2: map, wall
        }
        var vi = rr * C + cc;
        if (done[vi]) { events.push(["dup", vi]); continue; }  // check 3: already expanded
        var w = opts.costs ? opts.costs[vi] : costRC(rr, cc);
        var ng = g0 + w;
        seq++;
        pq.push([ng + manhattan([rr, cc], goal), rr, cc, seq, ng, ui]);
        events.push(["relax", vi, ng]);
      }
      var ex = extraEdges(u, opts.overpass, false);          // overpass link
      for (var xi = 0; xi < ex.length; xi++) {
        var evi = id(ex[xi][0]), ng2 = g0 + ex[xi][1];
        if (done[evi]) { events.push(["dup", evi]); continue; }
        seq++;
        pq.push([ng2 + manhattan(ex[xi][0], goal), ex[xi][0][0], ex[xi][0][1], seq, ng2, ui]);
        events.push(["relax", evi, ng2]);
      }
    }
    return { cost: null, expanded: expanded, events: events, path: null };
  }

  // ---- the REAL brute force on the map (candidate-solution space) ----
  // Brute force enumerates CANDIDATE SOLUTIONS: a candidate is a move PLAN
  // (a sequence of down/up/right/left), and the space is 4^L plans.
  function walkCounts(length) {
    // legal walks of the given length from the Depot: count per end cell
    var counts = {}; counts[id(DEPOT)] = 1;
    for (var k = 0; k < length; k++) {
      var nxt = {};
      for (var key in counts) {
        var nb = nbrs(unid(+key)), ways = counts[key];
        for (var i = 0; i < nb.length; i++) {
          var vi = id(nb[i]);
          nxt[vi] = (nxt[vi] || 0) + ways;
        }
      }
      counts = nxt;
    }
    return counts;
  }
  function shortestPathCount(goal) {
    // (distance, number of distinct shortest routes Depot -> goal)
    var dist = {}, ways = {}, q = [id(DEPOT)], head = 0;
    dist[id(DEPOT)] = 0; ways[id(DEPOT)] = 1;
    while (head < q.length) {
      var ui = q[head++], nb = nbrs(unid(ui));
      for (var i = 0; i < nb.length; i++) {
        var vi = id(nb[i]);
        if (!(vi in dist)) { dist[vi] = dist[ui] + 1; ways[vi] = 0; q.push(vi); }
        if (dist[vi] === dist[ui] + 1) ways[vi] += ways[ui];
      }
    }
    var gi = id(goal);
    return { dist: dist[gi], count: ways[gi] || 0 };
  }

  function greedyWalk(start, goal, maxSteps) {
    maxSteps = maxSteps || 500;
    var u = start, trail = [start];
    for (var s = 0; s < maxSteps; s++) {
      if (sameCell(u, goal)) return { result: "reached", trail: trail };
      var best = null, nb = nbrs(u);
      for (var i = 0; i < nb.length; i++) {
        var v = nb[i];
        if (manhattan(v, goal) < manhattan(u, goal)) {
          if (best === null || manhattan(v, goal) < manhattan(best, goal)) best = v;
        }
      }
      if (best === null) return { result: "stuck", trail: trail };
      u = best; trail.push(u);
    }
    return { result: "loop", trail: trail };
  }

  // ---- deterministic RNG (mulberry32, matches Python twin) ----------
  function Rng(seed) { this.a = seed >>> 0; }
  Rng.prototype.u32 = function () {
    this.a = (this.a + 0x6D2B79F5) >>> 0;
    var a = this.a;
    var t = Math.imul(a ^ (a >>> 15), a | 1) >>> 0;
    var t2 = Math.imul(t ^ (t >>> 7), t | 61) >>> 0;
    t = ((((t + t2) >>> 0) ^ t)) >>> 0;
    return (t ^ (t >>> 14)) >>> 0;
  };

  // ---- M0 shelf ------------------------------------------------------
  var SHELF = [3, 7, 12, 19, 24, 31, 38, 42, 55, 61, 68, 74, 80, 87, 93, 99];
  var SHELF_TARGET = 87;
  function shelfScan(arr, x) {
    var probes = 0;
    for (var i = 0; i < arr.length; i++) { probes++; if (arr[i] === x) return probes; }
    return probes;
  }
  function shelfBinary(arr, x) {
    var lo = 0, hi = arr.length - 1, probes = 0;
    while (lo <= hi) {
      var mid = lo + ((hi - lo) >> 1); probes++;   // never (lo+hi)>>1: the classic overflow bug
      if (arr[mid] === x) return probes;
      if (arr[mid] < x) lo = mid + 1; else hi = mid - 1;
    }
    return probes;
  }
  // who sorted the rack? — the preprocessing beat. Fixed permutation of SHELF (twin of py).
  var SHELF_UNSORTED = [42, 7, 87, 19, 99, 3, 61, 31, 12, 80, 55, 24, 93, 68, 38, 74];
  function insertionSort(arr) {
    // operation-for-operation mirror of insertion_sort_counts; emits a UI event trace
    var a = arr.slice(), comps = 0, shifts = 0, events = [];
    for (var i = 1; i < a.length; i++) {
      var key = a[i], j = i - 1;
      events.push(['pick', i, key]);
      while (j >= 0) {
        comps++; events.push(['cmp', j]);
        if (a[j] > key) { a[j + 1] = a[j]; shifts++; events.push(['shift', j]); j--; }
        else break;
      }
      a[j + 1] = key; events.push(['drop', j + 1]);
    }
    return { sorted: a, comps: comps, shifts: shifts, events: events };
  }

  // ---- M3 C5 coloring --------------------------------------------------
  var DOCK_ORDER = ["C1", "C2", "C3", "D4", "D5"];
  var DOCK_EDGES = [["C1","C2"],["C2","C3"],["C3","D4"],["D4","D5"],["D5","C1"]];
  var ADJ = {};
  DOCK_ORDER.forEach(function (v) { ADJ[v] = []; });
  DOCK_EDGES.forEach(function (e) { ADJ[e[0]].push(e[1]); ADJ[e[1]].push(e[0]); });

  function colorPlain(k, trace) {
    var nodes = 0, assign = {}, sol = null, events = trace ? [] : null;
    function rec(i) {
      if (i === DOCK_ORDER.length) { sol = {}; DOCK_ORDER.forEach(function (v) { sol[v] = assign[v]; }); return true; }
      var vr = DOCK_ORDER[i];
      for (var val = 0; val < k; val++) {
        nodes++;
        var okv = true;
        for (var j = 0; j < ADJ[vr].length; j++)
          if (assign[ADJ[vr][j]] === val) { okv = false; break; }
        if (events) events.push(["try", i, val, okv]);
        if (okv) {
          assign[vr] = val;
          if (rec(i + 1)) return true;
          delete assign[vr];
          if (events) events.push(["undo", i, val]);
        }
      }
      return false;
    }
    var ok = rec(0);
    return { nodes: nodes, ok: ok, sol: sol, events: events };
  }

  function colorFC(k, trace) {
    var nodes = 0, assign = {}, sol = null, events = trace ? [] : null;
    var domains = {};
    DOCK_ORDER.forEach(function (v) {
      domains[v] = []; for (var x = 0; x < k; x++) domains[v].push(x);
    });
    function rec(i) {
      if (i === DOCK_ORDER.length) { sol = {}; DOCK_ORDER.forEach(function (v) { sol[v] = assign[v]; }); return true; }
      var vr = DOCK_ORDER[i];
      var vals = domains[vr].slice();
      for (var vi = 0; vi < vals.length; vi++) {
        var val = vals[vi];
        nodes++;
        assign[vr] = val;
        var removed = [], empty = false;
        for (var j = 0; j < ADJ[vr].length; j++) {
          var nb = ADJ[vr][j];
          if (!(nb in assign) && domains[nb].indexOf(val) !== -1) {
            domains[nb].splice(domains[nb].indexOf(val), 1);
            removed.push(nb);
            if (!domains[nb].length) empty = true;
          }
        }
        if (events) events.push(["try", i, val, !empty]);
        if (!empty && rec(i + 1)) return true;
        for (var m = 0; m < removed.length; m++) {
          domains[removed[m]].push(val); domains[removed[m]].sort(function (a, b) { return a - b; });
        }
        delete assign[vr];
        if (events) events.push(["undo", i, val]);
      }
      return false;
    }
    var ok = rec(0);
    return { nodes: nodes, ok: ok, sol: sol, events: events };
  }

  // ---- M4 intervals / MST / knapsack ---------------------------------
  var INTERVALS = [
    ["A", 1, 3], ["B", 2, 5], ["C", 4, 7], ["D", 6, 9],
    ["E", 8, 10], ["F", 0, 11], ["G", 11, 14], ["H", 13, 16],
  ];
  function greedySchedule(keyFn) {
    var order = INTERVALS.map(function (_, i) { return i; });
    order.sort(function (a, b) {
      var ka = keyFn(a), kb = keyFn(b);
      return ka[0] !== kb[0] ? ka[0] - kb[0] : ka[1] - kb[1];
    });
    var chosen = [], t = -1;
    for (var oi = 0; oi < order.length; oi++) {
      var iv = INTERVALS[order[oi]];
      if (iv[1] >= t) { chosen.push(iv[0]); t = iv[2]; }
    }
    return chosen;
  }
  function eftSchedule() { return greedySchedule(function (i) { return [INTERVALS[i][2], i]; }); }
  function esfSchedule() { return greedySchedule(function (i) { return [INTERVALS[i][1], i]; }); }
  function intervalsOpt() {
    var best = 0, n = INTERVALS.length;
    for (var mask = 0; mask < (1 << n); mask++) {
      var sel = [];
      for (var i = 0; i < n; i++) if (mask >> i & 1) sel.push(INTERVALS[i]);
      sel.sort(function (a, b) { return a[2] - b[2]; });
      var ok = true, t = -1;
      for (var j = 0; j < sel.length; j++) {
        if (sel[j][1] < t) { ok = false; break; }
        t = sel[j][2];
      }
      if (ok && sel.length > best) best = sel.length;
    }
    return best;
  }

  var MST_NODES = ["Depot", "C1", "C2", "C3"];
  function mstPoints() { return { Depot: DEPOT, C1: DOCKS.C1, C2: DOCKS.C2, C3: DOCKS.C3 }; }
  function cableCosts() {
    var pts = mstPoints(), dmat = {};
    MST_NODES.forEach(function (a) {
      var res = dijkstra(pts[a], null, {});
      MST_NODES.forEach(function (b) { dmat[a + "|" + b] = res.dist[id(pts[b])]; });
    });
    return dmat;
  }
  function mstPrim(dmat) {
    var intree = ["Depot"], out = [], total = 0;
    while (intree.length < MST_NODES.length) {
      var best = null;
      for (var x = 0; x < intree.length; x++) {
        var a = intree[x];
        for (var y = 0; y < MST_NODES.length; y++) {
          var b = MST_NODES[y];
          if (intree.indexOf(b) !== -1) continue;
          var w = dmat[a + "|" + b];
          var key = [w, MST_NODES.indexOf(a), MST_NODES.indexOf(b)];
          if (best === null || key[0] < best[0][0] ||
              (key[0] === best[0][0] && (key[1] < best[0][1] ||
               (key[1] === best[0][1] && key[2] < best[0][2])))) best = [key, a, b];
        }
      }
      out.push([best[1], best[2], dmat[best[1] + "|" + best[2]]]);
      total += dmat[best[1] + "|" + best[2]];
      intree.push(best[2]);
    }
    return { edges: out, total: total };
  }
  function mstBrute(dmat) {
    var pairs = [];
    for (var a = 0; a < 4; a++) for (var b = a + 1; b < 4; b++) pairs.push([a, b]);
    var best = null;
    for (var i = 0; i < pairs.length; i++)
      for (var j = i + 1; j < pairs.length; j++)
        for (var k = j + 1; k < pairs.length; k++) {
          var tri = [pairs[i], pairs[j], pairs[k]];
          var parent = [0, 1, 2, 3];
          function findp(x) { while (parent[x] !== x) x = parent[x]; return x; }
          var ok = true, tot = 0;
          for (var e = 0; e < 3; e++) {
            var ra = findp(tri[e][0]), rb = findp(tri[e][1]);
            if (ra === rb) { ok = false; break; }
            parent[ra] = rb;
            tot += dmat[MST_NODES[tri[e][0]] + "|" + MST_NODES[tri[e][1]]];
          }
          if (ok && (best === null || tot < best)) best = tot;
        }
    return best;
  }

  var KNAPSACK = {
    capacity: 8,
    items: [["party tray", 6, 14], ["burrito box", 4, 8], ["salad pack", 4, 8], ["drink tray", 3, 5]],
  };
  function knapGreedy() {
    var items = KNAPSACK.items;
    var order = items.map(function (_, i) { return i; });
    order.sort(function (a, b) {
      var da = items[a][2] / items[a][1], db = items[b][2] / items[b][1];
      return da !== db ? db - da : a - b;
    });
    var cap = KNAPSACK.capacity, val = 0, take = [];
    for (var oi = 0; oi < order.length; oi++) {
      var it = items[order[oi]];
      if (it[1] <= cap) { cap -= it[1]; val += it[2]; take.push(it[0]); }
    }
    return { val: val, take: take };
  }
  function knapDP() {
    var items = KNAPSACK.items, W = KNAPSACK.capacity, n = items.length;
    var dp = [];
    for (var i = 0; i <= n; i++) dp.push(new Array(W + 1).fill(0));
    for (var i2 = 1; i2 <= n; i2++) {
      var w = items[i2 - 1][1], v = items[i2 - 1][2];
      for (var c = 0; c <= W; c++) {
        dp[i2][c] = dp[i2 - 1][c];
        if (w <= c && dp[i2 - 1][c - w] + v > dp[i2][c]) dp[i2][c] = dp[i2 - 1][c - w] + v;
      }
    }
    return { opt: dp[n][W], table: dp };
  }

  // ---- M5 closest pair -------------------------------------------------
  function cpNaive(points) {
    var ops = 0, best = null, pair = null;
    for (var i = 0; i < points.length; i++)
      for (var j = i + 1; j < points.length; j++) {
        ops++;
        var dx = points[i][0] - points[j][0], dy = points[i][1] - points[j][1];
        var d2 = dx * dx + dy * dy;
        if (best === null || d2 < best) { best = d2; pair = [points[i], points[j]]; }
      }
    return { d2: best, pair: pair, ops: ops };
  }
  function cpDnc(points) {
    var pts = points.slice().sort(function (a, b) { return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]; });
    var ops = 0;
    function d2(p, q) {
      ops++;
      var dx = p[0] - q[0], dy = p[1] - q[1];
      return dx * dx + dy * dy;
    }
    function rec(lo, hi) {
      var n = hi - lo;
      if (n <= 3) {
        var best = Infinity;
        for (var i = lo; i < hi; i++)
          for (var j = i + 1; j < hi; j++) {
            var dd = d2(pts[i], pts[j]);
            if (dd < best) best = dd;
          }
        return best;
      }
      var mid = lo + ((hi - lo) >> 1), midx = pts[mid][0];
      var best2 = Math.min(rec(lo, mid), rec(mid, hi));
      var strip = [];
      for (var s = lo; s < hi; s++) {
        var ddx = pts[s][0] - midx;
        if (ddx * ddx < best2) strip.push(pts[s]);
      }
      strip.sort(function (a, b) { return a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]; });
      for (var i2 = 0; i2 < strip.length; i2++)
        for (var j2 = i2 + 1; j2 < Math.min(i2 + 8, strip.length); j2++) {
          var dd2 = d2(strip[i2], strip[j2]);
          if (dd2 < best2) best2 = dd2;
        }
      return best2;
    }
    var best = rec(0, pts.length);
    return { d2: best, ops: ops };
  }
  function synthPoints(n, seed) {
    var rng = new Rng(seed), pts = [], seen = {};
    while (pts.length < n) {
      var x = rng.u32() % 1000, y = rng.u32() % 1000, k = x + "," + y;
      if (!seen[k]) { seen[k] = 1; pts.push([x, y]); }
    }
    return pts;
  }

  // ---- M6 stairs / grid DP ----------------------------------------------
  function stairsWays(n) {
    var a = 1, b = 1;
    for (var i = 0; i < n - 1; i++) { var t = a + b; a = b; b = t; }
    return n > 0 ? b : 1;
  }
  function stairsNaiveNodes(n) {
    if (n <= 1) return 1;
    return 1 + stairsNaiveNodes(n - 1) + stairsNaiveNodes(n - 2);
  }
  var GRIDDP_GOAL = [11, 11];   // C3, certified: cost 22 via 53 monotone paths
  function gridDP(goal) {
    goal = goal || GRIDDP_GOAL;
    var dp = [], cnt = [];
    for (var r = 0; r < R; r++) { dp.push(new Array(C).fill(Infinity)); cnt.push(new Array(C).fill(0)); }
    for (var r2 = 0; r2 < R; r2++)
      for (var c = 0; c < C; c++) {
        if (isWall(r2, c)) continue;
        if (r2 === DEPOT[0] && c === DEPOT[1]) { dp[r2][c] = 0; cnt[r2][c] = 1; continue; }
        var best = Infinity, ways = 0;
        var prevs = [[r2 - 1, c], [r2, c - 1]];
        for (var pi = 0; pi < 2; pi++) {
          var pr = prevs[pi][0], pc = prevs[pi][1];
          if (pr >= 0 && pc >= 0 && dp[pr][pc] < Infinity) {
            var v = dp[pr][pc] + costRC(r2, c);
            if (v < best) { best = v; ways = cnt[pr][pc]; }
            else if (v === best) ways += cnt[pr][pc];
          }
        }
        dp[r2][c] = best; cnt[r2][c] = ways;
      }
    var g = dp[goal[0]][goal[1]];
    return { cost: g === Infinity ? null : g, ways: cnt[goal[0]][goal[1]], dp: dp, cnt: cnt };
  }

  // ---- M7 Edmonds-Karp ---------------------------------------------------
  function maxFlowDetail(s, t) {
    var cap = {};
    OPEN_CELLS.forEach(function (u) {
      nbrs(u).forEach(function (v) { cap[id(u) * N + id(v)] = 1; });
    });
    var flow = 0, paths = [], rounds = 0, si = id(s), ti = id(t);
    for (;;) {
      rounds++;
      var par = {}, Q = [si], head = 0, seen = {};
      par[si] = -1; seen[si] = 1;
      while (head < Q.length && !(ti in par)) {
        var x = Q[head++];
        var nb = nbrs(unid(x));
        for (var i = 0; i < nb.length; i++) {
          var y = id(nb[i]);
          if (!seen[y] && (cap[x * N + y] || 0) > 0) {
            seen[y] = 1; par[y] = x; Q.push(y);
          }
        }
      }
      if (!(ti in par)) {
        var cut = [];
        for (var key in cap) {
          var ui = (key / N) | 0, vi = key % N;
          var u2 = unid(ui), v2 = unid(vi);
          if (seen[ui] && !seen[vi] &&
              Math.abs(u2[0] - v2[0]) + Math.abs(u2[1] - v2[1]) === 1) cut.push([u2, v2]);
        }
        cut.sort(function (a, b) {
          return a[0][0]-b[0][0] || a[0][1]-b[0][1] || a[1][0]-b[1][0] || a[1][1]-b[1][1];
        });
        return { flow: flow, paths: paths, rounds: rounds, cut: cut, reach: seen };
      }
      var path = [], v3 = ti;
      while (v3 !== -1) { path.push(v3); v3 = par[v3]; }
      path.reverse();
      for (var e = 0; e < path.length - 1; e++) {
        var a = path[e], b = path[e + 1];
        cap[a * N + b] -= 1; cap[b * N + a] = (cap[b * N + a] || 0) + 1;
      }
      paths.push(path.map(unid)); flow++;
    }
  }

  // ---- M8 TSP ----------------------------------------------------------
  var PIN_ORDER = ["P1", "P2", "P3", "P4", "P5", "P6"];
  function pinDists() {
    var pts = [DEPOT]; PIN_ORDER.forEach(function (k) { pts.push(PINS[k]); });
    var Dm = {};
    pts.forEach(function (p) {
      var res = dijkstra(p, null, {});
      pts.forEach(function (q) { Dm[id(p) + "|" + id(q)] = res.dist[id(q)]; });
    });
    return Dm;
  }
  function tspEnumerate(Dm, onTour) {
    var pins = PIN_ORDER.map(function (k) { return PINS[k]; });
    var best = null, bestPerm = null, tours = 0;
    var idxs = [0, 1, 2, 3, 4, 5];
    function perms(prefix, rest) {
      if (!rest.length) {
        tours++;
        var cost = 0, u = DEPOT;
        for (var i = 0; i < prefix.length; i++) {
          cost += Dm[id(u) + "|" + id(pins[prefix[i]])];
          u = pins[prefix[i]];
        }
        if (onTour) onTour(prefix, cost, best);
        if (best === null || cost < best) { best = cost; bestPerm = prefix.slice(); }
        return;
      }
      for (var i2 = 0; i2 < rest.length; i2++) {
        var nrest = rest.slice(); nrest.splice(i2, 1);
        perms(prefix.concat([rest[i2]]), nrest);
      }
    }
    perms([], idxs);
    return { opt: best, order: bestPerm.map(function (i) { return PIN_ORDER[i]; }), tours: tours };
  }
  function tspNN(Dm) {
    var pins = PIN_ORDER.map(function (k) { return PINS[k]; });
    var unvis = [0, 1, 2, 3, 4, 5], u = DEPOT, cost = 0, order = [];
    while (unvis.length) {
      var best = null;
      for (var i = 0; i < unvis.length; i++) {
        var w = Dm[id(u) + "|" + id(pins[unvis[i]])];
        if (best === null || w < best[0]) best = [w, unvis[i]];
      }
      cost += best[0]; u = pins[best[1]];
      order.push(PIN_ORDER[best[1]]);
      unvis.splice(unvis.indexOf(best[1]), 1);
    }
    return { cost: cost, order: order };
  }

  // ---- M2 certify sweep -----------------------------------------------
  function certifySweep(nSeeds, onProgress) {
    nSeeds = nSeeds || 1000;
    var agree = 0, checksum = 0, firstFail = null;
    for (var seed = 1; seed <= nSeeds; seed++) {
      var rng = new Rng(seed);
      var costs = new Array(N).fill(0);
      for (var ci = 0; ci < OPEN_CELLS.length; ci++)
        costs[id(OPEN_CELLS[ci])] = rng.u32() < 0x40000000 ? 3 : 1;
      var s = OPEN_CELLS[rng.u32() % OPEN_CELLS.length];
      var g = OPEN_CELLS[rng.u32() % OPEN_CELLS.length];
      var dres = dijkstra(s, g, { costs: costs });
      var dcost = (id(g) in dres.dist) && dres.path ? dres.dist[id(g)] : (id(g) in dres.dist ? dres.dist[id(g)] : null);
      if (!dres.path && !(id(g) in dres.dist)) dcost = null;
      var ares = astar(s, g, { costs: costs });
      var d = dcost === null || dcost === undefined ? -1 : dcost;
      var a = ares.cost === null ? -1 : ares.cost;
      if (d === a) agree++;
      else if (!firstFail) firstFail = { seed: seed, d: d, a: a };
      checksum += d;
      if (onProgress && seed % 100 === 0) onProgress(seed, agree);
    }
    return { agree: agree, checksum: checksum, firstFail: firstFail };
  }

  // ---- pinned ------------------------------------------------------------
  function computePinned(sweep) {
    var P = {};
    P.grid_checksum = gridChecksum();
    P.m0_scan_probes = shelfScan(SHELF, SHELF_TARGET);
    P.m0_binary_probes = shelfBinary(SHELF, SHELF_TARGET);
    var srt = insertionSort(SHELF_UNSORTED);
    for (var si = 0; si < SHELF.length; si++)
      if (srt.sorted[si] !== SHELF[si]) throw new Error('insertion sort must reproduce the sorted rack');
    P.m0_sort_comps = srt.comps;
    P.m0_sort_shifts = srt.shifts;
    P.m0_sort_breakeven = Math.ceil((srt.comps + srt.shifts) / (P.m0_scan_probes - P.m0_binary_probes));
    var gw = greedyWalk(DEPOT, PINS.P1);
    P.m1_greedy_result = gw.result;
    P.m1_greedy_steps = gw.trail.length - 1;
    P.m1_greedy_stuck_at = gw.trail[gw.trail.length - 1].slice();
    var b1 = bfs(DEPOT, PINS.P1);
    P.m1_bfs_hops = b1.path.length - 1;
    P.m1_bfs_expanded = b1.expanded;
    var d1 = dfs(DEPOT, PINS.P1);
    P.m1_dfs_hops = d1.path.length - 1;
    P.m1_dfs_expanded = d1.expanded;
    var w8 = walkCounts(8), w15 = walkCounts(15), sum8 = 0, sum15 = 0, wk;
    for (wk in w8) sum8 += w8[wk];
    for (wk in w15) sum15 += w15[wk];
    P.m1_legal_walks_len8 = sum8;
    P.m1_legal_walks_len15 = sum15;
    P.m1_needles_p1 = shortestPathCount(PINS.P1).count;
    P.m2_needles_p2 = shortestPathCount(PINS.P2).count;
    var b2 = bfs(DEPOT, PINS.P2);
    P.m2_bfs_expanded = b2.expanded;
    var pc = 0;
    for (var i = 1; i < b2.path.length; i++) pc += costOf(b2.path[i]);
    P.m2_bfs_path_cost = pc;
    P.m2_bfs_hops = b2.path.length - 1;
    var d2r = dijkstra(DEPOT, PINS.P2, {});
    P.m2_dijkstra_cost = d2r.dist[id(PINS.P2)];
    P.m2_dijkstra_expanded = d2r.expanded;
    P.m2_dijkstra_hops = d2r.path.length - 1;
    var a2 = astar(DEPOT, PINS.P2, {});
    P.m2_astar_cost = a2.cost;
    P.m2_astar_expanded = a2.expanded;
    var dc = dijkstra(DEPOT, null, { conveyor: true });
    P.m2_conveyor_dijkstra_cost = dc.dist[id(PINS.P2)];
    P.m2_conveyor_bf_cost = bellmanFord(DEPOT, { conveyor: true })[id(PINS.P2)];
    var goal = PINS.P2;
    var dfg = bellmanFord(goal, { overpass: true });
    var viol = 0;
    for (var ci = 0; ci < OPEN_CELLS.length; ci++) {
      var cell = OPEN_CELLS[ci], k2 = id(cell);
      if (k2 in dfg && manhattan(cell, goal) > dfg[k2]) viol++;
    }
    P.m2_overpass_inadmissible_nodes = viol;
    var ao = astar([0, 4], goal, { overpass: true });
    P.m2_overpass_astar_cost = ao.cost;
    P.m2_overpass_true_cost = bellmanFord([0, 4], { overpass: true })[id(goal)];
    if (sweep) {
      var cs = certifySweep(1000);
      P.m2_certify_agree = cs.agree;
      P.m2_certify_checksum = cs.checksum;
    }
    var c2p = colorPlain(2), c2f = colorFC(2), c3p = colorPlain(3), c3f = colorFC(3);
    P.m3_k2_plain_nodes = c2p.nodes; P.m3_k2_plain_ok = c2p.ok;
    P.m3_k2_fc_nodes = c2f.nodes;    P.m3_k2_fc_ok = c2f.ok;
    P.m3_k3_plain_nodes = c3p.nodes; P.m3_k3_plain_ok = c3p.ok;
    P.m3_k3_fc_nodes = c3f.nodes;    P.m3_k3_fc_ok = c3f.ok;
    P.m3_k3_solution = DOCK_ORDER.map(function (v) { return c3p.sol[v]; });
    P.m4_eft = eftSchedule();
    P.m4_esf = esfSchedule();
    P.m4_opt_count = intervalsOpt();
    var dmat = cableCosts(), cable = {};
    for (var x = 0; x < MST_NODES.length; x++)
      for (var y = x + 1; y < MST_NODES.length; y++)
        cable[MST_NODES[x] + "-" + MST_NODES[y]] = dmat[MST_NODES[x] + "|" + MST_NODES[y]];
    P.m4_cable = cable;
    var mp = mstPrim(dmat);
    P.m4_mst_total = mp.total;
    P.m4_mst_edges = mp.edges.map(function (e) { return e[0] + "-" + e[1]; });
    P.m4_mst_brute_total = mstBrute(dmat);
    var kg = knapGreedy();
    P.m4_knap_greedy = kg.val;
    P.m4_knap_greedy_take = kg.take;
    P.m4_knap_opt = knapDP().opt;
    var pinpts = PIN_ORDER.map(function (k) { return PINS[k]; });
    var cn = cpNaive(pinpts);
    P.m5_pins_min_d2 = cn.d2;
    P.m5_pins_naive_ops = cn.ops;
    var cd = cpDnc(pinpts);
    P.m5_pins_dnc_d2 = cd.d2;
    [32, 128].forEach(function (n) {
      var pts = synthPoints(n, 4534);
      var nn = cpNaive(pts), dd = cpDnc(pts);
      P["m5_n" + n + "_naive_ops"] = nn.ops;
      P["m5_n" + n + "_dnc_ops"] = dd.ops;
      P["m5_n" + n + "_agree"] = nn.d2 === dd.d2;
    });
    P.m6_stairs_ways = stairsWays(10);
    P.m6_stairs_naive_nodes = stairsNaiveNodes(10);
    var gd = gridDP();
    P.m6_griddp_cost = gd.cost;
    P.m6_griddp_ways = gd.ways;
    P.m6_knap_table_final = knapDP().opt;
    var mf = maxFlowDetail(DEPOT, DOCKS.C3);
    P.m7_maxflow = mf.flow;
    P.m7_rounds = mf.rounds;
    P.m7_path_lens = mf.paths.map(function (p) { return p.length - 1; });
    P.m7_cut_size = mf.cut.length;
    var Dm = pinDists();
    var te = tspEnumerate(Dm);
    P.m8_tours = te.tours;
    P.m8_opt = te.opt;
    P.m8_opt_order = te.order;
    var tn = tspNN(Dm);
    P.m8_nn = tn.cost;
    P.m8_nn_order = tn.order;
    return P;
  }

  return {
    GRID: GRID, R: R, C: C, N: N, DEPOT: DEPOT, PINS: PINS, DOCKS: DOCKS,
    OVERPASS: OVERPASS, CONVEYOR: CONVEYOR, CLOSEUP: CLOSEUP,
    OPEN_CELLS: OPEN_CELLS, DOCK_ORDER: DOCK_ORDER, DOCK_EDGES: DOCK_EDGES,
    SHELF: SHELF, SHELF_TARGET: SHELF_TARGET, SHELF_UNSORTED: SHELF_UNSORTED, insertionSort: insertionSort, INTERVALS: INTERVALS,
    KNAPSACK: KNAPSACK, MST_NODES: MST_NODES, PIN_ORDER: PIN_ORDER,
    GRIDDP_GOAL: GRIDDP_GOAL,
    id: id, unid: unid, isWall: isWall, costOf: costOf, nbrs: nbrs,
    manhattan: manhattan, gridChecksum: gridChecksum, Rng: Rng,
    bfs: bfs, dfs: dfs, dijkstra: dijkstra, bellmanFord: bellmanFord,
    astar: astar, greedyWalk: greedyWalk,
    walkCounts: walkCounts, shortestPathCount: shortestPathCount,
    shelfScan: shelfScan, shelfBinary: shelfBinary,
    colorPlain: colorPlain, colorFC: colorFC,
    eftSchedule: eftSchedule, esfSchedule: esfSchedule, intervalsOpt: intervalsOpt,
    cableCosts: cableCosts, mstPrim: mstPrim, mstBrute: mstBrute,
    mstPoints: mstPoints,
    knapGreedy: knapGreedy, knapDP: knapDP,
    cpNaive: cpNaive, cpDnc: cpDnc, synthPoints: synthPoints,
    stairsWays: stairsWays, stairsNaiveNodes: stairsNaiveNodes, gridDP: gridDP,
    maxFlowDetail: maxFlowDetail, pinDists: pinDists,
    tspEnumerate: tspEnumerate, tspNN: tspNN, certifySweep: certifySweep,
    computePinned: computePinned,
  };
});
