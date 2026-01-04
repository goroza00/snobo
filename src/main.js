import { Sfx } from './audio.js';
import { createInput } from './input.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

const canvas = document.getElementById('game');
const ui = {
  distance: document.getElementById('distance'),
  speed: document.getElementById('speed'),
  hp: document.getElementById('hp'),
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  muteBtn: document.getElementById('muteBtn'),
  leftBtn: document.getElementById('leftBtn'),
  rightBtn: document.getElementById('rightBtn'),
};

const sfx = new Sfx();
const input = createInput();
input.attachTouchButtons(ui.leftBtn, ui.rightBtn);

const game = createGame(canvas, sfx);
const renderer = createRenderer(canvas, game.state);

ui.startBtn.addEventListener('click', () => { sfx.resumeIfNeeded(); game.reset(); });
ui.pauseBtn.addEventListener('click', () => { sfx.resumeIfNeeded(); game.togglePause(); });
ui.muteBtn.addEventListener('click', () => {
  sfx.resumeIfNeeded();
  sfx.setEnabled(!sfx.enabled);
  ui.muteBtn.textContent = `効果音: ${sfx.enabled ? 'ON' : 'OFF'}`;
});

window.addEventListener('keydown', (e) => {
  sfx.resumeIfNeeded();
  const k = e.key.toLowerCase();
  if (k === 'p') game.togglePause();
  if (k === 'enter') game.reset();
});

let lastTs = performance.now();
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (ts - lastTs) / 1000);
  lastTs = ts;

  game.update(dt, input);
  renderer.render(dt);

  // HUD
  ui.distance.textContent = Math.floor(game.state.game.distance).toString();
  ui.speed.textContent = Math.floor(game.state.game.speed).toString();
  ui.hp.textContent = game.state.player.hp.toString();
}
requestAnimationFrame(loop);
