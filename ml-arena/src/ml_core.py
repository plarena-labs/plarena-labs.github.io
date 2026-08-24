"""ML Arena — Python twin of ml_core.js. Identical numerics (IEEE doubles, same op order).
Doubles as an out-of-browser data generator: genItems(seed) reproduces the arena world."""
import math

def mulberry32(a):
    state = [a & 0xFFFFFFFF]
    def rnd():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = state[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) ^ t
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd

LN2 = 0.6931471805599453
def dexp(x):
    if x > 30: x = 30.0
    if x < -30: x = -30.0
    n = math.floor(x/LN2 + 0.5)
    r = x - n*LN2
    p = 1.0
    for k in range(13, 0, -1):
        p = 1 + r*p/k
    s = p; m = n
    while m > 0: s *= 2; m -= 1
    while m < 0: s *= 0.5; m += 1
    return s

def sigm(x): return 1/(1 + dexp(-x))
def dtanh(x):
    e = dexp(2*x); return (e-1)/(e+1)

FOODS = ["Croquetas","Cuban sandwich","Pastelito","Empanada","Tostones","Maduros",
  "Ropa vieja","Lechon asado","Picadillo","Mofongo","Ceviche","Arepa",
  "Taco al pastor","Elote","Churros","Flan","Tres leches","Key lime pie",
  "Stone crab","Conch fritters","Jerk chicken","Griot","Patacon","Chicharron",
  "Vaca frita","Frita burger","Fufu","Tamal","Bollos","Mamey shake"]

def genItems(seed):
    rng = mulberry32(seed*1000 + 17)
    items = []
    for i in range(30):
        gx = i % 6; gy = i // 6
        x1 = (gx + 0.5)/6 + (rng() - 0.5)*0.14
        x2 = (gy + 0.5)/5 + (rng() - 0.5)*0.14
        x1 = min(0.97, max(0.03, x1)); x2 = min(0.97, max(0.03, x2))
        items.append({"id": i, "name": FOODS[i], "x1": x1, "x2": x2})
    return items

def pickIndices(seed, n):
    rng = mulberry32(seed*77 + 5)
    ix = list(range(30))
    for i in range(29, 0, -1):
        j = math.floor(rng()*(i+1))
        ix[i], ix[j] = ix[j], ix[i]
    return ix[:n]

def personaTruth(persona, it, rng):
    if persona == 'regular':
        raw = 0.12 + 0.85*it["x1"] - 0.45*it["x2"] + (rng() - 0.5)*0.16
        c = min(1.0, max(0.0, raw))
        s = math.floor(1 + 4*c + 0.5)
        return max(1, min(5, s))
    if persona == 'purist':     return 1 if it["x2"] < 0.45 else 0
    if persona == 'contrarian': return 1 if ((it["x1"] > 0.5) != (it["x2"] > 0.5)) else 0
    return 0

def personaRatings(persona, items, seed, n, flips=0):
    rng = mulberry32(seed*313 + 9)
    chosen = pickIndices(seed, n)
    ratings = {}
    for iid in chosen:
        ratings[iid] = personaTruth(persona, items[iid], rng)
    for k in range(min(flips, len(chosen))):
        iid = chosen[k]
        if persona != 'regular': ratings[iid] = 1 - ratings[iid]
    return {"ratings": ratings, "mode": 'stars' if persona == 'regular' else 'binary'}

def truthPool(persona, items, seed):
    rng = mulberry32(seed*313 + 9)
    return {it["id"]: personaTruth(persona, it, rng) for it in items}

def ipow(x, k):
    r = 1.0
    for _ in range(k): r *= x
    return r

def polyTerms(degree):
    T = []
    for t in range(1, degree+1):
        for i in range(t, -1, -1): T.append((i, t-i))
    return T

def expandMatrix(Z, degree):
    T = polyTerms(degree)
    E = [[ipow(z[0], e[0])*ipow(z[1], e[1]) for e in T] for z in Z]
    k = len(T); n = len(E)
    mu = [0.0]*k; sd = [0.0]*k
    for j in range(k):
        for i in range(n): mu[j] += E[i][j]
        mu[j] /= n
        for i in range(n): sd[j] += (E[i][j]-mu[j])*(E[i][j]-mu[j])
        sd[j] = math.sqrt(sd[j]/n) or 1
        for i in range(n): E[i][j] = (E[i][j]-mu[j])/sd[j]
    def mp(z):
        return [(ipow(z[0], T[j][0])*ipow(z[1], T[j][1]) - mu[j])/sd[j] for j in range(k)]
    return {"E": E, "map": mp, "k": k}

def standardizer(X):
    n = len(X)
    m1 = sum(x[0] for x in X)/n; m2 = sum(x[1] for x in X)/n
    v1 = 0.0; v2 = 0.0
    for x in X:
        v1 += (x[0]-m1)*(x[0]-m1); v2 += (x[1]-m2)*(x[1]-m2)
    s1 = math.sqrt(v1/n) or 1; s2 = math.sqrt(v2/n) or 1
    return {"m1": m1, "m2": m2, "s1": s1, "s2": s2,
            "z": lambda p: [(p[0]-m1)/s1, (p[1]-m2)/s2]}

def linearFit(F, y):
    n = len(F); k = len(F[0]) + 1
    A = [[0.0]*k for _ in range(k)]; b = [0.0]*k
    for i in range(n):
        r = [1.0] + list(F[i])
        for a in range(k):
            b[a] += r[a]*y[i]
            for c in range(k): A[a][c] += r[a]*r[c]
    for a in range(k): A[a][a] += 1e-9
    M = [A[a]+[b[a]] for a in range(k)]
    for col in range(k):
        piv = col
        for r2 in range(col+1, k):
            if abs(M[r2][col]) > abs(M[piv][col]): piv = r2
        M[col], M[piv] = M[piv], M[col]
        for r2 in range(col+1, k):
            f = M[r2][col]/M[col][col]
            for c2 in range(col, k+1): M[r2][c2] -= f*M[col][c2]
    w = [0.0]*k
    for r2 in range(k-1, -1, -1):
        s = M[r2][k]
        for c2 in range(r2+1, k): s -= M[r2][c2]*w[c2]
        w[r2] = s/M[r2][r2]
    return w

def linearGD(F, y, lr, epochs, valF=None, valY=None):
    # linear regression by full-batch gradient descent on MSE — same minimum as linearFit
    n = len(F); k = len(F[0])
    w = [0.0]*(k+1)
    losses = []; vlosses = []
    def score(f):
        s = w[0]
        for j in range(k): s += w[j+1]*f[j]
        return s
    for e in range(epochs):
        g = [0.0]*(k+1); L = 0.0
        for i in range(n):
            d = score(F[i]) - y[i]
            g[0] += d
            for j in range(k): g[j+1] += d*F[i][j]
            L += d*d
        losses.append(L/n)
        if valF is not None:
            VL = 0.0
            for i in range(len(valF)):
                d = score(valF[i]) - valY[i]
                VL += d*d
            vlosses.append(VL/len(valF))
        for j in range(k+1): w[j] -= lr*g[j]/n
    return {"w": w, "losses": losses, "vlosses": vlosses, "prob": lambda f: score(f)}

def logisticFit(F, y, lr, epochs, valF=None, valY=None):
    n = len(F); k = len(F[0])
    w = [0.0]*(k+1)
    losses = []; vlosses = []
    def score(f):
        s = w[0]
        for j in range(k): s += w[j+1]*f[j]
        return s
    for e in range(epochs):
        g = [0.0]*(k+1); L = 0.0
        for i in range(n):
            p = sigm(score(F[i]))
            d = p - y[i]
            g[0] += d
            for j in range(k): g[j+1] += d*F[i][j]
            L += -(y[i]*math.log(max(p, 1e-12)) + (1-y[i])*math.log(max(1-p, 1e-12)))
        losses.append(L/n)
        if valF is not None:
            VL = 0.0
            for i in range(len(valF)):
                p = sigm(score(valF[i]))
                VL += -(valY[i]*math.log(max(p, 1e-12)) + (1-valY[i])*math.log(max(1-p, 1e-12)))
            vlosses.append(VL/len(valF))
        for j in range(k+1): w[j] -= lr*g[j]/n
    return {"w": w, "losses": losses, "vlosses": vlosses, "prob": lambda f: sigm(score(f))}

def mlpFit(Z, y, h, lr, epochs, seed, valZ=None, valY=None):
    n = len(Z); losses = []; vlosses = []
    if h == 0:
        ex = expandMatrix(Z, 1)
        valF = [ex["map"](z) for z in valZ] if valZ is not None else None
        r = logisticFit(ex["E"], y, lr, epochs, valF, valY)
        return {"h": 0, "prob": lambda z: r["prob"](ex["map"](z)),
                "losses": r["losses"], "vlosses": r["vlosses"], "w": r["w"]}
    rng = mulberry32(seed*991 + 31)
    W1 = []; B1 = []; W2 = []
    for j in range(h):
        W1.append([(rng()*2-1)*0.9, (rng()*2-1)*0.9]); B1.append((rng()*2-1)*0.3); W2.append((rng()*2-1)*0.9)
    b2 = 0.0
    def fwd(z):
        s = b2v[0]
        a = [0.0]*h
        for j in range(h):
            a[j] = dtanh(W1[j][0]*z[0] + W1[j][1]*z[1] + B1[j]); s += W2[j]*a[j]
        return sigm(s), a
    b2v = [b2]
    for e in range(epochs):
        gW1 = [[0.0, 0.0] for _ in range(h)]; gB1 = [0.0]*h; gW2 = [0.0]*h; gb2 = 0.0
        L = 0.0
        for i in range(n):
            p, a = fwd(Z[i])
            d = p - y[i]
            L += -(y[i]*math.log(max(p, 1e-12)) + (1-y[i])*math.log(max(1-p, 1e-12)))
            gb2 += d
            for j in range(h):
                gW2[j] += d*a[j]
                dh = d*W2[j]*(1 - a[j]*a[j])
                gB1[j] += dh
                gW1[j][0] += dh*Z[i][0]; gW1[j][1] += dh*Z[i][1]
        losses.append(L/n)
        if valZ is not None:
            VL = 0.0
            for i in range(len(valZ)):
                p, _ = fwd(valZ[i])
                VL += -(valY[i]*math.log(max(p, 1e-12)) + (1-valY[i])*math.log(max(1-p, 1e-12)))
            vlosses.append(VL/len(valZ))
        b2v[0] -= lr*gb2/n
        for j in range(h):
            W2[j] -= lr*gW2[j]/n; B1[j] -= lr*gB1[j]/n
            W1[j][0] -= lr*gW1[j][0]/n; W1[j][1] -= lr*gW1[j][1]/n
    return {"h": h, "prob": lambda z: fwd(z)[0], "losses": losses, "vlosses": vlosses}

def runConfig(cfg):
    items = genItems(cfg["seed"])
    persona = cfg["persona"]
    pr = personaRatings(persona, items, cfg["seed"], cfg.get("n", 16), cfg.get("flips", 0))
    ratings = pr["ratings"]; mode = pr["mode"]
    pool = truthPool(persona, items, cfg["seed"])
    ids = sorted(ratings.keys())
    X = [[items[i]["x1"], items[i]["x2"]] for i in ids]
    y = [ratings[i] for i in ids]
    st = standardizer(X)
    Z = [st["z"](p) for p in X]
    outIds = [i for i in range(30) if i not in ratings]
    valZ = [st["z"]([items[i]["x1"], items[i]["x2"]]) for i in outIds]
    valY = [pool[i] for i in outIds]
    lr = cfg.get("lr", 0.5); epochs = cfg.get("epochs", 400)
    degree = max(1, min(10, cfg.get("degree", 1)))
    lens = cfg["lens"]
    if lens in ('linear', 'logistic'):
        ex = expandMatrix(Z, degree)
        valF = [ex["map"](z) for z in valZ] if valZ is not None else None
        if lens == 'linear':
            if cfg.get("solver") == 'gd':
                r = linearGD(ex["E"], y, lr, epochs, valF, valY)
                w = r["w"]; losses = r["losses"]; vlosses = r["vlosses"]
                prob = lambda z: r["prob"](ex["map"](z))
            else:
                w = linearFit(ex["E"], y)
                def prob(z, w=w, ex=ex):
                    f = ex["map"](z); s = w[0]
                    for j in range(ex["k"]): s += w[j+1]*f[j]
                    return s
                losses = []; vlosses = []
        else:
            r = logisticFit(ex["E"], y, lr, epochs, valF if mode == 'binary' else None, valY if mode == 'binary' else None)
            w = r["w"]; losses = r["losses"]; vlosses = r["vlosses"]
            prob = lambda z: r["prob"](ex["map"](z))
    else:
        r = mlpFit(Z, y, cfg.get("hidden", 4), lr, epochs, cfg["seed"],
                   valZ if mode == 'binary' else None, valY if mode == 'binary' else None)
        losses = r["losses"]; vlosses = r["vlosses"]; prob = r["prob"]; w = r.get("w")
    out = {"mode": mode, "nTrain": len(Z), "nPool": len(outIds), "losses": losses, "vlosses": vlosses, "w": w}
    if mode == 'binary':
        out["trainAcc"] = sum(1 for i in range(len(Z)) if (1 if prob(Z[i]) >= 0.5 else 0) == y[i])/len(Z)
        out["poolAcc"] = sum(1 for i in range(len(outIds)) if (1 if prob(valZ[i]) >= 0.5 else 0) == valY[i])/len(outIds)
    else:
        out["trainRmse"] = math.sqrt(sum((prob(Z[i])-y[i])**2 for i in range(len(Z)))/len(Z))
        out["poolRmse"] = math.sqrt(sum((prob(valZ[i])-valY[i])**2 for i in range(len(outIds)))/len(outIds))
    return out
