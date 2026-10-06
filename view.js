/* Original Japanese dark-fantasy artwork, articulated sword fighters and an eight-neck serpent. */
(function(root){
  'use strict';
  const W=1440,H=810,G=650,SCALE=1.25;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const palette={
    hero:{cloth:'#d9d8c2',shade:'#999fa0',light:'#eeecd7',dark:'#425761',pants:'#3f5668',pantShade:'#283d50',skin:'#bb947b',belt:'#9b6359',trim:'#bfb18c'},
    ash:{cloth:'#4d5c64',shade:'#2b3d49',light:'#7b8b8c',dark:'#1c303c',pants:'#394955',pantShade:'#253844',skin:'#b4b1a0',belt:'#716657',trim:'#8e9a87'},
    moss:{cloth:'#4d6965',shade:'#2f4a4d',light:'#7f9481',dark:'#203a41',pants:'#3b5554',pantShade:'#253d45',skin:'#c5bba0',belt:'#a77e5b',trim:'#afb490'},
    rust:{cloth:'#825951',shade:'#553f43',light:'#ac7e61',dark:'#2e3541',pants:'#59484b',pantShade:'#333844',skin:'#c1b89c',belt:'#a49773',trim:'#c4ad87'},
    bone:{cloth:'#a3a894',shade:'#647573',light:'#cccbb1',dark:'#344c54',pants:'#4a6067',pantShade:'#2d424e',skin:'#d1c7a4',belt:'#826056',trim:'#bbb18c'}
  };
  const themes=[
    ['#111f2c','#29414b','#607d82','#a3aaa0','#2d4857','#405b63','#1c3540','#344c55'],
    ['#12272d','#294d4d','#648079','#b1ac91','#294c50','#46665e','#17383d','#344d4d'],
    ['#211c2a','#49343d','#78585b','#b69b82','#3f3a4e','#534c58','#23313f','#3b444c'],
    ['#344b58','#878386','#c4aa9c','#e0d0ad','#697d83','#8d9390','#49686b','#768883']
  ];
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  function color(a,b,t){const v=[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t));return '#'+v.map(x=>x.toString(16).padStart(2,'0')).join('');}
  function polygon(c,pts,fill,stroke){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function line(c,x,y,x2,y2,w,fill){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.lineWidth=w;c.strokeStyle=fill;c.stroke();}
  function curve(p0,p1,p2,p3,t){const s=1-t;return{x:s*s*s*p0.x+3*s*s*t*p1.x+3*s*t*t*p2.x+t*t*t*p3.x,y:s*s*s*p0.y+3*s*s*t*p1.y+3*s*t*t*p2.y+t*t*t*p3.y};}
  class ShrineWorld{
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=0;this.clock=0;this.theme=0;this.animators=new WeakMap();
      this.effects=[];this.labels=[];this.stains=[];this.cameraY=0;this.injuryFlash=0;this.shake=0;this.zoom=1;this.flash=0;this.rainAlpha=1;this.bossSeen=false;
      const r=rng(904);this.trees=Array.from({length:95},(_,i)=>({x:-200+i*71+r()*22,y:565+r()*69,h:330+r()*260,w:11+r()*15,seed:r()*20}));
      this.stones=Array.from({length:230},()=>({x:r()*6600,y:G+5+r()*141,w:20+r()*67,h:3+r()*13,a:r()}));
      this.reeds=Array.from({length:160},()=>({x:r()*6500,y:G+35+r()*90,h:13+r()*27,s:r()*7}));
      this.rain=Array.from({length:108},()=>({x:r()*W,y:r()*H,v:400+r()*350,length:14+r()*19,a:.04+r()*.12}));
      this.motes=Array.from({length:30},()=>({x:r()*W,y:r()*H,s:1+r()*2,seed:r()*6.28}));this.makeTexture();this.resize();
    }
    makeTexture(){const a=document.createElement('canvas');a.width=a.height=128;const c=a.getContext('2d'),d=c.createImageData(128,128),r=rng(36);for(let i=0;i<d.data.length;i+=4){const v=r()>.5?230:18;d.data[i]=v;d.data[i+1]=v;d.data[i+2]=v;d.data[i+3]=r()*21;}c.putImageData(d,0,0);this.grain=this.ctx.createPattern(a,'repeat');}
    resize(){const d=Math.min(2,window.devicePixelRatio||1),w=this.canvas.getBoundingClientRect().width||1280;this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(w*d*H/W);}
    resetEffects(){this.effects=[];this.labels=[];this.stains=[];this.cameraY=0;this.injuryFlash=0;this.shake=0;this.zoom=1;this.flash=0;}
    event(e){
      if(['hit','hurt','parry','block','down','headDown','land','step','dodge','heal','offering','lightning','bossDown','crowHit','crowRepelled'].includes(e.type)){
        const r=rng(Math.round((e.x||3650)*17+this.clock*1300)),n=e.type==='hurt'&&e.hazard?0:{hit:e.ko?38:23,hurt:19,parry:35,block:15,down:25,headDown:70,land:9,step:4,dodge:9,heal:30,offering:65,lightning:60,bossDown:130,crowHit:18,crowRepelled:34}[e.type];
        for(let i=0;i<n;i++){
          const angle=r()*6.28,speed=55+r()*(['headDown','lightning','bossDown'].includes(e.type)?260:160);
          this.effects.push({x:e.x||3650,y:G-(e.y||0),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-(['down','headDown','offering'].includes(e.type)?90:0),
            life:.3+r()*.75,max:1.1,size:1+r()*3.5,angle:r()*6.28,color:['crowHit','crowRepelled'].includes(e.type)?'#7392a0':['headDown','down'].includes(e.type)?'#819f95':e.type==='hurt'?'#d5977c':e.type==='offering'?'#d3b77c':'#e5e8d0'});
        }
        if(['hit','parry','hurt'].includes(e.type)&&e.hazard!=='pit'){
          this.shake=e.ko?8:e.type==='parry'?5:4;this.zoom=e.ko?1.023:1.009;
          this.effects.push({ring:true,x:e.x,y:G-e.y,life:.29,max:.29,size:0,color:e.hazard?'#ad7569':e.type==='parry'?'#e6cf95':'#d5e8de'});
        }
      }
      if(e.type==='lightning'){
        this.flash=.28;this.shake=14;this.effects.push({bolt:true,x:e.x,y:G-e.y,life:.38,max:.38,seed:Math.floor(this.clock*100)});
      }
      if(e.type==='headDown'){this.shake=12;this.zoom=1.04;this.labels.push({x:e.x,y:G-e.y-72,text:e.name+'、祓う',life:1.7,max:1.7,color:'#dfc69f'});}
      if(e.type==='parry')this.labels.push({x:e.x,y:G-e.y-58,text:'受け流し',life:1,max:1,color:'#e9d29b'});
      if(e.type==='offering')this.labels.push({x:3650,y:G-266,text:'八塩折、満つ',life:2.4,max:2.4,color:'#e2c78d'});
      if(e.type==='bossDown'){this.flash=.45;this.shake=18;this.zoom=1.05;}
      if(e.type==='crowRepelled')this.labels.push({x:e.x,y:G-e.y-55,text:'黒羽、退く',life:1.8,max:1.8,color:'#d7c8a6'});
      if(e.type==='pitFall'||e.type==='hurt'&&e.hazard==='spikes'){
        const pit=e.type==='pitFall',r=rng(Math.round(e.x*23+this.clock*919)),count=pit?14:11;
        for(let i=0;i<count;i++){
          const life=.44+r()*.38;
          this.effects.push({blood:true,x:e.x+(r()-.5)*14,y:G-e.y+(r()-.5)*9,vx:(e.dir||1)*(35+r()*100)+(r()-.5)*80,
            vy:-45-r()*125,life,max:life,size:1.2+r()*1.8,color:i%3?'#8b3e3c':'#b35a4b'});
        }
        this.stains.push({x:e.x,y:G-(e.groundY||0)+3,life:10,max:10,size:pit?12:8,seed:Math.round(e.x*13)});
        this.stains=this.stains.slice(-12);this.injuryFlash=.28;this.shake=pit?10:5;this.zoom=pit?1.04:1.012;
        if(pit)for(let i=0;i<9;i++)this.effects.push({x:e.x,y:G-e.groundY,vx:(r()-.5)*160,vy:-50-r()*100,life:.65,max:.65,size:1+r()*2.8,angle:r()*6.28,color:'#63716c'});
      }
      if(e.type==='hurt'&&e.hazard==='flame'){
        const r=rng(Math.round(e.x*37+this.clock*719));this.injuryFlash=.22;this.shake=5;
        for(let i=0;i<16;i++){
          const smoke=i%3===0,life=.4+r()*.45;
          this.effects.push({smoke,x:e.x+(r()-.5)*55,y:G-e.y+(r()-.5)*45,vx:(r()-.5)*62,vy:-50-r()*125,
            life,max:life,size:smoke?7+r()*8:1+r()*2,angle:r()*6.28,color:smoke?'#8e8378':'#e6aa67'});
        }
      }
      if(e.type==='pitReturn'){this.camera=clamp(e.x-510,0,4500);this.cameraY=0;this.shake=0;this.zoom=1;}
    }
    sky(c,p,game){
      const gradient=c.createLinearGradient(0,0,0,G);gradient.addColorStop(0,p[0]);gradient.addColorStop(.45,p[1]);gradient.addColorStop(.9,p[2]);gradient.addColorStop(1,p[3]);c.fillStyle=gradient;c.fillRect(0,0,W,H+180);
      const dawn=clamp(this.theme-2,0,1),mx=1050-this.camera*.038,my=182+dawn*10,r=60-dawn*8;
      const halo=c.createRadialGradient(mx,my,r*.4,mx,my,r*4);halo.addColorStop(0,'rgba(209,177,145,.18)');halo.addColorStop(1,'rgba(190,174,143,0)');c.fillStyle=halo;c.fillRect(mx-r*4,my-r*4,r*8,r*8);
      ellipse(c,mx,my,r,r,color('#c1b39a','#f5d3a4',dawn));c.globalAlpha=.16*(1-dawn);ellipse(c,mx-14,my-6,13,20,'#656c73');ellipse(c,mx+14,my+12,8,11,'#656c73');c.globalAlpha=1;
      for(let i=0;i<7;i++){const y=85+i*59,x=(i*243-this.camera*.1+this.clock*3)%(W+700)-200;c.globalAlpha=.14;ellipse(c,x,y,270,9+i%3*5,p[6]);}
      c.globalAlpha=1;
      for(let layer=0;layer<3;layer++){
        const base=412+layer*63,offset=this.camera*(.1+layer*.1);c.beginPath();c.moveTo(-100,H);
        for(let x=-500;x<7400;x+=75){const y=base-Math.sin(x*.004+layer*1.6)*58-Math.sin(x*.014+layer)*21;c.lineTo(x-offset,y);}
        c.lineTo(W+100,H);c.closePath();c.fillStyle=layer===0?p[4]:layer===1?p[5]:p[6];c.globalAlpha=.67+layer*.1;c.fill();
      }
      c.globalAlpha=1;
    }
    woods(c,p){
      for(const tree of this.trees){
        const near=tree.seed%2>1,factor=near?.89:.52,x=tree.x-this.camera*factor;if(x< -170||x>W+170)continue;
        c.save();c.translate(x,tree.y);c.globalAlpha=near?.86:.62;
        const sway=Math.sin(this.clock*.43+tree.seed)*3;
        polygon(c,[[-tree.w*.9,12],[-tree.w*.4,-tree.h*.42],[-tree.w*.18+sway,-tree.h],[tree.w*.23+sway,-tree.h],[tree.w*.5,-tree.h*.45],[tree.w*.9,12]],near?'#203b46':p[6]);
        for(let side of [-1,1])for(let k=1;k<6;k++){
          const y=-tree.h*k/6,spread=tree.h*.22*(1-k/8),ex=side*spread;
          c.beginPath();c.moveTo(0,y+22);c.quadraticCurveTo(ex*.42,y-1,ex,y-9);c.lineWidth=3+k*.2;c.strokeStyle=near?'#27454c':p[6];c.stroke();
          for(let n=0;n<4;n++)polygon(c,[[ex*.18*n,y-n*2],[ex*(.20*n+.34),y-28-n*3],[ex*(.2*n+.44),y-7-n*2]],near?'#284950':p[6]);
        }
        line(c,-tree.w*.12,-16,-tree.w*.12+sway*.3,-tree.h*.71,1.5,'#5a706b');
        c.restore();
      }
      const fog=c.createLinearGradient(0,440,0,640);fog.addColorStop(0,'rgba(155,180,170,0)');fog.addColorStop(.55,'rgba(158,183,173,.10)');fog.addColorStop(1,'rgba(147,174,164,0)');c.fillStyle=fog;c.fillRect(0,430,W,215);
    }
    roof(c,x,y,w,h){
      c.beginPath();c.moveTo(x-w/2-23,y+h);c.quadraticCurveTo(x-w*.34,y+h-10,x-w*.25,y+15);c.lineTo(x,y-8);c.lineTo(x+w*.25,y+15);c.quadraticCurveTo(x+w*.34,y+h-10,x+w/2+23,y+h);c.quadraticCurveTo(x,y+h+20,x-w/2-23,y+h);c.closePath();c.fillStyle='#22353f';c.fill();c.lineWidth=2;c.strokeStyle='#607674';c.stroke();
      for(let i=0;i<13;i++){const dx=(i/12-.5)*w;c.beginPath();c.moveTo(x+dx*.42,y+12);c.quadraticCurveTo(x+dx*.82,y+h*.76,x+dx,y+h+5);c.lineWidth=1;c.strokeStyle='#87968a22';c.stroke();}
      line(c,x-w*.27,y+11,x+w*.27,y+11,4,'#7e826d');
    }
    torii(c,wx,size=1){
      const x=wx-this.camera;if(x< -280||x>W+280)return;c.save();c.translate(x,G);c.scale(size,size);
      polygon(c,[[-111,0],[-104,-286],[-80,-281],[-87,0]],'#6e4d4e');polygon(c,[[87,0],[80,-281],[104,-286],[111,0]],'#6e4d4e');
      c.fillStyle='#795453';c.fillRect(-135,-249,270,15);line(c,-135,-246,135,-246,2,'#b48b70');
      c.beginPath();c.moveTo(-163,-313);c.quadraticCurveTo(0,-283,163,-313);c.lineTo(154,-291);c.quadraticCurveTo(0,-267,-154,-291);c.closePath();c.fillStyle='#71464a';c.fill();
      c.beginPath();c.moveTo(-166,-316);c.quadraticCurveTo(0,-285,166,-316);c.lineWidth=7;c.strokeStyle='#243742';c.stroke();
      c.fillStyle='#a69978';c.fillRect(-17,-281,34,55);c.fillStyle='#394b51';c.font='17px serif';c.textAlign='center';c.fillText('祓',0,-249);
      c.beginPath();c.moveTo(-99,-225);c.quadraticCurveTo(0,-200,99,-225);c.lineWidth=5;c.strokeStyle='#b2a788';c.stroke();
      for(const dx of [-63,-24,21,59]){const y=-208-Math.abs(dx)*.15;polygon(c,[[dx,y],[dx+6,y+10],[dx-1,y+18],[dx+5,y+23],[dx-6,y+17],[dx,y+10]],'#d0d0b9');}
      c.restore();
    }
    shrine(c,game){
      const x=3650-this.camera;if(x< -800||x>W+800)return;
      c.fillStyle='#586661';c.fillRect(x-310,G-35,620,35);c.fillStyle='#8b9181';c.fillRect(x-330,G-25,660,13);
      c.fillStyle='#4b6363';c.fillRect(x-202,G-229,404,193);c.fillStyle='#2c434c';c.fillRect(x-180,G-209,360,171);
      for(const dx of [-172,-86,0,86,172])line(c,x+dx,G-226,x+dx,G-37,11,'#75574f');
      for(const dx of [-125,125]){c.fillStyle='#bd9f71';c.globalAlpha=.5;c.fillRect(x+dx-26,G-191,52,93);c.globalAlpha=1;for(let k=0;k<5;k++)line(c,x+dx-26+k*13,G-191,x+dx-26+k*13,G-98,2,'#476066');}
      this.roof(c,x,G-333,506,113);line(c,x-143,G-338,x+133,G-394,8,'#81907e');line(c,x+143,G-338,x-133,G-394,8,'#81907e');
      for(const dx of [-73,0,73])line(c,x+dx,G-365,x+dx+22,G-361,9,'#acaa89');
      c.fillStyle='#b8a47a';c.fillRect(x-25,G-219,50,53);c.fillStyle='#3f545b';c.font='22px serif';c.textAlign='center';c.fillText('八塩',x,G-184);
      const progress=game.offering?1:game.phase==='ritual'?clamp(game.ritualAge/3.1,0,1):0;
      for(let i=0;i<8;i++){
        const px=x-273+i*78,py=G-9,lit=progress>(i+.3)/8;
        if(lit){const a=c.createRadialGradient(px,py-32,4,px,py-32,65);a.addColorStop(0,'rgba(221,181,100,.16)');a.addColorStop(1,'rgba(221,181,100,0)');c.fillStyle=a;c.fillRect(px-70,py-100,140,140);}
        c.beginPath();c.moveTo(px-13,py-63);c.bezierCurveTo(px-32,py-47,px-33,py-4,px-17,py);c.lineTo(px+17,py);c.bezierCurveTo(px+33,py-4,px+32,py-47,px+13,py-63);c.closePath();c.fillStyle=lit?'#957952':'#566564';c.fill();c.lineWidth=1.5;c.strokeStyle=lit?'#c3a573':'#778777';c.stroke();
        ellipse(c,px,py-62,14,5,lit?'#d3b480':'#83907b');line(c,px-19,py-28,px+19,py-28,2,'#a59473');c.fillStyle=lit?'#e0cca2':'#95a18d';c.font='14px serif';c.fillText('酒',px,py-30);
      }
    }
    stoneLamp(c,wx){
      const x=wx-this.camera;if(x< -100||x>W+100)return;
      c.fillStyle='#667a77';c.fillRect(x-11,G-96,22,83);polygon(c,[[x-24,G],[x-18,G-14],[x+18,G-14],[x+24,G]],'#71817c');
      c.fillStyle='#435c61';c.fillRect(x-22,G-136,44,40);c.fillStyle='#d3aa68';c.globalAlpha=.8;c.fillRect(x-13,G-127,26,22);c.globalAlpha=1;
      polygon(c,[[x-34,G-139],[x,G-163],[x+34,G-139],[x+30,G-134],[x-30,G-134]],'#667a75');ellipse(c,x,G-167,5,7,'#8f9983');
      const glow=c.createRadialGradient(x,G-115,6,x,G-115,85);glow.addColorStop(0,'rgba(248,181,82,.15)');glow.addColorStop(1,'rgba(248,181,82,0)');c.fillStyle=glow;c.fillRect(x-90,G-205,180,180);
    }
    ground(c,p){
      c.fillStyle=p[7];c.fillRect(0,G,W,H-G+180);
      const gr=c.createLinearGradient(0,G,0,H+180);gr.addColorStop(0,'rgba(153,169,151,.15)');gr.addColorStop(.2,'rgba(32,55,64,.50)');gr.addColorStop(1,'rgba(11,27,37,.95)');c.fillStyle=gr;c.fillRect(0,G,W,H-G+180);line(c,0,G,W,G,1,'#a9b09a55');
      for(const a of this.stones){const x=a.x-this.camera;if(x< -100||x>W+100)continue;c.globalAlpha=.13+a.a*.19;polygon(c,[[x-a.w*.5,a.y],[x+a.w*.28,a.y-a.h],[x+a.w*.5,a.y],[x+a.w*.33,a.y+a.h],[x-a.w*.37,a.y+a.h*.66]],a.a>.5?'#a7b6ac':'#17313d');}
      c.globalAlpha=1;
      for(let i=0;i<18;i++){const x=(i*137-this.camera*.4)%1600,y=G+17+i%5*21;line(c,x,y,x+29+i%4*23,y,1,'#b2c1b225');}
    }
    terrain(c,game){
      if(game.attract)return;
      for(const pit of game.pits){
        const x=pit.x-this.camera,w=pit.width;if(x>W+80||x+w< -80)continue;
        const dark=c.createLinearGradient(0,G,0,G+270);dark.addColorStop(0,'#0a1822');dark.addColorStop(.35,'#050f18');dark.addColorStop(1,'#10151b');
        polygon(c,[[x-5,G],[x+14,G+14],[x+6,G+39],[x+18,G+270],[x+w-17,G+270],[x+w-6,G+39],[x+w-15,G+14],[x+w+5,G]],dark);
        const rocks=[[x+15,G+265]],r=rng(Math.round(pit.x));
        for(let i=0;i<9;i++){const px=x+13+i*(w-26)/8;rocks.push([px,G+235-r()*12],[px+5,G+244]);}
        rocks.push([x+w-15,G+265]);polygon(c,rocks,'#39434b','#4a5253');
        line(c,x+17,G+110,x+24,G+224,2,'#253540');line(c,x+w-17,G+110,x+w-24,G+224,2,'#253540');
        polygon(c,[[x-12,G-5],[x+7,G+3],[x+14,G+19],[x+7,G+25],[x+1,G+11],[x-17,G+6]],'#667e73');
        polygon(c,[[x+w-7,G+3],[x+w+13,G-5],[x+w+17,G+6],[x+w-1,G+11],[x+w-7,G+25],[x+w-14,G+19]],'#667e73');
        for(let i=0;i<5;i++){line(c,x+8+i%2*3,G+16+i*16,x+13+i%3*4,G+30+i*16,2,'#35515a');line(c,x+w-8-i%2*3,G+16+i*16,x+w-13-i%3*4,G+30+i*16,2,'#35515a');}
        c.save();c.globalAlpha=.12;ellipse(c,x+w/2,G+85,w*.36,10,'#7b9daa');c.restore();
        for(const px of [x-23,x+w+23]){line(c,px,G,px,G-31,5,'#927963');line(c,px-8,G-27,px+8,G-27,2,'#c6b291');polygon(c,[[px-6,G-25],[px+7,G-25],[px+2,G-14]],'#c1baa0');}
        c.textAlign='center';c.font='12px "Noto Serif CJK JP",serif';c.fillStyle='#cfbea1';c.fillText('断崖 · 跳躍',x+w/2,G-30);
      }
      for(const trap of game.traps){
        const x=trap.x-this.camera,w=trap.width;if(x>W+100||x+w< -100)continue;
        const state=YakumoEngine.trapState(trap,game.time),warm=state.phase==='warning',active=state.phase==='active';
        ellipse(c,x+w/2,G+3,w*.64,10,'#142c36');c.beginPath();c.ellipse(x+w/2,G+1,w*.57,7,0,0,Math.PI*2);c.lineWidth=2;c.strokeStyle=warm?'#bc9270':'#697565';c.stroke();
        for(let i=0;i<6;i++)line(c,x+i*w/5-3,G+6,x+i*w/5+4,G-2,1.5,warm?'#d2a477':'#87917a');
        if(warm){c.save();c.globalAlpha=.15+state.progress*.3;const light=c.createRadialGradient(x+w/2,G,5,x+w/2,G,80);light.addColorStop(0,trap.type==='flame'?'#d59257':'#c6b77d');light.addColorStop(1,'#00000000');c.fillStyle=light;c.fillRect(x-45,G-80,w+90,125);c.restore();}
        if(trap.type==='spikes'){
          const height=active?trap.height*state.progress:warm?6+state.progress*6:4;
          for(let i=0;i<6;i++){const px=x+5+i*(w-10)/5;polygon(c,[[px-7,G+2],[px-1,G-height],[px+8,G+2]],'#7b8c72','#bac2a0');line(c,px+1,G+1,px,G-height*.65,1,'#d1ccb0');}
        }else if(active){
          c.save();c.globalCompositeOperation='screen';
          for(let i=0;i<6;i++){const px=x+8+i*(w-16)/5,h=trap.height*state.progress*(.8+.2*Math.sin(this.clock*17+i));
            c.beginPath();c.moveTo(px-13,G);c.bezierCurveTo(px-22,G-h*.45,px+12,G-h*.53,px+Math.sin(this.clock*12+i)*8,G-h);c.bezierCurveTo(px+21,G-h*.36,px+16,G-12,px+13,G);c.closePath();
            c.fillStyle=i%2?'#c7814bb0':'#e0b370a0';c.fill();line(c,px,G,px+2,G-h*.55,3,'#fae1a1');}
          c.restore();
        }
        if(warm||active){c.fillStyle='#d2b18b';c.font='11px "Noto Serif CJK JP",serif';c.textAlign='center';c.fillText(trap.type==='flame'?'呪炎 · 跳躍':'竹の牙 · 跳躍',x+w/2,G+32);}
      }
    }
    aftermath(c,dt){
      for(const a of this.stains){
        a.life-=dt;const r=rng(a.seed);c.save();c.globalAlpha=clamp(a.life/2,0,.8);
        ellipse(c,a.x-this.camera,a.y,a.size,2.6,'#663435');
        for(let i=0;i<5;i++)ellipse(c,a.x-this.camera+(r()-.5)*a.size*3,a.y+(r()-.5)*6,1+r()*2.6,.8+r(),'#934b42');
        c.restore();
      }
      this.stains=this.stains.filter(a=>a.life>0);
    }
    crow(c,game){
      const bird=game.crow;if(game.attract||!bird||bird.phase==='gone')return;
      const x=bird.x-this.camera,y=G-bird.y;if(x< -120||x>W+120)return;
      const perched=bird.phase==='perch',flap=perched?.12:Math.sin(this.clock*(bird.phase==='dive'?19:13));
      c.save();c.translate(x,y);c.scale(bird.dir||-1,1);c.rotate(bird.phase==='dive'?.25:bird.phase==='retreat'?-.23:0);
      const wing=(rear)=>{
        const stretch=perched?17:52,sweep=perched?5:flap*37;
        polygon(c,[[-8,-3],[-23,-8],[-22-stretch,sweep-8],[-36-stretch,sweep+4],[-20,sweep+13],[4,6]],rear?'#172b3c':'#263d50','#708392');
        for(let i=0;i<5;i++)line(c,-15-i*7,4+i*.5,-21-stretch+i*4,sweep+5+i*1.6,1,'#536a7c');
      };
      wing(true);polygon(c,[[-18,-1],[-43,5],[-31,12],[-18,9]],'#203749','#5b7586');
      ellipse(c,-1,2,22,13,bird.flashes>0?'#c4d6dc':'#21394b');wing(false);
      ellipse(c,16,-7,12,11,bird.flashes>0?'#d9e4dd':'#29465b');polygon(c,[[25,-11],[42,-4],[25,-1]],'#9a927c','#c2b494');
      ellipse(c,20,-9,2.8,2.8,bird.phase==='warn'||bird.phase==='dive'?'#e6ac76':'#d0ba81');
      for(const dx of [-6,4]){line(c,dx,12,dx+2,22,2,'#aaa58c');line(c,dx+2,22,dx+10,22,1.8,'#aaa58c');}
      c.restore();
      if(perched){line(c,x-75,y+25,x+65,y+25,7,'#405452');line(c,x-42,y+25,x-55,y+35,3,'#405452');}
      if(bird.phase==='warn'){
        c.save();c.strokeStyle='#dab991';c.lineWidth=1.2;c.globalAlpha=.4+bird.t*.5;c.beginPath();c.ellipse(bird.targetX-this.camera,G+2,83,7,0,0,6.28);c.stroke();
        c.fillStyle='#e4c7a3';c.textAlign='center';c.font='12px serif';c.fillText('黒羽の急降下 · 受け流し',bird.targetX-this.camera,G+30);c.restore();
      }
    }
    sword(c,s,p,f){
      // Curved blade, round tsuba, wrapped hilt — no Western cross guard.
      c.save();c.translate(s.frontHand.x,s.frontHand.y);c.rotate(s.blade);
      const length=124*(1-s.sheath);
      if(length>4){
        c.beginPath();c.moveTo(3,-4);c.quadraticCurveTo(length*.52,-1,length-16,-11);c.lineTo(length,-15);c.quadraticCurveTo(length*.75,1,3,5);c.closePath();c.fillStyle=f.team==='player'?'#c5d5d5':'#9eafb1';c.fill();c.lineWidth=.7;c.strokeStyle='#f0ecd8';c.stroke();
        c.beginPath();c.moveTo(8,1);c.quadraticCurveTo(length*.55,2,length-7,-10);c.lineWidth=1.5;c.strokeStyle=f.team==='player'?'#f4f0d7':'#d7dfd0';c.stroke();
        if(f.action==='storm'){c.shadowColor='#d0e8ee';c.shadowBlur=16;line(c,7,0,length-11,-7,4,'#e1f2e9');c.shadowBlur=0;}
      }
      ellipse(c,0,0,3.5,11,p.trim);line(c,-26,0,-3,0,6,p.belt);for(let x=-24;x< -4;x+=4)line(c,x,-3,x+3,3,1,'#d2c29b');ellipse(c,-27,0,3,4,p.trim);c.restore();
    }
    actor(c,f,dt,reflection=false){
      if(f.defeated&&f.deadAge>3.2)return;
      let a=this.animators.get(f);if(!a){a=new YakumoAnimation.Animator();this.animators.set(f,a);}
      const s=reflection?a.skeleton:a.update(f,dt,this.clock),p=palette[f.color]||palette.hero;
      const x=f.x-this.camera;if(x< -210||x>W+210)return;
      const alpha=f.defeated?clamp(1-(f.deadAge-1.6)/1.6,0,1):1;
      c.globalAlpha=alpha*(reflection?.075:1);
      if(!reflection&&f.y>=0)ellipse(c,x,G+4,Math.max(29,64-f.y*.15),7,'rgba(9,24,32,.34)');
      const m=YakumoEngine.MOVES[f.action];
      if(!reflection&&m&&f.t>m.active[0]-.06&&f.t<m.active[1]+.1&&a.trail.length>2){
        c.save();c.globalCompositeOperation='screen';
        c.beginPath();a.trail.forEach((q,i)=>i?c.lineTo(q.x-this.camera,G-q.y):c.moveTo(q.x-this.camera,G-q.y));
        a.trail.slice().reverse().forEach(q=>c.lineTo(q.hx-this.camera,G-q.hy));c.closePath();
        c.fillStyle=f.team==='player'?(f.action==='storm'?'#c5e1f066':f.action==='iai'?'#d5e4d340':'#d6e4d332'):'#b5727030';c.fill();
        c.beginPath();a.trail.forEach((q,i)=>i?c.lineTo(q.x-this.camera,G-q.y):c.moveTo(q.x-this.camera,G-q.y));c.lineWidth=f.action==='iai'?3:1.5;c.strokeStyle=f.team==='player'?'#e5eed7aa':'#dcb6a38a';c.stroke();c.restore();
      }
      c.save();c.translate(x,reflection?G+f.y:G-f.y);c.scale(f.dir*SCALE,(reflection?-1:1)*SCALE);c.lineJoin='round';c.lineCap='round';
      const limb=(a,b,w1,w2,main,light)=>{
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
        c.beginPath();c.moveTo(a.x+nx*w1*.5,a.y+ny*w1*.5);c.quadraticCurveTo((a.x+b.x)*.5+nx*w1*.55,(a.y+b.y)*.5+ny*w1*.55,b.x+nx*w2*.5,b.y+ny*w2*.5);c.quadraticCurveTo(b.x+dx/d*w2*.35,b.y+dy/d*w2*.35,b.x-nx*w2*.5,b.y-ny*w2*.5);c.lineTo(a.x-nx*w1*.5,a.y-ny*w1*.5);c.closePath();c.fillStyle=main;c.fill();c.lineWidth=.8;c.strokeStyle=p.dark;c.stroke();
        if(light)line(c,a.x-nx*w1*.21,a.y-ny*w1*.21,b.x-nx*w2*.21,b.y-ny*w2*.21,1.7,light);
      };
      const foot=(pt,front)=>{c.save();c.translate(pt.x,pt.y-2);const roll=front?s.toe:s.backToe,pivot=roll<0?-6:14;
        c.translate(pivot,5);c.rotate(roll);c.translate(-pivot,-5);c.beginPath();c.moveTo(-6,-5);c.quadraticCurveTo(1,-8,7,-3);c.lineTo(16,0);c.quadraticCurveTo(21,4,14,5);c.lineTo(-7,5);c.closePath();c.fillStyle=front?'#b8bca4':'#7c9187';c.fill();line(c,-7,5,17,5,2.3,'#9b926e');line(c,5,-1,5,3,1.5,'#786b50');c.restore();};
      const hand=(pt,front)=>{c.save();c.translate(pt.x,pt.y);c.beginPath();c.moveTo(-4,-5);c.quadraticCurveTo(3,-8,9,-4);c.lineTo(10,2);c.quadraticCurveTo(8,8,0,6);c.lineTo(-4,2);c.closePath();c.fillStyle=front?p.skin:color(p.skin,p.dark,.25);c.fill();c.lineWidth=.7;c.strokeStyle='#76665b';c.stroke();line(c,5,-4,5,1,.7,'#76665b');c.restore();};
      const leg=(hip,knee,ankle,front)=>{
        limb(hip,knee,30,28,front?p.pants:p.pantShade,front?'#738181':null);limb(knee,{x:ankle.x,y:ankle.y-5},28,16,front?p.pants:p.pantShade,front?'#738181':null);
        line(c,knee.x-3,knee.y+4,ankle.x-5,ankle.y-8,.9,p.dark);line(c,knee.x+5,knee.y+6,ankle.x+2,ankle.y-8,.9,p.dark);foot(ankle,front);
      };
      const arm=(sh,elbow,wrist,front)=>{
        limb(sh,elbow,27,21,front?p.cloth:p.shade,front?p.light:null);limb(elbow,wrist,13,9,front?p.skin:color(p.skin,p.dark,.25),front?'#c8b099':null);
        const dx=wrist.x-elbow.x,dy=wrist.y-elbow.y,d=Math.hypot(dx,dy)||1;
        line(c,wrist.x-dx/d*15,wrist.y-dy/d*15,wrist.x-dx/d*4,wrist.y-dy/d*4,10,p.pants);for(let k=5;k<14;k+=3)line(c,wrist.x-dx/d*k-dy/d*4,wrist.y-dy/d*k+dx/d*4,wrist.x-dx/d*k+dy/d*4,wrist.y-dy/d*k-dx/d*4,1,p.trim);hand(wrist,front);
      };
      // Long hair and torn hems react to motion behind the body.
      c.beginPath();c.moveTo(s.head.x-9,s.head.y-8);c.bezierCurveTo(s.head.x-32,s.head.y+28,s.hip.x-30+a.belt*.4,s.hip.y-4,s.hip.x-16+a.belt*.4,s.hip.y+14);c.bezierCurveTo(s.hip.x-49+a.belt,s.hip.y-11,s.head.x-29,s.head.y+26,s.head.x-18,s.head.y-14);c.closePath();c.fillStyle=f.team==='player'?'#142c39':'#152c37';c.fill();
      leg(s.backHip,s.backKnee,s.backFoot,false);arm(s.rearShoulder,s.backElbow,s.backHand,false);leg(s.frontHip,s.frontKnee,s.frontFoot,true);
      const axis={x:Math.sin(s.lean),y:-Math.cos(s.lean)},width=1-Math.abs(s.twist)*.25,
        side={x:Math.cos(s.lean)*width,y:Math.sin(s.lean)*width},at=(d,w)=>[s.hip.x+axis.x*d+side.x*w,s.hip.y+axis.y*d+side.y*w];
      polygon(c,[at(-11,-20),at(43,-21),at(57,-5),at(56,10),at(44,21),at(-7,22),[s.hip.x+17+a.belt*.3,s.hip.y+26],[s.hip.x+3,s.hip.y+18],[s.hip.x-13+a.belt*.15,s.hip.y+28]],p.cloth,p.dark);
      polygon(c,[at(48,-7),at(48,10),at(22,5)],p.shade);line(c,...at(49,-8),...at(11,13),3.5,p.light);line(c,...at(48,10),...at(10,-8),3,p.light);
      if(f.wound>0){
        c.save();c.globalAlpha*=Math.min(.82,f.wound/2);const mark=at(6,11);
        c.translate(...mark);c.rotate(s.lean);ellipse(c,0,0,4,9,'#783b3c');line(c,1,2,2,13,1.3,'#a05a4c');c.restore();
      }
      if(f.scorch>0){c.save();c.globalAlpha*=Math.min(.7,f.scorch/2);const mark=at(-7,13);ellipse(c,...mark,9,6,'#4c4745');ellipse(c,s.frontKnee.x,s.frontKnee.y-4,7,9,'#4c4745');c.restore();}
      if(f.team==='player'){
        c.beginPath();c.moveTo(...at(46,-5));c.quadraticCurveTo(...at(17,-1),...at(44,9));c.lineWidth=1;c.strokeStyle='#83705b';c.stroke();const neck=at(27,3);c.beginPath();c.arc(neck[0],neck[1],3.5,.4,5.6);c.lineWidth=2.8;c.strokeStyle='#87a39c';c.stroke();
      }else{
        for(let k=0;k<3;k++)line(c,...at(38-k*7,-15),...at(38-k*7,15),3,p.pantShade);
      }
      // Saya at the left hip, lacquered and bound with silk.
      const sayaX=s.hip.x-10,sayaY=s.hip.y-2;
      c.save();c.translate(sayaX,sayaY);c.rotate(2.84);line(c,0,0,112,0,8,'#223d4c');line(c,104,0,115,0,8,p.trim);line(c,8,-3,99,-3,1.2,'#648080');
      if(s.sheath>.70){line(c,-29,0,-3,0,6,p.belt);ellipse(c,0,0,3,10,p.trim);for(let k=-26;k< -4;k+=4)line(c,k,-3,k+3,3,1,'#c4b692');}c.restore();
      line(c,...at(0,-22),...at(0,23),6,p.belt);ellipse(c,s.hip.x+8,s.hip.y+1,4,4,p.belt);
      c.beginPath();c.moveTo(s.hip.x+8,s.hip.y+2);c.quadraticCurveTo(s.hip.x+13+a.belt*.4,s.hip.y+16,s.hip.x+7+a.belt*.8,s.hip.y+34);c.lineWidth=4;c.strokeStyle=p.belt;c.stroke();
      line(c,s.neck.x,s.neck.y+4,s.head.x-1,s.head.y+8,11,p.skin);
      this.sword(c,s,p,f);arm(s.shoulder,s.frontElbow,s.frontHand,true);
      c.save();c.translate(s.head.x,s.head.y);c.rotate(s.headAngle);
      if(f.team==='player'){
        c.beginPath();c.moveTo(-11,-8);c.quadraticCurveTo(-8,-18,5,-16);c.quadraticCurveTo(12,-11,10,-5);c.lineTo(16,-1);c.lineTo(11,2);c.lineTo(12,6);c.quadraticCurveTo(8,13,0,12);c.lineTo(-9,6);c.closePath();c.fillStyle=p.skin;c.fill();c.lineWidth=.8;c.strokeStyle='#76665b';c.stroke();
        c.beginPath();c.moveTo(-10,9);c.quadraticCurveTo(-17,-3,-12,-13);c.quadraticCurveTo(-5,-23,8,-17);c.lineTo(11,-9);c.lineTo(2,-10);c.lineTo(-4,-1);c.lineTo(-7,-4);c.lineTo(-7,8);c.closePath();c.fillStyle='#172e3a';c.fill();
        ellipse(c,-7,2,3,4,p.skin);line(c,4,-5,10,-3,1.5,'#293a3f');line(c,6,-1,9,-1,1,'#25343a');
        if(['trapHit','burned','crumple'].includes(f.action))ellipse(c,10,6,2.5,1.6,'#54343a');else line(c,9,6,12,5,.7,'#876e5d');
        ellipse(c,-16,-10,7,9,'#192f3b');line(c,-20,-13,-19,0,2,'#8b9c92');
        if(this.currentGame.comb){line(c,-16,-19,-4,-19,3,'#d4b978');for(let k=-15;k< -4;k+=3)line(c,k,-19,k,-13,1.2,'#d4b978');}
      }else{
        polygon(c,[[-12,-13],[2,-18],[14,-9],[11,0],[15,8],[2,16],[-10,9]],p.skin,p.dark);
        polygon(c,[[-10,-12],[-17,-26],[-3,-14]],'#aaad90');polygon(c,[[6,-14],[12,-27],[13,-6]],'#aaad90');
        line(c,-2,-4,6,-1,2.8,'#172d34');line(c,8,-2,11,1,2,'#172d34');ellipse(c,3,-3,2,1.5,'#d8a17c');line(c,2,8,10,7,1.7,'#404a4a');line(c,5,8,6,12,1,'#ebe2bc');
      }
      c.restore();
      if(f.burnTimer>0&&!reflection){
        c.save();c.globalCompositeOperation='screen';c.globalAlpha*=Math.min(.75,f.burnTimer*2);
        for(let i=0;i<4;i++){
          const px=s.hip.x-12+i*9,py=s.hip.y+24+(i%2)*13,h=15+Math.sin(this.clock*23+i)*7;
          c.beginPath();c.moveTo(px-4,py);c.quadraticCurveTo(px-11,py-h*.35,px+Math.sin(this.clock*16+i)*4,py-h);
          c.quadraticCurveTo(px+9,py-h*.3,px+4,py);c.closePath();c.fillStyle=i%2?'#edbf7a':'#d48552';c.fill();
        }
        c.restore();
      }
      c.restore();c.globalAlpha=1;
    }
    woman(c,wx,opacity=1){
      const x=wx-this.camera;if(x< -130||x>W+130)return;c.save();c.translate(x,G);c.scale(1.16,1.16);c.globalAlpha=opacity;
      polygon(c,[[-17,-90],[-27,-2],[13,-2],[19,-90]],'#785a58');line(c,-15,-3,-2,-3,6,'#b7bda4');line(c,5,-3,16,-3,6,'#b7bda4');
      polygon(c,[[-16,-137],[15,-139],[31,-61],[13,-54],[-6,-76],[-22,-64],[-34,-72]],'#bdbfaa','#758b87');
      polygon(c,[[-2,-135],[8,-133],[1,-75]],'#eee4c9');line(c,-17,-91,19,-91,7,'#937462');
      line(c,-4,-137,-4,-149,11,'#baa087');ellipse(c,-3,-159,12,16,'#bba088');
      c.beginPath();c.moveTo(7,-148);c.bezierCurveTo(21,-151,14,-180,-2,-177);c.bezierCurveTo(-14,-176,-15,-163,-13,-157);c.lineTo(-6,-168);c.lineTo(2,-167);c.bezierCurveTo(2,-125,-3,-95,15,-82);c.bezierCurveTo(31,-114,9,-135,7,-148);c.closePath();c.fillStyle='#1b303a';c.fill();
      line(c,-10,-161,-5,-161,1,'#38464a');line(c,-25,-98,-1,-119,14,'#b5b9a5');line(c,22,-98,-1,-119,14,'#d0d0b6');ellipse(c,-1,-118,5,5,'#c0a98c');c.restore();
    }
    neck(c,h,b){
      const id=h.id,headX=h.x-this.camera,headY=G-h.y;
      const rootX=b.x-this.camera+40+id*15,rootY=G+24;
      const p0={x:rootX,y:rootY},p1={x:rootX+100*Math.sin(id*.7),y:rootY-150-id%3*35},
        p2={x:headX+100+id%2*40,y:headY+50+Math.sin(id)*80},p3={x:headX,y:headY};
      const samples=[];
      for(let n=0;n<=28;n++){
        const t=n/28,p=curve(p0,p1,p2,p3,t),before=curve(p0,p1,p2,p3,Math.max(0,t-.012)),after=curve(p0,p1,p2,p3,Math.min(1,t+.012));
        const dx=after.x-before.x,dy=after.y-before.y,d=Math.hypot(dx,dy)||1,width=60*(1-t)+27*t;
        samples.push({x:p.x,y:p.y,nx:-dy/d,ny:dx/d,w:width});
      }
      const points=samples.map(p=>[p.x+p.nx*p.w*.5,p.y+p.ny*p.w*.5]).concat(samples.slice().reverse().map(p=>[p.x-p.nx*p.w*.5,p.y-p.ny*p.w*.5]));
      c.lineWidth=1.5;polygon(c,points,h.flashes>0?'#778f86':id%2?'#2d4548':'#354f4f','#142f39');
      c.beginPath();samples.forEach((p,n)=>n?c.lineTo(p.x-p.nx*p.w*.29,p.y-p.ny*p.w*.29):c.moveTo(p.x-p.nx*p.w*.29,p.y-p.ny*p.w*.29));c.lineWidth=3;c.strokeStyle='#8a917c66';c.stroke();
      for(let n=3;n<samples.length-1;n++){
        const p=samples[n];for(let k=-1;k<=1;k++){
          const x=p.x+p.nx*p.w*.22*k,y=p.y+p.ny*p.w*.22*k;
          polygon(c,[[x-p.nx*5-p.ny*3,y-p.ny*5+p.nx*3],[x-p.ny*6,y+p.nx*6],[x+p.nx*5-p.ny*3,y+p.ny*5+p.nx*3],[x+p.ny*4,y-p.nx*4]],n%3?'#5f76654a':'#9b8d6470');
        }
        if(n%3===0)polygon(c,[[p.x+p.nx*p.w*.43,p.y+p.ny*p.w*.43],[p.x+p.nx*(p.w*.65+10)+p.ny*9,p.y+p.ny*(p.w*.65+10)-p.nx*9],[p.x+p.nx*p.w*.46+p.ny*11,p.y+p.ny*p.w*.46-p.nx*11]],'#88907b');
      }
    }
    serpent(c,game){
      const b=game.boss;if(!b.active&&!game.attract&&game.player.x<4410)return;
      const bx=b.x-this.camera;c.save();
      if(game.offering&&!game.attract){
        for(let n=0;n<8;n++){
          const x=bx-455+n*95,y=G-7;c.fillStyle='#4e6059';c.fillRect(x-18,y-30,36,26);ellipse(c,x,y-30,19,6,'#b69d6d');
          line(c,x-18,y-14,x+18,y-14,1.4,'#8d9177');c.font='11px serif';c.textAlign='center';c.fillStyle='#c0b188';c.fillText('酒',x,y-9);
        }
      }
      if(game.attract){c.globalAlpha=.58;}
      const vanish=game.phase==='ending'||game.phase==='won'?clamp(1-game.endAge/7,0,.95):1;c.globalAlpha*=vanish;
      const glow=c.createRadialGradient(bx,G-65,70,bx,G-65,340);glow.addColorStop(0,'rgba(134,101,73,.14)');glow.addColorStop(1,'rgba(80,96,83,0)');c.fillStyle=glow;c.fillRect(bx-370,G-410,740,740);
      for(let i=0;i<8;i++){
        c.beginPath();c.moveTo(bx+60+i*5,G+29);c.bezierCurveTo(bx+220+i*10,G-90-i*11,bx+300-i*7,G+69,bx+410-i*12,G+13);c.lineWidth=21-i;c.strokeStyle=i%2?'#314c4e':'#253f46';c.stroke();
      }
      ellipse(c,bx+77,G+19,240,60,'#243b44');ellipse(c,bx+32,G-2,196,42,'#39524f');
      for(let i=0;i<6;i++){
        const x=bx-45+i*52;polygon(c,[[x-11,G-21],[x-8,G-62],[x,G-98-i%3*18],[x+8,G-63],[x+17,G-21]],'#254349');
        for(let k=0;k<4;k++)polygon(c,[[x-21,G-56-k*15],[x,G-82-k*15],[x+24,G-56-k*15]],'#2c504c');
      }
      const heads=b.heads.slice().sort((a,b)=>(a.phase==='open'||a.phase==='strike'?1:0)-(b.phase==='open'||b.phase==='strike'?1:0));
      for(const h of heads){
        const alpha=h.hp<=0?clamp(1-h.deadAge/2.7,0,1):1;if(!alpha)continue;
        c.save();c.globalAlpha*=alpha;this.neck(c,h,b);c.translate(h.x-this.camera,G-h.y);
        const tilt=h.phase==='strike'&&h.attack==='sweep'?.14:h.phase==='open'?.16:Math.sin(this.clock*1.1+h.id)*.045;
        c.rotate(tilt);const open=['warn','strike'].includes(h.phase)?clamp(h.t*1.6,.12,.75):h.phase==='open'?.32:.07;
        const face=h.flashes>0?'#82968a':'#4b625b';
        c.beginPath();c.moveTo(28,2);c.quadraticCurveTo(27,-28,4,-34);c.lineTo(-14,-31);c.quadraticCurveTo(-29,-35,-43,-21);c.lineTo(-73,-13);c.quadraticCurveTo(-91,-4,-73,4);c.lineTo(-24,4);c.lineTo(-16,13);c.lineTo(20,20);c.closePath();c.fillStyle=face;c.fill();c.lineWidth=1.4;c.strokeStyle='#223d43';c.stroke();
        polygon(c,[[-69,5],[-21,4],[-9,14+open*26],[-42,20+open*24],[-76,13+open*20]],'#18232c');
        c.beginPath();c.moveTo(18,15+open*8);c.lineTo(-16,21+open*24);c.lineTo(-69,16+open*24);c.quadraticCurveTo(-85,11+open*19,-71,8+open*19);c.lineTo(-24,13+open*14);c.closePath();c.fillStyle='#778371';c.fill();
        for(let k=0;k<5;k++){const x=-67+k*10;polygon(c,[[x,4],[x+6,4],[x+3,15+k%2*5]],'#d6cdb0');polygon(c,[[x+3,16+open*20],[x+9,16+open*20],[x+5,9+open*15]],'#c9c6a7');}
        polygon(c,[[-7,-24],[8,-65],[12,-28]],'#a4a78b');polygon(c,[[8,-20],[31,-49],[21,-12]],'#8d9e88');
        polygon(c,[[16,-12],[43,-21],[26,0]],'#728a77');
        c.shadowColor=h.phase==='warn'?'#e86445':'#b95448';c.shadowBlur=h.phase==='warn'?23:14;
        ellipse(c,-29,-17,8,5,h.phase==='warn'?'#efb176':'#cb7962');ellipse(c,-29,-17,2.3,5,'#392830');c.shadowBlur=0;
        line(c,-43,-23,-19,-24,3,'#a1a18a');line(c,-72,-8,-66,-8,2.5,'#263c40');
        for(let side of [-1,1]){c.beginPath();c.moveTo(-35,7+side*3);c.bezierCurveTo(-71,14+side*10,-88,29+side*8,-112,17+side*4);c.lineWidth=1.7;c.strokeStyle='#a8ad8e';c.stroke();}
        if(h.phase==='warn'){c.globalAlpha*=.5;c.beginPath();c.ellipse(-22,-8,63,46,0,0,Math.PI*2);c.lineWidth=1;c.strokeStyle='#d99d6b';c.stroke();}
        c.restore();
      }
      c.restore();
    }
    treasure(c,game){
      if(!['ending','won'].includes(game.phase)||game.endAge<3)return;
      const age=game.endAge,progress=clamp((age-3)/4,0,1),ease=progress*progress*(3-2*progress);
      const x=(game.boss.x+150)*(1-ease)+(game.player.x+147)*ease-this.camera,y=G-208-Math.sin(this.clock*1.6)*5;
      const alpha=clamp((age-3)/.8,0,1)*clamp((13.5-age)/2.1,0,1);c.save();c.globalAlpha=alpha;
      const light=c.createRadialGradient(x,y-45,3,x,y-45,100);light.addColorStop(0,'rgba(245,221,163,.28)');light.addColorStop(1,'rgba(222,222,182,0)');c.fillStyle=light;c.fillRect(x-105,y-150,210,210);
      c.translate(x,y);this.sword(c,{frontHand:{x:0,y:0},blade:-Math.PI/2+.10,sheath:0},palette.hero,{team:'player',action:'storm'});
      c.fillStyle='#e6d8ad';c.font='12px "Noto Serif CJK JP",serif';c.textAlign='center';c.fillText('天叢雲剣',1,39);c.restore();
    }
    warnings(c,game){
      const t=game.boss.telegraph;if(t){
        const x=t.x-this.camera,p=clamp(t.age/t.duration,0,1);c.save();c.globalAlpha=.2+p*.55;
        c.strokeStyle=t.attack==='venom'?'#c9aa7c':'#d8a07d';c.lineWidth=1.4;c.beginPath();c.ellipse(x,G+2,t.attack==='sweep'?154:105,8,0,0,Math.PI*2);c.stroke();
        for(let i=-2;i<=2;i++)polygon(c,[[x+i*35-5,G+13],[x+i*35,G+4],[x+i*35+5,G+13]],'#d9a382');
        c.font='11px "Noto Serif CJK JP",serif';c.textAlign='center';c.fillStyle='#efd1aa';c.fillText(t.attack==='bite'?'噛みつき ・ 受け流し':t.attack==='venom'?'毒の息 ・ 跳躍':'薙ぎ払い ・ 跳躍',x,G+40);c.restore();
      }
      for(const h of game.hazards){const x=h.x-this.camera;c.save();c.globalAlpha=.65;
        const gr=c.createRadialGradient(x,G-16,2,x,G-16,72);gr.addColorStop(0,'rgba(205,182,123,.56)');gr.addColorStop(.4,'rgba(148,161,109,.24)');gr.addColorStop(1,'rgba(98,138,124,0)');c.fillStyle=gr;c.fillRect(x-76,G-90,152,140);
        for(let i=0;i<5;i++){const dx=Math.sin(this.clock*5+i)*24,dy=Math.cos(this.clock*7+i)*8;c.beginPath();c.ellipse(x+dx+i*7,G-13+dy,30+i*4,11+i*2,-.3,0,Math.PI*2);c.lineWidth=1.5;c.strokeStyle='#b9b48770';c.stroke();}c.restore();}
    }
    particles(c,dt){
      for(const p of this.effects){p.life-=dt;if(p.bolt){const r=rng(p.seed);c.save();c.globalCompositeOperation='screen';c.globalAlpha=clamp(p.life/p.max,0,1);c.beginPath();c.moveTo(p.x-this.camera-22,0);for(let y=45;y<p.y;y+=40)c.lineTo(p.x-this.camera+(r()-.5)*83,y);c.lineTo(p.x-this.camera,p.y+90);c.shadowColor='#afcee8';c.shadowBlur=24;c.strokeStyle='#d5e8e3';c.lineWidth=5;c.stroke();c.shadowBlur=0;c.lineWidth=1.4;c.strokeStyle='#fff5da';c.stroke();c.restore();}
        else if(p.ring){p.size+=dt*210;c.globalAlpha=clamp(p.life/p.max,0,1)*.55;c.beginPath();c.ellipse(p.x-this.camera,p.y,p.size,p.size*.7,0,0,6.28);c.lineWidth=1.5;c.strokeStyle=p.color;c.stroke();}
        else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.blood?470:p.smoke?-25:135)*dt;c.save();c.translate(p.x-this.camera,p.y);c.globalAlpha=clamp(p.life/p.max,0,1)*(p.smoke?.35:1);
          if(p.smoke)ellipse(c,0,0,p.size*(1+(p.max-p.life)),p.size*.65,p.color);
          else if(p.blood){c.rotate(Math.atan2(p.vy,p.vx));ellipse(c,0,0,p.size*1.6,p.size*.7,p.color);}
          else{c.rotate(p.angle);polygon(c,[[-p.size*2,0],[0,-p.size*.6],[p.size*2,0],[0,p.size*.6]],p.color);}c.restore();}}
      this.effects=this.effects.filter(p=>p.life>0);c.globalAlpha=1;
      for(const a of this.labels){a.life-=dt;a.y-=dt*13;c.save();c.globalAlpha=Math.min(1,a.life*3);c.textAlign='center';c.font='31px "Noto Serif CJK JP",serif';c.shadowColor='#0b2532';c.shadowBlur=9;c.fillStyle=a.color;c.fillText(a.text,a.x-this.camera,a.y);c.restore();}this.labels=this.labels.filter(a=>a.life>0);
    }
    foreground(c,dt,game){
      for(const a of this.reeds){const x=a.x-this.camera*1.02;if(x< -25||x>W+25)continue;for(let k=0;k<3;k++){c.beginPath();c.moveTo(x,a.y);const sway=Math.sin(this.clock*.9+a.s)*5;c.quadraticCurveTo(x+sway+(k-1)*5,a.y-a.h*.6,x+sway+(k-1)*10,a.y-a.h);c.lineWidth=1.5;c.strokeStyle='#1b3841';c.stroke();}}
      const rainTarget=game.phase==='ending'||game.phase==='won'?0:1;this.rainAlpha+=(rainTarget-this.rainAlpha)*(1-Math.exp(-dt*.65));
      c.strokeStyle='#c3d7d7';c.lineWidth=.75;
      for(const a of this.rain){const y=(a.y+this.clock*a.v)%(H+70)-35,x=(a.x+this.clock*75)% (W+150)-75;c.globalAlpha=a.a*this.rainAlpha;line(c,x,y,x-4,y+a.length,.75,'#c3d7d7');}
      c.globalAlpha=1;
      for(const a of this.motes){const x=(a.x+this.clock*11)% (W+70)-35,y=(a.y-this.clock*8+H*100+Math.sin(this.clock+a.seed)*15)%H;c.globalAlpha=.11;ellipse(c,x,y,a.s,a.s*.5,game.boss.enraged?'#deaa82':'#cad2b4');}c.globalAlpha=1;
      // Moving low mist partly hides the serpent's roots and wet road reflections.
      for(let i=0;i<6;i++){const x=(i*350+this.clock*12)% (W+700)-350,y=G+35+i%2*20;c.globalAlpha=.055;ellipse(c,x,y,310,27,'#adc1b0');}c.globalAlpha=1;
    }
    render(game,dt){
      this.clock+=dt;
      const desired=game.attract?0:game.boss.active?4500:clamp(game.player.x-510,0,4500);
      this.camera+=(desired-this.camera)*(1-Math.exp(-dt*(game.phase==='bossIntro'?1.6:4)));
      const depth=game.attract?0:clamp(-game.player.y-84,0,148);this.cameraY+=(depth-this.cameraY)*(1-Math.exp(-dt*10));
      const target=game.phase==='ending'||game.phase==='won'?3:game.attract?2:game.chapter;
      this.theme+=(target-this.theme)*(1-Math.exp(-dt*.43));this.shake*=Math.exp(-dt*14);this.zoom+=(1-this.zoom)*(1-Math.exp(-dt*4));this.flash=Math.max(0,this.flash-dt);this.injuryFlash=Math.max(0,this.injuryFlash-dt);
      const index=Math.min(3,Math.floor(this.theme)),t=this.theme-index,p=themes[index].map((v,i)=>color(v,themes[Math.min(3,index+1)][i],t));
      const c=this.ctx;this.currentGame=game;c.setTransform(this.canvas.width/W,0,0,this.canvas.height/H,0,0);c.fillStyle='#0a1420';c.fillRect(0,0,W,H);
      c.save();c.translate(W/2,H/2);c.scale(this.zoom,this.zoom);c.translate(-W/2+Math.sin(this.clock*121)*this.shake,-H/2+Math.cos(this.clock*83)*this.shake*.35);
      c.translate(0,-this.cameraY);this.sky(c,p,game);this.woods(c,p);
      for(const x of [1820,2190,3800,4500])this.torii(c,x,x===2190?.65:1);
      this.shrine(c,game);this.ground(c,p);this.terrain(c,game);this.aftermath(c,dt);
      for(const x of [220,1320,2030,2860,3590,3960,4710,5820])this.stoneLamp(c,x);
      if(game.chapter===0&&!game.attract)this.woman(c,405,.82);
      this.serpent(c,game);this.warnings(c,game);
      const actors=[...game.enemies,game.player];
      c.save();c.beginPath();c.rect(0,G+8,W,H-G);c.clip();for(const f of actors)if(!game.pitAt(f.x)&&f.y>=0)this.actor(c,f,0,true);c.restore();
      for(const f of actors){
        const pit=f.y< -60&&game.pitAt(f.x);
        if(pit){c.save();c.beginPath();c.rect(pit.x+9-this.camera,0,pit.width-18,H+180);c.clip();}
        this.actor(c,f,dt,false);if(pit)c.restore();
      }
      this.crow(c,game);
      if(game.phase==='ending'||game.phase==='won')this.woman(c,game.player.x+185,clamp((game.endAge-2)/2,0,1));
      this.treasure(c,game);
      this.particles(c,dt);this.foreground(c,dt,game);c.restore();
      const vg=c.createRadialGradient(W*.5,H*.45,220,W*.5,H*.47,830);vg.addColorStop(0,'rgba(5,20,29,0)');vg.addColorStop(1,'rgba(7,19,29,.47)');c.fillStyle=vg;c.fillRect(0,0,W,H);
      c.globalAlpha=.30;c.fillStyle=this.grain;c.fillRect(0,0,W,H);c.globalAlpha=1;
      if(this.flash>0){c.fillStyle='rgba(224,234,216,'+Math.min(.28,this.flash*.55)+')';c.fillRect(0,0,W,H);}
      if(this.injuryFlash>0){const red=c.createRadialGradient(W/2,H/2,190,W/2,H/2,820);red.addColorStop(0,'rgba(115,26,30,0)');red.addColorStop(1,'rgba(130,29,33,'+this.injuryFlash+')');c.fillStyle=red;c.fillRect(0,0,W,H);}
      const scene=game.pitScene;
      if(scene&&!scene.fatal){const fade=scene.recovered?clamp((scene.duration-scene.age)/.24,0,1):clamp((scene.age-.62)/.26,0,1);c.fillStyle='rgba(5,9,15,'+fade+')';c.fillRect(0,0,W,H);}
    }
    get currentGame(){return this._game;}
    set currentGame(g){this._game=g;}
  }
  root.YakumoView={ShrineWorld,W,H,GROUND:G,SCALE};
})(typeof globalThis!=='undefined'?globalThis:this);
