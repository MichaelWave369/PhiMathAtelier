import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const seqSource=read('alchemy-sequence.js'),alchemySource=read('alchemy-engine.js');
const ui=read('alchemy-ui.js'),html=read('alchemy.html'),index=read('index.html');
new vm.Script(seqSource,{filename:'alchemy-sequence.js'});
new vm.Script(ui,{filename:'alchemy-ui.js'});
const host={window:{}};
new vm.Script(alchemySource).runInNewContext(host);
new vm.Script(seqSource).runInNewContext(host);
const api=host.window.PhiAlchemy,seq=host.window.PhiAlchemySequence;
assert.equal(seq.order.length,6);
assert.equal(new Set(seq.order).size,6);
assert.equal(seq.defaults.enabled,false);
assert.equal(seq.normalize({holdSeconds:-20,fadeSeconds:50}).holdSeconds,2);
assert.equal(seq.normalize({holdSeconds:-20,fadeSeconds:50}).fadeSeconds,4);
assert.equal(seq.normalize({holdSeconds:Infinity,fadeSeconds:'garbage'}).holdSeconds,7);
assert.equal(seq.normalize({loop:false,enabled:true}).loop,false);

const cfg={enabled:true,holdSeconds:7,fadeSeconds:1.5,loop:true};
const at=t=>seq.frame(t,cfg);
assert.equal(at(0).stage,'prima');
assert.equal(at(6.9).blend,0);
assert.equal(at(7).blend,0);
assert.equal(at(7.75).stage,'prima');
assert.equal(at(7.75).nextStage,'calcination');
assert.ok(at(7.75).blend>.45&&at(7.75).blend<.55);
assert.equal(at(8.5).stage,'calcination');
assert.equal(at(17).stage,'dissolution');
assert.equal(at(6*8.5).stage,'prima','loop returns to first stage');
assert.equal(seq.frame(8.5,cfg,'sublimation').stage,'coagulation');
const oneShot={...cfg,loop:false};
assert.equal(seq.frame(6*8.5,oneShot).stage,'transmutation');
assert.equal(seq.frame(6*8.5,oneShot).complete,true);
assert.equal(seq.frame(5*8.5,oneShot).stage,'transmutation');
assert.equal(seq.frame(5*8.5+7.75,oneShot).blend,0,'nonloop ending stays on Stone');
assert.equal(seq.frame(1e9,oneShot,'coagulation').stage,'transmutation');
assert.equal(seq.frame(-5,cfg).stage,'prima');

const base=api.generatePreset('mercury-bloom');
const unchanged=JSON.stringify(base);
const transformed=seq.stageRecipe(api,base,'calcination');
assert.equal(transformed.stage,'calcination');
assert.equal(transformed.symbol,'sulfur');
assert.equal(JSON.stringify(base),unchanged);
assert.throws(()=>seq.stageRecipe(api,base,'unknown'),/Unknown Great Work stage/);

let draws=[],overlays=0,alphaSeen=-1,created=0;
const buffer={width:0,height:0,getContext(){return {};}};
const doc={createElement(tag){assert.equal(tag,'canvas');created++;return buffer;}};
const fakeApi={normalize:o=>({...o}),renderTo(ctx,canvas,recipe){draws.push(recipe.stage);return true;}};
const renderer=seq.createRenderer(fakeApi,doc);
const ctx={globalAlpha:1,save(){},restore(){},drawImage(){overlays++;alphaSeen=this.globalAlpha;}};
const canvas={width:640,height:360};
assert.equal(renderer.renderTo(ctx,canvas,base,0,cfg).stage,'prima');
assert.equal(draws.length,1,'hold renders only one stage');
draws=[];
const transition=renderer.renderTo(ctx,canvas,base,7.75,cfg);
assert.equal(transition.stage,'prima');
assert.equal(transition.nextStage,'calcination');
assert.deepEqual(draws,['prima','calcination']);
assert.equal(overlays,1,'only transition renders overlay canvas');
assert.ok(alphaSeen>.45&&alphaSeen<.55);
assert.equal(created,1);
assert.equal(buffer.width,640);
draws=[];
renderer.renderTo(ctx,canvas,base,16.2,cfg);
assert.equal(draws.length,2,'next fade reuses same buffer');
assert.equal(created,1);
assert.equal(renderer.renderTo(ctx,{width:0,height:0},base,0,cfg),false);

for(const token of ['id="seqEnabled"','id="seqHold"','id="seqFade"',
 'id="seqLoop"','id="seqProgress"','id="seqRestart"','src="./alchemy-sequence.js"'])
 assert.ok(html.includes(token),'missing standalone sequence control: '+token);
for(const token of ["seqAPI.frame(sequenceElapsed,sequence,sequenceStartStage)",
 "sequenceRenderer.renderTo(ctx,canvas,state,sequenceElapsed",
 "stopSequence();","sequenceKey='phimath-alchemy-sequence-r1'"])
 assert.ok(ui.includes(token),'missing sequence UI integration: '+token);
for(const token of ['src="alchemy-sequence.js"','greatWorkRenderer.renderTo(context,targetCanvas',
 "deck.alchemyPreset==='sequence'",'greatWorkTime+=delta',
 "if(!autoSequence)greatWorkTime=0"])
 assert.ok(index.includes(token),'missing Deck B sequence integration: '+token);
console.log('PASS: six-stage timing, loop/hold, easing, manual settings, buffer reuse and standalone/mixer wiring.');
