interface EqualizerSettings {
  low: number;
  mid: number;
  high: number;
  bassBoost: boolean;
  reverb: number;
  delay: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  
  // EQ & FX nodes
  private lowFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private highFilter: BiquadFilterNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Streaming media sources
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  // Generative / Sequencer state
  private isGenerativeRunning = false;
  private sequencerTimerId: any = null;
  private currentStep = 0;
  private tempo = 110;
  private onStepCallback: ((step: number) => void) | null = null;
  
  // Synth active track configuration
  private activeGenerativeType: "lofi" | "synthwave" | "ambient" | "techno" = "lofi";

  // Pre-compiled noise buffer for percussion
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // We don't initialize AudioContext immediately due to browser policies.
    // It will be initialized on first user interaction.
  }

  public init() {
    if (this.ctx) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create Equalizer filters
      this.lowFilter = this.ctx.createBiquadFilter();
      this.lowFilter.type = "lowshelf";
      this.lowFilter.frequency.value = 250;
      this.lowFilter.Q.value = 1.0;

      this.midFilter = this.ctx.createBiquadFilter();
      this.midFilter.type = "peaking";
      this.midFilter.frequency.value = 1000;
      this.midFilter.Q.value = 1.0;

      this.highFilter = this.ctx.createBiquadFilter();
      this.highFilter.type = "highshelf";
      this.highFilter.frequency.value = 4000;
      this.highFilter.Q.value = 1.0;

      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = "lowshelf";
      this.bassFilter.frequency.value = 80;
      this.bassFilter.gain.value = 0; // Starts flat

      // Create Delay effect
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.3; // 300ms default
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.3;
      this.delayWet = this.ctx.createGain();
      this.delayWet.gain.value = 0; // Starts wet level at 0 (off)

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;

      // Connect EQ chain: Source -> Bass -> Low -> Mid -> High -> Master -> Analyser -> Destination
      this.bassFilter.connect(this.lowFilter);
      this.lowFilter.connect(this.midFilter);
      this.midFilter.connect(this.highFilter);
      this.highFilter.connect(this.masterGain);

      // Connect Delay in parallel: High -> Delay -> DelayFeedback -> Delay (loop)
      // and High -> Delay -> DelayWet -> Master
      this.highFilter.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayWet);
      this.delayWet.connect(this.masterGain);

      // Connect Master to Analyser & Output
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Initialize Audio Element for streams
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = "anonymous";
      this.mediaSource = this.ctx.createMediaElementSource(this.audioElement);
      // Route streaming audio through the EQ chain
      this.mediaSource.connect(this.bassFilter);

      // Create Noise Buffer for drums
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.error("Failed to initialize audio context", e);
    }
  }

  public getContextState(): string {
    return this.ctx ? this.ctx.state : "uninitialized";
  }

  public async resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  // Get frequency and waveform data for Visualizer
  public getAnalyserData(): { frequencies: Uint8Array; waveform: Uint8Array } {
    if (!this.analyser) {
      return { frequencies: new Uint8Array(0), waveform: new Uint8Array(0) };
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const frequencies = new Uint8Array(bufferLength);
    const waveform = new Uint8Array(bufferLength);
    
    this.analyser.getByteFrequencyData(frequencies);
    this.analyser.getByteTimeDomainData(waveform);
    
    return { frequencies, waveform };
  }

  // ---------------- STREAM AUDIO CONTROLS ----------------
  public playStream(url: string) {
    this.resume();
    this.stopGenerative();
    
    if (this.audioElement) {
      this.audioElement.src = url;
      this.audioElement.play().catch(err => {
        console.warn("Audio play failed. Awaiting interaction.", err);
      });
    }
  }

  public pauseStream() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public resumeStream() {
    this.resume();
    if (this.audioElement) {
      this.audioElement.play().catch(e => console.warn(e));
    }
  }

  public setStreamTime(seconds: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = seconds;
    }
  }

  public getStreamDuration(): number {
    return this.audioElement ? this.audioElement.duration || 0 : 0;
  }

  public getStreamCurrentTime(): number {
    return this.audioElement ? this.audioElement.currentTime : 0;
  }

  // ---------------- SOUND SYNTHESIS METHODS ----------------
  
  private playNoise(duration: number, lowpassFreq: number, highpassFreq?: number, gain = 1) {
    if (!this.ctx || !this.noiseBuffer || !this.bassFilter) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpassFreq;

    let targetNode: AudioNode = filter;

    if (highpassFreq) {
      const hpFilter = this.ctx.createBiquadFilter();
      hpFilter.type = "highpass";
      hpFilter.frequency.value = highpassFreq;
      filter.connect(hpFilter);
      targetNode = hpFilter;
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(filter);
    targetNode.connect(gainNode);
    gainNode.connect(this.bassFilter); // Route into FX chain

    source.start();
    source.stop(this.ctx.currentTime + duration);
  }

  // Kick Drum: Rapid pitch sweep on a sine wave
  public playKick(timeOffset = 0, gain = 1) {
    if (!this.ctx || !this.bassFilter) return;
    const now = this.ctx.currentTime + timeOffset;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.bassFilter);

    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);

    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Snare Drum: Filtered noise mixed with a brief 180Hz sine wave snap
  public playSnare(timeOffset = 0, gain = 0.8) {
    if (!this.ctx || !this.bassFilter) return;
    const now = this.ctx.currentTime + timeOffset;

    // Snare tone part
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(this.bassFilter);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    oscGain.gain.setValueAtTime(gain * 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);

    // Snare snap noise part
    this.playNoise(0.25, 1200, 150, gain * 0.6);
  }

  // Hi-Hat: Extremely short high-pass filtered white noise
  public playHihat(timeOffset = 0, gain = 0.4) {
    this.playNoise(0.05, 8000, 7000, gain);
  }

  // Synthesized Bass note
  public playBassNote(freq: number, duration: number, waveType: OscillatorType = "triangle", gain = 0.5) {
    if (!this.ctx || !this.bassFilter) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    // Low pass filter to make bass warm
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 400;

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, now);

    osc.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(this.bassFilter);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Synthesized Lead note
  public playLeadNote(freq: number, duration: number, waveType: OscillatorType = "sine", gain = 0.4, detuneVal = 0) {
    if (!this.ctx || !this.bassFilter) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(detuneVal, now);

    // Filter to sweep lead
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.1);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.bassFilter);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Arpeggiator helper
  public playArpeggio(notes: number[], speed = 0.12, waveType: OscillatorType = "sine") {
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playLeadNote(freq, 0.25, waveType, 0.15, 0);
      }, index * speed * 1000);
    });
  }

  // Chord synth ( lush multi-oscillator pads )
  public playChord(frequencies: number[], duration: number, waveType: OscillatorType = "sawtooth", gain = 0.15) {
    if (!this.ctx || !this.bassFilter) return;
    const now = this.ctx.currentTime;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;

    const padGain = this.ctx.createGain();
    padGain.connect(this.bassFilter);
    filter.connect(padGain);

    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(gain, now + 0.5); // Slow attack
    padGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = waveType;
      osc.frequency.value = freq;
      // Slight detune for chorus effect
      osc.detune.value = (idx - (frequencies.length - 1) / 2) * 8;
      
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // ---------------- PROCEDURAL GENERATIVE ENGINE ----------------

  private getScaleNotes(scale: string): number[] {
    // Scales frequencies starting around C3/C4
    const scales: Record<string, number[]> = {
      minorPentatonic: [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16], // C Minor Pentatonic
      majorPentatonic: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00], // C Major Pentatonic
      dorian: [130.81, 146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 311.13, 349.23, 392.00], // C Dorian
      phrygian: [130.81, 138.59, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63, 277.18, 311.13, 349.23, 392.00], // C Phrygian
    };
    return scales[scale] || scales.minorPentatonic;
  }

  private getChordFrequencies(rootIndex: number, scaleNotes: number[]): number[] {
    // Generates a nice 3 or 4-note chord based on scale index
    const chordIdxs = [rootIndex, (rootIndex + 2) % scaleNotes.length, (rootIndex + 4) % scaleNotes.length, (rootIndex + 6) % scaleNotes.length];
    return chordIdxs.map(idx => scaleNotes[idx]);
  }

  public playGenerativeTrack(type: "lofi" | "synthwave" | "ambient" | "techno", tempo = 110, scale = "minorPentatonic") {
    this.resume();
    this.stopStream();
    this.stopGenerative();

    this.isGenerativeRunning = true;
    this.activeGenerativeType = type;
    this.tempo = tempo;
    this.currentStep = 0;

    const intervalMs = (60 / this.tempo) / 4 * 1000; // 16th note interval
    const scaleNotes = this.getScaleNotes(scale);

    // Set up procedural music loops
    let activeChord: number[] = [scaleNotes[0], scaleNotes[2], scaleNotes[4], scaleNotes[6]];
    let chordTickCounter = 0;

    const tick = () => {
      if (!this.isGenerativeRunning) return;

      const step = this.currentStep;
      
      // Notify UI
      if (this.onStepCallback) {
        this.onStepCallback(step);
      }

      // Generate chord changes every 16 or 32 steps (1 or 2 bars)
      if (step % 16 === 0) {
        const rootIndices = [0, 2, 4, 3, 5, 1];
        const randomRoot = rootIndices[Math.floor(Math.random() * rootIndices.length)];
        activeChord = this.getChordFrequencies(randomRoot, scaleNotes);
      }

      // Play based on genre preset
      if (type === "lofi") {
        this.playLofiStep(step, activeChord, scaleNotes);
      } else if (type === "synthwave") {
        this.playSynthwaveStep(step, activeChord, scaleNotes);
      } else if (type === "ambient") {
        this.playAmbientStep(step, activeChord, scaleNotes);
      } else if (type === "techno") {
        this.playTechnoStep(step, activeChord, scaleNotes);
      }

      this.currentStep = (this.currentStep + 1) % 16;
      this.sequencerTimerId = setTimeout(tick, intervalMs);
    };

    tick();
  }

  // Genre scheduler implementations
  private playLofiStep(step: number, chord: number[], scale: number[]) {
    // Mellow lo-fi drum pattern
    if (step === 0 || step === 8) {
      this.playKick(0, 0.6);
    }
    if (step === 4 || step === 12) {
      this.playSnare(0, 0.4);
    }
    if (step % 2 === 0 && Math.random() > 0.3) {
      // Lazy humanized hi-hat
      this.playHihat(Math.random() * 0.02, 0.15);
    }

    // Cozy electric piano chord pad (slow attack, warm filters)
    if (step === 0) {
      this.playChord(chord, 3.2, "triangle", 0.08);
    }

    // Casual relaxing lead guitar/electric piano lick
    if (step % 4 === 2 && Math.random() > 0.5) {
      const notes = [chord[2] * 2, chord[3] * 2, scale[scale.length - 1]];
      const pick = notes[Math.floor(Math.random() * notes.length)];
      this.playLeadNote(pick, 0.8, "sine", 0.06);
    }
  }

  private playSynthwaveStep(step: number, chord: number[], scale: number[]) {
    // Drive, driving kick and clap snare
    if (step % 4 === 0) {
      this.playKick(0, 0.8);
    }
    if (step === 4 || step === 12) {
      this.playSnare(0, 0.7);
    }
    if (step % 2 === 1) {
      this.playHihat(0, 0.25);
    }

    // Driving eight-note octaving sawtooth bassline (synthwave staple)
    const baseBassFreq = chord[0] / 2;
    if (step % 2 === 0) {
      this.playBassNote(baseBassFreq, 0.15, "sawtooth", 0.15);
    } else {
      this.playBassNote(baseBassFreq * 2, 0.12, "sawtooth", 0.1);
    }

    // Cyber synth chords
    if (step === 0 || step === 8) {
      this.playChord(chord.map(f => f * 2), 1.6, "sawtooth", 0.05);
    }

    // Arpeggiator lead lines on steps
    if (step % 4 === 0 && Math.random() > 0.4) {
      const arpNotes = [chord[1] * 2, chord[2] * 2, chord[3] * 2, chord[0] * 4];
      this.playArpeggio(arpNotes, 0.1, "triangle");
    }
  }

  private playAmbientStep(step: number, chord: number[], scale: number[]) {
    // Very minimal rhythm, no heavy kick/snare
    if (step === 0 && Math.random() > 0.5) {
      this.playKick(0, 0.2);
    }
    if (step === 8 && Math.random() > 0.7) {
      // Soft high sweep noise as shaker
      this.playNoise(0.4, 9000, 3000, 0.05);
    }

    // Massive ambient drone pad
    if (step === 0) {
      this.playChord(chord, 6.0, "sine", 0.12);
    }

    // Distant soft star drops
    if (Math.random() > 0.8) {
      const highFreq = scale[Math.floor(Math.random() * scale.length)] * 4;
      this.playLeadNote(highFreq, 1.5, "sine", 0.04);
    }
  }

  private playTechnoStep(step: number, chord: number[], scale: number[]) {
    // Hard four-to-the-floor kick
    if (step % 4 === 0) {
      this.playKick(0, 1.0);
    }
    // Clattering snare/clap on 4 and 12
    if (step === 4 || step === 12) {
      this.playSnare(0, 0.6);
    }
    // Constant upbeat hihats (the iconic house/techno vibe)
    if (step % 4 === 2) {
      this.playHihat(0, 0.35);
    }

    // Hypnotic repeating sub-bass
    const bassRoot = chord[0] / 2;
    if (step % 4 === 1 || step % 4 === 3) {
      this.playBassNote(bassRoot, 0.12, "triangle", 0.2);
    }

    // Hypnotic stabs
    if (step % 8 === 0 || step % 8 === 3) {
      this.playChord([chord[1] * 2, chord[3] * 2], 0.2, "sawtooth", 0.06);
    }
  }

  // ---------------- USER SEQUENCER PLAYBACK ----------------

  public playCustomSequencer(grid: any[], tempo = 120, onStep: (step: number) => void) {
    this.resume();
    this.stopStream();
    this.stopGenerative();

    this.isGenerativeRunning = true;
    this.tempo = tempo;
    this.currentStep = 0;
    this.onStepCallback = onStep;

    const intervalMs = (60 / this.tempo) / 4 * 1000;

    const tick = () => {
      if (!this.isGenerativeRunning) return;

      const step = this.currentStep;
      const stepData = grid[step];

      if (stepData) {
        if (stepData.kick) this.playKick(0, 0.85);
        if (stepData.snare) this.playSnare(0, 0.7);
        if (stepData.hihat) this.playHihat(0, 0.3);
        if (stepData.bass) this.playBassNote(110, 0.15, "sawtooth", 0.25); // A2 Bass
        if (stepData.lead) this.playLeadNote(440, 0.15, "triangle", 0.18); // A4 Lead
      }

      if (this.onStepCallback) {
        this.onStepCallback(step);
      }

      this.currentStep = (this.currentStep + 1) % 16;
      this.sequencerTimerId = setTimeout(tick, intervalMs);
    };

    tick();
  }

  public registerStepCallback(callback: (step: number) => void) {
    this.onStepCallback = callback;
  }

  public stopGenerative() {
    this.isGenerativeRunning = false;
    if (this.sequencerTimerId) {
      clearTimeout(this.sequencerTimerId);
      this.sequencerTimerId = null;
    }
  }

  public stopStream() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
    }
  }

  public stopAll() {
    this.stopStream();
    this.stopGenerative();
  }

  // ---------------- EQ & FX PARAMETERS ----------------

  public updateEQSettings(settings: EqualizerSettings) {
    this.init();
    if (!this.lowFilter || !this.midFilter || !this.highFilter || !this.bassFilter || !this.delayWet || !this.delayNode) return;

    // Apply gains directly in Decibels
    this.lowFilter.gain.setValueAtTime(settings.low, this.ctx!.currentTime);
    this.midFilter.gain.setValueAtTime(settings.mid, this.ctx!.currentTime);
    this.highFilter.gain.setValueAtTime(settings.high, this.ctx!.currentTime);
    
    // Bass boost active/inactive
    this.bassFilter.gain.setValueAtTime(settings.bassBoost ? 8 : 0, this.ctx!.currentTime);

    // Delay FX Mix (mapped to delayWet gain)
    const wetLevel = settings.delay / 100 * 0.4; // cap feedback/mix wet level at 40%
    this.delayWet.gain.setValueAtTime(wetLevel, this.ctx!.currentTime);

    // Apply reverb-like ambient space via delay modulation (simulate space)
    if (settings.reverb > 0) {
      // Modify delayTime dynamically to create a warm chorus/spaciousness reverb
      this.delayNode.delayTime.setValueAtTime(0.02 + (settings.reverb / 100 * 0.08), this.ctx!.currentTime);
      this.delayFeedback!.gain.setValueAtTime(0.3 + (settings.reverb / 100 * 0.4), this.ctx!.currentTime);
      this.delayWet.gain.setValueAtTime(wetLevel + (settings.reverb / 100 * 0.15), this.ctx!.currentTime);
    } else {
      // Revert delayTime to standard echo mode
      this.delayNode.delayTime.setValueAtTime(0.3, this.ctx!.currentTime);
      this.delayFeedback!.gain.setValueAtTime(0.35, this.ctx!.currentTime);
    }
  }

  public setVolume(volume: number) {
    this.init();
    if (this.masterGain) {
      // Map 0-1 slider linearly
      this.masterGain.gain.setValueAtTime(volume, this.ctx!.currentTime);
    }
  }
}

// Export singleton
export const audioEngine = new AudioEngine();
