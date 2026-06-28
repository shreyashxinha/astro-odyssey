// ===== Astro Odyssey — Main Entry Point =====

import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// Expose for debugging
window.astroOdyssey = game;

console.log('%c🚀 Astro Odyssey loaded', 'color: #00f0ff; font-weight: bold; font-size: 14px;');
