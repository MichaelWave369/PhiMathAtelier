/* ΦMath Atelier v1.0.0 — captured-scene dissolve compositor.
 * Copies one displayed frame of the outgoing scene, then blends that still
 * over the LIVE incoming frame. Applied to the actual output canvas on both
 * WebGL and Canvas2D, so canvas screenshots and silent WebM include the fade.
 * The old scene is frozen (no second live renderer or duplicated audio).
 */
(function(global){
'use strict';
const clamp=(n,a,b,d=a)=>{const v=Number(n);return Number.isFinite(v)?Math.min(b,Math.max(a,v)):d;};
const vertex='attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}';
const fragment=[
 'precision mediump float;',
 'uniform sampler2D u_old;uniform vec2 u_resolution;uniform float u_opacity;',
 'void main(){vec2 uv=gl_FragCoord.xy/u_resolution;',
 'gl_FragColor=vec4(texture2D(u_old,uv).rgb,u_opacity);}'
].join('\n');
function mixAlpha(elapsed,duration,easing='smooth'){
 const t=clamp(elapsed/Math.max(.001,clamp(duration,.01,8,1)),0,1,0);
 const p=easing==='linear'?t:t*t*(3-2*t);
 return 1-p;
}
function create({canvas,document:doc}={}){
 if(!canvas||!doc||typeof doc.createElement!=='function')throw Error('Scene dissolve requires a canvas and document');
 let shot=null,elapsed=0,duration=0,easing='smooth',gpu=null,dirty=false,failed=false;
 const release=()=>{shot=null;elapsed=0;duration=0;dirty=false;};
 function begin(time,ease='smooth'){
  const n=clamp(time,0,8,0);if(n<=0){release();return false;}
  const w=canvas.width,h=canvas.height;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2){release();return false;}
  try{
   const copy=doc.createElement('canvas');copy.width=w;copy.height=h;
   const ctx=copy.getContext('2d',{alpha:false});
   if(!ctx)throw Error('2D snapshot canvas not supported');
   ctx.drawImage(canvas,0,0,w,h);
   shot=copy;duration=n;elapsed=0;easing=ease==='linear'?'linear':'smooth';dirty=true;failed=false;
   return true;
  }catch(err){release();return false;}
 }
 function tick(dt,paused=false){
  if(!shot)return false;
  if(!paused)elapsed=Math.min(duration,elapsed+clamp(dt,0,.25,0));
  if(elapsed>=duration){release();return false;}
  return true;
 }
 function drawCPU(ctx){
  if(!shot||!ctx)return false;
  try{
   ctx.save();
   ctx.globalAlpha=mixAlpha(elapsed,duration,easing);
   ctx.globalCompositeOperation='source-over';
   ctx.drawImage(shot,0,0,canvas.width,canvas.height);
   ctx.restore();return true;
  }catch(_){release();return false;}
 }
 function compile(gl,type,src){
  const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
   const why=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('Dissolve shader: '+why);
  }return shader;
 }
 function prepare(gl){
  if(gpu&&gpu.gl===gl)return;
  const vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Dissolve program link failed');
  const vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gpu={gl,program,vertexBuffer,texture,
   attrib:gl.getAttribLocation(program,'a_position'),
   resolution:gl.getUniformLocation(program,'u_resolution'),
   opacity:gl.getUniformLocation(program,'u_opacity'),
   sampler:gl.getUniformLocation(program,'u_old')};
 }
 function drawGL(gl){
  if(!shot||!gl||failed)return false;
  try{
   prepare(gl);
   const original={
    program:gl.getParameter(gl.CURRENT_PROGRAM),
    buffer:gl.getParameter(gl.ARRAY_BUFFER_BINDING),
    active:gl.getParameter(gl.ACTIVE_TEXTURE),
    flip:gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),
    blend:gl.isEnabled(gl.BLEND),
    srcRGB:gl.getParameter(gl.BLEND_SRC_RGB),
    dstRGB:gl.getParameter(gl.BLEND_DST_RGB),
    viewport:gl.getParameter(gl.VIEWPORT)
   };
   try{
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.texture);
    if(dirty){
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,shot);}
     finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,original.flip);}
     dirty=false;
    }
    gl.useProgram(gpu.program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gpu.vertexBuffer);gl.enableVertexAttribArray(gpu.attrib);
    gl.vertexAttribPointer(gpu.attrib,2,gl.FLOAT,false,0,0);
    gl.uniform1i(gpu.sampler,0);gl.uniform2f(gpu.resolution,canvas.width,canvas.height);
    gl.uniform1f(gpu.opacity,mixAlpha(elapsed,duration,easing));
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.disableVertexAttribArray(gpu.attrib);
   }finally{
    if(!original.blend)gl.disable(gl.BLEND);else gl.enable(gl.BLEND);
    gl.blendFunc(original.srcRGB,original.dstRGB);
    gl.useProgram(original.program);
    gl.bindBuffer(gl.ARRAY_BUFFER,original.buffer);
    gl.activeTexture(original.active);
    if(original.viewport)gl.viewport(...original.viewport);
   }
   return true;
  }catch(err){
   console.warn('Scene dissolve disabled (WebGL compositor):',err);
   failed=true;release();return false;
  }
 }
 return {begin,tick,drawCPU,drawGL,cancel:release,
  get active(){return !!shot;},get opacity(){return shot?mixAlpha(elapsed,duration,easing):0;},
  get progress(){return shot?elapsed/duration:1;}};
}
global.PhiSceneDissolve={create,mixAlpha,vertex,fragment};
})(typeof window!=='undefined'?window:globalThis);
