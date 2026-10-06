'use strict';
const assert=require('node:assert/strict');
const {Saga,MOVES,GAIT,trapState}=require('./engine.js');
const {Animator,target,gait}=require('./animation.js');
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.tick(1/60,input);};
function duel(){const g=new Saga();g.player.x=680;g.enemies[0].x=872;for(const e of g.enemies)e.aiTimer=999;return g;}

// Swords have windup, a single active hit, and finite range.
{
  const g=duel(),e=g.enemies[0];g.request(g.player,'slash');tick(g,8);assert.equal(e.hp,100);
  tick(g,14);assert.equal(e.hp,100-MOVES.slash.damage);tick(g,20);assert.equal(e.hp,74);
  const h=duel();h.enemies[0].x=1370;h.request(h.player,'slash');tick(h,38);assert.equal(h.enemies[0].hp,100);
}
// Recovery input connects the three distinct cuts; iai breaks an enemy guard.
{
  const g=duel();g.enemies[0].x=1300;g.request(g.player,'slash');tick(g,21);g.request(g.player,'slash');tick(g,16);assert.equal(g.player.action,'reverse');
  tick(g,23);g.request(g.player,'slash');tick(g,18);assert.equal(g.player.action,'cleave');
  const h=duel(),e=h.enemies[0];e.action='guard';e.dir=-1;h.hitEnemy(e,'iai');assert.equal(e.hp,42);
}
// Direction matters when blocking. Timed defence opens a serpent's head.
{
  const g=new Saga({checkpoint:2}),p=g.player,h=g.boss.heads[0];
  p.dir=1;g.controls(p,{guard:true},1/60);p.guardAge=.09;
  g.damagePlayer(23,{x:p.x+110,head:h});assert.equal(p.hp,160);assert.equal(g.parries,1);assert.equal(h.phase,'open');assert.equal(g.storm,25);
  p.guardAge=.8;g.damagePlayer(23,{x:p.x+110});assert.equal(p.hp,158);
  p.dir=-1;p.invincible=0;g.damagePlayer(23,{x:p.x+110});assert.equal(p.hp,135);
}
// Invulnerable dodge and jump evade their hazards. Guard cannot stop venom.
{
  const g=new Saga({checkpoint:2}),p=g.player;g.request(p,'dodge');g.damagePlayer(25,{x:p.x+110,guardable:false});assert.equal(p.hp,160);
  p.action='idle';p.invincible=0;p.y=88;g.hazards=[{x:p.x,y:18,vx:0,life:2,hit:false}];tick(g,1);assert.equal(p.hp,160);
  p.y=0;p.vy=0;p.action='guard';p.dir=1;tick(g,1,{guard:true});assert.equal(p.hp,134);
}
// A rejected divine attack must preserve the charged spirit meter.
{
  const g=new Saga();g.storm=100;g.player.stamina=1;assert.equal(g.request(g.player,'storm'),false);assert.equal(g.storm,100);
  g.player.stamina=100;assert.equal(g.request(g.player,'storm'),true);assert.equal(g.storm,0);
}
// All eight heads have independent health. One attack cannot hit the same head twice.
{
  const g=new Saga({checkpoint:2});g.player.x=4885;g.beginBoss();tick(g,197);
  const h=g.boss.heads[0];g.openHead(h,3);const others=g.boss.heads.slice(1).map(h=>h.hp);
  g.request(g.player,'iai');tick(g,33);assert.equal(h.hp,h.maxHp-58);assert.deepEqual(g.boss.heads.slice(1).map(h=>h.hp),others);
  g.hitHead(h,'iai');assert.equal(h.hp,h.maxHp-58);
  for(let n=0;n<65&&!g.free(g.player);n++)tick(g,1);
  assert(g.request(g.player,'iai'));tick(g,33);assert.equal(h.hp,0);assert.equal(h.phase,'down');assert.equal(g.boss.heads.filter(h=>h.hp<=0).length,1);
}
// The offering is playable, guarded by the chapter's enemies, and cannot be skipped.
{
  const g=new Saga({checkpoint:1});g.player.x=3650;assert.equal(g.interact(),false);
  g.enemies.forEach(e=>e.defeated=true);g.player.x=3900;tick(g,1);assert.equal(g.chapter,1);assert.equal(g.player.x,3760);
  assert.equal(g.interact(),true);tick(g,218);assert.equal(g.offering,true);assert.equal(g.phase,'playing');
  g.player.x=3861;tick(g,1);assert.equal(g.chapter,2);
  const retry=new Saga({checkpoint:2});assert(retry.offering&&retry.comb);assert(retry.enemies.every(e=>e.defeated));assert(retry.boss.heads.every(h=>h.hp===h.maxHp));
}
// The entire unmodified story, including rituals, eight heads and landing after the final cut.
{
  function play(difficulty){const g=new Saga({demo:true,difficulty});for(let i=0;i<25000&&!['won','lost'].includes(g.phase);i++)g.tick(1/60);
    assert.equal(g.phase,'won');assert(g.offering&&g.comb);assert(g.enemies.every(e=>e.defeated));assert(g.boss.heads.every(h=>h.hp===0));assert(g.parries>0);assert.equal(g.player.y,0);
    assert(g.crow.defeated&&g.crow.cycles>0);assert.equal(g.falls,0);assert(g.pits.every(a=>a.cleared));assert(g.traps.every(a=>a.cleared));return g.snapshot();}
  const a=play('normal');assert.deepEqual(play('normal'),a);assert(play('gentle').player.hp>a.player.hp);
}
// A stance foot stays at its world contact point when moving in either direction.
{
  for(const [dir,vx] of [[1,248],[-1,-248],[1,-100]]){
    const g=new Saga(),p=g.player;p.x=350;p.dir=dir;p.vx=vx;p.action='walk';p.walk=Math.PI*.48;
    const before=target(p,0),world=p.x+before.ffx*dir*GAIT.scale;
    g.updateFighter(p,1/60);const after=target(p,1/60);
    assert.equal(before.ffy,-2);assert.equal(after.ffy,-2);
    assert(Math.abs(p.x+after.ffx*dir*GAIT.scale-world)<1e-8);
  }
  const a=gait(Math.PI*1.5),b=gait(Math.PI*1.55);assert(a.y< -2&&b.x>a.x);
}
// Starting, stopping and reversing preserve momentum rather than snapping to full speed.
{
  const g=new Saga(),p=g.player;p.x=350;
  const advance=input=>{g.controls(p,input,1/60);g.updateFighter(p,1/60);};
  advance({right:true});assert(p.vx>0&&p.vx<60);
  for(let i=0;i<20;i++)advance({right:true});assert.equal(p.vx,248);
  const start=p.x;advance({});assert(p.vx>0&&p.vx<248);
  for(let i=0;i<10;i++)advance({});assert.equal(p.vx,0);assert(p.x>start&&p.x-start<25);
  p.vx=248;p.dir=1;advance({left:true});assert.equal(p.dir,1);assert(p.vx>0);
  for(let i=0;i<14;i++)advance({left:true});assert.equal(p.dir,-1);assert(p.vx< -100);
  p.walk=Math.PI*.73;p.dir=1;p.vx=0;
  const before=target(p,0),front=p.x+before.ffx*GAIT.scale,back=p.x+before.bfx*GAIT.scale;
  g.face(p,-1);const after=target(p,0);
  assert(Math.abs(p.x-after.bfx*GAIT.scale-front)<1e-8);assert(Math.abs(p.x-after.ffx*GAIT.scale-back)<1e-8);
}
// Feet in the rendered skeleton stay planted at different frame rates and in either direction.
{
  for(const hz of [30,60,120])for(const [dir,input] of [[1,{right:true}],[-1,{left:true}],[1,{left:true,guard:true}]]){
    const g=new Saga(),p=g.player,a=new Animator();p.x=350;p.dir=dir;
    let previous=null,contacts=0;
    for(let n=0;n<hz*2;n++){
      g.controls(p,input,1/hz);g.updateFighter(p,1/hz);const s=a.update(p,1/hz,n/hz);
      const steps=[gait(p.walk),gait(p.walk+Math.PI)],feet=[s.frontFoot,s.backFoot];
      const sample=feet.map((foot,i)=>({x:p.x+foot.x*p.dir*GAIT.scale,y:foot.y,grounded:steps[i].grounded}));
      if(previous)for(let i=0;i<2;i++)if(previous[i].grounded&&sample[i].grounded){
        assert(Math.abs(sample[i].x-previous[i].x)<1e-6);assert.equal(sample[i].y,-2);contacts++;
      }
      previous=sample;
    }
    assert(contacts>hz/2);
    for(let n=0;n<hz/2;n++){g.controls(p,{},1/hz);g.updateFighter(p,1/hz);a.update(p,1/hz,2+n/hz);}
    const first=a.skeleton;for(let n=0;n<10;n++)a.update(p,1/hz,2.5+n/hz);
    assert.equal(a.skeleton.frontFoot.y,-2);assert.equal(a.skeleton.backFoot.y,-2);
    assert(Math.abs(a.skeleton.frontFoot.x-first.frontFoot.x)<1e-6);assert(Math.abs(a.skeleton.backFoot.x-first.backFoot.x)<1e-6);
  }
}
// Jump poses extend a leading foot on descent and absorb a real landing without delaying input.
{
  const g=new Saga(),p=g.player;p.x=350;assert(g.request(p,'jump'));
  g.updateFighter(p,1/60);const rising=target(p,1/60);let descending=null;
  for(let n=0;n<90&&p.landingAge>0;n++){
    g.updateFighter(p,1/60);if(p.vy< -150&&p.y>40)descending=target(p,n/60);
  }
  assert(descending);assert(descending.ffy>rising.ffy-12);assert(descending.ffx>rising.ffx);
  assert.equal(p.y,0);assert.equal(p.landingAge,0);assert(p.landingSpeed>550);
  const impact=target(p,0);for(let i=0;i<25;i++)g.updateFighter(p,1/60);
  assert(impact.hipY>target(p,0).hipY+10);assert(g.request(p,'jump'));
}
// A pit has no floor; invulnerability cannot create a platform or an air jump.
{
  const g=new Saga(),p=g.player,pit=g.pits[0];g.enemies.forEach(e=>e.defeated=true);
  p.x=pit.x+20;p.invincible=2;assert.equal(g.request(p,'jump'),false);tick(g,90);
  assert.equal(g.falls,1);assert.equal(p.hp,132);assert.equal(p.x,pit.x-48);assert.equal(p.y,0);
  const h=new Saga(),q=h.player,gap=h.pits[0];h.enemies.forEach(e=>e.defeated=true);
  q.x=gap.x-35;q.vx=248;assert(h.request(q,'jump'));tick(h,8,{right:true});assert(h.request(q,'slash'));
  assert.equal(q.action,'airslash');assert(q.vx>240);tick(h,90,{right:true});
  assert.equal(h.falls,0);assert.equal(q.hp,160);assert(q.x>gap.x+gap.width);assert(gap.cleared);
}
// Telegraphing traps hurt a grounded guard only once per eruption; a jump clears them.
{
  const g=new Saga(),p=g.player,trap=g.traps[0];g.enemies.forEach(e=>e.defeated=true);
  g.time=trap.warning-trap.offset+.25;p.x=trap.x+trap.width/2;
  assert.equal(trapState(trap,g.time).phase,'active');tick(g,1,{guard:true});assert.equal(p.hp,140);
  tick(g,22,{guard:true});assert.equal(p.hp,140);
  const h=new Saga(),q=h.player,t=h.traps[0];h.enemies.forEach(e=>e.defeated=true);
  h.time=t.warning-t.offset+.25;q.x=t.x+t.width/2;q.y=t.height+15;tick(h,1);assert.equal(q.hp,160);
}
// A pit impact holds the body at the bottom, freezes combat and returns only a survivor.
{
  for(const side of ['left','right']){
    const g=new Saga(),p=g.player,pit=g.pits[0];g.enemies.forEach(e=>e.defeated=true);
    p.x=pit.x+pit.width/2;p.safeX=side==='left'?pit.x-10:pit.x+pit.width+10;
    for(let i=0;i<90&&!g.pitScene;i++)tick(g,1);
    assert(g.pitScene);assert.equal(p.action,'crumple');assert.equal(p.y,-235);assert.equal(p.hp,132);
    const impacts=g.drainEvents().filter(e=>e.type==='pitFall');assert.equal(impacts.length,1);assert.equal(impacts[0].fatal,false);
    const x=p.x,time=g.time;tick(g,20,{slash:true,right:true,jump:true});
    assert.equal(p.x,x);assert.equal(p.y,-235);assert.equal(g.time,time);assert.equal(g.falls,1);assert.equal(p.hp,132);
    const age=g.pitScene.age,poseAge=p.t;for(let i=0;i<20;i++)g.tick(0,{slash:true});
    assert.equal(g.pitScene.age,age);assert.equal(p.t,poseAge);
    tick(g,85);assert.equal(g.pitScene,null);assert.equal(p.y,0);assert.equal(p.hp,132);
    assert.equal(p.x,side==='left'?pit.x-48:pit.x+pit.width+48);
    assert.equal(g.drainEvents().filter(e=>e.type==='pitReturn').length,1);assert(g.request(p,'jump'));
  }
  const g=new Saga(),p=g.player,pit=g.pits[0];g.enemies.forEach(e=>e.defeated=true);
  p.x=pit.x+pit.width/2;p.hp=20;p.invincible=10;
  tick(g,200);assert.equal(g.phase,'lost');assert.equal(p.hp,0);assert(p.defeated);assert.equal(p.y,-235);assert.equal(g.falls,1);
  const events=g.drainEvents();assert.equal(events.filter(e=>e.type==='pitFall').length,1);assert.equal(events.filter(e=>e.type==='pitReturn').length,0);
}
// Bamboo and fire trigger different injuries; their reactions finish and lethal traps stay lethal.
{
  for(const kind of ['spikes','flame']){
    const g=new Saga({checkpoint:kind==='flame'?1:0}),p=g.player,t=g.traps.find(a=>a.type===kind);
    g.enemies.forEach(e=>e.defeated=true);g.time=t.warning-t.offset+.25;p.x=t.x+t.width/2;
    tick(g,1);assert.equal(p.action,kind==='spikes'?'trapHit':'burned');assert.equal(p.hp,kind==='spikes'?140:136);
    const hurt=g.drainEvents().find(e=>e.type==='hurt');assert.equal(hurt.hazard,kind);assert.equal(hurt.trapId,t.id);
    if(kind==='spikes')assert(p.wound>0);else assert(p.scorch>0&&p.burnTimer>0);
    tick(g,80);assert(g.free(p));assert.equal(p.hp,kind==='spikes'?140:136);assert.equal(p.burnTimer,0);
  }
  const g=new Saga(),p=g.player,t=g.traps[0];g.enemies.forEach(e=>e.defeated=true);
  g.time=t.warning-t.offset+.25;p.x=t.x+t.width/2;p.hp=10;tick(g,200);
  assert.equal(g.phase,'lost');assert.equal(p.hp,0);assert(p.defeated);
}
// One crow blocks the first chapter, takes real sword damage and retreats when repelled.
{
  const g=new Saga();g.enemies.forEach(e=>{e.hp=0;e.defeated=true;});g.player.x=1690;tick(g,1);
  assert(g.crow.active);g.player.x=1881;tick(g,1);assert.equal(g.chapter,0);assert.equal(g.player.x,1780);
  g.openCrow(3);g.crow.x=g.player.x+160;g.crow.y=130;assert(g.request(g.player,'slash'));tick(g,22);
  assert.equal(g.crow.hp,82-MOVES.slash.damage);const health=g.crow.hp;assert.equal(g.hitCrow('slash'),false);assert.equal(g.crow.hp,health);
  for(let i=0;i<400&&!g.crow.defeated;i++){
    const input=g.free(g.player)?{slash:true}:{};if(g.crow.phase!=='open')g.openCrow(3);tick(g,1,input);
  }
  assert(g.crow.defeated);assert.equal(g.crow.phase,'retreat');g.player.x=1881;tick(g,10);assert.equal(g.chapter,1);
  assert(new Saga({checkpoint:1}).crow.defeated);
}
// Passive play can end in defeat and reaches the retry state.
{
  const g=new Saga();g.player.x=700;for(let i=0;i<9000&&g.phase!=='lost';i++)g.tick(1/60);
  assert.equal(g.phase,'lost');assert.equal(g.player.hp,0);
}
// Every keyed animation and its blended transition has finite joints and blade positions.
{
  const a=new Animator(),f={x:0,y:0,dir:1,vx:0,walk:0,t:0,action:'idle'};
  for(const action of ['walk','slash','reverse','cleave','iai','airslash','storm','guard','crouch','jump','fall','dodge','hit','trapHit','burned','crumple','recover','stunned','dead','ritual','ready','sheathe']){
    f.action=action;
    for(let n=0;n<180;n++){f.t=n/90;f.walk=n*.1;f.vx=action==='walk'?248:0;const s=a.update(f,1/90,n/90);
      for(const v of Object.values(s)){if(v&&typeof v==='object')assert(Number.isFinite(v.x)&&Number.isFinite(v.y));else assert(Number.isFinite(v));}
      assert(s.sheath>=-.02&&s.sheath<=1.02);assert(Math.hypot(s.frontElbow.x-s.shoulder.x,s.frontElbow.y-s.shoulder.y)<34.1);
    }
  }
  const before=JSON.stringify({pose:a.pose,belt:a.belt,trail:a.trail,skeleton:a.skeleton});
  for(let n=0;n<100;n++)a.update(f,0,2);
  assert.equal(JSON.stringify({pose:a.pose,belt:a.belt,trail:a.trail,skeleton:a.skeleton}),before);
}
console.log('PASS: acceleration/braking/reversal, rendered foot contacts at 30/60/120 Hz, jump anticipation/landing absorption, sword combat, parry, pits and traps, paused animation, one crow, all terrain crossed, eight heads, offering, deterministic complete story and finite anatomy.');
