// ===== Astro Odyssey — Collision Detection =====

import { circleHit } from './utils.js';

export const Collision = {
    /** Check player bullets vs enemies */
    bulletsVsEnemies(bullets, enemies, onHit) {
        bullets.pool.forEach((b) => {
            if (!b.fromPlayer || b.dead) return;
            for (const e of enemies) {
                if (e.dead) continue;
                if (circleHit(b, e)) {
                    e.hit(b.damage);
                    b.dead = true;
                    onHit(e, b);
                    if (e.dead) break;
                }
            }
        });
    },

    /** Check player bullets vs boss */
    bulletsVsBoss(bullets, boss, onHit) {
        if (!boss || boss.dead) return;
        bullets.pool.forEach((b) => {
            if (!b.fromPlayer || b.dead) return;
            if (circleHit(b, boss)) {
                boss.hit(b.damage);
                b.dead = true;
                onHit(boss, b);
            }
        });
    },

    /** Check enemy bullets vs player */
    enemyBulletsVsPlayer(bullets, player, onHit) {
        bullets.pool.forEach((b) => {
            if (b.fromPlayer || b.dead) return;
            if (circleHit(b, player)) {
                b.dead = true;
                if (player.hit()) onHit();
            }
        });
    },

    /** Check enemies vs player (ramming) */
    enemiesVsPlayer(enemies, player, onHit) {
        for (const e of enemies) {
            if (e.dead) continue;
            if (circleHit(e, player)) {
                e.dead = true;
                if (player.hit()) onHit(e);
                break;
            }
        }
    },

    /** Check boss vs player */
    bossVsPlayer(boss, player, onHit) {
        if (!boss || boss.dead || boss.entering) return;
        if (circleHit(boss, player)) {
            if (player.hit()) onHit();
        }
    },

    /** Check powerups vs player */
    powerupsVsPlayer(powerups, player, onCollect) {
        for (let i = powerups.items.length - 1; i >= 0; i--) {
            const p = powerups.items[i];
            if (circleHit(p, player)) {
                powerups.items.splice(i, 1);
                player.applyPowerup(p.type);
                onCollect(p);
            }
        }
    },
};
