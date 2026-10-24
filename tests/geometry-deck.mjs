import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const mixerSrc=readFileSync(new URL('../deck-mixer.js',import.meta.url),'utf8');
const geometrySrc=readFileSync(new URL('../geometry-lab.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function context2D(){
 const state={strokes:0,images:0};
 return {state,setTransform(){},clearRect(){},fillRect(){},save(){},restore(){},
  translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},closePath(){state.strokes++;},
  stroke(){state.strokes++;},createRadialGradient(){return {addColorStop(){}};},
  drawImage(){state.images++;},rect(){},clip(){},arc(){}};
}
const elements=new Map();
function element(id){
 if(elements.has(id))return elements.get(id);
 const handlers={};
 const e={id,checked:false,hidden:false,disabled:false,value:'0',textContent:'',
  style:{},title:'',addEventListener(type,fn){handlers[type]=fn;},
  querySelectorAll(){return [];},trigger(type,value){
   if(value!==undefined)this.value=value;
   const fn=handlers[type];if(!fn)throw Error('No '+type+' handler for '+id);
   fn({target:this});
  }};
 elements.set(id,e);return e;
}
const doc={
 head:{append(){}},
 createElement(tag){
  if(tag==='canvas')return {width:0,height:0,getContext(){return context2D();}};
  return {textContent:'',style:{},append(){}};
 }
};
const host={window:{},document:doc};
new vm.Script(mixerSrc,{filename:'deck-mixer.js'}).runInNewContext(host);
new vm.Script(geometrySrc,{filename:'geometry-lab.js'}).runInNewContext(host);
const mixerAPI=host.window.PhiDeckMixer,geometryAPI=host.window.PhiGeometryLab;
const root={innerHTML:'',querySelector(selector){return element(selector.slice(1));}};
const base={mode:4,palette:5,seed:369,density:72,spiral:140,warp:65,glow:120,zoom:100};
let swapCount=0, geometryCalls=0, worldCalls=[];
const renderGeometry=(deck,ctx,canvas)=>{
 geometryCalls++;
 const recipe={layers:geometryAPI.preset(deck.geometryPreset),audio:{enabled:true,wet:1},motion:24};
 return geometryAPI.renderTo(ctx,canvas,recipe,1.8,{bass:.8,mid:.4,high:.6,beat:.9});
};
const mixer=mixerAPI.create({root,getA:()=>base,onChange(){},onSwap(){swapCount++;return base;},renderGeometry});
assert.ok(root.innerHTML.includes('Sacred Geometry Lab'));
assert.ok(root.innerHTML.includes('My Geometry Lab composition'));
assert.equal(mixer.enabled,false);
mixer.restore({enabled:true,crossfade:50,style:'blend',deckB:{mode:5,geometryPreset:'flower'}});
assert.equal(mixer.enabled,true);
assert.equal(mixer.deckB.mode,5);
assert.equal(mixer.deckB.geometryPreset,'flower');
assert.equal(element('dmSwap').disabled,true,'cannot swap geometry to shader-only Deck A');
element('dmSwap').trigger('click');
assert.equal(swapCount,0,'blocked swap does not touch Deck A');
assert.equal(element('dmGeometryControls').hidden,false,'geometry options shown');
assert.equal(geometryAPI.geometry({type:'flower',depth:2}).length,19);

const screen=context2D(),target={width:600,height:360};
assert.equal(mixer.drawCPU(screen,target,(deck,ctx,canvas)=>{
 worldCalls.push(deck.mode);
 assert.ok(canvas.width>1&&canvas.height>1);
}),true);
assert.equal(geometryCalls,1,'geometry built only for B');
assert.deepEqual(worldCalls,[4],'shader engine should receive only A');
assert.equal(screen.state.images,2,'CPU blend composites both worlds');
assert.ok(element('dmGeometryPreset').value==='flower');

// Check GPU compositing via the same WebGL texture slot used by other Deck B worlds.
const glCalls={uploads:0,flip:[],draws:0,fbos:0,geometryCanvas:null},gl={
 VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,
 FLOAT:7,FRAMEBUFFER_BINDING:8,UNPACK_FLIP_Y_WEBGL:9,TEXTURE_2D:10,
 TEXTURE_MIN_FILTER:11,TEXTURE_MAG_FILTER:12,TEXTURE_WRAP_S:13,TEXTURE_WRAP_T:14,
 LINEAR:15,CLAMP_TO_EDGE:16,RGBA:17,UNSIGNED_BYTE:18,FRAMEBUFFER:19,
 COLOR_ATTACHMENT0:20,FRAMEBUFFER_COMPLETE:21,TRIANGLES:22,TEXTURE0:23,TEXTURE1:24,
 createShader(){return {};},shaderSource(){},compileShader(){},getShaderParameter(){return true;},
 createProgram(){return {};},attachShader(){},linkProgram(){},deleteShader(){},
 getProgramParameter(){return true;},createBuffer(){return {};},bindBuffer(){},bufferData(){},
 getAttribLocation(){return 0;},getUniformLocation(){return {};},createTexture(){return {};},
 bindTexture(){},texParameteri(){},texImage2D(){},createFramebuffer(){return {};},
 bindFramebuffer(){glCalls.fbos++;},framebufferTexture2D(){},checkFramebufferStatus(){return 21;},
 getParameter(which){return which===this.UNPACK_FLIP_Y_WEBGL?false:null;},
 pixelStorei(which,value){if(which===this.UNPACK_FLIP_Y_WEBGL)glCalls.flip.push(value);},
 activeTexture(){},useProgram(){},viewport(){},enableVertexAttribArray(){},
 vertexAttribPointer(){},uniform1i(){},uniform1f(){},uniform2f(){},
 texSubImage2D(...args){glCalls.uploads++;glCalls.geometryCanvas=args.at(-1);},
 drawArrays(){glCalls.draws++;},deleteFramebuffer(){},deleteTexture(){}
};
let glWorldCalls=[];
assert.equal(mixer.drawGL(gl,target,(deck,fbo,w,h)=>{
 glWorldCalls.push(deck.mode);
 assert.ok(w>1&&h>1);
}),true);
assert.deepEqual(glWorldCalls,[4],'GPU renderer must not render Geometry B through a shader');
assert.equal(glCalls.uploads,1,'GPU geometry must be uploaded into texture slot B');
assert.deepEqual(glCalls.flip,[true,false],'UNPACK flip must be restored after upload');
assert.ok(glCalls.geometryCanvas.width>0&&glCalls.geometryCanvas.height>0);
assert.ok(glCalls.draws>=1,'GPU mixer composite shader draws the two textures');
assert.equal(mixer.exportSettings().deckB.geometryPreset,'flower','recipe preserves geometry preset');
element('dmGeometryPreset').trigger('change','mandala');
assert.equal(mixer.deckB.geometryPreset,'mandala');
assert.equal(mixer.exportSettings().deckB.geometryPreset,'mandala');
element('dmMode').trigger('input','4');
assert.equal(mixer.deckB.mode,4);
assert.equal(element('dmSwap').disabled,false,'swap becomes available for a shader world');
assert.equal(element('dmGeometryControls').hidden,true);
worldCalls=[];geometryCalls=0;
mixer.drawCPU(screen,target,(deck)=>worldCalls.push(deck.mode));
assert.deepEqual(worldCalls,[4,4],'normal shader mixing remains intact');
assert.equal(geometryCalls,0,'geometry renderer bypassed for normal scenes');
mixer.restore();
assert.equal(mixer.enabled,false,'old recipes default to single-deck');
assert.ok(html.includes('renderGeometry:(deck,context,targetCanvas)'), 'studio provides the geometry renderer');
assert.ok(html.includes('window.PhiGeometryLab'), 'studio looks up shared construction API');
assert.ok(html.includes('version:\u00270.7.0\u0027'), 'recipe version updated');
assert.ok(html.includes("PhiChromatic.draw(targetCtx,targetCanvas,live,playingTime)"),
 'CPU Chromatic Warp draws into its own offscreen target, not the stage');
console.log('PASS: geometry-to-deck CPU/GPU paths, texture flip, fader, presets, safe swaps and compatibility.');
