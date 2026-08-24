#!/usr/bin/env python3
"""Algo Arena deterministic core — Python twin (normative side).

Supersedes/extends data/verify_map1.py: reproduces its numeric R-checks on the
certified Map-1 (verify_map1.py retains the R0 connectivity check), adds reference implementations + instances for rooms
M0..M8, and emits the pinned-numbers JSON that the JS twin (algo_core.js)
must reproduce exactly (integer domain: diff = 0).

Conventions (normative, mirrored operation-for-operation in JS):
  * neighbor order: down, up, right, left  ((1,0),(-1,0),(0,1),(0,-1))
  * edge weight = cost of the DESTINATION cell (mud costs on entry)
  * Dijkstra: lazy insertion + closed set; heap key (dist, r, c)
  * A*: heap key (f, r, c); g-based relaxation; closed set
  * BFS/DFS: goal test at pop; expanded = number of pops
  * Bellman-Ford: row-major sweeps until no change
  * max flow: unit-capacity Edmonds-Karp, BFS in neighbor order
Run:  python3 algo_core.py            -> certification report to stdout
      python3 algo_core.py --emit DIR -> writes map1.json + pinned.json
"""
import heapq, itertools, json, math, sys

# ---------------------------------------------------------------- map data
GRID = [
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
]
R, C = len(GRID), len(GRID[0])
OVERPASS = ((1, 0), (1, 10))    # undirected, cost 1
CONVEYOR = ((5, 10), (4, 11))   # directed, cost -6

def find(ch):
    for r in range(R):
        for c in range(C):
            if GRID[r][c] == ch:
                return (r, c)
    return None

DEPOT = find('D')
PINS = {f"P{i}": find(str(i)) for i in range(1, 7)}
DOCKS = {"C1": find('a'), "C2": find('b'), "C3": find('c')}
CLOSEUP = {"rows": [0, 5], "cols": [0, 7]}

def is_wall(p): return GRID[p[0]][p[1]] == '#'
def cost_of(p): return 3 if GRID[p[0]][p[1]] == 'm' else 1

def nbrs(p):
    r, c = p
    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        q = (r + dr, c + dc)
        if 0 <= q[0] < R and 0 <= q[1] < C and not is_wall(q):
            yield q

def edges(p, overpass=False, conveyor=False, costs=None):
    for q in nbrs(p):
        yield q, (costs[q] if costs else cost_of(q))
    if overpass and p in OVERPASS:
        q = OVERPASS[1] if p == OVERPASS[0] else OVERPASS[0]
        yield q, 1
    if conveyor and p == CONVEYOR[0]:
        yield CONVEYOR[1], -6

def manhattan(p, q): return abs(p[0]-q[0]) + abs(p[1]-q[1])

OPEN_CELLS = [(r, c) for r in range(R) for c in range(C) if not is_wall((r, c))]

def grid_checksum():
    h = 5381
    for ch in "".join(GRID):
        h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return h

# ---------------------------------------------------------- primitives
# GENERIC-SEARCH — the normative shape every primitive here follows:
#   ONE skeleton at the ITERATION level: pop -> for each of the four moves
#   run the CHECK LADDER -> push the survivors. The ladder is uniform in
#   form: (1) within the map? (2) not a wall? (3) not already dealt with?
#   For queue/stack, check (3) = "already discovered" (push-once: nothing
#   illegal or duplicated ever enters, so the pop is unconditional).
#   For the priority queues, a waiting cell may later be reached cheaper,
#   so (3) weakens to "already expanded", duplicates are allowed into the
#   heap, and ONE extra exit check appears at the pop (skip stale copies).
#   That asymmetry is the pedagogy: the heap is the one container that can
#   change its mind. No per-algorithm reversal tricks. Heap tie-break:
#   (key, r, c, seq), seq = global push counter (mirrored in the JS twin).
#   expanded = number of fresh pops. 1 Step (UI) = 1 loop iteration.
def bfs(start, goal):
    from collections import deque
    frontier = deque([(start, None)])     # (cell, discovered-via)
    discovered = {start}                  # pushed once, never pushed again
    parent, expanded = {}, 0
    while frontier:                       # ------ one loop turn ------
        u, via = frontier.popleft()       # FIFO: oldest first
        parent[u] = via; expanded += 1
        if u == goal:
            path = []
            while u is not None: path.append(u); u = parent[u]
            return path[::-1], expanded
        for v in nbrs(u):                 # checks 1+2 (map, wall) inside nbrs
            if v in discovered: continue  # check 3: seen before
            discovered.add(v)
            frontier.append((v, u))
    return None, expanded

def dfs(start, goal):
    frontier = [(start, None)]            # LIFO: same skeleton, other container
    discovered = {start}
    parent, expanded = {}, 0
    while frontier:
        u, via = frontier.pop()
        parent[u] = via; expanded += 1
        if u == goal:
            path = []
            while u is not None: path.append(u); u = parent[u]
            return path[::-1], expanded
        for v in nbrs(u):
            if v in discovered: continue
            discovered.add(v)
            frontier.append((v, u))
    return None, expanded

def dijkstra(start, goal=None, overpass=False, conveyor=False, costs=None):
    dist, parent, done, expanded = {}, {}, set(), 0
    frontier = [(0, start[0], start[1], 0, None)]   # (d, r, c, seq, via)
    seq = 0
    while frontier:
        d, r, c, _s, via = heapq.heappop(frontier)
        u = (r, c)
        if u in done: continue            # check 4 (heap only): stale copy
        done.add(u); expanded += 1
        dist[u] = d; parent[u] = via      # settled: d is final
        if goal is not None and u == goal: break
        for v, w in edges(u, overpass, conveyor, costs):
            if v in done: continue        # check 3: already expanded
            seq += 1
            heapq.heappush(frontier, (d + w, v[0], v[1], seq, u))
    path = None
    if goal is not None and goal in parent:
        path, u = [], goal
        while u is not None: path.append(u); u = parent[u]
        path = path[::-1]
    return dist, path, expanded

def bellman_ford(start, overpass=False, conveyor=False):
    dist = {start: 0}
    for _ in range(len(OPEN_CELLS)):
        changed = False
        for u in OPEN_CELLS:
            if u not in dist: continue
            for v, w in edges(u, overpass, conveyor):
                if dist[u] + w < dist.get(v, math.inf):
                    dist[v] = dist[u] + w; changed = True
        if not changed: break
    return dist

def astar(start, goal, overpass=False, costs=None):
    done, parent, expanded = set(), {}, 0
    frontier = [(manhattan(start, goal), start[0], start[1], 0, 0, None)]  # (f, r, c, seq, g, via)
    seq = 0
    while frontier:
        f, r, c, _s, g0, via = heapq.heappop(frontier)
        u = (r, c)
        if u in done: continue            # check 4 (heap only): stale copy
        done.add(u); expanded += 1; parent[u] = via
        if u == goal: return g0, expanded
        for v, w in edges(u, overpass, costs=costs):
            if v in done: continue        # check 3: already expanded
            seq += 1
            heapq.heappush(frontier, (g0 + w + manhattan(v, goal), v[0], v[1], seq, g0 + w, u))
    return None, expanded

# ---- the REAL brute force on the map (candidate-solution space) ----
# Brute force enumerates CANDIDATE SOLUTIONS: here a candidate is a move
# PLAN (a sequence of down/up/right/left), and the space is 4^L plans.
# These counts certify the baseline the whole course escapes from.
def walk_counts(length):
    """legal walks of the given length from the Depot: count per end cell.
    A walk is legal iff it never leaves the map and never enters a wall."""
    counts = {DEPOT: 1}
    for _ in range(length):
        nxt = {}
        for cell, ways in counts.items():
            for v in nbrs(cell):
                nxt[v] = nxt.get(v, 0) + ways
        counts = nxt
    return counts

def shortest_path_count(goal):
    """(distance, number of distinct shortest routes Depot -> goal).
    A length-d walk that reaches goal (d = BFS distance) IS a shortest route."""
    from collections import deque
    dist, ways = {DEPOT: 0}, {DEPOT: 1}
    q = deque([DEPOT])
    while q:
        u = q.popleft()
        for v in nbrs(u):
            if v not in dist:
                dist[v] = dist[u] + 1; ways[v] = 0; q.append(v)
            if dist[v] == dist[u] + 1:
                ways[v] += ways[u]
    return dist.get(goal), ways.get(goal, 0)

def greedy_walk(start, goal, max_steps=500):
    u, trail = start, [start]
    for _ in range(max_steps):
        if u == goal: return 'reached', trail
        best = None
        for v in nbrs(u):
            if manhattan(v, goal) < manhattan(u, goal):
                if best is None or manhattan(v, goal) < manhattan(best, goal):
                    best = v
        if best is None: return 'stuck', trail
        u = best; trail.append(u)
    return 'loop', trail

# --------------------------------------------------- deterministic RNG
class Rng:
    M = 0xFFFFFFFF
    def __init__(self, seed): self.a = seed & self.M
    def u32(self):
        self.a = (self.a + 0x6D2B79F5) & self.M
        t = ((self.a ^ (self.a >> 15)) * (self.a | 1)) & self.M
        t2 = ((t ^ (t >> 7)) * (t | 61)) & self.M
        t = (((t + t2) & self.M) ^ t) & self.M
        return (t ^ (t >> 14)) & self.M

# ------------------------------------------------------------ M0: shelf
SHELF = [3, 7, 12, 19, 24, 31, 38, 42, 55, 61, 68, 74, 80, 87, 93, 99]
SHELF_TARGET = 87

def shelf_scan(arr, x):
    probes = 0
    for v in arr:
        probes += 1
        if v == x: return probes
    return probes

def shelf_binary(arr, x):
    # mid = lo + (hi - lo) // 2, never (lo + hi) // 2: the classic fixed-width
    # overflow bug (Bloch 2006, the JDK binary search). Python's big ints are
    # immune, but the twins keep the safe idiom — the display code teaches it.
    lo, hi, probes = 0, len(arr) - 1, 0
    while lo <= hi:
        mid = lo + (hi - lo) // 2; probes += 1
        if arr[mid] == x: return probes
        if arr[mid] < x: lo = mid + 1
        else: hi = mid - 1
    return probes

# who sorted the rack? — the preprocessing beat
# SHELF_UNSORTED: the rack as the crates arrived on opening morning — a fixed
# permutation of SHELF (candidate instance, drafted; normative once approved).
SHELF_UNSORTED = [42, 7, 87, 19, 99, 3, 61, 31, 12, 80, 55, 24, 93, 68, 38, 74]

def insertion_sort_counts(arr):
    """Normative counting: comparisons = every a[j] > key evaluation;
    shifts = every one-slot slide. Returns (sorted_copy, comps, shifts)."""
    a = list(arr); comps = 0; shifts = 0
    for i in range(1, len(a)):
        key = a[i]; j = i - 1
        while j >= 0:
            comps += 1
            if a[j] > key:
                a[j + 1] = a[j]; shifts += 1; j -= 1
            else:
                break
        a[j + 1] = key
    return a, comps, shifts

# --------------------------------------------- M3: C5 coloring, counted
DOCK_ORDER = ["C1", "C2", "C3", "D4", "D5"]
DOCK_EDGES = [("C1","C2"),("C2","C3"),("C3","D4"),("D4","D5"),("D5","C1")]
ADJ = {v: [] for v in DOCK_ORDER}
for a, b in DOCK_EDGES:
    ADJ[a].append(b); ADJ[b].append(a)

def color_plain(k):
    nodes, assign, sol = 0, {}, {}
    def rec(i):
        nonlocal nodes
        if i == len(DOCK_ORDER):
            sol.update(assign); return True
        var = DOCK_ORDER[i]
        for val in range(k):
            nodes += 1
            if all(assign.get(nb) != val for nb in ADJ[var]):
                assign[var] = val
                if rec(i + 1): return True
                del assign[var]
        return False
    ok = rec(0)
    return nodes, ok, (sol if ok else None)

def color_fc(k):
    nodes, assign, sol = 0, {}, {}
    domains = {v: list(range(k)) for v in DOCK_ORDER}
    def rec(i):
        nonlocal nodes
        if i == len(DOCK_ORDER):
            sol.update(assign); return True
        var = DOCK_ORDER[i]
        for val in list(domains[var]):
            nodes += 1
            assign[var] = val
            removed, empty = [], False
            for nb in ADJ[var]:
                if nb not in assign and val in domains[nb]:
                    domains[nb].remove(val); removed.append(nb)
                    if not domains[nb]: empty = True
            if not empty and rec(i + 1): return True
            for nb in removed: domains[nb].append(val); domains[nb].sort()
            del assign[var]
        return False
    ok = rec(0)
    return nodes, ok, (sol if ok else None)

# -------------------------------------- M4: intervals / MST / knapsack
INTERVALS = [  # (name, start, end) on the dock timeline (hours)
    ("A", 1, 3), ("B", 2, 5), ("C", 4, 7), ("D", 6, 9),
    ("E", 8, 10), ("F", 0, 11), ("G", 11, 14), ("H", 13, 16),
]

def eft_schedule():
    order = sorted(range(len(INTERVALS)), key=lambda i: (INTERVALS[i][2], i))
    chosen, t = [], -1
    for i in order:
        n, s, e = INTERVALS[i]
        if s >= t: chosen.append(n); t = e
    return chosen

def earliest_start_schedule():
    order = sorted(range(len(INTERVALS)), key=lambda i: (INTERVALS[i][1], i))
    chosen, t = [], -1
    for i in order:
        n, s, e = INTERVALS[i]
        if s >= t: chosen.append(n); t = e
    return chosen

def intervals_opt():
    best = 0
    for mask in range(1 << len(INTERVALS)):
        sel = [INTERVALS[i] for i in range(len(INTERVALS)) if mask >> i & 1]
        sel.sort(key=lambda iv: iv[2])
        ok, t = True, -1
        for n, s, e in sel:
            if s < t: ok = False; break
            t = e
        if ok: best = max(best, len(sel))
    return best

MST_NODES = ["Depot", "C1", "C2", "C3"]
def mst_points(): return {"Depot": DEPOT, **DOCKS}

def cable_costs():
    pts = mst_points()
    dmat = {}
    for a in MST_NODES:
        dist, _, _ = dijkstra(pts[a])
        for b in MST_NODES:
            dmat[(a, b)] = dist[pts[b]]
    return dmat

def mst_prim(dmat):
    intree, edges_out, total = ["Depot"], [], 0
    while len(intree) < len(MST_NODES):
        best = None
        for a in intree:
            for b in MST_NODES:
                if b in intree: continue
                w = dmat[(a, b)]
                key = (w, MST_NODES.index(a), MST_NODES.index(b))
                if best is None or key < best[0]:
                    best = (key, a, b)
        _, a, b = best
        edges_out.append((a, b, dmat[(a, b)])); total += dmat[(a, b)]
        intree.append(b)
    return edges_out, total

def mst_brute(dmat):
    idx = list(range(4)); best = None
    allpairs = list(itertools.combinations(idx, 2))
    for tri in itertools.combinations(allpairs, 3):
        parent = list(idx)
        def findp(x):
            while parent[x] != x: x = parent[x]
            return x
        ok, tot = True, 0
        for a, b in tri:
            ra, rb = findp(a), findp(b)
            if ra == rb: ok = False; break
            parent[ra] = rb; tot += dmat[(MST_NODES[a], MST_NODES[b])]
        if ok and (best is None or tot < best): best = tot
    return best

KNAPSACK = {  # the catering crate; capacity 8 kg
    "capacity": 8,
    "items": [  # (name, weight, value)
        ("party tray", 6, 14), ("burrito box", 4, 8), ("salad pack", 4, 8), ("drink tray", 3, 5),
    ],
}

def knapsack_greedy():
    items = KNAPSACK["items"]
    order = sorted(range(len(items)),
                   key=lambda i: (-(items[i][2] / items[i][1]), i))
    cap, val, take = KNAPSACK["capacity"], 0, []
    for i in order:
        n, w, v = items[i]
        if w <= cap: cap -= w; val += v; take.append(n)
    return val, take

def knapsack_dp():
    items, W = KNAPSACK["items"], KNAPSACK["capacity"]
    n = len(items)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        _, w, v = items[i - 1]
        for c in range(W + 1):
            dp[i][c] = dp[i - 1][c]
            if w <= c and dp[i - 1][c - w] + v > dp[i][c]:
                dp[i][c] = dp[i - 1][c - w] + v
    return dp[n][W], dp

# ------------------------------------------------- M5: closest pair
def closest_pair_naive(points):
    ops, best, pair = 0, None, None
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            ops += 1
            d2 = (points[i][0]-points[j][0])**2 + (points[i][1]-points[j][1])**2
            if best is None or d2 < best:
                best = d2; pair = (points[i], points[j])
    return best, pair, ops

def closest_pair_dnc(points):
    pts = sorted(points)
    ops = 0
    def d2(p, q):
        nonlocal ops
        ops += 1
        return (p[0]-q[0])**2 + (p[1]-q[1])**2
    def rec(lo, hi):  # [lo, hi)
        n = hi - lo
        if n <= 3:
            best = None
            for i in range(lo, hi):
                for j in range(i + 1, hi):
                    dd = d2(pts[i], pts[j])
                    if best is None or dd < best: best = dd
            return best if best is not None else math.inf
        mid = lo + (hi - lo) // 2
        midx = pts[mid][0]
        best = min(rec(lo, mid), rec(mid, hi))
        strip = [p for p in pts[lo:hi] if (p[0]-midx)**2 < best]
        strip.sort(key=lambda p: (p[1], p[0]))
        for i in range(len(strip)):
            for j in range(i + 1, min(i + 8, len(strip))):
                dd = d2(strip[i], strip[j])
                if dd < best: best = dd
        return best
    best = rec(0, len(pts))
    return best, ops

def synth_points(n, seed):
    rng, pts, seen = Rng(seed), [], set()
    while len(pts) < n:
        x, y = rng.u32() % 1000, rng.u32() % 1000
        if (x, y) not in seen:
            seen.add((x, y)); pts.append((x, y))
    return pts

# ------------------------------------------------- M6: stairs / grid DP
def stairs_ways(n):
    a, b = 1, 1
    for _ in range(n - 1): a, b = b, a + b
    return b if n > 0 else 1

def stairs_naive_nodes(n):
    if n <= 1: return 1
    return 1 + stairs_naive_nodes(n - 1) + stairs_naive_nodes(n - 2)

def grid_dp(goal):
    INF = math.inf
    dp = [[INF] * C for _ in range(R)]
    cnt = [[0] * C for _ in range(R)]
    for r in range(R):
        for c in range(C):
            if is_wall((r, c)): continue
            if (r, c) == DEPOT:
                dp[r][c] = 0; cnt[r][c] = 1; continue
            best, ways = INF, 0
            for pr, pc in ((r - 1, c), (r, c - 1)):
                if 0 <= pr and 0 <= pc and dp[pr][pc] < INF:
                    v = dp[pr][pc] + cost_of((r, c))
                    if v < best: best, ways = v, cnt[pr][pc]
                    elif v == best: ways += cnt[pr][pc]
            dp[r][c] = best; cnt[r][c] = ways
    g = dp[goal[0]][goal[1]]
    return (None if g == INF else g), cnt[goal[0]][goal[1]]

GRID_DP_GOAL = (11, 11)  # C3: certified feasible; cost 22 via 53 monotone paths

# ------------------------------------------------- M7: Edmonds-Karp
def max_flow_detail(s, t):
    from collections import deque
    cap = {}
    for u in OPEN_CELLS:
        for v in nbrs(u): cap[(u, v)] = 1
    flow, paths, rounds = 0, [], 0
    while True:
        rounds += 1
        par, Q, seen = {s: None}, deque([s]), {s}
        while Q and t not in par:
            x = Q.popleft()
            for y in nbrs(x):
                if y not in seen and cap.get((x, y), 0) > 0:
                    seen.add(y); par[y] = x; Q.append(y)
        if t not in par:
            reach = seen
            cut = [(u, v) for (u, v) in cap
                   if u in reach and v not in reach and is_orig(u, v)]
            return flow, paths, rounds, sorted(cut)
        path, v = [], t
        while v is not None: path.append(v); v = par[v]
        path = path[::-1]
        for i in range(len(path) - 1):
            u2, v2 = path[i], path[i + 1]
            cap[(u2, v2)] -= 1; cap[(v2, u2)] = cap.get((v2, u2), 0) + 1
        paths.append(path); flow += 1

def is_orig(u, v):
    return abs(u[0]-v[0]) + abs(u[1]-v[1]) == 1

# ------------------------------------------------- M8: TSP over pins
PIN_ORDER = ["P1", "P2", "P3", "P4", "P5", "P6"]

def pin_dists():
    pts = [DEPOT] + [PINS[k] for k in PIN_ORDER]
    Dm = {}
    for p in pts:
        dist, _, _ = dijkstra(p)
        for q in pts: Dm[(p, q)] = dist[q]
    return Dm

def tsp_enumerate(Dm):
    pins = [PINS[k] for k in PIN_ORDER]
    best, best_perm, tours = None, None, 0
    for perm in itertools.permutations(range(6)):
        tours += 1
        cost, u = 0, DEPOT
        for i in perm:
            cost += Dm[(u, pins[i])]; u = pins[i]
        if best is None or cost < best:
            best, best_perm = cost, perm
    return best, [PIN_ORDER[i] for i in best_perm], tours

def tsp_nn(Dm):
    pins = [PINS[k] for k in PIN_ORDER]
    unvis, u, cost, order = list(range(6)), DEPOT, 0, []
    while unvis:
        best = None
        for i in unvis:
            w = Dm[(u, pins[i])]
            if best is None or w < best[0]: best = (w, i)
        w, i = best
        cost += w; u = pins[i]; order.append(PIN_ORDER[i]); unvis.remove(i)
    return cost, order

# ------------------------------------------------- M2: certify sweep
def certify_sweep(n_seeds=1000):
    agree, checksum = 0, 0
    for seed in range(1, n_seeds + 1):
        rng = Rng(seed)
        costs = {}
        for cell in OPEN_CELLS:
            costs[cell] = 3 if rng.u32() < 0x40000000 else 1
        s = OPEN_CELLS[rng.u32() % len(OPEN_CELLS)]
        g = OPEN_CELLS[rng.u32() % len(OPEN_CELLS)]
        dist, _, _ = dijkstra(s, g, costs=costs)
        dcost = dist.get(g)
        acost, _ = astar(s, g, costs=costs)
        d = -1 if dcost is None else dcost
        a = -1 if acost is None else acost
        if d == a: agree += 1
        checksum += d
    return agree, checksum

# ---------------------------------------------------------------- pinned
def compute_pinned(sweep=True):
    P = {}
    P["grid_checksum"] = grid_checksum()
    # M0
    P["m0_scan_probes"] = shelf_scan(SHELF, SHELF_TARGET)
    P["m0_binary_probes"] = shelf_binary(SHELF, SHELF_TARGET)
    _sorted, _c, _s = insertion_sort_counts(SHELF_UNSORTED)
    assert _sorted == SHELF, "insertion sort must reproduce the sorted rack"
    P["m0_sort_comps"] = _c
    P["m0_sort_shifts"] = _s
    # one-time sort cost amortized against the certified per-lookup saving (14 - 3)
    P["m0_sort_breakeven"] = -(-(_c + _s) // (P["m0_scan_probes"] - P["m0_binary_probes"]))
    # M1
    res, trail = greedy_walk(DEPOT, PINS["P1"])
    P["m1_greedy_result"] = res
    P["m1_greedy_steps"] = len(trail) - 1
    P["m1_greedy_stuck_at"] = list(trail[-1])
    bp, bexp = bfs(DEPOT, PINS["P1"])
    P["m1_bfs_hops"] = len(bp) - 1
    P["m1_bfs_expanded"] = bexp
    dp_, dexp = dfs(DEPOT, PINS["P1"])
    P["m1_dfs_hops"] = len(dp_) - 1
    P["m1_dfs_expanded"] = dexp
    # the brute-force baseline: 4^15 plans is display math; these are the certified parts
    P["m1_legal_walks_len8"] = sum(walk_counts(8).values())
    P["m1_legal_walks_len15"] = sum(walk_counts(15).values())
    P["m1_needles_p1"] = shortest_path_count(PINS["P1"])[1]   # of 4^15 plans: exactly this many shortest routes
    P["m2_needles_p2"] = shortest_path_count(PINS["P2"])[1]
    # M2
    bp2, bexp2 = bfs(DEPOT, PINS["P2"])
    P["m2_bfs_expanded"] = bexp2
    P["m2_bfs_path_cost"] = sum(cost_of(p) for p in bp2[1:])
    P["m2_bfs_hops"] = len(bp2) - 1
    dist, dpath, dexp2 = dijkstra(DEPOT, PINS["P2"])
    P["m2_dijkstra_cost"] = dist[PINS["P2"]]
    P["m2_dijkstra_expanded"] = dexp2
    P["m2_dijkstra_hops"] = len(dpath) - 1
    ac, aexp = astar(DEPOT, PINS["P2"])
    P["m2_astar_cost"] = ac
    P["m2_astar_expanded"] = aexp
    distC, _, _ = dijkstra(DEPOT, conveyor=True)
    P["m2_conveyor_dijkstra_cost"] = distC[PINS["P2"]]
    P["m2_conveyor_bf_cost"] = bellman_ford(DEPOT, conveyor=True)[PINS["P2"]]
    goal = PINS["P2"]
    dfg = bellman_ford(goal, overpass=True)
    P["m2_overpass_inadmissible_nodes"] = sum(
        1 for nd, d in dfg.items() if manhattan(nd, goal) > d)
    W = (0, 4)
    aoc, _ = astar(W, goal, overpass=True)
    P["m2_overpass_astar_cost"] = aoc
    P["m2_overpass_true_cost"] = bellman_ford(W, overpass=True)[goal]
    if sweep:
        agree, csum = certify_sweep()
        P["m2_certify_agree"] = agree
        P["m2_certify_checksum"] = csum
    # M3
    n2p, ok2p, _ = color_plain(2)
    n2f, ok2f, _ = color_fc(2)
    n3p, ok3p, sol3 = color_plain(3)
    n3f, ok3f, _ = color_fc(3)
    P["m3_k2_plain_nodes"] = n2p; P["m3_k2_plain_ok"] = ok2p
    P["m3_k2_fc_nodes"] = n2f;    P["m3_k2_fc_ok"] = ok2f
    P["m3_k3_plain_nodes"] = n3p; P["m3_k3_plain_ok"] = ok3p
    P["m3_k3_fc_nodes"] = n3f;    P["m3_k3_fc_ok"] = ok3f
    P["m3_k3_solution"] = [sol3[v] for v in DOCK_ORDER]
    # M4
    P["m4_eft"] = eft_schedule()
    P["m4_esf"] = earliest_start_schedule()
    P["m4_opt_count"] = intervals_opt()
    dmat = cable_costs()
    P["m4_cable"] = {f"{a}-{b}": dmat[(a, b)]
                     for a, b in itertools.combinations(MST_NODES, 2)}
    edges_out, total = mst_prim(dmat)
    P["m4_mst_total"] = total
    P["m4_mst_edges"] = [f"{a}-{b}" for a, b, _ in edges_out]
    P["m4_mst_brute_total"] = mst_brute(dmat)
    gval, gtake = knapsack_greedy()
    P["m4_knap_greedy"] = gval
    P["m4_knap_greedy_take"] = gtake
    P["m4_knap_opt"] = knapsack_dp()[0]
    # M5
    pinpts = [PINS[k] for k in PIN_ORDER]
    b2, pair, ops_n = closest_pair_naive(pinpts)
    P["m5_pins_min_d2"] = b2
    P["m5_pins_naive_ops"] = ops_n
    b2d, ops_d = closest_pair_dnc(pinpts)
    P["m5_pins_dnc_d2"] = b2d
    for n in (32, 128):
        pts = synth_points(n, 4534)
        nb, _, no = closest_pair_naive(pts)
        db, do = closest_pair_dnc(pts)
        P[f"m5_n{n}_naive_ops"] = no
        P[f"m5_n{n}_dnc_ops"] = do
        P[f"m5_n{n}_agree"] = (nb == db)
    # M6
    P["m6_stairs_ways"] = stairs_ways(10)
    P["m6_stairs_naive_nodes"] = stairs_naive_nodes(10)
    if GRID_DP_GOAL:
        gcost, gways = grid_dp(GRID_DP_GOAL)
        P["m6_griddp_cost"] = gcost
        P["m6_griddp_ways"] = gways
    P["m6_knap_table_final"] = knapsack_dp()[0]
    # M7
    fl, paths, rounds, cut = max_flow_detail(DEPOT, DOCKS["C3"])
    P["m7_maxflow"] = fl
    P["m7_rounds"] = rounds
    P["m7_path_lens"] = [len(p) - 1 for p in paths]
    P["m7_cut_size"] = len(cut)
    # M8
    Dm = pin_dists()
    opt, order, tours = tsp_enumerate(Dm)
    P["m8_tours"] = tours
    P["m8_opt"] = opt
    P["m8_opt_order"] = order
    nnc, nno = tsp_nn(Dm)
    P["m8_nn"] = nnc
    P["m8_nn_order"] = nno
    return P

# ------------------------------------------------------------------ main
def scan_griddp():
    print("grid-DP monotone (right/down) feasibility from Depot:")
    for name, p in {**PINS, **DOCKS}.items():
        cost, ways = grid_dp(p)
        print(f"  {name} {p}: cost={cost} ways={ways}")

def main():
    if "--scan" in sys.argv:
        scan_griddp(); return
    P = compute_pinned(sweep=("--nosweep" not in sys.argv))
    ok = True
    def check(name, cond, detail=""):
        nonlocal ok
        ok &= bool(cond)
        print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    # legacy R-checks against the certified report
    check("R1 greedy stuck", P["m1_greedy_result"] == "stuck"
          and P["m1_greedy_stuck_at"] == [5, 0] and P["m1_greedy_steps"] == 5)
    check("R1 BFS 15 hops", P["m1_bfs_hops"] == 15)
    check("R2 costs 25 vs 23", P["m2_bfs_path_cost"] == 25 and P["m2_dijkstra_cost"] == 23)
    check("Scoreboard 105/104/61", (P["m2_bfs_expanded"], P["m2_dijkstra_expanded"],
          P["m2_astar_expanded"]) == (105, 104, 61))
    check("R3 conveyor 23 vs 21", P["m2_conveyor_dijkstra_cost"] == 23
          and P["m2_conveyor_bf_cost"] == 21)
    check("R4 witness 19 vs 12", P["m2_overpass_astar_cost"] == 19
          and P["m2_overpass_true_cost"] == 12
          and P["m2_overpass_inadmissible_nodes"] == 14)
    check("R5 chi=3", (not P["m3_k2_plain_ok"]) and P["m3_k3_plain_ok"])
    check("R8 closest 4.00/4.12", P["m5_pins_min_d2"] == 16)
    check("R8 TSP 51/53", P["m8_opt"] == 51 and P["m8_nn"] == 53 and P["m8_tours"] == 720)
    check("R10 flow=2", P["m7_maxflow"] == 2)
    check("M4 EFT=OPT>ESF", len(P["m4_eft"]) == P["m4_opt_count"] == 4
          and len(P["m4_esf"]) < 4)
    check("M4 MST prim==brute", P["m4_mst_total"] == P["m4_mst_brute_total"])
    check("M4 knapsack 14 vs 16", P["m4_knap_greedy"] == 14 and P["m4_knap_opt"] == 16)
    check("M5 dnc==naive on pins", P["m5_pins_dnc_d2"] == P["m5_pins_min_d2"])
    check("M5 synth agree", P["m5_n32_agree"] and P["m5_n128_agree"])
    check("M6 stairs 89/177", P["m6_stairs_ways"] == 89 and P["m6_stairs_naive_nodes"] == 177)
    check("M6 grid DP to C3: 22 via 53 paths", P.get("m6_griddp_cost") == 22
          and P.get("m6_griddp_ways") == 53)
    if "m2_certify_agree" in P:
        check("M2 certify 1000/1000", P["m2_certify_agree"] == 1000,
              f"checksum={P['m2_certify_checksum']}")
    print("\nALL CHECKS:", "PASS" if ok else "FAIL")
    if "--emit" in sys.argv:
        outdir = sys.argv[sys.argv.index("--emit") + 1]
        import pathlib
        d = pathlib.Path(outdir)
        d.mkdir(parents=True, exist_ok=True)
        data = {
            "grid": GRID, "overpass": [list(OVERPASS[0]), list(OVERPASS[1])],
            "conveyor": [list(CONVEYOR[0]), list(CONVEYOR[1])],
            "depot": list(DEPOT),
            "pins": {k: list(v) for k, v in PINS.items()},
            "docks": {k: list(v) for k, v in DOCKS.items()},
            "closeup": CLOSEUP,
            "dock_order": DOCK_ORDER, "dock_edges": DOCK_EDGES,
            "shelf": SHELF, "shelf_target": SHELF_TARGET,
            "intervals": INTERVALS, "knapsack": KNAPSACK,
            "stairs_n": 10, "griddp_goal": list(GRID_DP_GOAL) if GRID_DP_GOAL else None,
        }
        (d / "map1.json").write_text(json.dumps(data, indent=1))
        (d / "pinned_py.json").write_text(json.dumps(P, indent=1, sort_keys=True))
        print(f"emitted map1.json + pinned_py.json -> {d}")

if __name__ == "__main__":
    main()
