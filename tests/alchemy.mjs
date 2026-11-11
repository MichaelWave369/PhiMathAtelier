import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const load=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const source=load('alchemy-engine.js');
const html=load('alchemy.html');
const ui=load('alchemy-ui.js');
const index=load('index.html');
const pagesWorkflow=load('.github/workflows/pages.yml');
for(const path of ['alchemy.html','alchemy-engine.js','alchemy-sequence.js','alchemy-ui.js']) {
  assert.ok(pagesWorkflow.includes('cp '+path+' site/'+path),
    'GitHub Pages workflow must include '+path);
}
assert.match(pagesWorkflow,/Missing Pages artifact:/);

new vm.Script(source,{filename:'alchemy-engine.js'});
new vm.Script(ui,{filename:'alchemy-ui.js'});
assert.match(html,/id="crucible"/);
assert.match(html,/src="\.\/alchemy-engine\.js"/);
assert.match(html,/src="\.\/alchemy-ui\.js"/);
assert.match(html,/src="\.\/alchemy-sequence\.js"/);
assert.match(html,/id="seqEnabled"/);
assert.match(html,/id="seqProgress"/);
assert.match(html,/id="seqRestart"/);
assert.match(index,/href="alchemy\.html"/);
assert.match(html,/Great Work Engine/);
const sandbox={window:{devicePixelRatio:1,requestAnimationFrame:()=>{}}};
new vm.Script(source).runInNewContext(sandbox);
const api=sandbox.window.PhiAlchemy;
assert.ok(api);
assert.equal(api.VERSION,1);
assert.equal(api.stages.length,6);
assert.equal(api.symbols.length,20);
assert.equal(api.archetypes.length,9);
assert.equal(new Set(api.symbols.map(s=>s.id)).size,20);
assert.equal(new Set(api.stages.map(s=>s.id)).size,6);
for(const symbol of api.symbols) {
  assert.ok(api.stages.some(s=>s.id===symbol.stage));
  assert.ok(symbol.math&&symbol.meaning&&symbol.name);
}
assert.equal(api.nextStage('transmutation',1),'prima');
assert.equal(api.nextStage('prima',-1),'transmutation');
assert.equal(api.nextStage('prima',2),'dissolution');
assert.equal(api.normalize({intensity:900,recursion:-99,symmetry:1}).intensity,100);
assert.equal(api.normalize({intensity:900,recursion:-99,symmetry:1}).recursion,1);
assert.equal(api.normalize({intensity:900,recursion:-99,symmetry:1}).symmetry,3);
assert.equal(api.normalize({stage:'invalid',symbol:'fake'}).symbol,'prima-materia');
assert.throws(()=>api.normalize({app:'other'}),/Not a PhiMath/);
assert.throws(()=>api.normalize({version:999}),/Unsupported/);
for(const id of ['mercury-bloom','salt-matrix','ouro-loop','stone-ascension','rebis-merge','prima-chaos']){
  const preset=api.generatePreset(id);
  assert.ok(preset&&api.symbols.some(s=>s.id===preset.symbol));
}
assert.equal(api.generatePreset('unknown'),null);
const trace={strokes:0};
const gradient={addColorStop(){}};
const ctx={
  setTransform(){},createRadialGradient(){return gradient;},fillRect(){},beginPath(){},arc(){},
  fill(){},save(){},restore(){},translate(){},scale(){},moveTo(){},lineTo(){},
  closePath(){},stroke(){trace.strokes++;},fillText(){}
};
const canvas={width:600,height:440,getContext(type){assert.equal(type,'2d');return ctx;},
  getBoundingClientRect(){return {width:600,height:440}}};
for(const stage of api.stages){
  trace.strokes=0;
  const result=api.draw(ctx,canvas,{stage:stage.id,acid:true},2);
  assert.equal(result,stage.id);
  assert.ok(trace.strokes>=1,'Must draw visible geometry for '+stage.id);
}
let reports=0;
const player=api.create({canvas,onChange:()=>reports++});
assert.equal(player.getState().stage,'prima');
player.setSymbol('mercury');
assert.equal(player.getState().stage,'sublimation');
player.advance(1);
assert.equal(player.getState().stage,'coagulation');
player.setState({acid:true,hue:1000});
assert.equal(player.getState().hue,359);
assert.equal(player.exportRecipe().app,'PhiMath Alchemy');
player.redraw();
assert.ok(reports>=4);
player.destroy();
console.log('PASS: Alchemy registry, 3/6/9 design, stage router, presets, recipe validation, draw and controller.');
