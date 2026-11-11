(function(){
'use strict';
const api=window.PhiFoldMesh;
if(!api){document.getElementById('status').textContent='FoldMesh core could not load';return;}
const $=id=>document.getElementById(id);
const canvas=$('foldCanvas'),ctx=canvas.getContext('2d',{alpha:false});
if(!ctx){$('status').textContent='Canvas 2D is unavailable';return;}
let A=api.makeCube('A',369),B=api.makeCube('B',963);
let yaw=.6,pitch=.32,drag=null,pulseAt=-1,frame=0,last=0,logicalW=1,logicalH=1,scaleFactor=1;
const palette={A:[48,213,229],B:[179,128,247]};
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
function announce(message,kind=''){
 const el=$('status');el.textContent=message;el.className='status'+(kind?' '+kind:'');
}
function address(id){return api.address($(id).value.trim());}
function gearOptions(){return {phase:Number($('phase').value),orientation:Number($('orientation').value)};}
function viewSettings(){
 const mode=$('mode').value;
 return {mode,depth:Number($('depth').value),unfold:mode==='cube'?0:mode==='flat'?1:Number($('unfold').value)/100};
}
function showFold(cube,key){
 const info=api.inspect(cube,key),count=Object.keys(cube.folds).length;
 if(!info.exists)return 'stored folds: '+count+'\naddress: '+key+'\nEMPTY';
 return 'stored folds: '+count+'\naddress: '+key+'\n'+(info.valid?'CHECKSUM OK':'CORRUPT')+
  '\n'+info.checksum+'\nbytes: '+info.bytes+' · phase: '+info.phase+' · orientation: '+info.orientation+
  '\nmessage: '+(info.valid?info.message:'unavailable');
}
function updatePanel(){
 let src,dst;
 try{src=address('source');$('aInfo').textContent=showFold(A,src);}
 catch(e){$('aInfo').textContent='Invalid source: '+e.message;}
 try{dst=address('target');$('bInfo').textContent=showFold(B,dst);}
 catch(e){$('bInfo').textContent='Invalid target: '+e.message;}
 if(src&&dst){
  const p=gearOptions(),pa=api.probe(A,src,p.phase,p.orientation),pb=api.probe(B,dst,p.phase,p.orientation);
  const same=JSON.stringify(api.projection(A))===JSON.stringify(api.projection(B));
  const unequal=pa.status==='open'&&pb.status==='open'&&pa.signature!==pb.signature;
  $('observation').textContent=(same?'SAME visible cube shell':'DIFFERENT visible shell')+
   '\nA probe: '+pa.status+(pa.signature?' · '+pa.signature:'')+
   '\nB probe: '+pb.status+(pb.signature?' · '+pb.signature:'')+
   '\n'+(unequal?'ALTERMATH RESULT: same appearance, different accessible information.':
       'Write distinct messages in each cube with the demo to reveal hidden-state differences.');
 }else $('observation').textContent='Correct both addresses to inspect the observation.';
 $('phaseOut').textContent=$('phase').value;
 $('depthOut').textContent=$('depth').value;
 $('unfoldOut').textContent=$('unfold').value+'%';
 $('stageTitle').textContent={
  recursive:'Recursive pocket gear',cube:'Closed six-face cube',unfolded:'Hinged cube unfolding',flat:'Unfolded cube net'
 }[$('mode').value];
}
function attempt(fn){
 try{fn();updatePanel();}
 catch(error){announce(error.message,'error');updatePanel();}
}
function seedA(){
 api.write(A,address('source'),$('payload').value,gearOptions());
}
$('write').addEventListener('click',()=>attempt(()=>{
 seedA();announce('Written to cube A. Fold bytes and checksum are stored at the selected address.','success');
}));
$('engage').addEventListener('click',()=>attempt(()=>{
 const result=api.engage(A,B,{from:address('source'),to:address('target'),...gearOptions(),
  allowed:$('permission').checked,overwrite:$('overwrite').checked});
 if(!result.ok){announce('Gear blocked: '+result.reason,'error');return;}
 pulseAt=performance.now();
 announce('Gear engaged. '+result.bytes+' bytes copied A → B, checksum verified: '+result.checksum,'success');
}));
$('verify').addEventListener('click',()=>attempt(()=>{
 const key=address('target'),r=api.inspect(B,key);
 if(!r.exists){announce('Cube B fold is empty. Nothing to verify.','error');return;}
 announce(r.valid?'Cube B verified: '+r.checksum+' · '+r.bytes+' bytes':'Cube B failed checksum verification.',r.valid?'success':'error');
}));
$('contrast').addEventListener('click',()=>attempt(()=>{
 const src=address('source'),dst=address('target'),options=gearOptions();
 api.write(A,src,'A: The visible form stays the same. Hidden state: SPARK.',options);
 api.write(B,dst,'B: The visible form stays the same. Hidden state: GEAR.',options);
 $('payload').value='A: The visible form stays the same. Hidden state: SPARK.';
 announce('Altermath demo loaded: identical projected shells, different verified fold payloads. Enable destination overwrite to transfer.','success');
}));
$('reset').addEventListener('click',()=>attempt(()=>{
 A=api.makeCube('A',369);B=api.makeCube('B',963);seedA();pulseAt=-1;
 $('overwrite').checked=false;announce('Both cubes reset. Cube A contains the starting payload.','success');
}));
for(const id of ['source','target','phase','orientation','mode','depth','unfold']){
 $(id).addEventListener('input',updatePanel);
 $(id).addEventListener('change',updatePanel);
}
function exportRecipe(){
 const snapshot={app:'PhiMath FoldMesh',version:1,
  controls:{mode:$('mode').value,depth:Number($('depth').value),unfold:Number($('unfold').value),
   source:$('source').value.trim(),target:$('target').value.trim(),
   phase:Number($('phase').value),orientation:Number($('orientation').value),
   permission:$('permission').checked,overwrite:$('overwrite').checked},
  cubes:[api.exportCube(A),api.exportCube(B)]};
 const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='phimath-foldmesh-recipe.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
 announce('FoldMesh snapshot exported with both cubes and verified payload bytes.','success');
}
$('download').addEventListener('click',()=>attempt(exportRecipe));
$('upload').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  if(file.size>650000)throw Error('Recipe is too large');
  const raw=JSON.parse(await file.text());
  if(raw.app!=='PhiMath FoldMesh'||raw.version!==1||!Array.isArray(raw.cubes)||raw.cubes.length!==2)throw Error('Not a FoldMesh v1 recipe');
  const x=api.restoreCube(raw.cubes[0]),y=api.restoreCube(raw.cubes[1]);
  if(x.id!=='A'||y.id!=='B')throw Error('Cube order must be A then B');
  const c=raw.controls??{};
  const from=api.address(c.source??'front/0/3'),to=api.address(c.target??'front/0/3');
  const mode=['cube','flat','unfolded','recursive'].includes(c.mode)?c.mode:'recursive';
  const depth=Number(c.depth??2),unfold=Number(c.unfold??45);
  if(!Number.isInteger(depth)||depth<0||depth>3||!Number.isInteger(unfold)||unfold<0||unfold>100)throw Error('Invalid view controls');
  const ph=Number(c.phase??3),ori=Number(c.orientation??0);
  if(!Number.isInteger(ph)||ph<0||ph>7||!Number.isInteger(ori)||ori<0||ori>3)throw Error('Invalid gear controls');
  A=x;B=y;$('source').value=from;$('target').value=to;
  $('mode').value=mode;$('depth').value=depth;$('unfold').value=unfold;
  $('phase').value=ph;$('orientation').value=ori;
  $('permission').checked=c.permission===true;$('overwrite').checked=c.overwrite===true;
  pulseAt=-1;updatePanel();announce('Verified FoldMesh recipe imported.','success');
 }catch(err){announce('Import rejected: '+err.message,'error');}
});
function point(face,u,v,amount){
 const theta=(1-amount)*Math.PI/2,c=Math.cos(theta),s=Math.sin(theta);
 switch(face){
  case 'front':return [u,v,0];
  case 'right':return [1+(u+1)*c,v,-(u+1)*s];
  case 'left':return [-1-(1-u)*c,v,-(1-u)*s];
  case 'top':return [u,1+(v+1)*c,-(v+1)*s];
  case 'bottom':return [u,-1-(1-v)*c,-(1-v)*s];
  case 'back':return [u,1+2*c+(v+1)*Math.cos(2*theta),-2*s-(v+1)*Math.sin(2*theta)];
 }
 return [0,0,0];
}
function rotated(p){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy;
 return [x,p[1]*cp-z*sp,p[1]*sp+z*cp];
}
function projector(cx,cy,scale){
 return p=>{const v=rotated([p[0],p[1],p[2]+1]);
  const perspective=8/Math.max(3,8-v[2]);
  return {x:cx+v[0]*scale*perspective,y:cy-v[1]*scale*perspective,z:v[2]};};
}
function path2(points){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();}
function strokePath(points,color,width=1){
 path2(points);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function corners(face,amount,P,cell=null){
 const left=cell?-1+cell.u*2:-1,right=cell?left+cell.size*2:1;
 const top=cell?1-cell.v*2:1,bottom=cell?top-cell.size*2:-1;
 return [[left,top],[right,top],[right,bottom],[left,bottom]].map(([u,v])=>P(point(face,u,v,amount)));
}
function pocket(face,entry,amount,P,color,selected){
 const c=api.cell(entry),left=-1+c.u*2,right=left+c.size*2,top=1-c.v*2,bottom=top-c.size*2;
 const inset=c.size*.15;
 const xy=[[left+inset,top-inset],[right-inset,top-inset],[right-inset,bottom+inset],[left+inset,bottom+inset]];
 const base=xy.map(([u,v])=>point(face,u,v,amount));
 const diffA=[base[1][0]-base[0][0],base[1][1]-base[0][1],base[1][2]-base[0][2]];
 const diffB=[base[3][0]-base[0][0],base[3][1]-base[0][1],base[3][2]-base[0][2]];
 let normal=[diffA[1]*diffB[2]-diffA[2]*diffB[1],diffA[2]*diffB[0]-diffA[0]*diffB[2],diffA[0]*diffB[1]-diffA[1]*diffB[0]];
 const norm=Math.hypot(...normal)||1;normal=normal.map(n=>n/norm*c.size*(selected?.45:.28));
 const roof=base.map(p=>p.map((v,i)=>v+normal[i]));
 const a=base.map(P),b=roof.map(P);
 ctx.fillStyle=selected?'rgba(246,193,117,.13)':'rgba(148,191,255,.065)';
 path2(b);ctx.fill();strokePath(a,color,selected?1.7:.8);strokePath(b,color,selected?2:.9);
 for(let i=0;i<4;i++)line(a[i],b[i],color,selected?1.4:.75);
}
function drawCube(cube,cx,cy,scale,amount,depth,mode,chosen,color){
 const P=projector(cx,cy,scale);
 const packed=api.FACES.map(face=>{
  const points=corners(face,amount,P);
  return {face,points,z:points.reduce((a,p)=>a+p.z,0)/4};
 }).sort((a,b)=>a.z-b.z);
 let selected=null;try{selected=api.cell(chosen);}catch(_){}
 for(const face of packed){
  path2(face.points);
  ctx.fillStyle=cube.id==='A'?'rgba(14,37,52,.97)':'rgba(32,22,52,.97)';
  ctx.fill();
  ctx.strokeStyle='rgba('+color.join(',')+',.75)';ctx.lineWidth=1.6;ctx.stroke();
  const N=2**depth;
  ctx.lineWidth=.65;ctx.strokeStyle='rgba('+color.join(',')+',.18)';
  for(let j=1;j<N;j++){
   const u=-1+2*j/N,v=1-2*j/N;
   line(P(point(face.face,u,-1,amount)),P(point(face.face,u,1,amount)),ctx.strokeStyle,.6);
   line(P(point(face.face,-1,v,amount)),P(point(face.face,1,v,amount)),ctx.strokeStyle,.6);
  }
  const entries=Object.keys(cube.folds).filter(x=>x.split('/')[0]===face.face);
  for(const entry of entries.slice(0,48)){
   const c=api.cell(entry),quad=corners(face.face,amount,P,c);
   path2(quad);ctx.fillStyle='rgba('+color.join(',')+',.18)';ctx.fill();
   strokePath(quad,'rgba('+color.join(',')+',.85)',1);
   if(mode==='recursive')pocket(face.face,entry,amount,P,'rgba('+color.join(',')+',.8)',false);
  }
  if(selected&&selected.face===face.face){
   const quad=corners(face.face,amount,P,selected);
   path2(quad);ctx.fillStyle='rgba(244,190,109,.18)';ctx.fill();
   strokePath(quad,'#ffd59c',2.2);
   if(mode==='recursive')pocket(face.face,chosen,amount,P,'#ffdb9d',true);
  }
 }
 ctx.save();ctx.font='600 12px ui-monospace,monospace';ctx.textAlign='center';
 ctx.fillStyle='rgb('+color.join(',')+')';
 ctx.fillText('CUBE '+cube.id,cx,cy+scale*(amount>.85?3.8:1.9)+20);
 ctx.font='10px ui-monospace,monospace';ctx.fillStyle='#96a5bd';
 ctx.fillText(Object.keys(cube.folds).length+' occupied folds · r'+cube.revision,cx,cy+scale*(amount>.85?3.8:1.9)+35);ctx.restore();
}
function background(w,h){
 ctx.fillStyle='#080b16';ctx.fillRect(0,0,w,h);
 const g=ctx.createRadialGradient(w*.5,h*.45,8,w*.5,h*.45,Math.max(w,h)*.7);
 g.addColorStop(0,'#1a203c');g.addColorStop(1,'#080b16');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='rgba(131,163,215,.25)';
 for(let i=0;i<72;i++){const x=((i*73.971)%1)*w,y=((i*49.731)%1)*h;ctx.fillRect(x,y,i%9===0?1.5:1,1);}
 ctx.strokeStyle='rgba(123,145,193,.075)';ctx.lineWidth=1;
 for(let i=0;i<17;i++){const y=h*.52+(i-8)*h*.07;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
}
function gear(now,w,h){
 const x=w*.5,y=h*.52,r=Math.min(w,h)*.032;
 ctx.save();ctx.strokeStyle='#e7bc82';ctx.lineWidth=1.3;
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.arc(x,y,r*.35,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<12;i++){const t=i*Math.PI/6+now*.0003;line({x:x+Math.cos(t)*r,y:y+Math.sin(t)*r},
 {x:x+Math.cos(t)*r*1.2,y:y+Math.sin(t)*r*1.2},'#e7bc82',1.4);}
 ctx.setLineDash([4,7]);line({x:w*.34,y},{x:w*.66,y},'rgba(232,189,131,.65)',1);ctx.setLineDash([]);
 if(pulseAt>=0&&now-pulseAt<1800){
  const t=(now-pulseAt)/1800;
  const px=w*(.32+.36*t),py=y-Math.sin(t*Math.PI)*r*.5;
  const gr=ctx.createRadialGradient(px,py,1,px,py,25);
  gr.addColorStop(0,'rgba(255,231,176,.95)');gr.addColorStop(1,'rgba(255,231,176,0)');
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(px,py,25,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function sizeCanvas(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 logicalW=Math.max(1,rect.width);logicalH=Math.max(1,rect.height);
 scaleFactor=dpr;
 const w=Math.round(logicalW*dpr),h=Math.round(logicalH*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
}
let lastSize=0;
function animate(now){
 requestAnimationFrame(animate);
 if(now-last<32)return;const dt=Math.min(50,now-last||32);last=now;
 if(now-lastSize>400){sizeCanvas();lastSize=now;}
 if($('rotate').checked&&!reduced&&!drag)yaw+=dt*.00009;
 const w=logicalW,h=logicalH;ctx.setTransform(scaleFactor,0,0,scaleFactor,0,0);
 background(w,h);
 const s=viewSettings(),amount=s.unfold;
 const scale=Math.min(w*(amount>.78?.055:.095),h*(amount>.78?.105:.22));
 const left=w*.25,right=w*.75,cy=h*(amount>.78?.47:.5);
 const visualAngle=s.mode==='flat'?yaw*.25:yaw;
 const oldYaw=yaw;
 if(s.mode==='flat'){yaw=0;pitch=.02;}
 drawCube(A,left,cy,scale,amount,s.depth,s.mode,$('source').value.trim(),palette.A);
 drawCube(B,right,cy,scale,amount,s.depth,s.mode,$('target').value.trim(),palette.B);
 if(s.mode==='flat'){yaw=oldYaw;pitch=drag?pitch:.32;}
 gear(now,w,h);
 frame++;if(frame%20===0)$('renderStats').textContent=Math.round(w)+' × '+Math.round(h)+' · 2D perspective projection';
}
canvas.addEventListener('pointerdown',e=>{
 drag={x:e.clientX,y:e.clientY,pitch,yaw};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!drag)return;
 yaw=drag.yaw+(e.clientX-drag.x)*.008;
 pitch=Math.max(-1.2,Math.min(1.2,drag.pitch+(e.clientY-drag.y)*.008));
});
canvas.addEventListener('pointerup',()=>drag=null);
canvas.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',sizeCanvas);
try{seedA();announce('Cube A is seeded. Engage the gear, or load the Altermath contrast demo.','success');}
catch(err){announce(err.message,'error');}
updatePanel();sizeCanvas();requestAnimationFrame(animate);
})();
