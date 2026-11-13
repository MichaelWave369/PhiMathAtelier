/* Crop Circle Observatory r0.3 · local comparative geometry, not an authorship detector. */
(function(root){
 'use strict';
 const METHOD='ordered-normalized-radii-v1';
 const GAP=0.22, DIFF_WEIGHT=1.7;
 const round=(v,d=4)=>Number(v.toFixed(d));
 function makeProfile(name,radii,metadata={}){
  if(typeof name!=='string'||!name.trim()||name.length>120)throw Error('Name required (1–120 characters).');
  if(!Array.isArray(radii)||radii.length<2||radii.length>12||
     radii.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<=0||x>1000000))
   throw Error('Enter 2–12 positive finite ring radii (in consistent units).');
  const ordered=[...radii].sort((a,b)=>a-b);
  for(let i=1;i<ordered.length;i++)if(ordered[i]<=ordered[i-1])
   throw Error('Radii must be distinct; duplicates do not represent different rings.');
  const largest=ordered[ordered.length-1];
  if(largest<=0)throw Error('Outer radius must be positive.');
  const norm=ordered.map(r=>r/largest);
  const sourceType=typeof metadata.sourceType==='string'?metadata.sourceType.slice(0,80):'manual';
  const sourceUrl=typeof metadata.sourceUrl==='string'?metadata.sourceUrl.slice(0,2048):null;
  const notes=typeof metadata.notes==='string'?metadata.notes.slice(0,500):'';
  return {schema:'phi-crop-fingerprint/v0.3',name:name.trim(),sourceType,sourceUrl,notes,
   ringCount:ordered.length,radii:ordered,normalizedRadii:norm.map(n=>round(n,6)),
   suitability:ordered.length>=3?'exploratory':'low-information',
   caveat:'Scale-normalized concentric ring geometry only; not invariant to perspective, cropping, center ambiguity or identification choices.'};
 }
 function parseRadii(text){
  if(typeof text!=='string'||text.length>800)throw Error('Provide comma-separated radii.');
  const parts=text.trim().split(/[\s,;]+/).filter(Boolean);
  if(!parts.length)throw Error('No radii were supplied.');
  const values=parts.map(s=>Number(s));
  if(values.some(n=>!Number.isFinite(n)))throw Error('Radii must be numeric.');
  return values;
 }
 function fromReceipt(receipt,name){
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))throw Error('Invalid receipt.');
  if(!/^phi-crop-circle-observatory\/v0\.[23]$/.test(receipt.schema||''))
   throw Error('Unsupported Observatory receipt. Requires schema v0.2 or v0.3.');
  const vision=receipt.vision;
  if(!vision||!Array.isArray(vision.rings)||vision.rings.length<2)
   throw Error('Receipt has fewer than two detected rings.');
  if(vision.schema!=='phi-crop-circle-vision/v0.2')
   throw Error('Unrecognized vision measurement schema.');
  const textName=(name||'Imported Observatory receipt').trim();
  const result=makeProfile(textName,vision.rings.map(r=>r.radius),{
   sourceType:'local-image-cv',sourceUrl:null,
   notes:'Imported from Observatory image-derived receipt; detection scores are edge support, not probability.'
  });
  return {...result,lineage:{
    receiptSchema:receipt.schema,visionMethod:vision.method,centreMode:vision.mode,
    sensitivity:vision.sensitivity,imageWidth:vision.originalImageDimensions?.width||null,
    imageHeight:vision.originalImageDimensions?.height||null,
    measurementWidth:vision.width||null,measurementHeight:vision.height||null,
    sourceHash:null,sourceIndependentUnverified:true
   }};
 }
 function validProfile(p){
  if(!p||p.schema!=='phi-crop-fingerprint/v0.3'||typeof p.name!=='string'||
     !Array.isArray(p.radii))throw Error('Invalid fingerprint record.');
  // Rebuild from source radii rather than trusting normalized values from imported JSON.
  const result=makeProfile(p.name,p.radii,{sourceType:p.sourceType,sourceUrl:p.sourceUrl,notes:p.notes});
  if(p.lineage&&typeof p.lineage==='object')return {...result,lineage:p.lineage};
  return result;
 }
 function compare(a,b){
  const aa=validProfile(a),bb=validProfile(b);
  const A=aa.normalizedRadii,B=bb.normalizedRadii,m=A.length,n=B.length;
  const dp=Array.from({length:m+1},()=>new Float64Array(n+1));
  for(let i=1;i<=m;i++)dp[i][0]=i*GAP;
  for(let j=1;j<=n;j++)dp[0][j]=j*GAP;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
   const match=Math.min(GAP*2,Math.abs(A[i-1]-B[j-1])*DIFF_WEIGHT);
   dp[i][j]=Math.min(dp[i-1][j]+GAP,dp[i][j-1]+GAP,dp[i-1][j-1]+match);
  }
  const distance=dp[m][n]/Math.max(m,n);
  const score=round(Math.max(0,100*(1-distance/GAP)),2);
  const reliable=m>=3&&n>=3;
  return {method:METHOD,first:aa.name,second:bb.name,ringCounts:[m,n],score,
   normalizedDistance:round(distance,6),status:reliable?'exploratory-geometry-only':'insufficient-structure',
   warning:reliable?'Shape similarity only. A high score alone is not a statistically significant message or independent source match.':'Two-ring comparisons contain too little structure to rank meaningfully.'};
 }
 function rank(target,library,{excludeSameName=true}={}){
  if(!Array.isArray(library)||library.length>100)throw Error('Library limited to 100 fingerprints.');
  const base=validProfile(target);
  return library.map((p,index)=>({index,profile:validProfile(p)}))
   .filter(({profile})=>!excludeSameName||profile.name!==base.name)
   .map(({index,profile})=>({...compare(base,profile),index}))
   .sort((a,b)=>b.score-a.score||a.second.localeCompare(b.second)||a.index-b.index);
 }
 function toyNull(a,b,{trials=1000,seed=369}={}){
  const first=validProfile(a),second=validProfile(b);
  if(first.ringCount<3||second.ringCount<3)throw Error('Null comparison needs at least three rings in each profile.');
  if(!Number.isInteger(trials)||trials<100||trials>20000)throw Error('Trials must be 100–20,000.');
  let state=(seed>>>0)||369;
  function random(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;}
  const observed=compare(first,second).score;
  let greaterOrEqual=0;
  for(let i=0;i<trials;i++){
   // Toy null: independent random radii over 10–100% outer radius, with fixed outer radius.
   const nums=Array.from({length:second.ringCount-1},()=>0.1+0.89*random());
   nums.push(1);
   const sample=makeProfile('synthetic random sample',nums,{sourceType:'synthetic'});
   if(compare(first,sample).score>=observed)greaterOrEqual++;
  }
  return {method:'uniform-radii-toy-null-v1',trials,seed,observedScore:observed,
   equalOrHigher:greaterOrEqual,frequency:round(greaterOrEqual/trials,5),
   caveat:'Exploratory random baseline only, not a p-value or probability of intentional encoding; assumes independent uniform interior radii and one fixed outer ring. Human-made designs, shared sources, camera effects and multiple comparisons are not represented.'};
 }
 root.PhiCropCompare=Object.freeze({METHOD,makeProfile,parseRadii,fromReceipt,validProfile,compare,rank,toyNull});
})(typeof window!=='undefined'?window:globalThis);
