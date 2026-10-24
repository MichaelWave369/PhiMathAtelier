import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../geometry-lab.js',import.meta.url),'utf8');
const host={window:{}};
new vm.Script(source,{filename:'geometry-lab.js'}).runInNewContext(host);
const lab=host.window.PhiGeometryLab;
assert.ok(lab,'geometry API is published without DOM dependencies');
assert.equal(typeof lab.create,'function');
assert.ok(Math.abs(lab.PHI*lab.PHI-lab.PHI-1)<1e-12);

// These are real geometric constructions, not static sprites or canned images.
assert.equal(lab.hexCells(0).length,1);
assert.equal(lab.hexCells(1).length,7);
assert.equal(lab.hexCells(2).length,19);
const metatron=lab.geometry({type:'metatron',radius:.8});
assert.equal(metatron.length,91,'13 circles + C(13,2) chords');
assert.equal(metatron.filter(p=>p.closed).length,13);
assert.equal(metatron.filter(p=>!p.closed).length,78);
const flower=lab.geometry({type:'flower',depth:2,radius:.8});
assert.equal(flower.length,19);
assert.ok(flower.every(p=>p.closed&&p.points.length>=90));
const star=lab.geometry({type:'star',n:7,step:2,radius:.9});
assert.equal(star.length,1);assert.equal(star[0].points.length,7);
assert.equal(lab.geometry({type:'star',n:6,step:2}).length,2,'non-coprime stars split into complete cycles');
assert.equal(lab.geometry({type:'polygon',n:8}).length,1);
const spiral=lab.geometry({type:'spiral',n:3,turns:4,radius:.9});
assert.equal(spiral.length,3);
const pts=spiral[0].points;
const magnitude=p=>Math.hypot(...p);
assert.ok(Math.abs(magnitude(pts.at(-1))/.9-1)<1e-12);
assert.ok(Math.abs(magnitude(pts.at(-1))/magnitude(pts.at(-26))-lab.PHI)<1e-9,
  'golden logarithmic spiral grows by phi per quarter-turn');
assert.match(lab.equation({type:'star',n:7,step:3}),/mod 7/);
assert.match(lab.equation({type:'spiral',n:4}),/φ/);
for(const p of ['metatron','flower','stars','mandala','phi']){
 const layers=lab.preset(p);
 assert.ok(layers.length>=1);
 for(const l of layers){
  const paths=lab.geometry(l);
  assert.ok(paths.length>0,'nonempty '+p);
  assert.ok(paths.length<200,'bounded path count');
  for(const path of paths){
   assert.ok(path.points.length>=2&&path.points.length<=1000);
   for(const coord of path.points)for(const v of coord)assert.ok(Number.isFinite(v)&&Math.abs(v)<=1.01,'finite normalized vertex');
  }
 }
}
const cleaned=lab.layer({type:'<script>',n:Infinity,opacity:-3,radius:'zzz',color:'url(alert(1))'});
assert.equal(cleaned.type,'star');
assert.equal(cleaned.n,7);
assert.equal(cleaned.opacity,.1);
assert.equal(cleaned.radius,.83);
assert.equal(cleaned.color,'#efc889');
assert.throws(()=>lab.sanitizeRecipe({layers:[]}),/1–12/);
assert.throws(()=>lab.sanitizeRecipe({layers:Array.from({length:13},()=>({}))}),/1–12/);
const safe=lab.sanitizeRecipe({geometry:{layers:[{type:'star',n:99,step:1e309}],selected:500,motion:500,background:'bad'}});
assert.equal(safe.layers[0].n,24);
assert.equal(safe.layers[0].step,2);
assert.equal(safe.selected,0);
assert.equal(safe.motion,120);
assert.equal(safe.background,'ink');
assert.deepEqual(JSON.parse(JSON.stringify(lab.geometry({type:'flower',depth:1}))),
 JSON.parse(JSON.stringify(lab.geometry({type:'flower',depth:1}))), 'static geometry deterministic');
assert.ok(!/\beval\s*\(|\bnew\s+Function\s*\(/.test(source),'never run an arbitrary user formula');
console.log('PASS: Sacred Geometry Laboratory layer constructions, φ spiral, formula inspector, bounded recipes and deterministic geometry.');
