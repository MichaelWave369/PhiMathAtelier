import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const mixSrc=load('deck-mixer.js'),alchemySrc=load('alchemy-engine.js');
const html=load('index.html'),pages=load('.github/workflows/pages.yml');
const stats={strokes:0,frames:0,uploads:0};
function context2D(){
  return {setTransform(){},clearRect(){},fillRect(){stats.frames++;},
    createRadialGradient(){return {addColorStop(){}};},beginPath(){},arc(){},fill(){},
    save(){},restore(){},translate(){},scale(){},rotate(){},moveTo(){},
    lineTo(){},closePath(){},stroke(){stats.strokes++;},fillText(){},
    drawImage(){},rect(){},clip(){},globalAlpha:1};
}
const nodes=new Map();
function node(id){
 if(nodes.has(id))return nodes.get(id);
 const handlers={};
 const element={id,checked:false,hidden:false,disabled:false,value:'0',title:'',textContent:'',
   style:{},addEventListener(name,fn){handlers[name]=fn;},
   querySelectorAll(){return [];},
   fire(type,value){if(value!==undefined)this.value=value;
     assert.ok(handlers[type],'Missing event '+id+':'+type);
     handlers[type]({target:this});}};
 nodes.set(id,element);return element;
}
const root={innerHTML:'',querySelector(sel){return node(sel.slice(1));}};
const document={head:{append(){}},createElement(tag){
 if(tag==='canvas')return {width:0,height:0,getContext(type){assert.equal(type,'2d');return context2D();}};
 return {textContent:'',append(){}};
}};
const sandbox={window:{location:{href:''}},document};
new vm.Script(alchemySrc,{filename:'alchemy-engine.js'}).runInNewContext(sandbox);
new vm.Script(mixSrc,{filename:'deck-mixer.js'}).runInNewContext(sandbox);
const alchemy=sandbox.window.PhiAlchemy,mix=sandbox.window.PhiDeckMixer;

assert.ok(html.includes('src="alchemy-engine.js"'));
assert.ok(html.includes('renderAlchemy:(deck,context,targetCanvas)'));
assert.ok(html.includes('lab.renderTo(context,targetCanvas,formula,playingTime,vj.levels)'));
assert.ok(html.includes("localStorage.getItem('phimath-alchemy-r1')"));
assert.ok(pages.includes('cp alchemy-engine.js site/alchemy-engine.js'));
assert.equal(mix.cleanDeck({mode:6,alchemyPreset:'rebis-merge'}).alchemyPreset,'rebis-merge');
assert.equal(mix.cleanDeck({mode:6,alchemyPreset:'sequence'}).alchemyPreset,'sequence');
assert.equal(mix.cleanDeck({mode:6,alchemyPreset:'javascript:alert(1)'}).alchemyPreset,'stone-ascension');
assert.equal(mix.cleanDeck({mode:5}).mode,5,'existing geometry mode is stable');
const old=mix.cleanDeck({mode:4,palette:5});
assert.equal(old.mode,4,'old recipes are still valid');

const formula=alchemy.generatePreset('stone-ascension');
const unchanged=JSON.stringify(formula);
const energy={bass:.85,mid:.7,high:.8,beat:1};
const active=alchemy.modulate(formula,energy);
assert.ok(active.intensity>formula.intensity,'bass increases deformation');
assert.ok(active.speed>formula.speed,'mids accelerate motion');
assert.notEqual(active.hue,formula.hue,'highs change hue');
assert.equal(JSON.stringify(formula),unchanged,'VJ must never modify stored recipes');
assert.equal(alchemy.modulate(formula,null).intensity,formula.intensity);
assert.equal(alchemy.modulate(formula,{bass:Infinity,mid:-5,high:NaN,beat:Infinity}).intensity,formula.intensity);
assert.ok(alchemy.modulate(formula,{bass:1},1).intensity>=formula.intensity);
const testCanvas={width:600,height:380,getContext(){return context2D();}};
assert.equal(alchemy.renderTo(context2D(),testCanvas,formula,1.25,energy),true);
assert.equal(alchemy.renderTo(context2D(),{width:0,height:0},formula,0,energy),false);
assert.ok(stats.strokes>0,'alchemy renderer draws geometry');

let worlds=0,alchemyRenders=0,geometryRenders=0;
const mixer=mix.create({root,getA:()=>({mode:4,seed:369,palette:5,density:72,spiral:140,warp:65,glow:120,zoom:100}),
  onChange(){},onSwap(){throw Error('Cannot swap a vector deck to A');},
  renderGeometry(){geometryRenders++;return true;},
  renderAlchemy:(deck,ctx,canvas)=>{
    alchemyRenders++;
    return alchemy.renderTo(ctx,canvas,alchemy.generatePreset(deck.alchemyPreset),1.8,energy);
  }});
assert.equal(mixer.enabled,false,'mixer defaults off');
assert.ok(root.innerHTML.includes('<option value="6">Alchemical Atlas</option>'));
assert.ok(root.innerHTML.includes('My saved Alchemical Atlas composition'));
mixer.restore({enabled:true,crossfade:45,style:'blend',deckB:{mode:6,alchemyPreset:'mercury-bloom'}});
assert.equal(mixer.enabled,true);
assert.equal(mixer.deckB.mode,6);
assert.equal(mixer.deckB.alchemyPreset,'mercury-bloom');
assert.equal(node('dmAlchemyControls').hidden,false);
assert.equal(node('dmGeometryControls').hidden,true);
assert.equal(node('dmSwap').disabled,true,'Alchemical vectors cannot be swapped into A');
node('dmSwap').fire('click');
assert.equal(mixer.drawCPU(context2D(),testCanvas,()=>{worlds++;}),true);
assert.equal(worlds,1,'only A uses base world shader/CPU renderer');
assert.equal(alchemyRenders,1,'B renders the alchemy engine');
assert.equal(geometryRenders,0);

node('dmAlchemyPreset').fire('change','ouro-loop');
assert.equal(mixer.deckB.alchemyPreset,'ouro-loop');
assert.equal(mixer.exportSettings().deckB.alchemyPreset,'ouro-loop');
node('dmEditAlchemy').fire('click');
assert.equal(sandbox.window.location.href,'alchemy.html');

const glTrace={uploadFlip:[]};
const gl={
 VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,
 STATIC_DRAW:6,FLOAT:7,FRAMEBUFFER_BINDING:8,UNPACK_FLIP_Y_WEBGL:9,TEXTURE_2D:10,
 TEXTURE_MIN_FILTER:11,TEXTURE_MAG_FILTER:12,TEXTURE_WRAP_S:13,TEXTURE_WRAP_T:14,
 LINEAR:15,CLAMP_TO_EDGE:16,RGBA:17,UNSIGNED_BYTE:18,FRAMEBUFFER:19,
 COLOR_ATTACHMENT0:20,FRAMEBUFFER_COMPLETE:21,TRIANGLES:22,TEXTURE0:23,TEXTURE1:24,
 createShader(){return {};},shaderSource(){},compileShader(){},getShaderParameter(){return true;},
 createProgram(){return {};},attachShader(){},linkProgram(){},deleteShader(){},
 getProgramParameter(){return true;},createBuffer(){return {};},bindBuffer(){},bufferData(){},
 getAttribLocation(){return 0;},getUniformLocation(){return {};},createTexture(){return {};},
 bindTexture(){},texParameteri(){},texImage2D(){},createFramebuffer(){return {};},
 bindFramebuffer(){},framebufferTexture2D(){},checkFramebufferStatus(){return 21;},
 getParameter(what){return what===this.UNPACK_FLIP_Y_WEBGL?false:null;},
 pixelStorei(what,value){if(what===this.UNPACK_FLIP_Y_WEBGL)glTrace.uploadFlip.push(value);},
 activeTexture(){},useProgram(){},viewport(){},enableVertexAttribArray(){},
 vertexAttribPointer(){},uniform1i(){},uniform1f(){},uniform2f(){},
 texSubImage2D(){stats.uploads++;},drawArrays(){},
 deleteFramebuffer(){},deleteTexture(){}
};
const before=alchemyRenders;
assert.equal(mixer.drawGL(gl,testCanvas,()=>{worlds++;}),true);
assert.equal(alchemyRenders,before+1,'GPU mix uploads alchemy Canvas2D output');
assert.equal(stats.uploads,1);
assert.deepEqual(glTrace.uploadFlip,[true,false],'texture flip is restored');
node('dmMode').fire('input','5');
assert.equal(node('dmGeometryControls').hidden,false,'geometry controls remain available');
assert.equal(node('dmAlchemyControls').hidden,true);
const beforeGeo=geometryRenders;
assert.equal(mixer.drawCPU(context2D(),testCanvas,()=>{}),true);
assert.equal(geometryRenders,beforeGeo+1,'geometry mode still renders');
mixer.restore();
assert.equal(mixer.enabled,false,'legacy recipe restores disabled mixer');
console.log('PASS: Alchemy Deck B CPU/GPU integration, pure VJ modulation, preset routing, safe swap and legacy compatibility.');
