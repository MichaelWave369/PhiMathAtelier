import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const cueSrc=readFileSync(new URL('performance-cues.js',root),'utf8');
const mixerSrc=readFileSync(new URL('deck-mixer.js',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const pages=readFileSync(new URL('.github/workflows/pages.yml',root),'utf8');
const storage=new Map();
const localStorage={getItem(key){return storage.get(key)||null;},setItem(key,val){storage.set(key,String(val));}};
const elements=new Map();
const el=id=>{
 if(elements.has(id))return elements.get(id);
 const handlers=new Map();
 const e={value:'',checked:false,disabled:false,hidden:false,style:{},textContent:'',
  addEventListener(event,fn){handlers.set(event,fn);},
  trigger(event,value){if(value!==undefined)this.value=value;
   const fn=handlers.get(event);assert.ok(fn,'missing '+event+' on '+id);
   return fn({target:this});}};
 elements.set(id,e);return e;
};
const document={activeElement:null,head:{append(){}},createElement(){return {textContent:'',append(){}};}};
const host={window:{},document,localStorage};
new vm.Script(mixerSrc,{filename:'deck-mixer.js'}).runInNewContext(host);
new vm.Script(cueSrc,{filename:'performance-cues.js'}).runInNewContext(host);
const api=host.window.PhiPerformanceCues,mixerAPI=host.window.PhiDeckMixer;
assert.ok(api&&typeof api.create==='function');
assert.equal(api.faderAt(0,100,2,4),50);
assert.equal(api.faderAt(0,100,4,4),100);
assert.equal(api.faderAt(100,0,4,4),0);
assert.equal(api.faderAt(0,100,-9,4),0);
assert.equal(api.faderAt(0,100,900,4),100);
assert.equal(api.faderAt(0,100,1,4,'linear'),25);
assert.equal(api.faderAt(0,100,1,4,'smooth'),16);
assert.equal(api.cleanName('\u0000<img src=x onerror=1>'),' <img src=x onerror=1>'.trim(),
 'Cue names may include HTML-looking literal characters but must be assigned as text');
assert.throws(()=>api.cleanBank({slots:new Array(5)},mixerAPI),/up to four/);
const normalized=api.cleanBank({slots:[{name:'Test',A:{mode:5,speed:999},mixer:{enabled:true,crossfade:500,deckB:{mode:5,geometryPreset:'phi'}}}],duration:200,easing:'evil'},mixerAPI);
assert.equal(normalized.slots[0].A.mode,4,'primary Deck A never enters unsupported geometry mode');
assert.equal(normalized.slots[0].A.speed,200);
assert.equal(normalized.slots[0].mixer.crossfade,100);
assert.equal(normalized.slots[0].mixer.deckB.geometryPreset,'phi');
assert.equal(normalized.slots.length,4);
assert.equal(normalized.duration,4);
assert.equal(normalized.easing,'smooth');

let A={mode:4,palette:5,seed:369,density:65,spiral:160,warp:60,glow:130,zoom:105,
 speed:45,acidPattern:2,acidBands:20,acidCycle:true,acidAuto:false,pointer:true,paused:false};
let B=mixerAPI.cleanDeck({mode:5,geometryPreset:'flower'});
let mix={enabled:true,crossfade:25,style:'wipe'};
let restores=0,updates=0,quietUpdates=0;
const mixer={
 get enabled(){return mix.enabled;},get crossfade(){return mix.crossfade;},
 exportSettings(){return {...mix,deckB:{...B}};},
 restore(raw){restores++;mix=mixerAPI.cleanMix(raw);B=mixerAPI.cleanDeck(raw?.deckB);},
 setCrossfade(value,opts){updates++;if(opts?.silent)quietUpdates++;
  mix.crossfade=Math.round(Math.max(0,Math.min(1,value))*100);}
};
const mounted={innerHTML:'',querySelector(selector){return el(selector.slice(1));}};
const cue=api.create({root:mounted,mixer,mixerAPI,getA:()=>A,setA:v=>{A={...A,...v};}});
assert.ok(mounted.innerHTML.includes('pcGoB'));
assert.ok(mounted.innerHTML.includes('pcRecall3'));
assert.equal(cue.cues.length,4);
assert.equal(cue.cues[0],null);
assert.equal(cue.recall(0),false);
assert.equal(el('pcRecall0').disabled,true);
assert.equal(cue.saveCue(0),true);
assert.equal(cue.cues[0].A.mode,4);
assert.equal(cue.cues[0].mixer.deckB.geometryPreset,'flower');
assert.ok(storage.has('phimath-performance-cues-v1'),'cue saved offline');
const storeBank=cue.exportSettings();
assert.equal(storeBank.slots[0].mixer.crossfade,25);
A.seed=999;A.mode=1;B=mixerAPI.cleanDeck({mode:1});mix.crossfade=90;mix.style='iris';
assert.equal(cue.recall(0),true);
assert.equal(A.seed,369);
assert.equal(A.mode,4);
assert.equal(mix.crossfade,25);
assert.equal(mix.style,'wipe');
assert.equal(B.mode,5);
assert.equal(B.geometryPreset,'flower');
assert.equal(restores,1);
assert.equal(el('pcRecall0').disabled,false);

// All live recall controls operate on the actual stored snapshot and escape text.
el('pcName0').trigger('change','\u0002<unsafe name>');
assert.equal(cue.cues[0].name,'<unsafe name>');
assert.equal(el('pcLoaded0').textContent,'Saved: <unsafe name>');
assert.ok(!mounted.innerHTML.includes('<unsafe name>'),'names are never spliced into raw HTML');
assert.equal(cue.recall(0),true);

// A/B mixer must already be enabled to automate the fader.
mix.enabled=false;
assert.equal(cue.startFade('B'),false);
mix.enabled=true;mix.crossfade=0;
assert.equal(cue.startFade('B'),true);
assert.equal(cue.fading,true);
cue.tick(.25);
assert.equal(quietUpdates,1,'animated changes must avoid redundant draws');
assert.ok(mix.crossfade>0);
const midway=mix.crossfade;
mix.crossfade=midway===37?21:37; // simulated manual MIDI/slider override
assert.equal(cue.tick(.25),false);
assert.equal(cue.fading,false,'manual fader takes priority');
assert.equal(mix.crossfade,midway===37?21:37,'manual fader position is preserved');

mix.crossfade=0;assert.equal(cue.startFade('B'),true);
for(let i=0;i<16;i++)cue.tick(.25);
assert.equal(mix.crossfade,100);
assert.equal(cue.fading,false);
assert.equal(cue.startFade('A'),true);
cue.tick(.25);
assert.ok(mix.crossfade<100);
assert.equal(cue.stopFade(),true);
assert.equal(cue.fading,false);
assert.equal(cue.stopFade(),false);
assert.equal(cue.startFade('INVALID'),false);

// Cue bank recipe round-trip restores all scene data and transport settings.
const copy=cue.exportSettings();
assert.equal(cue.restore(undefined),false,'old recipes must not erase local cues');
assert.equal(cue.exportSettings().slots[0].name,'<unsafe name>');
assert.equal(cue.restore({cueBank:copy}),true);
assert.equal(cue.exportSettings().slots[0].mixer.deckB.mode,5);
el('pcDuration').trigger('change','8');
el('pcEasing').trigger('change','linear');
assert.equal(cue.exportSettings().duration,8);
assert.equal(cue.exportSettings().easing,'linear');
el('pcClear').trigger('click');
assert.equal(cue.exportSettings().slots.every(s=>s===null),true);
assert.equal(cue.restore({cueBank:copy}),true);
const persisted=storage.get('phimath-performance-cues-v1');
assert.match(persisted,/"geometryPreset":"flower"/);
assert.ok(html.includes('id="cueBank"'));
assert.ok(html.includes('src="performance-cues.js"'));
assert.ok(html.includes('cues.tick(delta)'));
assert.ok(html.includes('cueBank:cues.exportSettings()'));
assert.ok(html.includes('if(obj.cueBank!==undefined)cues.restore(obj.cueBank)'));
assert.ok(html.includes('cues.recall(Number(e.code.slice(-1))-1)'));
assert.ok(pages.includes('cp performance-cues.js site/performance-cues.js'));
console.log('PASS: cue snapshots, recall, safe names, 4s fades, manual override, recipe round-trips and deployment.');
