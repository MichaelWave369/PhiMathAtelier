/* ΦMath Atelier — Great Work Engine R1.
 * Original mathematical art inspired by alchemical symbolism.
 * Symbol meanings are historical associations/creative interpretations, not scientific claims.
 * Standalone, local-first, Canvas2D and no third-party dependencies. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const VERSION = 1;
  const stages = Object.freeze([
    {id:'prima', name:'Prima Materia', verb:'Origin', action:'Emerge', note:'An undifferentiated starting field becomes visible through repeating polar waves.', equation:'r(θ,t) = a + b sin(nθ + ωt)'},
    {id:'calcination', name:'Calcination', verb:'Fire', action:'Fragment', note:'Angular cuts, shards, and radial bursts represent a form breaking into components.', equation:'θₖ = 2πk/n; ρₖ = a + b sin(ωt + kφ)'},
    {id:'dissolution', name:'Dissolution', verb:'Water', action:'Flow', note:'Boundaries fluctuate as harmonics ripple through a radial field.', equation:'r(θ,t) = a + b sin(nθ − ωt) + c cos(2nθ + t)'},
    {id:'sublimation', name:'Sublimation', verb:'Air', action:'Rise', note:'Logarithmic and Archimedean spirals suggest upward motion and dispersion.', equation:'r(θ) = a + bθ; x = r cos θ; y = r sin θ'},
    {id:'coagulation', name:'Coagulation', verb:'Earth', action:'Crystallize', note:'Symmetry locks scattered points into polygons and crystal lattices.', equation:'pₖ = R (cos(2πk/n), sin(2πk/n))'},
    {id:'transmutation', name:'Transmutation', verb:'Stone', action:'Integrate', note:'Nested circles, triangles, squares and harmonic rings form a composite.', equation:'C(r) ∪ T₃(r) ∪ T₄(r) ∪ C(r/φ)'}
  ]);
  function symbol(id,name,glyph,family,stage,meaning,math) {
    return Object.freeze({id,name,glyph,family,stage,meaning,math});
  }
  const symbols = Object.freeze([
    symbol('gold','Gold','☉','Archetype','transmutation','Perfection; the solar metal in many alchemical traditions.','Radial luminosity'),
    symbol('silver','Silver','☽','Archetype','dissolution','Reflection; the lunar metal.','Phase and reflected arcs'),
    symbol('mercury','Mercury','☿','Archetype','sublimation','Volatility and mediation; meanings varied by tradition.','Liquid phase interference'),
    symbol('sulfur','Sulfur','🜍','Archetype','calcination','A principle associated with combustibility and spirit in some systems.','Radial energy'),
    symbol('salt','Salt','⊖','Archetype','coagulation','A stabilizing principle of body or matter in Paracelsian alchemy.','Crystalline grid'),
    symbol('fire','Fire','△','Archetype','calcination','Classical fire; represented here by fragmentation.','Angular rays'),
    symbol('water','Water','▽','Archetype','dissolution','Classical water; represented here by wave harmonics.','Polar sine waves'),
    symbol('air','Air','🜁','Archetype','sublimation','Classical air; represented here by expanding spirals.','Spiral growth'),
    symbol('earth','Earth','🜃','Archetype','coagulation','Classical earth; represented here by stable polygons.','Polygonal lattice'),
    symbol('copper','Copper','♀','Metal','dissolution','The traditional planetary metal associated with Venus.','Coupled circles'),
    symbol('iron','Iron','♂','Metal','calcination','The traditional planetary metal associated with Mars.','Directed vectors'),
    symbol('tin','Tin','♃','Metal','sublimation','The traditional planetary metal associated with Jupiter.','Expanding arcs'),
    symbol('lead','Lead','♄','Metal','prima','The traditional planetary metal associated with Saturn.','Dense boundaries'),
    symbol('ouroboros','Ouroboros','∞','Great Work','prima','A serpent biting its tail, used in many traditions to signify cyclic return.','Periodic feedback'),
    symbol('stone','Philosopher’s Stone','◈','Great Work','transmutation','The legendary goal of transmutation, here reimagined as nested geometry.','Circle · triangle · square'),
    symbol('rebis','Rebis','☯','Great Work','transmutation','A union of opposites in alchemical imagery.','Mirrored phase fields'),
    symbol('athanor','Athanor','▣','Instrument','calcination','The furnace used to sustain controlled heat in alchemical operations.','Thermal oscillation'),
    symbol('alembic','Alembic','⚗','Instrument','sublimation','A historic apparatus for distillation.','Phase separation'),
    symbol('elixir','Elixir','◇','Great Work','dissolution','A legendary preparation associated with renewal or transformation.','Concentric pulse'),
    symbol('prima-materia','Prima Materia','◎','Great Work','prima','Hypothetical first matter; an alchemical philosophical idea, not a scientific material.','Seeded harmonic field')
  ]);
  const archetypes = Object.freeze(['gold','silver','mercury','sulfur','salt','fire','water','air','earth']);
  const defaults = Object.freeze({version:VERSION,stage:'prima',symbol:'prima-materia',mode:'study',
    intensity:62,symmetry:6,recursion:5,speed:45,hue:34,acid:false,paused:false,seed:369});
  const bySymbol = new Map(symbols.map(s=>[s.id,s]));
  const byStage = new Map(stages.map(s=>[s.id,s]));
  function number(value,min,max,fallback) {
    const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;
  }
  function normalize(input) {
    const obj=input && typeof input==='object' && !Array.isArray(input)?input:{};
    if(obj.app && obj.app!=='PhiMath Alchemy') throw Error('Not a PhiMath Alchemy recipe');
    if(obj.version!==undefined && obj.version!==VERSION) throw Error('Unsupported alchemy recipe version');
    return {
      version:VERSION,
      stage:byStage.has(obj.stage)?obj.stage:defaults.stage,
      symbol:bySymbol.has(obj.symbol)?obj.symbol:defaults.symbol,
      mode:['study','play','ritual','atlas'].includes(obj.mode)?obj.mode:defaults.mode,
      intensity:number(obj.intensity,0,100,defaults.intensity),
      symmetry:number(obj.symmetry,3,12,defaults.symmetry),
      recursion:number(obj.recursion,1,9,defaults.recursion),
      speed:number(obj.speed,0,100,defaults.speed),
      hue:number(obj.hue,0,359,defaults.hue),
      acid:obj.acid===true,
      paused:obj.paused===true,
      seed:number(obj.seed,1,999999,defaults.seed)
    };
  }
  function nextStage(current,step) {
    const i=stages.findIndex(s=>s.id===current);
    return stages[(Math.max(0,i)+step+stages.length*4)%stages.length].id;
  }
  function generatePreset(id) {
    const presets={
      'mercury-bloom':{stage:'sublimation',symbol:'mercury',intensity:74,symmetry:7,recursion:5,hue:185},
      'salt-matrix':{stage:'coagulation',symbol:'salt',intensity:56,symmetry:8,recursion:7,hue:205},
      'ouro-loop':{stage:'prima',symbol:'ouroboros',intensity:68,symmetry:9,recursion:6,hue:270},
      'stone-ascension':{stage:'transmutation',symbol:'stone',intensity:80,symmetry:6,recursion:6,hue:42},
      'rebis-merge':{stage:'transmutation',symbol:'rebis',intensity:64,symmetry:4,recursion:7,hue:315},
      'prima-chaos':{stage:'prima',symbol:'prima-materia',intensity:90,symmetry:11,recursion:8,hue:130,acid:true}
    };
    return presets[id]?normalize({...defaults,...presets[id]}):null;
  }
  function rand(seed) {
    let v=(seed|0)||369;
    return function () {v^=v<<13;v^=v>>>17;v^=v<<5;return (v>>>0)/4294967296;};
  }
  // Read-only VJ LAB adapter. The stored recipe is never modified by audio input.
  function clampBand(value){
    const n=Number(value);
    return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
  }
  function modulate(input,bands,wet=.75){
    const s=normalize(input),depth=clampBand(wet);
    if(!bands||depth===0)return s;
    const bass=clampBand(bands.bass),mid=clampBand(bands.mid),
          high=clampBand(bands.high),beat=clampBand(bands.beat);
    return {...s,
      intensity:number(s.intensity+depth*(20*bass+18*beat),0,100,s.intensity),
      speed:number(s.speed+depth*28*mid,0,100,s.speed),
      hue:(s.hue+Math.round(depth*42*high))%360};
  }
  function draw(ctx,canvas,input,seconds,bands=null) {
    const s=modulate(input,bands),stage=stages.find(x=>x.id===s.stage);
    const w=canvas.width,h=canvas.height;
    if(!w||!h) return;
    const min=Math.min(w,h),cX=w/2,cY=h/2,t=seconds*Math.max(.12,s.speed/45);
    const hue=(s.hue+(s.acid?seconds*22:0))%360,amp=s.intensity/100,rec=s.recursion,n=s.symmetry;
    const vivid=s.acid?94:78,
          light=Math.min(90,(s.acid?68:66)+16*clampBand(bands?.beat));
    function color(offset=0,opacity=1,brightness=light) {
      return 'hsla('+((hue+offset+360)%360)+','+vivid+'%,'+brightness+'%,'+opacity+')';
    }
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
    const bg=ctx.createRadialGradient(cX,cY,0,cX,cY,Math.max(w,h)*.85);
    bg.addColorStop(0,'hsl('+hue+',24%,14%)');bg.addColorStop(1,'#05060d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const random=rand(s.seed);
    for(let i=0;i<100;i++) {
      const px=random()*w,py=random()*h,r=.35+random()*1.4;
      ctx.fillStyle=color(100,.12+random()*.26,80);
      ctx.beginPath();ctx.arc(px,py,r,0,TAU);ctx.fill();
    }
    ctx.save();ctx.translate(cX,cY);
    const scale=min*.32;
    ctx.scale(scale,scale);
    ctx.lineCap='round';ctx.lineJoin='round';
    function trace(points,closed,index,alpha=1) {
      if(points.length<2)return;
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
      if(closed)ctx.closePath();
      ctx.strokeStyle=color(index*33,alpha,light+Math.min(12,index*1.5));
      ctx.lineWidth=(s.acid?.009:.006)*(1+amp*.7);
      ctx.stroke();
    }
    function polar(fn,steps=240) {
      const pts=[];for(let j=0;j<=steps;j++){
        const angle=TAU*j/steps,r=fn(angle,j/steps);
        pts.push([r*Math.cos(angle),r*Math.sin(angle)]);
      }return pts;
    }
    function ring(radius,index,phase=0,twist=1){
      const pts=polar(a=>radius+.038*amp*Math.sin(a*n*twist+t*phase+index));
      trace(pts,true,index,.28+.5*(1-index/(rec+2)));
    }
    const offset=s.seed*.0008;
    for(let k=0;k<rec;k++){
      const r=.28+k*.125,ph=(k%2?-1:1);
      if(s.stage==='prima'){
        trace(polar(a=>r+.09*amp*Math.sin(n*a+t*ph+offset+k)),true,k,.67);
      }else if(s.stage==='calcination'){
        const points=[];
        for(let j=0;j<n*2;j++){
          const a=j*Math.PI/n+t*.13*ph,radius=r*(j%2? .62:1.14)+.075*amp*Math.sin(t*2+j+k);
          points.push([radius*Math.cos(a),radius*Math.sin(a)]);
        }trace(points,true,k,.8);
        for(let j=0;j<n;j++){
          const a=j*TAU/n+t*.09,base=.15+k*.08;
          trace([[base*Math.cos(a),base*Math.sin(a)],[(r+.22)*Math.cos(a+.05), (r+.22)*Math.sin(a+.05)]],false,k,.25);
        }
      }else if(s.stage==='dissolution'){
        trace(polar(a=>r+.075*amp*Math.sin(n*a-t*1.3+k)+.03*Math.cos(2*n*a+t)),true,k,.75);
      }else if(s.stage==='sublimation'){
        for(let arm=0;arm<Math.min(n,8);arm++){
          const pts=[];for(let j=0;j<=190;j++){
            const f=j/190,theta=f*TAU*(1.1+k*.24)+arm*TAU/n+t*.4*(k%2?-1:1);
            const radius=.05+f*(.4+k*.11);
            pts.push([radius*Math.cos(theta),radius*Math.sin(theta)]);
          }trace(pts,false,k,.55);
        }
      }else if(s.stage==='coagulation'){
        const vertices=[];for(let j=0;j<n;j++){
          const a=TAU*j/n-Math.PI/2+t*.025;
          vertices.push([r*Math.cos(a),r*Math.sin(a)]);
        }trace(vertices,true,k,.78);
        if(k>0&&k%2===0)for(let j=0;j<n;j++)trace([[0,0],vertices[j]],false,k,.16);
      }else{
        ring(r,k,.16,k%2?-1:1);
        if(k%2===0){
          const count=k%4===0?3:4,pts=[];
          for(let j=0;j<count;j++){
            const a=TAU*j/count-Math.PI/2+t*.045*(k%2?-1:1);
            pts.push([r*Math.cos(a),r*Math.sin(a)]);
          }trace(pts,true,k,.84);
        }
      }
    }
    if(s.acid){
      for(let k=0;k<Math.min(9,rec+2);k++){
        const pts=polar(a=>.34+k*.092+.04*Math.sin(n*2*a+t*1.7+k),260);
        trace(pts,true,k,.35);
      }
    }
    ctx.save();
    ctx.font='.23px Georgia, "Segoe UI Symbol", serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowBlur=.05*scale;ctx.shadowColor=color(0,.7);
    ctx.fillStyle=color(24,.93,84);
    ctx.fillText(bySymbol.get(s.symbol).glyph,0,0);
    ctx.restore();
    ctx.restore();
    // Use HTML for semantic detail; this canvas is intentionally decorative.
    return stage.id;
  }
  function renderTo(ctx,canvas,input,seconds=0,bands=null) {
    if(!ctx||!canvas||!(canvas.width>0&&canvas.height>0))return false;
    return typeof draw(ctx,canvas,input,seconds,bands)==='string';
  }
  function create(options) {
    const canvas=options&&options.canvas;
    if(!canvas||typeof canvas.getContext!=='function')throw Error('A canvas is required');
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('Canvas2D unavailable');
    let state=normalize(options.state),clock=0,last=0,active=true,frame=0;
    const report=typeof options.onChange==='function'?options.onChange:function(){};
    function resize() {
      const box=canvas.getBoundingClientRect();
      const dpr=Math.min(2,root.devicePixelRatio||1);
      const w=Math.max(2,Math.round((box.width||640)*dpr));
      const h=Math.max(2,Math.round((box.height||420)*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    }
    function tick(now) {
      if(!active)return;
      if(!last)last=now;
      const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;
      if(!state.paused)clock+=dt;
      if(now-frame>32||!frame){resize();draw(ctx,canvas,state,clock);frame=now;}
      root.requestAnimationFrame(tick);
    }
    function setState(patch) {state=normalize({...state,...patch});report({...state});return {...state};}
    function setSymbol(id){const sym=bySymbol.get(id);return sym?setState({symbol:id,stage:sym.stage}):{...state};}
    function setStage(id){return byStage.has(id)?setState({stage:id}):{...state};}
    function advance(step=1){return setStage(nextStage(state.stage,step));}
    function randomize(){return setState({seed:1+Math.floor(Math.random()*999999)});}
    root.requestAnimationFrame(tick);report({...state});
    return {getState:()=>({...state}),setState,setSymbol,setStage,advance,randomize,
      redraw:()=>{resize();draw(ctx,canvas,state,clock);},destroy:()=>{active=false;},
      exportRecipe:()=>({app:'PhiMath Alchemy',...state})};
  }
  root.PhiAlchemy=Object.freeze({VERSION,stages,symbols,archetypes,defaults,normalize,
    nextStage,generatePreset,modulate,draw,renderTo,create});
})(typeof window!=='undefined'?window:globalThis);
