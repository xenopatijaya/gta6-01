// Synthesised sound with plain WebAudio: no audio files, no network.
// Engine hum, two-tone siren, gunshot noise, pickup blip and a bass loop.
export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicOn = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function blip(frequency, duration, type, volume) {
    if (!ensure()) return;
    try {
      if (context.state === 'suspended') void context.resume();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume || 0.25, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(context.currentTime + duration);
    } catch {
      // Audio is decoration: never break the game.
    }
  }

  function noiseBurst(duration, volume) {
    if (!ensure()) return;
    try {
      if (context.state === 'suspended') void context.resume();
      const length = Math.floor(context.sampleRate * duration);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = volume || 0.4;
      source.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Ignore audio failures.
    }
  }

  return {
    unlock() { ensure(); },
    gunshot() { noiseBurst(0.14, 0.5); blip(160, 0.08, 'square', 0.2); },
    punch() { noiseBurst(0.07, 0.3); },
    pickup() { blip(660, 0.1, 'sine', 0.3); blip(990, 0.16, 'sine', 0.25); },
    cash() { blip(880, 0.1, 'triangle', 0.3); blip(1174, 0.14, 'triangle', 0.3); blip(1568, 0.2, 'triangle', 0.28); },
    busted() { blip(220, 0.5, 'sawtooth', 0.3); blip(180, 0.7, 'sawtooth', 0.3); },
    mission() { blip(523, 0.12, 'triangle', 0.3); blip(784, 0.2, 'triangle', 0.3); },
    setEngine(running, speedRatio) {
      if (!ensure()) return;
      try {
        if (running && !engineOsc) {
          engineOsc = context.createOscillator();
          engineOsc.type = 'sawtooth';
          engineGain = context.createGain();
          engineGain.gain.value = 0.04;
          engineOsc.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
        }
        if (engineOsc) {
          engineOsc.frequency.value = 55 + speedRatio * 130;
          engineGain.gain.value = running ? 0.03 + speedRatio * 0.05 : 0.0;
        }
      } catch {
        // Ignore audio failures.
      }
    },
    setSiren(on) {
      if (!ensure()) return;
      try {
        if (on && !sirenOsc) {
          sirenOsc = context.createOscillator();
          sirenOsc.type = 'triangle';
          sirenGain = context.createGain();
          sirenGain.gain.value = 0.05;
          sirenOsc.connect(sirenGain);
          sirenGain.connect(master);
          sirenOsc.start();
          let high = true;
          sirenOsc._timer = window.setInterval(() => {
            if (!sirenOsc) return;
            high = !high;
            sirenOsc.frequency.value = high ? 950 : 700;
          }, 420);
        } else if (!on && sirenOsc) {
          window.clearInterval(sirenOsc._timer);
          sirenOsc.stop();
          sirenOsc = null;
          sirenGain = null;
        }
      } catch {
        // Ignore audio failures.
      }
    },
    startMusic() {
      if (musicOn || !ensure()) return;
      musicOn = true;
      const bassNotes = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
      let step = 0;
      musicTimer = window.setInterval(() => {
        if (!musicOn) return;
        blip(bassNotes[step % bassNotes.length], 0.32, 'triangle', 0.12);
        if (step % 2 === 0) blip(bassNotes[step % bassNotes.length] * 2, 0.08, 'sine', 0.05);
        step += 1;
      }, 300);
    },
    stopMusic() {
      musicOn = false;
      if (musicTimer) window.clearInterval(musicTimer);
      musicTimer = null;
    },
  };
}
