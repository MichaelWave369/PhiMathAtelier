import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../crop-circle-vision.js',import.meta.url),'utf8');
const browserHTML=readFileSync(new URL('../crop-circles.html',import.meta.url),'utf8');
const sandbox={window:{}};
new vm.Script(script,{filename:'crop-circle-vision.js'}).runInNewContext(sandbox);
const V=sandbox.window.PhiCropVision;
assert.equal(V.METHOD,'sobel-radial-gradient-v1');

function image(rings=[],width=180,height=180){
 const data=new Uint8ClampedArray(width*height*4);
 const cx=width/2,cy=height/2;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const r=Math.hypot(x-cx,y-cy);
  const color=rings.some(radius=>Math.abs(r-radius)<=1.5)?235:17;
  const j=(y*width+x)*4;data[j]=data[j+1]=data[j+2]=color;data[j+3]=255;
 }
 return {width,height,data};
}
const ringImage=image([46,71]);
const found=V.detect(ringImage);
assert.equal(found.mode,'coarse-search');
assert.ok(found.center,'concentric circles should produce a center');
assert.ok(Math.hypot(found.center.x-90,found.center.y-90)<=8,'center should be near synthetic truth');
assert.ok(found.rings.some(r=>Math.abs(r.radius-46)<=5&&r.support>=.55));
assert.ok(found.rings.some(r=>Math.abs(r.radius-71)<=5&&r.support>=.55));
assert.equal(found.rings.some(r=>!Number.isFinite(r.score)),false);
assert.ok(Math.abs(found.radialSignature.ratiosToInnermost[0]-1)<.0001);
assert.ok(found.radialSignature.ratiosToInnermost[1]>1.4);
assert.equal(found.radialSignature.normalizedRadii.length,found.rings.length);
assert.equal(V.detect(image()).radialSignature.ratiosToInnermost.length,0);
assert.equal(V.detect(image()).rings.length,0,'blank image should have no rings');
assert.equal(V.detect(image()).center,null,'blank image should not produce a center');
assert.equal(JSON.stringify(found),JSON.stringify(V.detect(ringImage)),'detection must be reproducible');
const fixed=V.detect(ringImage,{center:{x:90,y:90},sensitivity:'conservative'});
assert.equal(fixed.mode,'manual-center');
assert.equal(fixed.center.x,90);
assert.ok(fixed.rings.length>=2);
assert.throws(()=>V.detect(image(),{sensitivity:'unsupported'}));
assert.throws(()=>V.detect(image(),{center:{x:-3,y:0}}));
assert.throws(()=>V.edges({width:0,height:2,data:[]}));
assert.throws(()=>V.edges({width:180,height:180,data:new Uint8Array(12)}));

for(const id of ['detectRings','clearRings','visionSensitivity','visionResults','visionDetails']){
 assert.ok(browserHTML.includes('id="'+id+'"'),'missing vision UI: '+id);
}
assert.match(browserHTML,/<script src="crop-circle-vision.js"><\/script>/);
assert.match(browserHTML,/vision:vision\?/);
const inline=[...browserHTML.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(match=>match[1]).filter(x=>x.trim());
assert.equal(inline.length,1);
new vm.Script(inline[0],{filename:'crop-circles-inline.js'});
console.log('PASS: crop-circle vision synthetic rings + negative controls, deterministic detection, invalid input, UI link and JS syntax.');
