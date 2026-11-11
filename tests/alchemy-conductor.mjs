import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const source=load('alchemy-conductor.js'),ui=load('alchemy-conductor-ui.js');
const html=load('alchemy.html'),index=load('index.html'),mixerSrc=load('deck-mixer.js');
const pages=load('.github/workflows/pages.yml');
new vm.Script(source,{filename:'alchemy-conductor.js'});
new vm.Script(ui,{filename:'alchemy-conductor-ui.js'});
const host={window:{}};
new vm.Script(source).runInNewContext(host);
new vm.Script(mixerSrc).runInNewContext(host);
const api=host.window.PhiAlchemyConductor,mixer=host.window.PhiDeckMixer;
assert.ok(api);
const six=api.preset('sixfold'),three=api.preset('three-gates'),nine=api.preset('nine-pulses');
assert.equal(six.steps.length,6);
assert.equal(three.steps.length,3);
assert.ok(nine.steps.every(s=>s.beats===9));
assert.equal(api.preset('bogus'),null);
assert.equal(api.normalizeScore({...six,name:'x'.repeat(120)}).name.length,64);
assert.equal(api.normalizeScore({...six,steps:[{stage:'prima',beats:999,fadeSeconds:999}]}).steps[0].beats,32);
assert.equal(api.normalizeScore({...six,steps:[{stage:'prima',beats:-6,fadeSeconds:-5}]}).steps[0].beats,1);
assert.throws(()=>api.normalizeScore({...six,version:999}),/Unsupported/);
assert.throws(()=>api.normalizeScore({...six,app:'bogus'}),/Not an Alchemical/);
assert.throws(()=>api.normalizeScore({...six,steps:[]}),/1–16/);
assert.throws(()=>api.normalizeScore({...six,steps:Array(17).fill(six.steps[0])}),/1–16/);
assert.throws(()=>api.normalizeScore({...six,steps:[{stage:'foo'}]}),/Unknown stage/);
assert.equal(JSON.stringify(six),JSON.stringify(api.normalizeScore(six)),'score roundtrip');

const score=api.normalizeScore({name:'Four Pulse',loop:true,steps:[
 {stage:'prima',beats:2,fadeSeconds:.5},
 {stage:'calcination',beats:2,fadeSeconds:.5}
]});
const t=api.createTransport(score);
assert.equal(t.snapshot().stage,'prima');
assert.equal(t.snapshot().beats,0);
// Rising edge should fire once even if a beat envelope stays high for many frames.
t.tick(.1,{beat:.95});
assert.equal(t.snapshot().beats,1);
t.tick(.1,{beat:.95});
assert.equal(t.snapshot().beats,1);
t.tick(.1,{beat:.95});
assert.equal(t.snapshot().beats,1);
// The envelope must fall below the release threshold before another edge.
t.tick(.2,{beat:.2});t.tick(.1,{beat:.9});
let shot=t.snapshot();
assert.equal(shot.index,1);
assert.equal(shot.stage,'prima','outgoing stage remains during dissolve');
assert.equal(shot.nextStage,'calcination');
assert.equal(shot.blending,true);
t.tick(.25,{beat:0});
assert.ok(t.snapshot().blend>.45&&t.snapshot().blend<.55);
t.tick(.25,{beat:0});
assert.equal(t.snapshot().stage,'calcination');
assert.equal(t.snapshot().blending,false);
t.tap();t.tap();
assert.equal(t.snapshot().index,0,'loop wraps to first operation');
assert.equal(t.snapshot().nextStage,'prima');
assert.equal(t.score.name,'Four Pulse');
assert.equal(t.reset().index,0);
assert.equal(t.snapshot().beats,0);
const nonloop=api.createTransport({...score,loop:false});
nonloop.tap();nonloop.tap();nonloop.tap();nonloop.tap();
assert.equal(nonloop.snapshot().complete,true);
assert.equal(nonloop.snapshot().index,1);
assert.equal(nonloop.snapshot().stage,'calcination');
assert.equal(nonloop.advance(),false);
assert.equal(nonloop.reset().complete,false);
const noAudio=api.createTransport(score);
for(let i=0;i<100;i++)noAudio.tick(.1,null);
assert.equal(noAudio.snapshot().index,0,'without an actual pulse, no auto-advance');

const calls=[],overlay=[];
const fakeApi={
 normalize:raw=>raw,
 renderTo(_ctx,_canvas,recipe){calls.push(recipe.stage);return true;}
};
const backing={width:0,height:0};
const doc={createElement(){return {...backing,getContext(){return {};}};}};
const renderer=api.createRenderer(fakeApi,doc);
const ctx={globalAlpha:1,save(){},restore(){},drawImage(){overlay.push(this.globalAlpha);}};
const canvas={width:640,height:360};
assert.equal(renderer.renderTo(ctx,canvas,{seed:369},t.snapshot(),1,{bass:1}),true);
const s2=api.createTransport(score);s2.tap();s2.tap();s2.tick(.25,{beat:0});
calls.length=0;
assert.equal(renderer.renderTo(ctx,canvas,{seed:369},s2.snapshot(),2,{beat:1}),true);
assert.deepEqual(calls,['prima','calcination']);
assert.equal(overlay.length,1);
assert.ok(overlay[0]>.45&&overlay[0]<.55);
assert.equal(renderer.renderTo(ctx,{width:0,height:0},{},s2.snapshot(),0),false);

assert.equal(mixer.cleanDeck({mode:6,alchemyPreset:'conductor',conductorScore:'slot-3'}).conductorScore,'slot-3');
assert.equal(mixer.cleanDeck({mode:6,alchemyPreset:'conductor',conductorScore:'bad'}).conductorScore,'sixfold');
assert.equal(mixer.cleanDeck({mode:5}).mode,5,'Geometry deck is unchanged');
assert.equal(mixer.cleanDeck({mode:4}).mode,4,'Original shader deck is unchanged');
for(const token of ['src="alchemy-conductor.js"','conductorRenderer.renderTo(context,targetCanvas',
 "conductorTransport.tick(delta,vj.levels)","localStorage.getItem('phimath-conductor-library-r1')"])
 assert.ok(index.includes(token),'missing main mixer integration: '+token);
for(const token of ['src="./alchemy-conductor.js"','src="./alchemy-conductor-ui.js"',
 'id="condSource"','id="condSteps"','id="condStart"','id="condDemo"','id="condSave"','id="condImport"'])
 assert.ok(html.includes(token),'missing score editor element: '+token);
for(const token of ['condSource','condSave','condExport','condImport','condFile','condTap',
 "phimath-conductor-library-r1",'slotId(value)','api.normalizeScore'])
 assert.ok(ui.includes(token),'missing UI integration: '+token);
for(const path of ['alchemy-conductor.js','alchemy-conductor-ui.js'])
 assert.ok(pages.includes('cp '+path+' site/'+path),'missing Pages asset '+path);
assert.ok(mixerSrc.includes('id="dmConductorScore"'));
assert.ok(mixerSrc.includes("result.conductorScore"));
console.log('PASS: Conductor score safety, beat edges, absence of false beats, fades, loop, deck/cue plumbing and Pages assets.');
