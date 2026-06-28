// ===== Astro Odyssey — Bullets =====

import { Pool, TAU } from './utils.js';

class Bullet {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.r = 3;
        this.fromPlayer = true;
        this.damage = 1;
        this.dead = false;
        this.color = '#00f0ff';
        // Trail ring buffer (fixed size, no shift)
        this.trail = [];
        this.trailLen = 0;
        this.trailHead = 0;
        this.trailCap = 4;
    }
}

export class BulletSystem {
    constructor() {
        this.pool = new Pool(() => new Bullet(), (b) => b.reset());
    }

    spawnPlayer(x, y, vx, vy, damage = 1) {
        const b = this.pool.acquire();
        b.x = x; b.y = y;
        b.vx = vx; b.vy = vy;
        b.r = 4;
        b.fromPlayer = true;
        b.damage = damage;
        b.dead = false;
        b.color = damage > 1 ? '#ff00aa' : '#00f0ff';
        b.trailLen = 0;
        b.trailHead = 0;
    }

    spawnEnemy(x, y, vx, vy) {
        const b = this.pool.acquire();
        b.x = x; b.y = y;
        b.vx = vx; b.vy = vy;
        b.r = 5;
        b.fromPlayer = false;
        b.damage = 1;
        b.dead = false;
        b.color = '#ff3355';
        b.trailLen = 0;
        b.trailHead = 0;
    }

    update(dt, canvasW, canvasH) {
        this.pool.forEach((b) => {
            // Record trail point (ring buffer)
            if (b.trail.length < b.trailCap) {
                b.trail.push(b.x, b.y);
                b.trailLen++;
            } else {
                b.trail[b.trailHead] = b.x;
                b.trail[b.trailHead + 1] = b.y;
                b.trailHead = (b.trailHead + 2) % (b.trailCap * 2);
                b.trailLen = b.trailCap;
            }

            b.x += b.vx;
            b.y += b.vy;

            if (b.x < -20 || b.x > canvasW + 20 || b.y < -20 || b.y > canvasH + 20) {
                b.dead = true;
            }
            if (b.dead) this.pool.release(b);
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const active = this.pool.active;
        for (let i = 0; i < active.length; i++) {
            const b = active[i];

            // Draw trail (ring buffer read)
            if (b.trailLen > 0) {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = b.color;
                for (let j = 0; j < b.trailLen; j++) {
                    const idx = (b.trailHead + j * 2) % (b.trailCap * 2);
                    ctx.beginPath();
                    ctx.arc(b.trail[idx], b.trail[idx + 1], b.r * 0.6, 0, TAU);
                    ctx.fill();
                }
            }

            // Bullet core
            ctx.globalAlpha = 1;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, TAU);
            ctx.fill();

            // Bright center
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r * 0.4, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    clear() {
        this.pool.releaseAll();
    }
}
