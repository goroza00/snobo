import { rand, clamp } from './utils.js';

export function createGame(canvas, sfx) {
  const W = canvas.width;
  const H = canvas.height;

  const laneWidth = W * 0.58;
  const laneLeft = (W - laneWidth) / 2;
  const laneRight = laneLeft + laneWidth;

  const GOAL_DISTANCE = 1000;

  // ★距離スケール：ここで「だいたい2分」を作る
  // 平均速度 ~ 580px/s 前後 → 580/70 ≒ 8.3m/s → 1000m/8.3 ≒ 120s
  const DIST_SCALE = 70;

  const state = {
    world: { W, H, laneWidth, laneLeft, laneRight },
    player: { x: W/2, y: H*0.76, r: 18, vx: 0, maxSpeedX: 780, hp: 1, invuln: 0, tilt: 0 },
    obstacles: [],
    particles: [],
    game: {
      GOAL_DISTANCE,
      DIST_SCALE,
      running: false,
      paused: false,
      finished: false,
      gameOver: false,
      time: 0,
      distance: 0,
      speed: 0,
      baseSpeed: 520,
      boost: 0,
      spawnTimer: 0,
      spawnEvery: 0.85, // 少しゆったり
      // crash演出用
      crashT: 0,
      crashX: W/2,
      crashY: H*0.76,
      flash: 0,
      shake: 0,
      debris: []
    }
  };

  function puff(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      state.particles.push({
        x, y,
        vx: rand(-220, 220),
        vy: rand(-220, 80),
        life: rand(0.35, 0.7),
        t: 0,
        r: rand(2, 5)
      });
    }
  }

  function spawnObstacle(speedY) {
    const typeRoll = Math.random();
    let type = 'tree';
    if (typeRoll < 0.18) type = 'rock';
    else if (typeRoll < 0.26) type = 'flag'; // 旗はボーナス

    const size = type === 'tree' ? rand(28, 44) : type === 'rock' ? rand(24, 36) : rand(18, 26);
    const x = rand(laneLeft + size, laneRight - size);
    const y = -size - 20;
    const drift = rand(-50, 50);

    state.obstacles.push({
      x, y, r: size * 0.5, size, type, drift, hit: false,
      vy: speedY * rand(0.85, 1.10)
    });
  }

  function makeDebris(x, y) {
    const pieces = [];
    for (let i = 0; i < 18; i++) {
      pieces.push({
        x, y,
        vx: rand(-520, 520),
        vy: rand(-620, -120),
        rot: rand(0, Math.PI * 2),
        vr: rand(-8, 8),
        size: rand(6, 14),
        life: rand(0.8, 1.4),
        t: 0
      });
    }
    state.game.debris = pieces;
  }

  function crashNow() {
    const g = state.game;
    const p = state.player;

    g.gameOver = true;
    p.hp = 0;

    g.crashT = 0;
    g.crashX = p.x;
    g.crashY = p.y;
    g.flash = 1;
    g.shake = 1;

    puff(p.x, p.y + 10, 28);
    makeDebris(p.x, p.y + 6);

    // crash SE
    sfx.beep('sawtooth', 160, 0.10, 0.07);
    sfx.beep('square', 90, 0.14, 0.06);
    sfx.beep('triangle', 60, 0.22, 0.05);
  }

  function reset() {
    state.obstacles = [];
    state.particles = [];

    const p = state.player;
    p.x = W/2; p.vx = 0; p.hp = 1; p.invuln = 0; p.tilt = 0;

    const g = state.game;
    g.running = true;
    g.paused = false;
    g.finished = false;
    g.gameOver = false;
    g.time = 0;
    g.distance = 0;
    g.speed = 0;
    g.baseSpeed = 520;
    g.boost = 0;
    g.spawnTimer = 0;
    g.spawnEvery = 0.85;

    g.crashT = 0;
    g.flash = 0;
    g.shake = 0;
    g.debris = [];

    sfx.beep('triangle', 660, 0.08, 0.05);
  }

  function togglePause() {
    if (!state.game.running) return;
    state.game.paused = !state.game.paused;
    sfx.beep('square', state.game.paused ? 240 : 360, 0.06, 0.04);
  }

  function updateDebris(dt) {
    const g = state.game;
    const gravity = 1200;
    for (const d of g.debris) {
      d.t += dt;
      d.vy += gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      d.vx *= Math.pow(0.12, dt);
      d.vy *= Math.pow(0.35, dt);
    }
    g.debris = g.debris.filter(d => d.t < d.life);
  }

  function update(dt, input) {
    const g = state.game;
    const p = state.player;

    if (!g.running || g.paused) return;

    g.time += dt;

    // ゲームオーバー中は演出だけ更新
    if (g.gameOver) {
      g.crashT += dt;
      g.flash = Math.max(0, g.flash - dt * 1.6);
      g.shake = Math.max(0, g.shake - dt * 1.8);
      updateDebris(dt);
      return;
    }

    // ゴール後は距離更新は止める（演出だけ）
    if (g.finished) {
      // ちょっとだけ余韻で走り続ける表示用
      g.flash = Math.max(0, g.flash - dt * 2);
      return;
    }

    // boost
    if (input.boost) g.boost = clamp(g.boost + dt * 1.8, 0, 1);
    else g.boost = clamp(g.boost - dt * 2.2, 0, 1);

    const progress = clamp(g.distance / GOAL_DISTANCE, 0, 1);

    // ★速度の伸びを控えめに（2分感を守る）
    const targetSpeed = 520 + progress * 80 + g.boost * 140;
    g.baseSpeed += (targetSpeed - g.baseSpeed) * (1 - Math.pow(0.001, dt));
    g.speed = g.baseSpeed;

    // horizontal
    const ax = 2200;
    if (input.left && !input.right) p.vx -= ax * dt;
    if (input.right && !input.left) p.vx += ax * dt;
    if (!input.left && !input.right) p.vx *= Math.pow(0.0008, dt);

    p.vx = clamp(p.vx, -p.maxSpeedX, p.maxSpeedX);
    p.x += p.vx * dt;

    const margin = 26;
    p.x = clamp(p.x, laneLeft + margin, laneRight - margin);
    p.tilt = (p.vx / p.maxSpeedX) * 0.35;

    // ★距離：2分くらいで1000m
    g.distance += (g.speed * dt) / g.DIST_SCALE;
    if (g.distance >= GOAL_DISTANCE) {
      g.distance = GOAL_DISTANCE;
      g.finished = true;
      sfx.beep('triangle', 880, 0.12, 0.06);
      sfx.beep('triangle', 990, 0.10, 0.05);
    }

    // spawn
    g.spawnEvery = 0.90 - progress * 0.20; // 徐々に少し増える
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      g.spawnTimer = g.spawnEvery * rand(0.8, 1.2);
      spawnObstacle(g.speed);
      if (Math.random() < 0.12) spawnObstacle(g.speed * 0.95);
    }

    // move obstacles
    for (const o of state.obstacles) {
      o.y += o.vy * dt;
      o.x += o.drift * dt * (0.12 + progress * 0.18);
      o.x = clamp(o.x, laneLeft + o.size*0.4, laneRight - o.size*0.4);
    }
    state.obstacles = state.obstacles.filter(o => o.y < H + 140);

    // collision
    for (const o of state.obstacles) {
      if (o.hit) continue;

      const dx = o.x - p.x;
      const dy = o.y - (p.y - 2);
      const rr = (o.r + p.r) * 0.92;

      if (dx*dx + dy*dy < rr*rr) {
        o.hit = true;

        if (o.type === 'flag') {
          // ボーナス：少し距離を進める（ゲーム性を残す）
          g.distance = clamp(g.distance + 18, 0, GOAL_DISTANCE);
          puff(o.x, o.y, 14);
          sfx.beep('sine', 740, 0.07, 0.05);
        } else {
          // ★即ゲームオーバー
          crashNow();
          break;
        }
      }
    }
  }

  return { state, reset, togglePause, update };
}
