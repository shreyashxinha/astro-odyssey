// ===== Astro Odyssey — Power Ups =====

import { rand, TAU } from './utils.js';

export const POWERUP_TYPES = {
    life: { color: '#ff3355', icon: '❤', label: 'LIFE' },
    shield: { color: '#00ff88', icon: '🛡', label: 'SHIELD' },
    rapid: { color: '#ffdd00', icon: '⚡', label: 'RAPID FIRE' },
    double: { color: '#ff00aa', icon: '✦', label: '2X DAMAGE' },
    speed: { color: '#00f0ff', icon: '➤', label: 'SPEED' },
};

export class PowerUp {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = 0; this.y = 0;
        this.vy = 1.5;
        this.r = 14;
        this.type = 'shield';
        this.color = '#00ff88';
        this.icon = '🛡';
        this.t = 0;
        this.dead = false;
    }

    init(type, x, y) {
        const def = POWERUP_TYPES[type];
        this.type = type;
        this.x = x; this.y = y;
        this.vy = 1.5;
        this.r = 14;
        this.color = def.color;
        this.icon = def.icon;
        this.t = 0;
        this.dead = false;
    }

    update(dt, canvasH) {
        this.t += dt;
        this.y += this.vy;
        if (this.y > canvasH + this.r) this.dead = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const pulse = 1 + Math.sin(this.t * 5) * 0.1;
        ctx.scale(pulse, pulse);

        // Glow ring — reduced shadowBlur
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, TAU);
        ctx.stroke();

        // Inner fill
        ctx.fillStyle = `${this.color}33`;
        ctx.beginPath();
        ctx.arc(0, 0, this.r - 2, 0, TAU);
        ctx.fill();

        // Icon
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, 0, 1);

        ctx.restore();
    }
}

export class PowerUpSystem {
    constructor() {
        this.items = [];
    }

    /** Maybe drop a powerup at location. dropChance 0..1 */
    maybeDrop(x, y, dropChance = 0.12) {
        if (Math.random() > dropChance) return;
        const types = Object.keys(POWERUP_TYPES);
        // Life is rarer
        const weighted = ['shield', 'rapid', 'double', 'speed', 'shield', 'rapid', 'double', 'speed'];
        if (Math.random() < 0.15) weighted.push('life');
        const type = weighted[Math.floor(Math.random() * weighted.length)];
        const p = new PowerUp();
        p.init(type, x, y);
        this.items.push(p);
    }

    update(dt, canvasH) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const p = this.items[i];
            p.update(dt, canvasH);
            if (p.dead) this.items.splice(i, 1);
        }
    }

    draw(ctx) {
        for (const p of this.items) p.draw(ctx);
    }

    clear() {
        this.items.length = 0;
    }
}
