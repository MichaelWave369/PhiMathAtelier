/* Standalone browser UI for a dimensionality-reduced supersolid-inspired model. */
(function () {
  "use strict";
  const Core = globalThis.SupersolidCore;
  const $ = id => document.getElementById(id);
  if (!Core) { $("status").textContent="Model engine not loaded."; return; }
  const controlIds=["mode","grid","cycles","pump","nonlinearity","disorder","noise","diffusion","seed"];
  const sliders=["cycles","pump","nonlinearity","disorder","noise","diffusion"];
  let model=null, running=false, frame=0, lastDraw=0, last=null, comparison=null;
  function parseInputs() {
    return Core.normalize({
      n:Number($("grid").value),seed:Number($("seed").value),
      mode:$("mode").value,cycles:Number($("cycles").value),
      pump:Number($("pump").value),diffusion:Number($("diffusion").value),
      nonlinearity:Number($("nonlinearity").value),disorder:Number($("disorder").value),
      noise:Number($("noise").value)
    });
  }
  function setStatus(message){$("status").textContent=message;}
  function updateLabels(){for(const id of sliders){$(id+"Value").textContent=$(id).value;}}
  function refreshLabels(p){$("stageLabel").textContent=p.mode.toUpperCase()+" · SIMULATED · SEED "+p.seed;}
  function pause(){
    running=false;
    $("play").textContent="▶ Run";
    if(frame)cancelAnimationFrame(frame);
    frame=0;
  }
  function reset(){
    pause();
    try{
      const p=parseInputs();
      model=Core.makeModel(p);
      comparison=null;
      $("compareData").hidden=true;
      updateLabels();
      refreshLabels(p);
      paint();
      setStatus("Ready. Press Run or +25 steps to advance the model.");
    }catch(err){setStatus("Invalid parameters: "+err.message);}
  }
  function paint(){
    if(!model)return;
    last=model.measure();
    const p=model.config,n=p.n;
    const canvas=$("density"),ctx=canvas.getContext("2d");
    if(canvas.width!==n||canvas.height!==n){canvas.width=n;canvas.height=n;}
    const img=ctx.createImageData(n,n);
    let top=0;
    for(const a of last.intensity){if(a>top)top=a;}
    top=Math.max(top,.00001);
    for(let i=0;i<last.intensity.length;i++){
      const v=Math.min(1,Math.sqrt(last.intensity[i]/top)),off=i*4;
      img.data[off]=Math.round(9+170*v);
      img.data[off+1]=Math.round(24+196*v);
      img.data[off+2]=Math.round(45+163*v);
      img.data[off+3]=255;
    }
    ctx.putImageData(img,0,0);
    ctx.strokeStyle="#ffb77e";ctx.lineWidth=.7;
    for(const v of last.vortices){
      ctx.beginPath();ctx.arc(v.x,v.y,1.6,0,2*Math.PI);ctx.stroke();
    }
    const profile=$("profile"),g=profile.getContext("2d");
    const w=profile.width,h=profile.height,plotH=h-28;
    g.clearRect(0,0,w,h);g.fillStyle="#081b2a";g.fillRect(0,0,w,h);
    g.strokeStyle="#294558";g.lineWidth=1;
    for(let i=0;i<=4;i++){const y=11+i*(plotH-18)/4;g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
    const max=Math.max(.001,...last.profile)*1.08;
    g.strokeStyle="#7cead1";g.lineWidth=2.5;g.beginPath();
    last.profile.forEach((v,i)=>{
      const x=i*(w-1)/(n-1),y=plotH-9-(v/max)*(plotH-23);
      if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
    });g.stroke();
    g.fillStyle="#a7bfc6";g.font="11px ui-monospace,monospace";
    g.fillText("x →    intensity (arbitrary units)    ·  model-only",10,h-8);
    $("mean").textContent=last.meanDensity.toFixed(3);
    $("contrast").textContent=last.stripeContrast.toFixed(3);
    $("phase").textContent=last.stripePhase===null?"—":(last.stripePhase*180/Math.PI).toFixed(1)+"°";
    $("vortices").textContent=String(last.vortexCount);
    $("time").textContent=last.modelTime.toFixed(2);
    $("steps").textContent=String(last.step);
  }
  function loop(now){
    if(!running)return;
    if(now-lastDraw>32){
      model.step(4);
      paint();
      lastDraw=now;
    }
    frame=requestAnimationFrame(loop);
  }
  function exportBlob(name,blob){
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function exportReceipt(){
    if(!model||!last)return;
    const m={...last};
    delete m.intensity;
    const receipt={
      schema:"phimath.supersolid-simulation-v1",
      classification:"DIMENSIONLESS_TOY_MODEL_NOT_EXPERIMENTAL_DATA",
      doi:"10.1126/sciadv.aee4875",
      model:"Two slowly varying envelopes with saturating gain, diffusion, phase nonlinearity, static disorder and phenomenological locking control",
      config:model.config,observables:m,
      controls:comparison,
      cautions:["No quantum hardware or physical measurements","No full RDSOC/Boltzmann-Gross-Pitaevskii integration",
        "An imprinted vortex is an initialized defect, not observed spontaneous formation",
        "Reproduce the field by using the same seed, parameters and step count."]
    };
    exportBlob("phimath-supersolid-"+model.config.seed+".json",
      new Blob([JSON.stringify(receipt,null,2)],{type:"application/json"}));
    setStatus("Local JSON receipt saved. Classification: dimensionless toy model.");
  }
  function exportPng(){
    if(!model)return;
    const src=$("density"),out=document.createElement("canvas");
    out.width=768;out.height=768;
    const ctx=out.getContext("2d");
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(src,0,0,out.width,out.height);
    out.toBlob(blob=>{
      if(blob)exportBlob("phimath-supersolid-"+model.config.seed+".png",blob);
      else setStatus("PNG export unsupported.");
    },"image/png");
  }
  function histogram(phases){
    const c=$("histogram"),g=c.getContext("2d"),bins=new Array(12).fill(0);
    for(const a of phases){const idx=Math.min(11,Math.floor((a+Math.PI)/(2*Math.PI)*12));bins[Math.max(0,idx)]++;}
    const w=c.width,h=c.height,pad=15,bar=(w-2*pad)/12;
    g.fillStyle="#081b2a";g.fillRect(0,0,w,h);
    const max=Math.max(1,...bins);
    bins.forEach((b,i)=>{
      const height=(b/max)*(h-32);
      g.fillStyle="#75dccc";
      g.fillRect(pad+i*bar+2,h-18-height,bar-5,height);
    });
    g.fillStyle="#afc5cb";g.font="10px ui-monospace,monospace";
    g.fillText("−π",pad,h-4);g.fillText("0",w/2,h-4);g.fillText("+π",w-pad-19,h-4);
  }
  function runControls(){
    if(!model)return;
    pause();
    $("runControls").disabled=true;
    setStatus("Running eight-seed controls locally.");
    // The synchronous model is small enough to run without a worker.
    try{
      const result=Core.runControls(model.config,8,90);
      comparison=result;
      const cards=$("comparisonCards");
      cards.replaceChildren();
      const names={two:"Two opposing modes",single:"Single-mode baseline",locked:"Synthetic phase-locking control"};
      for(const row of result.scenarios){
        const card=document.createElement("div");card.className="exp-card";
        const heading=document.createElement("span");heading.textContent=names[row.mode];
        const strong=document.createElement("strong");strong.textContent="Contrast "+row.meanContrast.toFixed(3);
        const small=document.createElement("small");
        small.textContent="Eight shots · circular phase resultant: "+
          (row.phaseResultant===null?"not defined":row.phaseResultant.toFixed(3));
        card.append(heading,strong,small);cards.append(card);
      }
      histogram(result.scenarios.find(x=>x.mode==="two").phases);
      $("compareData").hidden=false;
      setStatus("Eight independent seeds per control completed. All results are simulated, not experimental.");
    }catch(err){setStatus("Comparison failed: "+err.message);}
    finally{$("runControls").disabled=false;}
  }
  for(const id of controlIds){$(id).addEventListener("change",reset);}
  for(const id of sliders){$(id).addEventListener("input",updateLabels);}
  $("play").addEventListener("click",()=>{
    if(!model)return;
    if(running){pause();setStatus("Paused.");return;}
    running=true;$("play").textContent="Ⅱ Pause";setStatus("Running dimensionless model.");
    lastDraw=0;frame=requestAnimationFrame(loop);
  });
  $("step").addEventListener("click",()=>{
    if(!model)return;pause();model.step(25);paint();setStatus("Advanced by 25 model steps.");
  });
  $("reset").addEventListener("click",reset);
  $("newSeed").addEventListener("click",()=>{
    $("seed").value=String((Number($("seed").value)+7919)>>>0);reset();
  });
  $("exportJson").addEventListener("click",exportReceipt);
  $("exportPng").addEventListener("click",exportPng);
  $("runControls").addEventListener("click",runControls);
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&running){pause();setStatus("Paused when tab became hidden.");}
  });
  reset();
})();
