"use strict";
/* ============================================================================
   Student Grades teaching mode. Every figure below comes from the course's own
   worked examples and has been independently re-computed; the pinned values are
   listed in this arena's CHANGELOG.

   Numerics policy: compute at full precision and round only at the display
   layer — never chain rounded intermediates. Two constants are pinned here
   because a rounded-factor computation gives a different last digit.
   ============================================================================ */
const GQ = { mse930: 617.02,   // exact decimal 617.025; IEEE-double toFixed(2) rounds to 617.02
  dv1FNote: '−0.3196 if you chain rounded intermediate factors; the full-precision value is −0.3195' };

/* ---------------- canonical worked-example tables ---------------- */
const GD1_SCORES = [50,55,60,62,68,75,90,83,88,93];
const GD1_PF     = [0,0,0,1,1,1,1,1,1,1];
const GD2_PF     = [0,0,0,1,1,1,1,0,0,0];
const GD3_ROWS   = [[1,5,0],[2,6,0],[3,4,0],[4,7,1],[5,8,1],[6,7,1],[7,8,1],[8,3,1],[9,6,1],[10,4,1]];
const GIDS = 'ABCDEFGHIJ'.split('');
function gPristineD1(){ return GIDS.map((id,i) => ({ id, x:i+1, score:GD1_SCORES[i], pf:GD1_PF[i] })); }
const GD3 = GIDS.map((id,i) => ({ id, x1:GD3_ROWS[i][0], x2:GD3_ROWS[i][1], pf:GD3_ROWS[i][2] }));
const GCAND = [ {a:1.88,b:60}, {a:4.22,b:50}, {a:-11.11,b:100}, {a:9.30,b:0}, {a:68,b:-272} ];

/* ---------------- cohorts: synthetic held-out set (§2.1, fixed seeds) ---------------- */
function gGauss(rng){ let u=0,v=0; while(u===0)u=rng(); while(v===0)v=rng();
  return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185307179586*v); }
function gCohortScores(n, seed){ const rng=C.mulberry32(seed), out=[];
  for (let i=0;i<n;i++){ const x=1+9*rng(); let sc=5*x+45+gGauss(rng)*4; sc=Math.max(0,Math.min(100,sc)); out.push({x, score:sc}); } return out; }
function gCohortPF(n, seed, rule){ const rng=C.mulberry32(seed), out=[];
  for (let i=0;i<n;i++){ const x1=1+9*rng(), x2=10*rng(); let pf=rule(x1,x2)?1:0; if (rng()<0.05) pf=1-pf; out.push({x1,x2,pf}); } return out; }
const GCO1  = gCohortScores(30, 4001);                                  // Dataset 1 scores
const GCO1P = gCohortPF(30, 4007, x1 => x1 >= 4);                       // Dataset 1 pass/fail
const GCO2  = gCohortPF(40, 4005, x1 => x1 >= 4 && x1 <= 7);            // Dataset 2 (burnout)
const GCO3  = gCohortPF(40, 4006, (x1,x2) => (x1 > 3 && x2 > 6) || x1 >= 8);  // Dataset 3

/* ---------------- state ---------------- */
const GS = { room:'linear', d1:gPristineD1(), edited:false,
  cand:null, deg:1, solver:'closed', hand:false, hb:60, hw:0,
  kx:5, kx2:7, loo:false, showCo:false, logPreset:'trained',
  mlpDs:'d3', mlpModel:'preset', hidden:4, mseed:7, stu:'F', bet:null, cmp:null,
  thr:0.5, abHover:null, landMode:'explore' };   // Phase 1b state

/* ---------------- fitting (engines from the twinned core) ---------------- */
function gStand(xs){ const n=xs.length; let m=0; for(const v of xs) m+=v; m/=n;
  let s=0; for(const v of xs) s+=(v-m)*(v-m); s=Math.sqrt(s/n)||1; return {m,s,z:v=>(v-m)/s}; }
function gPolyFit(rows, deg, useGD){
  const xs = rows.map(r=>r.x), ys = rows.map(r=>r.score);
  const st = gStand(xs);
  const F = xs.map(v => { const z=st.z(v); const r=[]; let p=1; for(let k=1;k<=deg;k++){ p*=z; r.push(p); } return r; });
  const kk = deg, n = F.length, mu = new Array(kk).fill(0), sd = new Array(kk).fill(0);
  for (let j=0;j<kk;j++){ for(let i=0;i<n;i++) mu[j]+=F[i][j]; mu[j]/=n;
    for(let i=0;i<n;i++) sd[j]+=(F[i][j]-mu[j])*(F[i][j]-mu[j]); sd[j]=Math.sqrt(sd[j]/n)||1;
    for(let i=0;i<n;i++) F[i][j]=(F[i][j]-mu[j])/sd[j]; }
  let w, losses=[], vlosses=[];
  if (useGD){
    const valF = GCO1.map(o => { const z=st.z(o.x); const r=[]; let p=1; for(let k=1;k<=deg;k++){ p*=z; r.push((p - mu[k-1])/sd[k-1]); } return r; });
    const r = C.linearGD(F, ys, 0.5, 400, valF, GCO1.map(o=>o.score));
    w = r.w; losses = r.losses; vlosses = r.vlosses;
  } else w = C.linearFit(F, ys);
  const pred = x => { const z=st.z(x); let p=1, sum=w[0]; for(let k=1;k<=deg;k++){ p*=z; sum+=w[k]*(p-mu[k-1])/sd[k-1]; } return sum; };
  const b0 = pred(0), b1 = pred(1)-pred(0);   // de-standardized (exact for deg 1)
  return { pred, b0, b1, losses, vlosses };
}
function gMSE(rows, f){ let s=0; for (const r of rows) s+=(f(r.x)-r.score)**2; return s/rows.length; }
function gMAE(rows, f){ let s=0; for (const r of rows) s+=Math.abs(f(r.x)-r.score); return s/rows.length; }
function gLogFit(rows){
  const st = gStand(rows.map(r=>r.x));
  const F = rows.map(r=>[st.z(r.x)]), y = rows.map(r=>r.pf);
  const valF = GCO1P.map(o=>[st.z(o.x1)]);
  const r = C.logisticFit(F, y, 0.5, 400, valF, GCO1P.map(o=>o.pf), 0.1);
  const b1 = r.w[1]/st.s, b0 = r.w[0] - r.w[1]*st.m/st.s;
  return { prob: x => r.prob([st.z(x)]), b0, b1, boundary: -b0/b1, losses:r.losses, vlosses:r.vlosses };
}
function gMlpFit(){
  const d2 = GS.mlpDs === 'd2';
  const rows = d2 ? GS.d1.map((r,i)=>({x1:r.x, x2:0, pf:GD2_PF[i]})) : GD3;
  const xs1 = rows.map(r=>r.x1), xs2 = rows.map(r=>r.x2);
  const s1 = gStand(xs1), s2 = gStand(xs2);
  const Z = rows.map(r=>[s1.z(r.x1), s2.z(r.x2)]);
  const co = d2 ? GCO2 : GCO3;
  const valZ = co.map(o=>[s1.z(o.x1), d2 ? s2.z(0) : s2.z(o.x2)]);
  const r = C.mlpFit(Z, rows.map(r=>r.pf), GS.hidden, 0.8, 1500, GS.mseed, valZ, co.map(o=>o.pf));
  return { prob: (x1,x2) => r.prob([s1.z(x1), s2.z(d2?0:x2)]), losses:r.losses, vlosses:r.vlosses, d2 };
}
/* the worked-example cohort' hand-assigned 2-2-1 preset — RAW feature units (§5.1) */
const P221 = {
  h1: x1 => C.sigm(x1 - 3), h2: x2 => C.sigm(x2 - 6),
  prob(x1, x2){ return C.sigm(this.h1(x1) + this.h2(x2) - 1); },
};

/* ---------------- step-through (§5.2, full-precision display per §0) ---------------- */
function gStepLines(stuId){
  const row = GD3.find(r => r.id === stuId);
  const { x1, x2, pf } = row;
  const z1 = x1 - 3, z2 = x2 - 6;
  const h1 = C.sigm(z1), h2 = C.sigm(z2);
  const zo = h1 + h2 - 1, yo = C.sigm(zo);
  const f2 = v => v.toFixed(2), f4 = v => v.toFixed(4);
  const sp = z => C.sigm(z)*(1 - C.sigm(z));
  const dO = yo - pf;
  const dv1 = dO*h1, dv2 = dO*h2;
  const dz1 = dO*1*sp(z1), dz2 = dO*1*sp(z2);
  const dw11 = dz1*x1, dw12 = dz1*x2, dw21 = dz2*x1, dw22 = dz2*x2;
  const L = pf === 1 ? -Math.log(yo) : -Math.log(1 - yo);
  const eta = 0.1;
  const lines = [];
  lines.push(`Student ${stuId}  (Hours_studied=${x1}, Hours_slept=${x2}) → actual: ${pf===1?'Pass':'Fail'}`);
  lines.push('');
  lines.push('FORWARD');
  lines.push(`  z₁ = x₁ − 3 = ${z1}        h₁ = σ(z₁) = ${f2(h1)}     "study detector"`);
  lines.push(`  z₂ = x₂ − 6 = ${z2}        h₂ = σ(z₂) = ${f2(h2)}     "sleep detector"`);
  lines.push(`  z_o = h₁ + h₂ − 1 = ${f4(zo)}`);
  lines.push(`  ŷ = σ(z_o) = ${f2(yo)}  →  ${yo>=0.5?'Pass':'Fail'} ${(yo>=0.5?1:0)===pf?'✓':'✗ (network is wrong here)'}`);
  lines.push('');
  lines.push(`BACKWARD  (binary cross-entropy · L = ${f4(L)})`);
  lines.push(`  δ_o = ŷ − y = ${f4(dO)}`);
  lines.push(`  ∂L/∂v₁ = δ_o·h₁ = ${f4(dv1)}`);
  if (stuId === 'F') lines.push(`      ↳ ${GQ.dv1FNote}`);
  lines.push(`  ∂L/∂v₂ = δ_o·h₂ = ${f4(dv2)}`);
  lines.push(`  δ_h₂ = δ_o·v₂·σ′(z₂) = ${f4(dz2)}    σ′(${z2}) = ${(sp(z2)).toFixed(3)}`);
  lines.push(`  δ_h₁ = δ_o·v₁·σ′(z₁) = ${f4(dz1)}    σ′(${z1}) = ${(sp(z1)).toFixed(3)}  ← the vanishing-gradient beat`);
  lines.push(`  ∂L/∂w₁₁ = δ_h₁·x₁ = ${f4(dw11)}      ∂L/∂w₁₂ = δ_h₁·x₂ = ${f4(dw12)}  (|·| = ${f4(Math.abs(dw12))})`);
  lines.push(`  ∂L/∂w₂₁ = δ_h₂·x₁ = ${f4(dw21)}      ∂L/∂w₂₂ = δ_h₂·x₂ = ${f4(dw22)}`);
  lines.push('');
  lines.push(`UPDATE (η = ${eta})`);
  lines.push(`  w₁₁ → ${(1 - eta*dw11).toFixed(3)}   w₂₂ → ${(1 - eta*dw22).toFixed(3)}   v₁ → ${(1 - eta*dv1).toFixed(3)}   v₂ → ${(1 - eta*dv2).toFixed(3)}`);
  return lines.join('\n');
}

/* ---------------- canvas ---------------- */
const gcv = $('gCv'), gcx = gcv.getContext('2d');
const GW = 520, GH = 470;
gcv.width = GW*DPR; gcv.height = GH*DPR; gcv.style.width = GW+'px'; gcv.style.height = GH+'px';
gcx.setTransform(DPR, 0, 0, DPR, 0, 0);
const GP = 44, GPW = GW - GP - 14, GPH = GH - GP - 16;
const glcv = $('gLoss'), glcx = glcv.getContext('2d');
const GLW = 640, GLH = 150;
glcv.width = GLW*DPR; glcv.height = GLH*DPR; glcv.style.width = GLW+'px'; glcv.style.height = GLH+'px';
glcx.setTransform(DPR, 0, 0, DPR, 0, 0);

let gYlo = 45, gYhi = 100;   // linear room y-band (extends for wild candidates)
const gx = v => GP + v/10*GPW;
const gy = v => (GH - GP) - (v - gYlo)/(gYhi - gYlo)*GPH;

function gAxes(xlabel, ylabel, yTicks){
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2;
  gcx.beginPath(); gcx.moveTo(GP, GH-GP); gcx.lineTo(GP+GPW, GH-GP);
  gcx.moveTo(GP, GH-GP); gcx.lineTo(GP, GH-GP-GPH); gcx.stroke();
  gcx.fillStyle = '#8a8378'; gcx.font = '12px sans-serif'; gcx.textAlign = 'center';
  gcx.fillText(xlabel, GP+GPW/2, GH-6);
  gcx.save(); gcx.translate(12, GH-GP-GPH/2); gcx.rotate(-Math.PI/2); gcx.fillText(ylabel, 0, 0); gcx.restore();
  gcx.font = '10px ui-monospace,monospace';
  for (let t = 0; t <= 10; t++){ gcx.fillText(t, gx(t), GH-GP+14); }
  if (yTicks) for (const t of yTicks){ if (t >= gYlo && t <= gYhi){ gcx.textAlign='right'; gcx.fillText(t, GP-5, gy(t)+3); gcx.textAlign='center'; } }
}
function gPoint(X, Y, pf, letter, hollow){
  if (pf === 0){
    gcx.strokeStyle = '#D55E00'; gcx.lineWidth = 2.2; gcx.lineCap = 'round';
    gcx.beginPath(); gcx.moveTo(X-4.5, Y-4.5); gcx.lineTo(X+4.5, Y+4.5);
    gcx.moveTo(X+4.5, Y-4.5); gcx.lineTo(X-4.5, Y+4.5); gcx.stroke();
  } else {
    gcx.beginPath(); gcx.arc(X, Y, 4.6, 0, 7);
    if (hollow){ gcx.fillStyle = '#fff'; gcx.fill(); gcx.strokeStyle = '#009E73'; gcx.lineWidth = 1.8; gcx.stroke(); }
    else { gcx.fillStyle = pf === null ? '#E69F00' : '#009E73'; gcx.fill(); gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 1; gcx.stroke(); }
  }
  if (letter){ gcx.fillStyle = '#2b2b2b'; gcx.font = 'bold 10px sans-serif'; gcx.fillText(letter, X, Y-9); }
}

/* ------- linear room ------- */
function gCurLine(){    // the active model: candidate | hand | fitted (per solver+degree)
  if (GS._override) return { pred: GS._override, tag: 'tmp' };
  if (GS.hand) return { pred: x => GS.hb + GS.hw*x, tag: 'hand' };
  if (GS.cand !== null) return { pred: x => GCAND[GS.cand].a*x + GCAND[GS.cand].b, tag: 'cand' };
  const rows = GS.loo ? GS.d1.filter(r => r.id !== 'F') : GS.d1;
  const f = gPolyFit(rows, GS.deg, GS.solver === 'gd');
  return { pred: f.pred, b0: f.b0, b1: f.b1, losses: f.losses, vlosses: f.vlosses, tag: 'fit' };
}
function gDrawLinear(){
  gcx.clearRect(0, 0, GW, GH);
  const m = gCurLine();
  // y-band: default 45..100, extended if the curve demands (never clamp — §2.2)
  gYlo = 45; gYhi = 100;
  let lo = 45, hi = 100;
  for (let x = 0; x <= 10; x += 0.25){ const v = m.pred(x); if (v === v){ lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  gYlo = Math.max(-300, Math.floor(lo/10)*10); gYhi = Math.min(420, Math.ceil(hi/10)*10);
  gAxes('Hours_studied →', 'Score', [0,25,50,60,70,80,90,100,-100,-200,150,200,300].filter(t=>t>=gYlo&&t<=gYhi));
  // cohort
  if (GS.showCo){ gcx.globalAlpha = 0.35;
    for (const o of GCO1) gPoint(gx(o.x), gy(o.score), null, null, false);
    gcx.globalAlpha = 1;
    gcx.fillStyle = '#8a8378'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
    gcx.fillText('faded ● = held-out cohort (synthetic)', GP+6, GH-GP-GPH+14); gcx.textAlign = 'center';
  }
  // curve
  gcx.save(); gcx.beginPath(); gcx.rect(GP, GH-GP-GPH, GPW, GPH); gcx.clip();
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2.4; gcx.beginPath();
  for (let i = 0; i <= 140; i++){ const x = 10*i/140, v = m.pred(x);
    if (i === 0) gcx.moveTo(gx(x), gy(v)); else gcx.lineTo(gx(x), gy(v)); }
  gcx.stroke(); gcx.restore();
  // residual sticks + points
  for (const r of GS.d1){
    const X = gx(r.x), Y = gy(r.score);
    const hidden = GS.loo && r.id === 'F';
    if (!hidden){
      gcx.strokeStyle = 'rgba(43,43,43,.5)'; gcx.lineWidth = 1.3;
      gcx.beginPath(); gcx.moveTo(X, Y); gcx.lineTo(X, gy(m.pred(r.x))); gcx.stroke();
    }
    gPoint(X, Y, null, r.id, hidden);
  }
  if (GS.loo){ gcx.fillStyle = '#c2185b'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
    gcx.fillText('Student F is hidden from the fit — hollow point = the answer', GP+6, GH-GP-GPH+28); gcx.textAlign='center'; }
  // 1b-1.2: predicted-point marker for the hovered A/G beat (candidate y = 1.88x + 60)
  if (GS.abHover && GS.cand === 0 && !GS.edited){
    const q = GS.d1.find(r => r.id === GS.abHover);
    const pv = GCAND[0].a*q.x + GCAND[0].b, err = q.score - pv;
    const PX = gx(q.x), PY = gy(pv);
    gcx.beginPath(); gcx.arc(PX, PY, 5, 0, 7);
    gcx.fillStyle = '#fff'; gcx.fill(); gcx.strokeStyle = '#E67E22'; gcx.lineWidth = 2; gcx.stroke();
    gcx.strokeStyle = '#E67E22'; gcx.lineWidth = 2; gcx.setLineDash([3,3]);
    gcx.beginPath(); gcx.moveTo(PX, gy(q.score)); gcx.lineTo(PX, PY); gcx.stroke(); gcx.setLineDash([]);
    gcx.fillStyle = '#E67E22'; gcx.font = 'bold 11px sans-serif'; gcx.textAlign = 'left';
    gcx.fillText(`Pred(${q.id}) = (${q.x}, ${Math.round(pv)}) · error ${err >= 0 ? '+' : '−'}${Math.abs(Math.round(err))}`, PX + 10, PY + 4);
    gcx.textAlign = 'center';
  }
  // K marker
  const kx = GS.kx, kv = m.pred(kx);
  gcx.strokeStyle = '#c2185b'; gcx.lineWidth = 1.8; gcx.setLineDash([5,4]);
  gcx.beginPath(); gcx.moveTo(gx(kx), GH-GP); gcx.lineTo(gx(kx), gy(Math.max(gYlo, Math.min(gYhi, kv)))); gcx.stroke(); gcx.setLineDash([]);
  gcx.fillStyle = '#c2185b'; gcx.font = 'bold 11px sans-serif';
  gcx.fillText('K', gx(kx), GH-GP-GPH-2 < gy(kv) ? gy(kv)-10 : GH-GP-GPH+10);
  gcx.font = '11px sans-serif'; gcx.fillStyle = '#8a8378'; gcx.textAlign = 'left';
  gcx.fillText('● score · | residual · K = you', GP+6, GH-GP-GPH-4 < 12 ? 12 : GH-GP-GPH-4);
  gcx.textAlign = 'center';
}

/* ------- logistic room ------- */
function gLogModel(){
  if (gDrawLogistic._tmp) return gDrawLogistic._tmp;
  if (GS.logPreset === 'demo') return { prob: x => C.sigm(x - 5), boundary: 5, demo: true };
  const f = gLogFit(GS.d1);
  return f;
}
function gDrawLogistic(){
  gcx.clearRect(0, 0, GW, GH);
  gYlo = -0.14; gYhi = 1.14;
  const m = gLogModel();
  gcx.fillStyle = '#8a8378'; gcx.font = '12px sans-serif'; gcx.textAlign = 'center';
  // axes with 0/0.5/1 ticks
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2;
  gcx.beginPath(); gcx.moveTo(GP, GH-GP); gcx.lineTo(GP+GPW, GH-GP);
  gcx.moveTo(GP, GH-GP); gcx.lineTo(GP, GH-GP-GPH); gcx.stroke();
  gcx.fillText('Hours_studied →', GP+GPW/2, GH-6);
  gcx.save(); gcx.translate(12, GH-GP-GPH/2); gcx.rotate(-Math.PI/2); gcx.fillText('P(Pass)', 0, 0); gcx.restore();
  gcx.font = '10px ui-monospace,monospace';
  for (let t = 0; t <= 10; t++) gcx.fillText(t, gx(t), GH-GP+14);
  gcx.textAlign = 'right';
  for (const t of [0, 0.5, 1]) gcx.fillText(t, GP-5, gy(t)+3);
  gcx.textAlign = 'center';
  // 1b-6: decision-threshold split tint (default T = 0.5 splits exactly at the boundary)
  const xT = Math.max(0, Math.min(10, gThrCut(m, GS.thr)));
  gcx.fillStyle = 'rgba(213,94,0,0.055)'; gcx.fillRect(GP, GH-GP-GPH, gx(xT)-GP, GPH);
  gcx.fillStyle = 'rgba(0,158,115,0.055)'; gcx.fillRect(gx(xT), GH-GP-GPH, GP+GPW-gx(xT), GPH);
  // threshold line σ = 0.5
  gcx.strokeStyle = '#c9c2b4'; gcx.setLineDash([4,4]); gcx.lineWidth = 1;
  gcx.beginPath(); gcx.moveTo(GP, gy(0.5)); gcx.lineTo(GP+GPW, gy(0.5)); gcx.stroke(); gcx.setLineDash([]);
  if (Math.abs(GS.thr - 0.5) > 1e-9){
    gcx.strokeStyle = '#E67E22'; gcx.setLineDash([4,4]); gcx.lineWidth = 1.4;
    gcx.beginPath(); gcx.moveTo(GP, gy(GS.thr)); gcx.lineTo(GP+GPW, gy(GS.thr));
    gcx.moveTo(gx(xT), GH-GP); gcx.lineTo(gx(xT), GH-GP-GPH); gcx.stroke(); gcx.setLineDash([]);
    gcx.fillStyle = '#E67E22'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
    gcx.fillText(`T = ${GS.thr.toFixed(2)} → cut at ${xT.toFixed(2)} h`, gx(xT)+6, gy(GS.thr)-6);
    gcx.textAlign = 'center';
  }
  // 1b-7: boundary ghost-trail from Watch training
  if (gGhost.curves && gGhost.curves.length && GS.room === 'logistic'){
    gcx.strokeStyle = 'rgba(43,43,43,0.12)'; gcx.lineWidth = 1.4;
    for (const cur of gGhost.curves){
      gcx.beginPath();
      cur.forEach((p, i) => i === 0 ? gcx.moveTo(gx(10*i/140), gy(p)) : gcx.lineTo(gx(10*i/140), gy(p)));
      gcx.stroke();
    }
  }
  // boundary
  gcx.strokeStyle = '#c2185b'; gcx.setLineDash([5,4]); gcx.lineWidth = 1.6;
  gcx.beginPath(); gcx.moveTo(gx(m.boundary), GH-GP); gcx.lineTo(gx(m.boundary), GH-GP-GPH); gcx.stroke(); gcx.setLineDash([]);
  gcx.fillStyle = '#c2185b'; gcx.font = '11px sans-serif';
  gcx.fillText(`boundary ${m.boundary.toFixed(2)} h (z = 0 → σ = 0.5)`, gx(m.boundary), GH-GP-GPH+12);
  // cohort
  if (GS.showCo){ gcx.globalAlpha = 0.35;
    for (const o of GCO1P) gPoint(gx(o.x1), gy(o.pf), o.pf, null, false);
    gcx.globalAlpha = 1; }
  // σ curve
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2.4; gcx.beginPath();
  for (let i = 0; i <= 140; i++){ const x = 10*i/140;
    if (i === 0) gcx.moveTo(gx(x), gy(m.prob(x))); else gcx.lineTo(gx(x), gy(m.prob(x))); }
  gcx.stroke();
  // points at their labels
  for (const r of GS.d1) gPoint(gx(r.x), gy(r.pf), r.pf, r.id, false);
  // demo honesty: mark D
  if (m.demo){ const D = GS.d1[3];
    gcx.strokeStyle = '#B22222'; gcx.lineWidth = 2;
    gcx.beginPath(); gcx.arc(gx(D.x), gy(D.pf), 11, 0, 7); gcx.stroke();
    gcx.fillStyle = '#B22222'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
    gcx.fillText(`D: σ(4−5) ≈ ${C.sigm(-1).toFixed(2)} → "Fail" — but D actually passed`, gx(D.x)+14, gy(D.pf)-10);
    gcx.textAlign = 'center';
  }
  // K marker
  const kp = m.prob(GS.kx);
  gcx.fillStyle = '#c2185b';
  gcx.beginPath(); gcx.arc(gx(GS.kx), gy(kp), 5, 0, 7); gcx.fill();
  gcx.font = 'bold 11px ui-monospace,monospace'; gcx.textAlign = 'left';
  gcx.fillText(`K: σ = ${kp.toFixed(2)} → ${kp >= GS.thr ? 'Pass' : 'Fail'} side`, gx(GS.kx)+10, gy(kp)-8);
  gcx.textAlign = 'center';
  gcx.fillStyle = '#8a8378'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
  gcx.fillText('● Pass · ✕ Fail (click a point to flip its label)', GP+6, GH-GP-GPH-4 < 12 ? 12 : GH-GP-GPH-4);
  gcx.textAlign = 'center';
}

/* ------- MLP room ------- */
let gMlpCache = null;   // trained model cache (invalidated on ds/hidden/seed change)
function gMlpModel(){
  if (GS.mlpModel === 'preset') return { prob: (x1,x2) => P221.prob(x1, x2), preset: true, d2: GS.mlpDs === 'd2' };
  if (!gMlpCache) gMlpCache = gMlpFit();
  return gMlpCache;
}
function gDrawMlp(){
  const m = gMlpModel();
  if (GS.mlpDs === 'd2'){ gDrawMlp1D(m); return; }
  gcx.clearRect(0, 0, GW, GH);
  // 2-D study space, axes 0-10 both
  const gy2 = v => (GH - GP) - v/10*GPH;
  // heat
  const G = 44;
  for (let iy = 0; iy < G; iy++) for (let ix = 0; ix < G; ix++){
    const x1 = 10*(ix+0.5)/G, x2 = 10*(1 - (iy+0.5)/G);
    const p = m.prob(x1, x2);
    gcx.fillStyle = p >= 0.5 ? `rgba(0,158,115,${0.08 + 0.25*(p-0.5)*2})` : `rgba(213,94,0,${0.08 + 0.25*(0.5-p)*2})`;
    gcx.fillRect(GP + ix*GPW/G, (GH-GP-GPH) + iy*GPH/G, GPW/G + 0.5, GPH/G + 0.5);
  }
  // 1b-7: boundary ghost-trail from Watch training
  if (gGhost.segs && gGhost.segs.length){
    gcx.strokeStyle = 'rgba(43,43,43,0.10)'; gcx.lineWidth = 1.6; gcx.beginPath();
    for (const snap of gGhost.segs) for (const s of snap){ gcx.moveTo(s[0], s[1]); gcx.lineTo(s[2], s[3]); }
    gcx.stroke();
  }
  // boundary p=0.5 marching
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2;
  const B = 60, val = [];
  for (let iy = 0; iy <= B; iy++){ val.push([]); for (let ix = 0; ix <= B; ix++) val[iy].push(m.prob(10*ix/B, 10*(1-iy/B)) - 0.5); }
  gcx.beginPath();
  for (let iy = 0; iy < B; iy++) for (let ix = 0; ix < B; ix++){
    const a = val[iy][ix], b = val[iy][ix+1], c = val[iy+1][ix];
    const X0 = GP + ix/B*GPW, Y0 = (GH-GP-GPH) + iy/B*GPH;
    if (a*b < 0){ const t = a/(a-b); gcx.moveTo(X0+t*GPW/B, Y0); gcx.lineTo(X0+t*GPW/B, Y0+2); }
    if (a*c < 0){ const t = a/(a-c); gcx.moveTo(X0, Y0+t*GPH/B); gcx.lineTo(X0+2, Y0+t*GPH/B); }
  }
  gcx.stroke();
  // preset truth: the line x1 + x2 = 9 (honesty requirement §5.1)
  if (m.preset){
    gcx.strokeStyle = '#2C5282'; gcx.lineWidth = 1.6; gcx.setLineDash([7,5]);
    gcx.beginPath(); gcx.moveTo(gx(0), gy2(9)); gcx.lineTo(gx(9), gy2(0)); gcx.stroke(); gcx.setLineDash([]);
    gcx.fillStyle = '#2C5282'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
    gcx.fillText('true boundary: Hours_studied + Hours_slept = 9 — a flexible trade-off, NOT a rigid AND gate', GP+6, gy2(9.6));
    gcx.textAlign = 'center';
  }
  // axes
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2;
  gcx.beginPath(); gcx.moveTo(GP, GH-GP); gcx.lineTo(GP+GPW, GH-GP);
  gcx.moveTo(GP, GH-GP); gcx.lineTo(GP, GH-GP-GPH); gcx.stroke();
  gcx.fillStyle = '#8a8378'; gcx.font = '12px sans-serif'; gcx.textAlign = 'center';
  gcx.fillText('Hours_studied →', GP+GPW/2, GH-6);
  gcx.save(); gcx.translate(12, GH-GP-GPH/2); gcx.rotate(-Math.PI/2); gcx.fillText('Hours_slept →', 0, 0); gcx.restore();
  gcx.font = '10px ui-monospace,monospace';
  for (let t = 0; t <= 10; t += 2){ gcx.fillText(t, gx(t), GH-GP+14); gcx.textAlign='right'; gcx.fillText(t, GP-5, gy2(t)+3); gcx.textAlign='center'; }
  // cohort
  if (GS.showCo){ gcx.globalAlpha = 0.35;
    for (const o of GCO3) gPoint(gx(o.x1), gy2(o.x2), o.pf, null, false);
    gcx.globalAlpha = 1; }
  // students
  for (const r of GD3) gPoint(gx(r.x1), gy2(r.x2), r.pf, r.id, false);
  // K probe
  const kp = m.prob(GS.kx, GS.kx2);
  gcx.strokeStyle = '#c2185b'; gcx.lineWidth = 2.2;
  const KX = gx(GS.kx), KY = gy2(GS.kx2);
  gcx.beginPath(); gcx.moveTo(KX, KY-8); gcx.lineTo(KX+8, KY); gcx.lineTo(KX, KY+8); gcx.lineTo(KX-8, KY); gcx.closePath();
  gcx.fillStyle = '#fff'; gcx.fill(); gcx.stroke();
  gcx.fillStyle = '#c2185b'; gcx.font = 'bold 11px sans-serif'; gcx.fillText('K', KX, KY+4);
}
function gDrawMlp1D(m){
  gcx.clearRect(0, 0, GW, GH);
  gYlo = -0.14; gYhi = 1.14;
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2;
  gcx.beginPath(); gcx.moveTo(GP, GH-GP); gcx.lineTo(GP+GPW, GH-GP);
  gcx.moveTo(GP, GH-GP); gcx.lineTo(GP, GH-GP-GPH); gcx.stroke();
  gcx.fillStyle = '#8a8378'; gcx.font = '12px sans-serif'; gcx.textAlign = 'center';
  gcx.fillText('Hours_studied →', GP+GPW/2, GH-6);
  gcx.save(); gcx.translate(12, GH-GP-GPH/2); gcx.rotate(-Math.PI/2); gcx.fillText('P(Pass)', 0, 0); gcx.restore();
  gcx.font = '10px ui-monospace,monospace';
  for (let t = 0; t <= 10; t++) gcx.fillText(t, gx(t), GH-GP+14);
  gcx.strokeStyle = '#c9c2b4'; gcx.setLineDash([4,4]); gcx.lineWidth = 1;
  gcx.beginPath(); gcx.moveTo(GP, gy(0.5)); gcx.lineTo(GP+GPW, gy(0.5)); gcx.stroke(); gcx.setLineDash([]);
  if (GS.showCo){ gcx.globalAlpha = 0.35;
    for (const o of GCO2) gPoint(gx(o.x1), gy(o.pf), o.pf, null, false);
    gcx.globalAlpha = 1; }
  // 1b-7: ghost curves from Watch training (burnout view)
  if (gGhost.curves && gGhost.curves.length && GS.room === 'mlp'){
    gcx.strokeStyle = 'rgba(43,43,43,0.12)'; gcx.lineWidth = 1.4;
    for (const cur of gGhost.curves){
      gcx.beginPath();
      cur.forEach((p, i) => i === 0 ? gcx.moveTo(gx(10*i/140), gy(p)) : gcx.lineTo(gx(10*i/140), gy(p)));
      gcx.stroke();
    }
  }
  const pf = m.preset ? (x => P221.prob(x, 0)) : (x => m.prob(x, 0));
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2.4; gcx.beginPath();
  for (let i = 0; i <= 140; i++){ const x = 10*i/140;
    if (i === 0) gcx.moveTo(gx(x), gy(pf(x))); else gcx.lineTo(gx(x), gy(pf(x))); }
  gcx.stroke();
  for (let i = 0; i < 10; i++) gPoint(gx(i+1), gy(GD2_PF[i]), GD2_PF[i], GIDS[i], false);
  gcx.fillStyle = '#8a8378'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
  gcx.fillText('the burnout dataset: pass only at 4–7 h — one straight boundary cannot cut this', GP+6, GH-GP-GPH+14);
  if (m.preset) gcx.fillText('(the 2-2-1 preset was hand-built for the TWO-feature data — switch Model to "Trained" here)', GP+6, GH-GP-GPH+28);
  gcx.textAlign = 'center';
}

/* ------- Compare & Bet room ------- */
function gRunCompare(){
  const st = gStand(GS.d1.map(r=>r.x));
  const lg = C.logisticFit(GS.d1.map(r=>[st.z(r.x)]), GD2_PF, 0.5, 400, null, null, 0.05);
  const s2 = gStand([0,0]);
  const Z2 = GS.d1.map(r=>[st.z(r.x), 0]);
  const mm = C.mlpFit(Z2, GD2_PF, 4, 0.8, 1500, 7, null, null);
  let lgc = 0, mmc = 0;
  for (const o of GCO2){
    if ((lg.prob([st.z(o.x1)]) >= 0.5 ? 1 : 0) === o.pf) lgc++;
    if ((mm.prob([st.z(o.x1), 0]) >= 0.5 ? 1 : 0) === o.pf) mmc++;
  }
  return { lg: x => lg.prob([st.z(x)]), mm: (x) => mm.prob([st.z(x), 0]), lgc, mmc, n: GCO2.length };
}
function gDrawCompare(){
  gcx.clearRect(0, 0, GW, GH);
  gYlo = -0.14; gYhi = 1.14;
  gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2;
  gcx.beginPath(); gcx.moveTo(GP, GH-GP); gcx.lineTo(GP+GPW, GH-GP);
  gcx.moveTo(GP, GH-GP); gcx.lineTo(GP, GH-GP-GPH); gcx.stroke();
  gcx.fillStyle = '#8a8378'; gcx.font = '12px sans-serif'; gcx.textAlign = 'center';
  gcx.fillText('Hours_studied →', GP+GPW/2, GH-6);
  gcx.save(); gcx.translate(12, GH-GP-GPH/2); gcx.rotate(-Math.PI/2); gcx.fillText('P(Pass)', 0, 0); gcx.restore();
  gcx.font = '10px ui-monospace,monospace';
  for (let t = 0; t <= 10; t++) gcx.fillText(t, gx(t), GH-GP+14);
  for (let i = 0; i < 10; i++) gPoint(gx(i+1), gy(GD2_PF[i]), GD2_PF[i], GIDS[i], false);
  if (GS.cmp){
    const r = GS.cmp;
    gcx.save(); gcx.globalAlpha = 0.35;
    for (const o of GCO2) gPoint(gx(o.x1), gy(o.pf), o.pf, null, false);
    gcx.restore();
    gcx.strokeStyle = '#2b2b2b'; gcx.lineWidth = 2.2; gcx.beginPath();
    for (let i = 0; i <= 140; i++){ const x = 10*i/140; if (i===0) gcx.moveTo(gx(x), gy(r.lg(x))); else gcx.lineTo(gx(x), gy(r.lg(x))); }
    gcx.stroke();
    gcx.strokeStyle = '#1a5fb4'; gcx.setLineDash([6,4]); gcx.lineWidth = 2.2; gcx.beginPath();
    for (let i = 0; i <= 140; i++){ const x = 10*i/140; if (i===0) gcx.moveTo(gx(x), gy(r.mm(x))); else gcx.lineTo(gx(x), gy(r.mm(x))); }
    gcx.stroke(); gcx.setLineDash([]);
    gcx.fillStyle = '#8a8378'; gcx.font = '11px sans-serif'; gcx.textAlign = 'left';
    gcx.fillText('solid = logistic · dashed blue = MLP (h=4) · faded = next semester’s cohort', GP+6, GH-GP-GPH+14);
    gcx.textAlign = 'center';
  } else {
    gcx.fillStyle = '#8a8378'; gcx.font = '12px sans-serif';
    gcx.fillText('place your bet, then the cohort arrives', GP+GPW/2, GH-GP-GPH/2);
  }
}

/* ---------------- loss curves (train solid vs cohort dashed) ---------------- */
function gDrawLoss(losses, vlosses){
  glcx.clearRect(0, 0, GLW, GLH);
  if (!losses || !losses.length){ glcx.fillStyle='#8a8378'; glcx.font='12px sans-serif';
    glcx.fillText('closed form — no iterations to plot; switch Solver to Gradient descent', 12, 24); return; }
  let mx = 0; for (const v of losses) mx = Math.max(mx, v);
  if (vlosses) for (const v of vlosses) mx = Math.max(mx, v);
  mx = Math.max(mx, 1e-6);
  const X = i => 34 + i/(losses.length-1)*(GLW-46), Y = v => 10 + (1 - v/mx)*(GLH-32);
  glcx.strokeStyle = '#c9c2b4'; glcx.lineWidth = 1; glcx.strokeRect(34, 10, GLW-46, GLH-32);
  glcx.strokeStyle = '#2b2b2b'; glcx.lineWidth = 2; glcx.beginPath();
  losses.forEach((v,i) => i === 0 ? glcx.moveTo(X(i), Y(v)) : glcx.lineTo(X(i), Y(v))); glcx.stroke();
  if (vlosses && vlosses.length){
    glcx.strokeStyle = '#c2185b'; glcx.setLineDash([5,4]); glcx.beginPath();
    vlosses.forEach((v,i) => i === 0 ? glcx.moveTo(X(i), Y(v)) : glcx.lineTo(X(i), Y(v))); glcx.stroke(); glcx.setLineDash([]);
  }
  glcx.fillStyle = '#8a8378'; glcx.font = '11px sans-serif';
  glcx.fillText('epochs →', GLW-70, GLH-4); glcx.fillText('train', 40, 22);
  glcx.fillStyle = '#c2185b'; glcx.fillText('cohort', 76, 22);
}

/* ---------------- table + CSV ---------------- */
function gRenderTable(){
  const t = $('gTbl'); const room = GS.room;
  let h = '';
  if (room === 'mlp' && GS.mlpDs === 'd3'){
    $('gTblNote').textContent = '— Dataset 3: two features';
    h = '<tr><th class="l">student</th><th>Hours_studied</th><th>Hours_slept</th><th>Pass/Fail</th></tr>';
    for (const r of GD3) h += `<tr><td class="l">${r.id}</td><td>${r.x1}</td><td>${r.x2}</td><td class="pf${r.pf}">${r.pf ? 'Pass' : 'Fail'}</td></tr>`;
  } else if (room === 'mlp' || room === 'compare'){
    $('gTblNote').textContent = '— Dataset 2: the burnout cohort';
    h = '<tr><th class="l">student</th><th>Hours_studied</th><th>Pass/Fail</th></tr>';
    for (let i = 0; i < 10; i++) h += `<tr><td class="l">${GIDS[i]}</td><td>${i+1}</td><td class="pf${GD2_PF[i]}">${GD2_PF[i] ? 'Pass' : 'Fail'}</td></tr>`;
  } else {
    $('gTblNote').textContent = '— Dataset 1: the ten students (means: 5.5 · 72.4 · 0.7)';
    const tgt = room === 'linear' ? 'Score' : 'Pass/Fail';
    h = `<tr><th class="l">student</th><th>Hours_studied</th><th>${room==='linear' ? '<b>Scores</b>' : 'Scores'}</th><th>${room==='logistic' ? '<b>Pass/Fail</b>' : 'Pass/Fail'}</th></tr>`;
    for (const r of GS.d1) h += `<tr><td class="l">${r.id}${GS.loo && r.id==='F' && room==='linear' ? ' *' : ''}</td><td>${r.x}</td><td>${Math.round(r.score)}</td><td class="pf${r.pf}">${r.pf ? 'Pass' : 'Fail'}</td></tr>`;
  }
  t.innerHTML = h;
  $('gEditNote').textContent = GS.edited ? 'table edited — numeric checkpoints apply to the pristine worked-example data (Reset to restore)' : '';
}
$('gBtnCsv').onclick = () => {
  let csv = '', name = 'student-grades';
  if (GS.room === 'mlp' && GS.mlpDs === 'd3'){
    csv = 'student, Hours_studied, Hours_slept, Pass/Fail\n' + GD3.map(r => `${r.id}, ${r.x1}, ${r.x2}, ${r.pf ? 'Pass' : 'Fail'}`).join('\n');
    name = 'students-two-features';
  } else if (GS.room === 'mlp' || GS.room === 'compare'){
    csv = 'student, Hours_studied, Pass/Fail\n' + GIDS.map((id,i) => `${id}, ${i+1}, ${GD2_PF[i] ? 'Pass' : 'Fail'}`).join('\n');
    name = 'students-burnout';
  } else if (GS.room === 'logistic'){
    csv = 'student, Hours_studied, Pass/Fail\n' + GS.d1.map(r => `${r.id}, ${r.x}, ${r.pf ? 'Pass' : 'Fail'}`).join('\n');
    name = 'students-passfail';
  } else {
    csv = 'student, Hours_studied, Score\n' + GS.d1.map(r => `${r.id}, ${r.x}, ${Math.round(r.score)}`).join('\n');
    name = 'students-scores';
  }
  const a = document.createElement('a');
  a.download = name + '.csv';
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.click();
};
$('gBtnReset').onclick = () => { GS.d1 = gPristineD1(); GS.edited = false; gRefresh(); };

/* ---------------- metrics + K prediction + badge ---------------- */
function gRefreshMetrics(){
  const room = GS.room;
  $('gM4row').classList.toggle('hidden', room !== 'linear');
  $('gMetNote').textContent = room === 'linear' ? '— MSE uses divisor n (the lecture convention) (divisor n)'
    : room === 'compare' ? '— settled on next semester’s cohort' : '— counts, not percentages';
  if (room === 'linear'){
    const m = gCurLine();
    const rows = GS.loo ? GS.d1.filter(r=>r.id!=='F') : GS.d1;
    const mse = GS.cand === 3 && !GS.edited && !GS.hand && !GS.loo ? GQ.mse930 : gMSE(rows, m.pred);
    $('gM1l').textContent = `train MSE (L2) (n = ${rows.length})`; $('gM1').textContent = (+mse).toFixed(2);
    $('gM4l').textContent = 'train MAE (L1)'; $('gM4').textContent = gMAE(rows, m.pred).toFixed(2);
    $('gM2l').textContent = 'train RMSE'; $('gM2').textContent = Math.sqrt(+mse).toFixed(2);
    let cs = 0; for (const o of GCO1) cs += (m.pred(o.x) - o.score)**2;
    $('gM3l').textContent = 'cohort MSE (held-out)'; $('gM3').textContent = (cs/GCO1.length).toFixed(2);
  } else if (room === 'logistic'){
    const m = gLogModel();
    let tr = 0; for (const r of GS.d1) if ((m.prob(r.x) >= 0.5 ? 1 : 0) === r.pf) tr++;
    let co = 0; for (const o of GCO1P) if ((m.prob(o.x1) >= 0.5 ? 1 : 0) === o.pf) co++;
    $('gM1l').textContent = 'train accuracy'; $('gM1').textContent = `${tr}/${GS.d1.length}`;
    $('gM2l').textContent = 'decision boundary'; $('gM2').textContent = m.boundary.toFixed(2) + ' h';
    $('gM3l').textContent = 'cohort accuracy'; $('gM3').textContent = `${co}/${GCO1P.length}`;
  } else if (room === 'mlp'){
    const m = gMlpModel();
    const d2 = GS.mlpDs === 'd2';
    const rows = d2 ? GIDS.map((id,i)=>({x1:i+1, x2:0, pf:GD2_PF[i]})) : GD3;
    let tr = 0; for (const r of rows) if ((m.prob(r.x1, d2 ? 0 : r.x2) >= 0.5 ? 1 : 0) === r.pf) tr++;
    const co = d2 ? GCO2 : GCO3;
    let cc = 0; for (const o of co) if ((m.prob(o.x1, d2 ? 0 : o.x2) >= 0.5 ? 1 : 0) === o.pf) cc++;
    $('gM1l').textContent = 'train accuracy'; $('gM1').textContent = `${tr}/10`;
    $('gM2l').textContent = 'model'; $('gM2').textContent = m.preset ? '2-2-1 preset' : `trained (h=${GS.hidden})`;
    $('gM3l').textContent = 'cohort accuracy'; $('gM3').textContent = `${cc}/${co.length}`;
  } else {
    $('gM1l').textContent = 'logistic — cohort'; $('gM1').textContent = GS.cmp ? `${GS.cmp.lgc}/${GS.cmp.n}` : '—';
    $('gM2l').textContent = 'MLP (h=4) — cohort'; $('gM2').textContent = GS.cmp ? `${GS.cmp.mmc}/${GS.cmp.n}` : '—';
    $('gM3l').textContent = 'your bet'; $('gM3').textContent = GS.bet || '—';
  }
}
function gRefreshK(){
  const badge = $('gBadge'); badge.style.display = 'none';
  if (GS.room === 'linear'){
    const m = gCurLine();
    const v = m.pred(GS.kx);
    $('gKOut').textContent = `predicted Score at ${GS.kx} h: ${v.toFixed(0)}`;
    if (v < 0 || v > 100){
      badge.style.display = 'block';
      badge.innerHTML = `&#9888; &#375; = ${v.toFixed(0)} — outputs are unbounded… a score should be between 0 and 100. That is exactly why the <b>Logistic</b> room exists &#8594;`;
    }
  } else if (GS.room === 'logistic'){
    const m = gLogModel();
    const p = m.prob(GS.kx);
    $('gKOut').textContent = `P(Pass) at ${GS.kx} h: ${p.toFixed(2)} → ${p >= GS.thr ? 'Pass' : 'Fail'} side of the boundary`;
  } else if (GS.room === 'mlp'){
    const m = gMlpModel();
    const d2 = GS.mlpDs === 'd2';
    const p = m.prob(GS.kx, d2 ? 0 : GS.kx2);
    $('gKOut').textContent = d2
      ? `P(Pass) at ${GS.kx} h studied: ${p.toFixed(2)} → ${p >= 0.5 ? 'Pass' : 'Fail'}`
      : `P(Pass) at (${GS.kx} h studied, ${GS.kx2} h slept): ${p.toFixed(4)} → ${p >= 0.5 ? 'Pass' : 'Fail'}`;
  } else $('gKOut').textContent = '—';
}

/* ---------------- candidate line chips ---------------- */
(function(){
  const box = $('gCandChips');
  GCAND.forEach((c, i) => {
    const b = document.createElement('button');
    b.dataset.v = i;
    b.className = 'gcand';
    b.textContent = `y = ${c.a}x ${c.b >= 0 ? '+ ' + c.b : '− ' + Math.abs(c.b)}`;
    box.appendChild(b);
  });
  const fit = document.createElement('button');
  fit.dataset.v = 'fit'; fit.className = 'gcand on';
  fit.textContent = 'least squares';
  box.appendChild(fit);
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    box.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
    GS.cand = b.dataset.v === 'fit' ? null : +b.dataset.v;
    if (GS.hand){ GS.hand = false; $('gChkHand').checked = false; $('gHandCtl').classList.add('hidden'); }
    gRefresh(); gSyncHash();
  });
})();

/* ---------------- per-room copy ---------------- */
function gHintFor(){
  if (GS.room === 'linear'){
    if (GS.cand === 0) return 'Errors have sign — "the most intuitive solution should be absolute error." Hover Students A and G to see the worked errors under this line. Then the question is: Which one is better, Absolute Error or Squared Error? Drag Student G down and watch: MSE (L2) reacts quadratically, MAE (L1) only linearly.';
    if (GS.cand !== null) return 'A candidate line and its MSE — mean of squared residuals over the ten students (divisor n = 10). Which candidate comes closest to the least-squares answer? Compare MSE (L2) with MAE (L1) in the Metrics box: the squared loss punishes big misses much harder.';
    if (GS.loo) return 'Leave-one-out: the model never saw Student F. Its guess vs F’s actual 75 is exam-style practice — press the button again to bring F back.';
    if (GS.deg >= 7) return 'High degree: train MSE collapses toward 0 while the cohort error explodes — the curve memorized ten students, it did not learn the class.';
    return 'The least-squares fit ≈ 5x + 45 (exact 4.9939x + 44.9333) — closed form and gradient descent agree. Student G (7 h → 90) sits +10 above the trend: irreducible noise, why MSE ≠ 0 even at the optimum.';
  }
  if (GS.room === 'logistic'){
    if (GS.logPreset === 'demo') return 'Demo preset (NOT a worked example): z = x − 5 puts the boundary exactly at 5 h, so Student K at x = 5 sits at σ = 0.5 — but note it misclassifies Student D, unlike the trained fit.';
    return 'Fail ≤ 3 h, Pass ≥ 4 h — perfectly separated. Unregularized training would grow infinitely confident (‖β‖ → ∞, the curve sharpens to a step); this fit is L2-regularized, so it stays smooth with the boundary ≈ 3.5 h. Why is infinite confidence a problem?';
  }
  if (GS.room === 'mlp'){
    if (GS.mlpDs === 'd2') return 'WHY MLPs exist: pass only at 4–7 h. One neuron = one straight boundary; this needs two. Set hidden = 0 (it IS logistic) and watch it fail; hidden ≥ 2 solves it. But wait — hours studied is hiding something. What’s missing?';
    if (GS.mlpModel === 'preset') return 'The anatomy playground: hand-assigned detectors (study > 3 h, sleep > 6 h) voted into a decision. Honest note: the true boundary is the LINE x₁ + x₂ = 9 — probe (0, 10) or Student H (8, 3): a flexible trade-off, not a rigid AND gate. NOTE: this dataset is separable by Hours_studied alone — Dataset 2 is why hidden layers exist.';
    return 'Trained on Dataset 3. This data is separable by Hours_studied alone (every x₁ ≥ 4 passes), so hidden = 0 also works here — the hidden-layer lesson lives in the Burnout dataset.';
  }
  return 'Burnout upset: logistic vs MLP on the burnout class, settled on next semester’s cohort. Place your bet.';
}

/* ---------------- room config ---------------- */
function gEnterRoom(room){
  GS.room = room; GS.cand = null; GS.bet = null; GS.cmp = null; GS.loo = false; $('gLooOut').textContent = '';
  document.querySelectorAll('#gRoomChips button').forEach(b => b.classList.toggle('on', b.dataset.v === room));
  const lin = room === 'linear', log = room === 'logistic', mlp = room === 'mlp', cmp = room === 'compare';
  $('gRowCand').classList.toggle('hidden', !lin);
  $('gRowDeg').classList.toggle('hidden', !lin);
  $('gRowHand').classList.toggle('hidden', !lin);
  $('gRowLog').classList.toggle('hidden', !log);
  $('gRowMlp').classList.toggle('hidden', !mlp);
  $('gRowBet').classList.toggle('hidden', !cmp);
  $('gRowWatch').classList.toggle('hidden', !(log || (lin && GS.solver === 'gd') || (mlp && GS.mlpModel === 'trained')));
  $('gLossBox').classList.toggle('hidden', !(log || (lin && GS.solver === 'gd') || (mlp && GS.mlpModel === 'trained')));
  $('gStepBox').classList.toggle('hidden', !(mlp && GS.mlpModel === 'preset' && GS.mlpDs === 'd3'));
  $('gKx2Wrap').classList.toggle('hidden', !(mlp && GS.mlpDs === 'd3'));
  $('gLooRow').classList.toggle('hidden', !lin);
  $('gLandBox').classList.toggle('hidden', !lin);           // 1b-2/3/4
  $('gUBox').classList.toggle('hidden', !lin);              // 1b-5
  $('gRowThr').classList.toggle('hidden', !log);            // 1b-6
  $('gThrNote').classList.toggle('hidden', !log);
  $('gCeBox').classList.toggle('hidden', !log);
  gGhost.b = null; gGhost.segs = null; gGhost.curves = null; // 1b-7 trail cleared on room entry
  $('gEpochWrap').style.display = 'none';
  $('gBtnBridge').classList.toggle('hidden', !(mlp && GS.mlpDs === 'd2'));
  $('gCandChips').parentElement.classList.toggle('hidden', !lin);
  $('gFnSub').textContent = lin ? ' — f: Hours_studied → Score'
    : log ? ' — f: Hours_studied → P(Pass)'
    : mlp ? (GS.mlpDs === 'd3' ? ' — f: (Hours_studied, Hours_slept) → P(Pass)' : ' — f: Hours_studied → P(Pass)')
    : ' — two models, one bet, settled by next semester';
  $('gCvTitle').textContent = lin ? 'Scores vs Hours_studied'
    : log ? 'P(Pass) vs Hours_studied'
    : mlp ? (GS.mlpDs === 'd3' ? 'Study space' : 'The burnout class') : 'Burnout upset';
  $('gCvNote').textContent = lin ? '— the ten students; y-axis 50–100 to match the worked examples (extends only when a wild line demands it)' : '';
  gRefresh(); gSyncHash();
}
function gRefresh(){
  gRenderTable();
  if (GS.room === 'linear') gDrawLinear();
  else if (GS.room === 'logistic') gDrawLogistic();
  else if (GS.room === 'mlp') gDrawMlp();
  else gDrawCompare();
  gRefreshMetrics(); gRefreshK();
  $('gHint').textContent = gHintFor();
  if (GS.room === 'mlp' && GS.mlpModel === 'preset' && GS.mlpDs === 'd3') $('gStepOut').textContent = gStepLines(GS.stu);
  const showLoss = GS.room === 'logistic' || (GS.room === 'linear' && GS.solver === 'gd' && !GS.hand && GS.cand === null) || (GS.room === 'mlp' && GS.mlpModel === 'trained');
  $('gLossBox').classList.toggle('hidden', !showLoss);
  if (showLoss){
    let r = null;
    if (GS.room === 'logistic' && GS.logPreset === 'trained') r = gLogFit(GS.d1);
    else if (GS.room === 'linear') r = gPolyFit(GS.loo ? GS.d1.filter(q=>q.id!=='F') : GS.d1, GS.deg, true);
    else if (GS.room === 'mlp'){ if (!gMlpCache) gMlpCache = gMlpFit(); r = gMlpCache; }
    if (r && r.losses && r.losses.length) gDrawLoss(r.losses, r.vlosses); else gDrawLoss(null);
  }
  if (GS.room === 'linear'){ gLandRefresh(); gDrawU(); }     // 1b-2/3/4 + 1b-5
  if (GS.room === 'logistic'){ gThrRefresh(); gDrawCE(); }   // 1b-6
}

/* ---------------- interactions ---------------- */
document.querySelectorAll('#gRoomChips button').forEach(b => b.onclick = () => gEnterRoom(b.dataset.v));
$('gDeg').oninput = () => { GS.deg = +$('gDeg').value; $('gDegVal').textContent = GS.deg; GS.cand = null;
  document.querySelectorAll('#gCandChips button').forEach(x => x.classList.toggle('on', x.dataset.v === 'fit'));
  gRefresh(); gSyncHash(); };
document.querySelectorAll('#gSolvChips button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#gSolvChips button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  GS.solver = b.dataset.v; gRefresh(); gSyncHash(); });
$('gChkHand').onchange = () => { GS.hand = $('gChkHand').checked;
  $('gHandCtl').classList.toggle('hidden', !GS.hand);
  if (GS.hand){ GS.cand = null; document.querySelectorAll('#gCandChips button').forEach(x => x.classList.remove('on')); }
  gRefresh(); };
$('gHb').oninput = () => { GS.hb = +$('gHb').value; $('gHandLine').textContent = `y = ${GS.hw.toFixed(2)}x + ${GS.hb.toFixed(1)}`; gRefresh(); };
$('gHw').oninput = () => { GS.hw = +$('gHw').value; $('gHandLine').textContent = `y = ${GS.hw.toFixed(2)}x + ${GS.hb.toFixed(1)}`; gRefresh(); };
document.querySelectorAll('#gLogChips button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#gLogChips button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  GS.logPreset = b.dataset.v;
  $('gLogNote').textContent = b.dataset.v === 'demo' ? 'demo preset (not a worked example)' : '';
  gRefresh(); });
document.querySelectorAll('#gDsChips button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#gDsChips button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  GS.mlpDs = b.dataset.v; gMlpCache = null;
  gEnterRoom('mlp'); });
document.querySelectorAll('#gNetChips button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#gNetChips button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  GS.mlpModel = b.dataset.v; gMlpCache = null;
  $('gHidWrap').classList.toggle('hidden', b.dataset.v !== 'trained');
  gEnterRoom('mlp'); });
$('gHid').oninput = () => { GS.hidden = +$('gHid').value; $('gHidVal').textContent = GS.hidden; gMlpCache = null; gRefresh(); };
$('gBtnReseed').onclick = () => { GS.mseed = (GS.mseed % 97) + 1; gMlpCache = null; gRefresh();
  toast('Re-trained from a fresh random start (seeded — the same restart sequence for everyone).'); };
$('gBtnBridge').onclick = () => {
  document.querySelectorAll('#gDsChips button').forEach(x => x.classList.toggle('on', x.dataset.v === 'd3'));
  GS.mlpDs = 'd3'; gMlpCache = null; gEnterRoom('mlp');
  toast('The burnout paradox resolved: with the Hours_slept axis, the 8–10 h students were the ones not sleeping. A missing feature, not a curse of studying.');
};
$('gKx').oninput = () => { GS.kx = Math.max(0, Math.min(10, +$('gKx').value || 0)); gRefresh(); };
$('gKx2').oninput = () => { GS.kx2 = Math.max(0, Math.min(10, +$('gKx2').value || 0)); gRefresh(); };
$('gChkCo').onchange = () => { GS.showCo = $('gChkCo').checked; gRefresh(); };
$('gBtnLoo').onclick = () => {
  GS.loo = !GS.loo;
  if (GS.loo){
    const rows = GS.d1.filter(r => r.id !== 'F');
    const f = gPolyFit(rows, GS.deg, GS.solver === 'gd');
    const p = f.pred(6);
    $('gLooOut').textContent = `model (never saw F): ${p.toFixed(1)} · actual: 75 · miss: ${(p-75).toFixed(1)}`;
    $('gBtnLoo').textContent = 'Bring Student F back';
  } else { $('gLooOut').textContent = ''; $('gBtnLoo').textContent = 'Hide Student F — can the model predict F?'; }
  gRefresh();
};
document.querySelectorAll('.gBet').forEach(b => b.onclick = () => {
  GS.bet = b.dataset.v;
  GS.cmp = gRunCompare();
  const win = GS.cmp.mmc > GS.cmp.lgc ? 'mlp' : 'logistic';
  gRefresh();
  toast(`Next semester arrived: logistic ${GS.cmp.lgc}/${GS.cmp.n} · MLP ${GS.cmp.mmc}/${GS.cmp.n}. Your bet on ${GS.bet}: ${GS.bet === win ? '✓ correct' : '✗ — ' + win + ' won'}.`);
});
document.querySelectorAll('#gStuChips button, #gStuChips').forEach(()=>{});
(function(){ const box = $('gStuChips');
  GIDS.forEach(id => { const b = document.createElement('button'); b.dataset.v = id; b.textContent = id;
    if (id === 'F') b.classList.add('on');
    b.onclick = () => { box.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      GS.stu = id; $('gStepOut').textContent = gStepLines(id); };
    box.appendChild(b); });
})();
$('gBtnWatch').onclick = async () => {
  const room = GS.room;
  if (room === 'logistic' && GS.logPreset !== 'trained'){ toast('The demo preset is frozen — switch to Trained fit to watch training.'); return; }
  // 1b-7: fresh ghost-trail + visible epoch counter for this run
  gGhost.b = null; gGhost.segs = room === 'mlp' && GS.mlpDs === 'd3' ? [] : null;
  gGhost.curves = (room === 'logistic' || (room === 'mlp' && GS.mlpDs === 'd2')) ? [] : null;
  $('gEpochWrap').style.display = 'inline';
  const epMax = room === 'mlp' ? 1500 : 400;
  for (let s = 1; s <= 16; s++){
    const ep = Math.max(2, Math.round((room === 'mlp' ? 1500 : 400) * s / 16));
    $('gEpochN').textContent = `${ep}/${epMax}`;
    if (room === 'logistic'){
      const st = gStand(GS.d1.map(r=>r.x));
      const r = C.logisticFit(GS.d1.map(q=>[st.z(q.x)]), GS.d1.map(q=>q.pf), 0.5, ep, null, null, 0.1);
      const b1 = r.w[1]/st.s, b0 = r.w[0] - r.w[1]*st.m/st.s;
      const mm = { prob: x => r.prob([st.z(x)]), boundary: -b0/b1, demo: false };
      gcx.clearRect(0, 0, GW, GH);
      const keep = GS.logPreset; GS.logPreset = 'trained';
      GS._tmpLog = mm; gDrawLogisticTmp(mm); GS.logPreset = keep;
      if (s % 2 === 0 && s < 16){ const cur = []; for (let i = 0; i <= 140; i++) cur.push(mm.prob(10*i/140)); gGhost.curves.push(cur); }
      if (r.losses && r.losses.length) gDrawLoss(r.losses, r.vlosses);
    } else if (room === 'linear'){
      const rows = GS.loo ? GS.d1.filter(q=>q.id!=='F') : GS.d1;
      const st = gStand(rows.map(r=>r.x));
      const F = rows.map(r=>{ const z=st.z(r.x); const arr=[]; let p=1; for(let k=1;k<=GS.deg;k++){p*=z;arr.push(p);} return arr; });
      const kk = GS.deg, n = F.length, mu = new Array(kk).fill(0), sd = new Array(kk).fill(0);
      for (let j=0;j<kk;j++){ for(let i=0;i<n;i++) mu[j]+=F[i][j]; mu[j]/=n;
        for(let i=0;i<n;i++) sd[j]+=(F[i][j]-mu[j])**2; sd[j]=Math.sqrt(sd[j]/n)||1;
        for(let i=0;i<n;i++) F[i][j]=(F[i][j]-mu[j])/sd[j]; }
      const r = C.linearGD(F, rows.map(q=>q.score), 0.5, ep, null, null);
      GS._tmpLin = x => { const z=st.z(x); let p=1, sum=r.w[0]; for(let k=1;k<=kk;k++){ p*=z; sum+=r.w[k]*(p-mu[k-1])/sd[k-1]; } return sum; };
      gDrawLinearTmp(GS._tmpLin);
      if (r.losses && r.losses.length) gDrawLoss(r.losses, r.vlosses);
    } else if (room === 'mlp' && GS.mlpModel === 'trained'){
      const save = gMlpCache; gMlpCache = null;
      const part = gMlpFitEpochs(ep);
      gMlpCache = part;
      gDrawMlp();
      if (s % 2 === 0 && s < 16){
        if (GS.mlpDs === 'd3' && gGhost.segs) gGhost.segs.push(gMlpSegs(part));
        else if (gGhost.curves){ const cur = []; for (let i = 0; i <= 140; i++) cur.push(part.prob(10*i/140, 0)); gGhost.curves.push(cur); }
      }
      if (part.losses && part.losses.length) gDrawLoss(part.losses, part.vlosses);
      gMlpCache = save;
    } else { toast('Watching applies to trained models.'); return; }
    await new Promise(res => setTimeout(res, 90));
  }
  gMlpCache = null; gRefresh();
};
/* 1b-7: p = 0.5 boundary of an MLP model as pixel segments (for the ghost trail) */
function gMlpSegs(m){
  const segs = [], B = 50, gy2 = v => (GH - GP) - v/10*GPH, val = [];
  for (let iy = 0; iy <= B; iy++){ val.push([]); for (let ix = 0; ix <= B; ix++) val[iy].push(m.prob(10*ix/B, 10*(1-iy/B)) - 0.5); }
  for (let iy = 0; iy < B; iy++) for (let ix = 0; ix < B; ix++){
    const a = val[iy][ix], b = val[iy][ix+1], c = val[iy+1][ix];
    const X0 = GP + ix/B*GPW, Y0 = (GH-GP-GPH) + iy/B*GPH;
    if (a*b < 0){ const t = a/(a-b); segs.push([X0+t*GPW/B, Y0, X0+t*GPW/B, Y0+2.4]); }
    if (a*c < 0){ const t = a/(a-c); segs.push([X0, Y0+t*GPH/B, X0+2.4, Y0+t*GPH/B]); }
  }
  return segs;
}
function gMlpFitEpochs(ep){
  const d2 = GS.mlpDs === 'd2';
  const rows = d2 ? GS.d1.map((r,i)=>({x1:r.x, x2:0, pf:GD2_PF[i]})) : GD3;
  const s1 = gStand(rows.map(r=>r.x1)), s2 = gStand(rows.map(r=>r.x2));
  const Z = rows.map(r=>[s1.z(r.x1), s2.z(r.x2)]);
  const r = C.mlpFit(Z, rows.map(q=>q.pf), GS.hidden, 0.8, ep, GS.mseed, null, null);
  return { prob: (x1,x2) => r.prob([s1.z(x1), s2.z(d2?0:x2)]), losses: r.losses, vlosses: [], d2 };
}
function gDrawLinearTmp(pred){ const keepCand = GS.cand, keepHand = GS.hand;
  GS.cand = null; GS.hand = false; GS._override = pred; gDrawLinear(); GS._override = null;
  GS.cand = keepCand; GS.hand = keepHand; }
function gDrawLogisticTmp(m){ const keep = gLogModel; gDrawLogistic._tmp = m; gDrawLogistic(); gDrawLogistic._tmp = null; }

/* ---------------- canvas editing (linear drag y · logistic label flip) ---------------- */
let gDrag = null;
gcv.addEventListener('mousedown', e => {
  if (GS.room !== 'linear') return;
  const r = gcv.getBoundingClientRect();
  const mx = (e.clientX - r.left)*(GW/r.width), my = (e.clientY - r.top)*(GH/r.height);
  for (const row of GS.d1){
    if ((gx(row.x)-mx)**2 + (gy(row.score)-my)**2 < 120){ gDrag = row; e.preventDefault(); return; }
  }
});
window.addEventListener('mousemove', e => {
  if (!gDrag) return;
  const r = gcv.getBoundingClientRect();
  const my = (e.clientY - r.top)*(GH/r.height);
  const v = gYlo + (1 - (my - (GH-GP-GPH))/GPH)*(gYhi - gYlo);
  gDrag.score = Math.max(0, Math.min(100, Math.round(v)));
  GS.edited = true; gRefresh();
});
window.addEventListener('mouseup', () => gDrag = null);
gcv.addEventListener('click', e => {
  if (GS.room !== 'logistic') return;
  const r = gcv.getBoundingClientRect();
  const mx = (e.clientX - r.left)*(GW/r.width), my = (e.clientY - r.top)*(GH/r.height);
  for (const row of GS.d1){
    if ((gx(row.x)-mx)**2 + (gy(row.pf)-my)**2 < 140){
      row.pf = 1 - row.pf; GS.edited = true; gRefresh();
      toast(`Student ${row.id} flipped to ${row.pf ? 'Pass' : 'Fail'} — is the class still perfectly separable?`);
      return;
    }
  }
});
gcv.addEventListener('mousemove', e => {
  const r = gcv.getBoundingClientRect();
  const mx = (e.clientX - r.left)*(GW/r.width), my = (e.clientY - r.top)*(GH/r.height);
  let best = null, bd = 200;
  const pts = GS.room === 'mlp' && GS.mlpDs === 'd3'
    ? GD3.map(q => ({ id: q.id, X: gx(q.x1), Y: (GH-GP) - q.x2/10*GPH, txt: `${q.id}: ${q.x1} h studied, ${q.x2} h slept → ${q.pf ? 'Pass' : 'Fail'}` }))
    : GS.room === 'linear'
    ? GS.d1.map(q => ({ id: q.id, X: gx(q.x), Y: gy(q.score), txt: `Student ${q.id}: ${q.x} h → ${Math.round(q.score)}` + (q.id === 'G' ? '  · G sits +10 above the trend (vs H’s 83): irreducible noise — why MSE ≠ 0 at the optimum' : '') }))
    : GS.d1.map(q => ({ id: q.id, X: gx(q.x), Y: gy(q.pf), txt: `Student ${q.id}: ${q.x} h → ${q.pf ? 'Pass' : 'Fail'}` }));
  for (const p of pts){ const d = (p.X-mx)**2 + (p.Y-my)**2; if (d < bd){ bd = d; best = p; } }
  // worked-example micro-beat: A/G worked errors under candidate y = 1.88x + 60 (pristine data)
  const beat = GS.room === 'linear' && GS.cand === 0 && !GS.edited && best && (best.id === 'A' || best.id === 'G');
  if (beat){
    const q = GS.d1.find(r => r.id === best.id);
    const pv = GCAND[0].a*q.x + GCAND[0].b, err = q.score - pv;
    best = { ...best, txt: `Pred(${q.id}) = (${q.x}, ${Math.round(pv)}) · signed error ${err >= 0 ? '+' : '−'}${Math.abs(Math.round(err))} — deck: AE = |17| + |−12| = 29 over A and G` };
  }
  const ab = beat ? best.id : null;
  if (ab !== GS.abHover){ GS.abHover = ab; if (GS.room === 'linear') gDrawLinear(); }
  $('gHover').textContent = best ? best.txt : 'hover the plot · drag a point vertically to experiment (linear) · click a point to flip its label (logistic)';
});

/* ============================================================================
   Phase 1b — loss landscape, GD stepper,
   hiker in the fog, degree U-curve, threshold + CE bars, watch upgrades.
   §0 numerics: full precision internally, rounding only at display.
   ============================================================================ */

/* ---- 1b-7: ghost-trail store (cleared on room entry / watch start) ---- */
const gGhost = { b:null, segs:null, curves:null };

/* ---- landscape geometry ---- */
const GLD = { W:340, H:300, PL:34, PR:8, PT:8, PB:22, WMIN:-15.5, WMAX:15.5, BMIN:-25, BMAX:115 };
GLD.pw = GLD.W - GLD.PL - GLD.PR; GLD.ph = GLD.H - GLD.PT - GLD.PB;
GLD.dw = (GLD.WMAX - GLD.WMIN)/GLD.pw; GLD.db = (GLD.BMAX - GLD.BMIN)/GLD.ph;
const glx = w => GLD.PL + (w - GLD.WMIN)/(GLD.WMAX - GLD.WMIN)*GLD.pw;
const gly = b => GLD.PT + (1 - (b - GLD.BMIN)/(GLD.BMAX - GLD.BMIN))*GLD.ph;
const gldcv = $('gLand'), gld = gldcv.getContext('2d');
gldcv.width = GLD.W*DPR; gldcv.height = GLD.H*DPR; gldcv.style.width = GLD.W+'px'; gldcv.style.height = GLD.H+'px';
gld.setTransform(DPR, 0, 0, DPR, 0, 0);
const ggl = $('gGdLoss').getContext('2d');
$('gGdLoss').width = 250*DPR; $('gGdLoss').height = 90*DPR; $('gGdLoss').style.width='250px'; $('gGdLoss').style.height='90px';
ggl.setTransform(DPR, 0, 0, DPR, 0, 0);

function gLandRows(){ return GS.loo ? GS.d1.filter(r => r.id !== 'F') : GS.d1; }
function gJ(w, b, rows){ let s = 0; for (const r of rows){ const e = w*r.x + b - r.score; s += e*e; } return s/rows.length; }
function gGrad(w, b, rows){ let gw = 0, gb = 0;
  for (const r of rows){ const e = w*r.x + b - r.score; gw += e*r.x; gb += e; }
  const n = rows.length; return [2*gw/n, 2*gb/n]; }
function gLsMin(rows){ const n = rows.length;
  let sx=0, sy=0, sxx=0, sxy=0;
  for (const r of rows){ sx+=r.x; sy+=r.score; sxx+=r.x*r.x; sxy+=r.x*r.score; }
  const w = (sxy - sx*sy/n)/(sxx - sx*sx/n), b = sy/n - w*sx/n; return [w, b]; }

/* base contour rendered to an offscreen canvas, cached per data state */
const gLandOffCv = document.createElement('canvas');
gLandOffCv.width = GLD.W*DPR; gLandOffCv.height = GLD.H*DPR;
const gldOff = gLandOffCv.getContext('2d');
gldOff.setTransform(DPR, 0, 0, DPR, 0, 0);
let gLandKey = null;
function gLandBase(){
  const rows = gLandRows();
  const key = rows.map(r => r.score).join(',') + '|' + GS.loo;
  if (key === gLandKey) return;
  gLandKey = key;
  const c = gldOff;
  c.clearRect(0, 0, GLD.W, GLD.H);
  const NX = 76, NY = 64, Jg = [];
  let jmin = Infinity, jmax = 0;
  for (let iy = 0; iy <= NY; iy++){ const row = [];
    for (let ix = 0; ix <= NX; ix++){
      const w = GLD.WMIN + (GLD.WMAX-GLD.WMIN)*ix/NX, b = GLD.BMAX - (GLD.BMAX-GLD.BMIN)*iy/NY;
      const J = gJ(w, b, rows); row.push(J); jmin = Math.min(jmin, J); jmax = Math.max(jmax, J);
    } Jg.push(row); }
  const l0 = Math.log(jmin + 1), l1 = Math.log(jmax + 1);
  for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++){
    const t = (Math.log(Jg[iy][ix] + 1) - l0)/(l1 - l0);
    c.fillStyle = `rgba(44,82,130,${(0.04 + 0.30*t).toFixed(3)})`;
    c.fillRect(GLD.PL + ix/NX*GLD.pw, GLD.PT + iy/NY*GLD.ph, GLD.pw/NX + 0.5, GLD.ph/NY + 0.5);
  }
  // iso-lines (marching squares, log-spaced levels)
  c.strokeStyle = 'rgba(44,82,130,0.4)'; c.lineWidth = 1; c.beginPath();
  for (const lev of [20, 40, 80, 160, 320, 640, 1300, 2600, 5200, 10500, 21000, 42000]){
    for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++){
      const a = Jg[iy][ix]-lev, bb = Jg[iy][ix+1]-lev, cc = Jg[iy+1][ix]-lev, dd = Jg[iy+1][ix+1]-lev;
      const X0 = GLD.PL + ix/NX*GLD.pw, Y0 = GLD.PT + iy/NY*GLD.ph, dx = GLD.pw/NX, dy = GLD.ph/NY;
      const pts = [];
      if (a*bb < 0) pts.push([X0 + dx*a/(a-bb), Y0]);
      if (cc*dd < 0) pts.push([X0 + dx*cc/(cc-dd), Y0+dy]);
      if (a*cc < 0) pts.push([X0, Y0 + dy*a/(a-cc)]);
      if (bb*dd < 0) pts.push([X0+dx, Y0 + dy*bb/(bb-dd)]);
      if (pts.length === 2){ c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); }
    }
  }
  c.stroke();
  // axes
  c.strokeStyle = '#2b2b2b'; c.lineWidth = 1.5;
  c.strokeRect(GLD.PL, GLD.PT, GLD.pw, GLD.ph);
  c.fillStyle = '#8a8378'; c.font = '11px sans-serif'; c.textAlign = 'center';
  c.fillText('w (slope) →', GLD.PL + GLD.pw/2, GLD.H - 4);
  c.save(); c.translate(10, GLD.PT + GLD.ph/2); c.rotate(-Math.PI/2); c.fillText('b (intercept) →', 0, 0); c.restore();
  c.font = '9px ui-monospace,monospace';
  for (const t of [-10, 0, 10]) c.fillText(t, glx(t), GLD.H - GLD.PB + 11);
  c.textAlign = 'right';
  for (const t of [0, 50, 100]) c.fillText(t, GLD.PL - 3, gly(t) + 3);
  c.textAlign = 'center';
}
function gLandDots(withLabels){
  const rows = gLandRows();
  const [mw, mb] = gLsMin(rows);
  // candidate dots (cand 4 lives far outside — edge chevron)
  GCAND.forEach((cd, i) => {
    const inR = cd.a >= GLD.WMIN && cd.a <= GLD.WMAX && cd.b >= GLD.BMIN && cd.b <= GLD.BMAX;
    const J = gMSE(rows, x => cd.a*x + cd.b);
    const lab = (i === 3 && !GS.edited && !GS.loo) ? GQ.mse930.toFixed(2) : J.toFixed(2);
    if (inR){
      const X = glx(cd.a), Y = gly(cd.b);
      gld.beginPath(); gld.arc(X, Y, 4.5, 0, 7);
      if (GS.cand === i){ gld.fillStyle = '#c2185b'; gld.fill(); }
      else { gld.fillStyle = '#fffef9'; gld.fill(); gld.strokeStyle = '#2b2b2b'; gld.lineWidth = 1.6; gld.stroke(); }
      if (withLabels){ gld.fillStyle = GS.cand === i ? '#c2185b' : '#2b2b2b'; gld.font = '9px ui-monospace,monospace';
        gld.textAlign = 'left'; gld.fillText(lab, X + 7, Y + 3); gld.textAlign = 'center'; }
    } else if (withLabels){
      gld.fillStyle = GS.cand === i ? '#c2185b' : '#8a8378'; gld.font = '9px ui-monospace,monospace'; gld.textAlign = 'right';
      gld.fillText(`68x−272 · ${lab} ↘`, GLD.PL + GLD.pw - 4, GLD.PT + GLD.ph - 6);
      gld.textAlign = 'center';
    }
  });
  // least-squares minimum: star
  const X = glx(mw), Y = gly(mb);
  gld.fillStyle = '#2b2b2b'; gld.font = 'bold 13px sans-serif'; gld.fillText('✳', X, Y + 4);
  if (withLabels){ gld.font = '9px ui-monospace,monospace'; gld.textAlign = 'left';
    gld.fillText(`min ${gMSE(rows, x => mw*x + mb).toFixed(2)}`, X + 8, Y - 5); gld.textAlign = 'center'; }
  // hand-fit live dot
  if (GS.hand){
    const HX = glx(Math.max(GLD.WMIN, Math.min(GLD.WMAX, GS.hw))), HY = gly(Math.max(GLD.BMIN, Math.min(GLD.BMAX, GS.hb)));
    gld.beginPath(); gld.arc(HX, HY, 5.2, 0, 7); gld.fillStyle = '#E67E22'; gld.fill();
    gld.strokeStyle = '#2b2b2b'; gld.lineWidth = 1.2; gld.stroke();
    if (withLabels){ gld.fillStyle = '#E67E22'; gld.font = 'bold 9px ui-monospace,monospace'; gld.textAlign = 'left';
      gld.fillText(gMSE(rows, x => GS.hw*x + GS.hb).toFixed(2), HX + 8, HY + 10); gld.textAlign = 'center'; }
  }
}
const gClampX = v => Math.max(GLD.PL + 2, Math.min(GLD.PL + GLD.pw - 2, v));
const gClampY = v => Math.max(GLD.PT + 2, Math.min(GLD.PT + GLD.ph - 2, v));
function gLandPath(path, color){
  if (path.length < 2) return;
  gld.strokeStyle = color; gld.lineWidth = 1.5; gld.globalAlpha = 0.85; gld.beginPath();
  path.forEach((p, i) => { const X = gClampX(glx(p[0])), Y = gClampY(gly(p[1]));
    if (i === 0) gld.moveTo(X, Y); else gld.lineTo(X, Y); });
  gld.stroke(); gld.globalAlpha = 1;
}

/* ---- 1b-3: GD stepper state ---- */
const GG = { w:0, b:0, eta:0.02, iter:0, path:[[0,0]], losses:[], timer:null, dead:false };
function gGdStop(){ if (GG.timer){ clearInterval(GG.timer); GG.timer = null; $('gGdPlay').textContent = 'Play'; } }
function gGdReset(){ gGdStop(); GG.w = 0; GG.b = 0; GG.iter = 0; GG.dead = false;
  GG.path = [[0,0]]; GG.losses = [gJ(0, 0, gLandRows())]; }
function gGdDone(){ const [gw, gb] = gGrad(GG.w, GG.b, gLandRows()); return Math.max(Math.abs(gw), Math.abs(gb)) < 1e-5; }
function gGdStep1(){
  if (GG.dead || gGdDone()) return;
  const rows = gLandRows();
  const [gw, gb] = gGrad(GG.w, GG.b, rows);
  GG.w -= GG.eta*gw; GG.b -= GG.eta*gb; GG.iter++;
  if (!isFinite(GG.w) || !isFinite(GG.b) || Math.abs(GG.w) > 1e8){ GG.dead = true; gGdStop(); return; }
  if (GG.iter <= 300 || GG.iter % 10 === 0) GG.path.push([GG.w, GG.b]);
  if (GG.losses.length < 3000) GG.losses.push(gJ(GG.w, GG.b, rows));
}

/* ---- 1b-4: fog hiker state ---- */
const GF = { w:0, b:0, path:[[0,0]], lifted:false, last:null, arrows:[], warm:false, step:0 };
function gFogReset(){ GF.w = 0; GF.b = 0; GF.path = [[0,0]]; GF.lifted = false; GF.last = null; GF.arrows = []; GF.step = 0; }
function gFogDirs(){
  const rows = gLandRows();
  const [gw, gb] = gGrad(GF.w, GF.b, rows);
  // screen-space gradient (J change per screen px; y-down decreases b)
  const gsx = gw*GLD.dw, gsy = -gb*GLD.db;
  const nrm = Math.hypot(gsx, gsy) || 1;
  const dirs = {
    w:   { ux: -Math.sign(gw) || 0, uy: 0 },
    b:   { ux: 0, uy: Math.sign(gb) || 0 },
    mix: { ux: -gsx/nrm, uy: -gsy/nrm },
  };
  const J0 = gJ(GF.w, GF.b, rows);
  const land = (d, L) => { const dw = d.ux*L*GLD.dw, db = -d.uy*L*GLD.db; return [GF.w + dw, GF.b + db]; };
  // pick the LARGEST equal step length at which the mixed arrow both descends and
  // strictly wins — steepest descent in the step metric always wins in the small-step
  // limit, but a finite step near the tilted valley floor can flip the comparison.
  // prefer the largest length where mixed strictly wins; accept a within-15% near-tie
  // (rendered honestly as "≈ tie") rather than shrinking to sub-pixel steps in the
  // near-axis-aligned regime — otherwise recovery walks crawl along the valley floor.
  let L = 1, fallback = null, tieL = null;
  for (const cand of [46, 34, 25, 18, 13, 9, 6, 4, 2.8, 2, 1.4, 1, 0.7, 0.5]){
    const dm = gJ(...land(dirs.mix, cand), rows) - J0;
    if (dm >= 0) continue;
    if (fallback === null) fallback = cand;
    const dw = gJ(...land(dirs.w, cand), rows) - J0;
    const db = gJ(...land(dirs.b, cand), rows) - J0;
    const best = Math.min(dw, db);
    if (dm <= best){ L = cand; break; }
    if (tieL === null && dm <= best + 0.15*Math.abs(best)) tieL = cand;
  }
  if (L === 1 && gJ(...land(dirs.mix, 1), rows) - J0 >= 0) L = tieL !== null ? tieL : (fallback !== null ? fallback : 1);
  else if (L === 1 && tieL !== null && tieL > 1) L = tieL;
  return { gw, gb, J0, L, dirs, land,
    dJ: { w: gJ(...land(dirs.w, L), rows) - J0, b: gJ(...land(dirs.b, L), rows) - J0, mix: gJ(...land(dirs.mix, L), rows) - J0 } };
}

/* ---- landscape master draw ---- */
function gDrawLand(){
  gLandBase();
  gld.clearRect(0, 0, GLD.W, GLD.H);
  const mode = GS.landMode;
  const fogged = mode === 'fog' && !GF.lifted;
  gld.drawImage(gLandOffCv, 0, 0, GLD.W, GLD.H);
  if (fogged){
    // cover the plot, then re-reveal a circle around the hiker
    gld.save(); gld.beginPath(); gld.rect(GLD.PL + 1, GLD.PT + 1, GLD.pw - 2, GLD.ph - 2); gld.clip();
    gld.fillStyle = 'rgba(247,244,235,0.94)'; gld.fillRect(GLD.PL, GLD.PT, GLD.pw, GLD.ph);
    gld.restore();
    const HX = gClampX(glx(GF.w)), HY = gClampY(gly(GF.b));
    gld.save(); gld.beginPath(); gld.arc(HX, HY, 54, 0, 7); gld.clip();
    gld.drawImage(gLandOffCv, 0, 0, GLD.W, GLD.H); gld.restore();
    gld.strokeStyle = 'rgba(138,131,120,0.6)'; gld.lineWidth = 1; gld.setLineDash([3,4]);
    gld.beginPath(); gld.arc(HX, HY, 54, 0, 7); gld.stroke(); gld.setLineDash([]);
  }
  if (mode === 'explore'){ gLandDots(true); }
  if (mode === 'gd'){
    gLandDots(false);
    gLandPath(GG.path, '#c2185b');
    const X = gClampX(glx(GG.w)), Y = gClampY(gly(GG.b));
    gld.beginPath(); gld.arc(X, Y, 4.6, 0, 7); gld.fillStyle = GG.dead ? '#B22222' : '#c2185b'; gld.fill();
    gld.strokeStyle = '#2b2b2b'; gld.lineWidth = 1.2; gld.stroke();
  }
  if (mode === 'fog'){
    gLandPath(GF.path, '#c2185b');
    if (GF.lifted) gLandDots(false);
    const HX = gClampX(glx(GF.w)), HY = gClampY(gly(GF.b));
    gld.beginPath(); gld.arc(HX, HY, 5, 0, 7); gld.fillStyle = '#2b2b2b'; gld.fill();
    gld.fillStyle = '#2b2b2b'; gld.font = 'bold 9px sans-serif'; gld.fillText('you', HX, HY - 9);
    GF.arrows = [];
    if (!GF.lifted){
      const { L, dirs, dJ } = gFogDirs();
      const DL = Math.max(L, 16);   // display length: direction indicator stays visible even for tiny steps
      const draw = (d, color, wgt, key, label) => {
        const EX = HX + d.ux*DL, EY = HY + d.uy*DL;
        gld.strokeStyle = color; gld.lineWidth = wgt; gld.beginPath();
        gld.moveTo(HX, HY); gld.lineTo(EX, EY);
        const a = Math.atan2(EY - HY, EX - HX);
        gld.lineTo(EX - 7*Math.cos(a - 0.4), EY - 7*Math.sin(a - 0.4));
        gld.moveTo(EX, EY); gld.lineTo(EX - 7*Math.cos(a + 0.4), EY - 7*Math.sin(a + 0.4));
        gld.stroke();
        gld.fillStyle = color; gld.font = 'bold 9px sans-serif';
        gld.fillText(label, EX + d.ux*10, EY + d.uy*10 + 3);
        GF.arrows.push({ key, X: EX, Y: EY, dJ: dJ[key], L, d });
      };
      draw(dirs.w, '#2C5282', 1.6, 'w', 'w only');
      draw(dirs.b, '#2C5282', 1.6, 'b', 'b only');
      draw(dirs.mix, '#c2185b', 2.4, 'mix', 'mix');
    }
  }
}
function gLandReadout(){
  const rows = gLandRows();
  const f1 = v => (Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(1));
  if (GS.landMode === 'gd'){
    const [gw, gb] = gGrad(GG.w, GG.b, rows);
    const lines = [`step ${GG.iter}   η = ${GG.eta}`,
      `(w, b) = (${GG.w.toFixed(4)}, ${GG.b.toFixed(4)})`,
      `J = ${gJ(GG.w, GG.b, rows).toFixed(2)}`,
      `∂J/∂w = ${f1(gw)}   ∂J/∂b = ${f1(gb)}`];
    if (GG.iter === 0 && Math.abs(gb) > 1e-9)
      lines.push(`|∂J/∂w| / |∂J/∂b| = ${(Math.abs(gw/gb)).toFixed(2)} — far steeper in w`);
    if (GG.dead) lines.push('', '💥 diverged — η too large: every step', 'overshoots the valley and lands higher.');
    else if (gGdDone()){
      const [mw, mb] = gLsMin(rows);
      lines.push('∂ ≈ 0 — the bottom is flat: stop.', '',
        `GD     → y = ${GG.w.toFixed(4)}x + ${GG.b.toFixed(4)}`,
        `closed → y = ${mw.toFixed(4)}x + ${mb.toFixed(4)}`,
        'two roads to the same minimum.');
    }
    $('gLandOut').textContent = lines.join('\n');
    $('gLandHint').textContent = 'update: βⱼ ← βⱼ − η·∂J/∂βⱼ. Stop when the gradient is very small — the bottom is flat. Reset to watch a different η regime from the start.';
  } else if (GS.landMode === 'fog'){
    const [gw, gb] = gGrad(GF.w, GF.b, rows);
    const lines = ['you feel the ground under your feet:',
      `∂J/∂w = ${f1(gw)}   ∂J/∂b = ${f1(gb)}`];
    if (Math.abs(gb) > 1e-9) lines.push(`steepness ratio ${(Math.abs(gw/gb)).toFixed(2)} : 1 (w : b)`);
    $('gLandOut').textContent = lines.join('\n');
    $('gLandHint').textContent = GF.lifted
      ? 'the fog lifts: you never saw the bottom — you still found it. The ground went flat (∂ ≈ 0): that IS the stopping rule. Now try Play in the GD stepper — the same walk, automated.'
      : GF.step >= 12
      ? 'still in the fog — a long wander is what happens when steps ignore part of the slope. Follow the mixed arrow to finish: it uses everything the ground tells you.'
      : 'the optimizer never sees the bottom — it only feels the local slope. Three equal-length steps are offered: w only, b only, or a mixture. Click an arrow to take that step.';
  } else {
    const m = gCurLine();
    let w = null, b = null;
    if (GS.hand){ w = GS.hw; b = GS.hb; }
    else if (GS.cand !== null){ w = GCAND[GS.cand].a; b = GCAND[GS.cand].b; }
    else if (GS.deg === 1){ const [mw, mb] = gLsMin(rows); w = mw; b = mb; }
    $('gLandOut').textContent = w === null
      ? 'the landscape shows straight lines only —\nset degree 1 to place the current fit here'
      : `active line: y = ${w.toFixed(4)}x + ${b.toFixed(4)}\nJ(w, b) = ${gMSE(rows, x => w*x + b).toFixed(2)}`;
    $('gLandHint').textContent = GS.hand
      ? 'you are walking the bowl — the sliders move the orange dot; downhill = better line.'
      : 'every candidate line is one dot; click a dot to load that line. Turn on Hand fit to walk the bowl yourself.';
  }
}
function gDrawGdLoss(){
  ggl.clearRect(0, 0, 250, 90);
  const L = GG.losses; if (!L.length) return;
  let mx = -Infinity, mn = Infinity;
  for (const v of L){ if (isFinite(v)){ mx = Math.max(mx, v); mn = Math.min(mn, v); } }
  if (!isFinite(mx)) return;
  const l0 = Math.log(Math.max(mn, 1e-4)), l1 = Math.log(Math.max(mx, 1));
  const X = i => 6 + i/Math.max(1, L.length - 1)*238;
  const Y = v => 6 + (1 - (Math.log(Math.max(v, 1e-4)) - l0)/Math.max(1e-9, l1 - l0))*72;
  ggl.strokeStyle = '#c9c2b4'; ggl.lineWidth = 1; ggl.strokeRect(6, 6, 238, 72);
  ggl.strokeStyle = '#c2185b'; ggl.lineWidth = 1.6; ggl.beginPath();
  L.forEach((v, i) => { if (!isFinite(v)) return; if (i === 0) ggl.moveTo(X(i), Y(v)); else ggl.lineTo(X(i), Y(v)); });
  ggl.stroke();
  ggl.fillStyle = '#8a8378'; ggl.font = '9px ui-monospace,monospace';
  ggl.fillText(`J: ${L[L.length-1] >= 1e6 ? '→ ∞' : L[L.length-1].toFixed(2)}`, 10, 16);
}
function gLandRefresh(){
  const mode = GS.landMode;
  $('gGdRow').classList.toggle('hidden', mode !== 'gd');
  $('gEtaRow').classList.toggle('hidden', mode !== 'gd');
  $('gGdLossWrap').classList.toggle('hidden', mode !== 'gd');
  $('gFogRow').classList.toggle('hidden', mode !== 'fog');
  $('gWarmCard').classList.toggle('hidden', !(mode === 'fog' && !GF.warm));
  if (mode === 'fog' && GF.last){
    const t = GF.last, f = v => (t[v] >= 0 ? '+' : '−') + Math.abs(t[v]).toFixed(2);
    const bestAx = t.w <= t.b ? 'w' : 'b';
    const strictWin = t.mix <= t.w && t.mix <= t.b;
    // when the slope is almost purely along one axis, "mixed" ≈ that axis — an honest tie
    const nearTie = !strictWin && (t[bestAx] - t.mix) <= 0.15*Math.abs(t[bestAx]);
    const verdict = strictWin ? '← wins' : nearTie ? `≈ tie — the slope here is almost pure ${bestAx}, so mixing adds nothing` : '';
    const took = t.taken === 'mix' ? ' (you took it)' : t.taken ? `  (you took: ${t.taken})` : '';
    $('gFogOut').textContent =
`step ${GF.step} · equal-length steps — ΔJ for each choice:
  w only   ${f('w')}
  b only   ${f('b')}
  mixed    ${f('mix')}  ${verdict}${took}
the winning mixture ∝ (−∂J/∂w, −∂J/∂b) — that IS the negative gradient.`;
  } else $('gFogOut').textContent = '';
  $('gGdIter').textContent = GG.iter;
  gDrawLand(); gLandReadout();
  if (mode === 'gd') gDrawGdLoss();
}

/* ---- landscape interactions ---- */
document.querySelectorAll('#gLandChips button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#gLandChips button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  GS.landMode = b.dataset.v === 'fog' ? 'fog' : b.dataset.v === 'gd' ? 'gd' : 'explore';
  if (GS.landMode === 'gd' && GG.losses.length === 0) gGdReset();
  gLandRefresh();
});
$('gWarmOk').onclick = () => { GF.warm = true; gLandRefresh(); };
$('gFogReset').onclick = () => { gFogReset(); gLandRefresh(); };
$('gGdStep').onclick = () => { gGdStep1(); gLandRefresh(); };
$('gGdReset').onclick = () => { gGdReset(); gLandRefresh(); };
$('gGdPlay').onclick = () => {
  if (GG.timer){ gGdStop(); gLandRefresh(); return; }
  if (GG.losses.length === 0) gGdReset();
  $('gGdPlay').textContent = 'Pause';
  GG.timer = setInterval(() => {
    const per = GG.iter < 60 ? 2 : GG.iter < 300 ? 8 : GG.iter < 1500 ? 40 : 200;
    for (let i = 0; i < per; i++) gGdStep1();
    gLandRefresh();
    if (GG.dead || gGdDone()) gGdStop(), gLandRefresh();
  }, 40);
};
document.querySelectorAll('#gEtaChips button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#gEtaChips button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  GG.eta = +b.dataset.v; gLandRefresh();
});
gldcv.addEventListener('click', e => {
  const r = gldcv.getBoundingClientRect();
  const mx = (e.clientX - r.left)*(GLD.W/r.width), my = (e.clientY - r.top)*(GLD.H/r.height);
  if (GS.landMode === 'explore'){
    for (let i = 0; i < GCAND.length; i++){
      const cd = GCAND[i];
      if (cd.a < GLD.WMIN || cd.a > GLD.WMAX || cd.b < GLD.BMIN || cd.b > GLD.BMAX) continue;
      if ((glx(cd.a) - mx)**2 + (gly(cd.b) - my)**2 < 110){
        const btn = document.querySelector(`#gCandChips button[data-v="${i}"]`);
        if (btn) btn.click();
        return;
      }
    }
    const rows = gLandRows(); const [mw, mb] = gLsMin(rows);
    if ((glx(mw) - mx)**2 + (gly(mb) - my)**2 < 110){
      const btn = document.querySelector('#gCandChips button[data-v="fit"]');
      if (btn) btn.click();
    }
  } else if (GS.landMode === 'fog' && !GF.lifted){
    let hit = null, hd = 320;             // nearest arrowhead wins — heads can sit close together
    for (const a of GF.arrows){
      const d = (a.X - mx)**2 + (a.Y - my)**2;
      if (d < hd){ hd = d; hit = a; }
    }
    if (hit){
      const info = gFogDirs();
      const [nw, nb] = info.land(info.dirs[hit.key], info.L);
      GF.last = { w: info.dJ.w, b: info.dJ.b, mix: info.dJ.mix, taken: hit.key };
      GF.w = nw; GF.b = nb; GF.path.push([nw, nb]); GF.step++;
      // lift when the ground is (near-)flat AND we are truly at the floor of the bowl
      const rows2 = gLandRows();
      const [gw2, gb2] = gGrad(GF.w, GF.b, rows2);
      const [mw2, mb2] = gLsMin(rows2);
      if (Math.max(Math.abs(gw2), Math.abs(gb2)) < 8 && gJ(GF.w, GF.b, rows2) < gJ(mw2, mb2, rows2) + 2) GF.lifted = true;
      gLandRefresh();
    }
  }
});

/* ---- 1b-5: degree U-curve ---- */
const gucx = $('gUcv').getContext('2d');
$('gUcv').width = 640*DPR; $('gUcv').height = 150*DPR; $('gUcv').style.width='640px'; $('gUcv').style.height='150px';
gucx.setTransform(DPR, 0, 0, DPR, 0, 0);
function gDrawU(){
  const rows = gLandRows();
  const tr = [], co = [];
  for (let d = 1; d <= 10; d++){
    const f = gPolyFit(rows, d, false);
    tr.push(gMSE(rows, f.pred));
    let cs = 0; for (const o of GCO1) cs += (f.pred(o.x) - o.score)**2;
    co.push(cs/GCO1.length);
  }
  gucx.clearRect(0, 0, 640, 150);
  const FLOOR = 0.005;
  const lv = v => Math.log10(Math.max(v, FLOOR));
  let lmin = Infinity, lmax = -Infinity;
  for (const v of tr.concat(co)){ lmin = Math.min(lmin, lv(v)); lmax = Math.max(lmax, lv(v)); }
  const X = d => 40 + (d - 1)/9*570, Y = v => 12 + (1 - (lv(v) - lmin)/Math.max(1e-9, lmax - lmin))*108;
  gucx.strokeStyle = '#c9c2b4'; gucx.lineWidth = 1; gucx.strokeRect(40, 12, 570, 108);
  // zones
  let sweet = 1; for (let d = 2; d <= 10; d++) if (co[d-1] < co[sweet-1]) sweet = d;
  gucx.fillStyle = 'rgba(0,158,115,0.08)'; gucx.fillRect(X(Math.max(1, sweet - 0.5)), 12, X(sweet + 0.5) - X(Math.max(1, sweet - 0.5)), 108);
  gucx.fillStyle = 'rgba(213,94,0,0.06)'; gucx.fillRect(X(7), 12, X(10) - X(7), 108);
  gucx.fillStyle = '#009E73'; gucx.font = '10px sans-serif'; gucx.textAlign = 'center';
  gucx.fillText('sweet spot', X(sweet), 132);
  gucx.fillStyle = '#D55E00'; gucx.fillText('overfit →', X(8.5), 10);
  gucx.fillStyle = '#8a8378';
  gucx.fillText(sweet <= 1 ? '(no underfit zone — the truth IS a line)' : '← underfit', X(sweet <= 1 ? 3.2 : Math.max(1.6, sweet - 1.5)), 10);
  // current degree marker
  gucx.strokeStyle = '#c2185b'; gucx.setLineDash([4,4]); gucx.lineWidth = 1.2;
  gucx.beginPath(); gucx.moveTo(X(GS.deg), 12); gucx.lineTo(X(GS.deg), 120); gucx.stroke(); gucx.setLineDash([]);
  // curves
  gucx.strokeStyle = '#2b2b2b'; gucx.lineWidth = 2; gucx.beginPath();
  tr.forEach((v, i) => i === 0 ? gucx.moveTo(X(i+1), Y(v)) : gucx.lineTo(X(i+1), Y(v))); gucx.stroke();
  gucx.strokeStyle = '#c2185b'; gucx.setLineDash([5,4]); gucx.lineWidth = 2; gucx.beginPath();
  co.forEach((v, i) => i === 0 ? gucx.moveTo(X(i+1), Y(v)) : gucx.lineTo(X(i+1), Y(v))); gucx.stroke(); gucx.setLineDash([]);
  for (let d = 1; d <= 10; d++){
    gucx.fillStyle = d === GS.deg ? '#c2185b' : '#8a8378'; gucx.font = d === GS.deg ? 'bold 10px ui-monospace,monospace' : '10px ui-monospace,monospace';
    gucx.fillText(d, X(d), 145);
  }
  gucx.textAlign = 'left'; gucx.fillStyle = '#2b2b2b'; gucx.font = '10px sans-serif';
  gucx.fillText(`train (solid): ${tr[GS.deg-1].toFixed(2)}`, 46, 24);
  gucx.fillStyle = '#c2185b'; gucx.fillText(`cohort (dashed): ${co[GS.deg-1].toFixed(2)}`, 46, 36);
  gucx.textAlign = 'center';
}

/* ---- 1b-6: threshold + per-student cross-entropy ---- */
function gThrCut(m, T){
  let lo = -20, hi = 30;
  for (let i = 0; i < 60; i++){ const mid = (lo + hi)/2; if (m.prob(mid) < T) lo = mid; else hi = mid; }
  return (lo + hi)/2;
}
function gThrRefresh(){
  $('gThrVal').textContent = GS.thr.toFixed(2);
  const m = gLogModel();
  let fp = 0, fn = 0;
  for (const o of GCO1P){
    const yes = m.prob(o.x1) >= GS.thr;
    if (yes && o.pf === 0) fp++;
    if (!yes && o.pf === 1) fn++;
  }
  $('gFP').textContent = fp; $('gFN').textContent = fn;
}
const gcecx = $('gCecv').getContext('2d');
$('gCecv').width = 640*DPR; $('gCecv').height = 120*DPR; $('gCecv').style.width='640px'; $('gCecv').style.height='120px';
gcecx.setTransform(DPR, 0, 0, DPR, 0, 0);
function gDrawCE(){
  const m = gLogModel();
  const ce = GS.d1.map(r => { const p = Math.min(1 - 1e-12, Math.max(1e-12, m.prob(r.x)));
    return r.pf === 1 ? -Math.log(p) : -Math.log(1 - p); });
  const mx = Math.max(...ce, 1e-6);
  let top = 0; for (let i = 1; i < 10; i++) if (ce[i] > ce[top]) top = i;
  gcecx.clearRect(0, 0, 640, 120);
  const BW = 40, GAP = 22, X0 = 48;
  for (let i = 0; i < 10; i++){
    const h = ce[i]/mx*80, X = X0 + i*(BW + GAP), Y = 96 - h;
    gcecx.fillStyle = i === top ? '#c2185b' : 'rgba(44,82,130,0.55)';
    gcecx.fillRect(X, Y, BW, h);
    gcecx.strokeStyle = '#2b2b2b'; gcecx.lineWidth = 1; gcecx.strokeRect(X, Y, BW, Math.max(h, 0.8));
    gcecx.fillStyle = '#2b2b2b'; gcecx.font = 'bold 10px sans-serif'; gcecx.textAlign = 'center';
    gcecx.fillText(GIDS[i], X + BW/2, 110);
    if (i === top){ gcecx.fillStyle = '#c2185b'; gcecx.font = '10px ui-monospace,monospace';
      gcecx.fillText(ce[i].toFixed(2), X + BW/2, Y - 4); }
  }
  gcecx.fillStyle = '#8a8378'; gcecx.font = '10px sans-serif'; gcecx.textAlign = 'left';
  gcecx.fillText(m.demo && GIDS[top] === 'D'
    ? 'Student D: confidently wrong under the demo preset — the expensive mistake the honesty note warned about'
    : 'CE = −[y·ln p + (1−y)·ln(1−p)] under the current model', X0, 12);
  gcecx.textAlign = 'center';
}
$('gThr').oninput = () => { GS.thr = +$('gThr').value; gRefresh(); };

/* test hooks (read-only; used by the offline acceptance harness) */
window.__g1b = () => ({
  fog: { step: GF.step, lifted: GF.lifted, w: GF.w, b: GF.b,
    arrows: GF.arrows.map(a => ({ key: a.key, X: a.X, Y: a.Y, dJ: a.dJ })) },
  gd: { iter: GG.iter, w: GG.w, b: GG.b, eta: GG.eta, dead: GG.dead },
  ceTop: (() => { try { if (GS.room !== 'logistic') return null;
    const m = gLogModel(); let top = 0, mx = -1;
    GS.d1.forEach((r, i) => { const p = Math.min(1-1e-12, Math.max(1e-12, m.prob(r.x)));
      const ce = r.pf === 1 ? -Math.log(p) : -Math.log(1-p); if (ce > mx){ mx = ce; top = i; } });
    return GIDS[top]; } catch(e){ return null; } })(),
  ucurve: (() => { try { if (GS.room !== 'linear') return null;
    const rows = gLandRows(), tr = [], co = [];
    for (let d = 1; d <= 10; d++){ const f = gPolyFit(rows, d, false);
      tr.push(+gMSE(rows, f.pred).toFixed(2));
      let cs = 0; for (const o of GCO1) cs += (f.pred(o.x) - o.score)**2;
      co.push(+(cs/GCO1.length).toFixed(2)); }
    return { tr, co }; } catch(e){ return null; } })(),
});

/* ---------------- hash + boot + mode selector ---------------- */
let GSEED0 = q0.get('sd');   // carried but inert in grades mode (§1)
function gSyncHash(){
  if (GMODE !== 'g') return;
  history.replaceState(null, '', `#md=g&tr=${GS.room}` + (GS.room === 'mlp' ? `&ds=${GS.mlpDs}` : '') + (GSEED0 ? `&sd=${GSEED0}` : ''));
}
function showModeSel(){
  $('modeSel').classList.remove('hidden');
  $('gApp').classList.add('hidden');
  $('home').classList.add('hidden');
  document.querySelector('main').classList.add('hidden');
  $('roomNav').classList.add('hidden');
  $('btnHome').classList.add('hidden');
}
document.querySelectorAll('#modeSel .track').forEach(d => d.onclick = () => {
  $('modeSel').classList.add('hidden');
  if (d.dataset.md === 'r'){ GMODE = 'r'; showHome(); }
  else { GMODE = 'g'; gBoot('linear'); }
});
$('gBtnModes').onclick = () => { GMODE = null; history.replaceState(null, '', '#'); showModeSel(); };
function gBoot(room){
  GMODE = 'g';
  // fresh state on every entry (mode switch resets room state — §7.1)
  GS.d1 = gPristineD1(); GS.edited = false; GS.cand = null; GS.deg = 1; GS.solver = 'closed';
  GS.hand = false; GS.kx = 5; GS.kx2 = 7; GS.loo = false; GS.showCo = false;
  GS.logPreset = 'trained'; GS.mlpDs = 'd3'; GS.mlpModel = 'preset'; GS.hidden = 4; GS.mseed = 7;
  GS.stu = 'F'; GS.bet = null; GS.cmp = null; gMlpCache = null;
  // Phase 1b state resets
  GS.thr = 0.5; GS.abHover = null; GS.landMode = 'explore';
  gGdReset(); gFogReset(); GF.warm = false;
  gGhost.b = null; gGhost.segs = null; gGhost.curves = null;
  $('gThr').value = 0.5; $('gThrVal').textContent = '0.50';
  document.querySelectorAll('#gLandChips button').forEach(x => x.classList.toggle('on', x.dataset.v === 'explore'));
  document.querySelectorAll('#gEtaChips button').forEach(x => x.classList.toggle('on', x.dataset.v === '0.02'));
  GG.eta = 0.02;
  $('gDeg').value = 1; $('gDegVal').textContent = 1; $('gChkHand').checked = false; $('gChkCo').checked = false;
  $('gKx').value = 5; $('gKx2').value = 7; $('gHid').value = 4; $('gHidVal').textContent = 4;
  $('gApp').classList.remove('hidden');
  $('modeSel').classList.add('hidden');
  $('home').classList.add('hidden');
  document.querySelector('main').classList.add('hidden');
  $('roomNav').classList.add('hidden');
  $('btnHome').classList.add('hidden');
  gEnterRoom(room || 'linear');
}
// second-script boot dispatch (first script deferred to us for md=g / empty hash)
if (GMODE === 'g'){
  const tr = q0.get('tr');
  const room = ['linear','logistic','mlp','compare'].includes(tr) ? tr : 'linear';
  gBoot(room);
  const ds = q0.get('ds');
  if (room === 'mlp' && (ds === 'd2' || ds === 'd3')){
    document.querySelectorAll('#gDsChips button').forEach(x => x.classList.toggle('on', x.dataset.v === ds));
    GS.mlpDs = ds; gMlpCache = null; gEnterRoom('mlp');
  }
} else if (GMODE === null){
  showModeSel();
}
