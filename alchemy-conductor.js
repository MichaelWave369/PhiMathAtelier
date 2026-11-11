/* ΦMath Atelier R4 · Alchemical Performance Conductor
 * Beat-edge driven, deterministic performance scores. All audio analysis
 * stays in VJ LAB; the conductor only consumes normalized band envelopes.
 */
(function(root){
'use strict';
const stages=['prima','calcination','dissolution','sublimation','coagulation','transmutation'];
const symbol={prima:'prima-materia',calcination:'sulfur',dissolution:'water',
  sublimation:'mercury',coagulation:'salt',transmutation:'stone'};
const VERSION=1;
const clamp=(v,lo,hi,fallback)=>{
 const n=Number(v);return v===undefined||v===null||v===''||!Number.isFinite(n)?
  fallback:Math.max(lo,Math.min(hi,n));
};
const stageSet=new Set(stages);
const defaultSteps=stages.map(stage=>({stage,beats:8,fadeSeconds:.65}));
function normalizeScore(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Score must be an object');
 if(raw.app!==undefined&&raw.app!=='PhiAlchemy Conductor')throw Error('Not an Alchemical Conductor score');
 if(raw.version!==undefined&&raw.version!==VERSION)throw Error('Unsupported score version');
 if(!Array.isArray(raw.steps)||raw.steps.length<1||raw.steps.length>16)throw Error('Score needs 1–16 steps');
 const steps=raw.steps.map((step,i)=>{
  if(!step||!stageSet.has(step.stage))throw Error('Unknown stage at step '+(i+1));
  return {stage:step.stage,beats:Math.round(clamp(step.beats,1,32,8)),
   fadeSeconds:Math.round(clamp(step.fadeSeconds,.15,3,.65)*100)/100};
 });
 return {app:'PhiAlchemy Conductor',version:VERSION,
  name:(typeof raw.name==='string'?raw.name.slice(0,64).trim():'')||'Untitled Great Work',
  loop:raw.loop!==false,steps};
}
function preset(id='sixfold'){
 const sets={
  sixfold:{name:'Sixfold Journey',loop:true,steps:defaultSteps},
  'three-gates':{name:'Three Gates',loop:true,steps:[
    {stage:'prima',beats:4,fadeSeconds:.8},{stage:'dissolution',beats:8,fadeSeconds:1},
    {stage:'transmutation',beats:4,fadeSeconds:.8}]},
  'nine-pulses':{name:'Nine Pulses',loop:true,steps:[
    ...stages.map(stage=>({stage,beats:9,fadeSeconds:.4})),
    {stage:'rebis',beats:9,fadeSeconds:.5},
  ].map(step=>({...step,stage:step.stage==='rebis'?'transmutation':step.stage}))}
 };
 const data=sets[id];return data?normalizeScore(data):null;
}
const EPS=.000001;
function createTransport(input){
 let score=normalizeScore(input||preset());
 let index=0,beats=0,fade=null,armed=true,elapsed=.5,complete=false;
 function snapshot(){
  const current=score.steps[index],blending=fade!==null;
  const fraction=blending?Math.max(0,Math.min(1,fade.time/fade.duration)):0;
  const t=fraction*fraction*(3-2*fraction);
  return {index,stage:blending?fade.from:current.stage,
   nextStage:blending?current.stage:current.stage,blend:t,
   beats,required:current.beats,complete,scoreName:score.name,
   progress:Math.max(0,Math.min(1,beats/current.beats)),blending};
 }
 function advance(){
  if(complete)return false;
  if(index===score.steps.length-1&&!score.loop){
   complete=true;beats=score.steps[index].beats;fade=null;return false;
  }
  const prior=score.steps[index].stage;
  index=(index+1)%score.steps.length;beats=0;
  fade={from:prior,time:0,duration:score.steps[index].fadeSeconds};
  return true;
 }
 function beat(){
  if(complete)return false;
  if(++beats>=score.steps[index].beats)return advance();
  return true;
 }
 function tick(dt,bands=null){
  const delta=clamp(dt,0,.25,0);
  elapsed+=delta;
  if(fade){fade.time+=delta;if(fade.time+EPS>=fade.duration)fade=null;}
  const level=clamp(bands?.beat,0,1,0);
  if(level<=.35)armed=true;
  if(level>=.65&&armed&&elapsed>=.18){
   armed=false;elapsed=0;beat();
  }
  return snapshot();
 }
 function reset(nextScore=score){
  score=normalizeScore(nextScore);index=0;beats=0;fade=null;armed=true;elapsed=.5;complete=false;
  return snapshot();
 }
 function tap(){elapsed=0;return beat(),snapshot();}
 return Object.freeze({tick,tap,advance,reset,snapshot,
  get score(){return normalizeScore(score);}});
}
function createRenderer(api,doc){
 if(!api||typeof api.renderTo!=='function'||typeof api.normalize!=='function')throw Error('Alchemy engine required');
 const host=doc||root.document;
 let buffer=null,bufferCtx=null;
 function renderTo(ctx,canvas,base,frame,seconds=0,bands=null){
  if(!ctx||!canvas||!(canvas.width>0&&canvas.height>0)||!frame)return false;
  const recipe=stage=>api.normalize({...base,stage,symbol:symbol[stage]});
  if(api.renderTo(ctx,canvas,recipe(frame.stage),seconds,bands)===false)return false;
  if(frame.blending&&frame.blend>0){
   if(!buffer){buffer=host.createElement('canvas');bufferCtx=buffer.getContext('2d',{alpha:false});}
   if(!bufferCtx)return false;
   if(buffer.width!==canvas.width)buffer.width=canvas.width;
   if(buffer.height!==canvas.height)buffer.height=canvas.height;
   if(api.renderTo(bufferCtx,buffer,recipe(frame.nextStage),seconds,bands)===false)return false;
   ctx.save();ctx.globalAlpha=frame.blend;
   ctx.drawImage(buffer,0,0,canvas.width,canvas.height);ctx.restore();
  }
  return true;
 }
 return Object.freeze({renderTo});
}
root.PhiAlchemyConductor=Object.freeze({VERSION,stages:[...stages],symbol:{...symbol},
 normalizeScore,preset,createTransport,createRenderer});
})(typeof window!=='undefined'?window:globalThis);
