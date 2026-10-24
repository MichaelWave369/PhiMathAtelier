import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const mixerSrc=readFileSync(new URL('deck-mixer.js',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const vjSrc=readFileSync(new URL('vj-lab.js',root),'utf8');
const pages=readFileSync(new URL('.github/workflows/pages.yml',root),'utf8');

new vm.Script(mixerSrc,{filename:'deck-mixer.js'});
const sandbox={window:{}};
vm.runInNewContext(mixerSrc,sandbox);
const mixer=sandbox.window.PhiDeckMixer;
assert.equal(typeof mixer.create,'function');
assert.equal(typeof mixer.cleanDeck,'function');
assert.equal(typeof mixer.cleanMix,'function');

const good=mixer.cleanDeck({mode:2,palette:1,seed:42,zoom:90});
assert.equal(good.mode,2);assert.equal(good.palette,1);
assert.equal(good.seed,42);assert.equal(good.zoom,90);
const bounded=mixer.cleanDeck({mode:99,palette:-6,seed:Infinity,density:-100,zoom:900,warp:900});
assert.equal(bounded.mode,4);assert.equal(bounded.palette,0);
assert.equal(bounded.density,15);assert.equal(bounded.zoom,220);
assert.equal(bounded.warp,200);assert.equal(bounded.seed,0);
const invalid=mixer.cleanDeck({acidCycle:'no',pointer:1});
assert.equal(invalid.acidCycle,true,'unsafe non-boolean imports must use defaults');
assert.equal(invalid.pointer,true);

const fallback=mixer.cleanMix(undefined);
assert.equal(fallback.enabled,false,'legacy recipes must not accidentally enable mixing');
assert.equal(fallback.crossfade,0);
assert.equal(fallback.style,'blend');
const changed=mixer.cleanMix({enabled:true,crossfade:800,style:'script'});
assert.equal(changed.enabled,true);assert.equal(changed.crossfade,100);
assert.equal(changed.style,'blend');
assert.equal(mixer.cleanMix({style:'iris'}).style,'iris');
assert.equal(mixer.cleanMix({style:'wipe'}).style,'wipe');

assert.match(mixer.vertex,/attribute vec2 a_position/);
assert.match(mixer.fragment,/uniform sampler2D u_sceneA/);
assert.match(mixer.fragment,/uniform sampler2D u_sceneB/);
assert.match(mixer.fragment,/if\(u_style==1\)/);
assert.match(mixer.fragment,/u_style==2/);
assert.match(mixer.fragment,/gl_FragColor=vec4\(mix\(a,b,mask\),1\.0\)/);
for(const token of ['framebufferTexture2D','checkFramebufferStatus','gl.drawArrays',
  'renderWorld(deckB','renderWorld(getA()','canvas.width*.68',
  "mix.style==='wipe'","mix.style==='iris'",'globalAlpha=t',
  'function exportSettings()','function restore(raw)','function disable()',
  'get crossfade()','function nudge(amount)']){
  assert.ok(mixerSrc.includes(token),'missing mixing engine: '+token);
}
for(const token of ['id="deckMixer"','src="deck-mixer.js"',
  'mixer.drawGL(gl,canvas,renderSceneGL)','mixer.drawCPU(ctx2d,canvas',
  'mixer.exportSettings()','mixer.restore(obj.mixer)',
  'onCrossfade:v=>mixer.setCrossfade(v)',"mixer.nudge(-5)","mixer.nudge(5)",
  "version:'0.4.0'","function renderSceneGL(deck,framebuffer=null"]){
  assert.ok(html.includes(token),'missing studio integration: '+token);
}
assert.ok(vjSrc.includes('<option value="crossfade">Deck A/B visual crossfader</option>'));
assert.ok(vjSrc.includes("if(target==='crossfade')"));
assert.ok(pages.includes('cp deck-mixer.js site/deck-mixer.js'),'deployment must copy mix engine');
console.log('PASS: dual-deck sanitization, shader/compositor contract, CPU fallback, MIDI and recipe integration.');
