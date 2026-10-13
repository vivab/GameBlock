// Tiny procedural audio system: no licensed audio files and no downloads.
// iOS resumes AudioContext only after a real user interaction.
export function createGameAudio() {
  let context=null,enabled=true,noise=null;
  function init(){
    if(!enabled)return null;
    try {
      context ||= new (window.AudioContext||window.webkitAudioContext)();
      if(context.state==='suspended') context.resume().catch(()=>{});
      return context;
    } catch {return null;}
  }
  function sound(freq=190,duration=.13,type='triangle',gain=.08,freqEnd=50){
    const ctx=init();if(!ctx)return;
    const osc=ctx.createOscillator(),amp=ctx.createGain();
    const t=ctx.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(freq,t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(15,freqEnd),t+duration);
    amp.gain.setValueAtTime(Math.max(.0001,gain),t);
    amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);osc.stop(t+duration+.01);
  }
  function noiseBurst(duration=.11,gain=.08,cutoff=1200){
    const ctx=init();if(!ctx)return;
    if(!noise){
      const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.6),ctx.sampleRate);
      const out=buffer.getChannelData(0);
      for(let i=0;i<out.length;i++)out[i]=(Math.random()*2-1)*(.5+.5*Math.random());
      noise=buffer;
    }
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();
    src.buffer=noise;filter.type='lowpass';filter.frequency.value=cutoff;
    const t=ctx.currentTime;
    amp.gain.setValueAtTime(gain,t);
    amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(t);src.stop(t+duration+.01);
  }
  return {
    setEnabled(value){enabled=!!value;},
    unlock:()=>init(),
    ui(){sound(500,.075,'sine',.025,270);},
    shoot(kind){
      if(kind==='knife'){noiseBurst(.085,.055,2300);sound(320,.07,'triangle',.04,130);return;}
      noiseBurst(kind==='rifle'?.18:.13,kind==='rifle'?.16:.11,
        kind==='rifle'?1550:2600);
      sound(kind==='rifle'?130:190,kind==='rifle'?.16:.10,'sawtooth',.065,42);
    },
    hit(){sound(780,.065,'sine',.04,400);},
    reload(){sound(540,.055,'square',.022,280);},
    win(){sound(530,.26,'triangle',.08,930);},
    lose(){sound(380,.35,'triangle',.065,100);}
  };
}
