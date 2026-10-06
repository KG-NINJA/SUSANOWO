/* Original Japanese pentatonic FM score: airy flute, plucked strings, taiko and sword resonance. */
class YakumoAudio{
  constructor(){this.context=null;this.enabled=true;this.paused=true;this.chapter=0;this.scene='journey';this.step=0;this.next=0;}
  async start(){
    if(!this.context){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=this.context=new C();
      this.master=c.createGain();this.master.gain.value=.63;this.music=c.createGain();this.music.gain.value=.33;this.effects=c.createGain();this.effects.gain.value=.72;
      this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.ratio.value=3.2;
      this.music.connect(this.compressor);this.effects.connect(this.compressor);this.compressor.connect(this.master);this.master.connect(c.destination);
      this.delay=c.createDelay(.8);this.delay.delayTime.value=.29;this.feedback=c.createGain();this.feedback.gain.value=.28;this.delay.connect(this.feedback);this.feedback.connect(this.delay);this.wet=c.createGain();this.wet.gain.value=.19;this.delay.connect(this.wet);this.wet.connect(this.music);
      this.noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=this.noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      this.next=c.currentTime+.05;this.timer=setInterval(()=>this.schedule(),35);
    }
    await this.context.resume();this.gain();
  }
  gain(){if(this.context)this.master.gain.setTargetAtTime(this.enabled&&!this.paused?.63:0,this.context.currentTime,.05);}
  pause(v){this.paused=v;this.gain();if(!v&&this.context)this.next=Math.max(this.next,this.context.currentTime+.06);}
  setEnabled(v){this.enabled=v;this.gain();}
  frequency(n){return 440*Math.pow(2,(n-69)/12);}
  fm(note,time,volume=.16,duration=1.3,ratio=2,index=1.6,route){
    const c=this.context,car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain(),hz=this.frequency(note);
    car.frequency.value=hz;mod.frequency.value=hz*ratio;mg.gain.setValueAtTime(hz*index,time);mg.gain.exponentialRampToValueAtTime(hz*.025,time+duration*.8);
    mod.connect(mg);mg.connect(car.frequency);car.connect(g);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.009);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    g.connect(route||this.music);if(!route)g.connect(this.delay);car.start(time);mod.start(time);car.stop(time+duration+.04);mod.stop(time+duration+.04);
    car.onended=()=>{car.disconnect();mod.disconnect();mg.disconnect();g.disconnect();};
  }
  flute(note,time,duration=3){
    const c=this.context,o=c.createOscillator(),v=c.createOscillator(),vg=c.createGain(),g=c.createGain();o.frequency.value=this.frequency(note);v.frequency.value=5.1;vg.gain.value=2.3;
    v.connect(vg);vg.connect(o.frequency);o.connect(g);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(.075,time+.31);g.gain.setTargetAtTime(.0001,time+duration*.6,.28);g.connect(this.music);g.connect(this.delay);
    o.start(time);v.start(time);o.stop(time+duration+.6);v.stop(time+duration+.6);o.onended=()=>{o.disconnect();v.disconnect();vg.disconnect();g.disconnect();};
  }
  noise(time,duration,volume,frequency=800,route){
    const c=this.context,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noiseBuffer;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.6;
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+duration);s.connect(f);f.connect(g);g.connect(route||this.effects);s.start(time);s.stop(time+duration+.04);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  taiko(time,volume=.32,pitch=95,route){
    const c=this.context,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(pitch,time);o.frequency.exponentialRampToValueAtTime(34,time+.24);g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+.48);o.connect(g);g.connect(route||this.effects);o.start(time);o.stop(time+.5);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  schedule(){
    const c=this.context;if(!c||c.state!=='running')return;if(!this.enabled||this.paused){this.next=c.currentTime+.08;return;}
    if(this.next<c.currentTime-.1)this.next=c.currentTime+.04;
    const combat=this.scene==='boss'||this.scene==='battle',ending=this.scene==='ending';const bpm=this.scene==='boss'?126:combat?112:ending?76:68;
    const notes=[62,null,67,69,70,null,69,67,62,null,57,62,67,null,70,69,74,null,70,69,67,62,null,57,62,null,67,69,70,null,67,null];
    while(this.next<c.currentTime+.16){
      const t=this.next,n=notes[this.step%32],transpose=this.chapter===1?-2:this.chapter===2?-5:0;
      if(n!==null)this.fm(n+transpose+(ending?7:0),t,combat?.14:.11,combat?.8:1.7,combat?2:1,combat?1.8:.9);
      if(this.step%8===0){this.flute(74+transpose+(ending?7:0),t,3);this.fm(38+transpose,t,.15,3,1,.75);}
      if(this.step%4===0||combat&&this.step%4===3)this.taiko(t,combat?.25:.12,combat?98:78,this.music);
      if(combat&&this.step%4===2)this.noise(t,.15,.13,800,this.music);
      this.next+=60/bpm/2;this.step++;
    }
  }
  event(e){
    if(!this.context||!this.enabled||this.paused)return;const t=this.context.currentTime+.004;
    if(e.type==='swing'){this.noise(t,e.move==='iai'?.22:.14,.19,e.move==='iai'?1800:1250);if(e.move==='iai')this.fm(82,t,.055,.4,3,3,this.effects);}
    if(e.type==='hit'||e.type==='crowHit'){this.taiko(t,e.ko?.58:.36,e.boss?80:125);this.noise(t,.17,.35,1050);this.fm(86,t,.04,.25,3.4,2.3,this.effects);}
    if(e.type==='hurt'&&e.hazard!=='pit'){
      this.taiko(t,.39,e.hazard==='spikes'?78:94);this.noise(t,.18,.27,480);
      if(e.hazard==='spikes'){this.noise(t+.025,.10,.15,2400);this.fm(41,t+.06,.055,.34,1.1,1.4,this.effects);}
      if(e.hazard==='flame'){this.noise(t,.42,.22,900);this.fm(44,t+.06,.045,.36,1.05,1.3,this.effects);}
    }
    if(e.type==='block'){this.fm(92,t,.18,.4,2.73,4.4,this.effects);this.noise(t,.1,.23,3200);}
    if(e.type==='parry'){this.fm(91,t,.25,1.0,2.71,5,this.effects);this.fm(98,t+.03,.12,.85,2.1,4,this.effects);this.noise(t,.1,.26,3600);}
    if(e.type==='step')this.noise(t,.09,.05,330);
    if(e.type==='land'){this.noise(t,.15,.16,410);if(e.impact>450)this.taiko(t,.16,72);}
    if(e.type==='dodge'||e.type==='jump')this.noise(t,.16,.1,1100);
    if(e.type==='lightning'){this.taiko(t,.7,67);this.noise(t,.65,.48,450);this.fm(43,t,.22,1.3,1.3,6,this.effects);}
    if(e.type==='headDown'||e.type==='bossDown'){this.taiko(t,.65,55);this.fm(31,t,.26,2.4,1.7,5,this.effects);this.noise(t,.72,.36,320);}
    if(e.type==='warning')this.fm(43,t,.11,.9,1.13,3.2,this.effects);
    if(e.type==='bossAttack'){this.noise(t,.37,.3,500);this.taiko(t,.3,72);}
    if(e.type==='crowWarning'||e.type==='crowEncounter'){this.fm(47,t,.09,.26,2.8,5.1,this.effects);this.fm(43,t+.16,.075,.28,2.5,4.3,this.effects);this.noise(t,.15,.07,1250);}
    if(e.type==='crowDive'){this.noise(t,.28,.21,1500);this.fm(42,t,.065,.3,2.2,3.5,this.effects);}
    if(e.type==='crowRepelled'){this.noise(t,.3,.12,1700);this.fm(71,t,.12,1.2,2.7,1.6,this.effects);}
    if(e.type==='trap'){this.noise(t,.36,e.kind==='flame'?.25:.16,e.kind==='flame'?650:2200);if(e.kind!=='flame')this.fm(53,t,.065,.28,3.2,3,this.effects);}
    if(e.type==='pitFall'){this.noise(t,.48,.28,230);this.taiko(t,.49,58);this.noise(t+.03,.10,.14,1800);this.fm(34,t+.055,.07,.48,1.15,1.8,this.effects);}
    if(e.type==='ritual'||e.type==='offering'){[62,67,69,74,79,81,86,91].forEach((n,i)=>this.fm(n,t+i*.14,.13,1.8,2.71,2.4));}
    if(e.type==='won'){[62,67,69,74,79].forEach((n,i)=>this.fm(n,t+i*.2,.16,2.5,1,1.4));}
  }
}
