/* ΦMath Atelier · Chromatic Warp · original mathematical palette-cycling engine.
   Inspired by the visual technique of 1992 AcidWarp, not a source-code port.
   The index field is stationary while a small palette rotates across it. */
(() => {
 'use strict';
 const glsl = [
 'uniform int u_acidPattern;',
 'uniform float u_acidBands;',
 'uniform float u_acidCycle;',
 'float acidField(vec2 p){',
 ' float f=14.0+u_spiral*20.0, w=u_warp*1.7;',
 ' float r=length(p)+.0001, a=atan(p.y,p.x);',
 ' float seed=u_seed*.00081;',
 ' float t=0.0, q=0.0;',
 ' if(u_acidPattern==0){', // Liquid rings
 '  t=sin(r*f*1.8+sin(a*7.0+seed)*w);',
 '  q=cos(a*9.0-r*f*.9+sin(r*f*.6)*w);',
 ' }else if(u_acidPattern==1){', // Solar spokes
 '  t=sin(a*(7.0+floor(u_density*11.0))+r*f*.55+sin(r*15.0)*w);',
 '  q=cos(r*f*1.5-a*4.0+seed);',
 ' }else if(u_acidPattern==2){', // Twin well interference
 '  vec2 c=vec2(.23+.08*sin(seed),.04);',
 '  t=sin(length(p-c)*f*2.1+seed);',
 '  q=cos(length(p+c)*f*2.1-seed);',
 ' }else if(u_acidPattern==3){', // Warped grid
 '  t=sin(p.x*f+sin(p.y*f*.63+seed)*w*2.0);',
 '  q=cos(p.y*f+cos(p.x*f*.57-seed)*w*2.0);',
 ' }else if(u_acidPattern==4){', // Liquid moiré
 '  t=sin(p.x*f*.72+p.y*f*.24+w*sin(p.y*f*.55+seed));',
 '  q=sin(p.y*f*.8-p.x*f*.22+w*cos(p.x*f*.57-seed));',
 ' }else{', // Kaleidoscopic flower
 '  float petals=5.0+floor(u_density*11.0);',
 '  t=sin(a*petals+r*f+sin(a*3.0-r*f*.25)*w);',
 '  q=cos(a*(petals*.5)+r*f*1.5+seed);',
 ' }',
 ' return clamp(.5+.26*t+.24*q,0.0,.9999);',
 '}',
 'vec3 acidWarp(vec2 p){',
 ' float field=floor(acidField(p)*256.0)/256.0;',
 ' float phase=fract(field+u_acidCycle*u_time*.145);',
 ' phase=floor(phase*u_acidBands)/u_acidBands;',
 ' vec3 color;',
 ' if(u_palette==5){',
 '  color=.52+.48*cos(6.2831853*(phase+vec3(0.0,.333333,.666667)));',
 ' }else{',
 '  float wave=.5+.5*cos(6.2831853*phase);',
 '  color=palette(.08+.90*wave);',
 ' }',
 ' return pow(clamp(color*(.76+.24*u_glow),0.0,1.0),vec3(.9));',
 '}'
 ].join('\n');

 const stops=[
  ['#9b74ec','#ffaaca','#ffe4ae'],
  ['#568dff','#64e1ff','#e0fbff'],
  ['#4bcdab','#b4e3c8','#fff0af'],
  ['#ee658d','#ff9f62','#ffe49b'],
  ['#93a8cd','#d5dbf1','#ffffff']
 ];
 const TAU=Math.PI*2;
 let cache=null, buffer=null, bufferCtx=null;
 function field(x,y,s) {
  const f=14+s.spiral/100*20,w=s.warp/100*1.7,r=Math.hypot(x,y)+.0001,
        a=Math.atan2(y,x),seed=s.seed*.00081,d=s.density/100;
  let t=0,q=0;
  switch(s.acidPattern) {
   case 0:
    t=Math.sin(r*f*1.8+Math.sin(a*7+seed)*w);
    q=Math.cos(a*9-r*f*.9+Math.sin(r*f*.6)*w);break;
   case 1:
    t=Math.sin(a*(7+Math.floor(d*11))+r*f*.55+Math.sin(r*15)*w);
    q=Math.cos(r*f*1.5-a*4+seed);break;
   case 2: {
    const cx=.23+.08*Math.sin(seed);
    t=Math.sin(Math.hypot(x-cx,y-.04)*f*2.1+seed);
    q=Math.cos(Math.hypot(x+cx,y+.04)*f*2.1-seed);break;
   }
   case 3:
    t=Math.sin(x*f+Math.sin(y*f*.63+seed)*w*2);
    q=Math.cos(y*f+Math.cos(x*f*.57-seed)*w*2);break;
   case 4:
    t=Math.sin(x*f*.72+y*f*.24+w*Math.sin(y*f*.55+seed));
    q=Math.sin(y*f*.8-x*f*.22+w*Math.cos(x*f*.57-seed));break;
   default: {
    const petals=5+Math.floor(d*11);
    t=Math.sin(a*petals+r*f+Math.sin(a*3-r*f*.25)*w);
    q=Math.cos(a*(petals*.5)+r*f*1.5+seed);
   }
  }
  return Math.min(.9999,Math.max(0,.5+.26*t+.24*q));
 }
 function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
 function mix(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t);}
 function palette(phase,paletteIndex,lum){
  let c;
  if(paletteIndex===5){
   c=[0,1/3,2/3].map(k=>255*(.52+.48*Math.cos(TAU*(phase+k))));
  }else{
   const v=.08+.9*(.5+.5*Math.cos(TAU*phase));
   const three=stops[Math.min(paletteIndex,4)].map(rgb);
   c=v<.58?mix(three[0],three[1],v/.58):mix(three[1],three[2],(v-.58)/.42);
  }
  const gain=.76+.24*lum/100;
  return c.map(v=>Math.round(255*Math.pow(Math.min(1,Math.max(0,v*gain/255)),.9)));
 }
 function draw(ctx,canvas,state,time){
  if(!buffer){buffer=document.createElement('canvas');bufferCtx=buffer.getContext('2d',{alpha:false});}
  const scale=Math.min(1,Math.sqrt(195000/(canvas.width*canvas.height)));
  const w=Math.max(2,Math.round(canvas.width*scale)),h=Math.max(2,Math.round(canvas.height*scale));
  const key=[w,h,state.seed,state.acidPattern,state.density,state.spiral,state.warp,state.zoom].join(':');
  if(!cache||cache.key!==key){
   buffer.width=w;buffer.height=h;
   const values=new Uint8Array(w*h);
   const zoom=state.zoom/100;
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=((i+.5)-w*.5)/h/zoom, y=(h*.5-(j+.5))/h/zoom;
    values[j*w+i]=Math.floor(256*field(x,y,state));
   }
   cache={key,values,w,h};
  }
  const image=bufferCtx.createImageData(w,h),data=image.data;
  const shift=state.acidCycle?time*.145:0;
  const bands=state.acidBands;
  const table=new Uint8ClampedArray(256*3);
  for(let i=0;i<256;i++){
   const phase=((i/256+shift)%1+1)%1;
   const discrete=Math.floor(phase*bands)/bands;
   const col=palette(discrete,state.palette,state.glow);
   table.set(col,i*3);
  }
  for(let j=0;j<cache.values.length;j++){
   const at=j*4,pi=cache.values[j]*3;
   data[at]=table[pi];data[at+1]=table[pi+1];data[at+2]=table[pi+2];data[at+3]=255;
  }
  bufferCtx.putImageData(image,0,0);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,0,0,canvas.width,canvas.height);ctx.restore();
 }
 window.PhiChromatic={glsl,draw,patterns:['Liquid Rings','Solar Spokes','Twin Wells','Woven Grid','Liquid Moiré','Kaleido Flower']};
})();