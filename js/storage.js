// ===== Astro Odyssey — LocalStorage Persistence =====

const KEY = 'astro_odyssey_save';

const DEFAULTS = {
    bestScore: 0,
    bestKills: 0,
    longestTime: 0,
    muted: false,
    autoFire: true,
};

let cache = null;

const load = () => {
    if (cache) return cache;
    try {
        const raw = localStorage.getItem(KEY);
        cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
        cache = { ...DEFAULTS };
    }
    return cache;
};

const save = () => {
    try {
        localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
        /* storage may be unavailable; ignore */
    }
};

export const Storage = {
    get(key) {
        return load()[key];
    },

    set(key, value) {
        load()[key] = value;
        save();
    },

    getAll() {
        return { ...load() };
    },

    /** Record a completed run; updates bests if beaten. Returns updated bests. */
    recordRun({ score, kills, time }) {
        const d = load();
        let newBest = false;
        if (score > d.bestScore) { d.bestScore = score; newBest = true; }
        if (kills > d.bestKills) d.bestKills = kills;
        if (time > d.longestTime) d.longestTime = time;
        save();
        return { newBest };
    },

    reset() {
        cache = { ...DEFAULTS };
        save();
    },
};
