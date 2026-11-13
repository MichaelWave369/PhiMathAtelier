/* ΦMath Atelier / Supersolid Dynamics R0.1
 * Self-contained, dimensionless, two-envelope driven-dissipative teaching model.
 * NOT the experiment's full spinor Boltzmann–Gross–Pitaevskii / SOC solver.
 * Original research: Muszynski et al., Science Advances 12, eaee4875 (2026),
 * https://doi.org/10.1126/sciadv.aee4875 (particularly Eqs. 6, 7, 9).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SupersolidCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TAU = 2 * Math.PI;
  const MODES = ["two", "single", "locked", "vortex"];
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  function rng(seed) {
    let x = (seed >>> 0) || 0x6d2b79f5;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }
  function normalize(input = {}) {
    const defaults = {
      n: 48, seed: 369, mode: "two", cycles: 5, pump: 0.95,
      diffusion: 0.20, dispersion: 0.075, nonlinearity: 0.30,
      disorder: 0.18, noise: 0.006, coupling: 0.0, dt: 0.045
    };
    const p = {...defaults, ...input};
    if (![32, 48, 64].includes(p.n)) throw Error("Grid must be 32, 48, or 64.");
    if (!Number.isSafeInteger(p.seed) || p.seed < 0 || p.seed > 4294967295) throw Error("Invalid seed.");
    if (!MODES.includes(p.mode)) throw Error("Unknown experiment mode.");
    const bounds = {
      cycles: [2, 8], pump: [0.1, 1.4], diffusion: [0.05, 0.35],
      dispersion: [0, 0.18], nonlinearity: [0, 0.8],
      disorder: [0, 1], noise: [0, 0.04], coupling: [0, 0.6],
      dt: [0.01, 0.06]
    };
    for (const [key, [lo, hi]] of Object.entries(bounds)) {
      if (!Number.isFinite(p[key]) || p[key] < lo || p[key] > hi) throw Error("Invalid " + key + ".");
    }
    if (!Number.isInteger(p.cycles)) throw Error("Cycles must be an integer.");
    if (p.mode === "locked") p.coupling = 0.45;
    if (p.mode === "single") p.coupling = 0;
    return p;
  }
  const wrap = v => Math.atan2(Math.sin(v), Math.cos(v));

  function makeModel(options = {}) {
    const p = normalize(options), n = p.n, len = n*n, rand = rng(p.seed);
    let plusR = new Float64Array(len), plusI = new Float64Array(len);
    let minusR = new Float64Array(len), minusI = new Float64Array(len);
    let npR = new Float64Array(len), npI = new Float64Array(len);
    let nmR = new Float64Array(len), nmI = new Float64Array(len);
    const potential = new Float64Array(len);
    const thetaP = TAU * rand(), thetaM = TAU * rand();
    const center=(n-1)/2;
    for (let y=0; y<n; y++) for (let x=0; x<n; x++) {
      const i=y*n+x;
      const pert = 0.035*(rand()-0.5);
      let a = 0.33*(1+pert), b = p.mode==="single" ? 0 : 0.33*(1-pert);
      let phaseP = thetaP+0.08*(rand()-0.5);
      let phaseM = thetaM+0.08*(rand()-0.5);
      if (p.mode==="vortex") {
        const dx=x-center, dy=y-center, rr=Math.hypot(dx,dy);
        phaseP+=Math.atan2(dy,dx);
        a*=rr/Math.hypot(rr,2.5);
      }
      plusR[i]=a*Math.cos(phaseP); plusI[i]=a*Math.sin(phaseP);
      minusR[i]=b*Math.cos(phaseM); minusI[i]=b*Math.sin(phaseM);
      // Fixed smooth potential across seeds: experimental disorder is not calibrated.
      potential[i]=p.disorder*(0.55*Math.sin(x*.21+.4)*Math.sin(y*.15-.6)
                    +0.45*Math.cos(x*.11+y*.08+.9));
    }
    let steps=0;
    function step(count=1) {
      if (!Number.isInteger(count)||count<1||count>500) throw Error("Steps must be 1..500.");
      for (let t=0;t<count;t++){
        for(let y=0;y<n;y++){
          const yp=((y+1)%n)*n,ym=((y+n-1)%n)*n,row=y*n;
          for(let x=0;x<n;x++){
            const i=row+x,left=row+(x+n-1)%n,right=row+(x+1)%n;
            const a=plusR[i],b=plusI[i],c=minusR[i],d=minusI[i];
            const density=a*a+b*b+c*c+d*d;
            // Saturating gain, conservative phase, static disorder and coupling.
            const gain=p.pump-0.3-density;
            const omega=p.nonlinearity*density+potential[i];
            const lapA=plusR[left]+plusR[right]+plusR[ym+x]+plusR[yp+x]-4*a;
            const lapB=plusI[left]+plusI[right]+plusI[ym+x]+plusI[yp+x]-4*b;
            const lapC=minusR[left]+minusR[right]+minusR[ym+x]+minusR[yp+x]-4*c;
            const lapD=minusI[left]+minusI[right]+minusI[ym+x]+minusI[yp+x]-4*d;
            const k=p.coupling;
            const noiseScale=p.noise*Math.sqrt(p.dt);
            npR[i]=a+p.dt*(gain*a+omega*b+p.diffusion*lapA-p.dispersion*lapB+k*(c-a))
              +noiseScale*(rand()+rand()-1);
            npI[i]=b+p.dt*(gain*b-omega*a+p.diffusion*lapB+p.dispersion*lapA+k*(d-b))
              +noiseScale*(rand()+rand()-1);
            if(p.mode==="single"){nmR[i]=0;nmI[i]=0;}
            else{
              nmR[i]=c+p.dt*(gain*c+omega*d+p.diffusion*lapC-p.dispersion*lapD+k*(a-c))
                +noiseScale*(rand()+rand()-1);
              nmI[i]=d+p.dt*(gain*d-omega*c+p.diffusion*lapD+p.dispersion*lapC+k*(b-d))
                +noiseScale*(rand()+rand()-1);
            }
          }
        }
        [plusR,npR]=[npR,plusR];[plusI,npI]=[npI,plusI];
        [minusR,nmR]=[nmR,minusR];[minusI,nmI]=[nmI,minusI];
        steps++;
      }
    }
    function densityField(){
      const field=new Float64Array(len), profile=new Float64Array(n);
      let total=0;
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const i=y*n+x,k=TAU*p.cycles*x/n;
        const ck=Math.cos(k),sk=Math.sin(k);
        // Ψ = A₊ exp(ikx) + A₋ exp(-ikx).
        const real=(plusR[i]+minusR[i])*ck+(minusI[i]-plusI[i])*sk;
        const imag=(plusI[i]+minusI[i])*ck+(plusR[i]-minusR[i])*sk;
        const intensity=real*real+imag*imag;
        field[i]=intensity; profile[x]+=intensity/n;total+=intensity;
      }
      let re=0,im=0;
      for(let x=0;x<n;x++){
        const arg=2*TAU*p.cycles*x/n;
        re+=profile[x]*Math.cos(arg);im-=profile[x]*Math.sin(arg);
      }
      const sum=total/n;
      const contrast=sum>1e-12?clamp(2*Math.hypot(re,im)/sum,0,2):0;
      const stripePhase=(p.mode!=="single"&&contrast>0.03)?Math.atan2(im,re):null;
      return {field,profile,totalDensity:total/len,contrast,stripePhase};
    }
    function vortexList(){
      // Vorticity from wrapped phase differences around interior A+ plaquettes.
      // Reject low-amplitude cells; do not count boundary artifacts.
      const found=[];
      const phase=i=>Math.atan2(plusI[i],plusR[i]);
      for(let y=1;y<n-2;y++)for(let x=1;x<n-2;x++){
        const a=y*n+x,b=a+1,c=a+n+1,d=a+n;
        const minAmp=Math.min(
          Math.hypot(plusR[a],plusI[a]),Math.hypot(plusR[b],plusI[b]),
          Math.hypot(plusR[c],plusI[c]),Math.hypot(plusR[d],plusI[d]));
        if(minAmp<0.015)continue;
        const winding=wrap(phase(b)-phase(a))+wrap(phase(c)-phase(b))+
          wrap(phase(d)-phase(c))+wrap(phase(a)-phase(d));
        const charge=Math.round(winding/TAU);
        if(Math.abs(charge)===1 && Math.abs(winding/TAU)>0.75) found.push({x:x+.5,y:y+.5,charge});
      }
      return found;
    }
    function measure(){
      const d=densityField(),v=vortexList();
      return {step:steps,modelTime:Number((steps*p.dt).toFixed(4)),
        meanDensity:d.totalDensity,stripeContrast:d.contrast,
        stripePhase:d.stripePhase,vortexCount:v.length,
        vortices:v,profile:Array.from(d.profile),intensity:Array.from(d.field)};
    }
    return {config:{...p},step,measure};
  }
  function circularResultant(angles){
    if(!angles.length)return null;
    let sx=0,sy=0;
    for(const a of angles){if(!Number.isFinite(a))throw Error("Invalid phase.");sx+=Math.cos(a);sy+=Math.sin(a);}
    return Math.hypot(sx,sy)/angles.length;
  }
  function runControls(options = {}, shots=8, iterations=90) {
    if(!Number.isInteger(shots)||shots<2||shots>24)throw Error("Shots must be 2..24.");
    if(!Number.isInteger(iterations)||iterations<1||iterations>300)throw Error("Iterations must be 1..300.");
    const optionsP=normalize(options);
    const scenarios=[["two",0],["single",0],["locked",.45]];
    const rows=[];
    for(const [mode,coupling] of scenarios){
      const values=[],phases=[];
      for(let i=0;i<shots;i++){
        const sim=makeModel({...optionsP,n:32,mode,coupling,seed:(optionsP.seed+i*7919)>>>0});
        sim.step(iterations);
        const m=sim.measure();
        values.push(m.stripeContrast);
        if(m.stripePhase!==null)phases.push(m.stripePhase);
      }
      rows.push({mode,shots,steps:iterations,
        meanContrast:values.reduce((a,b)=>a+b,0)/shots,
        phaseResultant:circularResultant(phases),
        phases,contrasts:values});
    }
    return {schema:"phimath.supersolid-controls-v1",classification:"DIMENSIONLESS_TOY_MODEL",
      scenarios:rows,notes:"No physical experimental fit, quantum supremacy, supersolidity, or independent validation is inferred."};
  }
  return {makeModel,normalize,wrap,circularResultant,runControls};
});
