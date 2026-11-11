/* ΦMath Atelier · Great Work Sequencer R3
 * A deterministic six-operation visual score. No audio capture, timers, or network.
 * Uses the same Alchemy engine in the standalone studio and the dual-deck mixer.
 */
(function(global){
'use strict';
const order=['prima','calcination','dissolution','sublimation','coagulation','transmutation'];
const symbols={prima:'prima-materia',calcination:'sulfur',dissolution:'water',
  sublimation:'mercury',coagulation:'salt',transmutation:'stone'};
const DEFAULTS=Object.freeze({enabled:false,holdSeconds:7,fadeSeconds:1.5,loop:true});
const finite=(v,min,max,fallback)=>{
 const n=Number(v);return v===null||v===undefined||v===''||!Number.isFinite(n)?fallback:Math.max(min,Math.min(max,n));
};
function normalize(raw){
 const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {enabled:s.enabled===true,holdSeconds:finite(s.holdSeconds,2,30,DEFAULTS.holdSeconds),
  fadeSeconds:finite(s.fadeSeconds,.2,4,DEFAULTS.fadeSeconds),loop:s.loop!==false};
}
function frame(seconds,raw,startStage='prima'){
 const cfg=normalize(raw),start=Math.max(0,order.indexOf(startStage)),length=order.length;
 const t=finite(seconds,0,1e9,0),period=cfg.holdSeconds+cfg.fadeSeconds;
 const count=Math.floor(t/period),remaining=length-start;
 if(!cfg.loop&&count>=remaining){
  const index=length-1;
  return {stage:order[index],nextStage:order[index],index,nextIndex:index,blend:0,progress:1,complete:true};
 }
 const index=cfg.loop?(start+count)%length:start+count;
 const nextIndex=cfg.loop?(index+1)%length:Math.min(length-1,index+1);
 const phase=t-count*period;
 const x=Math.max(0,Math.min(1,(phase-cfg.holdSeconds)/cfg.fadeSeconds));
 // Smoothstep gives an eased scene dissolve rather than a distracting hard switch.
 const blend=index===nextIndex?0:x*x*(3-2*x);
 return {stage:order[index],nextStage:order[nextIndex],index,nextIndex,
   blend,progress:Math.max(0,Math.min(1,phase/period)),complete:false};
}
function stageRecipe(api,base,stage) {
 if(!order.includes(stage))throw Error('Unknown Great Work stage');
 return api.normalize({...base,stage,symbol:symbols[stage]});
}
function createRenderer(api,doc){
 if(!api||typeof api.renderTo!=='function')throw Error('Alchemy renderer required');
 const host=doc||global.document;
 let buffer=null,bufferContext=null;
 function renderTo(ctx,canvas,base,elapsed,settings,bands=null,startStage='prima'){
  if(!ctx||!canvas||!(canvas.width>0&&canvas.height>0))return false;
  const current=frame(elapsed,settings,startStage);
  if(api.renderTo(ctx,canvas,stageRecipe(api,base,current.stage),elapsed,bands)===false)return false;
  if(current.blend>0){
   if(!buffer){
    buffer=host.createElement('canvas');
    bufferContext=buffer.getContext('2d',{alpha:false});
   }
   if(!bufferContext)return false;
   if(buffer.width!==canvas.width)buffer.width=canvas.width;
   if(buffer.height!==canvas.height)buffer.height=canvas.height;
   if(api.renderTo(bufferContext,buffer,stageRecipe(api,base,current.nextStage),elapsed,bands)===false)return false;
   ctx.save();
   ctx.globalAlpha=current.blend;
   ctx.drawImage(buffer,0,0,canvas.width,canvas.height);
   ctx.restore();
  }
  return current;
 }
 return Object.freeze({renderTo,frame,normalize});
}
global.PhiAlchemySequence=Object.freeze({order:[...order],symbols:{...symbols},defaults:DEFAULTS,
  normalize,frame,stageRecipe,createRenderer});
})(typeof window!=='undefined'?window:globalThis);
