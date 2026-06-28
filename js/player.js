// ===== Astro Odyssey — Player Ship =====

import { clamp, TAU, rand } from './utils.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 16;
        this.baseSpeed = 5;
        this.speed = 5;
        this.lives = 3;
        this.maxLives = 5;
        this.fireCooldown = 0;
        this.baseFireRate = 0.18; // seconds between shots
        this.fireRate = 0.18;
        this.invuln = 0; // invulnerability timer after hit
        this.flameAnim = 0;

        // Powerup timers (0 = inactive)
        this.shield = 0;
        this.rapidFire = 0;
        this.doubleDamage = 0;
        this.speedBoost = 0;

        // Cached gradient (recreated only when needed)
        this._flameGrad = null;
        this._flameGradKey = '';
    }

    update(dt, input, canvasW, canvasH, autoFire, onFire) {
        // Movement
        const mv = input.getMoveVector();
        const len = Math.hypot(mv.x, mv.y);
        if (len > 0) {
            this.x += (mv.x / len) * this.speed;
            this.y += (mv.y / len) * this.speed;
        }

        // Touch / drag movement — ship follows finger
        if (input.isTouch && input.touch.active) {
            const dx = input.touch.x - this.x;
            const dy = input.touch.y - this.y;
            const d = Math.hypot(dx, dy);
            if (d > 2) {
                const move = Math.min(d, this.speed * 1.5);
                this.x += (dx / d) * move;
                this.y += (dy / d) * move;
            }
        }

        // Clamp to canvas
        this.x = clamp(this.x, this.r, canvasW - this.r);
        this.y = clamp(this.y, this.r, canvasH - this.r);

        // Timers
        if (this.invuln > 0) this.invuln -= dt;
        if (this.shield > 0) this.shield -= dt;
        if (this.rapidFire > 0) this.rapidFire -= dt;
        if (this.doubleDamage > 0) this.doubleDamage -= dt;
        if (this.speedBoost > 0) this.speedBoost -= dt;

        // Apply powerup effects
        this.speed = this.speedBoost > 0 ? this.baseSpeed * 1.6 : this.baseSpeed;
        this.fireRate = this.rapidFire > 0 ? this.baseFireRate * 0.4 : this.baseFireRate;

        // Firing
        this.fireCooldown -= dt;
        const wantFire = autoFire || input.isFiring();
        if (wantFire && this.fireCooldown <= 0) {
            this.fireCooldown = this.fireRate;
            const dmg = this.doubleDamage > 0 ? 2 : 1;
            onFire(this.x, this.y, dmg);
        }

        this.flameAnim += dt * 20;
    }

    hit() {
        if (this.invuln > 0 || this.shield > 0) return false;
        this.lives--;
        this.invuln = 1.5;
        return true;
    }

    addLife() {
        if (this.lives < this.maxLives) this.lives++;
    }

    applyPowerup(type) {
        switch (type) {
            case 'life': this.addLife(); break;
            case 'shield': this.shield = 5; break;
            case 'rapid': this.rapidFire = 5; break;
            case 'double': this.doubleDamage = 5; break;
            case 'speed': this.speedBoost = 5; break;
        }
    }

    draw(ctx) {
        // Blink during invulnerability
        if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Engine flame — cache gradient by flame length bucket
        const flameLen = 14 + Math.sin(this.flameAnim) * 4;
        const flameKey = Math.round(flameLen);
        if (flameKey !== this._flameGradKey) {
            this._flameGradKey = flameKey;
            this._flameGrad = ctx.createLinearGradient(0, this.r, 0, this.r + flameLen);
            this._flameGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
            this._flameGrad.addColorStop(0.5, 'rgba(0, 128, 255, 0.6)');
            this._flameGrad.addColorStop(1, 'rgba(0, 0, 100, 0)');
        }
        ctx.fillStyle = this._flameGrad;
        ctx.beginPath();
        ctx.moveTo(-6, this.r - 2);
        ctx.lineTo(0, this.r + flameLen);
        ctx.lineTo(6, this.r - 2);
        ctx.closePath();
        ctx.fill();

        // Inner flame
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.moveTo(-3, this.r - 2);
        ctx.lineTo(0, this.r + flameLen * 0.6);
        ctx.lineTo(3, this.r - 2);
        ctx.closePath();
        ctx.fill();

        // Ship body — neon blue/cyan (single shadowBlur for the body)
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f0ff';

        // Wings
        ctx.fillStyle = '#0080ff';
        ctx.beginPath();
        ctx.moveTo(-this.r, this.r * 0.3);
        ctx.lineTo(-this.r * 0.4, -this.r * 0.2);
        ctx.lineTo(-this.r * 0.4, this.r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.r, this.r * 0.3);
        ctx.lineTo(this.r * 0.4, -this.r * 0.2);
        ctx.lineTo(this.r * 0.4, this.r * 0.6);
        ctx.closePath();
        ctx.fill();

        // Main body
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(0, -this.r);
        ctx.lineTo(this.r * 0.5, this.r * 0.7);
        ctx.lineTo(0, this.r * 0.4);
        ctx.lineTo(-this.r * 0.5, this.r * 0.7);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -this.r * 0.2, this.r * 0.25, 0, TAU);
        ctx.fill();

        // Shield
        if (this.shield > 0) {
            const sa = 0.3 + Math.sin(Date.now() * 0.01) * 0.15;
            ctx.globalAlpha = sa;
            ctx.strokeStyle = '#00ff88';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.r + 8, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.lives = 3;
        this.invuln = 0;
        this.shield = 0;
        this.rapidFire = 0;
        this.doubleDamage = 0;
        this.speedBoost = 0;
        this.fireCooldown = 0;
    }
}
