/* Crop Circle Observatory r0.2: local classical CV, not semantic AI nor proof of authorship. */
(function(root){
 'use strict';
 const METHOD='sobel-radial-gradient-v1';
 const MODES=Object.freeze({conservative:0.86,balanced:0.76,exploratory:0.65});
 function checkImage(data){
  if(!data||!Number.isInteger(data.width)||!Number.isInteger(data.height)||
     data.width<32||data.height<32||data.width>1200||data.height>1200||
     data.width*data.height>800000||!data.data||data.data.length!==data.width*data.height*4)
   throw Error('Expected RGBA image data, 32–1200 px per side and ≤800,000 pixels.');
 }
 function edges(image){
  checkImage(image);
  const w=image.width,h=image.height,d=image.data,gray=new Float32Array(w*h);
  for(let i=0,j=0;i<gray.length;i++,j+=4)gray[i]=0.2126*d[j]+0.7152*d[j+1]+0.0722*d[j+2];
  const gx=new Float32Array(w*h),gy=new Float32Array(w*h),mag=new Float32Array(w*h);
  const samples=[];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const k=y*w+x;
   const dx=-gray[k-w-1]+gray[k-w+1]-2*gray[k-1]+2*gray[k+1]-gray[k+w-1]+gray[k+w+1];
   const dy=-gray[k-w-1]-2*gray[k-w]-gray[k-w+1]+gray[k+w-1]+2*gray[k+w]+gray[k+w+1];
   gx[k]=dx;gy[k]=dy;mag[k]=Math.hypot(dx,dy);
   if((x+y*w)%11===0)samples.push(mag[k]);
  }
  samples.sort((a,b)=>a-b);
  return {width:w,height:h,gx,gy,mag,samples};
 }
 function threshold(edge,mode){
  if(!Object.prototype.hasOwnProperty.call(MODES,mode))throw Error('Unknown sensitivity.');
  const values=edge.samples;
  return Math.max(mode==='conservative'?32:mode==='balanced'?24:18,
   values[Math.floor((values.length-1)*MODES[mode])]||0);
 }
 function directions(n){
  return Array.from({length:n},(_,i)=>{const a=i*2*Math.PI/n;return [Math.cos(a),Math.sin(a)];});
 }
 function ringScore(edge,cx,cy,r,t,dirs){
  const {width:w,height:h,gx,gy,mag}=edge;
  let hit=0,weighted=0;const quads=[0,0,0,0],n=dirs.length;
  for(let i=0;i<n;i++){
   const [ux,uy]=dirs[i];let best=0;
   for(const dr of [-2,0,2]){
    const x=Math.round(cx+(r+dr)*ux),y=Math.round(cy+(r+dr)*uy);
    if(x<1||y<1||x>=w-1||y>=h-1)continue;
    const idx=y*w+x,m=mag[idx];if(m<t)continue;
    const alignment=Math.abs((gx[idx]*ux+gy[idx]*uy)/(m||1));
    if(alignment<0.7)continue;
    const value=Math.min(1,m/(t*2))*alignment;
    if(value>best)best=value;
   }
   if(best>0){hit++;weighted+=best;quads[Math.floor(i*4/n)]++;}
  }
  const support=hit/n,coverage=quads.filter(x=>x>=3).length;
  return {radius:r,support,coverage,score:0.70*support+0.30*weighted/n};
 }
 function scanRadii(edge,cx,cy,t,dirs,options={}){
  const minDim=Math.min(edge.width,edge.height);
  const minR=Math.max(7,Math.round(minDim*.065)),maxR=Math.round(minDim*.44);
  const profile=[];
  for(let r=minR;r<=maxR;r++)profile.push(ringScore(edge,cx,cy,r,t,dirs));
  const peak=profile.filter((p,i)=>p.support>=0.30&&p.coverage>=3&&
   p.score>=(profile[i-1]?.score??-1)&&p.score>=(profile[i+1]?.score??-1))
   .sort((a,b)=>b.score-a.score||a.radius-b.radius);
  const rings=[],separation=Math.max(5,Math.round(minDim*.035));
  for(const p of peak){
   if(rings.some(q=>Math.abs(q.radius-p.radius)<separation))continue;
   rings.push(p);
   if(rings.length>=8)break;
  }
  return rings.sort((a,b)=>a.radius-b.radius);
 }
 function detect(image,options={}){
  const mode=options.sensitivity||'balanced',edge=edges(image),t=threshold(edge,mode);
  const dirs=directions(64);
  let centre=options.center||null,modeUsed='manual-center';
  if(centre){
   if(!Number.isFinite(centre.x)||!Number.isFinite(centre.y)||
      centre.x<0||centre.y<0||centre.x>=image.width||centre.y>=image.height)
    throw Error('Selected center is outside the image.');
  }else{
   modeUsed='coarse-search';
   const min=Math.min(image.width,image.height),step=Math.max(5,Math.round(min/15));
   const minR=Math.max(8,Math.round(min*.075)),maxR=Math.round(min*.4),rstep=Math.max(3,Math.round(min/43));
   let best=null;
   for(let y=Math.round(image.height*.2);y<=image.height*.8;y+=step){
    for(let x=Math.round(image.width*.2);x<=image.width*.8;x+=step){
     for(let r=minR;r<=maxR;r+=rstep){
      const s=ringScore(edge,x,y,r,t,dirs);
      if(s.support<.32||s.coverage<3)continue;
      if(!best||s.score>best.score)best={x,y,r,score:s.score};
     }
    }
   }
   if(best){
    // Refine around coarse candidate; predeclared step ranges avoid overfitting arbitrary positions.
    let final=best;
    for(let y=Math.max(4,best.y-step);y<=Math.min(image.height-5,best.y+step);y+=2)
     for(let x=Math.max(4,best.x-step);x<=Math.min(image.width-5,best.x+step);x+=2)
      for(let r=Math.max(7,best.r-rstep);r<=best.r+rstep;r+=2){
       const s=ringScore(edge,x,y,r,t,dirs);
       if(s.support>=.32&&s.coverage>=3&&s.score>final.score)final={x,y,r,score:s.score};
      }
    centre={x:final.x,y:final.y};
   }
  }
  const rings=centre?scanRadii(edge,centre.x,centre.y,t,dirs):[];
  return {schema:'phi-crop-circle-vision/v0.2',method:METHOD,mode:modeUsed,sensitivity:mode,
   width:image.width,height:image.height,edgeThreshold:+t.toFixed(3),
   center:centre?{x:+centre.x.toFixed(2),y:+centre.y.toFixed(2)}:null,
   rings:rings.map(p=>({radius:p.radius,support:+p.support.toFixed(3),coverage:p.coverage,score:+p.score.toFixed(3)})),
   notes:'Candidate concentric edge structures. Scores measure geometric support, not confidence of intentional meaning. Perspective distortion, crop damage and user-selected centers can bias results.'};
 }
 root.PhiCropVision=Object.freeze({METHOD,edges,detect,ringScore});
})(typeof window!=='undefined'?window:globalThis);
