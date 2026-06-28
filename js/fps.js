// ===== Astro Odyssey — FPS Counter =====

export class FPSCounter {
    constructor() {
        this.frames = 0;
        this.lastUpdate = 0;
        this.fps = 60;
        this.smoothFps = 60;
    }

    update(now) {
        this.frames++;
        if (this.lastUpdate === 0) this.lastUpdate = now;
        const elapsed = now - this.lastUpdate;
        if (elapsed >= 500) {
            this.fps = Math.round((this.frames * 1000) / elapsed);
            this.smoothFps = Math.round(this.smoothFps * 0.7 + this.fps * 0.3);
            this.frames = 0;
            this.lastUpdate = now;
        }
    }

    get() {
        return this.smoothFps;
    }
}
