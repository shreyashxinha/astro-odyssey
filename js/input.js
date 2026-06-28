// ===== Astro Odyssey — Input Handler =====

import { isTouchDevice } from './utils.js';

export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.touch = { x: 0, y: 0, active: false };
        this.isTouch = isTouchDevice();

        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent space/arrow scroll
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse — listen on window so clicks aren't blocked by HUD overlays
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // left click only
                this.mouse.down = true;
                this.updateMouse(e);
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.down = false;
        });
        window.addEventListener('mousemove', (e) => this.updateMouse(e));

        // Touch
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touch.active = true;
            this.updateTouch(e);
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.updateTouch(e);
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touch.active = false;
        }, { passive: false });

        // Mobile fire button
        this.fireBtnDown = false;
        const fireBtn = document.getElementById('fire-btn');
        if (fireBtn) {
            fireBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.fireBtnDown = true;
                fireBtn.classList.add('pressed');
            }, { passive: false });
            fireBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.fireBtnDown = false;
                fireBtn.classList.remove('pressed');
            }, { passive: false });
            fireBtn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.fireBtnDown = false;
                fireBtn.classList.remove('pressed');
            }, { passive: false });
        }
    }

    updateMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    updateTouch(e) {
        const rect = this.canvas.getBoundingClientRect();
        const t = e.touches[0];
        if (t) {
            this.touch.x = t.clientX - rect.left;
            this.touch.y = t.clientY - rect.top;
        }
    }

    isDown(code) {
        return !!this.keys[code];
    }

    /** Movement vector from WASD / arrows */
    getMoveVector() {
        let x = 0, y = 0;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
        if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
        return { x, y };
    }

    isFiring() {
        return this.isDown('Space') || this.mouse.down || this.fireBtnDown;
    }

    /** Once-per-press detection */
    consumeKey(code) {
        if (this.keys[code]) {
            this.keys[code] = false;
            return true;
        }
        return false;
    }
}
