import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const chromatic=readFileSync(new URL('../chromatic-warp.js',import.meta.url),'utf8');
assert.match(html, /<!doctype html>/i);
assert.match(html, /<canvas\s+id="art"/);
assert.match(html, /<\/html>/i);

const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,4,'two GLSL shaders, one external renderer and a controller expected');
const controller=scripts.filter(m=>!/x-shader/.test(m[1])&&!/src=/.test(m[1]));
assert.equal(controller.length,1,'one application controller expected');
new vm.Script(controller[0][2],{filename:'atelier-inline.js'});
new vm.Script(chromatic,{filename:'chromatic-warp.js'});

const fragment=scripts.find(m=>/id="fragmentShader"/.test(m[1]))?.[2];
assert.ok(fragment,'missing fragment shader');
const sandbox={window:{}};
new vm.Script(chromatic).runInNewContext(sandbox);
const warp=sandbox.window.PhiChromatic;
assert.equal(warp.patterns.length,6);
assert.equal(typeof warp.draw,'function');
assert.ok(warp.glsl.includes('float acidField(vec2 p)'));
const assembled=fragment.replace('void main(){',warp.glsl+'\nvoid main(){')
 .replace('p/=u_zoom;','p/=u_zoom;\n if(u_mode==4){gl_FragColor=vec4(acidWarp(p),1.0);return;}');
assert.ok(assembled.includes('uniform float u_acidBands;'));
assert.ok(assembled.includes('if(u_mode==4)'));
assert.ok(assembled.includes('vec3 acidWarp(vec2 p)'));

for(const id of [
 'art','density','spiral','warp','glow','zoom','speed','pause','record','shuffle',
 'reset','export','saveRecipe','loadRecipe','recipeFile','copyLink',
 'warpExtras','acidPattern','acidBands','acidBandsOut','acidCycle','acidAuto','acidNext'
])assert.ok(html.includes('id="'+id+'"'),'missing control: '+id);
assert.equal([...html.matchAll(/data-mode="/g)].length,5,'five worlds expected');
assert.equal([...html.matchAll(/data-palette="/g)].length,6,'six palettes expected');
for(const token of [
 "getContext('webgl'","getContext('2d'",'MediaRecorder','canvas.toBlob',
 'JSON.stringify(recipe()',"['galaxy','foam','resonance','bloom','chromatic-warp']",
 'chromatic-warp.js','mode:[0,4]','palette:[0,5]'
])assert.ok(html.includes(token),'missing feature: '+token);

// Exercise the software fallback without a browser or dependency installs.
const buffer={width:0,height:0};
let drawn=null;
const inner={
 createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},
 putImageData(image){drawn=new Uint8ClampedArray(image.data);}
};
buffer.getContext=()=>inner;
sandbox.document={createElement:()=>buffer};
const screen={save(){},restore(){},drawImage(){}};
const canvas={width:120,height:80};
const state={mode:4,palette:5,density:72,spiral:140,warp:65,glow:120,
 zoom:100,seed:369,acidPattern:0,acidBands:16,acidCycle:true};
const unique=[];
for(let pattern=0;pattern<6;pattern++){
 state.acidPattern=pattern; warp.draw(screen,canvas,state,0);
 assert.equal(drawn.length,canvas.width*canvas.height*4);
 unique.push(drawn.slice(0,1024).join(','));
}
assert.ok(new Set(unique).size>=4,'mathematical scenes need distinct fields');
state.acidPattern=0;
warp.draw(screen,canvas,state,0);const before=drawn.slice();
warp.draw(screen,canvas,state,1);const cycled=drawn.slice();
assert.notDeepEqual(cycled,before,'palette cycling must change rendered pixels');
state.acidCycle=false;
warp.draw(screen,canvas,state,0);const paused=drawn.slice();
warp.draw(screen,canvas,state,1);
assert.deepEqual(drawn,paused,'disabled palette cycling should freeze colors');

console.log('PASS: five modes, six palettes, shader integration, JS syntax, six procedural fields, palette cycling and pause.');