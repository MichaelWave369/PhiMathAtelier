import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const code=readFileSync(new URL('performance-timeline.js',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const pages=readFileSync(new URL('.github/workflows/pages.yml',root),'utf8');
const records=new Map();
const localStorage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,String(v))};
const elements=new Map();
function element(id){
 if(elements.has(id))return elements.get(id);
 const handlers=new Map();
 const value={id,value:'',checked:false,disabled:false,hidden:false,textContent:'',innerHTML:'',style:{},
  attrs:{},addEventListener(name,fn){handlers.set(name,fn);},
  setAttribute(k,v){this.attrs[k]=String(v);},
  trigger(name,v){if(v!==undefined)this.value=v;const fn=handlers.get(name);
   assert.ok(fn,'missing '+name+' handler on '+id);return fn({target:this});}};
 elements.set(id,value);return value;
}
const document={head:{append(){}},createElement(){return {textContent:''};}};
const context={window:{},document,localStorage};
new vm.Script(code,{filename:'performance-timeline.js'}).runInNewContext(context);
const api=context.window.PhiPerformanceTimeline;
assert.equal(typeof api.create,'function');
assert.equal(typeof api.cleanTimeline,'function');
assert.equal(api.interpolate(0,100,1,2,'smooth'),50);
assert.equal(api.interpolate(100,0,1,2,'linear'),50);
assert.equal(api.interpolate(0,100,10,2),100);
assert.equal(api.interpolate(0,100,-1,2),0);
assert.throws(()=>api.cleanTimeline({steps:'not an array'}),/0–16/);
assert.throws(()=>api.cleanTimeline({steps:Array.from({length:17},()=>({slot:0}))}),/0–16/);
assert.throws(()=>api.cleanTimeline({steps:[{slot:4}]}),/1–4/);
assert.throws(()=>api.cleanTimeline({steps:[{slot:'<script>'}]}),/1–4/);
assert.equal(api.cleanStep({slot:1,hold:1000,fade:999,target:1000}).hold,60);
assert.equal(api.cleanStep({slot:1,hold:-20,target:1000}).hold,.5);
assert.equal(api.cleanStep({slot:1,hold:4,fade:999,target:1000}).fade,2);
assert.equal(api.cleanStep({slot:1,hold:4,fade:0,target:1000}).target,100);
assert.equal(api.durationOf({steps:[{slot:0,hold:3,fade:2},{slot:1,hold:5,fade:1}]}),11);
const data={steps:[{slot:0,hold:.5,fade:1,target:100,easing:'linear'}, {slot:1,hold:.5,fade:.5,target:0,easing:'smooth'}],loop:false};
let revision=0,fadeStopCount=0,recalls=[];
let state={enabled:true,crossfade:0,style:'blend',deckB:{mode:5,geometryPreset:'flower'}};
const mixer={
 get enabled(){return state.enabled;},get crossfade(){return state.crossfade;},
 get interactionRevision(){return revision;},
 setCrossfade(value,opts){if(opts?.silent!==true)revision++;
  state.crossfade=Math.round(value*100);}
};
const snapshots=[
 {name:'Golden Flower',mixer:{enabled:true,crossfade:0,style:'blend',deckB:{mode:5,geometryPreset:'flower'}}},
 {name:'Chromatic',mixer:{enabled:true,crossfade:100,style:'wipe',deckB:{mode:4}}},
 null,
 {name:'One deck',mixer:{enabled:false,crossfade:60,style:'blend',deckB:{mode:2}}}
];
const cues={
 get cues(){return snapshots;},
 stopFade(){fadeStopCount++;},
 recall(i){if(!snapshots[i])return false;
  state={...snapshots[i].mixer};revision++;recalls.push(i);return true;}
};
const rootUI={innerHTML:'',querySelector(selector){return element(selector.slice(1));}};
const line=api.create({root:rootUI,cues,mixer});
assert.ok(rootUI.innerHTML.includes('ptRows'));
assert.ok(rootUI.innerHTML.includes('ptPlay'));
assert.equal(line.playing,false);
assert.equal(line.start(),false,'empty timeline does not play');
assert.equal(line.addStep(0),true);
assert.equal(line.addStep(1),true);
assert.equal(line.addStep(2),true);
assert.equal(line.start(),false,'missing referenced cue blocks show');
assert.match(element('ptReadout').textContent,/Save Cue 3/);
assert.equal(line.removeStep(2),true);
assert.equal(line.updateStep(0,{hold:.5,fade:1,target:100,easing:'linear'}),true);
assert.equal(line.updateStep(1,{hold:.5,fade:.5,target:0,easing:'smooth'}),true);
assert.equal(line.start(),true);
assert.equal(fadeStopCount,1,'cue bank automation stopped before show');
assert.deepEqual(recalls,[0],'first cue recalled at sequence start');
assert.equal(line.current.index,0);
assert.equal(line.current.phase,'hold');
line.tick(.25);assert.equal(state.crossfade,0,'hold preserves cue fader');
line.tick(.25);assert.equal(line.current.phase,'fade');
line.tick(.25);assert.equal(state.crossfade,25,'linear fade reaches quarter mark');
line.tick(.25);assert.equal(state.crossfade,50);
assert.equal(line.pause(),true);
const pausedFader=state.crossfade;
line.tick(.25);assert.equal(state.crossfade,pausedFader,'pause freezes fader');
assert.equal(line.pause(),false);
line.tick(.25);line.tick(.25);
assert.deepEqual(recalls,[0,1],'next cue is recalled after fade');
assert.equal(line.current.index,1);
assert.equal(state.crossfade,100,'second cue starts at its saved crossfader value');
line.tick(.25);line.tick(.25);assert.equal(line.current.phase,'fade');
line.tick(.25);assert.equal(state.crossfade,50);
line.tick(.25);assert.equal(line.playing,false,'end of sequence stops');
assert.equal(state.crossfade,0,'last step reaches target');
assert.match(element('ptReadout').textContent,/complete/);
assert.equal(line.start(),true);
const restoreBefore=recalls.length;
assert.equal(line.next(),true);
assert.equal(recalls.length,restoreBefore+1);
assert.equal(line.current.index,1);
assert.equal(line.stop(),true);assert.equal(line.stop(),false);
assert.equal(line.start(),true);
line.tick(.25);
revision++;state.crossfade=74; // manual MIDI / mouse in independent mixer
assert.equal(line.tick(.25),false);
assert.equal(line.playing,false,'manual control must cancel timeline');
assert.equal(state.crossfade,74,'manual value must win');
assert.match(element('ptReadout').textContent,/manual/i);
assert.equal(line.start(),true);
const num=recalls.length;
line.updateStep(0,{target:50});
assert.equal(line.playing,false,'editing during show cancels playback');
assert.equal(recalls.length,num);
assert.equal(line.exportSettings().steps[0].target,50);
// Controls move and remove exactly the selected step.
assert.equal(line.moveStep(0,1),true);
assert.equal(line.exportSettings().steps[0].slot,1);
assert.equal(line.moveStep(0,-1),false);
assert.equal(line.moveStep(1,-1),true);
assert.equal(line.exportSettings().steps[0].slot,0);
// Roundtrip persistence including loop and guard against old recipes.
const exportData=line.exportSettings();
const count=exportData.steps.length;
assert.equal(count,2);
assert.equal(line.restore(undefined),false,'older recipes preserve timeline');
assert.equal(line.exportSettings().steps.length,count);
assert.equal(line.restore({timeline:data}),true);
assert.equal(line.exportSettings().steps[0].target,100);
assert.equal(line.exportSettings().steps[1].slot,1);
assert.equal(line.restore({steps:[{slot:3,hold:.5,fade:2,target:0}]}),true);
assert.equal(line.start(),true);
assert.equal(state.enabled,false,'single-deck cue recalled as such');
line.tick(.25);line.tick(.25);
assert.equal(line.playing,false,'single-deck cue skips impossible A/B fade');
assert.equal(state.crossfade,60,'single-deck cue retains its saved fader');
assert.equal(line.restore({steps:[{slot:0,hold:.5,fade:0,target:100}],loop:true}),true);
assert.equal(line.start(),true);
for(let k=0;k<6;k++)line.tick(.25);
assert.equal(line.playing,true,'loop restarts after last cue');
assert.ok(recalls.filter(n=>n===0).length>=3);
line.stop();
element('ptLoop').checked=false; // simulate unchecking a checked browser checkbox
 element('ptLoop').trigger('change');
assert.equal(line.exportSettings().loop,false,'loop control updates stored settings');
assert.ok(records.has('phimath-performance-timeline-v1'));
assert.ok(!rootUI.innerHTML.includes('<script'),'dynamic cue names never injected as HTML');
assert.ok(html.includes('src="performance-timeline.js"'));
assert.ok(html.includes('id="timeline"'));
assert.ok(html.includes('timeline.tick(delta)'));
assert.ok(html.includes('timeline:timeline.exportSettings()'));
assert.ok(html.includes('if(obj.timeline!==undefined)timeline.restore(obj.timeline)'));
assert.ok(pages.includes('cp performance-timeline.js site/performance-timeline.js'));
console.log('PASS: 16-step validation, deterministic hold/fades, manual override, pause/skip/loop, old recipes and deployment.');
