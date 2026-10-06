/* 八雲ノ太刀 — sword combat, the offering, and eight independent serpent heads. */
(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const MOVES={
    slash:{duration:.57,active:[.23,.35],range:224,damage:26,cost:9,push:22,name:'袈裟斬り'},
    reverse:{duration:.64,active:[.27,.41],range:234,damage:31,cost:12,push:28,name:'返し斬り'},
    cleave:{duration:.78,active:[.37,.51],range:248,damage:40,cost:17,push:35,name:'唐竹割り'},
    iai:{duration:.99,active:[.49,.63],range:290,damage:58,cost:29,push:46,name:'居合'},
    airslash:{duration:.72,active:[.26,.42],range:246,damage:36,cost:18,push:31,name:'飛燕'},
    storm:{duration:1.18,active:[.46,.58],range:440,damage:90,cost:12,push:50,name:'荒魂・天雷'}
  };
  const CHAPTERS=[
    {name:'哭く、出雲の森',short:'出雲',start:0,end:1880,spawn:265},
    {name:'八塩折の祠',short:'八塩折',start:1880,end:3860,spawn:2015},
    {name:'八つの影、ひとつの誓い',short:'八岐大蛇',start:3860,end:6350,spawn:4005}
  ];
  const ENEMIES=[
    {x:860,name:'穢れの刀影',hp:100,chapter:0,style:'shade',color:'ash'},
    {x:1560,name:'樹骸の守り手',hp:140,chapter:0,style:'ward',color:'moss'},
    {x:2600,name:'祠を喰む鬼影',hp:125,chapter:1,style:'swift',color:'rust'},
    {x:3320,name:'夜祭の荒武者',hp:165,chapter:1,style:'brute',color:'bone'}
  ];
  const HEAD_NAMES=['壱ノ首','弐ノ首','参ノ首','肆ノ首','伍ノ首','陸ノ首','漆ノ首','捌ノ首'];
  const GAIT={stride:40,stance:.6,scale:1.25,cycle:2*40*1.25/.6};
  const PITS=[
    {id:'forest-gap',x:1130,width:140,chapter:0},
    {id:'shrine-gap',x:2110,width:138,chapter:1},
    {id:'serpent-gap',x:4170,width:152,chapter:2}
  ];
  const TRAPS=[
    {id:'bamboo-teeth',type:'spikes',x:495,width:86,height:64,chapter:0,period:3.1,warning:1.1,duration:.85,offset:.35},
    {id:'cursed-flame',type:'flame',x:2920,width:82,height:88,chapter:1,period:3.4,warning:1,duration:.95,offset:.4},
    {id:'serpent-teeth',type:'spikes',x:4480,width:94,height:72,chapter:2,period:3.0,warning:.9,duration:.9,offset:1.1}
  ];
  function trapState(trap,time){
    const elapsed=time+trap.offset,age=((elapsed%trap.period)+trap.period)%trap.period,cycle=Math.floor(elapsed/trap.period);
    if(age<trap.warning)return {phase:'warning',progress:age/trap.warning,cycle};
    if(age<trap.warning+trap.duration){const t=age-trap.warning;return {phase:'active',progress:Math.min(1,t/.12,(trap.duration-t)/.16),cycle};}
    return {phase:'hidden',progress:0,cycle};
  }
  const REST_X=[-420,-260,-140,-15,80,180,275,300],REST_Y=[175,290,398,490,525,453,353,233];
  function fighter(options={}){
    return Object.assign({x:265,y:0,vx:0,vy:0,dir:1,hp:160,maxHp:160,stamina:100,action:'idle',t:0,
      walk:0,combo:0,comboTimer:0,buffer:null,bufferTime:0,hitUsed:false,guardAge:99,guarding:false,
      invincible:0,aiTimer:.4,aiChoice:0,active:false,defeated:false,deadAge:0,footPhase:0,
      attacks:0,flashes:0,wound:0,scorch:0,burnTimer:0,accel:0,turnAge:1,turnFrom:1,landingAge:1,landingSpeed:0,
      safeX:options.x||265,color:'hero',team:'player'},options);
  }
  function serpent(){
    return {x:5600,active:false,phase:'dormant',t:0,index:0,cycles:0,cooldown:1.3,telegraph:null,defeated:false,
      endingAge:0,enraged:false,
      heads:HEAD_NAMES.map((name,id)=>({id,name,hp:88+id*4,maxHp:88+id*4,restX:5600+REST_X[id],restY:REST_Y[id],
        x:5600+REST_X[id],y:REST_Y[id],phase:'idle',t:0,deadAge:0,flashes:0,hitSerial:-1,
        attack:['bite','bite','venom','sweep','bite','venom','bite','sweep'][id]}))};
  }
  class Saga{
    constructor(options={}){
      this.demo=!!options.demo;this.difficulty=options.difficulty||'normal';this.chapter=options.checkpoint||0;
      this.player=fighter({x:CHAPTERS[this.chapter].spawn,name:'須佐之男命',active:true});
      this.enemies=ENEMIES.map((e,id)=>fighter(Object.assign({},e,{id,maxHp:e.hp,dir:-1,team:'enemy',
        defeated:e.chapter<this.chapter,hp:e.chapter<this.chapter?0:e.hp,action:e.chapter<this.chapter?'dead':'idle',aiTimer:.65+id*.13})));
      this.boss=serpent();this.offering=this.chapter===2;this.comb=this.chapter>0;this.storm=0;
      this.phase='playing';this.time=0;this.realTime=0;this.events=[];this.hitstop=0;this.slowTimer=0;
      this.endAge=0;this.ritualAge=0;this.introAge=0;this.storyStep=-1;this.attackSerial=0;
      this.score=0;this.hits=0;this.parries=0;this.chain=0;this.chainAge=0;this.bestChain=0;this.hazards=[];
      this.pits=PITS.map(p=>Object.assign({},p,{cleared:p.chapter<this.chapter}));
      this.traps=TRAPS.map(t=>Object.assign({},t,{cleared:t.chapter<this.chapter,lastHitCycle:-1,lastPhase:'hidden'}));
      this.crow={x:1790,y:294,hp:this.chapter>0?0:82,maxHp:82,active:false,defeated:this.chapter>0,
        phase:this.chapter>0?'gone':'perch',t:0,dir:-1,flashes:0,hitSerial:-1,attackUsed:false,cycles:0};
      this.falls=0;this.pitScene=null;
      this.prompt='天羽々斬を抜き、出雲の闇を祓え。';this.storyCue=-1;this.distance=this.player.x;
      this.emit('chapter',{chapter:this.chapter});
      if(this.chapter===0)this.emit('story',{speaker:'出雲の地',text:'高天原を去った須佐之男命。哭き声のする森で、櫛名田比売と出会う。',duration:7});
    }
    emit(type,data={}){this.events.push(Object.assign({type,time:this.time},data));}
    drainEvents(){return this.events.splice(0);}
    action(f,name){if(f.action!==name||MOVES[name]){f.action=name;f.t=0;}}
    face(f,dir){
      if(dir===f.dir)return;f.turnFrom=f.dir;f.dir=dir;f.turnAge=0;
      f.walk=(GAIT.stance-.5)*Math.PI*2-f.walk;
    }
    free(f){return ['idle','walk','guard','crouch','jump'].includes(f.action);}
    enemy(){return this.enemies.filter(e=>!e.defeated&&e.chapter===this.chapter).sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x))[0]||null;}
    targetHead(){return this.boss.heads.find(h=>['warn','strike','open'].includes(h.phase))||null;}
    pitAt(x){return this.pits.find(p=>x>p.x&&x<p.x+p.width)||null;}
    request(f,name){
      if(f.hp<=0||f.defeated)return false;
      if(!this.free(f)){
        const m=MOVES[f.action];if(m&&f.t>m.duration*.27){f.buffer=name;f.bufferTime=.36;}return false;
      }
      if(name==='jump'){
        if(Math.abs(f.y)>1||this.pitAt(f.x)||f.stamina<10)return false;f.vy=640;f.stamina-=10;this.action(f,'jump');
        this.emit('jump',{x:f.x,team:f.team});return true;
      }
      if(name==='dodge'){
        if(Math.abs(f.y)>1||this.pitAt(f.x)||f.stamina<22)return false;f.stamina-=22;f.invincible=.34;f.vx=f.dir*570;
        this.action(f,'dodge');this.emit('dodge',{x:f.x,dir:f.dir,team:f.team});return true;
      }
      if(name==='storm'){
        if(f.team!=='player'||this.storm<100)return false;
      }
      if(name==='slash'){
        if(f.y>22)name='airslash';
        else{const next=f.comboTimer>0?f.combo%3:0;name=['slash','reverse','cleave'][next];f.combo=next+1;f.comboTimer=1.25;}
      }
      if(name==='iai'&&f.y>22)name='airslash';
      const m=MOVES[name];if(!m||f.stamina<m.cost)return false;
      if(name==='storm')this.storm=0;
      f.stamina-=m.cost;f.hitUsed=false;f.effectUsed=false;f.attacks++;f.serial=++this.attackSerial;f.guarding=false;if(f.y<=1)f.vx=0;
      this.action(f,name);this.emit('swing',{x:f.x,dir:f.dir,move:name,team:f.team});return true;
    }
    controls(f,input,dt){
      if(input.guard&&this.free(f)&&f.y<1){if(!f.guarding)f.guardAge=0;f.guarding=true;this.action(f,'guard');}
      else f.guarding=false;
      if(input.jump)this.request(f,'jump');if(input.dodge)this.request(f,'dodge');
      if(input.slash)this.request(f,'slash');if(input.iai)this.request(f,'iai');if(input.storm)this.request(f,'storm');
      if(this.free(f)){
        const move=(input.right?1:0)-(input.left?1:0),speed=f.guarding?72:input.down?94:248;
        const previous=f.vx,desired=move*speed,airborne=f.y>1||f.vy>0;
        if(airborne)f.vx+=(desired-f.vx)*Math.min(1,dt*17);
        else{
          const reversing=move&&f.vx*move<0,rate=reversing?1940:move?1180:1760;
          f.vx+=clamp(desired-f.vx,-rate*dt,rate*dt);
        }
        f.accel=dt>0?(f.vx-previous)/dt:0;
        if(move&&!f.guarding&&move!==f.dir&&(airborne||Math.abs(f.vx)<24||f.vx*move>=0)){
          // Exchange the legs without changing either foot's world contact point.
          this.face(f,move);
        }
        if(f.y>1)this.action(f,'jump');else if(f.guarding)this.action(f,'guard');
        else if(input.down)this.action(f,'crouch');else this.action(f,Math.abs(f.vx)>12?'walk':'idle');
      }
    }
    updateFighter(f,dt){
      f.t+=dt;f.guardAge+=dt;f.invincible=Math.max(0,f.invincible-dt);f.flashes=Math.max(0,f.flashes-dt);
      f.wound=Math.max(0,f.wound-dt);f.scorch=Math.max(0,f.scorch-dt);f.burnTimer=Math.max(0,f.burnTimer-dt);
      f.turnAge+=dt;f.landingAge+=dt;
      if(f.action==='storm'&&f.t>.43&&!f.effectUsed){f.effectUsed=true;this.emit('lightning',{x:f.x+f.dir*200,y:140,team:f.team});}
      f.comboTimer=Math.max(0,f.comboTimer-dt);f.bufferTime=Math.max(0,f.bufferTime-dt);if(!f.bufferTime)f.buffer=null;
      const m=MOVES[f.action];if(m&&f.t>=m.duration)this.action(f,f.y>1?'jump':'idle');
      if(f.action==='dodge'){f.vx=f.dir*570*Math.max(0,1-f.t/.40);if(f.t>.40)this.action(f,'idle');}
      const recovery={hit:.4,stunned:.72,trapHit:.62,burned:.64,recover:.48}[f.action];
      if(recovery&&f.t>recovery)this.action(f,f.y>1?'jump':'idle');
      if(f.buffer&&this.free(f)){const next=f.buffer;f.buffer=null;this.request(f,next);}
      if(f.defeated){f.deadAge+=dt;f.vx*=Math.exp(-dt*8);}
      else if(MOVES[f.action]&&f.y<=1||['hit','stunned','trapHit','burned','recover'].includes(f.action))f.vx*=Math.exp(-dt*10);
      if(!f.defeated)f.stamina=Math.min(100,f.stamina+dt*(MOVES[f.action]?5:f.action==='guard'?18:28));
      const previousX=f.x,previousPit=this.pitAt(f.x);
      f.x+=f.vx*dt;f.walk+=f.vx*f.dir*dt/GAIT.cycle*Math.PI*2;
      if(Math.abs(f.vx)>65&&f.y<1&&f.action==='walk'){
        const foot=Math.floor(f.walk/Math.PI);if(foot!==f.footPhase){f.footPhase=foot;this.emit('step',{x:f.x,team:f.team});}
      }
      let pit=this.pitAt(f.x);
      if(f.y< -5&&!pit&&previousPit){f.x=previousX;f.vx=0;pit=previousPit;}
      if(f.y>0||f.vy>0||pit||f.y<0){
        f.vy-=1550*dt;f.y+=f.vy*dt;
        if(!pit&&f.y<=0){f.landingSpeed=Math.max(0,-f.vy);f.landingAge=0;f.y=0;f.vy=0;
          if(this.free(f))this.action(f,Math.abs(f.vx)>12?'walk':'idle');
          this.emit('land',{x:f.x,team:f.team,impact:f.landingSpeed});}
      }
      if(pit&&f.y< -5&&!f.defeated){this.action(f,'fall');f.vx=0;}
      if(pit&&f.y< -235&&!f.defeated){
        if(f.team==='player'){
          this.falls++;const safe=f.safeX<pit.x+pit.width/2?pit.x-48:pit.x+pit.width+48;
          this.damagePlayer(28,{x:f.x,guardable:false,pit:true,hazard:'pit'});
          f.x=clamp(f.x,pit.x+pit.width*.42,pit.x+pit.width*.58);f.y=-235;f.vy=0;f.vx=0;
          f.buffer=null;f.bufferTime=0;this.action(f,'crumple');
          this.pitScene={age:0,duration:f.defeated?2.1:1.12,returnAt:.88,safeX:safe,pitId:pit.id,fatal:f.defeated,recovered:false};
          this.emit('pitFall',{x:f.x,y:f.y+43,dir:f.dir,groundY:f.y,team:'player',fatal:f.defeated});
          this.prompt='足元を見切れ。穴の手前で跳び、向こう岸へ。';
        }else{f.hp=0;f.defeated=true;f.deadAge=0;this.action(f,'dead');this.score+=450;this.emit('down',{x:f.x,team:'enemy',name:f.name});}
      }
      if(!pit&&Math.abs(f.y)<.5&&!f.defeated)f.safeX=f.x;
      f.x=clamp(f.x,95,6180);
    }
    enemyAI(e,dt){
      if(e.defeated||!e.active||e.chapter!==this.chapter)return;
      const p=this.player,dx=p.x-e.x,dist=Math.abs(dx),input={};if(this.free(e))this.face(e,dx>=0?1:-1);
      e.aiTimer-=dt;
      const m=MOVES[p.action];
      if(e.style==='ward'&&m&&p.action!=='iai'&&p.action!=='storm'&&p.t<m.active[1]&&dist<248&&e.aiChoice%3!==2)input.guard=true;
      else if(this.free(e)){
        if(dist>185)input[dx>=0?'right':'left']=true;
        if(dist<255&&e.aiTimer<=0&&e.stamina>30){e.aiChoice++;input[e.aiChoice%3===0?'iai':'slash']=true;
          e.aiTimer=({shade:.75,ward:.55,swift:.25,brute:.60}[e.style])+.10*Math.sin(e.aiChoice*2.7);}
      }
      this.controls(e,input,dt);if(this.free(e)&&!input.guard)e.vx*=e.style==='swift'?.82:.66;
    }
    damagePlayer(damage,source){
      const p=this.player;if(p.invincible>0&&!source.pit||p.defeated||this.pitScene&&!this.pitScene.recovered)return false;
      const fromRight=source.x>=p.x,dir=fromRight?-1:1;
      const canGuard=source.guardable!==false&&p.action==='guard'&&p.dir===(fromRight?1:-1)&&p.stamina>6;
      if(canGuard&&p.guardAge<.17){
        p.stamina=Math.min(100,p.stamina+12);this.storm=Math.min(100,this.storm+25);this.parries++;this.score+=120;this.hitstop=.1;
        this.emit('parry',{x:p.x+p.dir*42,y:p.y+135,dir:p.dir,team:'player'});
        if(source.fighter){this.action(source.fighter,'stunned');source.fighter.vx=-dir*85;}
        if(source.head)this.openHead(source.head,2.9);
        if(source.crow)this.openCrow(2.2);
        this.prompt='受け流し。崩れた刃先へ、反撃を。';return 'parry';
      }
      if(canGuard&&p.stamina>=19){
        p.stamina-=19;p.hp=Math.max(1,p.hp-2);p.vx=dir*80;this.hitstop=.045;
        this.emit('block',{x:p.x+p.dir*37,y:p.y+130,dir:p.dir,team:'player'});return 'block';
      }
      damage*=this.difficulty==='gentle'?.58:1;p.hp=Math.max(0,p.hp-damage);p.invincible=.34;p.guarding=false;
      const reaction=source.hazard==='spikes'?'trapHit':source.hazard==='flame'?'burned':'hit';
      p.vx=dir*(source.hazard?100:190);p.flashes=.16;this.action(p,p.hp<=0?'dead':reaction);this.hitstop=source.hazard?.10:.065;this.chain=0;
      p.buffer=null;p.bufferTime=0;
      if(source.hazard==='spikes'||source.hazard==='pit')p.wound=6;
      if(source.hazard==='flame'){p.scorch=6;p.burnTimer=.78;}
      this.emit('hurt',{x:p.x,y:p.y+(source.hazard==='spikes'?50:source.hazard==='flame'?75:120),dir,damage,team:'player',
        hazard:source.hazard,groundY:p.y,trapId:source.trapId});
      if(p.hp<=0){p.defeated=true;this.phase='falling';this.endAge=0;this.slowTimer=.9;this.emit('down',{x:p.x,team:'player'});}
      return 'hit';
    }
    hitEnemy(e,move){
      const p=this.player,m=MOVES[move];if(e.defeated||e.invincible>0)return;
      p.hitUsed=true;
      const guarded=e.action==='guard'&&e.dir===-p.dir&&e.stamina>15&&move!=='iai'&&move!=='storm';
      if(guarded){e.stamina-=18;e.hp=Math.max(1,e.hp-3);this.emit('block',{x:e.x-p.dir*30,y:e.y+137,dir:p.dir,team:'enemy'});this.hitstop=.045;return;}
      e.hp=Math.max(0,e.hp-m.damage);e.invincible=.17;e.vx=p.dir*m.push*4;e.flashes=.16;e.guarding=false;
      this.action(e,e.hp<=0?'dead':'hit');this.addHit(m.damage);
      this.emit('hit',{x:e.x-p.dir*25,y:e.y+133,dir:p.dir,move,damage:m.damage,team:'player',ko:e.hp<=0});
      this.hitstop=e.hp<=0?.11:.07;
      if(e.hp<=0){e.defeated=true;e.deadAge=0;this.slowTimer=.65;this.score+=450;this.emit('down',{x:e.x,team:'enemy',name:e.name});
        this.prompt='穢れは散った。櫛名田の待つ道を進め。';}
    }
    addHit(damage){this.hits++;this.score+=Math.round(damage*10);this.storm=Math.min(100,this.storm+12);this.chain++;this.chainAge=1.65;this.bestChain=Math.max(this.bestChain,this.chain);}
    updateTerrain(){
      const p=this.player;if(this.phase!=='playing')return;
      for(const pit of this.pits){
        if(pit.chapter!==this.chapter)continue;
        if(!pit.cleared&&p.x>pit.x+pit.width+15){pit.cleared=true;this.score+=120;this.emit('obstacleClear',{x:pit.x+pit.width,kind:'pit'});}
        if(p.x>pit.x-190&&p.x<pit.x+pit.width&&p.y>=0)this.prompt='落とし穴 — 手前で Space / ↑。空中でも左右へ。';
      }
      for(const trap of this.traps){
        if(trap.chapter!==this.chapter)continue;
        const state=trapState(trap,this.time);
        if(state.phase!==trap.lastPhase&&state.phase==='active'&&Math.abs(p.x-trap.x)<650)this.emit('trap',{x:trap.x+trap.width/2,kind:trap.type});
        trap.lastPhase=state.phase;
        if(state.phase==='active'&&p.x>trap.x&&p.x<trap.x+trap.width&&p.y<trap.height&&trap.lastHitCycle!==state.cycle){
          const hit=this.damagePlayer(trap.type==='flame'?24:20,{x:trap.x+trap.width/2,guardable:false,hazard:trap.type,trapId:trap.id});
          if(hit)trap.lastHitCycle=state.cycle;
        }
        if(!trap.cleared&&p.x>trap.x+trap.width+20){trap.cleared=true;this.score+=90;this.emit('obstacleClear',{x:trap.x+trap.width,kind:trap.type});}
        if(p.x>trap.x-180&&p.x<trap.x+trap.width&&p.y>=0)this.prompt=trap.type==='flame'?'呪炎 — 赤い紋が光ったら、跳んで越えよ。':'竹の牙 — 穂先の予兆を見て、跳び越えよ。';
      }
    }
    openCrow(duration=1.6){
      const c=this.crow;if(c.defeated)return;c.phase='open';c.t=0;c.openDuration=duration;c.openX=clamp(this.player.x+160,1650,1840);c.attackUsed=true;
    }
    hitCrow(move){
      const c=this.crow,p=this.player,m=MOVES[move];if(c.defeated||c.hitSerial===p.serial)return false;
      c.hitSerial=p.serial;p.hitUsed=true;c.hp=Math.max(0,c.hp-m.damage);c.flashes=.2;this.addHit(m.damage);this.hitstop=.06;
      this.emit('crowHit',{x:c.x,y:c.y,dir:p.dir,move,team:'player',ko:c.hp<=0});
      if(c.hp<=0){c.defeated=true;c.phase='retreat';c.t=0;this.score+=550;this.emit('crowRepelled',{x:c.x,y:c.y});this.prompt='黒羽は去った。祠へ続く道が、開く。';}
      else this.openCrow(1.35);return true;
    }
    updateCrow(dt){
      const c=this.crow,p=this.player;c.t+=dt;c.flashes=Math.max(0,c.flashes-dt);
      if(c.phase==='gone')return;
      if(c.phase==='retreat'){c.dir=1;c.x+=dt*270;c.y+=dt*180;if(c.t>2.4)c.phase='gone';return;}
      if(!c.active){
        if(this.chapter!==0||p.x<1660||this.enemy())return;
        c.active=true;c.phase='circle';c.t=0;c.cycles=0;
        this.emit('crowEncounter',{x:c.x,name:'禍つ黒羽'});this.emit('story',{speaker:'禍つ黒羽',text:'一羽のカラスが道を塞ぐ。羽ばたきの予兆を見切り、低く舞う隙を斬れ。',duration:4.5});
        this.prompt='黒羽の急降下を受け流し、低く飛ぶ隙を斬れ。';
      }
      let tx=p.x+185,ty=282+Math.sin(this.time*4)*22;
      if(c.phase==='circle'&&c.t>1.05){c.phase='warn';c.t=0;c.targetX=p.x;c.cycles++;this.emit('crowWarning',{x:c.x,y:c.y});}
      if(c.phase==='warn'){
        tx=c.targetX+210;ty=285+Math.sin(c.t*11)*9;
        if(c.t>.8){c.phase='dive';c.t=0;c.attackUsed=false;this.emit('crowDive',{x:c.x,y:c.y});}
      }
      if(c.phase==='dive'){
        tx=c.targetX-75;ty=120;
        if(c.t>.16&&!c.attackUsed){c.attackUsed=true;if(Math.abs(p.x-c.targetX)<128&&p.y<160)this.damagePlayer(18,{x:c.x,crow:c});}
        if(c.phase==='dive'&&c.t>.38)this.openCrow(1.7);
      }
      if(c.phase==='open'){
        tx=c.openX;ty=124+Math.sin(c.t*8)*9;
        if(c.t>c.openDuration){c.phase='recover';c.t=0;}
      }
      if(c.phase==='recover'&&c.t>.65){c.phase='circle';c.t=0;}
      const rate=c.phase==='dive'?20:c.phase==='open'?7:4;
      c.x+=(tx-c.x)*(1-Math.exp(-dt*rate));c.y+=(ty-c.y)*(1-Math.exp(-dt*rate));c.dir=p.x<c.x?-1:1;
      const m=MOVES[p.action],dx=c.x-p.x;
      if(m&&!p.hitUsed&&p.t>=m.active[0]&&p.t<=m.active[1]&&dx*p.dir>0&&Math.abs(dx)<m.range&&Math.abs(c.y-(p.y+130))<105)this.hitCrow(p.action);
    }
    athleticInput(){
      const p=this.player;if(p.y< -1)return {};
      const obstacle=[...this.pits,...this.traps].filter(a=>a.chapter===this.chapter&&p.x>a.x-100&&p.x<a.x+a.width+30).sort((a,b)=>a.x-b.x)[0];
      if(!obstacle)return null;
      const takeoff=obstacle.type==='flame'?55:42;
      const input={right:true};if(p.y<1&&this.free(p)&&p.x>obstacle.x-takeoff&&p.x<obstacle.x&&p.stamina>=10)input.jump=true;
      const enemy=this.enemy(),attack=enemy&&MOVES[enemy.action];
      if(!obstacle.type&&p.x>obstacle.x+obstacle.width-20&&p.y<1&&attack&&enemy.x>p.x&&enemy.x-p.x<attack.range+35&&enemy.t>=attack.active[0]-.11&&enemy.t<attack.active[1])input.guard=true;
      return input;
    }
    hitHead(h,move){
      const p=this.player;if(h.hp<=0||h.hitSerial===p.serial)return;
      const m=MOVES[move];h.hitSerial=p.serial;p.hitUsed=true;h.hp=Math.max(0,h.hp-m.damage);h.flashes=.2;this.addHit(m.damage);
      this.hitstop=h.hp<=0?.13:.085;
      this.emit('hit',{x:h.x,y:h.y,dir:p.dir,move,damage:m.damage,team:'player',ko:h.hp<=0,boss:true});
      if(h.hp<=0){h.phase='down';h.deadAge=0;this.slowTimer=1;this.score+=800;
        this.emit('headDown',{id:h.id,x:h.x,y:h.y,name:h.name});
        const living=this.boss.heads.filter(a=>a.hp>0).length;
        this.prompt='残る首、'+living+'。赤い瞳の動きを見切れ。';
        this.player.hp=Math.min(this.player.maxHp,this.player.hp+7);
        if(!living){this.boss.defeated=true;this.phase='ending';this.endAge=0;this.storyStep=-1;this.hazards=[];p.invincible=1000;this.action(p,'sheathe');this.emit('bossDown',{x:h.x,y:h.y});}
        else{this.boss.cooldown=.7;this.boss.phase='idle';this.boss.telegraph=null;
          if(living<=4&&!this.boss.enraged){this.boss.enraged=true;this.emit('enrage');}}
      }
    }
    openHead(h,duration=2.15){
      if(h.hp<=0)return;h.phase='open';h.t=0;h.openDuration=duration;this.boss.phase='open';this.boss.telegraph=null;
      h.openX=clamp(this.player.x+190,4910,5510);h.openY=132;this.emit('opening',{id:h.id});
    }
    beginBoss(){
      this.phase='bossIntro';this.introAge=0;this.boss.active=true;this.action(this.player,'ready');this.player.vx=0;
      this.emit('bossIntro');this.emit('story',{speaker:'八岐大蛇',text:'赤い瞳が、八つ。山を覆う蛇が、八塩折の酒に首を沈める。',duration:6});
    }
    updateBoss(dt){
      const b=this.boss,p=this.player;
      for(const h of b.heads){
        h.t+=dt;h.flashes=Math.max(0,h.flashes-dt);
        if(h.hp<=0){h.deadAge+=dt;h.y=Math.max(-30,h.y-dt*(60+h.deadAge*80));continue;}
        let tx=h.restX+Math.sin(this.time*.85+h.id)*13,ty=h.restY+Math.sin(this.time*1.3+h.id*.81)*13;
        if(h.phase==='warn'){
          const progress=clamp(h.t/h.warning,0,1);tx=h.restX+(h.targetX+200-h.restX)*progress*.37;ty=h.restY+((h.attack==='sweep'?58:155)-h.restY)*progress*.40;
          if(h.t>=h.warning){h.phase='strike';h.t=0;h.strikeUsed=false;this.emit('bossAttack',{id:h.id,attack:h.attack,x:h.x,y:h.y});}
        }
        if(h.phase==='strike'){
          tx=h.targetX+(h.attack==='sweep'?60:74);ty=h.attack==='sweep'?30:128;
          if(h.t>=.13&&!h.strikeUsed){
            h.strikeUsed=true;
            if(h.attack==='venom'){
              const startX=clamp(h.targetX+240,4940,5610);
              this.hazards.push({x:startX,y:18,vx:-385,life:2.8,hit:false,id:h.id});
              if(b.enraged)this.hazards.push({x:startX+185,y:18,vx:-385,life:3.1,hit:false,id:h.id});
              this.emit('venom',{x:startX,y:30});
            }else{
              const inRange=Math.abs(p.x-h.targetX)<(h.attack==='sweep'?210:175),low=h.attack==='sweep';
              if(inRange&&(low?p.y<70:p.y<104))this.damagePlayer(b.enraged?28:23,{x:h.x,head:h,guardable:!low});
            }
          }
          if(h.phase==='strike'&&h.t>.47)this.openHead(h,b.enraged?2.10:2.5);
        }
        if(h.phase==='open'){
          tx=h.openX;ty=h.openY+Math.sin(h.t*3)*7;
          if(h.t>h.openDuration){h.phase='return';h.t=0;b.phase='idle';b.cooldown=.85;}
        }
        if(h.phase==='return'&&h.t>.7){h.phase='idle';h.t=0;}
        const rate=h.phase==='strike'?24:h.phase==='open'?5:3.7;
        h.x+=(tx-h.x)*(1-Math.exp(-dt*rate));h.y+=(ty-h.y)*(1-Math.exp(-dt*rate));
      }
      if(b.phase==='idle'||b.phase==='dormant'){
        b.cooldown-=dt;
        if(b.cooldown<=0){
          let h;for(let n=0;n<8;n++){const id=(b.index+n)%8;if(b.heads[id].hp>0){h=b.heads[id];b.index=(id+1)%8;break;}}
          if(h){h.phase='warn';h.t=0;h.warning=b.enraged?.83:1.08;h.targetX=p.x;h.targetY=p.y;b.phase='warn';b.cycles++;
            b.telegraph={id:h.id,attack:h.attack,x:h.targetX,age:0,duration:h.warning};
            this.emit('warning',{id:h.id,attack:h.attack,name:h.name});}
        }
      }
      if(b.telegraph)b.telegraph.age+=dt;
    }
    autoPlayer(){
      const p=this.player,input={};
      if(!this.boss.active){const athletic=this.athleticInput();if(athletic)return athletic;}
      if(this.crow.active&&!this.crow.defeated){
        const c=this.crow,dx=c.x-p.x;this.face(p,dx>=0?1:-1);
        if(c.phase==='warn'||c.phase==='dive'){
          if(c.phase==='dive'&&c.t>.03)input.guard=true;return input;
        }
        if(c.phase==='open'){
          if(Math.abs(dx)>245)input[dx>0?'right':'left']=true;
          else if(this.free(p)&&p.stamina>14)input.slash=true;
        }return input;
      }
      if(this.chapter===1&&!this.enemy()&&!this.offering){
        if(Math.abs(p.x-3650)<115)input.interact=true;else input.right=true;return input;
      }
      if(this.boss.active&&this.phase==='playing'){
        const h=this.targetHead();this.face(p,1);
        const wave=this.hazards.find(a=>a.life>0&&a.x-p.x<165&&a.x-p.x>-50);
        if(wave){if(p.y<1)input.jump=true;if(p.y>20&&h&&h.phase==='open'&&this.free(p))input.slash=true;return input;}
        if(!h){if(p.x<4930)input.right=true;return input;}
        if(h.phase==='warn'||h.phase==='strike'){
          if(h.attack==='sweep'){if(h.t>h.warning-.28&&h.phase==='warn'&&p.y<1)input.jump=true;}
          else if(h.attack==='bite'){
            input.guard=h.phase==='strike'&&h.t>=.035;
          }return input;
        }
        if(h.phase==='open'){
          const gap=h.x-p.x;if(gap>235)input.right=true;else if(gap<115)input.left=true;
          if(this.storm>=100&&this.free(p)&&gap<420)input.storm=true;
          else if(this.free(p)&&gap<283&&p.stamina>33)input.iai=true;
          else if(this.free(p)&&gap<220&&p.stamina>14)input.slash=true;
          return input;
        }
        return input;
      }
      const e=this.enemy();if(!e||Math.abs(e.x-p.x)>380){input.right=true;return input;}
      const gap=e.x-p.x,dist=Math.abs(gap);this.face(p,gap>=0?1:-1);
      const incoming=MOVES[e.action];
      if(incoming&&e.t<incoming.active[1]&&dist<312){input.guard=e.t>=incoming.active[0]-.10;return input;}
      if(p.stamina<27&&dist<285){input.guard=true;return input;}
      if(dist>210)input[gap>=0?'right':'left']=true;
      if(this.free(p)&&dist<282&&p.stamina>30){
        if(e.action==='guard'||p.attacks%3===2)input.iai=true;
        else if(dist<220)input.slash=true;
        else input.iai=true;
      }
      if(this.storm>=100&&this.free(p)&&dist<330)input.storm=true;
      return input;
    }
    interact(){
      if(this.chapter!==1||this.offering||this.enemy()||Math.abs(this.player.x-3650)>145||this.player.y>1)return false;
      this.phase='ritual';this.ritualAge=0;this.player.vx=0;this.action(this.player,'ritual');
      this.emit('ritual');this.emit('story',{speaker:'須佐之男命',text:'八つの門に、八つの酒槽。八塩折の酒で、大蛇を誘おう。',duration:5});return true;
    }
    tick(realDt,input={}){
      realDt=clamp(realDt,0,.05);this.realTime+=realDt;
      if(this.phase==='won'){this.player.t+=realDt;return;}
      if(this.phase==='lost')return;
      if(this.pitScene){
        const s=this.pitScene,p=this.player;s.age+=realDt;
        if(this.hitstop>0)this.hitstop=Math.max(0,this.hitstop-realDt);
        else p.t+=realDt*(s.age<.35?.55:1);
        if(!s.fatal&&!s.recovered&&s.age>=s.returnAt){
          s.recovered=true;p.x=s.safeX;p.safeX=s.safeX;p.y=0;p.vx=0;p.vy=0;p.invincible=.85;p.flashes=0;
          this.action(p,'recover');this.emit('pitReturn',{x:p.x});
        }
        if(s.age>=s.duration){
          if(s.fatal){this.phase='lost';this.emit('lost');}
          else this.pitScene=null;
        }
        return;
      }
      if(this.phase==='ending'){
        this.endAge+=realDt;this.player.t+=realDt;this.boss.endingAge=this.endAge;
        if(this.player.y>0){this.player.vy-=1550*realDt;this.player.y=Math.max(0,this.player.y+this.player.vy*realDt);if(!this.player.y)this.player.vy=0;}
        for(const h of this.boss.heads){h.deadAge+=realDt;h.y=Math.max(-80,h.y-realDt*90);}
        const step=this.endAge<3?0:this.endAge<6.5?1:this.endAge<10?2:3;
        if(step!==this.storyStep){this.storyStep=step;
          const lines=[['八岐大蛇','八つの首は、ついに静まった。出雲を覆った穢れが、朝霧へと還る。'],
            ['天叢雲剣','大蛇の尾から、一振りの剣が現れた。のちに草薙剣と呼ばれる、神の剣。'],
            ['須佐之男命','この剣は、天照大御神へ。櫛名田よ、新たな宮を結ぼう。'],
            ['八雲立つ','出雲の地に、八重垣を。護るための太刀は、静かに鞘へ帰る。']];
          this.emit('story',{speaker:lines[step][0],text:lines[step][1],duration:4});
        }
        if(this.endAge>13.6){this.phase='won';this.emit('won');}return;
      }
      if(this.phase==='ritual'){
        this.ritualAge+=realDt;this.player.t+=realDt;
        if(this.ritualAge>=3.6){this.offering=true;this.phase='playing';this.player.hp=this.player.maxHp;this.player.stamina=100;
          this.action(this.player,'idle');this.emit('offering');this.prompt='八つの酒槽を満たした。大蛇の淵へ向かえ。';}return;
      }
      if(this.phase==='bossIntro'){
        this.introAge+=realDt;this.player.t+=realDt;
        if(this.introAge>3.2){this.phase='playing';this.action(this.player,'idle');this.boss.phase='idle';this.boss.cooldown=.5;
          this.emit('bossStart');this.prompt='予兆を見切り、低く降りた首を斬れ。';}return;
      }
      if(this.hitstop>0){this.hitstop-=realDt;return;}
      if(this.slowTimer>0)this.slowTimer-=realDt;const dt=realDt*(this.slowTimer>0?.43:1);
      this.time+=dt;this.chainAge-=dt;if(this.chainAge<=0)this.chain=0;
      const p=this.player;
      if(this.phase==='falling'){
        this.endAge+=realDt;this.updateFighter(p,dt);if(this.endAge>2.2){this.phase='lost';this.emit('lost');}return;
      }
      const controls=this.demo?this.autoPlayer():input;
      if(controls.interact&&this.interact())return;
      this.controls(p,controls,dt);
      for(const e of this.enemies){
        if(!e.defeated&&e.chapter===this.chapter&&Math.abs(e.x-p.x)<540&&!e.active){e.active=true;this.emit('encounter',{name:e.name});}
        this.enemyAI(e,dt);
      }
      this.updateFighter(p,dt);
      if(this.pitScene)return;
      for(const e of this.enemies){
        this.updateFighter(e,dt);if(e.defeated||e.chapter!==this.chapter)continue;
        const dx=e.x-p.x;if(Math.abs(dx)<68&&Math.abs(e.y-p.y)<70&&p.invincible<=0){const d=(68-Math.abs(dx))*(dx>=0?1:-1)/2;e.x+=d;p.x-=d;}
        const m=MOVES[p.action],n=MOVES[e.action];
        if(m&&!p.hitUsed&&p.t>=m.active[0]&&p.t<=m.active[1]&&(e.x-p.x)*p.dir>0&&Math.abs(dx)<m.range&&Math.abs(e.y-p.y)<120)this.hitEnemy(e,p.action);
        if(n&&!e.hitUsed&&e.t>=n.active[0]&&e.t<=n.active[1]&&(p.x-e.x)*e.dir>0&&Math.abs(e.x-p.x)<n.range&&Math.abs(e.y-p.y)<110){
          e.hitUsed=true;this.damagePlayer(e.action==='iai'?31:e.action==='cleave'?27:19,{x:e.x,fighter:e});}
      }
      this.updateTerrain();
      if(this.phase==='playing')this.updateCrow(dt);
      if(this.boss.active){
        p.x=clamp(p.x,4710,5360);this.updateBoss(dt);
        const m=MOVES[p.action];
        if(m&&!p.hitUsed&&p.t>=m.active[0]&&p.t<=m.active[1]){
          const candidates=this.boss.heads.filter(h=>h.hp>0&&['open','strike'].includes(h.phase)&&(h.x-p.x)*p.dir>0&&Math.abs(h.x-p.x)<m.range&&Math.abs(h.y-(p.y+130))<145);
          if(candidates.length)this.hitHead(candidates[0],p.action);
        }
      }
      if(!this.hazards)this.hazards=[];
      for(const h of this.hazards){h.x+=h.vx*dt;h.life-=dt;if(!h.hit&&Math.abs(h.x-p.x)<58&&p.y<68){
        h.hit=true;this.damagePlayer(26,{x:h.x+50,guardable:false});}}
      this.hazards=this.hazards.filter(h=>h.life>0);
      const remaining=this.enemies.filter(e=>!e.defeated&&e.chapter===this.chapter);
      const boundary=CHAPTERS[this.chapter].end;
      if(this.chapter<2){
        if((remaining.length||this.chapter===0&&!this.crow.defeated)&&p.x>boundary-100){p.x=boundary-100;this.prompt=remaining.length?'この道の穢れを祓い、先へ。':'カラスの急降下を見切り、低く舞う隙を斬れ。';}
        else if(this.chapter===1&&!this.offering&&p.x>3760){p.x=3760;this.prompt='酒槽に八塩折の酒を捧げる — E / F';}
        else if(!remaining.length&&p.x>boundary){
          this.chapter++;p.hp=Math.min(p.maxHp,p.hp+42);p.stamina=100;this.comb=true;
          this.emit('chapter',{chapter:this.chapter});this.emit('heal',{x:p.x});
          if(this.chapter===1)this.emit('story',{speaker:'櫛名田比売',text:'その誓いを、信じます。彼女は櫛へと姿を変え、須佐之男の髪に宿った。',duration:7});
          this.prompt=this.chapter===1?'祠の穢れを祓い、八塩折の酒を捧げよ。':'荒魂を携え、八岐大蛇の淵へ。';
        }
      }
      if(this.chapter===0&&p.x>490&&this.storyCue<0){this.storyCue=0;this.emit('story',{speaker:'櫛名田比売',text:'八岐大蛇は、毎年ひとりを喰らう。最後に残ったのが、私です。',duration:6});}
      if(this.chapter===2&&p.x>=4880&&!this.boss.active){this.hazards=[];this.beginBoss();}
      this.distance=Math.max(this.distance,p.x);
    }
    snapshot(){return {phase:this.phase,chapter:this.chapter,time:this.time,score:this.score,hits:this.hits,parries:this.parries,
      storm:this.storm,offering:this.offering,comb:this.comb,falls:this.falls,player:{x:this.player.x,y:this.player.y,hp:this.player.hp,stamina:this.player.stamina,action:this.player.action},
      crow:{hp:this.crow.hp,defeated:this.crow.defeated,active:this.crow.active,phase:this.crow.phase,cycles:this.crow.cycles},
      terrain:{pits:this.pits.map(a=>({id:a.id,cleared:a.cleared})),traps:this.traps.map(a=>({id:a.id,type:a.type,cleared:a.cleared}))},
      enemies:this.enemies.map(e=>({hp:e.hp,defeated:e.defeated,x:e.x})),boss:{active:this.boss.active,phase:this.boss.phase,enraged:this.boss.enraged,
        heads:this.boss.heads.map(h=>({id:h.id,hp:h.hp,phase:h.phase,x:h.x,y:h.y}))}};}
  }
  const API={Saga,MOVES,CHAPTERS,ENEMIES,HEAD_NAMES,GAIT,PITS,TRAPS,trapState,clamp};root.YakumoEngine=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
