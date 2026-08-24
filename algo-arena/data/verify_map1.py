#!/usr/bin/env python3
"""
Map-1 certification script for the "one map" course roadmap.
Encodes a candidate canonical map and verifies design requirements R1-R11
by actually running the course's algorithms on it.
Philosophy: certify the map with the same rigor as an assessment pipeline.

Legend in GRID strings:
  D = Depot (start)      . = floor (cost 1)     # = wall
  m = mud (cost 3)       1-6 = delivery pins P1..P6
  a,b,c = docks C1..C3   d,e = pop-up docks D4,D5
Layers defined separately: OVERPASS (undirected shortcut edge, cost 1),
CONVEYOR (directed negative edge). Both are toggle layers, OFF in base graph.
"""
import heapq, itertools, math
from collections import deque

GRID = [
    "D....#.....4",  # r0
    ".##..#.#....",  # r1
    "...#.#.#.##.",  # r2
    ".#.#...#..mm",  # r3
    ".#.#.##..#m2",  # r4
    ".#...#1..#mm",  # r5
    ".#####...#m.",  # r6
    ".........##.",  # r7
    "..a...#.....",  # r8
    "#...#.#..b..",  # r9
    "3...#.5.....",  # r10
    "...#.....#6c",  # r11
]
R, C = len(GRID), len(GRID[0])
assert all(len(row) == C for row in GRID)

def find(ch):
    for r in range(R):
        for cc in range(C):
            if GRID[r][cc] == ch:
                return (r, cc)
    return None

DEPOT = find('D')
PINS = {f"P{i}": find(str(i)) for i in range(1, 7)}
DOCKS = {k: find(v) for k, v in {"C1": 'a', "C2": 'b', "C3": 'c'}.items()}
POPUPS = {k: find(v) for k, v in {"D4": 'd', "D5": 'e'}.items() if find(v)}

def is_wall(p):
    return GRID[p[0]][p[1]] == '#'

def cost_of(p):
    return 3 if GRID[p[0]][p[1]] == 'm' else 1

def nbrs(p):
    r, cc = p
    for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
        q = (r+dr, cc+dc)
        if 0 <= q[0] < R and 0 <= q[1] < C and not is_wall(q):
            yield q

# toggle layers
OVERPASS = ((1, 0), (1, 10))    # undirected, cost 1 ("pedestrian bridge")
CONVEYOR = ((5, 10), (4, 11))   # directed, cost -6 ("conveyor belt out of the mud pit")

def edges(p, overpass=False, conveyor=False):
    """yield (q, w) moving from p."""
    for q in nbrs(p):
        yield q, cost_of(q)
    if overpass and p in OVERPASS:
        q = OVERPASS[1] if p == OVERPASS[0] else OVERPASS[0]
        yield q, 1
    if conveyor and p == CONVEYOR[0]:
        yield CONVEYOR[1], -6

def manhattan(p, q):
    return abs(p[0]-q[0]) + abs(p[1]-q[1])

def bfs(start, goal):
    """hop-shortest; returns (path, expanded_count)"""
    par, seen, expanded = {start: None}, {start}, 0
    Q = deque([start])
    while Q:
        u = Q.popleft(); expanded += 1
        if u == goal:
            path = []
            while u: path.append(u); u = par[u]
            return path[::-1], expanded
        for v in nbrs(u):
            if v not in seen:
                seen.add(v); par[v] = u; Q.append(v)
    return None, expanded

def dijkstra(start, goal=None, overpass=False, conveyor=False, visited_set=True):
    """lazy-insertion Dijkstra WITH a visited/closed set (the lecture variant).
    returns (dist_map, path_to_goal, expanded)"""
    dist, par, done, expanded = {start: 0}, {start: None}, set(), 0
    pq = [(0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        if visited_set:
            if u in done: continue
            done.add(u)
        elif d > dist.get(u, math.inf):
            continue
        expanded += 1
        if goal is not None and u == goal: break
        for v, w in edges(u, overpass, conveyor):
            if visited_set and v in done:
                continue  # textbook closed-set: never relax a settled node
            nd = d + w
            if nd < dist.get(v, math.inf):
                dist[v] = nd; par[v] = u
                heapq.heappush(pq, (nd, v))
    path = None
    if goal is not None and goal in par:
        path, u = [], goal
        while u is not None: path.append(u); u = par[u]
        path = path[::-1]
    return dist, path, expanded

def bellman_ford(start, overpass=False, conveyor=False):
    dist = {start: 0}
    cells = [(r,cc) for r in range(R) for cc in range(C) if not is_wall((r,cc))]
    for _ in range(len(cells)):
        changed = False
        for u in cells:
            if u not in dist: continue
            for v, w in edges(u, overpass, conveyor):
                if dist[u] + w < dist.get(v, math.inf):
                    dist[v] = dist[u] + w; changed = True
        if not changed: break
    return dist

def astar(start, goal, overpass=False):
    """A* graph-search with closed set, h = Manhattan; returns (cost, expanded)"""
    g, done, expanded = {start: 0}, set(), 0
    pq = [(manhattan(start, goal), start)]
    while pq:
        f, u = heapq.heappop(pq)
        if u in done: continue
        done.add(u); expanded += 1
        if u == goal: return g[u], expanded
        for v, w in edges(u, overpass):
            ng = g[u] + w
            if ng < g.get(v, math.inf):
                g[v] = ng
                heapq.heappush(pq, (ng + manhattan(v, goal), v))
    return None, expanded

def greedy_walk(start, goal, max_steps=500):
    """'always step to a neighbor strictly closer (Manhattan) to the goal'.
    Returns ('reached'|'stuck'|'loop', trail)."""
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

# ---------- checks ----------
report, ok_all = [], True
def check(name, cond, detail=""):
    global ok_all
    ok_all &= bool(cond)
    report.append(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

# R0 connectivity
names = {"Depot": DEPOT, **PINS, **DOCKS}
dist0, _, _ = dijkstra(DEPOT)
unreach = [k for k, p in names.items() if p not in dist0]
check("R0 connectivity: all named cells reachable from Depot", not unreach, f"unreachable={unreach}")

# R1 greedy trap on the way to P1
res, trail = greedy_walk(DEPOT, PINS["P1"])
bfs_p1, _ = bfs(DEPOT, PINS["P1"])
check("R1 greedy 'step toward goal' fails Depot->P1", res != 'reached', f"result={res} at {trail[-1]} after {len(trail)-1} steps")
check("R1 but BFS reaches P1", bfs_p1 is not None, f"BFS path len={len(bfs_p1)-1 if bfs_p1 else None}")

# R2 mud makes hop-shortest != cheapest (Depot->P2)
bfs_path, bfs_exp = bfs(DEPOT, PINS["P2"])
bfs_cost = sum(cost_of(p) for p in bfs_path[1:])
distD, dij_path, dij_exp = dijkstra(DEPOT, PINS["P2"])
dij_cost = distD[PINS["P2"]]
mud_on_bfs = any(GRID[p[0]][p[1]] == 'm' for p in bfs_path)
check("R2 BFS route to P2 crosses mud", mud_on_bfs)
check("R2 Dijkstra cost < BFS-path terrain cost", dij_cost < bfs_cost, f"dij={dij_cost} vs bfs-path={bfs_cost} (hops {len(bfs_path)-1} vs {len(dij_path)-1})")

# Scoreboard contrast on Depot->P2
ast_cost, ast_exp = astar(DEPOT, PINS["P2"])
check("Scoreboard: A* optimal (== Dijkstra)", ast_cost == dij_cost, f"A*={ast_cost}")
check("Scoreboard: A* expands substantially fewer than Dijkstra", ast_exp <= 0.7*dij_exp, f"BFS={bfs_exp}, Dijkstra={dij_exp}, A*={ast_exp}")

# R3 conveyor (negative edge) breaks closed-set Dijkstra
distC, _, _ = dijkstra(DEPOT, conveyor=True)
bfC = bellman_ford(DEPOT, conveyor=True)
t = PINS["P2"]
check("R3 conveyor layer: closed-set Dijkstra wrong vs Bellman-Ford at P2",
      distC.get(t) != bfC.get(t), f"dijkstra={distC.get(t)} bellman-ford={bfC.get(t)}")

# R4 overpass makes Manhattan inadmissible & A* suboptimal (goal P2, witness start (0,4))
goal = PINS["P2"]
dist_from_goal = bellman_ford(goal, overpass=True)
viol = [(n, manhattan(n, goal), d) for n, d in dist_from_goal.items() if manhattan(n, goal) > d]
W = (0, 4)  # demo witness start
true_o = bellman_ford(W, overpass=True)[goal]
ast_o_cost, _ = astar(W, goal, overpass=True)
check("R4 overpass layer: Manhattan inadmissible somewhere", len(viol) > 0, f"{len(viol)} violating nodes, e.g. {viol[:1]}")
check("R4 A*(closed set) suboptimal with overpass ON, start (0,4)->P2", ast_o_cost is not None and ast_o_cost > true_o, f"A*={ast_o_cost} vs true={true_o}")

# R5 dock interference graph: odd cycle, chromatic number 3
DOCK_EDGES = [("C1","C2"),("C2","C3"),("C3","D4"),("D4","D5"),("D5","C1")]  # C5 cycle
nodes = ["C1","C2","C3","D4","D5"]
def chromatic(nodes, edgelist):
    for k in (1,2,3,4):
        for assign in itertools.product(range(k), repeat=len(nodes)):
            cmap = dict(zip(nodes, assign))
            if all(cmap[u]!=cmap[v] for u,v in edgelist): return k
    return None
chi = chromatic(nodes, DOCK_EDGES)
check("R5 dock graph chromatic number = 3 (odd cycle C5)", chi == 3, f"chi={chi}")

# R8 pins: unique closest pair; TSP 720 tours; NN strictly worse than OPT
pin_pts = list(PINS.values())
pairs = sorted((math.dist(p,q),(p,q)) for p,q in itertools.combinations(pin_pts,2))
check("R8 unique closest pair among pins", pairs[0][0] < pairs[1][0]-1e-9, f"min={pairs[0][0]:.2f} next={pairs[1][0]:.2f}")
# pairwise shortest-path costs (terrain), incl. depot
pts = [DEPOT]+pin_pts
D = {}
for p in pts:
    dp,_,_ = dijkstra(p)
    for q in pts: D[(p,q)] = dp[q]
best = min((sum(D[(t[i],t[i+1])] for i in range(6)), t)
           for t in ((DEPOT,)+perm for perm in itertools.permutations(pin_pts)))
# nearest neighbor
u, unvis, nn_cost = DEPOT, set(pin_pts), 0
while unvis:
    v = min(unvis, key=lambda x: D[(u,x)]); nn_cost += D[(u,v)]; u = v; unvis.discard(v)
check("R8 TSP: NN tour strictly worse than OPT (720 tours enumerated)", nn_cost > best[0], f"NN={nn_cost} OPT={best[0]}")

# R10 bottleneck: max edge-disjoint Depot->C3 paths across the row-7 wall == 2
# unit-capacity max-flow on grid edges (each undirected edge capacity 1 each direction)
def max_edge_disjoint(s, t):
    cap = {}
    for r in range(R):
        for cc in range(C):
            u=(r,cc)
            if is_wall(u): continue
            for v in nbrs(u): cap[(u,v)] = 1
    flow = 0
    while True:
        par, Q, seen = {s:None}, deque([s]), {s}
        while Q and t not in par:
            x = Q.popleft()
            for y in nbrs(x):
                if y not in seen and cap.get((x,y),0) > 0:
                    seen.add(y); par[y]=x; Q.append(y)
        if t not in par: return flow
        v = t
        while par[v] is not None:
            u2 = par[v]; cap[(u2,v)] -= 1; cap[(v,u2)] = cap.get((v,u2),0)+1; v = u2
        flow += 1
fl = max_edge_disjoint(DEPOT, DOCKS["C3"])
check("R10 max edge-disjoint Depot->C3 paths == 2 (visible bottleneck)", fl == 2, f"flow={fl}")

# R11 size / traceability report
open_cells = sum(1 for r in range(R) for cc in range(C) if not is_wall((r,cc)))
report.append(f"[INFO] grid {R}x{C}, open cells={open_cells}; close-up window suggestion: rows 0-5, cols 0-7 (contains Depot, trap, P1)")
report.append(f"[INFO] Scoreboard(Depot->P2): BFS exp={bfs_exp}, Dijkstra exp={dij_exp}, A* exp={ast_exp}; costs bfs-path={bfs_cost}, opt={dij_cost}")
report.append(f"[INFO] TSP: OPT={best[0]} order={[ [k for k,v in PINS.items() if v==p][0] for p in best[1][1:]]}, NN={nn_cost}")

print("\n".join(report))
print("\nALL CHECKS:", "PASS" if ok_all else "FAIL")
