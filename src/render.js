import { drawRoundedRect, clamp } from './utils.js';

export function createRenderer(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function drawRetroSky() {
    // sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#79d7ff');
    g.addColorStop(1, '#d8fbff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // pixel clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const clouds = [
      { x: 160, y: 120, s: 1.1 },
      { x: 520, y: 90, s: 0.9 },
      { x: 980, y: 140, s: 1.2 },
    ];
    for (const c of clouds) pixelCloud(c.x, c.y, c.s);
  }

  function pixelCloud(cx, cy, s=1) {
    const px = 10 * s;
    const blocks = [
      [0,0],[1,0],[2,0],[3,0],
      [-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
      [-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3],[3,3]
    ];
    for (const [bx, by] of blocks) {
      ctx.fillRect(cx + bx*px, cy + by*px, px, px);
    }
  }

  function drawSlope() {
    const { laneLeft, laneRight, laneWidth } = state.world;

    // lane base
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(255,255,255,0.98)');
    grd.addColorStop(1, 'rgba(210,245,255,0.98)');
    ctx.fillStyle = grd;

    ctx.beginPath();
    ctx.moveTo(laneLeft, 0);
    ctx.lineTo(laneRight, 0);
    ctx.lineTo(laneRight + 140, H);
    ctx.lineTo(laneLeft - 140, H);
    ctx.closePath();
    ctx.fill();

    // borders (thick pixel-ish)
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(laneLeft, 0);
    ctx.lineTo(laneLeft - 140, H);
    ctx.moveTo(laneRight, 0);
    ctx.lineTo(laneRight + 140, H);
    ctx.stroke();

    // snow streaks
    const s = state.game.speed;
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const x = laneLeft + (i / 17) * laneWidth;
      const offset = (state.game.time * (0.55 + i * 0.02) * s) % H;
      ctx.beginPath();
      ctx.moveTo(x, -40 + offset);
      ctx.lineTo(x + 20, 30 + offset);
      ctx.stroke();
    }
  }

  function drawObstacle(o) {
    // “マリオっぽい”＝輪郭を黒で
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';

    if (o.type === 'tree') {
      // trunk
      ctx.fillStyle = o.hit ? 'rgba(140, 90, 50, 0.45)' : 'rgba(140, 90, 50, 0.95)';
      drawRoundedRect(ctx, o.x - o.size * 0.12, o.y + o.size * 0.15, o.size * 0.24, o.size * 0.42, 6);
      ctx.fill();
      ctx.stroke();

      // leaves (triangle-ish)
      ctx.fillStyle = o.hit ? 'rgba(60, 160, 90, 0.35)' : 'rgba(30, 170, 90, 0.95)';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size * 0.6);
      ctx.lineTo(o.x - o.size * 0.62, o.y + o.size * 0.25);
      ctx.lineTo(o.x + o.size * 0.62, o.y + o.size * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size * 0.25);
      ctx.lineTo(o.x - o.size * 0.52, o.y + o.size * 0.6);
      ctx.lineTo(o.x + o.size * 0.52, o.y + o.size * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (o.type === 'rock') {
      ctx.fillStyle = o.hit ? 'rgba(120,120,130,0.45)' : 'rgba(110,110,130,0.95)';
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, o.size * 0.55, o.size * 0.40, o.drift * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(o.x - o.size*0.12, o.y - o.size*0.1, o.size*0.18, o.size*0.12, 0, 0, Math.PI*2);
      ctx.fill();
    } else {
      // flag
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size*0.7);
      ctx.lineTo(o.x, o.y + o.size*0.7);
      ctx.stroke();

      ctx.fillStyle = o.hit ? 'rgba(255, 200, 60, 0.35)' : 'rgba(255, 140, 40, 0.98)';
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size*0.6);
      ctx.lineTo(o.x + o.size*0.72, o.y - o.size*0.38);
      ctx.lineTo(o.x, o.y - o.size*0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.ellipse(o.x, o.y + o.size*0.65, o.size*0.45, o.size*0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer() {
    const p = state.player;
    const blink = p.invuln > 0 && (Math.floor(state.game.time * 16) % 2 === 0);
    if (blink) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);

    // board
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.fillStyle = 'rgba(255, 60, 60, 0.95)';
    drawRoundedRect(ctx, -44, 10, 88, 18, 10);
    ctx.fill();
    ctx.stroke();

    // rider body (big outline)
    ctx.fillStyle = 'rgba(30, 80, 220, 0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -12, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // goggles shine
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-6, -16, 3, 0, Math.PI * 2);
    ctx.arc(6, -16, 3, 0, Math.PI * 2);
    ctx.fill();

    // scarf
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.95)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(18, 6);
    ctx.stroke();

    ctx.restore();

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 28, 42, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles(dt) {
    let ps = state.particles;
    for (const p of ps) {
      p.t += dt;
      const a = 1 - (p.t / p.life);
      if (a <= 0) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.01, dt);
      p.vy += 620 * dt;

      ctx.fillStyle = `rgba(255,255,255,${0.7 * a})`;
      ctx.fillRect(p.x, p.y, p.r*2.2, p.r*2.2); // pixel square
    }
    state.particles = ps.filter(p => p.t < p.life);
  }

  function drawGoalGate() {
    const progress = clamp(state.game.distance / state.game.GOAL_DISTANCE, 0, 1);
    if (progress <= 0.82 || state.game.gameOver) return;

    const t = (progress - 0.82) / 0.18;
    const gy = H * (0.10 + (1 - t) * 0.05);
    const gx = W / 2;
    const gw = state.world.laneWidth * (0.45 + t * 0.25);
    const gh = 28;

    ctx.fillStyle = 'rgba(255, 205, 50, 0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 6;
    drawRoundedRect(ctx, gx - gw/2, gy, gw, gh, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.font = '900 22px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', gx, gy + gh/2);
  }

  function drawBanner(text, sub) {
    const bw = W * 0.72, bh = 150;
    const bx = (W - bw) / 2, by = H * 0.18;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    drawRoundedRect(ctx, bx + 10, by + 10, bw, bh, 16);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 8;
    drawRoundedRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.font = '900 58px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W/2, by + 60);

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.font = '900 22px ui-monospace, monospace';
    ctx.fillText(sub, W/2, by + 112);
  }

  function render(dt) {
    ctx.clearRect(0, 0, W, H);

    drawRetroSky();
    drawSlope();
    drawGoalGate();

    for (const o of state.obstacles) drawObstacle(o);
    drawPlayer();
    if (dt > 0) drawParticles(dt);

    if (!state.game.running) {
      drawBanner('SNOW DODGE', 'ENTER / スタートで開始');
    } else if (state.game.paused) {
      drawBanner('PAUSED', 'P か 一時停止で再開');
    } else if (state.game.finished) {
      drawBanner('GOAL!', 'スタートでリスタート');
    } else if (state.game.gameOver) {
      drawBanner('GAME OVER', 'スタートでリスタート');
    }
  }

  return { render };
}
