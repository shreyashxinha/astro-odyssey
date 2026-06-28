// ===== Astro Odyssey — Boss System =====

import { rand, TAU, clamp } from './utils.js';

export const BOSS_SCHEDULE = [
    { kills: 25, type: 'mini', name: 'MINI BOSS' },
    { kills: 75, type: 'boss', name: 'BOSS' },
    { kills: 150, type: 'elite', name: 'ELITE BOSS' },
    { kills: 250, type: 'titan', name: 'TITAN BOSS' },
];

export const BOSS_DEFS = {
    mini: {
        r: 40, hp: 30, speed: 1.2, score: 200, color: '#ff3355',
        fireRate: 1.2, pattern: 'sway',
    },
    boss: {
        r: 55, hp: 80, speed: 1.0, score: 500, color: '#b400ff',
        fireRate: 0.9, pattern: 'sway',
    },
    elite: {
        r: 65, hp: 150, score: 1000, color: '#ff00aa', speed: 0.9,
        fireRate: 0.7, pattern: 'circle',
    },
    titan: {
        r: 80, hp: 250, score: 2000, color: '#ffdd00', speed: 0.8,
        fireRate: 0.5, pattern: 'spread',
    },
};

export class Boss {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0; this.y = 0;
        this.r = 40;
        this.hp = 30;
        this.maxHp = 30;
        this.speed = 1;
        this.score = 200;
        this.color = '#ff3355';
        this.fireRate = 1;
        this.fireTimer = 0;
        this.pattern = 'sway';
        this.type = 'mini';
        this.name = 'BOSS';
        this.t = 0;
        this.baseX = 0;
        this.entering = true;
        this.dead = false;
        this.hitFlash = 0;
        this.rotation = 0;
        this.phase = 1;
        this._hpGrad = null;
        this._hpGradKey = '';
    }

    init(type, name, canvasW, difficulty) {
        const def = BOSS_DEFS[type];
        this.type = type;
        this.name = name;
        this.x = canvasW / 2;
        this.y = -def.r;
        this.baseX = canvasW / 2;
        this.r = def.r;
        this.hp = this.maxHp = def.hp + Math.floor(difficulty * 5);
        this.speed = def.speed;
        this.score = def.score;
        this.color = def.color;
        this.fireRate = def.fireRate;
        this.pattern = def.pattern;
        this.t = 0;
        this.entering = true;
        this.dead = false;
        this.hitFlash = 0;
        this.rotation = 0;
        this.phase = 1;
        this.fireTimer = 2; // delay before first shot
        this._hpGrad = null;
        this._hpGradKey = '';
    }

    update(dt, canvasW, canvasH, onFire) {
        this.t += dt;
        this.rotation += dt * 0.8;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        // Phase shift at low HP
        if (this.hp < this.maxHp * 0.3 && this.phase === 1) {
            this.phase = 2;
            this.fireRate *= 0.6;
        }

        // Entry animation
        if (this.entering) {
            this.y += this.speed;
            if (this.y >= this.r + 30) {
                this.entering = false;
            }
            return;
        }

        // Movement patterns
        switch (this.pattern) {
            case 'sway':
                this.x = this.baseX + Math.sin(this.t * 0.8) * (canvasW * 0.3);
                this.y = this.r + 30 + Math.sin(this.t * 0.5) * 20;
                break;
            case 'circle':
                this.x = this.baseX + Math.cos(this.t * 0.6) * (canvasW * 0.25);
                this.y = this.r + 40 + Math.sin(this.t * 0.4) * 30;
                break;
            case 'spread':
                this.x = clamp(this.baseX + Math.sin(this.t * 0.5) * (canvasW * 0.35), this.r, canvasW - this.r);
                this.y = this.r + 30;
                break;
        }

        // Firing
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.fireTimer = this.fireRate;
            this.fire(onFire);
        }
    }

    fire(onFire) {
        const speed = 4;
        switch (this.type) {
            case 'mini':
                // 3-way spread
                for (let i = -1; i <= 1; i++) {
                    onFire(this.x, this.y + this.r, i * 0.3, speed);
                }
                break;
            case 'boss':
                // 5-way spread
                for (let i = -2; i <= 2; i++) {
                    onFire(this.x, this.y + this.r, i * 0.25, speed);
                }
                break;
            case 'elite':
                // Circle burst
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TAU + this.t;
                    onFire(this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed);
                }
                break;
            case 'titan':
                // Wide spread + aimed
                for (let i = -3; i <= 3; i++) {
                    onFire(this.x, this.y + this.r, i * 0.2, speed);
                }
                break;
        }
    }

    hit(damage) {
        this.hp -= damage;
        this.hitFlash = 0.08;
        if (this.hp <= 0) this.dead = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const color = this.hitFlash > 0 ? '#ffffff' : this.color;
        // Reduced shadowBlur
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        const r = this.r;

        switch (this.type) {
            case 'mini':
                // Octagon core
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TAU;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'boss':
                // Spiked core
                ctx.beginPath();
                for (let i = 0; i < 16; i++) {
                    const a = (i / 16) * TAU;
                    const rad = i % 2 === 0 ? r : r * 0.65;
                    const px = Math.cos(a) * rad;
                    const py = Math.sin(a) * rad;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'elite':
                // Double ring
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TAU;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.5, 0, TAU);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                break;
            case 'titan':
                // Massive gear
                ctx.beginPath();
                for (let i = 0; i < 24; i++) {
                    const a = (i / 24) * TAU;
                    const rad = i % 2 === 0 ? r : r * 0.8;
                    const px = Math.cos(a) * rad;
                    const py = Math.sin(a) * rad;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.35, 0, TAU);
                ctx.fill();
                break;
        }

        ctx.restore();

        // HP bar at top of screen — cache gradient by bar width
        const barW = Math.min(ctx.canvas.width * 0.6, 500);
        const barH = 8;
        const barX = (ctx.canvas.width - barW) / 2;
        const barY = 20;
        const barKey = Math.round(barW);
        if (barKey !== this._hpGradKey) {
            this._hpGradKey = barKey;
            this._hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            this._hpGrad.addColorStop(0, '#ff3355');
            this._hpGrad.addColorStop(0.5, '#ffdd00');
            this._hpGrad.addColorStop(1, '#00ff88');
        }
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        ctx.fillStyle = 'rgba(255,50,80,0.3)';
        ctx.fillRect(barX, barY, barW, barH);
        const hpRatio = clamp(this.hp / this.maxHp, 0, 1);
        ctx.fillStyle = this._hpGrad;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // Boss name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.fillText(this.name, ctx.canvas.width / 2, barY + barH + 14);
        ctx.shadowBlur = 0;
    }
}
