// ===== Astro Odyssey — Core Game Engine =====

import { Player } from './player.js';
import { EnemySystem } from './enemies.js';
import { Boss, BOSS_SCHEDULE } from './bosses.js';
import { BulletSystem } from './bullets.js';
import { PowerUpSystem } from './powerups.js';
import { ParticleSystem } from './particles.js';
import { Collision } from './collision.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { FPSCounter } from './fps.js';
import { audio } from './audio.js';
import { Storage } from './storage.js';
import { isTouchDevice, rand, clamp } from './utils.js';

export const STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover',
    BOSS_WARNING: 'boss_warning',
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = STATE.MENU;

        this.input = new Input(canvas);
        this.ui = new UI();
        this.fps = new FPSCounter();
        this.particles = new ParticleSystem();
        this.bullets = new BulletSystem();
        this.enemies = new EnemySystem();
        this.powerups = new PowerUpSystem();
        this.player = new Player(0, 0);

        this.boss = null;
        this.bossWarningTimer = 0;
        this.pendingBoss = null;

        // Stats
        this.score = 0;
        this.kills = 0;
        this.bossesDefeated = 0;
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.difficulty = 1;

        // Settings
        this.muted = Storage.get('muted');
        this.autoFire = Storage.get('autoFire');
        this.isTouch = isTouchDevice();

        // Screen shake
        this.shake = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // Background stars
        this.stars = [];
        this.nebula = [];
        this._nebulaGrads = []; // cached gradients

        // Floating score texts
        this.floatTexts = [];

        this.lastTime = 0;
        this.running = false;

        this.resize();
        this.initBackground();
        this.bindUI();
        this.applySettings();

        if (this.isTouch) document.body.classList.add('touch-device');
    }

    resize() {
        // Cap DPR at 2 to avoid 4-9x pixel overhead on high-DPI displays
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
    }

    initBackground() {
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: rand(0, this.w),
                y: rand(0, this.h),
                z: rand(0.3, 1),
                size: rand(0.5, 2),
            });
        }
        this.nebula = [];
        const colors = ['#b400ff22', '#0080ff22', '#ff00aa22', '#00f0ff22'];
        for (let i = 0; i < 4; i++) {
            this.nebula.push({
                x: rand(0, this.w),
                y: rand(0, this.h),
                r: rand(100, 250),
                color: colors[i],
                vy: rand(0.1, 0.3),
            });
        }
        // Invalidate cached gradients — will rebuild on next draw
        this._nebulaGrads = [];
    }

    bindUI() {
        this.ui.el.startBtn.addEventListener('click', () => this.start());
        this.ui.el.resumeBtn.addEventListener('click', () => this.resume());
        this.ui.el.quitBtn.addEventListener('click', () => this.quitToMenu());
        this.ui.el.muteBtn.addEventListener('click', () => this.toggleMute());
        this.ui.el.autofireBtn.addEventListener('click', () => this.toggleAutoFire());
        this.ui.el.mobilePause.addEventListener('click', () => this.togglePause());

        // Game over: tap anywhere to restart (mobile)
        this.ui.el.gameOver.addEventListener('click', () => {
            if (this.state === STATE.GAMEOVER && this.isTouch) this.start();
        });

        window.addEventListener('resize', () => {
            this.resize();
            this.initBackground();
        });
    }

    applySettings() {
        audio.setMuted(this.muted);
        this.ui.updateMuteButton(this.muted);
        this.ui.updateAutoFireButton(this.autoFire);
        this.ui.updateFireButton(this.autoFire);
    }

    toggleMute() {
        this.muted = !this.muted;
        Storage.set('muted', this.muted);
        audio.setMuted(this.muted);
        this.ui.updateMuteButton(this.muted);
        if (!this.muted) audio.startBGM();
    }

    toggleAutoFire() {
        this.autoFire = !this.autoFire;
        Storage.set('autoFire', this.autoFire);
        this.ui.updateAutoFireButton(this.autoFire);
    }

    togglePause() {
        if (this.state === STATE.PLAYING) this.pause();
        else if (this.state === STATE.PAUSED) this.resume();
    }

    start() {
        audio.init();
        audio.resume();
        if (!this.muted) audio.startBGM();

        this.score = 0;
        this.kills = 0;
        this.bossesDefeated = 0;
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.elapsedTime = 0;
        this.difficulty = 1;
        this.startTime = performance.now();

        this.player.reset(this.w / 2, this.h - 100);
        this.enemies.clear();
        this.bullets.clear();
        this.powerups.clear();
        this.particles.clear();
        this.floatTexts = [];
        this.boss = null;
        this.pendingBoss = null;
        this.bossWarningTimer = 0;
        this.shake = 0;

        this.state = STATE.PLAYING;
        this.ui.hideAllMenus();
        this.ui.showHUD();
        this.ui.setPauseButton(false);
        this.ui.updateFireButton(this.autoFire);

        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    pause() {
        if (this.state !== STATE.PLAYING) return;
        this.state = STATE.PAUSED;
        this.ui.showMenu('pause');
        this.ui.setPauseButton(true);
        this.ui.updateFireButton(true); // hide fire button while paused
        audio.stopBGM();
    }

    resume() {
        if (this.state !== STATE.PAUSED) return;
        this.state = STATE.PLAYING;
        this.ui.hideAllMenus();
        this.ui.showHUD();
        this.ui.setPauseButton(false);
        this.ui.updateFireButton(this.autoFire);
        this.lastTime = performance.now();
        if (!this.muted) audio.startBGM();
    }

    quitToMenu() {
        this.state = STATE.MENU;
        audio.stopBGM();
        this.ui.hideHUD();
        this.ui.showMenu('main');
        this.ui.setPauseButton(false);
        this.ui.updateFireButton(true); // hide fire button on menu
    }

    gameOver() {
        this.state = STATE.GAMEOVER;
        audio.stopBGM();
        audio.gameOver();
        this.ui.updateFireButton(true); // hide fire button on game over

        const accuracy = this.shotsFired > 0
            ? Math.round((this.shotsHit / this.shotsFired) * 100)
            : 0;

        const { newBest } = Storage.recordRun({
            score: this.score,
            kills: this.kills,
            time: this.elapsedTime,
        });

        this.ui.hideHUD();
        this.ui.showGameOver({
            score: this.score,
            best: Storage.get('bestScore'),
            kills: this.kills,
            bosses: this.bossesDefeated,
            time: this.elapsedTime,
            accuracy,
            isTouch: this.isTouch,
        });
    }

    addShake(amount) {
        this.shake = Math.min(this.shake + amount, 20);
    }

    addFloatText(x, y, text, color = '#00f0ff') {
        this.floatTexts.push({ x, y, text, color, life: 1, vy: -1 });
    }

    checkBossSpawn() {
        if (this.boss || this.pendingBoss || this.bossWarningTimer > 0) return;

        for (const entry of BOSS_SCHEDULE) {
            if (this.kills >= entry.kills && this.kills < entry.kills + 5) {
                // Check if this boss was already defeated by looking at bossesDefeated
                // Bosses cycle: after titan, repeat with scaling
                const cycleIndex = Math.floor(this.bossesDefeated / BOSS_SCHEDULE.length);
                const expectedIndex = BOSS_SCHEDULE.indexOf(entry);
                if (this.bossesDefeated % BOSS_SCHEDULE.length === expectedIndex) {
                    this.pendingBoss = entry;
                    this.bossWarningTimer = 2.5;
                    this.ui.showBossWarning(true);
                    audio.bossWarning();
                    return;
                }
            }
        }
    }

    spawnBoss() {
        const entry = this.pendingBoss;
        this.pendingBoss = null;
        this.boss = new Boss();
        this.boss.init(entry.type, entry.name, this.w, this.difficulty);
        this.addShake(8);
    }

    update(dt) {
        if (this.state !== STATE.PLAYING && this.state !== STATE.BOSS_WARNING) return;

        this.elapsedTime = (performance.now() - this.startTime) / 1000;
        this.difficulty = 1 + this.elapsedTime / 20;

        // Screen shake decay
        if (this.shake > 0) {
            this.shake *= 0.9;
            this.shakeX = rand(-this.shake, this.shake);
            this.shakeY = rand(-this.shake, this.shake);
            if (this.shake < 0.5) this.shake = 0;
        } else {
            this.shakeX = this.shakeY = 0;
        }

        // Boss warning
        if (this.bossWarningTimer > 0) {
            this.bossWarningTimer -= dt;
            if (this.bossWarningTimer <= 0) {
                this.ui.showBossWarning(false);
                this.spawnBoss();
            }
        }

        // Background
        this.updateBackground(dt);

        // Player
        this.player.update(dt, this.input, this.w, this.h, this.autoFire, (x, y, dmg) => {
            this.firePlayerBullet(x, y, dmg);
        });

        // Engine trail
        if (Math.random() < 0.8) {
            this.particles.trail(this.player.x, this.player.y + this.player.r, '#00aaff');
        }

        // Enemies
        this.enemies.update(dt, this.w, this.h, this.difficulty, (x, y) => {
            this.fireEnemyBullet(x, y, 0, 4);
        });

        // Boss
        if (this.boss) {
            this.boss.update(dt, this.w, this.h, (x, y, vx, vy) => {
                this.fireEnemyBullet(x, y, vx, vy);
            });
            if (this.boss.dead) {
                this.onBossDefeated();
            }
        }

        // Bullets
        this.bullets.update(dt, this.w, this.h);

        // Powerups
        this.powerups.update(dt, this.h);

        // Particles
        this.particles.update(dt);

        // Floating texts
        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
            const ft = this.floatTexts[i];
            ft.y += ft.vy;
            ft.life -= dt * 1.2;
            if (ft.life <= 0) this.floatTexts.splice(i, 1);
        }

        // Collisions
        this.handleCollisions();

        // Boss spawn check
        this.checkBossSpawn();

        // Game over check
        if (this.player.lives <= 0) {
            this.gameOver();
            return;
        }

        // Update HUD
        this.ui.updateHUD({
            score: this.score,
            best: Storage.get('bestScore'),
            kills: this.kills,
            time: this.elapsedTime,
            lives: this.player.lives,
            fps: this.fps.get(),
        });
        this.ui.updatePowerupTimers(this.player);

        // Keyboard shortcuts (pause only — R is handled in loop for GAMEOVER state)
        if (this.input.consumeKey('KeyP')) this.togglePause();
    }

    firePlayerBullet(x, y, damage) {
        this.bullets.spawnPlayer(x, y - 20, 0, -10, damage);
        this.shotsFired++;
        audio.shoot();
    }

    fireEnemyBullet(x, y, vx, vy) {
        this.bullets.spawnEnemy(x, y, vx, vy);
    }

    handleCollisions() {
        // Player bullets vs enemies
        Collision.bulletsVsEnemies(this.bullets, this.enemies.enemies, (enemy, bullet) => {
            this.shotsHit++;
            this.particles.burst(bullet.x, bullet.y, {
                count: 5, color: enemy.color, speed: 2, size: 2, life: 0.3,
            });
            if (enemy.dead) {
                this.onEnemyKilled(enemy);
            }
        });

        // Player bullets vs boss
        Collision.bulletsVsBoss(this.bullets, this.boss, (boss, bullet) => {
            this.shotsHit++;
            this.particles.burst(bullet.x, bullet.y, {
                count: 4, color: boss.color, speed: 2, size: 2, life: 0.3,
            });
            audio.bossHit();
        });

        // Enemy bullets vs player
        Collision.enemyBulletsVsPlayer(this.bullets, this.player, () => {
            this.onPlayerHit();
        });

        // Enemies vs player
        Collision.enemiesVsPlayer(this.enemies.enemies, this.player, (enemy) => {
            this.particles.burst(enemy.x, enemy.y, {
                count: 15, color: enemy.color, speed: 4, size: 3, life: 0.6,
            });
            this.onPlayerHit();
        });

        // Boss vs player
        Collision.bossVsPlayer(this.boss, this.player, () => {
            this.onPlayerHit();
        });

        // Powerups vs player
        Collision.powerupsVsPlayer(this.powerups, this.player, (p) => {
            audio.powerup();
            this.addFloatText(p.x, p.y, `+${p.type.toUpperCase()}`, p.color);
            this.particles.burst(p.x, p.y, {
                count: 10, color: p.color, speed: 3, size: 2, life: 0.5,
            });
        });
    }

    onEnemyKilled(enemy) {
        this.score += enemy.score;
        this.kills++;
        audio.explosion();
        this.particles.burst(enemy.x, enemy.y, {
            count: 15, color: enemy.color, speed: 4, size: 3, life: 0.6,
        });
        this.addFloatText(enemy.x, enemy.y, `+${enemy.score}`, '#ffdd00');
        this.powerups.maybeDrop(enemy.x, enemy.y, 0.12);
        this.addShake(2);
    }

    onBossDefeated() {
        this.score += this.boss.score;
        this.bossesDefeated++;
        this.kills++;
        audio.explosion();
        this.particles.burst(this.boss.x, this.boss.y, {
            count: 40, color: this.boss.color, speed: 6, size: 5, life: 1,
        });
        this.addFloatText(this.boss.x, this.boss.y, `+${this.boss.score}`, '#ffdd00');
        this.powerups.maybeDrop(this.boss.x, this.boss.y, 1.0); // always drop
        this.addShake(15);
        this.boss = null;
    }

    onPlayerHit() {
        audio.explosion();
        this.particles.burst(this.player.x, this.player.y, {
            count: 20, color: '#00f0ff', speed: 5, size: 4, life: 0.7,
        });
        this.addShake(10);
    }

    updateBackground(dt) {
        for (const s of this.stars) {
            s.y += s.z * 2;
            if (s.y > this.h) {
                s.y = 0;
                s.x = rand(0, this.w);
            }
        }
        for (const n of this.nebula) {
            n.y += n.vy;
            if (n.y > this.h + n.r) {
                n.y = -n.r;
                n.x = rand(0, this.w);
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Background
        this.drawBackground(ctx);

        if (this.state === STATE.PLAYING || this.state === STATE.PAUSED || this.state === STATE.GAMEOVER || this.bossWarningTimer > 0) {
            // Powerups
            this.powerups.draw(ctx);
            // Enemies
            this.enemies.draw(ctx);
            // Boss
            if (this.boss) this.boss.draw(ctx);
            // Bullets
            this.bullets.draw(ctx);
            // Player
            if (this.player.lives > 0) this.player.draw(ctx);
            // Particles
            this.particles.draw(ctx);
            // Floating texts
            this.drawFloatTexts(ctx);
        }

        ctx.restore();
    }

    drawBackground(ctx) {
        // Nebula — pre-rendered to offscreen canvas for performance
        if (!this._nebulaCanvas) {
            this._nebulaCanvas = document.createElement('canvas');
            const nc = this._nebulaCanvas;
            nc.width = 500;
            nc.height = 500;
            const nctx = nc.getContext('2d');
            const grad = nctx.createRadialGradient(250, 250, 0, 250, 250, 250);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            nctx.fillStyle = grad;
            nctx.fillRect(0, 0, 500, 500);
        }
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const n of this.nebula) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = n.color;
            ctx.drawImage(this._nebulaCanvas, n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Stars
        ctx.fillStyle = '#ffffff';
        for (const s of this.stars) {
            ctx.globalAlpha = s.z;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        ctx.globalAlpha = 1;
    }

    drawFloatTexts(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px sans-serif';
        ctx.shadowBlur = 6;
        for (const ft of this.floatTexts) {
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.restore();
    }

    loop(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        this.fps.update(now);

        if (this.state === STATE.PLAYING || this.state === STATE.BOSS_WARNING) {
            this.update(dt);
        }

        // Restart shortcut — must be outside update() so it works in GAMEOVER state
        if (this.input.consumeKey('KeyR') && this.state === STATE.GAMEOVER) this.start();

        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }
}
