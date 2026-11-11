/* ΦMath Atelier · Conductor panel. Original, local-first score editing. */
(function(root){
'use strict';
function create({studio,stopSequence,announce}){
 const api=root.PhiAlchemyConductor,alchemy=root.PhiAlchemy;
 if(!api||!alchemy)throw Error('Conductor requires Alchemy');
 const $=id=>document.getElementById(id);
 const KEY='phimath-conductor-library-r1';
 const renderer=api.createRenderer(alchemy,document);
 const emptySlots=()=>[null,null,null,null];
 function readSlots(){
  try{
   const raw=localStorage.getItem(KEY);
   if(!raw||raw.length>64000)return emptySlots();
   const data=JSON.parse(raw),slots=emptySlots();
   if(Array.isArray(data))for(let i=0;i<4;i++){
    try{if(data[i])slots[i]=api.normalizeScore(data[i]);}catch(_){}
   }
   return slots;
  }catch(_){return emptySlots();}
 }
 let slots=readSlots(),score=api.preset('sixfold'),transport=api.createTransport(score);
 let active=false,demo=false,demoClock=0,ticks=0,lastIndex=-1;
 function saveSlots(){
  try{localStorage.setItem(KEY,JSON.stringify(slots));return true;}
  catch(_){announce('Browser storage unavailable; export your score instead.');return false;}
 }
 function slotId(value){const m=/^slot-([0-3])$/.exec(value);return m?Number(m[1]):-1;}
 function refreshSlots(){
  for(let i=0;i<4;i++){
   const option=$('condSource').querySelector('option[value="slot-'+i+'"]');
   if(option)option.textContent='Saved score slot '+(i+1)+(slots[i]?' · '+slots[i].name:' · empty');
  }
 }
 function status(){
  const snap=transport.snapshot();
  $('condReadout').textContent=active?
   (score.name+' · step '+(snap.index+1)+'/'+score.steps.length+' · '+snap.stage+
    ' · beat '+snap.beats+'/'+snap.required+(snap.blending?' · dissolve':'')+
    (snap.complete?' · complete':'')):
   'Conductor stopped. Choose a score and press ▶ Conductor.';
  $('condStart').textContent=active?'▶ Restart score':'▶ Conductor';
  $('condDemo').setAttribute('aria-pressed',String(demo));
  $('condDemo').textContent=demo?'◼ Demo pulse ON':'Demo pulse';
 }
 function renderRows(){
  const rootEl=$('condSteps');rootEl.replaceChildren();
  score.steps.forEach((step,i)=>{
   const row=document.createElement('div');row.className='cond-step';
   function makeField(label,value,options,min,max,stepValue,fn){
    const holder=document.createElement('label');holder.textContent=label;
    let control;
    if(options){control=document.createElement('select');for(const key of options){
     const opt=document.createElement('option');opt.value=key;opt.textContent=key;control.append(opt);
    }}else{control=document.createElement('input');control.type='number';
     control.min=String(min);control.max=String(max);control.step=String(stepValue);}
    control.value=String(value);
    control.setAttribute('aria-label','Step '+(i+1)+' '+label);
    control.addEventListener('change',()=>fn(control.value));
    holder.append(control);row.append(holder);
   }
   const edit=field=>value=>{
    const steps=score.steps.map((item,j)=>j===i?{...item,[field]:field==='stage'?value:Number(value)}:item);
    updateScore({...score,steps},true);
   };
   makeField('Operation '+(i+1),step.stage,api.stages,null,null,null,edit('stage'));
   makeField('Beats',step.beats,null,1,32,1,edit('beats'));
   makeField('Fade (s)',step.fadeSeconds,null,.15,3,.05,edit('fadeSeconds'));
   rootEl.append(row);
  });
 }
 function updateScore(raw,changed=false){
  try{score=api.normalizeScore(raw);transport.reset(score);lastIndex=-1;demoClock=0;
   $('condName').value=score.name;$('condLoop').checked=score.loop;
   renderRows();status();if(changed)announce('Score edited. Performance restarted.');return true;
  }catch(e){announce('Score rejected: '+e.message);return false;}
 }
 function stop(){active=false;demo=false;status();}
 function choose(id){
  const slot=slotId(id);
  const next=slot>=0?slots[slot]:api.preset(id);
  if(!next){announce('That slot is empty. Select a preset or save a score first.');return;}
  stop();updateScore(next);
 }
 function tick(dt){
  if(!active||!dt)return;
  if(demo){
   demoClock+=dt;
   while(demoClock>=.5){demoClock-=.5;transport.tap();}
  }
  const next=transport.tick(dt);
  if(next.index!==lastIndex){
   lastIndex=next.index;
   if(studio.getState().stage!==next.stage)
    studio.setState({stage:next.stage,symbol:api.symbol[next.stage]});
  }
  if(++ticks%6===0||next.complete)status();
  if(next.complete&&!score.loop){demo=false;}
 }
 function draw(ctx,canvas,state,clock){
  return renderer.renderTo(ctx,canvas,state,transport.snapshot(),clock,null);
 }
 $('condSource').addEventListener('change',e=>choose(e.target.value));
 $('condName').addEventListener('change',e=>updateScore({...score,name:e.target.value},true));
 $('condLoop').addEventListener('change',e=>updateScore({...score,loop:e.target.checked},true));
 $('condAdd').addEventListener('click',()=>{
  if(score.steps.length>=16){announce('Maximum 16 operations per score');return;}
  updateScore({...score,steps:[...score.steps,{stage:'prima',beats:8,fadeSeconds:.65}]},true);
 });
 $('condRemove').addEventListener('click',()=>{
  if(score.steps.length<=1){announce('A score needs at least one operation');return;}
  updateScore({...score,steps:score.steps.slice(0,-1)},true);
 });
 $('condStart').addEventListener('click',()=>{
  stopSequence();transport.reset(score);active=true;demo=false;demoClock=0;lastIndex=-1;
  studio.setState({mode:'ritual',paused:false});status();
 });
 $('condDemo').addEventListener('click',()=>{
  if(!active){stopSequence();transport.reset(score);active=true;lastIndex=-1;studio.setState({mode:'ritual',paused:false});}
  demo=!demo;demoClock=0;status();
 });
 $('condTap').addEventListener('click',()=>{
  if(!active){stopSequence();active=true;transport.reset(score);studio.setState({mode:'ritual',paused:false});}
  transport.tap();status();
 });
 $('condStop').addEventListener('click',stop);
 $('condSave').addEventListener('click',()=>{
  let idx=slotId($('condSource').value);
  if(idx<0)idx=slots.findIndex(s=>!s);
  if(idx<0)idx=0;
  slots[idx]=api.normalizeScore(score);
  if(saveSlots()){$('condSource').value='slot-'+idx;refreshSlots();announce('Saved '+score.name+' to slot '+(idx+1));}
 });
 function download(text,filename){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 $('condExport').addEventListener('click',()=>{
  download(JSON.stringify(score,null,2),'phimath-conductor-score.json');
  announce('Versioned performance score exported');
 });
 $('condImport').addEventListener('click',()=>$('condFile').click());
 $('condFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>16384)throw Error('Score exceeds 16 KB');
   const value=JSON.parse(await file.text());if(!value||value.app!=='PhiAlchemy Conductor')throw Error('Wrong score type');
   stop();if(updateScore(value))announce('Score imported. Save to a slot for Deck B use.');
  }catch(err){announce('Score import rejected: '+err.message);}
  finally{e.target.value='';}
 });
 refreshSlots();renderRows();status();
 return Object.freeze({get active(){return active;},tick,draw,stop,
  get score(){return api.normalizeScore(score);}});
}
root.PhiAlchemyConductorUI=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
