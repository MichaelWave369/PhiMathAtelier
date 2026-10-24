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


// v0.6: the VJ levels do not mutate recipe geometry, and audio is off by default.
const legacy=lab.sanitizeRecipe({layers:lab.preset('stars'),motion:12,background:'ink'});
assert.equal(legacy.audio.enabled,false,'older geometry recipes stay visually unchanged');
assert.equal(legacy.audio.wet,.75);
const quiet=lab.audioEffect(legacy,{bass:1,mid:1,high:1,beat:1});
assert.equal(quiet.scale,1);
assert.equal(quiet.turn,0);
assert.equal(quiet.glow,1);
const hot={...legacy,audio:{enabled:true,wet:1}};
const baseline=lab.audioEffect(hot,{bass:0,mid:0,high:0,beat:0});
assert.equal(baseline.scale,1);
assert.equal(baseline.turn,0);
assert.equal(baseline.glow,1);
const loud=lab.audioEffect(hot,{bass:1,mid:.8,high:.9,beat:1});
assert.ok(loud.scale>1.2&&loud.scale<1.4,'bass and beats expand the construction');
assert.ok(loud.turn>0&&loud.glow>1,'mids rotate and highs brighten');
assert.equal(lab.audioEffect(hot,{bass:Infinity,high:NaN,beat:-9}).scale,1,'nonfinite audio is safely bypassed');
const beforeLayer=JSON.stringify(hot.layers);
lab.layerPose(hot.layers[0],0,hot,2,{bass:.8,mid:.6,high:.5});
assert.equal(JSON.stringify(hot.layers),beforeLayer,'beat animation must not write into layer settings');
const custom=lab.sanitizeRecipe({layers:lab.preset('flower'),audio:{enabled:true,wet:999}});
assert.equal(custom.audio.wet,1,'intensity bounded');
assert.equal(custom.audio.enabled,true);

// SVG must be a self-contained static snapshot with exact mathematical path count.
const svg=lab.svgSnapshot({layers:lab.preset('metatron'),selected:0,motion:0},0,900,900);
assert.match(svg,/^<\?xml version="1\.0"/);
assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
assert.equal((svg.match(/<path d=/g)||[]).length,94,'78 chords, 13 circles, 3 concentric rings');
assert.ok(svg.includes('<title>PhiMath Atelier Geometry</title>'));
assert.ok(svg.includes('viewBox="0 0 900 900"'));
assert.ok(!svg.includes('<script')&&!svg.includes('onload=')&&!svg.includes('http://www.w3.org/2000/svg" xmlns:xlink'),'no executable SVG content');
assert.notEqual(
 lab.svgSnapshot(hot,0,800,600,{bass:0,mid:0,high:0,beat:0}),
 lab.svgSnapshot(hot,0,800,600,{bass:1,mid:1,high:1,beat:1}),
 'SVG snapshots reflect current audio animation without editing the recipe'
);
const evilSvg=lab.svgSnapshot({layers:[{type:'star',n:7,color:'" onload="alert(1)',opacity:Infinity}],background:'<script>'},0,-99,100000);
assert.ok(!evilSvg.includes('onload=')&&!evilSvg.includes('<script>'));
assert.ok(evilSvg.includes('viewBox="0 0 128 4096"'),'export dimensions bounded');
assert.equal(lab.svgSnapshot(hot,12,700,700),lab.svgSnapshot(hot,12,700,700),'same recipe, frame and levels produce identical SVG');
const hiddenSvg=lab.svgSnapshot({layers:[{type:'star',visible:false}]});
assert.ok(!hiddenSvg.includes('<path d='),'hidden layers never export strokes');
assert.ok(source.includes('id="glSVG"'),'SVG button exists');
assert.ok(source.includes('id="glAudio"')&&source.includes('id="glWet"'),'VJ controls mounted');

console.log('PASS: geometry constructors, φ, bounded safe SVG export, and non-destructive VJ modulation.');
