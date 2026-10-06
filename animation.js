/* Original articulated motion: planted feet, weight transfer, anticipation and recovery. */
(function(root){
  'use strict';
  const base={hipX:0,hipY:-88,lean:.065,head:-.04,fx:39,fy:-117,bx:27,by:-107,
    ffx:37,ffy:-2,bfx:-36,bfy:-2,blade:-.72,sheath:0,toe:0,backToe:0,twist:0,robe:0};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>t*t*(3-2*t);
  const GAIT=root.YakumoEngine&&root.YakumoEngine.GAIT||{stride:40,stance:.6,scale:1.25};
  const pose=v=>Object.assign({},base,v);
  const frames={
    slash:[[0,{}],[.14,{hipX:-7,hipY:-91,lean:-.05,fx:0,fy:-148,bx:-11,by:-134,blade:-2.12,ffx:38,ffy:-10,bfx:-42}],
      [.285,{hipX:23,hipY:-84,lean:.25,fx:91,fy:-107,bx:75,by:-114,blade:.35,ffx:62,bfx:-39,twist:.7,robe:9}],
      [.38,{hipX:22,lean:.24,fx:93,fy:-100,bx:79,by:-108,blade:.56,ffx:60,bfx:-39}],
      [.47,{hipX:10,lean:.13,fx:63,fy:-108,bx:50,by:-111,blade:.10,ffx:48,ffy:-11,bfx:-38}], [.57,{}]],
    reverse:[[0,{}],[.17,{hipX:-3,hipY:-81,lean:.17,fx:11,fy:-89,bx:0,by:-103,blade:1.18,ffx:43,ffy:-9,bfx:-40}],
      [.32,{hipX:25,hipY:-91,lean:.18,fx:90,fy:-119,bx:79,by:-105,blade:-1.03,ffx:63,bfx:-27,twist:-.7,robe:11}],
      [.43,{hipX:23,hipY:-90,lean:.15,fx:82,fy:-132,bx:68,by:-119,blade:-1.37,ffx:62}],
      [.54,{hipX:10,lean:.1,fx:56,fy:-126,bx:42,by:-118,blade:-1.10,ffx:47,ffy:-9}], [.64,{}]],
    cleave:[[0,{}],[.23,{hipX:-6,hipY:-93,lean:-.12,fx:5,fy:-164,bx:-4,by:-148,blade:-1.83,ffx:37,ffy:-13,bfx:-49}],
      [.435,{hipX:27,hipY:-72,lean:.39,fx:94,fy:-108,bx:84,by:-119,blade:.77,ffx:68,bfx:-38,robe:15}],
      [.56,{hipX:24,hipY:-76,lean:.31,fx:83,fy:-97,bx:71,by:-109,blade:1.12,ffx:63}],
      [.67,{hipX:11,hipY:-84,lean:.17,fx:58,fy:-109,bx:44,by:-113,blade:.2,ffx:48,ffy:-12}], [.78,{}]],
    iai:[[0,{}],[.19,{hipX:-6,hipY:-75,lean:.24,fx:-12,fy:-88,bx:-32,by:-80,blade:.22,sheath:1,ffx:37,bfx:-48}],
      [.37,{hipX:-7,hipY:-73,lean:.24,fx:-14,fy:-86,bx:-34,by:-78,blade:.24,sheath:1,ffx:38,ffy:-9,bfx:-49}],
      [.545,{hipX:29,hipY:-76,lean:.24,fx:98,fy:-122,bx:10,by:-95,blade:-.10,sheath:0,ffx:70,bfx:-40,twist:.8,robe:18}],
      [.665,{hipX:31,hipY:-78,lean:.20,fx:100,fy:-119,bx:7,by:-93,blade:.04,ffx:71,bfx:-36}],
      [.85,{hipX:13,hipY:-84,lean:.13,fx:65,fy:-120,bx:18,by:-101,blade:-.3,ffx:50,ffy:-10,bfx:-36}], [.99,{}]],
    airslash:[[0,{ffx:25,ffy:-40,bfx:-25,bfy:-28}],
      [.17,{hipX:-5,lean:-.1,fx:5,fy:-151,bx:-7,by:-139,blade:-2.1,ffx:30,ffy:-44,bfx:-22,bfy:-35}],
      [.32,{hipX:18,lean:.27,fx:92,fy:-107,bx:77,by:-111,blade:.35,ffx:65,ffy:-35,bfx:-29,bfy:-30,robe:18}],
      [.46,{hipX:14,lean:.19,fx:82,fy:-95,bx:69,by:-105,blade:.80,ffx:53,ffy:-30,bfx:-19,bfy:-28}],
      [.72,{ffx:24,ffy:-31,bfx:-22,bfy:-25}]],
    storm:[[0,{}],[.24,{hipX:0,hipY:-94,lean:-.1,fx:14,fy:-163,bx:11,by:-147,blade:-1.55,ffx:40,bfx:-46,robe:9}],
      [.38,{hipX:2,hipY:-95,lean:-.07,fx:17,fy:-167,bx:13,by:-151,blade:-1.53,ffx:42,bfx:-46,robe:18}],
      [.53,{hipX:29,hipY:-76,lean:.33,fx:105,fy:-112,bx:90,by:-119,blade:.40,ffx:73,bfx:-41,robe:26}],
      [.78,{hipX:24,hipY:-79,lean:.25,fx:87,fy:-108,bx:72,by:-116,blade:.69,ffx:63,robe:18}], [1.18,{}]],
    dodge:[[0,{}],[.10,{hipX:16,hipY:-60,lean:.65,fx:39,fy:-95,bx:21,by:-87,blade:-.2,ffx:60,bfx:-39,robe:20}],
      [.27,{hipX:20,hipY:-63,lean:.61,fx:48,fy:-101,bx:30,by:-94,blade:-.1,ffx:62,bfx:-38,robe:24}], [.40,{}]],
    hit:[[0,{}],[.10,{hipX:-13,hipY:-83,lean:-.34,fx:14,fy:-136,bx:0,by:-126,blade:-1.40,ffx:35,bfx:-48,robe:8}],
      [.24,{hipX:-9,hipY:-82,lean:-.2,fx:21,fy:-129,bx:9,by:-120,blade:-1.1,ffx:36,bfx:-47}], [.40,{}]],
    trapHit:[[0,{}],[.08,{hipX:-6,hipY:-69,lean:.35,head:.16,fx:25,fy:-85,bx:2,by:-67,blade:.48,ffx:45,ffy:-9,bfx:-35,robe:8}],
      [.24,{hipX:-5,hipY:-63,lean:.40,head:.20,fx:29,fy:-82,bx:8,by:-61,blade:.64,ffx:46,ffy:-5,bfx:-35}],
      [.43,{hipX:-2,hipY:-79,lean:.23,head:.11,fx:31,fy:-103,bx:7,by:-80,blade:.20,ffx:39,bfx:-37}], [.62,{}]],
    burned:[[0,{}],[.09,{hipX:-11,hipY:-79,lean:-.25,head:-.14,fx:39,fy:-140,bx:-18,by:-128,blade:-1.17,ffx:37,bfx:-47,robe:15}],
      [.25,{hipX:4,hipY:-73,lean:.29,head:.12,fx:60,fy:-111,bx:4,by:-84,blade:-.18,ffx:45,bfx:-39,robe:16}],
      [.43,{hipX:-3,hipY:-82,lean:-.08,fx:31,fy:-121,bx:14,by:-97,blade:-.71,ffx:38,bfx:-42}], [.64,{}]],
    crumple:[[0,{hipY:-84,lean:-.17,fx:18,fy:-147,bx:4,by:-131,blade:-1.2,ffx:27,ffy:-21,bfx:-20,bfy:-34,robe:18}],
      [.12,{hipX:-7,hipY:-47,lean:.22,head:.2,fx:21,fy:-76,bx:3,by:-55,blade:2.25,ffx:35,ffy:-4,bfx:-29,bfy:-8,robe:10}],
      [.30,{hipX:-8,hipY:-27,lean:.63,head:.22,fx:25,fy:-52,bx:8,by:-43,blade:2.85,ffx:35,ffy:-4,bfx:-28,bfy:-5}],
      [.63,{hipX:-8,hipY:-29,lean:.65,head:.25,fx:25,fy:-54,bx:8,by:-44,blade:2.85,ffx:35,ffy:-4,bfx:-28,bfy:-5}],
      [2.1,{hipX:-8,hipY:-28,lean:.65,head:.25,fx:25,fy:-54,bx:8,by:-44,blade:2.85,ffx:35,ffy:-4,bfx:-28,bfy:-5}]],
    recover:[[0,{hipX:-8,hipY:-28,lean:.65,head:.25,fx:25,fy:-54,bx:8,by:-44,blade:2.85,ffx:35,ffy:-4,bfx:-28,bfy:-5}],
      [.22,{hipX:-3,hipY:-62,lean:.31,head:.12,fx:31,fy:-97,bx:11,by:-80,blade:.28,ffx:35,bfx:-31}], [.48,{}]],
    stunned:[[0,{}],[.17,{hipX:-14,lean:-.27,fx:38,fy:-104,bx:23,by:-94,blade:.14,head:-.14}],
      [.51,{hipX:-10,lean:-.16,fx:29,fy:-102,bx:13,by:-91,blade:.31,head:-.10}], [.72,{}]],
    dead:[[0,{}],[.19,{hipX:-17,hipY:-75,lean:-.52,fx:4,fy:-119,bx:-17,by:-116,blade:-1.3,ffx:35,bfx:-53}],
      [.47,{hipX:-31,hipY:-39,lean:-1.08,fx:-51,fy:-55,bx:-63,by:-38,blade:.22,ffx:42,bfx:10,bfy:-20}],
      [.83,{hipX:-28,hipY:-22,lean:-1.48,fx:-75,fy:-17,bx:-37,by:-13,blade:.10,ffx:51,ffy:-5,bfx:34,bfy:-3}],
      [1.1,{hipX:-28,hipY:-21,lean:-1.5,fx:-78,fy:-14,bx:-39,by:-10,blade:.10,ffx:51,ffy:-4,bfx:34,bfy:-3}]],
    ritual:[[0,{}],[.55,{hipX:-3,hipY:-58,lean:.24,fx:12,fy:-97,bx:-1,by:-91,blade:.28,sheath:1,ffx:27,bfx:-18}],
      [1.2,{hipX:-2,hipY:-57,lean:.35,fx:26,fy:-117,bx:16,by:-109,blade:.2,sheath:1,ffx:27,bfx:-18}],
      [3.6,{hipX:-2,hipY:-57,lean:.35,fx:26,fy:-117,bx:16,by:-109,blade:.2,sheath:1,ffx:27,bfx:-18}]],
    ready:[[0,{sheath:1,fx:-10,fy:-85,bx:-28,by:-80,blade:.25}],
      [1,{hipY:-88,fx:39,fy:-132,bx:29,by:-115,blade:-.9}], [3.2,{}]],
    sheathe:[[0,{}],[.8,{hipY:-89,lean:.01,fx:47,fy:-102,bx:-15,by:-86,blade:2.8}],
      [1.8,{hipY:-88,lean:.06,fx:-10,fy:-87,bx:-26,by:-84,blade:3.36,sheath:1,ffx:26,bfx:-25}],
      [3.2,{hipY:-87,lean:.27,fx:21,fy:-90,bx:7,by:-83,blade:.26,sheath:1,ffx:26,bfx:-25}],
      [13,{hipY:-88,lean:.08,fx:18,fy:-83,bx:-12,by:-84,blade:.26,sheath:1,ffx:26,bfx:-25}]]
  };
  function cat(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
  function keyed(keys,t){
    if(t<=keys[0][0])return pose(keys[0][1]);if(t>=keys[keys.length-1][0])return pose(keys[keys.length-1][1]);
    let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;
    const s=(t-keys[i][0])/(keys[i+1][0]-keys[i][0]),a=pose(keys[Math.max(0,i-1)][1]),b=pose(keys[i][1]),c=pose(keys[i+1][1]),d=pose(keys[Math.min(keys.length-1,i+2)][1]),v={};
    for(const k of Object.keys(base))v[k]=cat(a[k],b[k],c[k],d[k],s);v.sheath=Math.max(0,Math.min(1,v.sheath));return v;
  }
  function target(f,time){
    if(frames[f.action]){
      const v=keyed(frames[f.action],f.t);
      if(['slash','reverse','cleave','iai','storm'].includes(f.action)&&Math.abs(f.y)<1){v.ffy=Math.min(-2,v.ffy);v.bfy=Math.min(-2,v.bfy);}
      if(f.action==='airslash'&&Math.abs(f.y)<1){
        v.ffx=clamp(v.ffx,30,55);v.ffy=-2;v.bfx=-34;v.bfy=-2;
        const age=f.landingAge===undefined?1:f.landingAge;
        v.hipY+=13*(1-smooth(clamp(age/.24,0,1)))*clamp((f.landingSpeed||0)/600,0,1);
      }
      return v;
    }
    let v;
    if(f.action==='walk'){
      const s=f.walk,front=gait(s),back=gait(s+Math.PI);
      const speed=clamp((f.vx||0)*f.dir/248,-1,1),drive=clamp((f.accel||0)*f.dir/1800,-1,1),lean=.09+speed*.12+drive*.075;
      v=pose({hipX:Math.sin(s*2-.2)*2.8,hipY:-85+Math.cos(s*2-.4)*3.4,lean,head:-lean*.67,
        ffx:front.x,ffy:front.y,bfx:back.x,bfy:back.y,toe:front.toe,backToe:back.toe,
        fx:31-Math.cos(s)*8,fy:-101+Math.sin(s*2)*2,bx:-8+Math.cos(s)*15,by:-111+Math.sin(s)*5,
        blade:-.31+Math.sin(s+.4)*.075,twist:Math.sin(s)*.12,robe:9+Math.abs(speed)*4});
    }
    else if(f.action==='guard')v=pose({hipY:-81,lean:-.065,fx:40,fy:-128,bx:35,by:-112,blade:-1.47,ffx:39,bfx:-44,head:.015});
    else if(f.action==='crouch')v=pose({hipY:-59,lean:.29,fx:47,fy:-104,bx:31,by:-95,blade:-.59,ffx:49,bfx:-42});
    else if(f.action==='jump'){
      const lift=smooth(clamp((f.t||0)/.12,0,1));
      if((f.vy||0)>90)return pose({hipY:-69-20*lift,lean:.23,head:-.11,fx:35+5*lift,fy:-114-17*lift,bx:20,by:-104-13*lift,
        blade:-.91,ffx:36-10*lift,ffy:Math.min(8,(f.y||0)/GAIT.scale)*(1-lift)-44*lift,
        bfx:-35,bfy:-2-29*lift,toe:.18*(1-lift),backToe:.12,robe:18});
      if((f.vy||0)< -100)return pose({hipY:-85,lean:.12,head:-.04,fx:44,fy:-124,bx:20,by:-112,blade:-.78,
        ffx:48,ffy:(f.y||0)<65?-2:-13,bfx:-28,bfy:-25,toe:-.12,backToe:.10,robe:24});
      return pose({hipY:-90,lean:.17,head:-.10,fx:42,fy:-129,bx:21,by:-115,blade:-.92,ffx:38,ffy:-35,bfx:-32,bfy:-27,toe:.02,backToe:.12,robe:24});
    }
    if(f.action==='fall')return pose({hipY:-84,lean:-.17,fx:18,fy:-147,bx:4,by:-131,blade:-1.2,ffx:27,ffy:-21,bfx:-20,bfy:-34,robe:18});
    if(!v){const b=Math.sin(time*2.35+(f.id||0)*1.1),brake=clamp(-(f.accel||0)*f.dir/1760,0,1);
      v=pose({hipY:-88+b*.8+brake*4,lean:.065-brake*.09,head:brake*.05,fx:39+b,fy:-117-b+brake*3,bx:27+b,by:-107-b+brake*3,blade:-.72+b*.015});}
    if(Math.abs(f.y||0)<1){
      if(f.action!=='walk'&&Math.abs(f.vx||0)>12){const front=gait(f.walk),back=gait(f.walk+Math.PI);
        Object.assign(v,{ffx:front.x,ffy:front.y,bfx:back.x,bfy:back.y,toe:front.toe,backToe:back.toe});}
      const turn=Math.sin(Math.PI*clamp((f.turnAge===undefined?1:f.turnAge)/.18,0,1));
      v.hipY+=turn*4;v.twist+=turn*.30;v.head-=turn*.10;
      const age=f.landingAge===undefined?1:f.landingAge,load=clamp((f.landingSpeed||0)/600,0,1);
      if(age<.24){const absorb=(1-smooth(clamp(age/.24,0,1)))*load;
        v.hipY+=15*absorb;v.lean+=.12*absorb;v.head-=.10*absorb;v.fy+=10*absorb;v.by+=10*absorb;v.robe+=6*absorb;}
    }
    return v;
  }
  function gait(angle){
    const {stride,stance}=GAIT,u=((angle/(Math.PI*2))%1+1)%1;
    if(u<stance){const heel=clamp(1-u/.09,0,1),push=clamp((u-stance+.10)/.10,0,1);
      return {x:stride*(1-2*u/stance),y:-2,toe:-.15*heel+.21*push,grounded:true,phase:u};}
    const t=(u-stance)/(1-stance),t2=t*t,t3=t2*t,velocity=-2*stride*(1-stance)/stance;
    return {x:(2*t3-3*t2+1)*-stride+(t3-2*t2+t)*velocity+(-2*t3+3*t2)*stride+(t3-t2)*velocity,
      y:-2-Math.pow(Math.sin(Math.PI*t),1.25)*27,toe:-Math.sin(Math.PI*t)*.16,grounded:false,phase:u};
  }
  function ik(r,e,a,b,bend){
    const dx=e.x-r.x,dy=e.y-r.y,raw=Math.hypot(dx,dy),d=Math.max(.01,Math.min(a+b-.05,raw));
    const nx=dx/Math.max(.01,raw),ny=dy/Math.max(.01,raw),along=(a*a-b*b+d*d)/(2*d),side=Math.sqrt(Math.max(0,a*a-along*along))*bend;
    return {x:r.x+nx*along-ny*side,y:r.y+ny*along+nx*side};
  }
  function skeleton(p){
    const hip={x:p.hipX,y:p.hipY},axis={x:Math.sin(p.lean),y:-Math.cos(p.lean)},side={x:Math.cos(p.lean),y:Math.sin(p.lean)};
    const along=(d,w=0)=>({x:hip.x+axis.x*d+side.x*w,y:hip.y+axis.y*d+side.y*w});
    const shoulder=along(48,2),rearShoulder=along(47,-5),frontHand={x:p.fx,y:p.fy},backHand={x:p.bx,y:p.by};
    const frontHip={x:hip.x+7,y:hip.y+1},backHip={x:hip.x-7,y:hip.y},frontFoot={x:p.ffx,y:p.ffy},backFoot={x:p.bfx,y:p.bfy};
    return {hip,chest:along(38),shoulder,rearShoulder,neck:along(60,3),head:along(78,4),frontHip,backHip,frontHand,backHand,frontFoot,backFoot,
      frontElbow:ik(shoulder,frontHand,34,33,1),backElbow:ik(rearShoulder,backHand,34,33,1),frontKnee:ik(frontHip,frontFoot,51,50,-1),backKnee:ik(backHip,backFoot,51,50,-1),
      lean:p.lean,headAngle:p.lean+p.head,blade:p.blade,sheath:p.sheath,toe:p.toe,backToe:p.backToe,twist:p.twist,robe:p.robe};
  }
  class Animator{
    constructor(){
      this.pose=pose({});this.belt=0;this.previousBelt=0;this.trail=[];this.skeleton=skeleton(this.pose);
      this.contacts=[null,null];this.swingOffsets=[null,null];this.rest=null;this.wasMoving=false;this.lastDir=null;this.lastX=null;
    }
    feet(f,v,dt){
      const names=[['ffx','ffy','toe'],['bfx','bfy','backToe']],scale=GAIT.scale,dir=f.dir;
      if(this.lastDir!==null&&this.lastDir!==dir){
        const old={...this.pose};
        this.pose.ffx=-old.bfx;this.pose.ffy=old.bfy;this.pose.bfx=-old.ffx;this.pose.bfy=old.ffy;
        this.contacts.reverse();this.swingOffsets.reverse();this.rest=null;
      }
      const ground=Math.abs(f.y||0)<.5&&(f.vy||0)<=0,free=['idle','walk','guard','crouch'].includes(f.action);
      if(!ground||!free||this.lastX!==null&&Math.abs(f.x-this.lastX)>80){
        this.contacts=[null,null];this.swingOffsets=[null,null];this.rest=null;this.wasMoving=false;
      }else if(Math.abs(f.vx||0)>12){
        this.rest=null;
        for(let i=0;i<2;i++){
          const [x,y,toe]=names[i],step=gait((f.walk||0)+i*Math.PI);
          if(step.grounded){
            if(this.contacts[i]===null)this.contacts[i]=f.x+v[x]*dir*scale;
            this.pose[x]=(this.contacts[i]-f.x)/(dir*scale);this.pose[y]=-2;this.pose[toe]=step.toe;this.swingOffsets[i]=null;
          }else{
            if(this.contacts[i]!==null){this.swingOffsets[i]={x:(this.contacts[i]-f.x)/(dir*scale)-v[x],y:this.pose[y]-v[y]};this.contacts[i]=null;}
            const offset=this.swingOffsets[i],u=(step.phase-GAIT.stance)/(1-GAIT.stance),fade=1-smooth(clamp(u,0,1));
            this.pose[x]=v[x]+(offset?offset.x*fade:0);this.pose[y]=v[y]+(offset?offset.y*fade:0);this.pose[toe]=step.toe;
          }
        }
        this.wasMoving=true;
      }else{
        if(this.wasMoving&&!this.rest){
          this.rest={age:0,origins:names.map(([x,y])=>({x:f.x+this.pose[x]*dir*scale,y:this.pose[y]})),targets:[]};
          for(let i=0;i<2;i++){
            const other=this.contacts[1-i],local=other===null?(i===0?34:-34):(other-f.x)/(dir*scale)+(i===0?55:-55);
            this.rest.targets[i]=f.x+clamp(local,-46,46)*dir*scale;
          }
        }
        if(this.rest)this.rest.age+=dt;
        for(let i=0;i<2;i++){
          const [x,y,toe]=names[i];
          if(this.contacts[i]!==null){this.pose[x]=(this.contacts[i]-f.x)/(dir*scale);this.pose[y]=-2;}
          else if(this.rest){
            const u=clamp(this.rest.age/.19,0,1),ease=smooth(u),start=this.rest.origins[i];
            const world=start.x+(this.rest.targets[i]-start.x)*ease;
            this.pose[x]=(world-f.x)/(dir*scale);this.pose[y]=-2+(start.y+2)*(1-ease)-Math.sin(Math.PI*u)*4;
            if(u===1)this.contacts[i]=world;
          }else{this.contacts[i]=f.x+this.pose[x]*dir*scale;this.pose[y]=-2;}
          this.pose[toe]*=Math.exp(-dt*18);
        }
        this.wasMoving=false;
      }
      this.lastDir=dir;this.lastX=f.x;
    }
    update(f,dt,time){
      if(dt<=0)return this.skeleton;
      const v=target(f,time),rate=['slash','reverse','cleave','iai','airslash','storm'].includes(f.action)?37:19,mix=1-Math.exp(-dt*rate);
      if(Math.abs(f.y||0)<.5&&Math.abs(f.vx||0)<=12&&['idle','walk','guard','crouch'].includes(f.action))
        v.hipX+=clamp((this.pose.ffx+this.pose.bfx)*.325,-21,21);
      // The analytical stride is already smooth. Ground contacts must bypass pose filtering.
      const feet=this.pose;const previous={ffx:feet.ffx,ffy:feet.ffy,bfx:feet.bfx,bfy:feet.bfy};
      for(const k of Object.keys(base))this.pose[k]+=(v[k]-this.pose[k])*mix;
      if(Math.abs(f.y||0)<.5&&['idle','walk','guard','crouch'].includes(f.action))Object.assign(this.pose,previous);
      this.feet(f,v,dt);
      const desired=-f.vx*.040+Math.sin(time*4.6)*2+this.pose.robe;
      const speed=(this.belt-this.previousBelt)*.85;this.previousBelt=this.belt;this.belt+=speed+(desired-this.belt)*Math.min(.12,dt*5);this.belt=Math.max(-30,Math.min(30,this.belt));
      const s=this.skeleton=skeleton(this.pose),length=124*(1-s.sheath),angle=s.blade;
      const tip={x:s.frontHand.x+Math.cos(angle)*length,y:s.frontHand.y+Math.sin(angle)*length};
      this.trail.push({x:f.x+tip.x*f.dir*1.25,y:f.y-tip.y*1.25,hx:f.x+s.frontHand.x*f.dir*1.25,hy:f.y-s.frontHand.y*1.25,t:time});
      this.trail=this.trail.filter(a=>time-a.t<.18);return s;
    }
  }
  root.YakumoAnimation={Animator,frames,target,keyed,gait,ik,skeleton};if(typeof module!=='undefined'&&module.exports)module.exports=root.YakumoAnimation;
})(typeof globalThis!=='undefined'?globalThis:this);
