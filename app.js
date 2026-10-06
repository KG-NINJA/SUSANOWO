'use strict';
const $=id=>document.getElementById(id),view=new YakumoView.ShrineWorld($('scene')),music=new YakumoAudio();
let game=null,mode='title',paused=false,keys=new Set(),pressed={},touchPointers=new Map(),accumulator=0,last=0,hudClock=0,storyAge=0,storyDuration=0,bannerAge=0,bossBannerAge=0,helpPaused=false;
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',ArrowUp:'jump',KeyW:'jump',Space:'jump',
  KeyJ:'slash',KeyZ:'slash',KeyK:'iai',KeyX:'iai',KeyL:'dodge',KeyC:'dodge',KeyQ:'storm',KeyU:'storm',KeyE:'interact',KeyF:'interact',ShiftLeft:'guard',ShiftRight:'guard'};
const oneShot=['slash','iai','dodge','jump','storm','interact'];
function resetInput(){keys.clear();pressed={};touchPointers.clear();document.querySelectorAll('.touch-controls .pressed').forEach(b=>b.classList.remove('pressed'));}
function makeTitle(){
  mode='title';paused=false;resetInput();game=new YakumoEngine.Saga();game.attract=true;game.player.x=970;game.player.color='hero';game.comb=true;
  game.enemies=[];const delta=1280-game.boss.x;game.boss.x=1280;
  for(const h of game.boss.heads){h.x+=delta;h.restX+=delta;}game.drainEvents();
  view.resetEffects();view.camera=0;view.theme=2;view.rainAlpha=1;
  ['hud','bottomHud','bossHud','chapterBanner','bossBanner','storyCaption','interactPrompt','ritualMeter','pauseScreen','endScreen'].forEach(id=>$(id).classList.add('hidden'));
  $('titleScreen').classList.remove('hidden');$('pauseButton').disabled=true;$('stage').classList.remove('demo-active');music.pause(true);$('scene').blur();
}
async function start(demo=false,checkpoint=0){
  resetInput();game=new YakumoEngine.Saga({demo,checkpoint,difficulty:$('difficulty').value});mode='playing';paused=false;accumulator=0;storyAge=0;bannerAge=0;
  view.resetEffects();view.camera=Math.max(0,game.player.x-510);view.theme=checkpoint;view.rainAlpha=1;
  ['titleScreen','pauseScreen','endScreen','bossHud','bossBanner','storyCaption'].forEach(id=>$(id).classList.add('hidden'));
  ['hud','bottomHud'].forEach(id=>$(id).classList.remove('hidden'));
  $('stage').classList.toggle('demo-active',demo);$('modeLabel').textContent=demo?'自動演武':'誓いを携え、出雲へ';
  $('pauseButton').disabled=false;$('pauseButton').innerHTML='一時停止 <span>P</span>';$('scene').focus({preventScroll:true});
  music.pause(false);music.scene='journey';music.chapter=checkpoint;try{await music.start();}catch(e){$('soundState').textContent='OFF';}
  handleEvents();updateHUD();
}
function pause(value=!paused){
  if(mode!=='playing')return;paused=value;resetInput();$('pauseScreen').classList.toggle('hidden',!paused);
  $('pauseButton').innerHTML=paused?'再開 <span>P</span>':'一時停止 <span>P</span>';music.pause(paused);
  if(!paused){$('scene').focus({preventScroll:true});music.start().catch(()=>{});}
}
function story(e){$('storySpeaker').textContent=e.speaker;$('storyText').textContent=e.text;storyAge=0;storyDuration=e.duration||6;$('storyCaption').classList.remove('hidden');}
function showChapter(n){bannerAge=0;$('bannerNumber').textContent=['第一幕','第二幕','第三幕'][n];$('bannerName').textContent=YakumoEngine.CHAPTERS[n].name;
  $('chapterBanner').classList.add('hidden');void $('chapterBanner').offsetWidth;$('chapterBanner').classList.remove('hidden');}
function end(won){
  mode='ended';resetInput();$('pauseButton').disabled=true;['chapterBanner','bossBanner','storyCaption','interactPrompt','ritualMeter'].forEach(id=>$(id).classList.add('hidden'));
  $('endEnglish').textContent=won?'THE EIGHTFOLD OATH IS FULFILLED':'THE OATH ENDURES';
  $('endTitle').textContent=won?'八雲立つ、出雲の地。':'誓いは、まだ尽きぬ。';
  $('endDetail').textContent=won?'八岐大蛇を祓い、櫛名田比売を護った。神の剣は天照へ、誓いの刃は静かに鞘へ。':'牙の予兆を読み、刃の隙を測る。息を整え、もう一度。';
  $('endPoem').classList.toggle('hidden',!won);$('endScore').textContent=game.score;$('endParries').textContent=game.parries;
  $('endHeads').textContent=game.boss.heads.filter(h=>h.hp<=0).length+' / 8';
  $('retryButton').innerHTML=won?'もう一度、誓いの旅へ <span>→</span>':'この幕から再挑戦 <span>→</span>';
  $('endScreen').classList.remove('hidden');
}
function handleEvents(){
  for(const e of game.drainEvents()){
    view.event(e);music.event(e);
    if(e.type==='chapter'){showChapter(e.chapter);music.chapter=e.chapter;music.scene='journey';}
    if(e.type==='story')story(e);
    if(e.type==='encounter'||e.type==='crowEncounter')music.scene='battle';
    if(e.type==='crowRepelled')music.scene='journey';
    if(e.type==='ritual')music.scene='ritual';
    if(e.type==='offering')music.scene='journey';
    if(e.type==='bossIntro'){$('bossBanner').classList.remove('hidden');bossBannerAge=0;music.scene='boss';}
    if(e.type==='bossStart'){$('bossHud').classList.remove('hidden');$('storyCaption').classList.add('hidden');}
    if(e.type==='bossDown'){music.scene='ending';$('bossHud').classList.add('hidden');}
    if(e.type==='won')end(true);if(e.type==='lost')end(false);
  }
}
function updateHUD(){
  const p=game.player,e=game.enemy()||(game.crow.active&&!game.crow.defeated?Object.assign({name:'禍つ黒羽',action:game.crow.phase},game.crow):null);$('healthText').textContent=Math.ceil(p.hp)+' / '+p.maxHp;$('healthFill').style.width=p.hp/p.maxHp*100+'%';
  $('staminaFill').style.width=p.stamina+'%';$('spiritFill').style.width=game.storm+'%';$('spiritKey').classList.toggle('ready',game.storm>=100);
  $('chapterName').textContent=YakumoEngine.CHAPTERS[game.chapter].short;$('chapterCount').textContent=['第一幕','第二幕','第三幕'][game.chapter];
  document.querySelectorAll('.route i').forEach((d,i)=>d.classList.toggle('active',i<=game.chapter));
  $('enemyHud').classList.toggle('invisible',!e||!e.active);if(e){$('enemyName').textContent=e.name;$('enemyFill').style.width=e.hp/e.maxHp*100+'%';$('enemyHint').textContent=e.name==='禍つ黒羽'?'急降下を受け流し、低く飛ぶ隙を斬る。':e.action==='guard'?'堅い構え。居合で崩す。':'赤い刃の予兆を、見切れ。';}
  const alive=game.boss.heads.filter(h=>h.hp>0).length,kanji=['零','壱','弐','参','肆','伍','陸','漆','八'];
  $('headCount').textContent=kanji[alive]+' / 八';$('bossPhase').textContent=game.boss.enraged?'荒ぶる大蛇。予兆は、より速く。':'八つの首、赤い瞳。';
  for(const h of game.boss.heads){const d=$('head'+h.id);d.querySelector('i').style.width=h.hp/h.maxHp*100+'%';d.classList.toggle('cut',h.hp<=0);d.classList.toggle('active',['warn','strike','open'].includes(h.phase));}
  $('hintText').textContent=game.demo?'自動演武 — 須佐之男命が刃を振るい、誓いを果たします。':game.prompt;
  $('scoreText').textContent=String(game.score).padStart(5,'0');$('comboText').textContent=game.chain>1&&game.chainAge>0?game.chain+' 連斬':'';
  const canOffer=game.chapter===1&&!game.offering&&!game.enemy()&&Math.abs(p.x-3650)<150&&game.phase==='playing';
  $('interactPrompt').classList.toggle('hidden',!canOffer);$('ritualMeter').classList.toggle('hidden',game.phase!=='ritual');
  $('ritualFill').style.width=game.ritualAge/3.6*100+'%';
  $('stage').classList.toggle('boss-active',game.boss.active&&game.phase!=='ending'&&game.phase!=='won');
}
function input(){
  const v={};for(const code of keys)if(keyMap[code])v[keyMap[code]]=true;for(const action of touchPointers.values())v[action]=true;
  for(const action of oneShot)v[action]=!!pressed[action];pressed={};return v;
}
function frame(now){
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(mode==='title'){
    game.player.t+=dt;for(const h of game.boss.heads){h.x=h.restX+Math.sin(view.clock*.7+h.id)*13;h.y=h.restY+Math.sin(view.clock*1.1+h.id)*8;}
  }else if(!paused){
    accumulator+=dt;while(accumulator>=1/60){game.tick(1/60,input());handleEvents();accumulator-=1/60;}
    hudClock+=dt;if(hudClock>.07){updateHUD();hudClock=0;}
    if(!$('storyCaption').classList.contains('hidden')){storyAge+=dt;if(storyAge>storyDuration)$('storyCaption').classList.add('hidden');}
    if(!$('chapterBanner').classList.contains('hidden')){bannerAge+=dt;if(bannerAge>3.3)$('chapterBanner').classList.add('hidden');}
    if(!$('bossBanner').classList.contains('hidden')){bossBannerAge+=dt;if(bossBannerAge>3.2)$('bossBanner').classList.add('hidden');}
  }
  view.render(game,paused?0:dt);requestAnimationFrame(frame);
}
window.addEventListener('keydown',e=>{
  if($('helpDialog').open||e.target.matches('select,input,textarea'))return;
  if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){e.preventDefault();pause();return;}
  const action=keyMap[e.code];if(!action||mode!=='playing'||paused||game.demo)return;e.preventDefault();keys.add(e.code);
  if(!e.repeat&&oneShot.includes(action))pressed[action]=true;
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(keyMap[e.code]&&mode==='playing')e.preventDefault();});
window.addEventListener('blur',()=>{resetInput();if(mode==='playing'&&!paused)pause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing'&&!paused)pause(true);});
document.querySelectorAll('[data-input]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(mode!=='playing'||paused||game.demo)return;b.setPointerCapture(e.pointerId);touchPointers.set(e.pointerId,b.dataset.input);b.classList.add('pressed');if(oneShot.includes(b.dataset.input))pressed[b.dataset.input]=true;});
  const release=e=>{touchPointers.delete(e.pointerId);b.classList.remove('pressed');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
});
$('playButton').addEventListener('click',()=>start(false));$('demoButton').addEventListener('click',()=>start(true));$('pauseButton').addEventListener('click',()=>pause());$('resumeButton').addEventListener('click',()=>pause(false));
['pauseTitleButton','endTitleButton'].forEach(id=>$(id).addEventListener('click',makeTitle));$('retryButton').addEventListener('click',()=>start(false,game.phase==='won'?0:game.chapter));
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();if(mode==='playing'&&!paused)pause(true);else makeTitle();});
$('soundButton').addEventListener('click',async()=>{music.setEnabled(!music.enabled);$('soundState').textContent=music.enabled?'ON':'OFF';$('soundButton').setAttribute('aria-pressed',String(music.enabled));if(music.enabled&&mode!=='title')try{await music.start();}catch(e){}});
$('helpButton').addEventListener('click',()=>{helpPaused=mode==='playing'&&!paused;if(helpPaused)pause(true);$('helpDialog').showModal();});$('closeHelp').addEventListener('click',()=>$('helpDialog').close());
$('helpDialog').addEventListener('close',()=>{if(helpPaused){helpPaused=false;pause(false);}});
$('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-shell').requestFullscreen();}catch(e){}});
window.addEventListener('resize',()=>view.resize());document.addEventListener('fullscreenchange',()=>setTimeout(()=>view.resize(),80));
for(let n=0;n<8;n++){const d=document.createElement('div');d.id='head'+n;d.innerHTML='<small>'+['壱','弐','参','肆','伍','陸','漆','捌'][n]+'</small><b><i></i></b>';$('headBars').append(d);}
window.YakumoGame={start,makeTitle,pause,get saga(){return game;},get mode(){return mode;},get paused(){return paused;},view,music,snapshot:()=>game.snapshot()};
makeTitle();requestAnimationFrame(frame);
