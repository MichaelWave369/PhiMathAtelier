import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=readFileSync(new URL('../crop-circle-compare.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../crop-compare.html',import.meta.url),'utf8');
const observatory=readFileSync(new URL('../crop-circles.html',import.meta.url),'utf8');
const sandbox={window:{}};
new vm.Script(src,{filename:'crop-circle-compare.js'}).runInNewContext(sandbox);
const A=sandbox.window.PhiCropCompare;

const a=A.makeProfile('Reference',[18,40,60,100],{sourceType:'synthetic'});
const exact=A.makeProfile('Scaled',[36,80,120,200],{sourceType:'synthetic'});
const different=A.makeProfile('Different',[5,10,11,95],{sourceType:'synthetic'});
const modest=A.makeProfile('Variation',[16,41,65,100],{sourceType:'synthetic'});
assert.equal(a.ringCount,4);
assert.equal(a.normalizedRadii.join(','),'0.18,0.4,0.6,1');
assert.equal(A.compare(a,exact).score,100,'scale normalization should produce identical fingerprints');
assert.equal(A.compare(a,a).score,100);
assert.ok(A.compare(a,modest).score>A.compare(a,different).score);
assert.equal(A.compare(a,exact).status,'exploratory-geometry-only');
assert.equal(A.compare(a,A.makeProfile('Sparse',[10,20])).status,'insufficient-structure');
assert.ok(A.compare(a,different).score<=20,'widely different rings should score low');
assert.equal(A.parseRadii('18, 40;60\n100').length,4);
assert.throws(()=>A.parseRadii('10, NaN'));
assert.throws(()=>A.makeProfile('',[10,20]));
assert.throws(()=>A.makeProfile('x',[10]));
assert.throws(()=>A.makeProfile('x',[10,10,30]));
assert.throws(()=>A.makeProfile('x',[-10,20,30]));
assert.throws(()=>A.makeProfile('x',[10,Infinity,30]));
assert.throws(()=>A.makeProfile('x',new Array(13).fill(5)));
const ranked=A.rank(a,[different,exact,modest],{excludeSameName:false});
assert.equal(ranked[0].second,'Scaled');
assert.equal(ranked[0].score,100);
assert.throws(()=>A.rank(a,new Array(101).fill(a)));
const receipt={
 schema:'phi-crop-circle-observatory/v0.2',
 vision:{schema:'phi-crop-circle-vision/v0.2',method:'sobel-radial-gradient-v1',
  mode:'coarse-search',sensitivity:'balanced',width:180,height:180,
  originalImageDimensions:{width:1440,height:1440},
  rings:[{radius:45,support:1},{radius:71,support:1},{radius:88,support:.7}]}
};
const imported=A.fromReceipt(receipt,'Synthetic ring receipt');
assert.equal(imported.sourceType,'local-image-cv');
assert.equal(imported.lineage.receiptSchema,'phi-crop-circle-observatory/v0.2');
assert.equal(imported.ringCount,3);
assert.equal(imported.lineage.sourceIndependentUnverified,true);
assert.equal(A.validProfile(imported).ringCount,3);
const tampered={...imported,normalizedRadii:[1,1,1]};assert.notEqual(A.validProfile(tampered).normalizedRadii.join(','),'1,1,1');
assert.throws(()=>A.fromReceipt({...receipt,schema:'unknown'}));
assert.throws(()=>A.fromReceipt({...receipt,vision:{...receipt.vision,rings:[]}}));
const n1=A.toyNull(a,exact,{trials:1000,seed:369});
const n2=A.toyNull(a,exact,{trials:1000,seed:369});
assert.equal(JSON.stringify(n1),JSON.stringify(n2));
assert.ok(n1.equalOrHigher>=0&&n1.equalOrHigher<=1000);
assert.throws(()=>A.toyNull(a,A.makeProfile('Low info',[1,2])));
assert.throws(()=>A.toyNull(a,exact,{trials:50}));
for(const id of ['name','radii','add','loadSamples','importFile','libraryList','target','ranking','runNull','exportLibrary','exportComparison']){
 assert.ok(html.includes('id="'+id+'"'),'missing Atlas UI: '+id);
}
assert.match(html,/<script src="crop-circle-compare.js"><\/script>/);
assert.match(observatory,/href="crop-compare.html"/,'observatory must link to Atlas');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1);new vm.Script(scripts[0],{filename:'crop-compare-inline.js'});
console.log('PASS: fingerprint scale invariance, rank ordering, import lineage, tamper resistance, null reproducibility, UI syntax and links.');
