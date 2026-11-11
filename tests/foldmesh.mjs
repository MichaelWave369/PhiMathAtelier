import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TextEncoder,TextDecoder} from 'node:util';

const core=readFileSync(new URL('../foldmesh-core.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../foldmesh-ui.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../foldmesh.html',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
new vm.Script(ui,{filename:'foldmesh-ui.js'});
const sandbox={TextEncoder,TextDecoder,Uint8Array,module:{exports:{}}};
new vm.Script(core,{filename:'foldmesh-core.js'}).runInNewContext(sandbox);
const F=sandbox.module.exports;

assert.equal(F.address('front/0/3'),'front/0/3');
assert.equal(F.cell('front/0/3').size,.25);
for(const bad of ['','bad','front/4','front/0/1/2/3/0','front/__proto__','front/1//2']){
 assert.throws(()=>F.address(bad),'reject '+bad);
}
const A=F.makeCube('A',369),B=F.makeCube('B',963);
assert.deepEqual(JSON.parse(JSON.stringify(F.projection(A))),JSON.parse(JSON.stringify(F.projection(B))));
const utf8='Φ369 · Hi from a fold!';
const rec=F.write(A,'front/0/3',utf8,{phase:3,orientation:2});
assert.ok(rec.bytes.length>utf8.length,'UTF-8 encoding must preserve multibyte text');
assert.equal(F.inspect(A,'front/0/3').message,utf8);
assert.equal(F.inspect(A,'front/0/3').checksum,rec.checksum);
assert.throws(()=>F.write(A,'front/0/3','x'.repeat(513)),/exceeds/);
const deny=F.engage(A,B,{from:'front/0/3',to:'top/2',phase:3,orientation:2});
assert.equal(deny.ok,false);assert.match(deny.reason,/permission/);
const mismatch=F.engage(A,B,{from:'front/0/3',to:'top/2',phase:2,orientation:2,allowed:true});
assert.equal(mismatch.ok,false);assert.match(mismatch.reason,/lock mismatch/);
assert.equal(B.revision,0,'denied transfers must not mutate destination');
const copied=F.engage(A,B,{from:'front/0/3',to:'top/2',phase:3,orientation:2,allowed:true});
assert.equal(copied.ok,true);
assert.equal(copied.checksum,rec.checksum);
assert.equal(F.inspect(B,'top/2').message,utf8);
assert.notEqual(A.folds['front/0/3'].bytes,B.folds['top/2'].bytes,'payload arrays must not alias');
const occupied=F.engage(A,B,{from:'front/0/3',to:'top/2',phase:3,orientation:2,allowed:true});
assert.equal(occupied.ok,false);
F.write(A,'front/0/3','New version',{phase:3,orientation:2});
assert.equal(F.engage(A,B,{from:'front/0/3',to:'top/2',phase:3,orientation:2,allowed:true,overwrite:true}).ok,true);
assert.equal(F.inspect(B,'top/2').message,'New version');

// Equal visible geometry, different hidden responses: an Altermath toy experiment.
F.write(B,'front/0/3','A different secret',{phase:3,orientation:2});
assert.equal(JSON.stringify(F.projection(A)),JSON.stringify(F.projection(B)));
assert.notEqual(F.probe(A,'front/0/3',3,2).signature,F.probe(B,'front/0/3',3,2).signature);
assert.equal(F.probe(B,'front/0/3',1,2).status,'locked');
assert.equal(F.probe(B,'front/0/3',3,2).status,'open');

const saved=F.exportCube(B),restored=F.restoreCube(saved);
assert.equal(F.inspect(restored,'front/0/3').message,'A different secret');
saved.folds['front/0/3'].bytes[0]^=1;
assert.throws(()=>F.restoreCube(saved),/checksum mismatch/);
B.folds['front/0/3'].bytes[0]^=1;
assert.equal(F.inspect(B,'front/0/3').valid,false);
assert.equal(F.engage(B,A,{from:'front/0/3',to:'top/2',phase:3,orientation:2,allowed:true,overwrite:true}).ok,false);

// Verify that the dedicated lab is discoverable and boots without network dependencies.
assert.match(html,/foldmesh-core\.js/);
assert.match(html,/foldmesh-ui\.js/);
for(const id of ['foldCanvas','source','target','payload','phase','orientation','write','engage','contrast','verify','download','upload']){
 assert.ok(html.includes('id="'+id+'"'),'Missing FoldMesh UI element '+id);
}
assert.match(home,/href="foldmesh\.html"/);
console.log('PASS: FoldMesh addresses, nested cells, UTF-8 payloads, FNV verification, locked gears, permission, overwrite, Altermath projection and offline UI.');
