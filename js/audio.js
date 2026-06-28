// ===== Astro Odyssey — Web Audio API Synthesized Sound =====

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.muted = false;
        this.bgmGain = null;
        this.bgmNodes = [];
        this.bgmPlaying = false;
    }

    init() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.5;
            this.master.connect(this.ctx.destination);
        } catch {
            this.ctx = null;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) {
            this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
        }
    }

    /** Generic tone helper */
    tone({ freq, type = 'sine', dur = 0.15, vol = 0.3, slideTo = null, attack = 0.005, release = 0.05 }) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo !== null) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
        }
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + dur + release + 0.02);
    }

    /** Noise burst for explosions */
    noise({ dur = 0.3, vol = 0.4, filterFreq = 800, type = 'lowpass' }) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = filterFreq;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        src.start(t);
        src.stop(t + dur + 0.02);
    }

    shoot() {
        this.tone({ freq: 880, slideTo: 220, type: 'square', dur: 0.08, vol: 0.12, release: 0.03 });
    }

    explosion() {
        this.noise({ dur: 0.35, vol: 0.35, filterFreq: 600 });
        this.tone({ freq: 120, slideTo: 40, type: 'sawtooth', dur: 0.25, vol: 0.2 });
    }

    bossWarning() {
        if (!this.ctx || this.muted) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.tone({ freq: 220, type: 'sawtooth', dur: 0.2, vol: 0.3, release: 0.1 });
            }, i * 250);
        }
    }

    powerup() {
        this.tone({ freq: 523, type: 'sine', dur: 0.1, vol: 0.25 });
        setTimeout(() => this.tone({ freq: 784, type: 'sine', dur: 0.1, vol: 0.25 }), 80);
        setTimeout(() => this.tone({ freq: 1047, type: 'sine', dur: 0.15, vol: 0.25 }), 160);
    }

    gameOver() {
        this.tone({ freq: 440, slideTo: 110, type: 'sawtooth', dur: 0.6, vol: 0.3, release: 0.2 });
        setTimeout(() => this.noise({ dur: 0.5, vol: 0.3, filterFreq: 400 }), 200);
    }

    bossHit() {
        this.tone({ freq: 200, type: 'square', dur: 0.05, vol: 0.15, release: 0.02 });
    }

    /** Ambient background music — looping arpeggio with bass */
    startBGM() {
        if (!this.ctx || this.muted || this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.12;
        this.bgmGain.connect(this.master);

        const scale = [220, 261.63, 329.63, 392, 440, 523.25, 659.25];
        const bassNotes = [55, 55, 73.42, 65.41];
        let step = 0;
        const noteDur = 0.18;

        const playStep = () => {
            if (!this.bgmPlaying || !this.ctx) return;
            const t = this.ctx.currentTime;
            // Arpeggio
            const note = scale[step % scale.length];
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = note;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.08, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
            osc.connect(g);
            g.connect(this.bgmGain);
            osc.start(t);
            osc.stop(t + noteDur + 0.05);

            // Bass every 4 steps
            if (step % 4 === 0) {
                const bass = this.ctx.createOscillator();
                const bg = this.ctx.createGain();
                bass.type = 'sawtooth';
                bass.frequency.value = bassNotes[Math.floor(step / 4) % bassNotes.length];
                bg.gain.setValueAtTime(0, t);
                bg.gain.linearRampToValueAtTime(0.06, t + 0.02);
                bg.gain.exponentialRampToValueAtTime(0.0001, t + noteDur * 4);
                bass.connect(bg);
                bg.connect(this.bgmGain);
                bass.start(t);
                bass.stop(t + noteDur * 4 + 0.05);
            }

            step++;
            this.bgmTimer = setTimeout(playStep, noteDur * 1000);
        };
        playStep();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmTimer) clearTimeout(this.bgmTimer);
        if (this.bgmGain) {
            try {
                this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
                setTimeout(() => this.bgmGain && this.bgmGain.disconnect(), 300);
            } catch { /* ignore */ }
        }
    }
}

export const audio = new AudioEngine();
