/* ΦMath Atelier v0.7.0 · Two-deck crossfader with vector geometry source.
 * Independent mathematical deck scenes with GPU framebuffer compositing
 * and a CPU Canvas fallback. No network or external dependencies. */
(function(global){
'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(v))?Number(v):a));
const limits={mode:[0,5],palette:[0,5],seed:[0,999999],density:[15,100],
 spiral:[20,300],warp:[0,200],glow:[25,250],zoom:[50,220],
 acidPattern:[0,5],acidBands:[4,48]};
const fallback={mode:4,palette:5,seed:369,density:72,spiral:140,warp:65,
 glow:120,zoom:100,acidPattern:0,acidBands:16,acidCycle:true,pointer:true,geometryPreset:'flower'};
function cleanDeck(obj,base=fallback){
 const result={};
 for(const [k,[lo,hi]] of Object.entries(limits))result[k]=Math.round(clamp(obj?.[k]??base[k],lo,hi));
 for(const k of ['acidCycle','pointer'])result[k]=typeof obj?.[k]==='boolean'?obj[k]:Boolean(base[k]);
 result.geometryPreset=['live','metatron','flower','stars','mandala','phi'].includes(obj?.geometryPreset)?obj.geometryPreset:(base.geometryPreset||'flower');
 return result;
}
function cleanMix(raw){return {enabled:raw?.enabled===true,crossfade:Math.round(clamp(raw?.crossfade??0,0,100)),
 style:['blend','wipe','iris'].includes(raw?.style)?raw.style:'blend'};}
const vertex=['attribute vec2 a_position;','void main(){gl_Position=vec4(a_position,0.0,1.0);}'].join('\n');
const fragment=[
 'precision mediump float;',
 'uniform sampler2D u_sceneA;','uniform sampler2D u_sceneB;',
 'uniform vec2 u_resolution;','uniform float u_crossfade;','uniform int u_style;',
 'void main(){',
 ' vec2 uv=gl_FragCoord.xy/u_resolution;',
 ' vec3 a=texture2D(u_sceneA,uv).rgb,b=texture2D(u_sceneB,uv).rgb;',
 ' float t=clamp(u_crossfade,0.0,1.0),mask=t;',
 ' if(u_style==1){mask=1.0-smoothstep(t-.012,t+.012,uv.x);}',
 ' else if(u_style==2){',
 '  vec2 q=(uv-.5)*vec2(u_resolution.x/u_resolution.y,1.0);',
 '  float far=length(vec2(u_resolution.x/u_resolution.y*.5,.5));',
 '  mask=1.0-smoothstep(t*far-.018,t*far+.018,length(q));',
 ' }',
 ' if(t<=.00001)mask=0.0;',
 ' if(t>=.99999)mask=1.0;',
 ' gl_FragColor=vec4(mix(a,b,mask),1.0);',
 '}'].join('\n');
const css=[
 '.deck-mixer{border:1px solid #62567c;border-radius:15px;background:linear-gradient(160deg,#1b1a30,#111520);padding:14px;margin-bottom:22px}',
 '.deck-mixer h2{font:19px Georgia,serif;color:#f4c994;margin:0}',
 '.deck-mixer .dm-muted{font-size:11px;color:#a5a2b7;line-height:1.55;margin:8px 0 12px}',
 '.deck-mixer .dm-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:11px 0}',
 '.deck-mixer label{font-size:11px;color:#ddd4db}',
 '.deck-mixer select,.deck-mixer input[type=number]{background:#141624;color:#e9deea;border:1px solid #56546f;border-radius:7px;padding:7px;width:100%;font:inherit}',
 '.deck-mixer input[type=range]{width:100%;accent-color:#f0c28e;margin:6px 0 10px}',
 '.deck-mixer .dm-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
 '.deck-mixer .dm-grid label{display:grid;gap:5px;min-width:0}',
 '.deck-mixer .dm-actions{display:flex;gap:6px;margin-top:13px}',
 '.deck-mixer button{flex:1;background:#2d2a43;color:#ffe1bd;border:1px solid #685b7a;border-radius:8px;padding:9px 5px;cursor:pointer;font:11px system-ui}',
 '.deck-mixer button:hover{background:#423956}',
 '.deck-mixer .dm-hint{display:flex;justify-content:space-between;align-items:center;color:#c0b2cd;font:10px system-ui}',
 '.deck-mixer .dm-hint b{color:#f5d69f}',
 '.deck-mixer .dm-details[hidden]{display:none}',
 '.deck-mixer .dm-deck{border-top:1px solid #554767;margin-top:12px;padding-top:11px}',
 '.deck-mixer input[type=checkbox]{accent-color:#f0c28e}'
].join('\n');
function create({root,getA,onChange,onSwap,renderGeometry}){
 if(!root||typeof getA!=='function')throw Error('Deck mixer requires root and getA');
 const st=document.createElement('style');st.textContent=css;document.head.append(st);
 let deckB=cleanDeck({}),mix=cleanMix({});
 root.innerHTML=[
  '<h2>⊞ Dual-Deck Visual Mixer</h2>',
  '<p class="dm-muted">Blend a shader world on Deck A into any mathematical world or Sacred Geometry on Deck B. Both respond to the existing VJ LAB.</p>',
  '<label class="dm-row">Enable A/B deck mixing <input id="dmEnabled" type="checkbox"></label>',
  '<div class="dm-details" id="dmDetails" hidden>',
  '<div class="dm-hint"><b>DECK A</b><b>DECK B</b></div>',
  '<input id="dmFader" type="range" min="0" max="100" step="1" value="0" aria-label="Visual crossfader">',
  '<div class="dm-hint"><span>100% A</span><b id="dmPercent">A 100 / B 0</b><span>100% B</span></div>',
  '<label class="dm-row">Transition <select id="dmStyle"><option value="blend">Smooth blend</option><option value="wipe">Left-to-right wipe</option><option value="iris">Expanding iris</option></select></label>',
  '<div class="dm-deck"><div class="dm-hint"><b>DECK B / EQUATION</b><span>Independent artwork</span></div>',
  '<div class="dm-grid" id="dmShaderControls">',
  '<label>World<select id="dmMode"><option value="0">Galaxy Cluster</option><option value="1">Nested Foam</option><option value="2">Resonance Field</option><option value="3">Golden Bloom</option><option value="4">Chromatic Warp</option><option value="5">Sacred Geometry Lab</option></select></label>',
  '<label>Palette<select id="dmPalette"><option value="0">Astral Rose</option><option value="1">Ion Blue</option><option value="2">Bioluminescent</option><option value="3">Solar Flare</option><option value="4">Silver Ghost</option><option value="5">VGA Spectrum</option></select></label>',
  '<label>Seed<input id="dmSeed" type="number" min="0" max="999999" step="1"></label>',
  '<label>Warp pattern<select id="dmPattern"><option value="0">Liquid Rings</option><option value="1">Solar Spokes</option><option value="2">Twin Wells</option><option value="3">Woven Grid</option><option value="4">Liquid Moiré</option><option value="5">Kaleido Flower</option></select></label>',
  ...[['density','Density',15,100],['spiral','Harmonics',20,300],['warp','Deformation',0,200],
     ['glow','Luminosity',25,250],['zoom','Zoom',50,220]].map(([k,label,min,max])=>
      '<label>'+label+' <output id="dmOut-'+k+'"></output><input id="dm-'+k+'" type="range" min="'+min+'" max="'+max+'" step="1"></label>'),
  '</div>',
  '<div id="dmGeometryControls" class="dm-deck" hidden>',
  '<label>Geometry construction<select id="dmGeometryPreset"><option value="flower">Flower of Life</option><option value="metatron">13-point chords</option><option value="stars">Interlaced stars</option><option value="mandala">Polar mandala</option><option value="phi">Golden spirals</option><option value="live">My Geometry Lab composition</option></select></label>',
  '<button id="dmEditGeometry" type="button" style="width:100%;margin-top:9px">✎ Open Geometry Lab editor</button>',
  '<p class="dm-muted">Preset geometries respond to VJ LAB automatically. My Geometry Lab uses your saved layer and audio-response settings. Return from its editor to watch the crossfade.</p>',
  '</div>',
  '<div class="dm-actions"><button id="dmClone" type="button">Copy A → B</button><button id="dmRandom" type="button">Random B</button><button id="dmSwap" type="button">Swap A ↔ B</button></div>',
  '<p class="dm-muted">Visuals only, not an audio crossfader. MIDI Learn in VJ LAB can control the fader. Use [ and ] to nudge by 5%.</p>',
  '</div></div>'
 ].join('');
 const el=id=>root.querySelector('#'+id),emit=()=>{if(onChange)onChange();};
 const sync=()=>{
  el('dmEnabled').checked=mix.enabled;el('dmDetails').hidden=!mix.enabled;
  el('dmFader').value=mix.crossfade;el('dmPercent').textContent='A '+(100-mix.crossfade)+' / B '+mix.crossfade;
  el('dmStyle').value=mix.style;el('dmMode').value=deckB.mode;
  el('dmPalette').value=deckB.palette;el('dmSeed').value=deckB.seed;el('dmPattern').value=deckB.acidPattern;
  el('dmGeometryPreset').value=deckB.geometryPreset;
  el('dmGeometryControls').hidden=deckB.mode!==5;
  for(const field of el('dmShaderControls').querySelectorAll('label')){
   if(field.querySelector('#dmMode'))continue;
   field.hidden=deckB.mode===5;
  }
  el('dmSwap').disabled=deckB.mode===5;
  el('dmSwap').title=deckB.mode===5?'Deck A is shader-only; choose a shader for Deck B to swap.':'';
  for(const k of ['density','spiral','warp','glow','zoom']){el('dm-'+k).value=deckB[k];el('dmOut-'+k).textContent=String(deckB[k]);}
 };
 el('dmEnabled').addEventListener('change',e=>{mix.enabled=e.target.checked;sync();emit();});
 el('dmFader').addEventListener('input',e=>{mix.crossfade=Math.round(clamp(e.target.value,0,100));sync();emit();});
 el('dmStyle').addEventListener('change',e=>{mix.style=['blend','wipe','iris'].includes(e.target.value)?e.target.value:'blend';sync();emit();});
 for(const [id,k] of [['dmMode','mode'],['dmPalette','palette'],['dmSeed','seed'],['dmPattern','acidPattern'],
  ...['density','spiral','warp','glow','zoom'].map(x=>['dm-'+x,x])]){
  el(id).addEventListener('input',e=>{deckB=cleanDeck({[k]:Number(e.target.value)},deckB);sync();emit();});
 }
 el('dmGeometryPreset').addEventListener('change',e=>{deckB.geometryPreset=e.target.value;sync();emit();});
 el('dmEditGeometry').addEventListener('click',()=>{global.PhiGeometryLab?.instance?.activate(true);});
 el('dmClone').addEventListener('click',()=>{deckB=cleanDeck(getA());sync();emit();});
 el('dmRandom').addEventListener('click',()=>{if(deckB.mode===5){const options=['flower','metatron','stars','mandala','phi'];deckB.geometryPreset=options[Math.floor(Math.random()*options.length)];}else deckB.seed=1+Math.floor(Math.random()*999999);sync();emit();});
 el('dmSwap').addEventListener('click',()=>{
  if(deckB.mode===5||typeof onSwap!=='function')return; // Main Deck A supports shader modes 0–4 only.
  const previous=onSwap({...deckB});deckB=cleanDeck(previous);sync();emit();
 });
 sync();
 let gpu=null,cpu=null;
 const styleNumber=()=>['blend','wipe','iris'].indexOf(mix.style);
 function compile(gl,kind,src){
  const shader=gl.createShader(kind);gl.shaderSource(shader,src);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('Mixer shader: '+error);}
  return shader;
 }
 function initGPU(gl){
  const vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const e=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw Error('Mixer link: '+e);}
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  gpu={gl,program,buffer,w:0,h:0,slots:[],attrib:gl.getAttribLocation(program,'a_position'),
   a:gl.getUniformLocation(program,'u_sceneA'),b:gl.getUniformLocation(program,'u_sceneB'),
   resolution:gl.getUniformLocation(program,'u_resolution'),crossfade:gl.getUniformLocation(program,'u_crossfade'),
   style:gl.getUniformLocation(program,'u_style')};
 }
 function ensureSlots(gl,w,h){
  if(gpu.w===w&&gpu.h===h)return;
  for(const slot of gpu.slots){gl.deleteFramebuffer(slot.fbo);gl.deleteTexture(slot.texture);}
  gpu.slots=[];gpu.w=w;gpu.h=h;
  const previous=gl.getParameter(gl.FRAMEBUFFER_BINDING);
  for(let i=0;i<2;i++){
   const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Cannot allocate dual-deck render target.');
   gpu.slots.push({fbo,texture});
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,previous);
 }
 function drawGL(gl,canvas,renderWorld){
  if(!mix.enabled)return false;
  if(!gpu||gpu.gl!==gl)initGPU(gl);
  // Two costly procedural shaders: use 70% source resolution and composite to full output.
  const w=Math.max(2,Math.round(canvas.width*.7)),h=Math.max(2,Math.round(canvas.height*.7));
  ensureSlots(gl,w,h);
  renderWorld(getA(),gpu.slots[0].fbo,w,h);
  if(deckB.mode===5){
   if(typeof renderGeometry!=='function')throw Error('Geometry deck renderer unavailable');
   if(!gpu.geometryCanvas){gpu.geometryCanvas=document.createElement('canvas');gpu.geometryCtx=gpu.geometryCanvas.getContext('2d',{alpha:false});}
   if(!gpu.geometryCtx)throw Error('No 2D context for geometry texture');
   const g=gpu.geometryCanvas;
   if(g.width!==w)g.width=w;
   if(g.height!==h)g.height=h;
   if(renderGeometry(deckB,gpu.geometryCtx,g)===false)throw Error('Geometry deck draw failed');
   // Upload as a texture attached to slot B, never render into its FBO from the CPU.
   // Canvas rows are top-down: flip once on upload for correct GL UV orientation.
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,gpu.slots[1].texture);
   const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   try{gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,g);}
   finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);}
  }else renderWorld(deckB,gpu.slots[1].fbo,w,h);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
  gl.useProgram(gpu.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);gl.enableVertexAttribArray(gpu.attrib);
  gl.vertexAttribPointer(gpu.attrib,2,gl.FLOAT,false,0,0);
  for(let i=0;i<2;i++){gl.activeTexture(i===0?gl.TEXTURE0:gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,gpu.slots[i].texture);}
  gl.uniform1i(gpu.a,0);gl.uniform1i(gpu.b,1);
  gl.uniform2f(gpu.resolution,canvas.width,canvas.height);
  gl.uniform1f(gpu.crossfade,mix.crossfade/100);gl.uniform1i(gpu.style,styleNumber());
  gl.drawArrays(gl.TRIANGLES,0,6);gl.activeTexture(gl.TEXTURE0);
  return true;
 }
 function drawCPU(ctx,canvas,renderWorld){
  if(!mix.enabled)return false;
  if(!cpu){
   const make=()=>{const c=document.createElement('canvas');return {c,ctx:c.getContext('2d',{alpha:false})};};
   cpu=[make(),make()];
  }
  const w=Math.max(2,Math.round(canvas.width*.68)),h=Math.max(2,Math.round(canvas.height*.68));
  for(let i=0;i<2;i++){
   if(cpu[i].c.width!==w)cpu[i].c.width=w;
   if(cpu[i].c.height!==h)cpu[i].c.height=h;
   if(i===1&&deckB.mode===5){
    if(typeof renderGeometry!=='function'||renderGeometry(deckB,cpu[i].ctx,cpu[i].c)===false)throw Error('Geometry deck draw failed');
   }else renderWorld(i===0?getA():deckB,cpu[i].ctx,cpu[i].c);
  }
  const t=mix.crossfade/100;
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.drawImage(cpu[0].c,0,0,canvas.width,canvas.height);
  if(t>0){
   ctx.save();
   if(mix.style==='wipe'){ctx.beginPath();ctx.rect(0,0,canvas.width*t,canvas.height);ctx.clip();}
   else if(mix.style==='iris'){ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,Math.hypot(canvas.width,canvas.height)*.5*t,0,Math.PI*2);ctx.clip();}
   else ctx.globalAlpha=t;
   ctx.drawImage(cpu[1].c,0,0,canvas.width,canvas.height);ctx.restore();
  }
  ctx.restore();return true;
 }
 function restore(raw){
  // Old recipes have no mixer data: remain single-deck on load.
  mix=cleanMix(raw);deckB=cleanDeck(raw?.deckB);sync();emit();
 }
 function exportSettings(){return {...mix,deckB:{...deckB}};}
 function setCrossfade(value){mix.crossfade=Math.round(clamp(value,0,1)*100);sync();emit();}
 function nudge(amount){setCrossfade((mix.crossfade+amount)/100);}
 function disable(){mix.enabled=false;sync();}
 return {drawGL,drawCPU,restore,exportSettings,setCrossfade,nudge,disable,
  get enabled(){return mix.enabled;},get crossfade(){return mix.crossfade;},
  get deckB(){return {...deckB};}};
}
global.PhiDeckMixer={create,cleanDeck,cleanMix,vertex,fragment};
})(window);
