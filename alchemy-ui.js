/* ΦMath Atelier — Alchemical Atlas UI R1.
 * Isolated from the original five GPU worlds and VJ/deck controller. */
(function () {
 'use strict';
 const api=window.PhiAlchemy;
 if(!api)throw Error('Great Work Engine not loaded');
 const $=id=>document.getElementById(id),storageKey='phimath-alchemy-r1';
 const controls=['intensity','symmetry','recursion','speed','hue'];
 let statusTimer;
 function announce(message) {
   $('status').textContent=message;
   window.clearTimeout(statusTimer);
   statusTimer=window.setTimeout(()=>{$('status').textContent='';},4500);
 }
 function restore(){
   try{
     const value=window.localStorage.getItem(storageKey);
     if(value)return api.normalize(JSON.parse(value));
   }catch(error){console.warn('Alchemical local settings unavailable:',error);}
   const s=api.normalize(api.defaults);
   try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)s.paused=true;}catch(_){}
   return s;
 }
 const grid=$('symbolGrid');
 api.symbols.forEach(symbol=>{
   const button=document.createElement('button');
   button.className='symbol';button.type='button';button.dataset.symbol=symbol.id;
   button.setAttribute('aria-pressed','false');button.setAttribute('title',symbol.name+' · '+symbol.meaning);
   const glyph=document.createElement('span');glyph.className='glyph';glyph.textContent=symbol.glyph;glyph.setAttribute('aria-hidden','true');
   const name=document.createElement('span');name.className='name';name.textContent=symbol.name;
   button.append(glyph,name);grid.append(button);
 });
 const stages=$('stageButtons');
 api.stages.forEach((stage,index)=>{
   const button=document.createElement('button');
   button.className='stage-button';button.type='button';button.dataset.stage=stage.id;
   const number=document.createElement('b');number.textContent=String(index+1).padStart(2,'0');
   button.append(number,document.createTextNode(stage.verb));stages.append(button);
 });
 function renderState(state){
   const sym=api.symbols.find(s=>s.id===state.symbol);
   const stage=api.stages.find(s=>s.id===state.stage);
   const index=api.stages.findIndex(s=>s.id===state.stage)+1;
   $('workTitle').textContent=stage.name;
   $('visualTitle').textContent=sym.name+' · '+stage.action;
   $('visualSub').textContent=stage.name+' / Stage '+index+' of 6';
   $('visualHint').textContent=state.acid?'AcidWarp Chamber · mathematical color cycling':'Original procedural mathematics · offline';
   $('seedText').textContent='SEED '+state.seed;
   $('infoGlyph').textContent=sym.glyph;
   $('infoName').textContent=sym.name;
   $('infoFamily').textContent=sym.family+' · '+(api.archetypes.includes(sym.id)?'Core archetype':'Symbolic object');
   $('infoMeaning').textContent=sym.meaning;
   $('infoStage').textContent='Active operation: '+stage.action+' · '+stage.note;
   $('infoEquation').textContent=stage.equation;
   $('infoMath').textContent='Visualization mapping: '+sym.math+'.';
   document.querySelectorAll('[data-symbol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.symbol===state.symbol)));
   document.querySelectorAll('[data-stage]').forEach(b=>{
     if(b.dataset.stage===state.stage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
   });
   document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.mode)));
   const explanations={
     study:'Study: inspect an alchemical motif and the equation used to visualize it.',
     play:'Play: experiment freely with intensity, symmetry, recursion, hue, and motion.',
     ritual:'Sequence: move through all six creative transformations. Previous and Next cycle through the operations.',
     atlas:'Atlas: select any of the twenty symbols on the left to explore its relationships and visual mapping.'
   };
   $('modeExplain').textContent=explanations[state.mode];
   controls.forEach(key=>{
     $(key).value=state[key];
     $(key+'Out').textContent=state[key]+(key==='hue'?'°':['intensity','speed'].includes(key)?'%':'');
   });
   $('acid').checked=state.acid;
   $('pauseBtn').textContent=state.paused?'▶ Resume':'Ⅱ Pause';
   $('pauseBtn').setAttribute('aria-pressed',String(state.paused));
   try{window.localStorage.setItem(storageKey,JSON.stringify({app:'PhiMath Alchemy',...state}));}
   catch(_){/* Private browser contexts can disallow storage. */}
 }
 const studio=api.create({canvas:$('crucible'),state:restore(),onChange:renderState});
 grid.addEventListener('click',event=>{
   const button=event.target.closest('button[data-symbol]');
   if(button)studio.setSymbol(button.dataset.symbol);
 });
 stages.addEventListener('click',event=>{
   const button=event.target.closest('button[data-stage]');
   if(button)studio.setStage(button.dataset.stage);
 });
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
   studio.setState({mode:b.dataset.view});
   if(b.dataset.view==='atlas')grid.scrollIntoView({behavior:'auto',block:'nearest'});
 }));
 controls.forEach(key=>$(key).addEventListener('input',e=>studio.setState({[key]:Number(e.target.value)})));
 $('acid').addEventListener('change',e=>studio.setState({acid:e.target.checked}));
 $('nextStage').addEventListener('click',()=>studio.advance(1));
 $('prevStage').addEventListener('click',()=>studio.advance(-1));
 $('pauseBtn').addEventListener('click',()=>studio.setState({paused:!studio.getState().paused}));
 $('randomBtn').addEventListener('click',()=>{studio.randomize();announce('A new mathematical seed has been generated');});
 $('presetSelect').addEventListener('change',e=>{
   const preset=api.generatePreset(e.target.value);
   if(preset){studio.setState(preset);announce('Loaded formula: '+e.target.options[e.target.selectedIndex].text);}
 });
 $('resetBtn').addEventListener('click',()=>{
   studio.setState(api.defaults);$('presetSelect').value='';announce('Great Work parameters restored');
 });
 $('exportRecipe').addEventListener('click',()=>{
   const payload=JSON.stringify(studio.exportRecipe(),null,2);
   const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='phimath-great-work-'+studio.getState().seed+'.json';
   document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),2000);
   announce('Versioned formula exported');
 });
 $('importRecipe').addEventListener('click',()=>$('recipeFile').click());
 $('recipeFile').addEventListener('change',async e=>{
   const file=e.target.files&&e.target.files[0];if(!file)return;
   try{
     if(file.size>32768)throw Error('File exceeds the 32 KB recipe limit');
     const data=JSON.parse(await file.text());
     if(data.app!=='PhiMath Alchemy')throw Error('Not a Great Work recipe');
     studio.setState(api.normalize(data));$('presetSelect').value='';
     announce('Alchemical recipe imported');
   }catch(error){announce('Import rejected: '+error.message);}
   finally{e.target.value='';}
 });
 window.addEventListener('keydown',e=>{
   if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;
   if(e.key==='ArrowRight'&&studio.getState().mode==='ritual'){e.preventDefault();studio.advance(1);}
   if(e.key==='ArrowLeft'&&studio.getState().mode==='ritual'){e.preventDefault();studio.advance(-1);}
 });
 window.addEventListener('beforeunload',()=>studio.destroy());
})();
