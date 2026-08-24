"use strict";
/* ============================================================
   ML Arena — deterministic core (no DOM). Twin: ml_core.py
   All numerics use only IEEE-754 ops + dexp/dlog below, so the
   Python twin reproduces trajectories to ~1e-12.
   ============================================================ */

/* ---------- PRNG ---------- */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ---------- deterministic exp / sigmoid / tanh ---------- */
const LN2 = 0.6931471805599453;
function dexp(x){
  if (x > 30) x = 30;
  if (x < -30) x = -30;
  const n = Math.floor(x/LN2 + 0.5);
  const r = x - n*LN2;
  let p = 1.0;
  for (let k = 13; k >= 1; k--) p = 1 + r*p/k;
  let s = p, m = n;
  while (m > 0) { s *= 2; m--; }
  while (m < 0) { s *= 0.5; m++; }
  return s;
}
function sigm(x){ return 1/(1 + dexp(-x)); }
function dtanh(x){ const e = dexp(2*x); return (e-1)/(e+1); }

/* ---------- world: 30 Miami foods on a jittered grid ---------- */
const FOODS = ["Croquetas","Cuban sandwich","Pastelito","Empanada","Tostones","Maduros",
  "Ropa vieja","Lechon asado","Picadillo","Mofongo","Ceviche","Arepa",
  "Taco al pastor","Elote","Churros","Flan","Tres leches","Key lime pie",
  "Stone crab","Conch fritters","Jerk chicken","Griot","Patacon","Chicharron",
  "Vaca frita","Frita burger","Fufu","Tamal","Bollos","Mamey shake"];

function genItems(seed){
  const rng = mulberry32(seed*1000 + 17);
  const items = [];
  for (let i = 0; i < 30; i++){
    const gx = i % 6, gy = Math.floor(i/6);
    let x1 = (gx + 0.5)/6 + (rng() - 0.5)*0.14;
    let x2 = (gy + 0.5)/5 + (rng() - 0.5)*0.14;
    x1 = Math.min(0.97, Math.max(0.03, x1));
    x2 = Math.min(0.97, Math.max(0.03, x2));
    items.push({ id: i, name: FOODS[i], x1: x1, x2: x2 });   // x1 = spiciness, x2 = price
  }
  return items;
}

/* ---------- personas (ground truth) ---------- */
// pick: which items get rated (deterministic shuffle), then label by taste fn
function pickIndices(seed, n){
  const rng = mulberry32(seed*77 + 5);
  const ix = []; for (let i = 0; i < 30; i++) ix.push(i);
  for (let i = 29; i > 0; i--){ const j = Math.floor(rng()*(i+1)); const t = ix[i]; ix[i] = ix[j]; ix[j] = t; }
  return ix.slice(0, n);
}
function personaTruth(persona, it, rng){
  if (persona === 'regular'){                       // graded, linear-ish: loves spice, minds price
    const raw = 0.12 + 0.85*it.x1 - 0.45*it.x2 + (rng() - 0.5)*0.16;
    const c = Math.min(1, Math.max(0, raw));
    let s = Math.floor(1 + 4*c + 0.5);
    if (s < 1) s = 1; if (s > 5) s = 5;
    return s;                                        // stars 1..5
  }
  if (persona === 'purist')     return it.x2 < 0.45 ? 1 : 0;                    // cheap only
  if (persona === 'contrarian') return ((it.x1 > 0.5) !== (it.x2 > 0.5)) ? 1 : 0; // XOR
  return 0;
}
// returns {ratings: Map(id -> value), mode:'stars'|'binary'}
function personaRatings(persona, items, seed, n, flips){
  const rng = mulberry32(seed*313 + 9);
  const chosen = pickIndices(seed, n);
  const ratings = {};
  for (const id of chosen){
    let v = personaTruth(persona, items[id], rng);
    ratings[id] = v;
  }
  const fl = flips|0;
  for (let k = 0; k < fl && k < chosen.length; k++){   // label noise for the scissors scene
    const id = chosen[k];
    if (persona !== 'regular') ratings[id] = 1 - ratings[id];
  }
  return { ratings: ratings, mode: persona === 'regular' ? 'stars' : 'binary' };
}
function truthPool(persona, items, seed){             // ground truth for ALL items (held-out eval)
  const rng = mulberry32(seed*313 + 9);               // same stream shape; stars noise refers to rating noise,
  const out = {};                                     // pool truth uses noise-free labels for binary personas
  for (const it of items){
    if (persona === 'regular'){ out[it.id] = personaTruth('regular', it, rng); }
    else out[it.id] = personaTruth(persona, it, rng);
  }
  return out;
}

/* ---------- standardization (population std) ---------- */
function standardizer(X){
  const n = X.length;
  let m1 = 0, m2 = 0;
  for (let i = 0; i < n; i++){ m1 += X[i][0]; m2 += X[i][1]; }
  m1 /= n; m2 /= n;
  let v1 = 0, v2 = 0;
  for (let i = 0; i < n; i++){ v1 += (X[i][0]-m1)*(X[i][0]-m1); v2 += (X[i][1]-m2)*(X[i][1]-m2); }
  v1 = Math.sqrt(v1/n) || 1; v2 = Math.sqrt(v2/n) || 1;
  return { m1:m1, m2:m2, s1:v1, s2:v2, z: p => [ (p[0]-m1)/v1, (p[1]-m2)/v2 ] };
}

/* ---------- polynomial feature expansion (deterministic term order + integer pow) ---------- */
function ipow(x, k){ let r = 1; for (let i = 0; i < k; i++) r *= x; return r; }
function polyTerms(degree){
  const T = [];
  for (let t = 1; t <= degree; t++) for (let i = t; i >= 0; i--) T.push([i, t - i]);
  return T;                                  // e.g. d=2: [1,0],[0,1],[2,0],[1,1],[0,2]
}
function expandMatrix(Z, degree){
  const T = polyTerms(degree);
  const E = Z.map(z => T.map(e => ipow(z[0], e[0]) * ipow(z[1], e[1])));
  // standardize each expanded column (population), keep transforms for prediction
  const k = T.length, n = E.length, mu = new Array(k).fill(0), sd = new Array(k).fill(0);
  for (let j = 0; j < k; j++){
    for (let i = 0; i < n; i++) mu[j] += E[i][j];
    mu[j] /= n;
    for (let i = 0; i < n; i++) sd[j] += (E[i][j]-mu[j])*(E[i][j]-mu[j]);
    sd[j] = Math.sqrt(sd[j]/n) || 1;
    for (let i = 0; i < n; i++) E[i][j] = (E[i][j]-mu[j])/sd[j];
  }
  const map = z => T.map((e, j) => (ipow(z[0], e[0]) * ipow(z[1], e[1]) - mu[j]) / sd[j]);
  return { E: E, map: map, k: k };
}

/* ---------- linear regression: closed form via k x k Gaussian elim (partial pivot) ---------- */
function linearFit(F, y){                    // F: rows of expanded features (no intercept col)
  const n = F.length, k = F[0].length + 1;   // +1 intercept
  const A = []; for (let a = 0; a < k; a++) A.push(new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < n; i++){
    const r = [1].concat(F[i]);
    for (let a = 0; a < k; a++){ b[a] += r[a]*y[i]; for (let c = 0; c < k; c++) A[a][c] += r[a]*r[c]; }
  }
  for (let a = 0; a < k; a++) A[a][a] += 1e-9;   // ridge epsilon for degenerate tiny sets
  const M = A.map((row, a) => row.concat([b[a]]));
  for (let col = 0; col < k; col++){
    let piv = col;
    for (let r2 = col+1; r2 < k; r2++) if (Math.abs(M[r2][col]) > Math.abs(M[piv][col])) piv = r2;
    const tmp = M[col]; M[col] = M[piv]; M[piv] = tmp;
    for (let r2 = col+1; r2 < k; r2++){
      const f = M[r2][col]/M[col][col];
      for (let c2 = col; c2 <= k; c2++) M[r2][c2] -= f*M[col][c2];
    }
  }
  const w = new Array(k).fill(0);
  for (let r2 = k-1; r2 >= 0; r2--){
    let s = M[r2][k];
    for (let c2 = r2+1; c2 < k; c2++) s -= M[r2][c2]*w[c2];
    w[r2] = s/M[r2][r2];
  }
  return w;   // [intercept, w_1..w_k]
}

/* ---------- linear regression, the OTHER road: full-batch GD on MSE ---------- */
function linearGD(F, y, lr, epochs, valF, valY){   // same minimum as linearFit, reached step by step
  const n = F.length, k = F[0].length;
  const w = new Array(k+1).fill(0);
  const losses = [], vlosses = [];
  const score = f => { let s = w[0]; for (let j = 0; j < k; j++) s += w[j+1]*f[j]; return s; };
  for (let e = 0; e < epochs; e++){
    const g = new Array(k+1).fill(0);
    let L = 0;
    for (let i = 0; i < n; i++){
      const d = score(F[i]) - y[i];
      g[0] += d;
      for (let j = 0; j < k; j++) g[j+1] += d*F[i][j];
      L += d*d;
    }
    losses.push(L/n);
    if (valF){
      let VL = 0;
      for (let i = 0; i < valF.length; i++){ const d = score(valF[i]) - valY[i]; VL += d*d; }
      vlosses.push(VL/valF.length);
    }
    for (let j = 0; j <= k; j++) w[j] -= lr*g[j]/n;
  }
  return { w:w, losses:losses, vlosses:vlosses, prob: f => score(f) };
}

/* ---------- logistic regression: full-batch GD ---------- */
function logisticFit(F, y, lr, epochs, valF, valY, l2){   // F: expanded feature rows; l2 optional (grades mode)
  const n = F.length, k = F[0].length;
  const w = new Array(k+1).fill(0);                   // [intercept, w_1..w_k]
  const losses = [], vlosses = [];
  const score = f => { let s = w[0]; for (let j = 0; j < k; j++) s += w[j+1]*f[j]; return s; };
  for (let e = 0; e < epochs; e++){
    const g = new Array(k+1).fill(0);
    if (l2) for (let j = 1; j <= k; j++) g[j] += l2*w[j];   // no penalty on the intercept
    let L = 0;
    for (let i = 0; i < n; i++){
      const p = sigm(score(F[i]));
      const d = p - y[i];
      g[0] += d;
      for (let j = 0; j < k; j++) g[j+1] += d*F[i][j];
      L += -(y[i]*Math.log(Math.max(p,1e-12)) + (1-y[i])*Math.log(Math.max(1-p,1e-12)));
    }
    losses.push(L/n);
    if (valF){
      let VL = 0;
      for (let i = 0; i < valF.length; i++){
        const p = sigm(score(valF[i]));
        VL += -(valY[i]*Math.log(Math.max(p,1e-12)) + (1-valY[i])*Math.log(Math.max(1-p,1e-12)));
      }
      vlosses.push(VL/valF.length);
    }
    for (let j = 0; j <= k; j++) w[j] -= lr*g[j]/n;
  }
  return { w:w, losses:losses, vlosses:vlosses, prob: f => sigm(score(f)) };
}

/* ---------- MLP 2-h-1 (tanh hidden, sigmoid out), full-batch GD ---------- */
function mlpFit(Z, y, h, lr, epochs, seed, valZ, valY){
  const n = Z.length, losses = [], vlosses = [];
  if (h === 0){                                     // exactly logistic (zero-init, degree 1) — family bridge
    const ex = expandMatrix(Z, 1);
    const valF = valZ ? valZ.map(z => ex.map(z)) : null;
    const r = logisticFit(ex.E, y, lr, epochs, valF, valY);
    return { h:0, prob: z => r.prob(ex.map(z)), losses:r.losses, vlosses:r.vlosses, w:r.w };
  }
  const rng = mulberry32(seed*991 + 31);
  const W1 = [], B1 = [], W2 = [];
  for (let j = 0; j < h; j++){ W1.push([(rng()*2-1)*0.9, (rng()*2-1)*0.9]); B1.push((rng()*2-1)*0.3); W2.push((rng()*2-1)*0.9); }
  let b2 = 0;
  const fwd = z => {
    let s = b2;
    const a = new Array(h);
    for (let j = 0; j < h; j++){ a[j] = dtanh(W1[j][0]*z[0] + W1[j][1]*z[1] + B1[j]); s += W2[j]*a[j]; }
    return { p: sigm(s), a: a };
  };
  for (let e = 0; e < epochs; e++){
    const gW1 = []; const gB1 = new Array(h).fill(0); const gW2 = new Array(h).fill(0); let gb2 = 0;
    for (let j = 0; j < h; j++) gW1.push([0,0]);
    let L = 0;
    for (let i = 0; i < n; i++){
      const f = fwd(Z[i]);
      const d = f.p - y[i];                          // dL/ds (sigmoid + CE)
      L += -(y[i]*Math.log(Math.max(f.p,1e-12)) + (1-y[i])*Math.log(Math.max(1-f.p,1e-12)));
      gb2 += d;
      for (let j = 0; j < h; j++){
        gW2[j] += d*f.a[j];
        const dh = d*W2[j]*(1 - f.a[j]*f.a[j]);      // through tanh
        gB1[j] += dh;
        gW1[j][0] += dh*Z[i][0]; gW1[j][1] += dh*Z[i][1];
      }
    }
    losses.push(L/n);
    if (valZ){
      let VL = 0;
      for (let i = 0; i < valZ.length; i++){
        const f = fwd(valZ[i]);
        VL += -(valY[i]*Math.log(Math.max(f.p,1e-12)) + (1-valY[i])*Math.log(Math.max(1-f.p,1e-12)));
      }
      vlosses.push(VL/valZ.length);
    }
    b2 -= lr*gb2/n;
    for (let j = 0; j < h; j++){
      W2[j] -= lr*gW2[j]/n; B1[j] -= lr*gB1[j]/n;
      W1[j][0] -= lr*gW1[j][0]/n; W1[j][1] -= lr*gW1[j][1]/n;
    }
  }
  return { h:h, prob: z => fwd(z).p, losses:losses, vlosses:vlosses,
           w:{W1:W1,B1:B1,W2:W2,b2:b2} };
}

/* ---------- one full training run (headless): the trace ---------- */
// cfg: {seed, persona ('regular'|'purist'|'contrarian'|'self'), n, flips, lens ('linear'|'logistic'|'mlp'),
//       hidden, lr, epochs, selfRatings (map id->v, for persona='self'), targetMode ('binary'|'stars')}
function runConfig(cfg){
  const items = genItems(cfg.seed);
  let ratings, mode, pool = null;
  if (cfg.persona === 'self'){ ratings = cfg.selfRatings || {}; mode = cfg.targetMode || 'binary'; }
  else {
    const pr = personaRatings(cfg.persona, items, cfg.seed, cfg.n|0 || 16, cfg.flips|0);
    ratings = pr.ratings; mode = pr.mode;
    pool = truthPool(cfg.persona, items, cfg.seed);
  }
  const ids = Object.keys(ratings).map(Number).sort((a,b)=>a-b);
  const X = ids.map(id => [items[id].x1, items[id].x2]);
  const yRaw = ids.map(id => ratings[id]);
  const y = mode === 'stars' ? yRaw.map(v => v) : yRaw;
  const st = standardizer(X);
  const Z = X.map(p => st.z(p));
  // held-out = all unrated items (persona mode only)
  const outIds = [];
  for (let i = 0; i < 30; i++) if (!(i in ratings)) outIds.push(i);
  const valZ = pool ? outIds.map(id => st.z([items[id].x1, items[id].x2])) : null;
  const valY = pool ? outIds.map(id => mode === 'stars' ? pool[id] : pool[id]) : null;

  const lr = cfg.lr || 0.5, epochs = cfg.epochs|0 || 400;
  const degree = Math.max(1, Math.min(10, cfg.degree|0 || 1));
  let model = null, losses = [], vlosses = [], w = null;
  if (cfg.lens === 'linear' || cfg.lens === 'logistic'){
    const ex = expandMatrix(Z, degree);
    const valF = valZ ? valZ.map(z => ex.map(z)) : null;
    if (cfg.lens === 'linear'){
      if (cfg.solver === 'gd'){
        const r = linearGD(ex.E, y, lr, epochs, valF, valY);
        losses = r.losses; vlosses = r.vlosses; w = r.w;
        model = { prob: z => r.prob(ex.map(z)) };
      } else {
        w = linearFit(ex.E, y);
        model = { prob: z => { const f = ex.map(z); let s = w[0]; for (let j = 0; j < ex.k; j++) s += w[j+1]*f[j]; return s; } };
      }
    } else {
      const r = logisticFit(ex.E, y, lr, epochs, mode==='binary' ? valF : null, mode==='binary' ? valY : null);
      losses = r.losses; vlosses = r.vlosses; w = r.w;
      model = { prob: z => r.prob(ex.map(z)) };
    }
  } else {
    const r = mlpFit(Z, y, cfg.hidden|0, lr, epochs, cfg.seed, mode==='binary' ? valZ : null, mode==='binary' ? valY : null);
    model = r; losses = r.losses; vlosses = r.vlosses; w = r.w;
  }
  // metrics
  const predOf = z => model.prob(z);
  let trainAcc = null, poolAcc = null, trainRmse = null, poolRmse = null;
  if (mode === 'binary'){
    let ok = 0;
    for (let i = 0; i < Z.length; i++){ const p = predOf(Z[i]); if ((p >= 0.5 ? 1 : 0) === y[i]) ok++; }
    trainAcc = ok/Z.length;
    if (pool){
      let ok2 = 0;
      for (let i = 0; i < outIds.length; i++){ const p = predOf(valZ[i]); if ((p >= 0.5 ? 1 : 0) === valY[i]) ok2++; }
      poolAcc = ok2/outIds.length;
    }
  } else {
    let se = 0;
    for (let i = 0; i < Z.length; i++){ const d = predOf(Z[i]) - y[i]; se += d*d; }
    trainRmse = Math.sqrt(se/Z.length);
    if (pool){
      let se2 = 0;
      for (let i = 0; i < outIds.length; i++){ const d = predOf(valZ[i]) - valY[i]; se2 += d*d; }
      poolRmse = Math.sqrt(se2/outIds.length);
    }
  }
  // baseline
  let baseAcc = null, baseRmse = null;
  if (mode === 'binary'){
    let ones = 0; for (const v of y) ones += v;
    const maj = ones*2 >= y.length ? 1 : 0;
    if (pool){ let ok = 0; for (let i = 0; i < outIds.length; i++) if (valY[i] === maj) ok++; baseAcc = ok/outIds.length; }
    else { let ok = 0; for (const v of y) if (v === maj) ok++; baseAcc = ok/y.length; }
  } else {
    let mean = 0; for (const v of y) mean += v; mean /= y.length;
    if (pool){ let se = 0; for (let i = 0; i < outIds.length; i++){ const d = mean - valY[i]; se += d*d; } baseRmse = Math.sqrt(se/outIds.length); }
    else { let se = 0; for (const v of y){ const d = mean - v; se += d*d; } baseRmse = Math.sqrt(se/y.length); }
  }
  return {
    cfg: cfg, mode: mode, nTrain: Z.length, nPool: outIds.length,
    w: w, losses: losses, vlosses: vlosses,
    trainAcc: trainAcc, poolAcc: poolAcc, trainRmse: trainRmse, poolRmse: poolRmse,
    baseAcc: baseAcc, baseRmse: baseRmse,
    _model: model, _st: st, _items: items, _ratings: ratings, _pool: pool, _outIds: outIds, _mapIds: ids
  };
}

/* exported surface (browser or node) */
const MLCORE = { mulberry32, dexp, sigm, dtanh, genItems, personaRatings, truthPool,
                 pickIndices, standardizer, linearFit, linearGD, logisticFit, mlpFit, runConfig, FOODS,
                 polyTerms, expandMatrix, ipow };
if (typeof module !== 'undefined') module.exports = MLCORE;
if (typeof window !== 'undefined') window.__mlarena = MLCORE;
