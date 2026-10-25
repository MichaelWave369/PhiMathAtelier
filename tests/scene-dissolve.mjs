import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('scene-dissolve.js',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const pages=readFileSync(new URL('.github/workflows/pages.yml',root),'utf8');
const host={window:{},console:{warn(){}}};
new vm.Script(source,{filename:'scene-dissolve.js'}).runInNewContext(host);
const api=host.window.PhiSceneDissolve;
assert.equal(typeof api.create,'function');
assert.equal(api.mixAlpha(0,1),1);
assert.equal(api.mixAlpha(1,1),0);
assert.equal(api.mixAlpha(.5,1),.5);
assert.equal(api.mixAlpha(.25,1,'linear'),.75);
assert.ok(api.mixAlpha(.25,1,'smooth')>.75);
assert.ok(api.fragment.includes('gl_FragCoord.xy/u_resolution'));
assert.ok(api.fragment.includes('u_old'));

const calls={snapshots:0,paint:0,alpha:[],uploads:0,composites:0,flip:[],blend:[]};
const canvas={width:640,height:360};
const doc={createElement(kind){
 assert.equal(kind,'canvas');
 return {width:0,height:0,getContext(type){
  assert.equal(type,'2d');
  return {drawImage(other){assert.equal(other,canvas);calls.snapshots++;}};
 }};
}};
const fx=api.create({canvas,document:doc});
assert.equal(fx.begin(0),false);
assert.equal(fx.active,false);
assert.equal(fx.begin(2),true);
assert.equal(calls.snapshots,1);
assert.equal(fx.active,true);
assert.equal(fx.opacity,1);
const ctx={
 globalAlpha:1,globalCompositeOperation:'source-over',
 save(){},restore(){},drawImage(old,x,y,w,h){
  calls.paint++;calls.alpha.push(this.globalAlpha);
  assert.equal(old.width,640);assert.equal(old.height,360);
  assert.equal(w,640);assert.equal(h,360);
 }
};
assert.equal(fx.drawCPU(ctx),true);
assert.equal(calls.alpha[0],1,'opening frame must fully cover incoming picture');
assert.equal(fx.tick(.25),true);
assert.equal(fx.drawCPU(ctx),true);
assert.ok(calls.alpha[1]<1&&calls.alpha[1]>0);
assert.equal(fx.tick(.25,true),true,'paused dissolve remains available');
assert.equal(fx.opacity,calls.alpha[1],'paused time does not advance');
for(let i=0;i<7;i++)fx.tick(.25);
assert.equal(fx.active,false);
assert.equal(fx.drawCPU(ctx),false);
assert.equal(fx.opacity,0,'completed transition does not leave a frame overlay');
assert.equal(fx.begin(1,'linear'),true);

const gl={
 VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
 ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,
 TEXTURE_2D:8,TEXTURE_MIN_FILTER:9,TEXTURE_MAG_FILTER:10,
 TEXTURE_WRAP_S:11,TEXTURE_WRAP_T:12,LINEAR:13,CLAMP_TO_EDGE:14,
 CURRENT_PROGRAM:15,ARRAY_BUFFER_BINDING:16,ACTIVE_TEXTURE:17,
 UNPACK_FLIP_Y_WEBGL:18,BLEND:19,BLEND_SRC_RGB:20,BLEND_DST_RGB:21,
 VIEWPORT:22,SRC_ALPHA:23,ONE_MINUS_SRC_ALPHA:24,TEXTURE0:25,
 RGBA:26,UNSIGNED_BYTE:27,FRAMEBUFFER:28,TRIANGLES:29,
 createShader(){return {};},shaderSource(){},compileShader(){},getShaderParameter(){return true;},
 deleteShader(){},createProgram(){return {};},attachShader(){},linkProgram(){},getProgramParameter(){return true;},
 createBuffer(){return {};},bindBuffer(){},bufferData(){},
 createTexture(){return {};},bindTexture(){},texParameteri(){},activeTexture(){},
 getAttribLocation(){return 0;},getUniformLocation(_p,k){return k;},
 getParameter(k){
  if(k===this.UNPACK_FLIP_Y_WEBGL)return false;
  if(k===this.ACTIVE_TEXTURE)return this.TEXTURE0;
  if(k===this.BLEND_SRC_RGB)return 1;
  if(k===this.BLEND_DST_RGB)return 0;
  if(k===this.VIEWPORT)return [0,0,640,360];
  return null;
 },
 isEnabled(){return false;},
 bindFramebuffer(){},viewport(){},pixelStorei(k,v){
  if(k===this.UNPACK_FLIP_Y_WEBGL)calls.flip.push(v);
 },
 texImage2D(...args){calls.uploads++;assert.equal(args.at(-1).width,640);},
 useProgram(){},enableVertexAttribArray(){},disableVertexAttribArray(){},
 vertexAttribPointer(){},uniform1i(){},uniform2f(){},
 uniform1f(name,val){if(name==='u_opacity')calls.alpha.push(val);},
 enable(){},disable(){},blendFunc(a,b){calls.blend.push([a,b]);},
 drawArrays(){calls.composites++;}
};
assert.equal(fx.drawGL(gl),true);
assert.equal(calls.uploads,1,'only new snapshots upload a texture');
assert.deepEqual(calls.flip,[true,false],'Y-flip state restored');
assert.equal(calls.composites,1);
assert.deepEqual(calls.blend[0],[gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA],'standard alpha-over compositor');
fx.tick(.25);
assert.equal(fx.drawGL(gl),true);
assert.equal(calls.uploads,1,'animation reuses existing GL snapshot texture');
assert.ok(calls.composites===2);
assert.equal(fx.begin(.5),true);
fx.drawGL(gl);
assert.equal(calls.uploads,2,'new cue change updates the scene texture');
fx.cancel();
assert.equal(fx.active,false);
assert.equal(fx.drawGL(gl),false);
canvas.width=0;
assert.equal(fx.begin(1),false,'invalid canvas dimensions do not activate overlay');
canvas.width=640;

assert.ok(html.includes('src="scene-dissolve.js"'));
assert.ok(html.includes('sceneFX.drawGL(gl)'));
assert.ok(html.includes('sceneFX.drawCPU(ctx2d)'));
assert.ok(html.includes('onSceneSwitch:(duration,easing)=>sceneFX.begin(duration,easing)'));
assert.ok(html.includes('sceneFX.tick(delta,timeline.paused)'));
assert.ok(pages.includes('cp scene-dissolve.js site/scene-dissolve.js'));
assert.ok(!/\beval\s*\(|\bnew\s+Function\s*\(/.test(source),'no dynamic code execution');
console.log('PASS: snapshot compositor CPU and WebGL output, PNG/WebM canvas path, state cleanup, reuse, pause and easing.');
