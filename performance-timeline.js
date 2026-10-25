/* ΦMath Atelier v0.9.0 · Performance Timeline
 * Deterministic offline cue sequencing. Cue changes are scene cuts.
 * Hold each cue, then automate its A/B crossfader before the next cue.
 * The timeline never captures microphones, changes audio transport or evaluates code.
 */
(function(global){
'use strict';
const KEY='phimath-performance-timeline-v1';
const MAX_STEPS=16;
const FADE_OPTIONS=[0,.5,1,2,4,8,16];
const clamp=(v,min,max,fallback=min)=>{
 const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
const roundHalf=n=>Math.round(n*2)/2;
const clone=v=>JSON.parse(JSON.stringify(v));
function cleanStep(raw){
 if(!raw||typeof raw!=='object')throw Error('Timeline step must be an object');
 const slot=Number(raw.slot);
 if(!Number.isInteger(slot)||slot<0||slot>3)throw Error('Cue slot must be 1–4');
 return {slot,hold:roundHalf(clamp(raw.hold,.5,60,4)),
  fade:FADE_OPTIONS.includes(raw.fade)?raw.fade:2,
  target:Math.round(clamp(raw.target,0,100,100)),
  easing:['smooth','linear'].includes(raw.easing)?raw.easing:'smooth'};
}
function cleanTimeline(data){
 const raw=data&&typeof data==='object'?(data.timeline||data):null;
 if(!raw||!Array.isArray(raw.steps)||raw.steps.length>MAX_STEPS)throw Error('Timeline requires 0–16 steps');
 return {steps:raw.steps.map(cleanStep),loop:raw.loop===true};
}
function interpolate(a,b,elapsed,duration,easing='smooth'){
 const t=clamp(elapsed/Math.max(duration,.001),0,1,0);
 const p=easing==='linear'?t:t*t*(3-2*t);
 return Math.round(clamp(a,0,100,0)+(clamp(b,0,100,100)-clamp(a,0,100,0))*p);
}
function durationOf(raw){
 const t=cleanTimeline(raw);return t.steps.reduce((sum,s)=>sum+s.hold+s.fade,0);
}
const css=[
 '.performance-timeline{background:linear-gradient(160deg,#1e1a2b,#111722);border:1px solid #6b5475;border-radius:15px;padding:14px;margin:16px 0 22px}',
 '.performance-timeline h2{font:20px Georgia,serif;color:#efc694;margin:0 0 6px}',
 '.performance-timeline p{font:11px/1.55 system-ui;color:#b6aec0;margin:7px 0 12px}',
 '.performance-timeline label{font:11px system-ui;color:#d5cce0;display:grid;gap:4px;min-width:0}',
 '.performance-timeline input,.performance-timeline select{min-width:0;width:100%;padding:7px;background:#101625;color:#f7e5d5;border:1px solid #62596b;border-radius:7px;font:11px system-ui}',
 '.performance-timeline button{padding:8px 5px;min-width:0;background:#302b49;color:#ffe1bc;border:1px solid #665e78;border-radius:7px;font:11px system-ui;cursor:pointer}',
 '.performance-timeline button:hover{background:#453858}',
 '.performance-timeline button:focus-visible,.performance-timeline input:focus-visible,.performance-timeline select:focus-visible{outline:2px solid #f1ca92;outline-offset:2px}',
 '.performance-timeline button:disabled{opacity:.45;cursor:not-allowed}',
 '.performance-timeline .pt-tools{display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:12px}',
 '.performance-timeline .pt-steps{display:grid;gap:9px}',
 '.performance-timeline .pt-step{padding:10px;background:#171b2c;border:1px solid #3d4158;border-radius:10px}',
 '.performance-timeline .pt-step[data-playing=true]{border-color:#f0c58d;background:#2d2536}',
 '.performance-timeline .pt-step-header{display:flex;justify-content:space-between;align-items:center;gap:7px;margin-bottom:8px}',
 '.performance-timeline .pt-step-title{font:11px system-ui;color:#e5c99c;overflow-wrap:anywhere}',
 '.performance-timeline .pt-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
 '.performance-timeline .pt-step-actions{display:flex;gap:5px;margin-top:8px}',
 '.performance-timeline .pt-step-actions button{flex:1}',
 '.performance-timeline .pt-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:12px 0}',
 '.performance-timeline .pt-file-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
 '.performance-timeline .pt-progress{background:#0c1120;border:1px solid #545067;height:9px;border-radius:9px;overflow:hidden;margin:9px 0}',
 '.performance-timeline .pt-progress span{display:block;height:100%;background:#e4bc83;width:0%;transition:width .08s linear}',
 '.performance-timeline .pt-status{font:11px/1.5 system-ui;color:#ebd1b3;min-height:18px;margin-top:8px}',
 '@media(max-width:410px){.performance-timeline .pt-actions{grid-template-columns:1fr 1fr}}'
].join('\n');
function create({root,cues,mixer}){
 if(!root||!cues||typeof cues.recall!=='function'||!mixer)throw Error('Timeline requires cue bank and mixer');
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 root.innerHTML=[
  '<h2>◷ Performance Timeline</h2>',
  '<p>Build a visual show from your four saved cues. Each step recalls a scene, holds it, then animates that scene’s A/B fader. Scene switches are cuts, not cross-dissolves.</p>',
  '<div class="pt-tools"><label>Add saved cue<select id="ptChoose"><option value="0">Cue 1</option><option value="1">Cue 2</option><option value="2">Cue 3</option><option value="3">Cue 4</option></select></label><button type="button" id="ptAdd">+ Add step</button></div>',
  '<div id="ptRows" class="pt-steps" aria-label="Ordered cue timeline"></div>',
  '<label style="margin-top:10px;display:flex;align-items:center;gap:7px"><input id="ptLoop" type="checkbox" style="width:auto"> Loop whole show</label>',
  '<div class="pt-actions"><button id="ptPlay" type="button">▶ Play</button><button id="ptPause" type="button">Ⅱ Pause</button><button id="ptNext" type="button">⏭ Next</button><button id="ptStop" type="button">■ Stop</button></div>',
  '<div id="ptReadout" class="pt-status" role="status" aria-live="polite">Sequence empty · add a saved cue</div>',
  '<div id="ptProgress" class="pt-progress" role="progressbar" aria-label="Current timeline step progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="ptBar"></span></div>',
  '<div class="pt-file-actions"><button id="ptExport" type="button">↓ Timeline JSON</button><button id="ptImport" type="button">↑ Import timeline</button></div>',
  '<input id="ptFile" type="file" accept=".json,application/json" hidden>',
  '<p>Timings use seconds, not BPM. Manual mixer controls and cue recall interrupt playback. No network services or new media permissions.</p>'
 ].join('');
 const $=id=>root.querySelector('#'+id);
 let data={steps:[],loop:false},runtime=null;
 const status=s=>{$('ptReadout').textContent=s;};
 const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(data));}catch(_){}};
 try{const raw=localStorage.getItem(KEY);if(raw)data=cleanTimeline(JSON.parse(raw));}catch(_){}
 const cueName=i=>cues.cues[i]?.name||'Cue '+(i+1)+' (empty)';
 const countLabel=()=>data.steps.length+' step'+(data.steps.length===1?'':'s')+' · '+durationOf(data).toFixed(1)+' sec / pass';
 function updateProgress(){
  const step=runtime&&data.steps[runtime.index];
  const total=step?step.hold+step.fade:0;
  const now=runtime?(runtime.phase==='hold'?runtime.elapsed:step.hold+runtime.elapsed):0;
  const percent=total?Math.round(Math.min(1,now/total)*100):0;
  $('ptBar').style.width=percent+'%';
  $('ptProgress').setAttribute('aria-valuenow',String(percent));
  $('ptPause').disabled=!runtime;
  $('ptPause').textContent=runtime?.paused?'▶ Resume':'Ⅱ Pause';
  $('ptNext').disabled=!runtime;
  $('ptStop').disabled=!runtime;
  $('ptPlay').disabled=!data.steps.length;
  data.steps.forEach((_,i)=>{
   const row=$('ptStep'+i);
   if(row)row.setAttribute('data-playing',String(!!runtime&&i===runtime.index));
  });
 }
 function render(){
  const options=FADE_OPTIONS.map(x=>'<option value="'+x+'">'+x+' s</option>').join('');
  $('ptRows').innerHTML=data.steps.length?data.steps.map((step,i)=>
   '<div id="ptStep'+i+'" class="pt-step" data-playing="false">'+
   '<div class="pt-step-header"><strong id="ptLabel'+i+'" class="pt-step-title"></strong><span style="font:10px system-ui;color:#a7a2be">#'+(i+1)+'</span></div>'+
   '<div class="pt-fields"><label>Cue<select id="ptSlot'+i+'"><option value="0">Cue 1</option><option value="1">Cue 2</option><option value="2">Cue 3</option><option value="3">Cue 4</option></select></label>'+
   '<label>Hold (sec)<input id="ptHold'+i+'" type="number" min="0.5" max="60" step="0.5"></label>'+
   '<label>Fade (sec)<select id="ptFade'+i+'">'+options+'</select></label>'+
   '<label>Fade fader to<select id="ptTarget'+i+'"><option value="0">Deck A · 0%</option><option value="50">Center · 50%</option><option value="100">Deck B · 100%</option></select></label>'+
   '<label>Easing<select id="ptEasing'+i+'"><option value="smooth">Smooth</option><option value="linear">Linear</option></select></label>'+
   '</div><div class="pt-step-actions"><button id="ptUp'+i+'" type="button" aria-label="Move step '+(i+1)+' up">↑</button>'+
   '<button id="ptDown'+i+'" type="button" aria-label="Move step '+(i+1)+' down">↓</button>'+
   '<button id="ptRemove'+i+'" type="button" aria-label="Remove step '+(i+1)+'">Remove</button></div></div>'
  ).join(''):'<p>No steps yet. Save a scene in Cue Bank, then add it here.</p>';
  data.steps.forEach((step,i)=>{
   $('ptLabel'+i).textContent=cueName(step.slot);
   for(const [name,v] of [['Slot',step.slot],['Hold',step.hold],['Fade',step.fade],['Target',step.target],['Easing',step.easing]])$('pt'+name+i).value=String(v);
   for(const [name,key] of [['Slot','slot'],['Hold','hold'],['Fade','fade'],['Target','target'],['Easing','easing']]){
    $('pt'+name+i).addEventListener('change',e=>updateStep(i,{[key]:e.target.value}));
   }
   $('ptUp'+i).disabled=i===0;$('ptDown'+i).disabled=i===data.steps.length-1;
   $('ptUp'+i).addEventListener('click',()=>moveStep(i,-1));
   $('ptDown'+i).addEventListener('click',()=>moveStep(i,1));
   $('ptRemove'+i).addEventListener('click',()=>removeStep(i));
  });
  $('ptLoop').checked=data.loop;
  updateProgress();
 }
 function editNotice(){stop('Playback stopped because timeline was edited.');persist();render();status('Sequence edited · '+countLabel());}
 function addStep(slot=Number($('ptChoose').value)){
  if(data.steps.length>=MAX_STEPS){status('16-step maximum reached.');return false;}
  if(!Number.isInteger(slot)||slot<0||slot>3){status('Select Cue 1–4.');return false;}
  const last=data.steps[data.steps.length-1];
  data.steps.push(cleanStep({slot,hold:4,fade:2,target:last?.target===100?0:100,easing:'smooth'}));
  editNotice();return true;
 }
 function updateStep(index,change){
  if(!data.steps[index])return false;
  const current=data.steps[index];
  // Input values are strings; coerce known numeric controls before validating.
  const next={...current,...change};
  for(const key of ['slot','hold','fade','target'])if(Object.hasOwn(change,key))next[key]=Number(change[key]);
  try{data.steps[index]=cleanStep(next);}catch(e){status(e.message);return false;}
  editNotice();return true;
 }
 function moveStep(index,delta){
  const destination=index+delta;
  if(index<0||destination<0||destination>=data.steps.length)return false;
  const temp=data.steps[index];data.steps[index]=data.steps[destination];data.steps[destination]=temp;
  editNotice();return true;
 }
 function removeStep(index){
  if(index<0||index>=data.steps.length)return false;
  data.steps.splice(index,1);editNotice();return true;
 }
 function stop(message='Timeline stopped · stage left at current frame.'){
  const existed=!!runtime;runtime=null;updateProgress();
  if(existed)status(message);
  return existed;
 }
 function loadStep(index){
  const step=data.steps[index];
  if(!step||!cues.recall(step.slot)){stop('Timeline stopped: referenced Cue '+(step?step.slot+1:'?')+' is unavailable.');return false;}
  // Recall intentionally resets mixer scenes and fader; take new manual revision baseline.
  runtime.index=index;runtime.phase='hold';runtime.elapsed=0;
  runtime.startFader=mixer.crossfade;runtime.lastFader=mixer.crossfade;
  runtime.revision=mixer.interactionRevision;
  runtime.effectiveFade=mixer.enabled?step.fade:0;
  status('Step '+(index+1)+'/'+data.steps.length+' · '+cueName(step.slot)+' · hold');
  updateProgress();return true;
 }
 function start(){
  if(!data.steps.length){status('Add at least one cue to the timeline.');return false;}
  const missing=data.steps.findIndex(step=>!cues.cues[step.slot]);
  if(missing!==-1){stop();status('Save Cue '+(data.steps[missing].slot+1)+' before playing step '+(missing+1)+'.');return false;}
  stop();
  cues.stopFade();runtime={index:0,phase:'hold',elapsed:0,paused:false,revision:0,startFader:0,lastFader:0,effectiveFade:0};
  return loadStep(0);
 }
 function pause(){
  if(!runtime)return false;runtime.paused=!runtime.paused;
  status(runtime.paused?'Timeline paused.':'Timeline resumed.');updateProgress();return runtime.paused;
 }
 function advance(){
  if(!runtime)return false;
  const next=runtime.index+1;
  if(next>=data.steps.length){
   if(data.loop)return loadStep(0);
   stop('Timeline complete · '+data.steps.length+' steps.');
   return false;
  }
  return loadStep(next);
 }
 function next(){
  if(!runtime)return false;
  if(mixer.interactionRevision!==runtime.revision){stop('Timeline stopped: manual mixer control.');return false;}
  return advance();
 }
 function tick(delta){
  if(!runtime)return false;
  if(cues.fading){stop('Timeline stopped: cue bank fade took over.');return false;}
  if(mixer.interactionRevision!==runtime.revision||mixer.crossfade!==runtime.lastFader){
   stop('Timeline stopped: manual fader / mixer takeover.');return false;
  }
  if(runtime.paused)return true;
  let remaining=clamp(delta,0,.25,0),cycles=0;
  while(runtime&&remaining>=0&&cycles++<MAX_STEPS+2){
   const step=data.steps[runtime.index];
   const duration=runtime.phase==='hold'?step.hold:runtime.effectiveFade;
   const available=Math.max(0,duration-runtime.elapsed);
   const take=Math.min(available,remaining);
   runtime.elapsed+=take;remaining-=take;
   if(runtime.phase==='fade'&&duration>0){
    const value=interpolate(runtime.startFader,step.target,runtime.elapsed,duration,step.easing);
    runtime.lastFader=value;mixer.setCrossfade(value/100,{silent:true});
   }
   if(runtime.elapsed+1e-9<duration)break;
   if(runtime.phase==='hold'){
    runtime.phase='fade';runtime.elapsed=0;
    if(runtime.effectiveFade===0){
     if(mixer.enabled&&step.fade===0){runtime.lastFader=step.target;mixer.setCrossfade(step.target/100,{silent:true});}
     if(!advance())break;
     if(remaining===0)break;
    }else{
     status('Step '+(runtime.index+1)+'/'+data.steps.length+' · fading to '+step.target+'% B');
     if(remaining===0)break;
    }
   }else{
    if(!advance())break;
    if(remaining===0)break;
   }
  }
  updateProgress();return !!runtime;
 }
 function restore(raw){
  if(raw===undefined||raw===null)return false; // Old recipes keep the local timeline.
  const next=cleanTimeline(raw);
  stop();data=next;persist();render();status('Timeline restored · '+countLabel());return true;
 }
 function exportSettings(){return clone(data);}
 function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 $('ptAdd').addEventListener('click',()=>addStep());
 $('ptPlay').addEventListener('click',start);
 $('ptPause').addEventListener('click',pause);
 $('ptNext').addEventListener('click',next);
 $('ptStop').addEventListener('click',()=>stop());
 $('ptLoop').addEventListener('change',e=>{data.loop=e.target.checked;persist();render();});
 $('ptExport').addEventListener('click',()=>{
  download(new Blob([JSON.stringify({app:'PhiMath Atelier',version:'0.9.0',timeline:exportSettings()},null,2)],
   {type:'application/json'}),'phimath-performance-timeline.json');
  status('Timeline JSON saved.');
 });
 $('ptImport').addEventListener('click',()=>$('ptFile').click());
 $('ptFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>64000)throw Error('Timeline file too large');
   restore(JSON.parse(await file.text()));status('Timeline imported.');
  }catch(error){status('Could not import timeline: '+error.message);}
  e.target.value='';
 });
 render();
 return {start,pause,next,stop,tick,restore,exportSettings,addStep,updateStep,moveStep,removeStep,
  get playing(){return !!runtime;},get paused(){return !!runtime?.paused;},
  get current(){return runtime?{index:runtime.index,phase:runtime.phase,elapsed:runtime.elapsed}:null;}};
}
global.PhiPerformanceTimeline={create,cleanStep,cleanTimeline,interpolate,durationOf};
})(typeof window!=='undefined'?window:globalThis);
