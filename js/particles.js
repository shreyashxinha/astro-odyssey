// ===== Astro Odyssey — Particle System =====

import { Pool, rand, TAU } from './utils.js';

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.life = 0; this.maxLife = 1;
        this.size = 2;
        this.color = '#00f0ff';
        this.gravity = 0;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = new Pool(() => new Particle(), (p) => p.reset());
    }

    burst(x, y, { count = 8, color = '#00f0ff', speed = 3, size = 3, life = 0.5, spread = TAU, angle = 0, gravity = 0 }) {
        for (let i = 0; i < count; i++) {
            const p = this.pool.acquire();
            const a = angle + rand(-spread / 2, spread / 2);
            const s = rand(speed * 0.3, speed);
            p.x = x; p.y = y;
            p.vx = Math.cos(a) * s;
            p.vy = Math.sin(a) * s;
            p.life = p.maxLife = rand(life * 0.6, life);
            p.size = rand(size * 0.5, size);
            p.color = color;
            p.gravity = gravity;
        }
    }

    /** Engine trail particle */
    trail(x, y, color = '#00aaff') {
        const p = this.pool.acquire();
        p.x = x + rand(-2, 2);
        p.y = y;
        p.vx = rand(-0.3, 0.3);
        p.vy = rand(1, 2.5);
        p.life = p.maxLife = rand(0.2, 0.4);
        p.size = rand(1.5, 3);
        p.color = color;
        p.gravity = 0;
    }

    update(dt) {
        this.pool.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= dt;
            if (p.life <= 0) this.pool.release(p);
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const active = this.pool.active;
        for (let i = 0; i < active.length; i++) {
            const p = active[i];
            const alpha = p.life / p.maxLife;
            const size = p.size * alpha;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, size), 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    clear() {
        this.pool.releaseAll();
    }
}
