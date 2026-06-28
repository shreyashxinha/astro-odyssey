// ===== Astro Odyssey — Enemies =====

import { rand, randInt, pick, TAU, clamp } from './utils.js';

export const ENEMY_TYPES = {
    grunt: {
        r: 14, hp: 1, speed: 1.5, score: 10, color: '#ff3355',
        fireChance: 0.002, pattern: 'straight',
    },
    fast: {
        r: 11, hp: 1, speed: 3.2, score: 15, color: '#ffdd00',
        fireChance: 0.001, pattern: 'zigzag',
    },
    heavy: {
        r: 20, hp: 3, speed: 0.9, score: 30, color: '#b400ff',
        fireChance: 0.005, pattern: 'straight',
    },
    shooter: {
        r: 15, hp: 2, speed: 1.2, score: 25, color: '#ff00aa',
        fireChance: 0.012, pattern: 'sine',
    },
};

export class Enemy {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = 0; this.y = 0;
        this.vx = 0; this.vy = 0;
        this.r = 14;
        this.hp = 1;
        this.maxHp = 1;
        this.speed = 1.5;
        this.score = 10;
        this.color = '#ff3355';
        this.fireChance = 0;
        this.pattern = 'straight';
        this.type = 'grunt';
        this.t = 0;
        this.baseX = 0;
        this.dead = false;
        this.hitFlash = 0;
        this.rotation = 0;
    }

    init(type, x, y, difficulty) {
        const def = ENEMY_TYPES[type];
        this.type = type;
        this.x = x; this.y = y;
        this.baseX = x;
        this.r = def.r;
        this.hp = this.maxHp = def.hp + Math.floor(difficulty * 0.3);
        this.speed = def.speed * (1 + difficulty * 0.04);
        this.score = def.score;
        this.color = def.color;
        this.fireChance = def.fireChance * (1 + difficulty * 0.05);
        this.pattern = def.pattern;
        this.t = rand(0, TAU);
        this.dead = false;
        this.hitFlash = 0;
        this.rotation = 0;
    }

    update(dt, canvasW, canvasH, onFire) {
        this.t += dt;
        this.rotation += dt * 1.5;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        switch (this.pattern) {
            case 'straight':
                this.y += this.speed;
                break;
            case 'zigzag':
                this.y += this.speed;
                this.x = this.baseX + Math.sin(this.t * 4) * 60;
                break;
            case 'sine':
                this.y += this.speed * 0.7;
                this.x = this.baseX + Math.sin(this.t * 2) * 100;
                break;
        }

        // Firing
        if (this.y > 0 && this.y < canvasH * 0.7 && Math.random() < this.fireChance) {
            onFire(this.x, this.y + this.r);
        }

        if (this.y > canvasH + this.r) this.dead = true;
    }

    hit(damage) {
        this.hp -= damage;
        this.hitFlash = 0.1;
        if (this.hp <= 0) this.dead = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const color = this.hitFlash > 0 ? '#ffffff' : this.color;
        // Reduced shadowBlur — still visible but much cheaper
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        switch (this.type) {
            case 'grunt':
                // Triangle pointing down
                ctx.beginPath();
                ctx.moveTo(0, this.r);
                ctx.lineTo(-this.r, -this.r * 0.7);
                ctx.lineTo(this.r, -this.r * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'fast':
                // Diamond
                ctx.beginPath();
                ctx.moveTo(0, this.r);
                ctx.lineTo(this.r * 0.7, 0);
                ctx.lineTo(0, -this.r);
                ctx.lineTo(-this.r * 0.7, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'heavy':
                // Hexagon
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TAU;
                    const px = Math.cos(a) * this.r;
                    const py = Math.sin(a) * this.r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Inner core
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, this.r * 0.3, 0, TAU);
                ctx.fill();
                break;
            case 'shooter':
                // Star
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const a = (i / 10) * TAU - Math.PI / 2;
                    const rad = i % 2 === 0 ? this.r : this.r * 0.5;
                    const px = Math.cos(a) * rad;
                    const py = Math.sin(a) * rad;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }

        ctx.restore();

        // HP bar for multi-hp enemies
        if (this.maxHp > 1 && this.hp < this.maxHp) {
            const w = this.r * 2;
            const h = 3;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - w / 2, this.y - this.r - 8, w, h);
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(this.x - w / 2, this.y - this.r - 8, w * (this.hp / this.maxHp), h);
        }
    }
}

export class EnemySystem {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
    }

    update(dt, canvasW, canvasH, difficulty, onFire) {
        // Spawning
        this.spawnTimer -= dt;
        const spawnRate = Math.max(0.3, 1.5 - difficulty * 0.05);
        if (this.spawnTimer <= 0) {
            this.spawnTimer = spawnRate;
            this.spawn(canvasW, difficulty);
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, canvasW, canvasH, onFire);
            if (e.dead) this.enemies.splice(i, 1);
        }
    }

    spawn(canvasW, difficulty) {
        // Choose type based on difficulty
        let typePool = ['grunt'];
        if (difficulty > 2) typePool.push('fast');
        if (difficulty > 4) typePool.push('grunt', 'heavy');
        if (difficulty > 6) typePool.push('shooter');

        const type = pick(typePool);
        const x = rand(40, canvasW - 40);
        const e = new Enemy();
        e.init(type, x, -30, difficulty);
        this.enemies.push(e);
    }

    draw(ctx) {
        for (const e of this.enemies) e.draw(ctx);
    }

    clear() {
        this.enemies.length = 0;
        this.spawnTimer = 0;
    }
}
