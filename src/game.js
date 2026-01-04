import { rand, clamp } from './utils.js';

export function createGame(canvas, sfx) {
  const W = canvas.width;
  const H = canvas.height;

  const laneWidth = W * 0.58;
  const laneLeft = (W - laneWidth) / 2;
  const laneRight = laneLeft + laneWidth;

  const GOAL_DISTANCE = 1000;

  const state = {
    world: { W, H, laneWidth, laneLeft, laneRight },
    player: { x: W/2, y: H*0.76, r: 18, vx: 0, maxSpeedX: 780, hp: 3, invuln: 0, tilt: 0 },
    obstacles: [],
    particles: [],
    game: {
      GOAL_DISTANCE,
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
      spawnEvery: 0.62,
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
    if (typeRoll < 0.12) type = 'rock';
    else if (typeRoll < 0.22) type = 'flag';

    const size = type === 'tree' ? rand(26, 40) : type === 'rock' ? rand(22, 34) : rand(18, 26);
    const x = rand(laneLeft + size, laneRight - size);
    const y = -size - 20;
    const drift = rand(-60, 60);

    state.obstacles.push({
      x, y, r: size * 0.5, size, type, drift, hit: false, vy: speedY * rand(0.85, 1.15)
    });
  }

  function reset() {
    state.obstacles = [];
    state.particles = [];

    const p = state.player;
    p.x = W/2; p.vx = 0; p.hp = 3; p.invuln = 0; p.tilt = 0;

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
    g.spawnEvery = 0.62;

    sfx.beep('triangle', 660, 0.08, 0.05);
  }

  function togglePause() {
    if (!state.game.running) return;
    state.game.paused = !state.game.paused;
    sfx.beep('square', state.game.paused ? 240 : 360, 0.06, 0.04);
  }

  function update(dt, input) {
    const g = state.game;
    const p = state.player;

    if (!g.running || g.paused) return;

    g.time += dt;

    // boost
    if (input.boost && !g.finished && !g.gameOver) g.boost = clamp(g.boost + dt * 1.8, 0, 1);
    else g.boost = clamp(g.boost - dt * 2.2, 0, 1);

    const progress = clamp(g.distance / GOAL_DISTANCE, 0, 1);
    const targetSpeed = 520 + progress * 220 + g.boost * 220;
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

    // distance
    if (!g.finished && !g.gameOver) {
      g.distance += (g.speed * dt) / 4.4;
      if (g.distance >= GOAL_DISTANCE) {
        g.distance = GOAL_DISTANCE;
        g.finished = true;
        sfx.beep('triangle', 880, 0.12, 0.06);
        sfx.beep('triangle', 990, 0.10, 0.05);
      }
    }

    // spawn
    if (!g.finished && !g.gameOver) {
      g.spawnEvery = 0.62 - progress * 0.22;
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        g.spawnTimer = g.spawnEvery * rand(0.7, 1.15);
        spawnObstacle(g.speed);
        if (Math.random() < 0.22) spawnObstacle(g.speed * 0.98);
      }
    }

    // move obstacles
    for (const o of state.obstacles) {
      o.y += o.vy * dt;
      o.x += o.drift * dt * (0.15 + progress * 0.2);
      o.x = clamp(o.x, laneLeft + o.size*0.4, laneRight - o.size*0.4);
    }
    state.obstacles = state.obstacles.filter(o => o.y < H + 120);

    // collision
    if (p.invuln > 0) p.invuln -= dt;

    if (!g.finished && !g.gameOver) {
      for (const o of state.obstacles) {
        if (o.hit) continue;
        const dx = o.x - p.x;
        const dy = o.y - (p.y - 2);
        const rr = (o.r + p.r) * 0.92;
        if (dx*dx + dy*dy < rr*rr) {
          o.hit = true;
          if (o.type === 'flag') {
            g.distance = clamp(g.distance + 28, 0, GOAL_DISTANCE);
            if (Math.random() < 0.25 && p.hp < 3) p.hp += 1;
            puff(o.x, o.y, 16);
            sfx.beep('sine', 740, 0.07, 0.05);
          } else if (p.invuln <= 0) {
            p.hp -= 1;
            p.invuln = 1.1;
            p.vx += (dx < 0 ? 1 : -1) * 380;
            puff(p.x, p.y + 10, 22);
            sfx.beep('sawtooth', 160, 0.09, 0.06);
            sfx.beep('square', 90, 0.10, 0.05);

            if (p.hp <= 0) {
              g.gameOver = true;
              sfx.beep('triangle', 120, 0.18, 0.06);
            }
          }
        }
      }
    }
  }

  return { state, reset, togglePause, update };
}
