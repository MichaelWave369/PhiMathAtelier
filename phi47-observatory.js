/* PHI47-R1: original, offline, simulation-only bubble-gear visual experiment. */
(function(root){
  'use strict';
  const N=47,DEFAULT=[8,9,12,16];
  function state(seed){
    const slots=Array.from({length:N},(_,i)=>i);let x=(seed>>>0)||1;
    for(let i=N-1;i>0;i--){
      x^=x<<13;x^=x>>>17;x^=x<<5;
      const j=(x>>>0)%(i+1);[slots[i],slots[j]]=[slots[j],slots[i]];
    }
    const out=Array(N).fill(-1);
    for(const i of slots.slice(0,24))out[i]=1;
    return out;
  }
  function graph(strides=DEFAULT){
    if(!Array.isArray(strides)||strides.length!==4||strides.some(s=>!Number.isInteger(s)||s<=0||s>=N))throw Error('Invalid strides');
    const offsets=strides.flatMap(s=>[s,N-s]);
    if(new Set(offsets).size!==8)throw Error('Colliding strides');
    return Array.from({length:N},(_,i)=>offsets.map(s=>(i+s)%N));
  }
  const teeth=Array.from({length:9},(_,k)=>(8*k)%N);
  function inspect(shift=0,enabled=true,strides=DEFAULT){
    if(!Number.isInteger(shift)||shift<0||shift>=N||typeof enabled!=='boolean')throw Error('Invalid controls');
    const A=state(369),B=state(963),adj=graph(strides),active=new Set(enabled?teeth:[]);
    let next=0,correlation=0;
    for(let i=0;i<N;i++){
      let vote=adj[i].reduce((s,j)=>s+A[j],0);
      if(active.has(i)){
        const j=(i+shift)%N;
        vote+=B[j];correlation+=A[i]*B[j];
      }
      next+=vote===0?A[i]:Math.sign(vote);
    }
    return {schema:'phi47-observatory-r1',origin:'SIMULATED',authority:'NONE',
      shift,enabled,initialA:1,initialB:1,nextAggregateA:next,
      interfaceCorrelation:correlation,activeTeeth:active.size,strides:[...strides]};
  }
  function sweep(strides=DEFAULT){
    return Array.from({length:N},(_,shift)=>inspect(shift,true,strides));
  }
  const API=Object.freeze({N,graph,state,inspect,sweep,teeth:[...teeth]});
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof root!=='undefined')root.Phi47Observatory=API;
  if(typeof document==='undefined'||typeof window==='undefined')return;
  window.addEventListener('DOMContentLoaded',()=>{
    const canvas=document.getElementById('mesh');
    if(!canvas)return;
    const ctx=canvas.getContext('2d'),shift=document.getElementById('shift'),
      mode=document.getElementById('mode'),topology=document.getElementById('topology'),
      stats=document.getElementById('stats'),exportButton=document.getElementById('export');
    const recipes={phi:[8,9,12,16],local:[1,2,3,4],control:[3,7,11,19]};
    function render(){
      const selected=recipes[topology.value]||recipes.phi;
      const r=inspect(Number(shift.value),mode.value==='open',selected);
      shift.nextElementSibling.textContent=String(r.shift);
      stats.textContent='Initial Keyholes: A = +1, B = +1  |  Next A = '+r.nextAggregateA+
        '  |  Interface correlation = '+r.interfaceCorrelation+'  |  Active teeth = '+r.activeTeeth;
      const A=state(369),B=state(963),ad=graph(selected);
      const circles=[{cx:225,cy:210,values:A},{cx:635,cy:210,values:B}];
      ctx.clearRect(0,0,860,440);
      ctx.fillStyle='#071222';ctx.fillRect(0,0,860,440);
      function pt(c,i){const a=i*2*Math.PI/N-Math.PI/2;return {x:c.cx+147*Math.cos(a),y:c.cy+147*Math.sin(a)};}
      for(const c of circles){
        ctx.lineWidth=.55;ctx.strokeStyle='rgba(94,167,199,.15)';
        for(let i=0;i<N;i++)for(const j of ad[i])if(i<j){
          const p=pt(c,i),q=pt(c,j);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
        }
      }
      if(r.enabled)for(const i of teeth){
        const p=pt(circles[0],i),q=pt(circles[1],(i+r.shift)%N);
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
        ctx.strokeStyle='rgba(255,202,94,.43)';ctx.lineWidth=1.4;ctx.stroke();
      }
      for(const c of circles){
        for(let i=0;i<N;i++){
          const p=pt(c,i);ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);
          ctx.fillStyle=c.values[i]>0?'#66e0c7':'#ef8d96';ctx.fill();
        }
      }
      ctx.font='bold 19px system-ui';ctx.fillStyle='#f6d68f';
      ctx.fillText('BUBBLE A',174,27);ctx.fillText('BUBBLE B',584,27);
      ctx.fillStyle='#aec2d2';ctx.font='13px system-ui';ctx.fillText('Keyhole = +1',181,412);ctx.fillText('Keyhole = +1',594,412);
    }
    shift.addEventListener('input',render);mode.addEventListener('change',render);
    topology.addEventListener('change',render);
    exportButton.addEventListener('click',()=>{
      const data={experiment:'PHI47-R1',interpretation:'simulation-only; no physical validation',
        records:sweep(recipes[topology.value]||recipes.phi)};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='phi47-r1-observatory.json';a.click();
      URL.revokeObjectURL(url);
    });
    render();
  });
})(typeof globalThis!=='undefined'?globalThis:this);
