/* PhiMath Atelier v0.5.0 - Sacred Geometry Laboratory.
 * Independently constructed Euclidean and polar geometry. No dependencies, no eval.
 * This optional 2D canvas lives over the existing GPU/Dual Deck stage. */
(function(global){
'use strict';
const TAU=Math.PI*2, PHI=(1+Math.sqrt(5))/2;
const TYPES=['metatron','flower','star','polygon','rose','spiral','rings'];
const COLORS=['#efc889','#b8d5f2','#72d9d2','#e8a2dd','#f0efea','#a6a0f1'];
const PRESETS={
 metatron:[{type:'metatron',radius:.84,color:COLORS[0],angle:0},{type:'rings',n:3,radius:.97,color:COLORS[4],opacity:.32}],
 flower:[{type:'flower',depth:2,radius:.83,color:COLORS[0]},{type:'rings',n:4,radius:.98,color:COLORS[1],opacity:.36}],
 stars:[{type:'star',n:7,step:2,radius:.91,color:COLORS[0],speed:1},{type:'star',n:11,step:4,radius:.73,color:COLORS[1],speed:-.7},{type:'rings',n:3,radius:.98,color:COLORS[4],opacity:.55}],
 mandala:[{type:'rose',n:12,radius:.89,color:COLORS[3],speed:.45},{type:'star',n:12,step:5,radius:.86,color:COLORS[0],speed:-.7},{type:'rings',n:5,radius:.98,color:COLORS[1],opacity:.45}],
 phi:[{type:'spiral',n:5,turns:4,radius:.94,color:COLORS[0],speed:.3},{type:'rings',n:5,radius:.98,color:COLORS[1],opacity:.28}]
};
function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function int(value,min,max,fallback){return Math.round(clamp(value,min,max,fallback));}
function layer(input){
 const a=input&&typeof input==='object'?input:{};
 return {type:TYPES.includes(a.type)?a.type:'star',
  n:int(a.n,3,24,7),step:int(a.step,1,12,2),depth:int(a.depth,0,3,2),
  turns:int(a.turns,1,8,4),radius:clamp(a.radius,.1,1,.83),
  angle:clamp(a.angle,-360,360,0),speed:clamp(a.speed,-2,2,1),
  color:typeof a.color==='string'&&/^#[a-f0-9]{6}$/i.test(a.color)?a.color:COLORS[0],
  opacity:clamp(a.opacity,.1,1,.85),visible:a.visible!==false};
}
function preset(name){return (PRESETS[name]||PRESETS.metatron).map(layer);}
function sanitizeRecipe(data){
 const raw=data&&typeof data==='object'?(data.geometry||data):null;
 if(!raw||!Array.isArray(raw.layers)||raw.layers.length===0||raw.layers.length>12)throw Error('Recipe requires 1–12 layers');
 return {layers:raw.layers.map(layer),selected:int(raw.selected,0,raw.layers.length-1,0),
  motion:clamp(raw.motion,0,120,12),paused:raw.paused===true,
  background:['ink','midnight','parchment'].includes(raw.background)?raw.background:'ink'};
}
function initial(){return {layers:preset('metatron'),selected:0,motion:12,paused:false,background:'ink'};}
const point=(radius,a)=>[radius*Math.cos(a),radius*Math.sin(a)];
function poly(points,closed){return {points,closed:!!closed};}
function circle(x,y,r,segments=96){
 const pts=[];for(let i=0;i<segments;i++)pts.push([x+r*Math.cos(TAU*i/segments),y+r*Math.sin(TAU*i/segments)]);
 return poly(pts,true);
}
function hexCells(depth){
 const centers=[];for(let q=-depth;q<=depth;q++)for(let r=-depth;r<=depth;r++){
  if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=depth)centers.push([q+r/2,r*Math.sqrt(3)/2]);
 }return centers;
}
function geometry(src){
 const l=layer(src),R=l.radius,paths=[];
 if(l.type==='rings'){for(let j=1;j<=l.n;j++)paths.push(circle(0,0,R*j/l.n));}
 if(l.type==='flower'){
  const d=l.depth,rad=R/(d+1);
  for(const [x,y] of hexCells(d))paths.push(circle(x*rad,y*rad,rad));
 }
 if(l.type==='metatron'){
  const pts=[[0,0]];
  for(let j=0;j<6;j++)pts.push(point(R*.35,TAU*j/6-Math.PI/2));
  for(let j=0;j<6;j++)pts.push(point(R*.73,TAU*j/6-Math.PI/2));
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)paths.push(poly([pts[i],pts[j]],false));
  for(const p of pts)paths.push(circle(p[0],p[1],R*.22,72));
 }
 if(l.type==='polygon'||l.type==='star'){
  const n=l.n,step=l.type==='polygon'?1:l.step%n||1;
  const vertices=Array.from({length:n},(_,j)=>point(R,TAU*j/n-Math.PI/2));
  const visited=new Set();
  for(let start=0;start<n;start++){
   if(visited.has(start))continue;
   const pts=[];let index=start;
   do{pts.push(vertices[index]);visited.add(index);index=(index+step)%n;}while(index!==start&&!visited.has(index));
   if(pts.length>1)paths.push(poly(pts,true));
  }
 }
 if(l.type==='rose'){
  const points=[];for(let i=0;i<=840;i++){
   const t=TAU*i/840,rad=R*Math.cos(l.n*t);
   points.push(point(rad,t));
  }paths.push(poly(points,false));
 }
 if(l.type==='spiral'){
  for(let arm=0;arm<l.n;arm++){
   const pts=[],offset=TAU*arm/l.n,steps=l.turns*100;
   for(let j=0;j<=steps;j++){
    const th=TAU*l.turns*j/steps,rad=R*Math.pow(PHI,(th-TAU*l.turns)/(Math.PI/2));
    pts.push(point(rad,th+offset));
   }paths.push(poly(pts,false));
  }
 }
 return paths;
}
function equation(src){
 const l=layer(src),R=l.radius.toFixed(2),alpha=l.angle.toFixed(0);
 switch(l.type){
  case 'metatron':return '13 centers: c₀=(0,0); cᵢ=ρ(cos θᵢ,sin θᵢ), θᵢ=2πi/6. Connect each pair of 13 centers (78 chords); draw 13 equal circles.';
  case 'flower':return 'c(q,r)=a(q+r/2, √3·r/2), max(|q|,|r|,|q+r|)≤'+l.depth+'; draw equal circles of radius a='+ (l.radius/(l.depth+1)).toFixed(3)+'.';
  case 'star':return 'vⱼ='+R+'(cos(2πj/'+l.n+'+α), sin(2πj/'+l.n+'+α)); connect j → (j+'+l.step+') mod '+l.n+'; α='+alpha+'°. All cycles are traced.';
  case 'polygon':return 'vⱼ='+R+'(cos(2πj/'+l.n+'+α), sin(2πj/'+l.n+'+α)); connect consecutive vertices; α='+alpha+'°.';
  case 'rose':return 'r(θ)='+R+' cos('+l.n+'θ), x=r cos θ, y=r sin θ, θ∈[0,2π].';
  case 'spiral':return 'r(θ)='+R+' φ^((θ−2π·'+l.turns+')/(π/2)), φ=(1+√5)/2, θ∈[0,2π·'+l.turns+']; '+l.n+' rotated arms.';
  default:return 'rⱼ='+R+'·j/'+l.n+', j=1,…,'+l.n+'; x=rⱼ cos θ, y=rⱼ sin θ.';
 }
}
function distance2(px,py,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
 const t=den?Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/den)):0;
 const x=a[0]+t*dx,y=a[1]+t*dy;
 return (px-x)*(px-x)+(py-y)*(py-y);
}
const css=[
 '.geometry-lab{border:1px solid #78614a;border-radius:15px;background:linear-gradient(160deg,#292016,#111722);padding:14px;margin:15px 0 24px}',
 '.geometry-lab h2{margin:0 0 6px;color:#f5d49d;font:21px Georgia,serif}',
 '.geometry-lab .gl-note{color:#bdb2a6;font-size:11px;line-height:1.5;margin:8px 0}',
 '.geometry-lab button,.geometry-lab select,.geometry-lab input[type=number]{background:#212335;border:1px solid #645b59;color:#faeedb;border-radius:8px;padding:8px;min-height:34px;font-size:11px}',
 '.geometry-lab button{cursor:pointer}.geometry-lab button:hover{border-color:#efd4a6}',
 '.geometry-lab button:focus-visible,.geometry-lab select:focus-visible,.geometry-lab input:focus-visible{outline:2px solid #f5d49d;outline-offset:2px}',
 '.geometry-lab #glGo{width:100%;background:#795739;font-size:12px;font-weight:bold}',
 '.geometry-lab .gl-row{display:grid;gap:6px;margin-top:12px;color:#ddd3c8;font-size:11px}',
 '.geometry-lab .gl-row input[type=range]{width:100%;accent-color:#e4b97b}',
 '.geometry-lab .gl-two{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}',
 '.geometry-lab .gl-two button{min-width:0}',
 '.geometry-lab .gl-layer-list{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}',
 '.geometry-lab .gl-layer-list button{flex:1 1 95px;text-align:left}',
 '.geometry-lab .gl-layer-list button[aria-pressed=true]{border-color:#eed09a;background:#483b39}',
 '.geometry-lab .gl-equation{margin:11px 0;background:#101421;border:1px solid #474251;color:#e0d7c9;border-radius:10px;padding:10px;line-height:1.55;font:12px/1.65 ui-monospace,monospace;overflow-wrap:anywhere}',
 '.geometry-lab .gl-warn{margin-top:12px;color:#aeb1c3;font-size:10px;line-height:1.5}',
 '.geometry-lab .gl-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}',
 '#geometryCanvas{position:absolute;inset:0;z-index:2;width:100%;height:100%;touch-action:manipulation;cursor:crosshair}',
 '#geometryCanvas[hidden]{display:none}',
 '.stage.geometry-active .overlay-top,.stage.geometry-active .overlay-bottom{display:none}',
 '.gl-stage-label{position:absolute;z-index:3;left:16px;top:15px;background:#0a0c14c9;border:1px solid #a8896255;border-radius:10px;padding:10px 13px;color:#f4d6a6;font:14px Georgia,serif;pointer-events:none}',
 '.gl-stage-label span{display:block;font:10px system-ui;color:#c4b6b1;margin-top:4px}',
 '.gl-stage-label[hidden]{display:none}',
 '@media(max-width:540px){.gl-stage-label{top:8px;left:8px;padding:6px 9px;font-size:12px}}'
].join('\n');
function create({root,canvas,stage}){
 if(!root||!canvas||!stage)throw Error('Geometry lab needs mount point, canvas and stage.');
 const sty=document.createElement('style');sty.textContent=css;document.head.append(sty);
 root.innerHTML=[
 '<h2>◇ Sacred Geometry Lab</h2>',
 '<p class="gl-note">Construct, animate and inspect geometric diagrams. Each line comes from explicit mathematics, not supernatural claims.</p>',
 '<button type="button" id="glGo" aria-pressed="false">Enter Geometry Lab</button>',
 '<div id="glPanel" hidden>',
 '<label class="gl-row">Starting construction<select id="glPreset"><option value="metatron">13-circle Metatron construction</option><option value="flower">Flower of Life</option><option value="stars">Interlaced star polygons</option><option value="mandala">Polar mandala</option><option value="phi">Golden logarithmic spirals</option></select></label>',
 '<div class="gl-row"><strong>Geometric layers</strong><div id="glLayers" class="gl-layer-list" role="group" aria-label="Choose layer to inspect"></div></div>',
 '<div class="gl-two"><button type="button" id="glAdd">+ Add layer</button><button type="button" id="glRemove">− Remove layer</button></div>',
 '<label class="gl-row">Formula family<select id="glType"><option value="metatron">13-point chords</option><option value="flower">Hexagonal flower circles</option><option value="star">Star polygon</option><option value="polygon">Regular polygon</option><option value="rose">Polar rose</option><option value="spiral">φ logarithmic spiral</option><option value="rings">Concentric circles</option></select></label>',
 '<label class="gl-row">Vertices / arms / rings: <output id="glNOut"></output><input id="glN" type="range" min="3" max="24" step="1"></label>',
 '<label class="gl-row">Vertex step: <output id="glStepOut"></output><input id="glStep" type="range" min="1" max="12" step="1"></label>',
 '<label class="gl-row">Flower depth: <output id="glDepthOut"></output><input id="glDepth" type="range" min="0" max="3" step="1"></label>',
 '<label class="gl-row">Spiral turns: <output id="glTurnsOut"></output><input id="glTurns" type="range" min="1" max="8" step="1"></label>',
 '<label class="gl-row">Radius: <output id="glRadiusOut"></output><input id="glRadius" type="range" min="10" max="100" step="1"></label>',
 '<label class="gl-row">Rotation: <output id="glAngleOut"></output><input id="glAngle" type="range" min="-180" max="180" step="1"></label>',
 '<label class="gl-row">Opacity: <output id="glOpacityOut"></output><input id="glOpacity" type="range" min="10" max="100" step="1"></label>',
 '<label class="gl-row">Spin direction and rate: <output id="glSpeedOut"></output><input id="glSpeed" type="range" min="-200" max="200" step="10"></label>',
 '<label class="gl-row">Stroke color<input id="glColor" type="color" value="#efc889"></label>',
 '<label class="gl-row"><span><input id="glVisible" type="checkbox" checked> Layer visible</span></label>',
 '<div class="gl-note">Exact construction of selected layer:</div><div class="gl-equation" id="glEquation" aria-live="polite"></div>',
 '<label class="gl-row">Global rotation: <output id="glMotionOut"></output><input id="glMotion" type="range" min="0" max="120" step="1"></label>',
 '<label class="gl-row">Background<select id="glBg"><option value="ink">Arcane ink</option><option value="midnight">Nebula midnight</option><option value="parchment">Warm parchment</option></select></label>',
 '<div class="gl-two"><button type="button" id="glPause">Ⅱ Pause motion</button><button type="button" id="glReset">↺ Reset preset</button></div>',
 '<div class="gl-actions"><button type="button" id="glPNG">↓ Geometry PNG</button><button type="button" id="glJSON">↓ Recipe JSON</button><button type="button" id="glImport">↑ Import recipe</button><button type="button" id="glFullscreen">⛶ Fullscreen stage</button></div>',
 '<input id="glFile" type="file" accept=".json,application/json" hidden>',
 '<p class="gl-warn">Uses its own Canvas2D stage and exports, separate from the five GPU worlds and dual-deck recorder. Recipes contain geometry only. Original artwork remains untouched.</p>',
 '<p id="glStatus" class="gl-note" role="status" aria-live="polite">Click a layer or one of its visible strokes to inspect the construction.</p>',
 '</div>'
 ].join('');
 const $=id=>root.querySelector('#'+id), label=document.createElement('div');
 label.className='gl-stage-label';label.hidden=true;
 label.innerHTML='◇ Sacred Geometry Laboratory<span>Click a line to select its mathematical layer · 100% locally generated</span>';
 stage.append(label);
 let state=initial(),active=false,clock=0,last=0,raf=0,buffer=new Map();
 const context=canvas.getContext('2d');
 if(!context){$('glGo').disabled=true;$('glGo').textContent='Canvas2D unavailable';return null;}
 const save=()=>{try{localStorage.setItem('phimath-geometry-v1',JSON.stringify(state));}catch(_){}};
 try{const saved=localStorage.getItem('phimath-geometry-v1');if(saved)state=sanitizeRecipe(JSON.parse(saved));}catch(_){}
 const status=s=>{$('glStatus').textContent=s;};
 function drawPaths(l){const key=[l.type,l.n,l.step,l.depth,l.turns,l.radius].join('/');
  if(!buffer.has(key))buffer.set(key,geometry(l));
  return buffer.get(key);
 }
 function angle(l,i){return l.angle*Math.PI/180+(state.paused?clock:clock)*state.motion*Math.PI/180*l.speed*(i%2?-1:1);}
 function paint(ctx,w,h){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,w,h);
  const dark=state.background!=='parchment',min=Math.min(w,h);
  ctx.fillStyle=state.background==='parchment'?'#f2e8d6':state.background==='midnight'?'#050b22':'#08080e';
  ctx.fillRect(0,0,w,h);
  if(dark){
   const grad=ctx.createRadialGradient(w/2,h/2,10,w/2,h/2,min*.72);
   grad.addColorStop(0,state.background==='midnight'?'#17223d':'#251b25');grad.addColorStop(1,'#05060b');
   ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  }
  const scale=min*.455;
  for(let i=0;i<state.layers.length;i++){
   const l=state.layers[i];if(!l.visible)continue;
   ctx.save();ctx.translate(w/2,h/2);ctx.rotate(angle(l,i));ctx.scale(scale,scale);
   ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=(i===state.selected?1.8:1.15)/scale;
   ctx.strokeStyle=state.background==='parchment'&&l.color==='#f0efea'?'#554d42':l.color;
   ctx.shadowColor=l.color;ctx.shadowBlur=dark?11:0;
   ctx.globalAlpha=l.opacity*(i===state.selected?1:.8);
   for(const line of drawPaths(l)){
    const pts=line.points;if(pts.length<2)continue;
    ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let j=1;j<pts.length;j++)ctx.lineTo(pts[j][0],pts[j][1]);
    if(line.closed)ctx.closePath();ctx.stroke();
   }
   ctx.restore();
  }
  ctx.setTransform(1,0,0,1,0,0);
  // Deliberately use the same renderer for on-screen visuals and PNG capture.
 }
 function resize(){
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  let w=Math.round(r.width*Math.min(1.5,global.devicePixelRatio||1));
  let h=Math.round(r.height*Math.min(1.5,global.devicePixelRatio||1));
  const ratio=Math.min(1,Math.sqrt(2000000/(w*h)));
  w=Math.max(2,Math.round(w*ratio));h=Math.max(2,Math.round(h*ratio));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 }
 function frame(now){
  if(!active)return;
  if(last&&!state.paused)clock+=Math.min(.08,Math.max(0,(now-last)/1000));
  last=now;resize();paint(context,canvas.width,canvas.height);
  raf=requestAnimationFrame(frame);
 }
 function activate(next){
  active=!!next;canvas.hidden=!active;label.hidden=!active;stage.classList.toggle('geometry-active',active);
  $('glPanel').hidden=!active;$('glGo').setAttribute('aria-pressed',String(active));
  $('glGo').textContent=active?'← Return to Atelier worlds':'Enter Geometry Lab';
  if(active){last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
  else{cancelAnimationFrame(raf);raf=0;}
 }
 const slug=t=>({metatron:'Chords',flower:'Flower',star:'Star',polygon:'Polygon',rose:'Rose',spiral:'Phi spiral',rings:'Rings'})[t]||t;
 function sync(){
  const l=state.layers[state.selected];
  $('glLayers').replaceChildren();
  state.layers.forEach((item,i)=>{
   const b=document.createElement('button');b.type='button';b.textContent=(i+1)+'. '+slug(item.type);
   b.setAttribute('aria-pressed',String(i===state.selected));
   b.addEventListener('click',()=>{state.selected=i;sync();save();});
   $('glLayers').append(b);
  });
  $('glType').value=l.type;
  for(const key of ['n','step','depth','turns','radius','angle','opacity','speed']){
   const input=$('gl'+key[0].toUpperCase()+key.slice(1));
   const v=key==='radius'||key==='opacity'?Math.round(l[key]*100):key==='speed'?Math.round(l[key]*100):l[key];
   input.value=v;$(input.id+'Out').textContent=key==='radius'||key==='opacity'?v+'%':key==='speed'?(v/100).toFixed(1)+'×':key==='angle'?v+'°':String(v);
  }
  $('glColor').value=l.color;$('glVisible').checked=l.visible;
  $('glMotion').value=state.motion;$('glMotionOut').textContent=state.motion+'°/s';
  $('glBg').value=state.background;$('glPause').textContent=state.paused?'▶ Resume motion':'Ⅱ Pause motion';
  $('glEquation').textContent=equation(l);
  $('glStep').disabled=l.type!=='star';$('glDepth').disabled=l.type!=='flower';$('glTurns').disabled=l.type!=='spiral';
  $('glN').disabled=l.type==='flower'||l.type==='metatron';
  $('glRemove').disabled=state.layers.length===1;$('glAdd').disabled=state.layers.length>=12;
 }
 function updateLayer(key,value){const next={...state.layers[state.selected],[key]:value};state.layers[state.selected]=layer(next);buffer.clear();sync();save();}
 const events=['n','step','depth','turns','radius','angle','opacity','speed','color','visible','type'];
 for(const key of events){
  const input=$('gl'+key[0].toUpperCase()+key.slice(1));
  input.addEventListener(key==='type'||key==='visible'?'change':'input',()=>{
   let v=key==='type'?input.value:key==='visible'?input.checked:key==='color'?input.value:Number(input.value);
   if(['radius','opacity','speed'].includes(key))v/=100;
   updateLayer(key,v);
  });
 }
 $('glGo').addEventListener('click',()=>activate(!active));
 $('glPreset').addEventListener('change',e=>{state.layers=preset(e.target.value);state.selected=0;clock=0;buffer.clear();sync();save();status('Construction loaded. Every layer is editable.');});
 $('glAdd').addEventListener('click',()=>{if(state.layers.length>=12)return;state.layers.push(layer({type:'star',n:9,step:2,color:COLORS[state.layers.length%COLORS.length],radius:.7}));state.selected=state.layers.length-1;sync();save();});
 $('glRemove').addEventListener('click',()=>{if(state.layers.length<=1)return;state.layers.splice(state.selected,1);state.selected=Math.min(state.selected,state.layers.length-1);sync();save();});
 $('glMotion').addEventListener('input',e=>{state.motion=Number(e.target.value);sync();save();});
 $('glBg').addEventListener('change',e=>{state.background=e.target.value;sync();save();});
 $('glPause').addEventListener('click',()=>{state.paused=!state.paused;sync();save();});
 $('glReset').addEventListener('click',()=>{state.layers=preset($('glPreset').value);state.selected=0;clock=0;buffer.clear();sync();save();});
 canvas.addEventListener('pointerdown',event=>{
  if(!active)return;
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;
  const scale=Math.min(canvas.width,canvas.height)*.455,threshold=Math.pow(11/scale,2);
  for(let i=state.layers.length-1;i>=0;i--){
   const l=state.layers[i];if(!l.visible)continue;
   const a=-angle(l,i),px=(x-canvas.width/2)/scale,py=(y-canvas.height/2)/scale;
   const lx=px*Math.cos(a)-py*Math.sin(a),ly=px*Math.sin(a)+py*Math.cos(a);
   let found=false;
   for(const line of drawPaths(l)){
    const pts=line.points;for(let j=1;j<pts.length;j++){
     if(distance2(lx,ly,pts[j-1],pts[j])<=threshold){found=true;break;}
    }
    if(!found&&line.closed&&pts.length>1&&distance2(lx,ly,pts[pts.length-1],pts[0])<=threshold)found=true;
    if(found)break;
   }
   if(found){state.selected=i;sync();save();status('Selected '+slug(l.type)+' by its geometric stroke.');break;}
  }
 });
 const filename=(ext)=>'phimath-geometry-'+Date.now()+'.'+ext;
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 $('glPNG').addEventListener('click',()=>{
  const w=Math.max(2,canvas.width),h=Math.max(2,canvas.height);
  const gain=Math.min(2.5,Math.sqrt(5000000/(w*h)));
  const exportCanvas=document.createElement('canvas');exportCanvas.width=Math.round(w*gain);exportCanvas.height=Math.round(h*gain);
  paint(exportCanvas.getContext('2d'),exportCanvas.width,exportCanvas.height);
  exportCanvas.toBlob(blob=>{if(blob){download(blob,filename('png'));status('Geometry PNG saved.');}else status('PNG export unavailable in this browser.');},'image/png');
 });
 $('glJSON').addEventListener('click',()=>{download(new Blob([JSON.stringify({app:'PhiMath Atelier',version:'0.5.0',geometry:state},null,2)],{type:'application/json'}),filename('json'));status('Geometry-only recipe exported.');});
 $('glImport').addEventListener('click',()=>$('glFile').click());
 $('glFile').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;
  try{if(file.size>120000)throw Error('recipe too large');
   state=sanitizeRecipe(JSON.parse(await file.text()));buffer.clear();clock=0;sync();save();activate(true);status('Geometry recipe imported.');
  }catch(err){status('Could not load recipe: '+err.message);}
  e.target.value='';
 });
 $('glFullscreen').addEventListener('click',()=>{if(stage.requestFullscreen)stage.requestFullscreen().catch(()=>status('Fullscreen not available.'));else status('Fullscreen not supported in this browser.');});
 document.querySelectorAll('.mode').forEach(button=>button.addEventListener('click',()=>{if(active)activate(false);}));
 sync();
 return {activate,getState:()=>JSON.parse(JSON.stringify(state)),setState:raw=>{state=sanitizeRecipe(raw);buffer.clear();sync();save();}};
}
global.PhiGeometryLab={geometry,equation,hexCells,layer,sanitizeRecipe,preset,create,PHI};
if(typeof document!=='undefined'){
 const mount=()=>{const root=document.getElementById('geometryLab'),canvas=document.getElementById('geometryCanvas'),stage=document.getElementById('stage');
  if(root&&canvas&&stage){try{global.PhiGeometryLab.instance=create({root,canvas,stage});}catch(e){console.error('Geometry lab:',e);}}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
})(typeof window!=='undefined'?window:globalThis);
