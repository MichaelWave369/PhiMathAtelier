/* ΦMath Atelier · VJ LAB v0.3.0
   Local Web Audio FFT -> parameter modulation. No audio is uploaded.
   External adapter is opt-in and origin-restricted. */
(function(global){
 'use strict';
 const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(v))?Number(v):lo));
 const settings={wet:.72,bass:1,mid:.85,high:.7};
 function bandsFromBins(bins,sampleRate,fftSize){
  if(!bins||!bins.length||!(sampleRate>0))return {bass:0,mid:0,high:0,level:0};
  const hz=sampleRate/fftSize;
  function avg(lo,hi){
   const first=Math.max(0,Math.ceil(lo/hz)),last=Math.min(bins.length-1,Math.floor(hi/hz));
   if(last<first)return 0;
   let sum=0,n=0;
   for(let i=first;i<=last;i++){sum+=Math.pow(bins[i]/255,1.6);n++;}
   return clamp(Math.max(0,(sum/n-.018)*1.34));
  }
  const bass=avg(35,180),mid=avg(180,2300),high=avg(2300,11000);
  return {bass,mid,high,level:clamp((bass+mid+high)/3)};
 }
 function modulation(state,bands,depth=settings){
  const wet=clamp(depth.wet),b=clamp(bands.bass)*clamp(depth.bass)*wet,
    m=clamp(bands.mid)*clamp(depth.mid)*wet,h=clamp(bands.high)*clamp(depth.high)*wet,
    beat=clamp(bands.beat)*wet;
  return {...state,
    warp:clamp(state.warp+b*80+beat*24,0,200),
    spiral:clamp(state.spiral+m*76,20,300),
    density:clamp(state.density+h*20,15,100),
    glow:clamp(state.glow+(h*.85+b*.20+beat*.60)*85,25,250),
    zoom:clamp(state.zoom-b*13+beat*9,50,220),
    acidBands:Math.round(clamp(state.acidBands+h*9,4,48))
  };
 }
 const patterns=['Bass → deformation','Mids → harmonic frequency','Highs → glow / color bands','Beat → luminous shock'];
 const stylesheet=[
 '.vj-lab{border:1px solid #5e4861;border-radius:15px;background:linear-gradient(160deg,#211726,#101520);padding:14px;margin-bottom:24px}',
 '.vj-lab .vj-title{display:flex;justify-content:space-between;align-items:center;font-size:15px;color:#f9d7a6;font-family:Georgia,serif;margin-bottom:6px}',
 '.vj-lab .vj-status{color:#a8a3bb;font-size:11px;line-height:1.5;min-height:31px;margin:7px 0}',
 '.vj-lab .vj-desc{color:#989db0;font-size:10px;line-height:1.6;margin:9px 0}',
 '.vj-lab .vj-field{display:grid;gap:5px;margin:12px 0;color:#cdcbd9;font-size:11px}',
 '.vj-lab select,.vj-lab input[type=text]{background:#131623;border:1px solid #494357;border-radius:8px;color:#e7e2e8;padding:8px 7px;width:100%;font:inherit;min-width:0}',
 '.vj-lab input[type=range]{width:100%;accent-color:#ebbc87;min-width:0}',
 '.vj-lab .vj-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}',
 '.vj-lab button{border:1px solid #67536f;border-radius:8px;background:#2d2234;color:#f1dabe;padding:8px 6px;cursor:pointer;font:inherit;font-size:11px}',
 '.vj-lab button:hover{background:#40304b}.vj-lab button:disabled{opacity:.45;cursor:default}',
 '.vj-lab .vj-meter{display:grid;grid-template-columns:34px 1fr 30px;gap:5px;align-items:center;font-size:10px;color:#aeb4bf;margin:7px 0}',
 '.vj-lab .vj-track{height:7px;border-radius:8px;overflow:hidden;background:#10111c;border:1px solid #414154}',
 '.vj-lab .vj-fill{width:0;height:100%;background:linear-gradient(90deg,#29bec8,#e2e672,#f370a9);transition:width .06s}',
 '.vj-lab .vj-value{text-align:right;font-variant-numeric:tabular-nums}',
 '.vj-lab audio{width:100%;height:36px;display:none;margin:8px 0}',
 '.vj-lab .vj-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
 '.vj-lab .vj-grid label{min-width:0;color:#b7b4c6;font-size:10px;display:grid;gap:3px}',
 '.vj-lab .vj-footer{border-top:1px solid #433447;padding-top:10px;margin-top:10px}',
 '.vj-lab .vj-on{color:#9dffce}.vj-lab .vj-error{color:#ffb0ac}',
 '.stage:fullscreen{background:#000}.stage:fullscreen canvas{width:100vw;height:100vh}'
 ].join('\n');

 function create({root,stage,canvas,onCrossfade}){
  if(!root||!stage||!canvas)throw Error('VJ LAB requires a panel, stage and art canvas.');
  const style=document.createElement('style');style.textContent=stylesheet;document.head.append(style);
  root.innerHTML=[
   '<div class="vj-title"><span>♫ VJ LAB</span><span style="font:10px system-ui;color:#d8a77b">v0.3</span></div>',
   '<div class="vj-desc">Play the equations. Input audio or manually sculpt the frequency bands.</div>',
   '<label class="vj-field">Signal input<select id="vjSource"><option value="demo">Demo beat (no permissions)</option><option value="manual">Manual bands</option><option value="mic">Microphone / audio interface</option><option value="file">Local music file</option><option value="tab">Browser tab audio capture</option><option value="external">BackSpin96 / external adapter</option></select></label>',
   '<div id="vjStatus" class="vj-status" role="status" aria-live="polite">Demo beat ready. Click Start input; no permissions needed.</div>',
   '<div class="vj-buttons"><button id="vjConnect" type="button">▶ Start input</button><button id="vjStop" type="button">■ Stop input</button></div>',
   '<input id="vjFile" type="file" accept="audio/*" hidden><audio id="vjPlayer" controls></audio>',
   '<div id="vjMeters" aria-label="Frequency levels">',
    ...['bass','mid','high'].map(k=>'<div class="vj-meter"><span>'+k.toUpperCase()+'</span><div class="vj-track"><div class="vj-fill" id="vjFill-'+k+'"></div></div><span class="vj-value" id="vjVal-'+k+'">0</span></div>'),
   '</div>',
   '<label class="vj-field">Modulation preset<select id="vjPreset"><option value="jungle">Jungle Reactor</option><option value="ambient">Ambient Drift</option><option value="punch">Kick & Glow</option><option value="custom">Custom</option></select></label>',
   '<label class="vj-field">Master modulation <output id="vjWetValue">72%</output><input id="vjWet" type="range" min="0" max="100" value="72"></label>',
   '<div class="vj-grid">',
   ...['bass','mid','high'].map(k=>'<label>'+k.toUpperCase()+' depth<input id="vjDepth-'+k+'" type="range" min="0" max="150" value="'+Math.round(settings[k]*100)+'"></label>'),
   '</div>',
   '<div id="vjManual" hidden><div class="vj-desc">Inject your own band energy.</div><div class="vj-grid">',
   ...['bass','mid','high'].map(k=>'<label>'+k.toUpperCase()+'<input id="vjManual-'+k+'" type="range" min="0" max="100" value="0"></label>'),
   '</div><button id="vjPulse" type="button" style="width:100%;margin-top:8px">⚡ Inject beat</button></div>',
   '<div class="vj-buttons"><button id="vjMIDI" type="button">🎹 Connect MIDI</button><button id="vjFullscreen" type="button">⛶ Fullscreen stage</button></div>',
   '<label class="vj-field">MIDI knob learn<select id="vjMidiTarget"><option value="wet">Master modulation</option><option value="bass">Bass depth</option><option value="mid">Mid depth</option><option value="high">High depth</option><option value="crossfade">Deck A/B visual crossfader</option></select></label>',
   '<button id="vjLearn" type="button" style="width:100%">Learn next MIDI CC</button>',
   '<div class="vj-footer"><label class="vj-field">Allowed bridge origin (optional)<input id="vjOrigin" type="text" placeholder="https://trusted-bridge.example" spellcheck="false"></label>',
   '<div class="vj-desc">BackSpin96 bridge accepts normalized 0–1 bands via <code>PhiVJLab.pushFrame()</code> locally, a same-origin BroadcastChannel, or postMessage from an explicitly allowed origin. Audio is never uploaded.</div></div>'
  ].join('');
  const el=id=>root.querySelector('#'+id);
  let source='demo',audioContext=null,analyser=null,freq=null,stream=null,channel=null,
      audioElement=null,audioObjectURL=null,inputNode=null,midiAccess=null,
      midiLearn=false,midiBindings={},time=0,beatEnergy=0,beatAverage=.1,
      lastBeat=-10,streamToken=0,externalTime=-10,externalFrame=null,
      current={bass:0,mid:0,high:0,beat:0,level:0},raw={bass:0,mid:0,high:0,beat:0,level:0},
      demoRunning=false,lastMeters=0,disposed=false;
  const note=(s,error=false)=>{el('vjStatus').textContent=s;el('vjStatus').className='vj-status '+(error?'vj-error':'');};
  function updateDepth(){
   settings.wet=Number(el('vjWet').value)/100;
   for(const k of ['bass','mid','high'])settings[k]=Number(el('vjDepth-'+k).value)/100;
   el('vjWetValue').textContent=Math.round(settings.wet*100)+'%';
  }
  function setPreset(v){
   const p={
    jungle:[90,125,80,70],
    ambient:[48,35,105,70],
    punch:[100,150,30,115]
   }[v];
   if(!p)return;
   el('vjWet').value=p[0];
   for(const [i,k] of ['bass','mid','high'].entries())el('vjDepth-'+k).value=p[i+1];
   updateDepth();
  }
  function endSource(){
   ++streamToken;
   if(inputNode){try{inputNode.disconnect();}catch(_){ }inputNode=null;}
   if(stream){for(const t of stream.getTracks())t.stop();stream=null;}
   if(audioElement){audioElement.pause();audioElement.removeAttribute('src');audioElement.load();audioElement=null;}
   if(audioObjectURL){URL.revokeObjectURL(audioObjectURL);audioObjectURL=null;}
   el('vjPlayer').style.display='none';
   if(analyser){try{analyser.disconnect();}catch(_){}analyser=null;}
   freq=null;
   externalFrame=null;
  }
  async function ensureAudio(){
   const Type=global.AudioContext||global.webkitAudioContext;
   if(!Type)throw Error('Web Audio is unavailable in this browser.');
   if(!audioContext||audioContext.state==='closed')audioContext=new Type();
   if(audioContext.state==='suspended')await audioContext.resume();
   analyser=audioContext.createAnalyser();
   analyser.fftSize=2048;
   analyser.smoothingTimeConstant=.76;
   freq=new Uint8Array(analyser.frequencyBinCount);
  }
  async function start(){
   const token=++streamToken,mode=source;
   if(mode==='demo'){demoRunning=true;note('Demo beat active. Bass, mids and highs animate without audio access.');return;}
   if(mode==='manual'){note('Manual band controls ready. Inject a beat to test the pulse.');return;}
   if(mode==='external'){note('Listening for local BackSpin96 frames or approved bridge messages.');return;}
   if(mode==='file'){el('vjFile').click();return;}
   if(mode==='tab'&&(!navigator.mediaDevices?.getDisplayMedia)){
    note('Tab capture is not available here. Try Chrome/Edge on HTTPS or use a file.',true);return;
   }
   if(mode==='mic'&&(!navigator.mediaDevices?.getUserMedia)){
    note('Microphone requires HTTPS and browser permission.',true);return;
   }
   try{
    let captured;
    if(mode==='mic')captured=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false},video:false});
    else captured=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
    if(disposed||token!==streamToken){captured.getTracks().forEach(t=>t.stop());return;}
    if(!captured.getAudioTracks().length){
     captured.getTracks().forEach(t=>t.stop());
     note('No audio track was shared. For tab capture, enable Share tab audio.',true);return;
    }
    await ensureAudio();
    if(disposed||token!==streamToken){captured.getTracks().forEach(t=>t.stop());return;}
    stream=captured;
    inputNode=audioContext.createMediaStreamSource(stream);
    inputNode.connect(analyser); // never connect microphone/tab audio to speakers
    stream.getAudioTracks().forEach(t=>t.addEventListener('ended',()=>{
      if(stream===captured){endSource();note('Audio capture ended.');}
    }));
    note(mode==='mic'?'Microphone analysing locally.':'Tab audio analysing locally (not replayed).');
   }catch(err){note('Input could not start: '+(err?.message||String(err)),true);}
  }
  async function openFile(file){
   if(!file)return;
   endSource();
   source='file';el('vjSource').value='file';
   if(!file.type.startsWith('audio/')&&!/\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(file.name)){
    note('Please select a supported audio file.',true);return;
   }
   try{
    await ensureAudio();
    const player=el('vjPlayer');
    audioObjectURL=URL.createObjectURL(file);
    player.src=audioObjectURL;player.style.display='block';audioElement=player;
    inputNode=audioContext.createMediaElementSource(player);
    inputNode.connect(analyser);analyser.connect(audioContext.destination);
    note('Local file loaded. Use the player to start or pause audio.');
    try{await player.play();}catch(_){/* Some browsers require a separate player click. */}
   }catch(err){note('Cannot decode this audio file: '+(err?.message||err),true);}
  }
  function switchSource(next){
   endSource();
   source=next;current={bass:0,mid:0,high:0,beat:0,level:0};raw={...current};
   el('vjManual').hidden=next!=='manual';
   el('vjConnect').textContent=next==='file'?'♫ Choose music':'▶ Start input';
   note(next==='demo'?'Demo beat ready. No permissions needed.':next==='manual'?'Adjust the three bands below.':next==='external'?'Waiting for explicit external frames.':'Click Start input to grant access.');
  }
  function pushFrame(frame){
   if(source!=='external'||!frame||typeof frame!=='object')return false;
   for(const k of ['bass','mid','high'])if(typeof frame[k]!=='number'||!Number.isFinite(frame[k])||frame[k]<0||frame[k]>1)return false;
   externalFrame={bass:frame.bass,mid:frame.mid,high:frame.high,
       beat:frame.beat===true||frame.beat===1?1:0,
       level:clamp((frame.bass+frame.mid+frame.high)/3)};
   externalTime=performance.now()/1000;
   return true;
  }
  function messageHandler(event){
   if(source!=='external'||!event?.data||event.data.type!=='phimath:vj:frame'||event.data.version!==1)return;
   const allowed=el('vjOrigin').value.trim();
   if(!allowed||event.origin!==allowed)return;
   pushFrame(event.data.frame);
  }
  global.addEventListener('message',messageHandler);
  if(typeof global.BroadcastChannel==='function'){
   channel=new global.BroadcastChannel('phimath-vj-v1');
   channel.onmessage=e=>{
    if(source==='external'&&e?.data?.type==='phimath:vj:frame'&&e.data.version===1)
     pushFrame(e.data.frame);
   };
  }
  function midiMessage(e){
   if((e.data[0]&0xf0)!==0xb0)return;
   const cc=e.data[1],value=e.data[2]/127;
   if(midiLearn){
    const target=el('vjMidiTarget').value;
    midiBindings[target]=cc;midiLearn=false;
    el('vjLearn').textContent='Learn next MIDI CC';
    note('MIDI CC '+cc+' now controls '+target+'.');
    return;
   }
   for(const [target,mapped] of Object.entries(midiBindings)){
    if(mapped!==cc)continue;
    if(target==='crossfade'){
     if(typeof onCrossfade==='function')onCrossfade(value);
     continue;
    }
    const id=target==='wet'?'vjWet':'vjDepth-'+target;
    el(id).value=Math.round(value*(target==='wet'?100:150));
    el('vjPreset').value='custom';updateDepth();
   }
  }
  async function connectMIDI(){
   if(!navigator.requestMIDIAccess){note('Web MIDI unsupported. Chrome/Edge on HTTPS may work.',true);return;}
   try{
    midiAccess=await navigator.requestMIDIAccess({sysex:false});
    function sync(){
     for(const input of midiAccess.inputs.values())input.onmidimessage=midiMessage;
     note('MIDI ready. Select a target, press Learn, then turn a CC knob.');
    }
    midiAccess.onstatechange=sync;sync();
   }catch(e){note('MIDI permission unavailable: '+(e?.message||e),true);}
  }
  function update(dt){
   if(disposed)return;
   time+=clamp(dt,0,.2);
   if(source==='demo'){
    if(demoRunning){
     const phase=time*2.8,beat=Math.pow(Math.max(0,Math.sin(phase*Math.PI*2)),12);
     raw={bass:clamp(.15+beat*.79),mid:clamp(.26+.32*Math.sin(time*5.2)**2),
          high:clamp(.18+.41*Math.sin(time*9.1)**2),beat:beat>.78?1:0,level:.48};
    }else raw={bass:0,mid:0,high:0,beat:0,level:0};
   }else if(source==='manual'){
    raw={bass:Number(el('vjManual-bass').value)/100,mid:Number(el('vjManual-mid').value)/100,
         high:Number(el('vjManual-high').value)/100,beat:0,level:0};
   }else if(source==='external'){
    raw=externalFrame&&performance.now()/1000-externalTime<1.5?externalFrame:
       {bass:0,mid:0,high:0,beat:0,level:0};
   }else if(analyser&&audioContext?.state==='running'){
    analyser.getByteFrequencyData(freq);
    raw=bandsFromBins(freq,audioContext.sampleRate,analyser.fftSize);
   }else raw={bass:0,mid:0,high:0,beat:0,level:0};
   const attack=.28,release=.10;
   for(const k of ['bass','mid','high']){
    const factor=raw[k]>current[k]?attack:release;
    current[k]+=factor*(raw[k]-current[k]);
   }
   beatAverage=beatAverage*.96+current.bass*.04;
   if(raw.beat||((source==='mic'||source==='file'||source==='tab')&&
      current.bass>Math.max(.20,beatAverage*1.40)&&time-lastBeat>.26)){
    if(time-lastBeat>.20){beatEnergy=1;lastBeat=time;}
   }
   beatEnergy=Math.max(0,beatEnergy-dt*3.5);
   current.beat=beatEnergy;
   current.level=(current.bass+current.mid+current.high)/3;
   if(time-lastMeters>.07){
    for(const k of ['bass','mid','high']){
     const v=Math.round(current[k]*100);
     el('vjFill-'+k).style.width=v+'%';el('vjVal-'+k).textContent=String(v);
    }
    lastMeters=time;
   }
  }
  function effective(state){return modulation(state,current,settings);}
  function cleanup(){
   disposed=true;endSource();global.removeEventListener('message',messageHandler);
   if(channel){channel.close();channel=null;}
   global.PhiVJLab.pushFrame=()=>false;
   if(midiAccess){for(const i of midiAccess.inputs.values())i.onmidimessage=null;midiAccess.onstatechange=null;}
   if(audioContext)audioContext.close().catch(()=>{});
  }
  el('vjPreset').addEventListener('change',e=>setPreset(e.target.value));
  el('vjWet').addEventListener('input',()=>{el('vjPreset').value='custom';updateDepth();});
  for(const k of ['bass','mid','high'])el('vjDepth-'+k).addEventListener('input',()=>{el('vjPreset').value='custom';updateDepth();});
  el('vjSource').addEventListener('change',e=>switchSource(e.target.value));
  el('vjConnect').addEventListener('click',start);
  el('vjStop').addEventListener('click',()=>{if(source==='demo')demoRunning=false;else endSource();raw={bass:0,mid:0,high:0,beat:0,level:0};note('Input stopped.');});
  el('vjFile').addEventListener('change',e=>{openFile(e.target.files?.[0]);e.target.value='';});
  el('vjPulse').addEventListener('click',()=>{beatEnergy=1;lastBeat=time;});
  el('vjMIDI').addEventListener('click',connectMIDI);
  el('vjLearn').addEventListener('click',()=>{
   if(!midiAccess){note('Connect MIDI first.',true);return;}
   midiLearn=true;el('vjLearn').textContent='Turn a controller knob…';
  });
  el('vjFullscreen').addEventListener('click',async()=>{
   try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}
   catch(e){note('Fullscreen not supported: '+(e?.message||e),true);}
  });
  // Default jungle profile makes incoming musical input noticeably expressive.
  setPreset('jungle');
  global.PhiVJLab.pushFrame=pushFrame;
  return {update,effective,pushFrame,cleanup,modulation,bandsFromBins,
   get levels(){return {...current};},get source(){return source;}};
 }
 global.PhiVJLab={create,modulation,bandsFromBins};
})(window);
