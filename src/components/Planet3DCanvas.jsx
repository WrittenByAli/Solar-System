/**
 * Planet3DCanvas — realistic 3D canvas planet.
 * Atmosphere glow, surface textures, drag-to-rotate, auto-spin.
 * Used in PlanetIntro (L1 entry screen) and StaticBg (L1 background).
 */
import { useRef, useEffect, useCallback, memo } from 'react'

function hx(hex, a) {
  if (!hex || hex.length < 7) return `rgba(128,128,128,${a})`
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}

function clip(ctx, cx, cy, r, fn) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip(); fn(); ctx.restore()
}

function applyLighting(ctx, cx, cy, r) {
  clip(ctx, cx, cy, r, () => {
    const hl = ctx.createRadialGradient(cx-r*.38, cy-r*.38, 0, cx-r*.08, cy-r*.08, r*.92)
    hl.addColorStop(0,'rgba(255,255,255,.42)'); hl.addColorStop(.48,'rgba(255,255,255,.07)'); hl.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=hl; ctx.fillRect(cx-r,cy-r,r*2,r*2)
    const sh = ctx.createRadialGradient(cx+r*.44, cy+r*.46, 0, cx+r*.14, cy+r*.14, r*1.12)
    sh.addColorStop(0,'rgba(0,0,14,.72)'); sh.addColorStop(.55,'rgba(0,0,10,.18)'); sh.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=sh; ctx.fillRect(cx-r,cy-r,r*2,r*2)
    const sp = ctx.createRadialGradient(cx-r*.34, cy-r*.36, 0, cx-r*.3, cy-r*.32, r*.18)
    sp.addColorStop(0,'rgba(255,255,255,.58)'); sp.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=sp; ctx.fillRect(cx-r,cy-r,r*2,r*2)
  })
}

function drawAtmosphere(ctx, cx, cy, r, color, planetId, t) {
  const pulse = 1 + .025 * Math.sin(t*1.6)
  const g = ctx.createRadialGradient(cx,cy,r*.88,cx,cy,r*2.5*pulse)
  g.addColorStop(0,hx(color,.52)); g.addColorStop(.22,hx(color,.22)); g.addColorStop(.6,hx(color,.07)); g.addColorStop(1,hx(color,0))
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r*2.5*pulse,0,Math.PI*2); ctx.fill()
  switch(planetId) {
    case 'earth': {
      const ag=ctx.createRadialGradient(cx,cy,r*.97,cx,cy,r*1.22)
      ag.addColorStop(0,'rgba(128,208,255,0)'); ag.addColorStop(.3,'rgba(128,208,255,.44)'); ag.addColorStop(.72,'rgba(72,152,255,.16)'); ag.addColorStop(1,'rgba(72,152,255,0)')
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(cx,cy,r*1.22,0,Math.PI*2); ctx.fill(); break
    }
    case 'venus': {
      const ag=ctx.createRadialGradient(cx,cy,r*.95,cx,cy,r*1.3)
      ag.addColorStop(0,'rgba(255,225,85,0)'); ag.addColorStop(.28,'rgba(255,215,65,.4)'); ag.addColorStop(.75,'rgba(255,185,45,.12)'); ag.addColorStop(1,'rgba(255,185,45,0)')
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(cx,cy,r*1.3,0,Math.PI*2); ctx.fill(); break
    }
    case 'mars': {
      const ag=ctx.createRadialGradient(cx,cy,r*.97,cx,cy,r*1.14)
      ag.addColorStop(0,'rgba(255,140,80,0)'); ag.addColorStop(.35,'rgba(255,120,60,.2)'); ag.addColorStop(1,'rgba(255,100,50,0)')
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(cx,cy,r*1.14,0,Math.PI*2); ctx.fill(); break
    }
    case 'uranus': {
      const ag=ctx.createRadialGradient(cx,cy,r*.96,cx,cy,r*1.18)
      ag.addColorStop(0,'rgba(100,220,238,0)'); ag.addColorStop(.38,'rgba(100,220,238,.34)'); ag.addColorStop(1,'rgba(100,220,238,0)')
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(cx,cy,r*1.18,0,Math.PI*2); ctx.fill(); break
    }
    case 'neptune': {
      const ag=ctx.createRadialGradient(cx,cy,r*.96,cx,cy,r*1.18)
      ag.addColorStop(0,'rgba(115,135,255,0)'); ag.addColorStop(.38,'rgba(115,135,255,.36)'); ag.addColorStop(1,'rgba(115,135,255,0)')
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(cx,cy,r*1.18,0,Math.PI*2); ctx.fill(); break
    }
    case 'sun': {
      for(let i=1;i<=3;i++){
        const sg=ctx.createRadialGradient(cx,cy,r*(.8+i*.1),cx,cy,r*(1.2+i*.55))
        sg.addColorStop(0,`rgba(255,${105+i*20},0,${.22/i})`); sg.addColorStop(1,'rgba(255,55,0,0)')
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,r*(1.2+i*.55),0,Math.PI*2); ctx.fill()
      }
      break
    }
    default: {
      const ag=ctx.createRadialGradient(cx,cy,r*.96,cx,cy,r*1.14)
      ag.addColorStop(0,hx(color,0)); ag.addColorStop(.42,hx(color,.22)); ag.addColorStop(1,hx(color,0))
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(cx,cy,r*1.14,0,Math.PI*2); ctx.fill()
    }
  }
}

function drawSun(ctx,cx,cy,r,t){
  for(let i=3;i>=1;i--){const h=ctx.createRadialGradient(cx,cy,r*.85,cx,cy,r*(1.5+i*.6));h.addColorStop(0,`rgba(255,${95+i*22},0,${.22/i})`);h.addColorStop(1,'rgba(255,50,0,0)');ctx.fillStyle=h;ctx.beginPath();ctx.arc(cx,cy,r*(1.5+i*.6),0,Math.PI*2);ctx.fill()}
  const b=ctx.createRadialGradient(cx-r*.26,cy-r*.26,r*.03,cx,cy,r);b.addColorStop(0,'#fff8e8');b.addColorStop(.12,'#ffe44a');b.addColorStop(.42,'#ff9200');b.addColorStop(.74,'#ff5500');b.addColorStop(1,'#aa2800');ctx.fillStyle=b;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill()
  clip(ctx,cx,cy,r,()=>{for(let i=0;i<11;i++){const px=cx+Math.cos(t*.42+i*.62)*r*.56,py=cy+Math.sin(t*.58+i*1.1)*r*.46,pr=r*(.17+(i%3)*.07);const pg=ctx.createRadialGradient(px,py,0,px,py,pr);pg.addColorStop(0,`rgba(255,${175+(i%4)*14},35,.26)`);pg.addColorStop(1,'rgba(255,110,0,0)');ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill()}const lim=ctx.createRadialGradient(cx,cy,r*.52,cx,cy,r);lim.addColorStop(0,'rgba(0,0,0,0)');lim.addColorStop(.74,'rgba(0,0,0,0)');lim.addColorStop(1,'rgba(0,0,0,.32)');ctx.fillStyle=lim;ctx.fillRect(cx-r,cy-r,r*2,r*2)})
}

function drawMercury(ctx,cx,cy,r,rot){
  const xo=(rot%360)/360*r*2
  clip(ctx,cx,cy,r,()=>{const b=ctx.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);b.addColorStop(0,'#979797');b.addColorStop(.55,'#606060');b.addColorStop(1,'#3a3a3a');ctx.fillStyle=b;ctx.fillRect(cx-r,cy-r,r*2,r*2);[[-0.36,-0.18,.24],[0.26,0.3,.18],[-0.08,0.42,.15],[0.46,-0.36,.13],[-0.46,0.1,.11],[0.08,-0.5,.09]].forEach(([dx,dy,cr])=>{const x2=cx+((dx*r+xo*1.2)%(r*2))-r,y2=cy+dy*r,cr2=cr*r;const cg=ctx.createRadialGradient(x2-cr2*.3,y2-cr2*.3,0,x2,y2,cr2);cg.addColorStop(0,'#b0b0b0');cg.addColorStop(.5,'#565656');cg.addColorStop(1,'#3a3a3a');ctx.fillStyle=cg;ctx.beginPath();ctx.arc(x2,y2,cr2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(155,155,155,.28)';ctx.lineWidth=cr2*.12;ctx.beginPath();ctx.arc(x2,y2,cr2*.9,0,Math.PI*2);ctx.stroke()})})
  applyLighting(ctx,cx,cy,r)
}

function drawVenus(ctx,cx,cy,r,rot){
  const xo=(rot%360)/360*r*2
  clip(ctx,cx,cy,r,()=>{const b=ctx.createRadialGradient(cx-r*.26,cy-r*.26,0,cx,cy,r);b.addColorStop(0,'#f7edae');b.addColorStop(.5,'#d4b540');b.addColorStop(1,'#927018');ctx.fillStyle=b;ctx.fillRect(cx-r,cy-r,r*2,r*2);[0.52,0.28,0.06,-0.18,-0.42].forEach((by,i)=>{const sg=ctx.createLinearGradient(0,cy+by*r-r*.1,0,cy+by*r+r*.1);sg.addColorStop(0,'rgba(200,170,60,0)');sg.addColorStop(.5,`rgba(${i%2?175:215},${i%2?140:175},55,.38)`);sg.addColorStop(1,'rgba(200,170,60,0)');ctx.fillStyle=sg;ctx.fillRect(cx-r+((i*r*.5+xo)%(r*2))-r*2,cy+by*r-r*.1,r*4,r*.2)})})
  applyLighting(ctx,cx,cy,r)
}

function drawEarth(ctx,cx,cy,r,rot){
  const xo=(rot%360)/360*r*2
  clip(ctx,cx,cy,r,()=>{const o=ctx.createRadialGradient(cx-r*.26,cy-r*.26,0,cx,cy,r);o.addColorStop(0,'#4ec4f0');o.addColorStop(.45,'#1a72c4');o.addColorStop(1,'#0c3e8a');ctx.fillStyle=o;ctx.fillRect(cx-r,cy-r,r*2,r*2);[[-0.12,-0.14,.58,.54],[0.28,-0.24,.42,.5],[-0.44,0.08,.36,.4],[0.08,0.28,.48,.3]].forEach(([dx,dy,w,h])=>{const x2=cx+((dx*r+xo*1.1)%(r*2))-r;const cg=ctx.createRadialGradient(x2,cy+dy*r,0,x2,cy+dy*r,w*r);cg.addColorStop(0,'#3c9050');cg.addColorStop(.5,'#2a6a3a');cg.addColorStop(.78,'#5aaa46');cg.addColorStop(1,'rgba(38,95,45,0)');ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(x2,cy+dy*r,w*r*.72,h*r*.58,0,0,Math.PI*2);ctx.fill()});const pc=ctx.createRadialGradient(cx,cy-r*.86,0,cx,cy-r*.86,r*.36);pc.addColorStop(0,'rgba(235,248,255,.94)');pc.addColorStop(.65,'rgba(200,232,255,.52)');pc.addColorStop(1,'rgba(200,232,255,0)');ctx.fillStyle=pc;ctx.beginPath();ctx.arc(cx,cy-r*.86,r*.36,0,Math.PI*2);ctx.fill();[[0.0,-0.34,.36],[-0.3,0.1,.28],[0.32,0.24,.3],[-0.14,-0.06,.22]].forEach(([dx,dy,cw])=>{const x2=cx+((dx*r+xo*.84)%(r*2))-r;const cg=ctx.createRadialGradient(x2,cy+dy*r,0,x2,cy+dy*r,cw*r);cg.addColorStop(0,'rgba(255,255,255,.48)');cg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(x2,cy+dy*r,cw*r*.92,cw*r*.42,0,0,Math.PI*2);ctx.fill()})})
  applyLighting(ctx,cx,cy,r)
}

function drawMars(ctx,cx,cy,r,rot){
  const xo=(rot%360)/360*r*2
  clip(ctx,cx,cy,r,()=>{const b=ctx.createRadialGradient(cx-r*.28,cy-r*.28,0,cx,cy,r);b.addColorStop(0,'#e06432');b.addColorStop(.46,'#c04422');b.addColorStop(1,'#782010');ctx.fillStyle=b;ctx.fillRect(cx-r,cy-r,r*2,r*2);[[-0.2,0.1,.42,.26,'rgba(95,28,8,.46)'],[0.3,-0.2,.3,.2,'rgba(75,18,5,.36)']].forEach(([dx,dy,fw,fh,fc])=>{const x2=cx+((dx*r+xo)%(r*2))-r;ctx.fillStyle=fc;ctx.beginPath();ctx.ellipse(x2,cy+dy*r,fw*r,fh*r,0,0,Math.PI*2);ctx.fill()});const pc=ctx.createRadialGradient(cx,cy-r*.84,0,cx,cy-r*.84,r*.26);pc.addColorStop(0,'rgba(255,248,242,.92)');pc.addColorStop(.7,'rgba(228,218,208,.5)');pc.addColorStop(1,'rgba(228,218,208,0)');ctx.fillStyle=pc;ctx.beginPath();ctx.arc(cx,cy-r*.84,r*.26,0,Math.PI*2);ctx.fill()})
  applyLighting(ctx,cx,cy,r)
}

function drawJupiter(ctx,cx,cy,r,rot){
  const xo=(rot%360)/360*r*2
  clip(ctx,cx,cy,r,()=>{const b=ctx.createLinearGradient(cx,cy-r,cx,cy+r);['#c8a882','#ddb98a','#be8e6e','#e6c894','#b67448','#d2a66e','#c68454','#dcb988','#be8e74','#cca87e'].forEach((c,i,a)=>b.addColorStop(i/(a.length-1),c));ctx.fillStyle=b;ctx.fillRect(cx-r,cy-r,r*2,r*2);[0.44,0.22,0.0,-0.22,-0.44].forEach((by,i)=>{const sg=ctx.createLinearGradient(0,cy+by*r-r*.09,0,cy+by*r+r*.09);sg.addColorStop(0,'rgba(88,38,18,0)');sg.addColorStop(.5,'rgba(88,38,18,.42)');sg.addColorStop(1,'rgba(88,38,18,0)');ctx.fillStyle=sg;ctx.fillRect(cx-r,cy+by*r-r*.09,r*2,r*.18)});const gx=cx+((0.12*r+xo*.9)%(r*2))-r;const gg=ctx.createRadialGradient(gx,cy+r*.16,0,gx,cy+r*.16,r*.22);gg.addColorStop(0,'rgba(168,58,28,.78)');gg.addColorStop(.55,'rgba(145,48,22,.52)');gg.addColorStop(1,'rgba(145,48,22,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.ellipse(gx,cy+r*.16,r*.22,r*.14,0,0,Math.PI*2);ctx.fill()})
  applyLighting(ctx,cx,cy,r)
}

function drawSaturn(ctx,cx,cy,r){
  const rW=r*2.5,rH=r*.44
  const rg=ctx.createLinearGradient(cx-rW,cy,cx+rW,cy)
  rg.addColorStop(0,hx('#c89c5c',0));rg.addColorStop(.08,hx('#d4aa72',.62));rg.addColorStop(.22,hx('#f0d098',.82));rg.addColorStop(.36,hx('#c89050',.58));rg.addColorStop(.45,hx('#c89050',.3));rg.addColorStop(.5,'rgba(0,0,0,0)');rg.addColorStop(.55,hx('#c89050',.3));rg.addColorStop(.64,hx('#c89050',.58));rg.addColorStop(.78,hx('#f0d098',.82));rg.addColorStop(.92,hx('#d4aa72',.62));rg.addColorStop(1,hx('#c89c5c',0))
  ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,rW,rH,0,Math.PI,0);ctx.strokeStyle=rg;ctx.lineWidth=r*.55;ctx.stroke();ctx.restore()
  clip(ctx,cx,cy,r,()=>{const b=ctx.createLinearGradient(cx,cy-r,cx,cy+r);['#ead898','#f4e4aa','#d8be76','#eede96','#c6a45e','#dac880','#c6a464'].forEach((c,i,a)=>b.addColorStop(i/(a.length-1),c));ctx.fillStyle=b;ctx.fillRect(cx-r,cy-r,r*2,r*2);[0.3,0.04,-0.28].forEach(by=>{const sg=ctx.createLinearGradient(0,cy+by*r-r*.08,0,cy+by*r+r*.08);sg.addColorStop(0,'rgba(115,88,18,0)');sg.addColorStop(.5,'rgba(115,88,18,.3)');sg.addColorStop(1,'rgba(115,88,18,0)');ctx.fillStyle=sg;ctx.fillRect(cx-r,cy+by*r-r*.08,r*2,r*.16)})})
  applyLighting(ctx,cx,cy,r)
  ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,rW,rH,0,0,Math.PI);ctx.strokeStyle=rg;ctx.lineWidth=r*.55;ctx.stroke();ctx.restore()
}

function drawUranus(ctx,cx,cy,r){
  clip(ctx,cx,cy,r,()=>{const b=ctx.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);b.addColorStop(0,'#b4f0f8');b.addColorStop(.52,'#5ed0e8');b.addColorStop(1,'#289aa6');ctx.fillStyle=b;ctx.fillRect(cx-r,cy-r,r*2,r*2);[0.24,0.0,-0.24].forEach((by,i)=>{const sg=ctx.createLinearGradient(0,cy+by*r-r*.1,0,cy+by*r+r*.1);sg.addColorStop(0,'rgba(75,195,218,0)');sg.addColorStop(.5,`rgba(75,${180+i*8},212,.2)`);sg.addColorStop(1,'rgba(75,195,218,0)');ctx.fillStyle=sg;ctx.fillRect(cx-r,cy+by*r-r*.1,r*2,r*.2)})})
  ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,r*1.62,r*1.62,Math.PI*.55,0,Math.PI*2);ctx.strokeStyle=hx('#64c8d8',.3);ctx.lineWidth=r*.14;ctx.stroke();ctx.beginPath();ctx.ellipse(cx,cy,r*1.84,r*1.84,Math.PI*.55,0,Math.PI*2);ctx.strokeStyle=hx('#64c8d8',.12);ctx.lineWidth=r*.08;ctx.stroke();ctx.restore()
  applyLighting(ctx,cx,cy,r)
}

function drawNeptune(ctx,cx,cy,r,rot){
  const xo=(rot%360)/360*r*2
  clip(ctx,cx,cy,r,()=>{const b=ctx.createRadialGradient(cx-r*.28,cy-r*.28,0,cx,cy,r);b.addColorStop(0,'#6688ee');b.addColorStop(.46,'#2244cc');b.addColorStop(1,'#0a1a88');ctx.fillStyle=b;ctx.fillRect(cx-r,cy-r,r*2,r*2);const sx=cx+((0.18*r+xo*1.2)%(r*2))-r;const sg=ctx.createRadialGradient(sx,cy-r*.2,0,sx,cy-r*.2,r*.26);sg.addColorStop(0,'rgba(8,8,55,.62)');sg.addColorStop(1,'rgba(8,8,55,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,cy-r*.2,r*.26,0,Math.PI*2);ctx.fill();[0.34,-0.14,-0.38].forEach((by,i)=>{const sw=r*(.58-i*.1),stx=cx+((xo*(.78+i*.14))%(r*2))-r;ctx.strokeStyle=`rgba(148,185,255,${.36-i*.07})`;ctx.lineWidth=r*.07;ctx.beginPath();ctx.moveTo(stx-sw,cy+by*r);ctx.lineTo(stx+sw,cy+by*r);ctx.stroke()})})
  applyLighting(ctx,cx,cy,r)
}

function drawNexus(ctx,cx,cy,r){
  const hg=ctx.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);hg.addColorStop(0,'#b0f4ff');hg.addColorStop(.55,'#06b6d4');hg.addColorStop(1,'#0e7490');ctx.fillStyle=hg;ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;i?ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a))}ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(180,248,255,.45)';ctx.lineWidth=2;ctx.stroke()
}

function drawCore(ctx,cx,cy,r){
  const hg=ctx.createRadialGradient(cx-r*.28,cy-r*.28,0,cx,cy,r);hg.addColorStop(0,'#e0aaff');hg.addColorStop(.55,'#a855f7');hg.addColorStop(1,'#6b21a8');ctx.fillStyle=hg;ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;i?ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a))}ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(220,180,255,.45)';ctx.lineWidth=2;ctx.stroke()
}

function renderPlanet(ctx,id,cx,cy,r,t,rot){
  switch(id){
    case 'sun':     drawSun(ctx,cx,cy,r,t); break
    case 'mercury': drawMercury(ctx,cx,cy,r,rot); break
    case 'venus':   drawVenus(ctx,cx,cy,r,rot); break
    case 'earth':   drawEarth(ctx,cx,cy,r,rot); break
    case 'mars':    drawMars(ctx,cx,cy,r,rot); break
    case 'jupiter': drawJupiter(ctx,cx,cy,r,rot); break
    case 'saturn':  drawSaturn(ctx,cx,cy,r); break
    case 'uranus':  drawUranus(ctx,cx,cy,r); break
    case 'neptune': drawNeptune(ctx,cx,cy,r,rot); break
    case 'nexus':   drawNexus(ctx,cx,cy,r); break
    case 'core':    drawCore(ctx,cx,cy,r); break
    default: {
      const b=ctx.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);b.addColorStop(0,'#fff');b.addColorStop(1,'#666');ctx.fillStyle=b;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();applyLighting(ctx,cx,cy,r)
    }
  }
}

const STARS = Array.from({length:120},(_,i)=>{
  const s=Math.sin(i*127.1)*43758.5453,s2=Math.sin(i*311.7)*43758.5453
  return{x:(s-Math.floor(s)),y:(s2-Math.floor(s2)),sz:.6+(Math.abs(Math.sin(i*57.3))%1)*1.4}
})

const Planet3DCanvas = memo(function Planet3DCanvas({
  planetId, color='#4fc3f7', size=320, isDark=true, interactive=true, showStars=true, style={}
}) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const rotRef    = useRef(0)
  const dragRef   = useRef(null)
  const startRef  = useRef(Date.now())
  const id = (planetId||'earth').toLowerCase()
  const W=size, H=size, cx=W/2, cy=H/2, r=size*.36
  const AUTO = id==='sun'?.10:id==='jupiter'?.17:id==='saturn'?.13:id==='earth'?.065:.05

  const draw = useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas){animRef.current=requestAnimationFrame(draw);return}
    const ctx=canvas.getContext('2d')
    const t=(Date.now()-startRef.current)/1000
    ctx.clearRect(0,0,W,H)
    if(isDark){
      const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.72)
      bg.addColorStop(0,'#0c1428');bg.addColorStop(.55,'#06080f');bg.addColorStop(1,'#020306')
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H)
      if(showStars){
        STARS.forEach(({x,y,sz},i)=>{
          const px=x*W,py=y*H,dr=Math.sqrt((px-cx)**2+(py-cy)**2)
          if(dr<r*2.6)return
          ctx.globalAlpha=.45+.35*Math.sin(t*(.6+i*.08)+i)
          ctx.fillStyle=i%5===0?'#fffbe8':i%3===0?'#c8d8ff':'#fff'
          ctx.beginPath();ctx.arc(px,py,sz*.5,0,Math.PI*2);ctx.fill()
        })
        ctx.globalAlpha=1
      }
    }
    drawAtmosphere(ctx,cx,cy,r,color,id,t)
    renderPlanet(ctx,id,cx,cy,r,t,rotRef.current)
    if(!dragRef.current) rotRef.current=(rotRef.current+AUTO)%360
    animRef.current=requestAnimationFrame(draw)
  },[id,color,isDark,showStars,W,H,cx,cy,r,AUTO])

  useEffect(()=>{
    rotRef.current=0; startRef.current=Date.now()
    animRef.current=requestAnimationFrame(draw)
    return()=>cancelAnimationFrame(animRef.current)
  },[draw])

  const onPointerDown=useCallback(e=>{
    if(!interactive)return
    dragRef.current={startX:e.clientX,lastX:e.clientX}
    canvasRef.current?.setPointerCapture(e.pointerId)
  },[interactive])

  const onPointerMove=useCallback(e=>{
    if(!interactive||!dragRef.current)return
    rotRef.current=(rotRef.current+(e.clientX-dragRef.current.lastX)*.82)%360
    dragRef.current.lastX=e.clientX
  },[interactive])

  const onPointerUp=useCallback(()=>{dragRef.current=null},[])

  return(
    <canvas ref={canvasRef} width={W} height={H}
      style={{cursor:interactive?'grab':'default',touchAction:'none',display:'block',borderRadius:'50%',...style}}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
    />
  )
})

export default Planet3DCanvas
