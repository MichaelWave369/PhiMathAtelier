import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../vj-lab.js',import.meta.url),'utf8');
new vm.Script(source,{filename:'vj-lab.js'});
const sandbox={window:{}};
vm.runInNewContext(source,sandbox);
const api=sandbox.window.PhiVJLab;
assert.equal(typeof api.create,'function');
assert.equal(typeof api.bandsFromBins,'function');
assert.equal(typeof api.modulation,'function');

const samples=new Uint8Array(1024).fill(0);
const silent=api.bandsFromBins(samples,48000,2048);
assert.equal(silent.bass,0);
assert.equal(silent.mid,0);
assert.equal(silent.high,0);
assert.equal(silent.level,0);
for(let i=2;i<8;i++)samples[i]=250;
const low=api.bandsFromBins(samples,48000,2048);
assert.ok(low.bass>.1,'strong bass must register');
assert.equal(low.high,0,'isolated low energy must not appear as highs');
samples.fill(0);
for(let i=210;i<320;i++)samples[i]=255;
const high=api.bandsFromBins(samples,48000,2048);
assert.ok(high.high>.1,'high-frequency signal must register');
assert.equal(high.bass,0,'isolated high energy must not appear as bass');

const original={mode:4,palette:5,warp:40,spiral:140,density:70,glow:90,zoom:100,acidBands:12};
const depth={wet:1,bass:1,mid:1,high:1};
const zero=api.modulation(original,{bass:0,mid:0,high:0,beat:0},depth);
assert.equal(zero.warp,original.warp);
assert.equal(zero.glow,original.glow);
assert.notEqual(zero,original,'the original setting object must not be mutated');
const active=api.modulation(original,{bass:.7,mid:.6,high:.8,beat:1},depth);
assert.ok(active.warp>original.warp,'bass should drive warp');
assert.ok(active.spiral>original.spiral,'mids should drive harmonics');
assert.ok(active.glow>original.glow,'highs and beats should drive glow');
assert.ok(active.zoom!==original.zoom,'beats should affect scale');
assert.ok(active.acidBands>original.acidBands,'highs should drive color bands');
assert.equal(original.warp,40,'base state remains unchanged');
const muted=api.modulation(original,{bass:1,mid:1,high:1,beat:1},{wet:0,bass:1,mid:1,high:1});
assert.equal(muted.warp,original.warp);
assert.equal(muted.glow,original.glow);
const capped=api.modulation({...original,warp:199,glow:245},{bass:1,mid:1,high:1,beat:1},depth);
assert.ok(capped.warp<=200&&capped.glow<=250,'modulation must respect renderer input bounds');

for(const token of [
 'getUserMedia','getDisplayMedia','createAnalyser','getByteFrequencyData',
 'createMediaElementSource','requestMIDIAccess','requestFullscreen',
 'AudioContext','createMediaStreamSource',
 "event.origin!==allowed","event.data.version!==1",
 'function pushFrame(frame)','stream.getTracks()',
 'No audio is uploaded'
])assert.ok(source.includes(token),'Missing feature / safety check: '+token);
for(const token of ['id="vjLab"','src="vj-lab.js"','vj.update(delta)',
 'const live=vj.effective(state)','v0.3.0']){
 assert.ok(html.includes(token),'missing integration: '+token);
}
assert.ok(!html.includes('state.warp+=')&&!html.includes('state.glow+='),'do not mutate canonical art values');

console.log('PASS: VJ LAB maths, band analysis, bounds, safety checks and integration.');
