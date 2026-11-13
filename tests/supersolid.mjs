import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
const require=createRequire(import.meta.url);
const {makeModel,normalize,circularResultant,runControls,wrap}=require("../supersolid-core.js");

function almost(a,b,tol=1e-9){assert.ok(Math.abs(a-b)<=tol,"Expected "+a+" ≈ "+b);}
const standard={n:32,seed:369,mode:"two",pump:.95,noise:0,disorder:0};
const first=makeModel(standard),second=makeModel(standard);
first.step(60);second.step(60);
const left=first.measure(),right=second.measure();
assert.deepEqual(left,right,"Same seed and params must reproduce entire field.");
assert.equal(left.intensity.length,32*32);
assert.equal(left.profile.length,32);
assert.ok(left.stripeContrast>0.3,"Two opposite modes should show interference stripes.");
assert.ok(left.stripePhase!==null);
assert.ok(Number.isFinite(left.meanDensity) && left.meanDensity>0);

const baseline=makeModel({...standard,mode:"single"});
baseline.step(60);
const base=baseline.measure();
assert.ok(base.stripeContrast<0.08,"Single-mode control should suppress 2k interference.");
assert.equal(base.stripePhase,null,"Single-mode baseline must not report stripe phase.");

const wound=makeModel({...standard,mode:"vortex",seed:123});
const v0=wound.measure();
assert.ok(v0.vortexCount>=1,"Seeded +1 phase singularity must be detectable.");
assert.ok(v0.vortices.some(v=>v.charge===1),"Expect a positive winding defect.");

assert.ok(first.measure().step===60);
assert.throws(()=>first.step(0),/Steps/);
assert.throws(()=>first.step(501),/Steps/);
assert.throws(()=>makeModel({...standard,n:12}),/Grid/);
assert.throws(()=>makeModel({...standard,seed:-2}),/seed/);
assert.throws(()=>makeModel({...standard,mode:"supersolid"}),/mode/);
assert.throws(()=>makeModel({...standard,noise:Infinity}),/noise/);
almost(wrap(Math.PI*3),Math.PI);
almost(circularResultant([0,0,0]),1);
assert.ok(circularResultant([0,Math.PI])<1e-12);
assert.equal(circularResultant([]),null);

const controls=runControls(standard,6,60);
assert.equal(controls.classification,"DIMENSIONLESS_TOY_MODEL");
assert.deepEqual(controls.scenarios.map(x=>x.mode),["two","single","locked"]);
assert.ok(controls.scenarios[0].meanContrast>controls.scenarios[1].meanContrast+.2);
assert.equal(controls.scenarios[1].phaseResultant,null);
assert.ok(controls.scenarios[0].phases.length===6);
assert.ok(controls.scenarios[2].phaseResultant!==null);
assert.throws(()=>runControls(standard,25,60),/Shots/);

for(const mode of ["two","single","locked","vortex"]){
 const f=makeModel({...standard,mode,disorder:.45,noise:.012,seed:9});
 f.step(100);
 const m=f.measure();
 for(const key of ["meanDensity","stripeContrast","modelTime","vortexCount"]){
   assert.ok(Number.isFinite(m[key]),key+" finite for "+mode);
 }
 assert.ok(m.meanDensity>=0 && m.stripeContrast>=0);
}
const html=readFileSync(new URL("../supersolid.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../supersolid-ui.js",import.meta.url),"utf8");
const index=readFileSync(new URL("../index.html",import.meta.url),"utf8");
assert.match(html,/supersolid-core\.js/);
assert.match(html,/supersolid-ui\.js/);
assert.match(html,/DIMENSIONLESS|dimensionless/);
assert.match(ui,/runControls/);
assert.match(index,/href="supersolid\.html"/);
console.log("PASS: deterministic two-mode simulation, controls, topological detector, bounds, numeric stability and linked page.");
