/* ΦMath Atelier v0.8.0 · Performance Cue Bank.
 * Four offline scene snapshots, direct recall and cancellable timed A/B transitions.
 * All user values are bounded. Legacy mixer and geometry art remain independent. */
(function(global){
'use strict';
const SLOT_COUNT=4, KEY='phimath-performance-cues-v1';
const DURATION=[.5,1,2,4,8,16];
const clamp=(v,lo,hi,def=lo)=>Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):def;
const clone=obj=>JSON.parse(JSON.stringify(obj));
function cleanName(raw,defaultName='Untitled cue'){
 const value=typeof raw==='string'?raw:defaultName;
 return value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,32)||defaultName;
}
function cleanA(raw,mixerAPI){
 const src=raw&&typeof raw==='object'?raw:{},deck=mixerAPI.cleanDeck(src);
 // The primary GPU renderer supports only modes 0–4.
 return {mode:Math.min(4,deck.mode),palette:deck.palette,seed:deck.seed,
  density:deck.density,spiral:deck.spiral,warp:deck.warp,glow:deck.glow,zoom:deck.zoom,
  acidPattern:deck.acidPattern,acidBands:deck.acidBands,acidCycle:deck.acidCycle,
  pointer:deck.pointer,
  speed:Math.round(clamp(src.speed,0,200,35)),
  acidAuto:src.acidAuto===true};
}
function cleanSlot(raw,index,mixerAPI){
 if(!raw||typeof raw!=='object'||!raw.A||!raw.mixer||typeof raw.mixer!=='object')return null;
 return {name:cleanName(raw.name,'Cue '+(index+1)),A:cleanA(raw.A,mixerAPI),
  mixer:{...mixerAPI.cleanMix(raw.mixer),deckB:mixerAPI.cleanDeck(raw.mixer.deckB)}};
}
function cleanBank(raw,mixerAPI){
 const input=raw&&typeof raw==='object'?(raw.cueBank||raw):null;
 if(!input||!Array.isArray(input.slots)||input.slots.length>SLOT_COUNT)
  throw Error('Cue bank must have up to four slots');
 const slots=Array.from({length:SLOT_COUNT},(_,i)=>cleanSlot(input.slots[i],i,mixerAPI));
 const duration=DURATION.includes(input.duration)?input.duration:4;
 const easing=['smooth','linear'].includes(input.easing)?input.easing:'smooth';
 return {slots,duration,easing};
}
// Stateless, deterministic interpolation; manual input wins over automation.
function faderAt(start,target,elapsed,duration,easing='smooth'){
 const a=clamp(start,0,100,0),b=clamp(target,0,100,100);
 const progress=clamp(elapsed/Math.max(.001,clamp(duration,.5,16,4)),0,1,0);
 const t=easing==='linear'?progress:progress*progress*(3-2*progress);
 return Math.round(a+(b-a)*t);
}
const css=[
 '.performance-cues{margin:16px 0 22px;padding:14px;background:linear-gradient(165deg,#1d2133,#111723);border:1px solid #5d6078;border-radius:14px}',
 '.performance-cues h2{font:19px Georgia,serif;color:#f4c995;margin:0 0 7px}',
 '.performance-cues .pc-hint{font:11px/1.55 system-ui;color:#afafc4;margin:6px 0 12px}',
 '.performance-cues .pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
 '.performance-cues .pc-cue{border:1px solid #3b3d54;border-radius:10px;padding:8px;min-width:0;background:#191b2b}',
 '.performance-cues .pc-cue label{font-size:10px;color:#e4c7a2;display:block;margin-bottom:5px}',
 '.performance-cues input,.performance-cues select{background:#101526;color:#f7e5db;border:1px solid #56516b;border-radius:7px;padding:7px;font:11px system-ui;min-width:0;max-width:100%;width:100%}',
 '.performance-cues button{background:#2b304b;color:#f0dfcf;border:1px solid #626078;border-radius:7px;padding:8px 6px;font:11px system-ui;cursor:pointer;min-width:0}',
 '.performance-cues button:hover{border-color:#eacb9c;background:#3d3e58}',
 '.performance-cues button:disabled{opacity:.45;cursor:not-allowed}',
 '.performance-cues button:focus-visible,.performance-cues input:focus-visible,.performance-cues select:focus-visible{outline:2px solid #eacb9c;outline-offset:2px}',
 '.performance-cues .pc-buttons{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}',
 '.performance-cues .pc-loaded{font:10px/1.4 system-ui;color:#a6adbd;min-height:14px;margin-top:5px}',
 '.performance-cues .pc-transport{margin-top:15px;padding-top:12px;border-top:1px solid #4b475e}',
 '.performance-cues .pc-transport-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
 '.performance-cues .pc-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}',
 '.performance-cues .pc-status{font:11px/1.5 system-ui;color:#d5c2ad;min-height:19px;margin-top:11px}',
 '@media(max-width:400px){.performance-cues .pc-grid{grid-template-columns:1fr}}'
].join('\n');
function create({root,mixer,mixerAPI,getA,setA}){
 if(!root||!mixer||!mixerAPI||typeof getA!=='function'||typeof setA!=='function')
  throw Error('Cue Bank requires root, mixer, sanitizers, getA and setA');
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 root.innerHTML=[
 '<h2>◈ Performance Cue Bank</h2>',
 '<p class="pc-hint">Save four A/B scenes. Recall instantly, or fade the current pair to A or B over a selected duration. Shift+1–4 recalls cues.</p>',
 '<div class="pc-grid">',
 ...Array.from({length:SLOT_COUNT},(_,i)=>
  '<div class="pc-cue"><label for="pcName'+i+'">Cue '+(i+1)+' name</label><input id="pcName'+i+'" maxlength="32" autocomplete="off">'+
  '<div class="pc-buttons"><button id="pcStore'+i+'" type="button">Save</button><button id="pcRecall'+i+'" type="button">Recall</button></div>'+
  '<div class="pc-loaded" id="pcLoaded'+i+'">Empty</div></div>'),
 '</div>',
 '<div class="pc-transport"><div class="pc-transport-grid">',
 '<label>Fade duration<select id="pcDuration"><option value="0.5">0.5 sec</option><option value="1">1 sec</option><option value="2">2 sec</option><option value="4">4 sec</option><option value="8">8 sec</option><option value="16">16 sec</option></select></label>',
 '<label>Easing<select id="pcEasing"><option value="smooth">Smooth (S-curve)</option><option value="linear">Linear</option></select></label>',
 '</div><div class="pc-actions"><button id="pcGoA" type="button">⇤ Fade to A</button><button id="pcGoB" type="button">Fade to B ⇥</button><button id="pcCancel" type="button">Stop fade</button></div></div>',
 '<div class="pc-actions"><button id="pcExport" type="button">↓ Cue JSON</button><button id="pcImport" type="button">↑ Import cues</button><button id="pcClear" type="button">Clear bank</button></div>',
 '<input id="pcFile" type="file" accept="application/json,.json" hidden>',
 '<p class="pc-hint">Fades affect the visual crossfader, not audio. Manual fader and MIDI changes cancel the automation. Saved cues are local to this browser and can also travel in Atelier JSON recipes.</p>',
 '<div class="pc-status" id="pcStatus" role="status" aria-live="polite">Cue Bank ready. No cue has been recalled.</div>'
 ].join('');
 const $=id=>root.querySelector('#'+id);
 let bank={slots:Array(SLOT_COUNT).fill(null),duration:4,easing:'smooth'};
 let draft=Array.from({length:SLOT_COUNT},(_,i)=>'Cue '+(i+1));
 let fade=null,feedback=0;
 const status=s=>{$('pcStatus').textContent=s;};
 function remember(){try{localStorage.setItem(KEY,JSON.stringify(bank));}catch(_){}}
 function sync(){
  for(let i=0;i<SLOT_COUNT;i++){
   const e=$('pcName'+i);
   if(document.activeElement!==e)e.value=draft[i];
   const slot=bank.slots[i];
   $('pcRecall'+i).disabled=!slot;
   $('pcLoaded'+i).textContent=slot?'Saved: '+slot.name:'Empty';
  }
  $('pcDuration').value=String(bank.duration);$('pcEasing').value=bank.easing;
  $('pcCancel').disabled=!fade;
 }
 try{
  const raw=localStorage.getItem(KEY);
  if(raw){bank=cleanBank(JSON.parse(raw),mixerAPI);draft=bank.slots.map((v,i)=>v?.name||'Cue '+(i+1));}
 }catch(_){}
 function saveCue(index){
  if(index<0||index>=SLOT_COUNT)return false;
  const snapshot={
   name:cleanName(draft[index],'Cue '+(index+1)),
   A:cleanA(getA(),mixerAPI),
   mixer:mixer.exportSettings()
  };
  bank.slots[index]=cleanSlot(snapshot,index,mixerAPI);
  draft[index]=bank.slots[index].name;
  remember();sync();status('Saved '+draft[index]+' (Deck A, Deck B, transition and fader).');
  return true;
 }
 function stopFade(reason='Fade stopped.'){
  const had=!!fade;fade=null;feedback=0;sync();
  if(had)status(reason);
  return had;
 }
 function recall(index){
  if(!Number.isInteger(index)||index<0||index>=SLOT_COUNT||!bank.slots[index])return false;
  stopFade();const slot=bank.slots[index];
  setA(clone(slot.A));mixer.restore(clone(slot.mixer));
  status('Recalled '+slot.name+' · A/B scene restored.');
  return true;
 }
 function startFade(target){
  if(!mixer.enabled){status('Enable A/B deck mixing before starting a fade.');return false;}
  const to=target==='A'?0:target==='B'?100:null;
  if(to===null)return false;
  fade=null;const from=mixer.crossfade;
  if(from===to){sync();status('Already showing Deck '+target+'.');return true;}
  fade={from,to,elapsed:0,duration:bank.duration,easing:bank.easing,last:from};
  feedback=0;sync();status('Fading to Deck '+target+' over '+bank.duration+' seconds.');
  return true;
 }
 function tick(delta){
  if(!fade)return false;
  // MIDI, keyboard fader changes, and dragging the crossfader take priority.
  if(mixer.crossfade!==fade.last){stopFade('Fade canceled by manual crossfader movement.');return false;}
  fade.elapsed=Math.min(fade.duration,fade.elapsed+clamp(delta,0,.25,0));
  const value=faderAt(fade.from,fade.to,fade.elapsed,fade.duration,fade.easing);
  fade.last=value;mixer.setCrossfade(value/100,{silent:true});
  if(fade.elapsed>=fade.duration){
   const destination=fade.to===0?'A':'B';
   fade=null;sync();status('Fade complete · Deck '+destination+'.');return true;
  }
  feedback+=delta;if(feedback>=.25){feedback=0;status('Fading: '+value+'% B');}
  return true;
 }
 function restore(raw,{clearOnMissing=false}={}){
  if(raw===undefined||raw===null){if(clearOnMissing){bank={slots:Array(SLOT_COUNT).fill(null),duration:4,easing:'smooth'};draft=bank.slots.map((_,i)=>'Cue '+(i+1));remember();sync();}return false;}
  const cleaned=cleanBank(raw,mixerAPI);
  stopFade();bank=cleaned;draft=bank.slots.map((v,i)=>v?.name||'Cue '+(i+1));
  remember();sync();status('Cue bank restored.');return true;
 }
 function exportSettings(){return clone(bank);}
 function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 for(let i=0;i<SLOT_COUNT;i++){
  $('pcName'+i).addEventListener('change',e=>{
   draft[i]=cleanName(e.target.value,'Cue '+(i+1));
   if(bank.slots[i]){bank.slots[i].name=draft[i];remember();}
   sync();
  });
  $('pcStore'+i).addEventListener('click',()=>saveCue(i));
  $('pcRecall'+i).addEventListener('click',()=>recall(i));
 }
 $('pcDuration').addEventListener('change',e=>{bank.duration=DURATION.includes(Number(e.target.value))?Number(e.target.value):4;remember();sync();});
 $('pcEasing').addEventListener('change',e=>{bank.easing=e.target.value==='linear'?'linear':'smooth';remember();sync();});
 $('pcGoA').addEventListener('click',()=>startFade('A'));
 $('pcGoB').addEventListener('click',()=>startFade('B'));
 $('pcCancel').addEventListener('click',()=>stopFade());
 $('pcExport').addEventListener('click',()=>{
  download(new Blob([JSON.stringify({app:'PhiMath Atelier',version:'0.8.0',cueBank:exportSettings()},null,2)],{type:'application/json'}),
   'phimath-performance-cues.json');
  status('Cue bank exported.');
 });
 $('pcImport').addEventListener('click',()=>$('pcFile').click());
 $('pcFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>160000)throw Error('cue file too large');
   const parsed=JSON.parse(await file.text());
   restore(parsed);status('Imported four-slot cue bank.');
  }catch(error){status('Could not import cues: '+error.message);}
  e.target.value='';
 });
 $('pcClear').addEventListener('click',()=>{stopFade();restore({slots:[]});status('Cue bank cleared.');});
 sync();
 return {saveCue,recall,startFade,stopFade,tick,restore,exportSettings,
  get fading(){return !!fade;},get cues(){return exportSettings().slots;}};
}
global.PhiPerformanceCues={create,cleanA,cleanSlot,cleanBank,faderAt,cleanName};
})(typeof window!=='undefined'?window:globalThis);
