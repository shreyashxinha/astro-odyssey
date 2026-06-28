// ===== Astro Odyssey — Utilities =====

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => Math.random() * (max - min) + min;
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const TAU = Math.PI * 2;

/** Circle-circle collision */
export const circleHit = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const r = a.r + b.r;
    return dx * dx + dy * dy < r * r;
};

/** Rect-rect collision (axis-aligned) */
export const rectHit = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Format seconds as M:SS */
export const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Object pool with O(1) release via swap-remove */
export class Pool {
    constructor(factory, resetFn) {
        this.factory = factory;
        this.resetFn = resetFn;
        this.free = [];
        this.active = [];
    }

    acquire() {
        const obj = this.free.pop() || this.factory();
        obj._poolIndex = this.active.length;
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const idx = obj._poolIndex;
        const last = this.active.length - 1;
        if (idx !== last) {
            const swapped = this.active[last];
            this.active[idx] = swapped;
            swapped._poolIndex = idx;
        }
        this.active.pop();
        if (this.resetFn) this.resetFn(obj);
        this.free.push(obj);
    }

    releaseAll() {
        for (const obj of this.active) {
            if (this.resetFn) this.resetFn(obj);
            this.free.push(obj);
        }
        this.active.length = 0;
    }

    /** Iterates backwards so release() (swap-remove) is safe during iteration */
    forEach(fn) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            fn(this.active[i], i);
        }
    }
}

/** Detect touch device */
export const isTouchDevice = () =>
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
