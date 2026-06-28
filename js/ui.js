// ===== Astro Odyssey — UI Manager =====

import { formatTime } from './utils.js';
import { POWERUP_TYPES } from './powerups.js';

export class UI {
    constructor() {
        this.el = {
            hud: document.getElementById('hud'),
            score: document.getElementById('hud-score'),
            best: document.getElementById('hud-best'),
            kills: document.getElementById('hud-kills'),
            time: document.getElementById('hud-time'),
            lives: document.getElementById('hud-lives'),
            fps: document.getElementById('hud-fps'),
            powerupTimers: document.getElementById('powerup-timers'),
            bossWarning: document.getElementById('boss-warning'),
            mobilePause: document.getElementById('mobile-pause'),
            fireBtn: document.getElementById('fire-btn'),
            mainMenu: document.getElementById('main-menu'),
            pauseMenu: document.getElementById('pause-menu'),
            gameOver: document.getElementById('game-over'),
            startBtn: document.getElementById('start-btn'),
            resumeBtn: document.getElementById('resume-btn'),
            quitBtn: document.getElementById('quit-btn'),
            muteBtn: document.getElementById('mute-btn'),
            autofireBtn: document.getElementById('autofire-btn'),
            statScore: document.getElementById('stat-score'),
            statBest: document.getElementById('stat-best'),
            statKills: document.getElementById('stat-kills'),
            statBosses: document.getElementById('stat-bosses'),
            statTime: document.getElementById('stat-time'),
            statAccuracy: document.getElementById('stat-accuracy'),
            restartInstruction: document.getElementById('restart-instruction'),
        };

        // Cached HUD values — only update DOM when changed
        this._hudCache = {
            score: -1, best: -1, kills: -1, time: -1, lives: -1, fps: -1,
        };

        // Cached powerup timer elements — avoid innerHTML rebuild every frame
        this._pwCache = new Map(); // type -> { el, lastVal }
        this._pwActiveKey = '';
    }

    showHUD() { this.el.hud.classList.remove('hidden'); }
    hideHUD() { this.el.hud.classList.add('hidden'); }

    showMenu(menu) {
        this.el.mainMenu.classList.add('hidden');
        this.el.pauseMenu.classList.add('hidden');
        this.el.gameOver.classList.add('hidden');
        if (menu === 'main') this.el.mainMenu.classList.remove('hidden');
        else if (menu === 'pause') this.el.pauseMenu.classList.remove('hidden');
        else if (menu === 'gameover') this.el.gameOver.classList.remove('hidden');
    }

    hideAllMenus() {
        this.el.mainMenu.classList.add('hidden');
        this.el.pauseMenu.classList.add('hidden');
        this.el.gameOver.classList.add('hidden');
    }

    updateHUD({ score, best, kills, time, lives, fps }) {
        const c = this._hudCache;
        if (c.score !== score) { this.el.score.textContent = score; c.score = score; }
        if (c.best !== best) { this.el.best.textContent = best; c.best = best; }
        if (c.kills !== kills) { this.el.kills.textContent = kills; c.kills = kills; }
        if (c.time !== time) { this.el.time.textContent = formatTime(time); c.time = time; }
        if (c.lives !== lives) { this.el.lives.textContent = lives; c.lives = lives; }
        if (c.fps !== fps) { this.el.fps.textContent = fps; c.fps = fps; }
    }

    updatePowerupTimers(player) {
        const timers = [];
        if (player.shield > 0) timers.push({ type: 'shield', t: player.shield });
        if (player.rapidFire > 0) timers.push({ type: 'rapid', t: player.rapidFire });
        if (player.doubleDamage > 0) timers.push({ type: 'double', t: player.doubleDamage });
        if (player.speedBoost > 0) timers.push({ type: 'speed', t: player.speedBoost });

        // Build a key to detect active set changes
        const key = timers.map(t => t.type).join(',');
        if (key !== this._pwActiveKey) {
            // Active set changed — rebuild DOM
            this._pwActiveKey = key;
            this._pwCache.clear();
            this.el.powerupTimers.innerHTML = timers.map(({ type }) => {
                const def = POWERUP_TYPES[type];
                return `<div class="powerup-timer" data-type="${type}" style="color:${def.color};border-color:${def.color}40">
                    <span class="pw-icon">${def.icon}</span><span class="pw-time">0.0s</span></div>`;
            }).join('');
            // Cache references
            for (const { type } of timers) {
                const el = this.el.powerupTimers.querySelector(`[data-type="${type}"] .pw-time`);
                if (el) this._pwCache.set(type, { el, lastVal: -1 });
            }
        }

        // Update only changed text values
        for (const { type, t } of timers) {
            const entry = this._pwCache.get(type);
            if (entry) {
                const val = t.toFixed(1);
                if (entry.lastVal !== val) {
                    entry.el.textContent = `${val}s`;
                    entry.lastVal = val;
                }
            }
        }
    }

    showBossWarning(show) {
        if (show) this.el.bossWarning.classList.remove('hidden');
        else this.el.bossWarning.classList.add('hidden');
    }

    setPauseButton(paused) {
        this.el.mobilePause.textContent = paused ? '▶' : '⏸';
    }

    updateMuteButton(muted) {
        this.el.muteBtn.textContent = muted ? '🔇' : '🔊';
    }

    updateAutoFireButton(autoFire) {
        this.el.autofireBtn.textContent = `AUTO FIRE: ${autoFire ? 'ON' : 'OFF'}`;
        this.updateFireButton(autoFire);
    }

    updateFireButton(autoFire) {
        if (this.el.fireBtn) {
            if (autoFire) {
                this.el.fireBtn.classList.add('hidden');
            } else {
                this.el.fireBtn.classList.remove('hidden');
            }
        }
    }

    showGameOver({ score, best, kills, bosses, time, accuracy, isTouch }) {
        this.el.statScore.textContent = score;
        this.el.statBest.textContent = best;
        this.el.statKills.textContent = kills;
        this.el.statBosses.textContent = bosses;
        this.el.statTime.textContent = formatTime(time);
        this.el.statAccuracy.textContent = `${accuracy}%`;
        this.el.restartInstruction.textContent = isTouch
            ? 'Tap Anywhere to Restart'
            : 'Press R to Restart';
        this.showMenu('gameover');
    }
}
